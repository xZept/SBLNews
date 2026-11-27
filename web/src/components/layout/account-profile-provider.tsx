"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateThemePreferenceAction } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import type {
  AccountProfile,
  ThemePreferenceType,
} from "@/lib/queries/projections";
import {
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  clearStoredThemeAndResetToLight,
} from "@/lib/theme";

interface AccountProfileContextValue {
  profile: AccountProfile | null;
  email: string | null;
  loading: boolean;
  theme: ThemePreferenceType;
  setThemeLocalAndPersist: (theme: ThemePreferenceType) => Promise<void>;
  refreshAccountProfile: () => Promise<void>;
  signOutAndResetTheme: () => Promise<void>;
}

const AccountProfileContext =
  React.createContext<AccountProfileContextValue | null>(null);

function unwrapProfile(
  data: AccountProfile[] | AccountProfile | null
): AccountProfile | null {
  if (!data) return null;
  const raw = Array.isArray(data) ? data[0] ?? null : data;
  if (!raw) return null;
  return {
    ...raw,
    aura_score: typeof raw.aura_score === "number" ? raw.aura_score : 0,
    upvoted_studies_visibility: raw.upvoted_studies_visibility ?? "private",
    viewed_studies_visibility: raw.viewed_studies_visibility ?? "private",
  };
}

export function AccountProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = React.useState<AccountProfile | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [theme, setTheme] = React.useState<ThemePreferenceType>("light");

  const refreshAccountProfile = React.useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setProfile(null);
      setEmail(null);
      setTheme("light");
      clearStoredThemeAndResetToLight();
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_my_account_profile");

    if (error) {
      console.error("Failed to load account profile:", error.message);
      setEmail(user.email ?? null);
      setLoading(false);
      return;
    }

    const nextProfile = unwrapProfile(
      data as AccountProfile[] | AccountProfile | null
    );
    setProfile(nextProfile);
    setEmail(user.email ?? null);

    if (nextProfile) {
      setTheme(nextProfile.theme_preference);
      applyThemeToDocument(nextProfile.theme_preference, true);
    }

    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refreshAccountProfile();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setEmail(null);
        setTheme("light");
        clearStoredThemeAndResetToLight();
        setLoading(false);
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        void refreshAccountProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAccountProfile]);

  React.useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }
      const nextTheme: ThemePreferenceType =
        event.newValue === "dark" ? "dark" : "light";
      setTheme(nextTheme);
      applyThemeToDocument(nextTheme, false);
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setThemeLocalAndPersist = React.useCallback(
    async (nextTheme: ThemePreferenceType) => {
      setTheme(nextTheme);
      applyThemeToDocument(nextTheme, true);

      setProfile((prev) =>
        prev ? { ...prev, theme_preference: nextTheme } : prev
      );

      if (!profile) {
        return;
      }

      const result = await updateThemePreferenceAction({
        themePreference: nextTheme,
      });

      if (!result.ok) {
        console.error("Failed to persist theme preference:", result.message);
      }
    },
    [profile]
  );

  const signOutAndResetTheme = React.useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setEmail(null);
    setTheme("light");
    clearStoredThemeAndResetToLight();
    router.refresh();
  }, [router]);

  const value = React.useMemo<AccountProfileContextValue>(
    () => ({
      profile,
      email,
      loading,
      theme,
      setThemeLocalAndPersist,
      refreshAccountProfile,
      signOutAndResetTheme,
    }),
    [
      profile,
      email,
      loading,
      theme,
      setThemeLocalAndPersist,
      refreshAccountProfile,
      signOutAndResetTheme,
    ]
  );

  return (
    <AccountProfileContext.Provider value={value}>
      {children}
    </AccountProfileContext.Provider>
  );
}

export function useAccountProfile(): AccountProfileContextValue {
  const ctx = React.useContext(AccountProfileContext);
  if (!ctx) {
    throw new Error(
      "useAccountProfile must be used within an AccountProfileProvider"
    );
  }
  return ctx;
}
