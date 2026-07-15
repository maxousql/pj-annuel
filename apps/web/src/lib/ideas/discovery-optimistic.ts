import type {
  IdeaDiscoveryCandidatePayload,
  IdeaDiscoveryFeedPayload,
  IdeaDiscoveryProfilePayload,
} from "@content-ai/shared";

export function removeDiscoveryCandidate(
  feed: IdeaDiscoveryFeedPayload,
  candidateId: string,
): IdeaDiscoveryFeedPayload {
  return {
    ...feed,
    candidates: feed.candidates.filter(
      (candidate) => candidate.id !== candidateId,
    ),
  };
}

export function restoreDiscoveryCandidate(
  feed: IdeaDiscoveryFeedPayload,
  candidate: IdeaDiscoveryCandidatePayload,
): IdeaDiscoveryFeedPayload {
  if (
    candidate.organizationId !== feed.profile.organizationId ||
    feed.candidates.some((current) => current.id === candidate.id)
  ) {
    return feed;
  }

  return {
    ...feed,
    candidates: [candidate, ...feed.candidates],
  };
}

export function mergeCanonicalDiscoveryProfile(
  feed: IdeaDiscoveryFeedPayload,
  profile: IdeaDiscoveryProfilePayload,
): IdeaDiscoveryFeedPayload {
  if (profile.organizationId !== feed.profile.organizationId) {
    return feed;
  }

  const currentResetAt = toTimestamp(feed.profile.resetAt);
  const incomingResetAt = toTimestamp(profile.resetAt);

  if (incomingResetAt < currentResetAt) {
    return feed;
  }

  if (
    incomingResetAt === currentResetAt &&
    profile.learnedSignals < feed.profile.learnedSignals
  ) {
    return feed;
  }

  return {
    ...feed,
    profile,
  };
}

function toTimestamp(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}
