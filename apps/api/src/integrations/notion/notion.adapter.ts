import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  NotionCredentialMetadata,
  NotionDatabase,
  NotionPage,
  NotionPageWrite,
} from "./notion.types";
import { NotionApiError } from "./notion.types";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_AUTHORIZATION_URL = "https://api.notion.com/v1/oauth/authorize";
const REQUEST_TIMEOUT_MS = 12_000;

@Injectable()
export class NotionAdapter {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiVersion: string;

  constructor(configService: ConfigService) {
    this.clientId = configService.get<string>("NOTION_CLIENT_ID") ?? "";
    this.clientSecret = configService.get<string>("NOTION_CLIENT_SECRET") ?? "";
    this.redirectUri = configService.get<string>("NOTION_REDIRECT_URI") ?? "";
    this.apiVersion =
      configService.get<string>("NOTION_API_VERSION") ?? "2022-06-28";
  }

  buildAuthorizationUrl(state: string): string {
    this.assertOAuthConfigured();
    const url = new URL(NOTION_AUTHORIZATION_URL);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async exchangeCode(code: string): Promise<NotionCredentialMetadata> {
    this.assertOAuthConfigured();
    const response = await this.fetchWithRetry(
      `${NOTION_API_BASE_URL}/oauth/token`,
      {
        body: JSON.stringify({
          code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        }),
        headers: {
          authorization: `Basic ${Buffer.from(
            `${this.clientId}:${this.clientSecret}`,
          ).toString("base64")}`,
          "content-type": "application/json",
        },
        method: "POST",
      },
      false,
    );
    const payload = await readJsonRecord(response);
    const accessToken = readString(payload, "access_token");

    if (!accessToken) {
      throw new NotionApiError(
        "NOTION_OAUTH_INVALID_RESPONSE",
        "Notion n'a pas retourne de jeton d'acces.",
        502,
      );
    }

    return {
      accessToken,
      ...(readString(payload, "bot_id")
        ? { botId: readString(payload, "bot_id")! }
        : {}),
      ...(readString(payload, "workspace_id")
        ? { workspaceId: readString(payload, "workspace_id")! }
        : {}),
      ...(readString(payload, "workspace_name")
        ? { workspaceName: readString(payload, "workspace_name")! }
        : {}),
    };
  }

  async listDatabases(accessToken: string): Promise<NotionDatabase[]> {
    const databases: NotionDatabase[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    do {
      const response = await this.request(accessToken, "/search", {
        body: JSON.stringify({
          ...(cursor ? { start_cursor: cursor } : {}),
          filter: { property: "object", value: "database" },
          page_size: 100,
          sort: { direction: "descending", timestamp: "last_edited_time" },
        }),
        method: "POST",
      });
      const payload = await readJsonRecord(response);
      const results = Array.isArray(payload.results) ? payload.results : [];
      databases.push(...parseDatabases(results));
      const nextCursor = readString(payload, "next_cursor");
      cursor = payload.has_more === true && nextCursor ? nextCursor : undefined;

      if (cursor && seenCursors.has(cursor)) {
        throw new NotionApiError(
          "NOTION_INVALID_RESPONSE",
          "Pagination Notion invalide.",
          502,
        );
      }
      if (cursor) seenCursors.add(cursor);
    } while (cursor);

    return databases;
  }

  async createPage(
    accessToken: string,
    input: NotionPageWrite,
  ): Promise<NotionPage> {
    const response = await this.request(
      accessToken,
      "/pages",
      {
        body: JSON.stringify(input),
        method: "POST",
      },
      false,
    );

    return asNotionPage(await readJsonRecord(response));
  }

  async updatePage(
    accessToken: string,
    pageId: string,
    properties: Record<string, unknown>,
  ): Promise<NotionPage> {
    const response = await this.request(
      accessToken,
      `/pages/${encodeURIComponent(pageId)}`,
      {
        body: JSON.stringify({ properties }),
        method: "PATCH",
      },
    );

    return asNotionPage(await readJsonRecord(response));
  }

  async retrievePage(accessToken: string, pageId: string): Promise<NotionPage> {
    const response = await this.request(
      accessToken,
      `/pages/${encodeURIComponent(pageId)}`,
    );

    return asNotionPage(await readJsonRecord(response));
  }

  async replacePageBody(
    accessToken: string,
    pageId: string,
    children: unknown[],
  ): Promise<void> {
    const blockIds = await this.listBlockChildren(accessToken, pageId);

    for (const blockId of blockIds) {
      await this.request(
        accessToken,
        `/blocks/${encodeURIComponent(blockId)}`,
        { method: "DELETE" },
        false,
      );
    }

    for (let offset = 0; offset < children.length; offset += 100) {
      await this.request(
        accessToken,
        `/blocks/${encodeURIComponent(pageId)}/children`,
        {
          body: JSON.stringify({
            children: children.slice(offset, offset + 100),
          }),
          method: "PATCH",
        },
        false,
      );
    }
  }

  private async listBlockChildren(
    accessToken: string,
    pageId: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    do {
      const query = new URLSearchParams({ page_size: "100" });
      if (cursor) query.set("start_cursor", cursor);
      const response = await this.request(
        accessToken,
        `/blocks/${encodeURIComponent(pageId)}/children?${query.toString()}`,
      );
      const payload = await readJsonRecord(response);
      const results = Array.isArray(payload.results) ? payload.results : [];

      for (const result of results) {
        if (isRecord(result) && typeof result.id === "string")
          ids.push(result.id);
      }

      const nextCursor = readString(payload, "next_cursor");
      cursor = payload.has_more === true && nextCursor ? nextCursor : undefined;
      if (cursor && seenCursors.has(cursor)) {
        throw new NotionApiError(
          "NOTION_INVALID_RESPONSE",
          "Pagination des blocs Notion invalide.",
          502,
        );
      }
      if (cursor) seenCursors.add(cursor);
    } while (cursor);

    return ids;
  }

  private async request(
    accessToken: string,
    path: string,
    init: RequestInit = {},
    retryAllowed = true,
  ): Promise<Response> {
    return this.fetchWithRetry(
      `${NOTION_API_BASE_URL}${path}`,
      {
        ...init,
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "notion-version": this.apiVersion,
          ...init.headers,
        },
      },
      retryAllowed,
    );
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retryAllowed: boolean,
  ): Promise<Response> {
    const attempts = retryAllowed ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (retryAllowed && attempt === 0) {
          continue;
        }

        throw new NotionApiError(
          "NOTION_NETWORK_ERROR",
          error instanceof Error && error.name === "TimeoutError"
            ? "Notion n'a pas repondu dans le delai imparti."
            : "Connexion a Notion impossible.",
          502,
        );
      }

      if (response.ok) {
        return response;
      }

      if (retryAllowed && response.status === 429 && attempt === 0) {
        await wait(Math.min(readRetryAfter(response) * 1_000, 2_000));
        continue;
      }

      throw await toNotionApiError(response);
    }

    throw new NotionApiError(
      "NOTION_NETWORK_ERROR",
      "Connexion a Notion impossible.",
      502,
    );
  }

  private assertOAuthConfigured(): void {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new NotionApiError(
        "NOTION_NOT_CONFIGURED",
        "L'integration Notion n'est pas configuree sur ce serveur.",
        503,
      );
    }
  }
}

async function readJsonRecord(
  response: Response,
): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();

  if (!isRecord(payload)) {
    throw new NotionApiError(
      "NOTION_INVALID_RESPONSE",
      "Reponse Notion invalide.",
      502,
    );
  }

  return payload;
}

async function toNotionApiError(response: Response): Promise<NotionApiError> {
  let payload: Record<string, unknown> = {};

  try {
    payload = await readJsonRecord(response);
  } catch {
    // Never include the raw provider response in logs or client errors.
  }

  const providerCode = readString(payload, "code");
  const code =
    response.status === 401 || response.status === 403
      ? "NOTION_AUTH_EXPIRED"
      : response.status === 429
        ? "NOTION_RATE_LIMITED"
        : providerCode
          ? `NOTION_${providerCode.toUpperCase()}`
          : "NOTION_API_ERROR";
  const message =
    response.status === 401 || response.status === 403
      ? "L'autorisation Notion a expire. Reconnectez l'integration."
      : response.status === 429
        ? "Notion limite temporairement les requetes. Reessayez plus tard."
        : "Notion n'a pas pu traiter la synchronisation.";

  return new NotionApiError(code, message, response.status);
}

function asNotionPage(value: Record<string, unknown>): NotionPage {
  if (
    typeof value.id !== "string" ||
    typeof value.last_edited_time !== "string" ||
    !isRecord(value.properties)
  ) {
    throw new NotionApiError(
      "NOTION_INVALID_RESPONSE",
      "Reponse de page Notion invalide.",
      502,
    );
  }

  return {
    ...(typeof value.archived === "boolean"
      ? { archived: value.archived }
      : {}),
    id: value.id,
    last_edited_time: value.last_edited_time,
    properties: value.properties,
    ...(typeof value.url === "string" ? { url: value.url } : {}),
  };
}

function parseDatabases(results: unknown[]): NotionDatabase[] {
  return results.flatMap((result) => {
    if (!isRecord(result) || typeof result.id !== "string") {
      return [];
    }

    const properties = isRecord(result.properties)
      ? Object.entries(result.properties).flatMap(([name, property]) => {
          if (!isRecord(property)) return [];
          return [
            {
              id: typeof property.id === "string" ? property.id : name,
              name,
              type:
                typeof property.type === "string" ? property.type : "unknown",
            },
          ];
        })
      : [];

    return [
      {
        id: result.id,
        name: readNotionRichText(result.title) ?? "Base sans titre",
        properties,
      },
    ];
  });
}

function readNotionRichText(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const text = value
    .flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      if (typeof entry.plain_text === "string") {
        return [entry.plain_text];
      }

      return [];
    })
    .join("")
    .trim();

  return text || null;
}

function readString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  return typeof value[key] === "string" ? value[key] : null;
}

function readRetryAfter(response: Response): number {
  const seconds = Number(response.headers.get("retry-after") ?? "1");
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
