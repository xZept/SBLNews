import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config serverExternalPackages", () => {
  it("externalizes @supabase/supabase-js and @supabase/ssr on the server", () => {
    expect(nextConfig.serverExternalPackages).toEqual(
      expect.arrayContaining(["@supabase/supabase-js", "@supabase/ssr"])
    );
  });
});
