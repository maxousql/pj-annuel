import type {
  IdeaDiscoveryCandidatePayload,
  IdeaDiscoveryFeedPayload,
  IdeaDiscoveryProfilePayload,
} from "@content-ai/shared";
import { describe, expect, it } from "vitest";

import {
  mergeCanonicalDiscoveryProfile,
  removeDiscoveryCandidate,
  restoreDiscoveryCandidate,
} from "./discovery-optimistic";

describe("optimistic idea discovery", () => {
  it("removes only the selected candidate", () => {
    const feed = discoveryFeed();

    expect(removeDiscoveryCandidate(feed, "candidate-1").candidates).toEqual([
      expect.objectContaining({ id: "candidate-2" }),
    ]);
  });

  it("restores a failed candidate once at the front of its organization", () => {
    const feed = removeDiscoveryCandidate(discoveryFeed(), "candidate-1");
    const restored = restoreDiscoveryCandidate(feed, candidate("candidate-1"));

    expect(restored.candidates.map(({ id }) => id)).toEqual([
      "candidate-1",
      "candidate-2",
    ]);
    expect(restoreDiscoveryCandidate(restored, candidate("candidate-1"))).toBe(
      restored,
    );
    expect(
      restoreDiscoveryCandidate(
        feed,
        candidate("foreign-candidate", "another-organization"),
      ),
    ).toBe(feed);
  });

  it("ignores stale or foreign profile responses", () => {
    const feed = discoveryFeed({ learnedSignals: 3 });

    expect(
      mergeCanonicalDiscoveryProfile(
        feed,
        discoveryProfile({ learnedSignals: 2 }),
      ),
    ).toBe(feed);
    expect(
      mergeCanonicalDiscoveryProfile(
        feed,
        discoveryProfile({
          learnedSignals: 8,
          organizationId: "another-organization",
        }),
      ),
    ).toBe(feed);
  });

  it("accepts a newer reset even when its learned count is lower", () => {
    const feed = discoveryFeed({
      learnedSignals: 8,
      resetAt: "2026-07-15T10:00:00.000Z",
    });
    const resetProfile = discoveryProfile({
      learnedSignals: 0,
      resetAt: "2026-07-15T11:00:00.000Z",
    });

    expect(mergeCanonicalDiscoveryProfile(feed, resetProfile).profile).toEqual(
      resetProfile,
    );
  });
});

function discoveryFeed(
  profileOverrides: Partial<IdeaDiscoveryProfilePayload> = {},
): IdeaDiscoveryFeedPayload {
  return {
    candidates: [candidate("candidate-1"), candidate("candidate-2")],
    profile: discoveryProfile(profileOverrides),
  };
}

function discoveryProfile(
  overrides: Partial<IdeaDiscoveryProfilePayload> = {},
): IdeaDiscoveryProfilePayload {
  return {
    avoidedFormats: [],
    avoidedThemes: [],
    dislikedCount: 0,
    learnedSignals: 0,
    likedCount: 0,
    organizationId: "organization-id",
    preferredFormats: [],
    preferredThemes: [],
    resetAt: null,
    updatedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
  };
}

function candidate(
  id: string,
  organizationId = "organization-id",
): IdeaDiscoveryCandidatePayload {
  return {
    angle: `Angle de ${id}`,
    category: "IA",
    createdAt: "2026-07-15T10:00:00.000Z",
    duplicate: {
      matchedId: null,
      matchedTitle: null,
      score: 0,
      source: null,
      warning: false,
    },
    id,
    isExploratory: false,
    justification: `Justification de ${id}`,
    organizationId,
    recommendedFormat: "LINKEDIN_POST",
    title: `Idée ${id}`,
  };
}
