import { describe, expect, it } from "vitest";

import {
  getNavigationItemsForRole,
  getOrganizationSlugFromPath,
  isNavigationItemEnabled,
} from "./app-navigation";

describe("app navigation", () => {
  it("keeps reader navigation focused on readable modules", () => {
    expect(getNavigationItemsForRole("READER").map((item) => item.id)).toEqual([
      "dashboard",
      "ideas",
      "contents",
      "history",
      "calendar",
    ]);
  });

  it("exposes organization settings only to admins", () => {
    expect(
      getNavigationItemsForRole("EDITOR").map((item) => item.id),
    ).not.toContain("settings");
    expect(getNavigationItemsForRole("ADMIN").map((item) => item.id)).toContain(
      "settings",
    );
  });

  it("marks calendar as available in the sidebar", () => {
    const readerCalendar = getNavigationItemsForRole("READER").find((item) => {
      return item.id === "calendar";
    });

    expect(readerCalendar).toBeDefined();
    expect(
      readerCalendar ? isNavigationItemEnabled(readerCalendar) : false,
    ).toBe(true);
  });

  it("keeps future modules unavailable without removing them", () => {
    const editorCuration = getNavigationItemsForRole("EDITOR").find((item) => {
      return item.id === "curation";
    });

    expect(editorCuration).toBeDefined();
    expect(
      editorCuration ? isNavigationItemEnabled(editorCuration) : false,
    ).toBe(false);
  });

  it("extracts organization slugs from protected organization routes", () => {
    expect(getOrganizationSlugFromPath("/app/acme/dashboard")).toBe("acme");
    expect(
      getOrganizationSlugFromPath("/app/organizations/new"),
    ).toBeUndefined();
    expect(getOrganizationSlugFromPath("/app/onboarding")).toBeUndefined();
    expect(getOrganizationSlugFromPath("/app/settings")).toBeUndefined();
  });
});
