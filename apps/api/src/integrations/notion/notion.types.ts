export type NotionCredentialMetadata = {
  accessToken: string;
  botId?: string;
  workspaceId?: string;
  workspaceName?: string;
};

export type NotionDatabase = {
  id: string;
  name: string;
  properties: Array<{
    id: string;
    name: string;
    type: string;
  }>;
};

export type NotionPage = {
  archived?: boolean;
  id: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
  url?: string;
};

export type NotionPageWrite = {
  children?: unknown[];
  parent?: { database_id: string };
  properties: Record<string, unknown>;
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
