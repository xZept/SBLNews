import { createClient } from "@/lib/supabase/client";

export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_RAW_AVATAR_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_AVATAR_DIMENSION = 256;
export const MAX_COMPRESSED_AVATAR_BYTES = 200 * 1024; // 200 KB

const QUALITY_STEPS = [0.82, 0.7, 0.55] as const;

export type AvatarValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateAvatarFile(
  file: Pick<File, "type" | "size">
): AvatarValidationResult {
  if (
    !ALLOWED_AVATAR_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number]
    )
  ) {
    return {
      ok: false,
      message: "Please select a PNG, JPEG, or WebP image.",
    };
  }

  if (file.size <= 0 || file.size > MAX_RAW_AVATAR_BYTES) {
    return {
      ok: false,
      message: "Image must be smaller than 15 MB.",
    };
  }

  return { ok: true };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg",
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function decodeImageSource(
  file: File
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number, side: number, targetSize: number) => void; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, sx, sy, side, targetSize) => {
        ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, targetSize, targetSize);
      },
      cleanup: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not decode image file."));
      element.src = objectUrl;
    });

    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, sx, sy, side, targetSize) => {
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
      },
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export async function compressAvatarToSquareBlob(file: File): Promise<{
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  ext: "webp" | "jpg";
}> {
  const validation = validateAvatarFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const decoded = await decodeImageSource(file);

  try {
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error("Image has invalid dimensions.");
    }

    const side = Math.min(decoded.width, decoded.height);
    const sx = Math.floor((decoded.width - side) / 2);
    const sy = Math.floor((decoded.height - side) / 2);
    const targetSize = Math.min(MAX_AVATAR_DIMENSION, side);

    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not initialize image processor.");
    }

    decoded.draw(ctx, sx, sy, side, targetSize);

    // Prefer WebP; fall back to JPEG if browser cannot encode WebP.
    const formats: Array<{
      mimeType: "image/webp" | "image/jpeg";
      ext: "webp" | "jpg";
    }> = [
      { mimeType: "image/webp", ext: "webp" },
      { mimeType: "image/jpeg", ext: "jpg" },
    ];

    let bestCandidate: {
      blob: Blob;
      contentType: "image/webp" | "image/jpeg";
      ext: "webp" | "jpg";
    } | null = null;

    for (const format of formats) {
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, format.mimeType, quality);
        if (!blob || blob.type !== format.mimeType) {
          break;
        }
        bestCandidate = {
          blob,
          contentType: format.mimeType,
          ext: format.ext,
        };
        if (blob.size <= MAX_COMPRESSED_AVATAR_BYTES) {
          return bestCandidate;
        }
      }
    }

    if (bestCandidate && bestCandidate.blob.size <= MAX_COMPRESSED_AVATAR_BYTES) {
      return bestCandidate;
    }

    throw new Error(
      "Could not compress image under 200 KB. Try a simpler image."
    );
  } finally {
    decoded.cleanup();
  }
}

export async function uploadAvatarToStorage(
  userId: string,
  file: File
): Promise<string> {
  const { blob, contentType, ext } = await compressAvatarToSquareBlob(file);
  const supabase = createClient();
  const objectPath = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(objectPath, blob, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload avatar.");
  }

  // Remove any stale alternate extension so orphaned thumbnails do not accumulate.
  const altExt = ext === "webp" ? "jpg" : "webp";
  await supabase.storage
    .from("avatars")
    .remove([`${userId}/avatar.${altExt}`, `${userId}/avatar.png`]);

  const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatarFromStorage(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("avatars")
    .remove([
      `${userId}/avatar.webp`,
      `${userId}/avatar.jpg`,
      `${userId}/avatar.png`,
    ]);

  if (error) {
    throw new Error(error.message || "Failed to remove avatar from storage.");
  }
}
