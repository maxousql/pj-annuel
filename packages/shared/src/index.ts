export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<TData> =
  | {
      data: TData;
      error: null;
      meta?: Record<string, unknown>;
    }
  | {
      data: null;
      error: ApiError;
      meta?: Record<string, unknown>;
    };

export type HealthStatus = "ok" | "degraded";

export type HealthPayload = {
  status: HealthStatus;
  service: "api";
  uptime: number;
  timestamp: string;
  version: string;
};

export const AUTH_PROVIDERS = ["CREDENTIALS", "GOOGLE"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const ORGANIZATION_ROLES = ["ADMIN", "EDITOR", "READER"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["ACTIVE", "PENDING", "DISABLED"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const INVITATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const CONTENT_FORMATS = [
  "BLOG_ARTICLE",
  "LINKEDIN_POST",
  "SOCIAL_POST",
  "EMAIL",
  "HOOK",
  "THREAD",
  "OTHER",
] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CONTENT_GENERATION_FORMATS = [
  "BLOG_ARTICLE",
  "LINKEDIN_POST",
  "SOCIAL_POST",
  "EMAIL",
  "HOOK",
] as const;
export type ContentGenerationFormat =
  (typeof CONTENT_GENERATION_FORMATS)[number];

export const AI_GENERATION_TYPES = [
  "CONTENT_IDEA",
  "CONTENT_DRAFT",
  "RESOURCE_SUMMARY",
] as const;
export type AiGenerationType = (typeof AI_GENERATION_TYPES)[number];

export const AI_GENERATION_ERROR_CODES = [
  "AI_TIMEOUT",
  "AI_INVALID_OUTPUT",
  "AI_PROVIDER_ERROR",
  "AI_QUOTA_EXCEEDED",
] as const;
export type AiGenerationErrorCode = (typeof AI_GENERATION_ERROR_CODES)[number];

export type ContentIdeaSuggestion = {
  title: string;
  angle: string;
  recommendedFormat: ContentFormat;
  justification: string;
  category: string | null;
};

export type ContentIdeasPayload = {
  ideas: ContentIdeaSuggestion[];
};

export type ContentIdeaDuplicateSource = "CONTENT_IDEA" | "CONTENT_ITEM";

export type ContentIdeaDuplicatePayload = {
  matchedId: string | null;
  matchedTitle: string | null;
  score: number;
  source: ContentIdeaDuplicateSource | null;
  warning: boolean;
};

export type GeneratedContentIdeaSuggestion = ContentIdeaSuggestion & {
  duplicate: ContentIdeaDuplicatePayload;
};

export type GeneratedContentIdeasPayload = {
  ideas: GeneratedContentIdeaSuggestion[];
};

export type MarketingContentPayload = {
  title: string;
  body: string;
  format: ContentFormat;
  rationale: string | null;
};

export type ResourceSummaryPayload = {
  summary: string;
  keyPoints: string[];
  suggestedTopic: string | null;
};

export const CONTENT_IDEA_STATUSES = [
  "DRAFT",
  "SAVED",
  "DISMISSED",
  "USED",
  "ARCHIVED",
] as const;
export type ContentIdeaStatus = (typeof CONTENT_IDEA_STATUSES)[number];

export const CONTENT_ITEM_STATUSES = [
  "DRAFT",
  "REVIEW",
  "READY",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
  "DELETED",
] as const;
export type ContentItemStatus = (typeof CONTENT_ITEM_STATUSES)[number];

export const CONTENT_SAVE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "READY",
  "ARCHIVED",
] as const;
export type ContentSaveStatus = (typeof CONTENT_SAVE_STATUSES)[number];

export const CONTENT_SOURCES = [
  "AI_GENERATED",
  "USER_CREATED",
  "CURATED_RESOURCE",
  "IMPORTED",
  "NOTION",
] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export const PUBLICATION_CHANNELS = [
  "LINKEDIN",
  "BLOG",
  "INSTAGRAM",
  "FACEBOOK",
  "X",
  "EMAIL",
  "OTHER",
] as const;
export type PublicationChannel = (typeof PUBLICATION_CHANNELS)[number];

export const PUBLICATION_STATUSES = [
  "PLANNED",
  "PUBLISHED",
  "CANCELLED",
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const HISTORY_ITEM_TYPES = ["IDEA", "CONTENT"] as const;
export type HistoryItemType = (typeof HISTORY_ITEM_TYPES)[number];

export type DuplicateCheckPayload = {
  matchedId: string | null;
  matchedTitle: string | null;
  matchedType: HistoryItemType | null;
  score: number;
  targetType: HistoryItemType;
  threshold: number;
  warning: boolean;
};

export type ContentDuplicatePayload = {
  matchedContentId: string | null;
  matchedTitle: string | null;
  score: number;
  warning: boolean;
};

export type ContentTagPayload = {
  color: string | null;
  id: string;
  name: string;
  slug: string;
};

export type ContentCategoryPayload = {
  id: string;
  name: string;
  slug: string;
};

export type ContentIdeaOption = {
  angle: string;
  category: string | null;
  createdAt: string;
  id: string;
  recommendedFormat: ContentFormat;
  status: ContentIdeaStatus;
  title: string;
};

export type ContentIdeaOptionsPayload = {
  ideas: ContentIdeaOption[];
};

export type ContentIdeaPayload = ContentIdeaOption & {
  archivedAt: string | null;
  justification: string;
  organizationId: string;
  updatedAt: string;
};

export type ContentIdeasListPayload = {
  ideas: ContentIdeaPayload[];
};

export type ContentIdeaMutationPayload = {
  duplicate: ContentIdeaDuplicatePayload;
  idea: ContentIdeaPayload;
};

export type ContentItemPayload = {
  archivedAt: string | null;
  body: string;
  brief: string | null;
  category: ContentCategoryPayload | null;
  categoryId: string | null;
  createdAt: string;
  duplicateScore: number | null;
  format: ContentFormat;
  id: string;
  ideaId: string | null;
  organizationId: string;
  publishedAt: string | null;
  source: ContentSource;
  status: ContentItemStatus;
  tags: ContentTagPayload[];
  title: string;
  topic: string | null;
  updatedAt: string;
};

export type ContentItemsListPayload = {
  contents: ContentItemPayload[];
};

export type ContentLibraryPaginationPayload = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ContentLibraryPayload = {
  categories: ContentCategoryPayload[];
  contents: ContentItemPayload[];
  pagination: ContentLibraryPaginationPayload;
  tags: ContentTagPayload[];
};

export type ContentLibraryDetailPayload = {
  categories: ContentCategoryPayload[];
  content: ContentItemPayload;
  tags: ContentTagPayload[];
};

export type PublicationPlanContentOption = {
  format: ContentFormat;
  id: string;
  status: ContentItemStatus;
  title: string;
};

export type PublicationPlanPayload = {
  channel: PublicationChannel;
  conflictCount: number;
  content: PublicationPlanContentOption;
  contentId: string;
  createdAt: string;
  id: string;
  notes: string | null;
  organizationId: string;
  scheduledAt: string;
  status: PublicationStatus;
  updatedAt: string;
};

export type PublicationPlansPayload = {
  canEdit: boolean;
  contentOptions: PublicationPlanContentOption[];
  plans: PublicationPlanPayload[];
};

export type PublicationPlanMutationPayload = {
  plan: PublicationPlanPayload;
};

export type ContentDraftPayload = MarketingContentPayload & {
  duplicate: ContentDuplicatePayload;
};

export type GeneratedContentPayload = {
  draft: ContentDraftPayload;
  sourceIdea: ContentIdeaOption | null;
};

export type ContentMutationPayload = {
  content: ContentItemPayload;
  duplicate: ContentDuplicatePayload;
};

export type HistoryListItemPayload = {
  createdAt: string;
  duplicateScore: number | null;
  excerpt: string;
  format: ContentFormat;
  id: string;
  status: ContentIdeaStatus | ContentItemStatus;
  title: string;
  topic: string | null;
  type: HistoryItemType;
  updatedAt: string;
};

export type HistoryPaginationPayload = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type HistoryListPayload = {
  items: HistoryListItemPayload[];
  pagination: HistoryPaginationPayload;
};

export type HistoryIdeaDetailPayload = HistoryListItemPayload & {
  angle: string;
  archivedAt: string | null;
  justification: string;
  organizationId: string;
  type: "IDEA";
};

export type HistoryContentDetailPayload = HistoryListItemPayload & {
  body: string;
  brief: string | null;
  ideaId: string | null;
  organizationId: string;
  source: ContentSource;
  type: "CONTENT";
};

export type HistoryDetailPayload = {
  item: HistoryIdeaDetailPayload | HistoryContentDetailPayload;
};

export type DashboardCountersPayload = {
  aiGenerationsCount: number;
  contentsCount: number;
  draftsCount: number;
  ideasCount: number;
  toReviewCount: number;
};

export type DashboardTopTopicPayload = {
  count: number;
  topic: string;
};

export type DashboardLatestItemPayload = {
  format: ContentFormat;
  id: string;
  status: ContentIdeaStatus | ContentItemStatus;
  title: string;
  topic: string | null;
  type: HistoryItemType;
  updatedAt: string;
};

export type DashboardSummaryPayload = {
  canEdit: boolean;
  counters: DashboardCountersPayload;
  editorialContextConfigured: boolean;
  latestItems: DashboardLatestItemPayload[];
  reviewItems: DashboardLatestItemPayload[];
  topTopics: DashboardTopTopicPayload[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type AuthSessionPayload = {
  user: AuthUser;
};

export const ONBOARDING_STEPS = [
  "CREATE_ORGANIZATION",
  "CONFIGURE_EDITORIAL_CONTEXT",
  "COMPLETE",
  "READY",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  role: OrganizationRole;
};

export type EditorialContextPayload = {
  id: string;
  organizationId: string;
  sector: string;
  targetAudience: string;
  tone: string;
  positioning: string;
  themes: string[];
  resourceNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EditorialContextSummaryPayload = {
  configured: boolean;
  organizationId: string;
  positioning?: string;
  resourceNotes?: string;
  sector?: string;
  targetAudience?: string;
  themes?: string[];
  tone?: string;
  updatedAt?: string;
};

export type MembershipSummary = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  status: MembershipStatus;
};

export type ActiveOrganizationPayload = {
  organization: OrganizationSummary;
  membership: {
    id: string;
    role: OrganizationRole;
    status: MembershipStatus;
  };
};

export type OrganizationsListPayload = {
  organizations: OrganizationSummary[];
};

export type MembersListPayload = {
  members: MembershipSummary[];
};

export type OnboardingStatePayload = {
  activeOrganization: OrganizationSummary | null;
  completed: boolean;
  editorialContext: EditorialContextPayload | null;
  nextStep: OnboardingStep;
  organizations: OrganizationSummary[];
  user: {
    onboardingCompletedAt: string | null;
  };
};

export function ok<TData>(
  data: TData,
  meta?: Record<string, unknown>,
): ApiResponse<TData> {
  return meta ? { data, error: null, meta } : { data, error: null };
}

export function fail(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiResponse<never> {
  return {
    data: null,
    error: details ? { code, message, details } : { code, message },
  };
}
