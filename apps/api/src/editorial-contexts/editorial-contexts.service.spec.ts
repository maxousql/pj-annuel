import { BadRequestException } from "@nestjs/common";

import {
  buildEditorialContextSummary,
  normalizeEditorialContextInput,
  type EditorialContextRecord,
} from "./editorial-contexts.service";

describe("Editorial context helpers", () => {
  it("normalizes themes and trims optional fields", () => {
    const normalized = normalizeEditorialContextInput({
      positioning: "  Assistant IA pour equipes marketing  ",
      resourceNotes: "  Eviter les promesses trop vagues  ",
      sector: " SaaS B2B ",
      targetAudience: " CMO ",
      themes: [" IA ", "ia", " Acquisition "],
      tone: " Direct ",
    });

    expect(normalized).toEqual({
      positioning: "Assistant IA pour equipes marketing",
      resourceNotes: "Eviter les promesses trop vagues",
      sector: "SaaS B2B",
      targetAudience: "CMO",
      themes: ["IA", "Acquisition"],
      tone: "Direct",
    });
  });

  it("rejects incomplete minimum context", () => {
    expect(() =>
      normalizeEditorialContextInput({
        sector: "SaaS",
        targetAudience: "CMO",
        themes: [],
        tone: "Direct",
      }),
    ).toThrow(BadRequestException);
  });

  it("builds a summary without empty optional fields", () => {
    const summary = buildEditorialContextSummary("organization-id", {
      createdAt: "2026-07-03T00:00:00.000Z",
      id: "context-id",
      organizationId: "organization-id",
      positioning: "  ",
      resourceNotes: null,
      sector: "SaaS B2B",
      targetAudience: "CMO",
      themes: ["IA", "Acquisition"],
      tone: "Expert",
      updatedAt: "2026-07-03T01:00:00.000Z",
    } satisfies EditorialContextRecord);

    expect(summary).toEqual({
      configured: true,
      organizationId: "organization-id",
      sector: "SaaS B2B",
      targetAudience: "CMO",
      themes: ["IA", "Acquisition"],
      tone: "Expert",
      updatedAt: "2026-07-03T01:00:00.000Z",
    });
  });
});
