import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("../src/components/layout/account-profile-provider", () => ({
  useAccountProfile: () => ({
    profile: null,
    email: null,
    loading: false,
    theme: "light",
    setThemeLocalAndPersist: async () => {},
    refreshAccountProfile: async () => {},
    signOutAndResetTheme: async () => {},
  }),
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
