import { describe, it, expect } from "vitest";
import { canAccessWorkspacePanels, hasWorkspaceAccessFlag } from "../../src/lib/accessControl";

describe("accessControl", () => {
  it("daje pelny dostep dla konta allowlist", () => {
    const user = {
      id: "u-1",
      email: "ndoemo02@gmail.com",
      user_metadata: {},
      app_metadata: {},
    };

    expect(canAccessWorkspacePanels(user)).toBe(true);
  });

  it("daje dostep po fladze w user_metadata", () => {
    const user = {
      id: "u-2",
      email: "new-user@example.com",
      user_metadata: { workspace_access: true },
      app_metadata: {},
    };

    expect(hasWorkspaceAccessFlag(user)).toBe(true);
    expect(canAccessWorkspacePanels(user)).toBe(true);
  });

  it("daje dostep po fladze zagniezdzonej w app_metadata", () => {
    const user = {
      id: "u-3",
      email: "new-user@example.com",
      user_metadata: {},
      app_metadata: { permissions: { workspace_access: "true" } },
    };

    expect(hasWorkspaceAccessFlag(user)).toBe(true);
    expect(canAccessWorkspacePanels(user)).toBe(true);
  });

  it("blokuje zwykle konto bez flagi", () => {
    const user = {
      id: "u-4",
      email: "someone@example.com",
      user_metadata: {},
      app_metadata: {},
    };

    expect(hasWorkspaceAccessFlag(user)).toBe(false);
    expect(canAccessWorkspacePanels(user)).toBe(false);
  });

  it("blokuje gdy user niezalogowany", () => {
    expect(canAccessWorkspacePanels(null)).toBe(false);
    expect(canAccessWorkspacePanels(undefined)).toBe(false);
  });
});

