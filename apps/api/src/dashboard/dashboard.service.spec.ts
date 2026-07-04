import { buildDashboardSummary } from "./dashboard.service";

describe("buildDashboardSummary", () => {
  it("calculates organization aggregates and top topics", () => {
    const summary = buildDashboardSummary({
      canEdit: true,
      contents: [
        {
          createdAt: new Date("2026-07-02T00:00:00.000Z"),
          duplicateScore: null,
          format: "EMAIL",
          id: "content-1",
          status: "DRAFT",
          title: "Email activation",
          topic: "Activation",
          updatedAt: new Date("2026-07-02T02:00:00.000Z"),
        },
        {
          createdAt: new Date("2026-07-02T00:00:00.000Z"),
          duplicateScore: null,
          format: "LINKEDIN_POST",
          id: "content-2",
          status: "REVIEW",
          title: "Post retention",
          topic: "Retention",
          updatedAt: new Date("2026-07-02T01:00:00.000Z"),
        },
      ],
      editorialContextConfigured: true,
      generationLogs: [
        { id: "log-1", status: "SUCCEEDED" },
        { id: "log-2", status: "FAILED" },
      ],
      ideas: [
        {
          category: "Activation",
          createdAt: new Date("2026-07-02T00:00:00.000Z"),
          id: "idea-1",
          recommendedFormat: "LINKEDIN_POST",
          status: "SAVED",
          title: "Idee activation",
          updatedAt: new Date("2026-07-02T03:00:00.000Z"),
        },
      ],
    });

    expect(summary).toMatchObject({
      counters: {
        aiGenerationsCount: 1,
        contentsCount: 2,
        draftsCount: 1,
        ideasCount: 1,
        toReviewCount: 1,
      },
      editorialContextConfigured: true,
      topTopics: [
        { count: 2, topic: "Activation" },
        { count: 1, topic: "Retention" },
      ],
    });
    expect(summary.latestItems[0]).toMatchObject({
      id: "idea-1",
      type: "IDEA",
    });
    expect(summary.reviewItems).toHaveLength(2);
  });
});
