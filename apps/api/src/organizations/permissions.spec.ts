import {
  assertRole,
  canEditContent,
  canManageOrganization,
  canReadContent,
  hasAnyRole,
} from "./permissions";

describe("organization permissions", () => {
  it("allows every active role to read content", () => {
    expect(canReadContent("ADMIN")).toBe(true);
    expect(canReadContent("EDITOR")).toBe(true);
    expect(canReadContent("READER")).toBe(true);
  });

  it("allows editors and admins to edit content", () => {
    expect(canEditContent("ADMIN")).toBe(true);
    expect(canEditContent("EDITOR")).toBe(true);
    expect(canEditContent("READER")).toBe(false);
  });

  it("allows only admins to manage the organization", () => {
    expect(canManageOrganization("ADMIN")).toBe(true);
    expect(canManageOrganization("EDITOR")).toBe(false);
    expect(canManageOrganization("READER")).toBe(false);
  });

  it("checks role hierarchy for guards", () => {
    expect(hasAnyRole("ADMIN", ["EDITOR"])).toBe(true);
    expect(hasAnyRole("EDITOR", ["ADMIN"])).toBe(false);
    expect(() => assertRole("READER", ["EDITOR"])).toThrow(
      "Role insuffisant pour cette organisation.",
    );
  });
});
