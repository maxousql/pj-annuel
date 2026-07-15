export type NotionCredentialMetadata = {
  accessToken: string;
  botId?: string;
  workspaceId?: string;
  workspaceName?: string;
};

export type NotionProperty = {
  id: string;
  name: string;
  optionIds?: Record<string, string>;
  options: string[];
  type: string;
};

export type NotionDataSource = {
  databaseId: string;
  databaseUrl: string | null;
  id: string;
  name: string;
  properties: NotionProperty[];
};

export type NotionDatabase = NotionDataSource;

export type NotionDatabaseContainer = {
  dataSources: Array<{ id: string; name: string }>;
  description: string;
  id: string;
  name: string;
  parentPageId: string | null;
  url: string | null;
};

export type NotionParentPage = {
  id: string;
  name: string;
  url: string | null;
};

export type NotionPage = {
  id: string;
  in_trash?: boolean;
  last_edited_time: string;
  properties: Record<string, unknown>;
  url?: string;
};

export type NotionPageWrite = {
  children?: unknown[];
  parent: {
    data_source_id: string;
    type: "data_source_id";
  };
  properties: Record<string, unknown>;
};

export type CreateNotionDatabaseInput = {
  description: string;
  parentPageId: string;
  properties: Record<string, unknown>;
  title: string;
};

export type ManagedNotionDatabaseSelector = {
  preferred?: { databaseId: string; dataSourceId: string };
  requiredProperties: Array<{ name: string; types: string[] }>;
};

export class NotionApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NotionApiError";
  }
}
