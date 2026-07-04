import {
  CONTENT_FORMATS,
  CONTENT_ITEM_STATUSES,
  ORGANIZATION_ROLES,
} from "@content-ai/shared";
import { BadRequestException } from "@nestjs/common";

import {
  assertActiveOrganizationId,
  organizationScopedWhere,
} from "./organization-scope";

describe("organization scope helpers", () => {
  it("validates active organization identifiers", () => {
    expect(
      assertActiveOrganizationId("018f7b8f-3eb4-4e57-a321-7c0ecb9f5130"),
    ).toBe("018f7b8f-3eb4-4e57-a321-7c0ecb9f5130");
  });

  it("rejects missing or invalid organization identifiers", () => {
    expect(() => assertActiveOrganizationId(undefined)).toThrow(
      BadRequestException,
    );
    expect(() => assertActiveOrganizationId("demo")).toThrow(
      BadRequestException,
    );
  });

  it("adds the organization filter to repository queries", () => {
    expect(
      organizationScopedWhere(
        { organizationId: "018f7b8f-3eb4-4e57-a321-7c0ecb9f5130" },
        { status: "DRAFT" },
      ),
    ).toEqual({
      organizationId: "018f7b8f-3eb4-4e57-a321-7c0ecb9f5130",
      status: "DRAFT",
    });
  });

  it("exposes centralized enum values for business statuses", () => {
    expect(ORGANIZATION_ROLES).toEqual(["ADMIN", "EDITOR", "READER"]);
    expect(CONTENT_FORMATS).toContain("LINKEDIN_POST");
    expect(CONTENT_ITEM_STATUSES).toContain("SCHEDULED");
  });
});
