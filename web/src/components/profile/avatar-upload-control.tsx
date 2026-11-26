"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { updateAvatarUrlAction } from "@/lib/actions/profile";
import {
  removeAvatarFromStorage,
  uploadAvatarToStorage,
  validateAvatarFile,
} from "@/lib/avatar-upload";

interface AvatarUploadControlProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export function AvatarUploadControl({
  userId,
  displayName,
  avatarUrl,
}: AvatarUploadControlProps) {
  const { refreshAccountProfile } = useAccountProfile();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = React.useState<string | null>(avatarUrl);
  const [busy, setBusy] = React.useState<"upload" | "remove" | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrentUrl(avatarUrl);
  }, [avatarUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    const validation = validateAvatarFile(file);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    setBusy("upload");
    try {
      const publicUrl = await uploadAvatarToStorage(userId, file);
      const result = await updateAvatarUrlAction({ avatarUrl: publicUrl });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setCurrentUrl(result.avatarUrl);
      setStatusMessage("Profile photo updated.");
      await refreshAccountProfile();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to process profile photo."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleRemovePhoto() {
    setErrorMessage(null);
    setStatusMessage(null);
    setBusy("remove");

    try {
      await removeAvatarFromStorage(userId);
      const result = await updateAvatarUrlAction({ avatarUrl: null });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setCurrentUrl(null);
      setStatusMessage("Photo removed. Reverted to initials.");
      await refreshAccountProfile();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to remove profile photo."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <UserAvatar
          displayName={displayName}
          avatarUrl={currentUrl}
          size="lg"
        />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-ink">
            Profile Photo
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted">
            PNG, JPEG, or WebP. Auto-cropped to 256×256 (&le; 200 KB).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload profile photo"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busy !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          <span>
            {busy === "upload"
              ? "Uploading..."
              : currentUrl
                ? "Change Photo"
                : "Upload Photo"}
          </span>
        </Button>

        {currentUrl && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => void handleRemovePhoto()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{busy === "remove" ? "Removing..." : "Remove Photo"}</span>
          </Button>
        )}
      </div>

      {statusMessage && (
        <p
          role="status"
          aria-live="polite"
          className="font-mono text-xs font-semibold text-ink sm:basis-full"
        >
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p
          role="alert"
          aria-live="assertive"
          className="font-mono text-xs font-semibold text-red-600 dark:text-red-400 sm:basis-full"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
