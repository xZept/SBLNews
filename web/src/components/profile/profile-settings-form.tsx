"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Moon, Sun } from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/actions/profile";
import type {
  AccountProfile,
  CommunityRoleType,
  ThemePreferenceType,
} from "@/lib/queries/projections";
import { cn } from "@/lib/utils";
import { UpdateProfileSchema } from "@/lib/validations/profile";

const COMMUNITY_ROLES: readonly CommunityRoleType[] = [
  "Lifter",
  "Strength Coach",
  "Exercise Researcher",
  "Clinician",
  "Student",
];

interface ProfileSettingsFormProps {
  initialProfile: AccountProfile;
  email: string | null;
}

export function ProfileSettingsForm({
  initialProfile,
  email,
}: ProfileSettingsFormProps) {
  const { theme, setThemeLocalAndPersist, refreshAccountProfile } =
    useAccountProfile();

  const [displayName, setDisplayName] = React.useState(
    initialProfile.display_name
  );
  const [affiliationRole, setAffiliationRole] = React.useState<string>(
    initialProfile.affiliation_role ?? ""
  );
  const [bio, setBio] = React.useState(initialProfile.bio ?? "");
  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string | undefined>
  >({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const displayNameId = React.useId();
  const displayNameErrorId = React.useId();
  const roleId = React.useId();
  const bioId = React.useId();
  const bioErrorId = React.useId();

  const displayNameRef = React.useRef<HTMLInputElement>(null);
  const bioRef = React.useRef<HTMLTextAreaElement>(null);

  const isAdmin = initialProfile.role === "admin";
  const bioLength = bio.length;

  async function handleThemeToggle(nextTheme: ThemePreferenceType) {
    if (nextTheme === theme) {
      return;
    }
    await setThemeLocalAndPersist(nextTheme);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const payload = {
      displayName,
      affiliationRole:
        affiliationRole === ""
          ? null
          : (affiliationRole as CommunityRoleType),
      bio: bio === "" ? null : bio,
      themePreference: theme,
    };

    const parsed = UpdateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const nextErrors: Record<string, string | undefined> = {
        displayName: flattened.displayName?.[0],
        affiliationRole: flattened.affiliationRole?.[0],
        bio: flattened.bio?.[0],
      };
      setFieldErrors(nextErrors);
      setErrorMessage("Please fix the highlighted fields before saving.");

      if (nextErrors.displayName) {
        displayNameRef.current?.focus();
      } else if (nextErrors.bio) {
        bioRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const result = await updateProfileAction({
        displayName: parsed.data.displayName,
        affiliationRole: parsed.data.affiliationRole,
        bio: parsed.data.bio,
        themePreference: parsed.data.themePreference,
      });

      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors({
            displayName: result.fieldErrors.displayName?.[0],
            affiliationRole: result.fieldErrors.affiliationRole?.[0],
            bio: result.fieldErrors.bio?.[0],
          });
        }
        setErrorMessage(result.message);
        return;
      }

      setDisplayName(result.profile.display_name);
      setAffiliationRole(result.profile.affiliation_role ?? "");
      setBio(result.profile.bio ?? "");
      setStatusMessage("Profile settings saved.");
      await refreshAccountProfile();
    } catch {
      setErrorMessage("Unexpected error while saving profile settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Community Identity &amp; Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor={displayNameId}
                className="mb-1.5 block font-display text-sm font-bold text-ink"
              >
                Display Name <span aria-hidden="true">*</span>
              </label>
              <Input
                ref={displayNameRef}
                id={displayNameId}
                name="displayName"
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={displayName}
                aria-invalid={fieldErrors.displayName ? "true" : "false"}
                aria-describedby={
                  fieldErrors.displayName ? displayNameErrorId : undefined
                }
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (fieldErrors.displayName) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      displayName: undefined,
                    }));
                  }
                }}
                placeholder="e.g. Eric Helms"
              />
              <p className="mt-1 font-mono text-xs text-muted">
                2–50 characters. Shown on your comments and public profile.
              </p>
              {fieldErrors.displayName && (
                <p
                  id={displayNameErrorId}
                  className="mt-1.5 inline-block rounded-sm border-[1.5px] border-accent-ink bg-badge-abstract px-2 py-0.5 font-mono text-xs font-semibold text-accent-ink"
                >
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={roleId}
                className="mb-1.5 block font-display text-sm font-bold text-ink"
              >
                Training / Professional Role
              </label>
              <select
                id={roleId}
                name="affiliationRole"
                value={affiliationRole}
                onChange={(e) => setAffiliationRole(e.target.value)}
                className="flex h-10 w-full rounded-md border-2 border-border bg-surface px-3 py-2 font-sans text-sm text-ink shadow-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              >
                <option value="">None (No role tag)</option>
                {COMMUNITY_ROLES.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
              <p className="mt-1 font-mono text-xs text-muted">
                Optional domain badge displayed beside your name in discussions.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor={bioId}
                  className="block font-display text-sm font-bold text-ink"
                >
                  Short Bio / Credentials
                </label>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    bioLength > 160
                      ? "rounded-sm border-[1.5px] border-accent-ink bg-badge-abstract px-1.5 py-0.5 text-accent-ink"
                      : "text-muted"
                  )}
                >
                  {bioLength}/160
                </span>
              </div>
              <textarea
                ref={bioRef}
                id={bioId}
                name="bio"
                rows={3}
                maxLength={160}
                value={bio}
                aria-invalid={fieldErrors.bio ? "true" : "false"}
                aria-describedby={fieldErrors.bio ? bioErrorId : undefined}
                onChange={(e) => {
                  setBio(e.target.value);
                  if (fieldErrors.bio) {
                    setFieldErrors((prev) => ({ ...prev, bio: undefined }));
                  }
                }}
                placeholder="Share your training background, coaching focus, or research credentials..."
                className="flex w-full rounded-md border-2 border-border bg-surface px-3 py-2 font-sans text-sm text-ink shadow-control placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              />
              {fieldErrors.bio && (
                <p
                  id={bioErrorId}
                  className="mt-1.5 inline-block rounded-sm border-[1.5px] border-accent-ink bg-badge-abstract px-2 py-0.5 font-mono text-xs font-semibold text-accent-ink"
                >
                  {fieldErrors.bio}
                </p>
              )}
            </div>

            <div>
              <span className="mb-1.5 block font-display text-sm font-bold text-ink">
                Theme Preference
              </span>
              <div
                role="group"
                aria-label="Theme preference"
                className="inline-flex items-center rounded-md border-2 border-border bg-canvas p-1 shadow-control"
              >
                <button
                  type="button"
                  aria-pressed={theme === "light"}
                  onClick={() => void handleThemeToggle("light")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-xs font-semibold transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border",
                    theme === "light"
                      ? "bg-accent text-accent-ink"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  aria-pressed={theme === "dark"}
                  onClick={() => void handleThemeToggle("dark")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-xs font-semibold transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border",
                    theme === "dark"
                      ? "bg-accent text-accent-ink"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark</span>
                </button>
              </div>
              <p className="mt-1.5 font-mono text-xs text-muted">
                Applies immediately and persists to your account. Signing out
                reverts to Light Mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
              {statusMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className="font-mono text-xs font-semibold text-ink"
                >
                  {statusMessage}
                </p>
              )}
              {errorMessage && (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
                >
                  {errorMessage}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Read-only Account Metadata */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
              Connected Email
            </p>
            <p className="mt-1 break-all font-mono text-sm text-ink">
              {email ?? "Not available"}
            </p>
          </div>

          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
              Account Role
            </p>
            <div className="mt-1.5">
              <Badge variant={isAdmin ? "accent" : "default"}>
                {isAdmin ? "Admin" : "Member"}
              </Badge>
            </div>
          </div>

          <div className="border-t-2 border-border/15 pt-4">
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href={`/profile/${initialProfile.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View public profile</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
