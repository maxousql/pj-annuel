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

export type ReadinessPayload = HealthPayload & {
  dependencies: {
    database: "ok";
    migration: string;
  };
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

export const IDEA_DISCOVERY_SIGNALS = ["LIKE", "DISLIKE", "SKIP"] as const;
export type IdeaDiscoverySignal = (typeof IDEA_DISCOVERY_SIGNALS)[number];

export const IDEA_DISCOVERY_REJECTION_REASONS = [
  "OFF_TOPIC",
  "ALREADY_COVERED",
  "WRONG_FORMAT",
  "TOO_GENERIC",
  "NOT_NOW",
] as const;
export type IdeaDiscoveryRejectionReason =
  (typeof IDEA_DISCOVERY_REJECTION_REASONS)[number];

export type IdeaDiscoveryCandidatePayload = ContentIdeaSuggestion & {
  createdAt: string;
  duplicate: ContentIdeaDuplicatePayload;
  id: string;
  isExploratory: boolean;
  organizationId: string;
};

export type IdeaDiscoveryThemePreferencePayload = {
  name: string;
  score: number;
};

export type IdeaDiscoveryFormatPreferencePayload = {
  format: ContentFormat;
  score: number;
};

export type IdeaDiscoveryProfilePayload = {
  avoidedFormats: IdeaDiscoveryFormatPreferencePayload[];
  avoidedThemes: IdeaDiscoveryThemePreferencePayload[];
  dislikedCount: number;
  learnedSignals: number;
  likedCount: number;
  organizationId: string;
  preferredFormats: IdeaDiscoveryFormatPreferencePayload[];
  preferredThemes: IdeaDiscoveryThemePreferencePayload[];
  resetAt: string | null;
  updatedAt: string | null;
};

export type IdeaDiscoveryFeedPayload = {
  candidates: IdeaDiscoveryCandidatePayload[];
  profile: IdeaDiscoveryProfilePayload;
};

export type IdeaDiscoveryFeedbackPayload = {
  candidateId: string;
  reason: IdeaDiscoveryRejectionReason | null;
  signal: IdeaDiscoverySignal;
};

export type IdeaDiscoveryFeedbackResultPayload = {
  candidate: IdeaDiscoveryCandidatePayload;
  feedback: IdeaDiscoveryFeedbackPayload;
  idea: ContentIdeaPayload | null;
  profile: IdeaDiscoveryProfilePayload;
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

export const GENERATION_LANGUAGES = ["fr", "en", "es", "de"] as const;
export type GenerationLanguage = (typeof GENERATION_LANGUAGES)[number];

export const GENERATION_TARGET_LENGTHS = ["short", "standard", "long"] as const;
export type GenerationTargetLength = (typeof GENERATION_TARGET_LENGTHS)[number];

export type GenerationSettingsPayload = {
  creativity: number;
  language: GenerationLanguage;
  targetLength: GenerationTargetLength;
  toneIntensity: number;
};

export type BrandVoiceProfilePayload = GenerationSettingsPayload & {
  examples: string[];
  forbiddenTerms: string[];
  organizationId: string;
  toneRules: string;
  updatedAt: string | null;
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

export const RESOURCE_TYPES = ["URL", "RSS", "MANUAL", "NOTION"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_STATUSES = [
  "NEW",
  "SUMMARIZED",
  "USED",
  "ARCHIVED",
] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const SOURCE_FEED_STATUSES = ["ACTIVE", "PAUSED", "ERROR"] as const;
export type SourceFeedStatus = (typeof SOURCE_FEED_STATUSES)[number];

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

export type ContentIdeaAuthorPayload = {
  id: string;
  name: string;
};

export type ContentIdeaPayload = ContentIdeaOption & {
  archivedAt: string | null;
  createdBy: ContentIdeaAuthorPayload | null;
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

export type CuratedResourcePayload = {
  createdAt: string;
  description: string | null;
  id: string;
  keyPoints: string[];
  organizationId: string;
  publishedAt: string | null;
  sourceFeedId: string | null;
  sourceName: string | null;
  status: ResourceStatus;
  summary: string | null;
  tags: ContentTagPayload[];
  title: string;
  topic: string | null;
  type: ResourceType;
  updatedAt: string;
  url: string;
};

export type SourceFeedPayload = {
  createdAt: string;
  id: string;
  lastError: string | null;
  lastFetchedAt: string | null;
  organizationId: string;
  status: SourceFeedStatus;
  title: string;
  updatedAt: string;
  url: string;
};

export type CurationPayload = {
  canEdit: boolean;
  feeds: SourceFeedPayload[];
  resources: CuratedResourcePayload[];
  tags: ContentTagPayload[];
};

export type CurationResourceMutationPayload = {
  resource: CuratedResourcePayload;
};

export type CurationFeedMutationPayload = {
  feed: SourceFeedPayload;
  importedCount: number;
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

export type AccountMembershipPayload = {
  joinedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: OrganizationRole;
};

export type AccountActivityStatsPayload = {
  aiGenerations: number;
  contentIdeasGenerated: number;
  contentIdeasSaved: number;
  contentItemsCreated: number;
  discoveryFeedbacks: {
    disliked: number;
    liked: number;
    skipped: number;
  };
};

export type AccountProfilePayload = {
  credentialsEnabled: boolean;
  memberships: AccountMembershipPayload[];
  providers: AuthProvider[];
  stats: AccountActivityStatsPayload;
  user: AuthUser & {
    createdAt: string;
  };
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

export type InvitationSummaryPayload = {
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  role: OrganizationRole;
  status: InvitationStatus;
};

export type InvitationsPayload = {
  invitations: InvitationSummaryPayload[];
  members: MembershipSummary[];
};

export type InvitationPreviewPayload = {
  email: string;
  expiresAt: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
  status: InvitationStatus;
};

export type InvitationMutationPayload = {
  invitation: InvitationSummaryPayload;
  previewUrl?: string;
};

export type MemberMutationPayload = {
  member: MembershipSummary;
};

export type OnboardingStatePayload = {
  advanced: AdvancedOnboardingPayload | null;
  activeOrganization: OrganizationSummary | null;
  completed: boolean;
  editorialContext: EditorialContextPayload | null;
  nextStep: OnboardingStep;
  organizations: OrganizationSummary[];
  user: {
    onboardingCompletedAt: string | null;
  };
};

export const ADVANCED_ONBOARDING_STEPS = [
  "CHECKLIST",
  "PRESET",
  "FIRST_IDEA",
  "FIRST_CONTENT",
  "DONE",
] as const;
export type AdvancedOnboardingStep = (typeof ADVANCED_ONBOARDING_STEPS)[number];

export type OnboardingPresetPayload = {
  briefExample: string;
  id: string;
  positioning: string;
  sector: string;
  targetAudience: string;
  themes: string[];
  tone: string;
  version: string;
};

export type AdvancedOnboardingPayload = {
  availableSteps: AdvancedOnboardingStep[];
  completedAt: string | null;
  completedSteps: AdvancedOnboardingStep[];
  currentStep: AdvancedOnboardingStep;
  presets: OnboardingPresetPayload[];
  skippedAt: string | null;
};

export const AUTOMATION_RULE_TYPES = [
  "PUBLICATION_REMINDER",
  "EDITORIAL_RECOMMENDATION",
] as const;
export type AutomationRuleType = (typeof AUTOMATION_RULE_TYPES)[number];

export const AUTOMATION_RULE_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type AutomationRuleStatus = (typeof AUTOMATION_RULE_STATUSES)[number];

export const RECOMMENDATION_STATUSES = [
  "OPEN",
  "DISMISSED",
  "APPLIED",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const NOTIFICATION_STATUSES = ["UNREAD", "READ"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export type AutomationRulePayload = {
  id: string;
  parameters: Record<string, unknown>;
  status: AutomationRuleStatus;
  type: AutomationRuleType;
  updatedAt: string;
};

export type RecommendationPayload = {
  createdAt: string;
  id: string;
  message: string;
  status: RecommendationStatus;
  targetId: string | null;
  targetType: string | null;
  type: string;
};

export type NotificationPayload = {
  body: string;
  createdAt: string;
  id: string;
  readAt: string | null;
  status: NotificationStatus;
  title: string;
};

export type NotificationPreferencePayload = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

export type AutomationsPayload = {
  canEdit: boolean;
  notifications: NotificationPayload[];
  preferences: NotificationPreferencePayload;
  recommendations: RecommendationPayload[];
  rules: AutomationRulePayload[];
};

export const NOTION_CONFLICT_STRATEGIES = [
  "LOCAL_WINS",
  "NOTION_WINS",
  "NEWEST_WINS",
] as const;
export type NotionConflictStrategy =
  (typeof NOTION_CONFLICT_STRATEGIES)[number];

export type NotionPropertyMappingPayload = {
  channel: string;
  date: string;
  entityType: string;
  sourceUrl: string;
  status: string;
  title: string;
};

export type NotionPropertyIdMappingPayload = NotionPropertyMappingPayload;

export type NotionPropertyTypeMappingPayload = {
  channel: "select";
  date: "date";
  entityType: "select";
  sourceUrl: "url";
  status: "select" | "status";
  title: "title";
};

export type NotionDatabasePayload = {
  databaseId: string;
  dataSourceId: string;
  /** @deprecated Use dataSourceId. Kept during the advanced-mapping transition. */
  id: string;
  name: string;
  url: string | null;
  properties: Array<{
    id: string;
    name: string;
    options: string[];
    type: string;
  }>;
};

export type NotionParentPagePayload = {
  id: string;
  name: string;
  url: string | null;
};

export type NotionSchemaStatus =
  "UNCHECKED" | "PROVISIONING" | "READY" | "DRIFTED" | "UNAVAILABLE";

export type NotionSchemaIssuePayload = {
  actualType: string | null;
  code:
    | "MISSING_PROPERTY"
    | "INCOMPATIBLE_PROPERTY"
    | "MISSING_STATUS_OPTIONS"
    | "SOURCE_MISMATCH";
  expectedType: string;
  field: keyof NotionPropertyMappingPayload;
  message: string;
  propertyId: string | null;
  reparable: boolean;
};

export type NotionSchemaHealthPayload = {
  checkedAt: string | null;
  issues: NotionSchemaIssuePayload[];
  status: NotionSchemaStatus;
};

export type NotionMappingPayload = {
  conflictStrategy: NotionConflictStrategy;
  databaseId: string;
  databaseName: string;
  databaseUrl: string | null;
  dataSourceId: string | null;
  managed: boolean;
  parentPageId: string | null;
  propertyIdMapping: NotionPropertyIdMappingPayload;
  propertyMapping: NotionPropertyMappingPayload;
  propertyTypes: NotionPropertyTypeMappingPayload;
  schemaHealth: NotionSchemaHealthPayload;
  schemaVersion: number;
  setupMode: "MANAGED" | "ADVANCED";
  updatedAt: string;
};

export type NotionSyncLogPayload = {
  createdAt: string;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  failedCount: number;
  id: string;
  operation: string;
  processedCount: number;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
};

export type NotionIntegrationPayload = {
  canConfigure: boolean;
  canSync: boolean;
  connected: boolean;
  connection: {
    status: "ACTIVE" | "DISABLED" | "ERROR";
    workspaceName: string | null;
  } | null;
  logs: NotionSyncLogPayload[];
  mapping: NotionMappingPayload | null;
};

export type NotionConnectPayload = {
  authorizationUrl: string;
};

export type NotionDatabasesPayload = {
  databases: NotionDatabasePayload[];
};

export type NotionParentPagesPayload = {
  pages: NotionParentPagePayload[];
};

export type NotionProvisionPayload = {
  health: NotionSchemaHealthPayload;
  mapping: NotionMappingPayload;
  recovered: boolean;
};

export type NotionSyncResultPayload = {
  failedCount: number;
  message: string | null;
  processedCount: number;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
};

export type CuratedResourceDetailPayload = {
  canEdit: boolean;
  resource: CuratedResourcePayload;
};

export type AiQualitySummaryPayload = {
  formats: Array<{
    averageScore: number;
    count: number;
    format: ContentFormat;
  }>;
};

export type AiQualityEvaluationPayload = {
  contentItemId: string;
  feedback: string | null;
  format: ContentFormat;
  score: number;
  updatedAt: string;
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
