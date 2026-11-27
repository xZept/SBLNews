"use client";

import * as React from "react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import {
  getSocialDrawerOverviewAction,
  getUnreadSocialCountsAction,
} from "@/lib/actions/social";
import type { TopAuraUser } from "@/lib/queries/projections";
import type {
  FriendsOverview,
  UnreadSocialCounts,
} from "@/lib/queries/social";

export type SocialDrawerTab = "friends" | "chat";

interface SocialDrawerContextValue {
  isOpen: boolean;
  activeTab: SocialDrawerTab;
  activeFriend: TopAuraUser | null;
  counts: UnreadSocialCounts;
  overview: FriendsOverview | null;
  overviewLoading: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  openDrawer: (tab?: SocialDrawerTab) => void;
  openChatWithFriend: (friend: TopAuraUser) => void;
  closeDrawer: () => void;
  setActiveTab: (tab: SocialDrawerTab) => void;
  setActiveFriend: (friend: TopAuraUser | null) => void;
  refreshCounts: () => Promise<void>;
  refreshOverview: () => Promise<void>;
}

const EMPTY_COUNTS: UnreadSocialCounts = {
  pendingRequests: 0,
  unreadMessages: 0,
  totalBadge: 0,
};

const FALLBACK_CONTEXT: SocialDrawerContextValue = {
  isOpen: false,
  activeTab: "friends",
  activeFriend: null,
  counts: EMPTY_COUNTS,
  overview: null,
  overviewLoading: false,
  triggerRef: { current: null },
  openDrawer: () => {},
  openChatWithFriend: () => {},
  closeDrawer: () => {},
  setActiveTab: () => {},
  setActiveFriend: () => {},
  refreshCounts: async () => {},
  refreshOverview: async () => {},
};

const SocialDrawerContext =
  React.createContext<SocialDrawerContextValue>(FALLBACK_CONTEXT);

export function SocialDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAccountProfile();
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SocialDrawerTab>("friends");
  const [activeFriend, setActiveFriend] = React.useState<TopAuraUser | null>(
    null
  );
  const [counts, setCounts] = React.useState<UnreadSocialCounts>(EMPTY_COUNTS);
  const [overview, setOverview] = React.useState<FriendsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const refreshCounts = React.useCallback(async () => {
    if (!profile) {
      setCounts(EMPTY_COUNTS);
      return;
    }
    try {
      const res = await getUnreadSocialCountsAction();
      if (res.ok) {
        setCounts(res.counts);
      }
    } catch {
      // Ignore transient network errors on badge polling
    }
  }, [profile]);

  const refreshOverview = React.useCallback(async () => {
    if (!profile) {
      setOverview(null);
      return;
    }
    setOverviewLoading(true);
    try {
      const res = await getSocialDrawerOverviewAction();
      if (res.ok) {
        setOverview(res.overview);
      }
    } catch {
      // Ignore transient errors; drawer displays empty/retry state
    } finally {
      setOverviewLoading(false);
    }
  }, [profile]);

  React.useEffect(() => {
    if (!profile) {
      setIsOpen(false);
      setActiveFriend(null);
      setCounts(EMPTY_COUNTS);
      setOverview(null);
      return;
    }
    void refreshCounts();
  }, [profile, refreshCounts]);

  const openDrawer = React.useCallback(
    (tab: SocialDrawerTab = "friends") => {
      setActiveTab(tab);
      setIsOpen(true);
      void refreshOverview();
    },
    [refreshOverview]
  );

  const openChatWithFriend = React.useCallback(
    (friend: TopAuraUser) => {
      setActiveFriend(friend);
      setActiveTab("chat");
      setIsOpen(true);
      void refreshOverview();
    },
    [refreshOverview]
  );

  const closeDrawer = React.useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const value = React.useMemo<SocialDrawerContextValue>(
    () => ({
      isOpen,
      activeTab,
      activeFriend,
      counts,
      overview,
      overviewLoading,
      triggerRef,
      openDrawer,
      openChatWithFriend,
      closeDrawer,
      setActiveTab,
      setActiveFriend,
      refreshCounts,
      refreshOverview,
    }),
    [
      isOpen,
      activeTab,
      activeFriend,
      counts,
      overview,
      overviewLoading,
      openDrawer,
      openChatWithFriend,
      closeDrawer,
      refreshCounts,
      refreshOverview,
    ]
  );

  return (
    <SocialDrawerContext.Provider value={value}>
      {children}
    </SocialDrawerContext.Provider>
  );
}

export function useSocialDrawer() {
  return React.useContext(SocialDrawerContext);
}
