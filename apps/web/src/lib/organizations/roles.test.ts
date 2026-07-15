import { describe, expect, it } from "vitest";

import { getOrganizationRoleLabel } from "./roles";

describe("organization role labels", () => {
  it.each([
    ["ADMIN", "Administrateur"],
    ["EDITOR", "Éditeur"],
    ["READER", "Lecteur"],
  ] as const)("translates %s", (role, label) => {
    expect(getOrganizationRoleLabel(role)).toBe(label);
  });

  it("uses a personal account fallback without an active organization", () => {
    expect(getOrganizationRoleLabel()).toBe("Compte personnel");
  });
});
