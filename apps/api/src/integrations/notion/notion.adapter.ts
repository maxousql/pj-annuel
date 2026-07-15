import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  CreateNotionDatabaseInput,
  ManagedNotionDatabaseSelector,
  NotionCredentialMetadata,
  NotionDatabase,
  NotionDatabaseContainer,
  NotionDataSource,
  NotionPage,
  NotionPageWrite,
  NotionParentPage,
  NotionProperty,
} from "./notion.types";
import { NotionApiError } from "./notion.types";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_AUTHORIZATION_URL = "https://api.notion.com/v1/oauth/authorize";
const REQUEST_TIMEOUT_MS = 12_000;
export const NOTION_API_VERSION = "2026-03-11";

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
      configService.get<string>("NOTION_API_VERSION") ?? NOTION_API_VERSION;

    if (this.apiVersion !== NOTION_API_VERSION) {
      throw new Error(`NOTION_API_VERSION doit valoir ${NOTION_API_VERSION}.`);
    }
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
        "Notion n'a pas retourné de jeton d'accès.",
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
    return this.listDataSources(accessToken);
  }

  async listDataSources(accessToken: string): Promise<NotionDataSource[]> {
    const results = await this.search(accessToken, "data_source");
    return results.map(asNotionDataSource);
  }

  async listParentPages(accessToken: string): Promise<NotionParentPage[]> {
    const results = await this.search(accessToken, "page");
    return results.flatMap((result) => {
      if (typeof result.id !== "string") return [];
      const parent = isRecord(result.parent) ? result.parent : {};
      // Rows of a data source cannot contain a new database.
      if (parent.type === "data_source_id") return [];
      return [
        {
          id: result.id,
          name: readPageTitle(result) ?? "Page sans titre",
          url: readString(result, "url"),
        },
      ];
    });
  }

  async retrieveDatabase(
    accessToken: string,
    databaseId: string,
  ): Promise<NotionDatabaseContainer> {
    const response = await this.request(
      accessToken,
      `/databases/${encodeURIComponent(databaseId)}`,
    );
    return asNotionDatabaseContainer(await readJsonRecord(response));
  }

  async retrieveDataSource(
    accessToken: string,
    dataSourceId: string,
  ): Promise<NotionDataSource> {
    const response = await this.request(
      accessToken,
      `/data_sources/${encodeURIComponent(dataSourceId)}`,
    );
    return asNotionDataSource(await readJsonRecord(response));
  }

  async createDatabase(
    accessToken: string,
    input: CreateNotionDatabaseInput,
  ): Promise<{
    database: NotionDatabaseContainer;
    dataSource: NotionDataSource;
  }> {
    let response: Response;
    try {
      response = await this.request(
        accessToken,
        "/databases",
        {
          body: JSON.stringify({
            description: [richText(input.description)],
            initial_data_source: { properties: input.properties },
            is_inline: false,
            parent: { page_id: input.parentPageId, type: "page_id" },
            title: [richText(input.title)],
          }),
          method: "POST",
        },
        false,
      );
    } catch (error) {
      if (
        error instanceof NotionApiError &&
        (error.code === "NOTION_NETWORK_ERROR" || error.status >= 500)
      ) {
        throw ambiguousCreationError();
      }
      throw error;
    }
    try {
      const created = await readJsonRecord(response);
      const databaseId = readString(created, "id");
      if (!databaseId) throw new Error("Missing created database ID");
      const database = await this.retrieveDatabase(accessToken, databaseId);
      const firstSource = database.dataSources[0];
      if (!firstSource) throw new Error("Missing initial data source");
      const dataSource = await this.retrieveDataSource(
        accessToken,
        firstSource.id,
      );
      return { database, dataSource };
    } catch {
      // The POST succeeded: only marker rediscovery may decide whether to retry.
      throw ambiguousCreationError();
    }
  }

  async findManagedDatabase(
    accessToken: string,
    marker: string,
    selector: ManagedNotionDatabaseSelector,
  ): Promise<{
    database: NotionDatabaseContainer;
    dataSource: NotionDataSource;
  } | null> {
    if (selector.preferred) {
      try {
        const [database, dataSource] = await Promise.all([
          this.retrieveDatabase(accessToken, selector.preferred.databaseId),
          this.retrieveDataSource(accessToken, selector.preferred.dataSourceId),
        ]);
        if (dataSource.databaseId === database.id) {
          return { database, dataSource };
        }
      } catch (error) {
        if (
          !(error instanceof NotionApiError) ||
          error.status === 401 ||
          error.status === 403 ||
          error.status === 429 ||
          error.status >= 500
        ) {
          throw error;
        }
        // A stale preferred ID falls back to marker discovery.
      }
    }

    const sources = await this.listDataSources(accessToken);
    const visited = new Set<string>();
    const matches: Array<{
      database: NotionDatabaseContainer;
      dataSource: NotionDataSource;
    }> = [];
    for (const source of sources) {
      if (!source.databaseId || visited.has(source.databaseId)) continue;
      visited.add(source.databaseId);
      const database = await this.retrieveDatabase(
        accessToken,
        source.databaseId,
      );
      if (!hasManagedMarker(database.description, marker)) continue;
      const detailedSources = await Promise.all(
        database.dataSources.map((candidate) =>
          this.retrieveDataSource(accessToken, candidate.id),
        ),
      );
      const compatible = detailedSources.filter((candidate) =>
        matchesRequiredProperties(candidate, selector.requiredProperties),
      );
      const selected =
        compatible.length === 1
          ? compatible[0]
          : detailedSources.length === 1
            ? detailedSources[0]
            : null;
      if (!selected) {
        throw new NotionApiError(
          "NOTION_MANAGED_SOURCE_AMBIGUOUS",
          "La base Planif contient plusieurs sources possibles. Sélectionnez explicitement la source dans le mode avancé.",
          409,
        );
      }
      matches.push({
        database,
        dataSource: selected,
      });
    }
    if (matches.length > 1) {
      throw new NotionApiError(
        "NOTION_MANAGED_DATABASE_AMBIGUOUS",
        "Plusieurs bases portent le marqueur Planif. Sélectionnez la bonne base dans le mode avancé.",
        409,
      );
    }
    return matches[0] ?? null;
  }

  async updateDataSource(
    accessToken: string,
    dataSourceId: string,
    properties: Record<string, unknown>,
  ): Promise<NotionDataSource> {
    const response = await this.request(
      accessToken,
      `/data_sources/${encodeURIComponent(dataSourceId)}`,
      { body: JSON.stringify({ properties }), method: "PATCH" },
      false,
    );
    return asNotionDataSource(await readJsonRecord(response));
  }

  async createPage(
    accessToken: string,
    input: NotionPageWrite,
  ): Promise<NotionPage> {
    const response = await this.request(
      accessToken,
      "/pages",
      { body: JSON.stringify(input), method: "POST" },
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
      { body: JSON.stringify({ properties }), method: "PATCH" },
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

  private async search(
    accessToken: string,
    object: "data_source" | "page",
  ): Promise<Record<string, unknown>[]> {
    const results: Record<string, unknown>[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const response = await this.request(accessToken, "/search", {
        body: JSON.stringify({
          ...(cursor ? { start_cursor: cursor } : {}),
          filter: { property: "object", value: object },
          page_size: 100,
          sort: { direction: "descending", timestamp: "last_edited_time" },
        }),
        method: "POST",
      });
      const payload = await readJsonRecord(response);
      const page = Array.isArray(payload.results) ? payload.results : [];
      results.push(...page.filter(isRecord));
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
    return results;
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
        if (retryAllowed && attempt === 0) continue;
        throw new NotionApiError(
          "NOTION_NETWORK_ERROR",
          error instanceof Error && error.name === "TimeoutError"
            ? "Notion n'a pas répondu dans le délai imparti."
            : "Connexion à Notion impossible.",
          502,
        );
      }
      if (response.ok) return response;
      if (retryAllowed && response.status === 429 && attempt === 0) {
        await wait(Math.min(readRetryAfter(response) * 1_000, 2_000));
        continue;
      }
      throw await toNotionApiError(response);
    }
    throw new NotionApiError(
      "NOTION_NETWORK_ERROR",
      "Connexion à Notion impossible.",
      502,
    );
  }

  private assertOAuthConfigured(): void {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new NotionApiError(
        "NOTION_NOT_CONFIGURED",
        "L'intégration Notion n'est pas configurée sur ce serveur.",
        503,
      );
    }
  }
}

function asNotionDataSource(value: Record<string, unknown>): NotionDataSource {
  const id = readString(value, "id");
  const parent = isRecord(value.parent) ? value.parent : {};
  const databaseId = readString(parent, "database_id");
  if (!id || !databaseId || !isRecord(value.properties)) {
    throw new NotionApiError(
      "NOTION_INVALID_RESPONSE",
      "Réponse de source de données Notion invalide.",
      502,
    );
  }
  return {
    databaseId,
    databaseUrl: readString(value, "url"),
    id,
    name: readNotionRichText(value.title) ?? "Source sans titre",
    properties: parseProperties(value.properties),
  };
}

function asNotionDatabaseContainer(
  value: Record<string, unknown>,
): NotionDatabaseContainer {
  const id = readString(value, "id");
  if (!id) {
    throw new NotionApiError(
      "NOTION_INVALID_RESPONSE",
      "Réponse de base Notion invalide.",
      502,
    );
  }
  const parent = isRecord(value.parent) ? value.parent : {};
  return {
    dataSources: Array.isArray(value.data_sources)
      ? value.data_sources.flatMap((source) =>
          isRecord(source) && typeof source.id === "string"
            ? [
                {
                  id: source.id,
                  name:
                    typeof source.name === "string"
                      ? source.name
                      : "Source sans titre",
                },
              ]
            : [],
        )
      : [],
    description: readNotionRichText(value.description) ?? "",
    id,
    name: readNotionRichText(value.title) ?? "Base sans titre",
    parentPageId:
      parent.type === "page_id" ? readString(parent, "page_id") : null,
    url: readString(value, "url"),
  };
}

function asNotionPage(value: Record<string, unknown>): NotionPage {
  if (
    typeof value.id !== "string" ||
    typeof value.last_edited_time !== "string" ||
    !isRecord(value.properties)
  ) {
    throw new NotionApiError(
      "NOTION_INVALID_RESPONSE",
      "Réponse de page Notion invalide.",
      502,
    );
  }
  return {
    id: value.id,
    ...(typeof value.in_trash === "boolean"
      ? { in_trash: value.in_trash }
      : {}),
    last_edited_time: value.last_edited_time,
    properties: value.properties,
    ...(typeof value.url === "string" ? { url: value.url } : {}),
  };
}

function parseProperties(value: Record<string, unknown>): NotionProperty[] {
  return Object.entries(value).flatMap(([name, property]) => {
    if (!isRecord(property)) return [];
    const type = readString(property, "type") ?? "unknown";
    const configuration = isRecord(property[type]) ? property[type] : {};
    const parsedOptions = Array.isArray(configuration.options)
      ? configuration.options.filter(
          (option): option is Record<string, unknown> =>
            isRecord(option) && typeof option.name === "string",
        )
      : [];
    const options = parsedOptions.map((option) => String(option.name));
    const optionIds = Object.fromEntries(
      parsedOptions.flatMap((option) =>
        typeof option.id === "string"
          ? [[String(option.name), option.id] as const]
          : [],
      ),
    );
    return [
      {
        id: readString(property, "id") ?? name,
        name: readString(property, "name") ?? name,
        optionIds,
        options,
        type,
      },
    ];
  });
}

function readPageTitle(value: Record<string, unknown>): string | null {
  if (!isRecord(value.properties)) return null;
  for (const property of Object.values(value.properties)) {
    if (!isRecord(property) || !Array.isArray(property.title)) continue;
    const title = readNotionRichText(property.title);
    if (title) return title;
  }
  return null;
}

function richText(content: string) {
  return { text: { content }, type: "text" };
}

async function readJsonRecord(
  response: Response,
): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) {
    throw new NotionApiError(
      "NOTION_INVALID_RESPONSE",
      "Réponse Notion invalide.",
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
    // The raw provider response is deliberately never exposed.
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
      ? "L'autorisation Notion a expiré ou ne permet pas cette action. Reconnectez l'intégration et vérifiez ses capacités."
      : response.status === 429
        ? "Notion limite temporairement les requêtes. Réessayez plus tard."
        : "Notion n'a pas pu traiter cette action.";
  return new NotionApiError(code, message, response.status);
}

function readNotionRichText(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const text = value
    .flatMap((entry) =>
      isRecord(entry) && typeof entry.plain_text === "string"
        ? [entry.plain_text]
        : isRecord(entry) &&
            isRecord(entry.text) &&
            typeof entry.text.content === "string"
          ? [entry.text.content]
          : [],
    )
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

function ambiguousCreationError(): NotionApiError {
  return new NotionApiError(
    "NOTION_CREATION_AMBIGUOUS",
    "La base a peut-être été créée, mais sa confirmation a échoué. Réessayez après le délai de reprise.",
    502,
  );
}

function hasManagedMarker(description: string, marker: string): boolean {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === marker || line.startsWith(`${marker} —`));
}

function matchesRequiredProperties(
  source: NotionDataSource,
  requirements: ManagedNotionDatabaseSelector["requiredProperties"],
): boolean {
  return requirements.every((requirement) =>
    source.properties.some(
      (property) =>
        property.name === requirement.name &&
        requirement.types.includes(property.type),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
