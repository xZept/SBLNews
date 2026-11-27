import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const mockUseAccountProfile = vi.fn(() => ({
  profile: null as {
    id: string;
    display_name: string;
    avatar_url: string | null;
    affiliation_role: string | null;
    bio: string | null;
    aura_score: number;
    theme_preference: "light" | "dark";
    upvoted_studies_visibility: "private" | "friends" | "public";
    viewed_studies_visibility: "private" | "friends" | "public";
    role: "member" | "admin";
    created_at: string;
    updated_at: string;
  } | null,
  email: null as string | null,
  loading: false,
  theme: "light" as const,
  setThemeLocalAndPersist: async () => {},
  refreshAccountProfile: async () => {},
  signOutAndResetTheme: async () => {},
}));

const mockOpenDrawer = vi.fn();
const mockUseSocialDrawer = vi.fn(() => ({
  isOpen: false,
  activeTab: "friends" as const,
  activeFriendId: null as string | null,
  pendingStudySend: null,
  counts: {
    unreadMessages: 0,
    incomingFriendRequests: 0,
    totalBadge: 0,
  },
  triggerRef: { current: null },
  openDrawer: mockOpenDrawer,
  closeDrawer: vi.fn(),
  setActiveTab: vi.fn(),
  openChatWithFriend: vi.fn(),
  openStudySendToFriend: vi.fn(),
  clearPendingStudySend: vi.fn(),
  refreshCounts: vi.fn(),
}));

vi.mock("../src/components/layout/account-profile-provider", () => ({
  useAccountProfile: () => mockUseAccountProfile(),
}));

vi.mock("../src/components/layout/social-drawer-provider", () => ({
  useSocialDrawer: () => mockUseSocialDrawer(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import { fetchIsAdmin, TopNav } from "../src/components/layout/top-nav";

function createMockSupabase(result: {
  data: { role: string }[] | { role: string } | null;
  error: { message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue(result);

  return {
    client: { rpc } as unknown as Parameters<typeof fetchIsAdmin>[0],
    rpc,
  };
}

describe("TopNav admin RBAC visibility (rbac-issue)", () => {
  it("returns false for newly created member accounts", async () => {
    const mock = createMockSupabase({
      data: [{ role: "member" }],
      error: null,
    });

    const isAdmin = await fetchIsAdmin(mock.client, "user-member-1");

    expect(isAdmin).toBe(false);
    expect(mock.rpc).toHaveBeenCalledWith("get_my_account_profile");
  });

  it("returns true only when get_my_account_profile role is 'admin'", async () => {
    const mock = createMockSupabase({
      data: [{ role: "admin" }],
      error: null,
    });

    const isAdmin = await fetchIsAdmin(mock.client, "user-admin-1");

    expect(isAdmin).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("get_my_account_profile");
  });

  it("returns false when profile RPC fails or returns null", async () => {
    const errMock = createMockSupabase({
      data: null,
      error: { message: "Row not found" },
    });
    expect(await fetchIsAdmin(errMock.client, "user-missing")).toBe(false);

    const nullMock = createMockSupabase({
      data: null,
      error: null,
    });
    expect(await fetchIsAdmin(nullMock.client, "user-null")).toBe(false);
  });

  it("does not render /admin/review link in initial unauthenticated render", () => {
    const html = renderToStaticMarkup(React.createElement(TopNav));
    expect(html).not.toContain('href="/admin/review"');
  });

  it("gates the /admin/review link behind isAdmin in AccountBubble rendered by TopNav", () => {
    const topNavSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/layout/top-nav.tsx"),
      "utf8"
    );
    const bubbleSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/layout/account-bubble.tsx"),
      "utf8"
    );

    expect(topNavSrc).toContain("<AccountBubble />");
    expect(bubbleSrc).toContain("{isAdmin && (");
    expect(bubbleSrc).toContain('href="/admin/review"');
  });
});

describe("TopNav Friends & Chat drawer trigger", () => {
  const SIGNED_IN_PROFILE = {
    id: "11111111-1111-4111-8111-111111111111",
    display_name: "Test Lifter",
    avatar_url: null,
    affiliation_role: "Lifter",
    bio: null,
    aura_score: 42,
    theme_preference: "light" as const,
    upvoted_studies_visibility: "private" as const,
    viewed_studies_visibility: "private" as const,
    role: "member" as const,
    created_at: "2026-11-28T00:00:00Z",
    updated_at: "2026-11-28T00:00:00Z",
  };

  it("does not render the Friends and Chat drawer trigger when signed out", () => {
    mockUseAccountProfile.mockReturnValueOnce({
      profile: null,
      email: null,
      loading: false,
      theme: "light",
      setThemeLocalAndPersist: async () => {},
      refreshAccountProfile: async () => {},
      signOutAndResetTheme: async () => {},
    });

    const html = renderToStaticMarkup(React.createElement(TopNav));
    expect(html).not.toContain("Open Friends and Chat");
    expect(html).toContain("Sign in with Google");
  });

  it("renders the Friends and Chat drawer trigger without unread badge when totalBadge is 0", () => {
    mockUseAccountProfile.mockReturnValueOnce({
      profile: SIGNED_IN_PROFILE,
      email: "lifter@example.com",
      loading: false,
      theme: "light",
      setThemeLocalAndPersist: async () => {},
      refreshAccountProfile: async () => {},
      signOutAndResetTheme: async () => {},
    });
    mockUseSocialDrawer.mockReturnValueOnce({
      isOpen: false,
      activeTab: "friends",
      activeFriendId: null,
      pendingStudySend: null,
      counts: { unreadMessages: 0, incomingFriendRequests: 0, totalBadge: 0 },
      triggerRef: { current: null },
      openDrawer: mockOpenDrawer,
      closeDrawer: vi.fn(),
      setActiveTab: vi.fn(),
      openChatWithFriend: vi.fn(),
      openStudySendToFriend: vi.fn(),
      clearPendingStudySend: vi.fn(),
      refreshCounts: vi.fn(),
    });

    const html = renderToStaticMarkup(React.createElement(TopNav));
    expect(html).toContain('aria-label="Open Friends and Chat"');
    expect(html).not.toContain("unread)");
  });

  it("renders unread badge count and caps display at 99+", () => {
    mockUseAccountProfile.mockReturnValueOnce({
      profile: SIGNED_IN_PROFILE,
      email: "lifter@example.com",
      loading: false,
      theme: "light",
      setThemeLocalAndPersist: async () => {},
      refreshAccountProfile: async () => {},
      signOutAndResetTheme: async () => {},
    });
    mockUseSocialDrawer.mockReturnValueOnce({
      isOpen: false,
      activeTab: "friends",
      activeFriendId: null,
      pendingStudySend: null,
      counts: { unreadMessages: 115, incomingFriendRequests: 5, totalBadge: 120 },
      triggerRef: { current: null },
      openDrawer: mockOpenDrawer,
      closeDrawer: vi.fn(),
      setActiveTab: vi.fn(),
      openChatWithFriend: vi.fn(),
      openStudySendToFriend: vi.fn(),
      clearPendingStudySend: vi.fn(),
      refreshCounts: vi.fn(),
    });

    const html = renderToStaticMarkup(React.createElement(TopNav));
    expect(html).toContain('aria-label="Open Friends and Chat (120 unread)"');
    expect(html).toContain("99+");
  });

  it("wires the drawer trigger button to openDrawer('friends')", () => {
    const topNavSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/layout/top-nav.tsx"),
      "utf8"
    );
    expect(topNavSrc).toContain('onClick={() => openDrawer("friends")}');
  });
});
