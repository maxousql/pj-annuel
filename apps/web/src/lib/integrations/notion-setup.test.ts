import type { NotionSchemaHealthPayload } from "@content-ai/shared";
import { describe, expect, it } from "vitest";

import { canRepairNotionSchema, getNotionDriftGuidance } from "./notion-setup";

describe("Notion setup health", () => {
  it("offers repair only when every reported issue is repairable", () => {
    expect(canRepairNotionSchema(health(true))).toBe(true);
    expect(canRepairNotionSchema(health(false))).toBe(false);
  });

  it("asks for a fresh check when migrated drift has no stored details", () => {
    expect(
      getNotionDriftGuidance({
        checkedAt: null,
        issues: [],
        status: "DRIFTED",
      }),
    ).toContain("Relancez le contrôle");
  });

  it("directs non-repairable drift to advanced mapping", () => {
    expect(getNotionDriftGuidance(health(false))).toContain("mapping avancé");
  });
});

function health(reparable: boolean): NotionSchemaHealthPayload {
  return {
    checkedAt: "2026-07-15T00:00:00.000Z",
    issues: [
      {
        actualType: null,
        code: "MISSING_PROPERTY",
        expectedType: "title",
        field: "title",
        message: "La propriété est absente.",
        propertyId: null,
        reparable,
      },
    ],
    status: "DRIFTED",
  };
}
