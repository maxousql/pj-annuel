"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type {
  ContentFormat,
  ContentIdeaStatus,
  ContentItemStatus,
  HistoryItemType,
  HistoryListItemPayload,
  HistoryPaginationPayload,
} from "@content-ai/shared";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_IDEA_STATUS_LABELS,
  CONTENT_STATUS_LABELS,
  formatContentDate,
} from "@/components/contents/content-labels";
import { LoadingState } from "@/components/shell/loading-state";
import { fetchHistory, type FetchHistoryInput } from "@/lib/history/client";

type HistoryWorkspaceProps = {
  organizationSlug: string;
};

const PAGE_SIZE = 10;

const FORMAT_OPTIONS: ContentFormat[] = [
  "BLOG_ARTICLE",
  "LINKEDIN_POST",
  "SOCIAL_POST",
  "EMAIL",
  "HOOK",
  "THREAD",
  "OTHER",
];

const STATUS_OPTIONS: Array<ContentIdeaStatus | ContentItemStatus> = [
  "DRAFT",
  "SAVED",
  "USED",
  "REVIEW",
  "READY",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

export function HistoryWorkspace({ organizationSlug }: HistoryWorkspaceProps) {
  const [items, setItems] = useState<HistoryListItemPayload[]>([]);
  const [pagination, setPagination] = useState<HistoryPaginationPayload>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState("");
  const [type, setType] = useState<HistoryItemType | "">("");
  const [format, setFormat] = useState<ContentFormat | "">("");
  const [status, setStatus] = useState<
    ContentIdeaStatus | ContentItemStatus | ""
  >("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory({
      page,
    });
  }, [organizationSlug, page]);

  async function loadHistory(overrides: Partial<FetchHistoryInput> = {}) {
    setIsLoading(true);
    const result = await fetchHistory(organizationSlug, {
      pageSize: PAGE_SIZE,
      ...(query.trim() ? { query: query.trim() } : {}),
      ...(type ? { type } : {}),
      ...(format ? { format } : {}),
      ...(status ? { status } : {}),
      ...overrides,
    });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setItems(result.data.items);
      setPagination(result.data.pagination);
      setMessage(null);
    }

    setIsLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    await loadHistory({ page: 1 });
  }

  function resetFilters() {
    setQuery("");
    setType("");
    setFormat("");
    setStatus("");
    setPage(1);
    void fetchHistory(organizationSlug, {
      page: 1,
      pageSize: PAGE_SIZE,
    }).then((result) => {
      if (result.error) {
        setMessage(result.error.message);
      } else {
        setItems(result.data.items);
        setPagination(result.data.pagination);
        setMessage(null);
      }
      setIsLoading(false);
    });
  }

  return (
    <div className="history-workspace">
      <section className="dashboard-panel history-filters-panel">
        <header>
          <div>
            <p className="eyebrow">Recherche</p>
            <h2>Historique éditorial</h2>
          </div>
        </header>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Recherche</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Titre, thématique, format, mot-clé..."
            />
          </label>

          <div className="history-filter-grid">
            <label className="field">
              <span>Type</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as HistoryItemType | "")
                }
              >
                <option value="">Tous</option>
                <option value="IDEA">Idees</option>
                <option value="CONTENT">Contenus</option>
              </select>
            </label>

            <label className="field">
              <span>Format</span>
              <select
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ContentFormat | "")
                }
              >
                <option value="">Tous</option>
                {FORMAT_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {CONTENT_FORMAT_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Statut</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      ContentIdeaStatus | ContentItemStatus | "",
                  )
                }
              >
                <option value="">Tous</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {formatHistoryStatus(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {message ? <p className="form-error">{message}</p> : null}

          <div className="form-footer">
            <button className="button" disabled={isLoading} type="submit">
              Rechercher
            </button>
            <button
              className="button-secondary"
              disabled={isLoading}
              type="button"
              onClick={resetFilters}
            >
              Reinitialiser
            </button>
          </div>
        </form>
      </section>

      <section className="history-results">
        {isLoading ? (
          <LoadingState
            title="Chargement de l'historique"
            description="Lecture des idées et contenus sauvegardés."
          />
        ) : items.length > 0 ? (
          <>
            <div className="history-summary">
              <span>
                {pagination.total} element
                {pagination.total > 1 ? "s" : ""} trouve
                {pagination.total > 1 ? "s" : ""}
              </span>
              <span>
                Page {pagination.page} / {pagination.totalPages}
              </span>
            </div>

            <div className="history-list">
              {items.map((item) => (
                <HistoryListItem
                  item={item}
                  key={`${item.type}:${item.id}`}
                  organizationSlug={organizationSlug}
                />
              ))}
            </div>

            <div className="history-pagination">
              <button
                className="button-secondary"
                disabled={pagination.page <= 1}
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Precedent
              </button>
              <button
                className="button-secondary"
                disabled={pagination.page >= pagination.totalPages}
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pagination.totalPages),
                  )
                }
              >
                Suivant
              </button>
            </div>
          </>
        ) : (
          <EmptyState
            title="Historique vide"
            description="Les idees sauvegardees et les contenus sauvegardes apparaitront ici."
            action={
              <Link className="button" href={`/app/${organizationSlug}/ideas`}>
                Generer des idees
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}

function HistoryListItem({
  item,
  organizationSlug,
}: {
  item: HistoryListItemPayload;
  organizationSlug: string;
}) {
  return (
    <article className="history-list-item">
      <div>
        <div className="content-list-meta">
          <span>{item.type === "IDEA" ? "Idee" : "Contenu"}</span>
          <span>{CONTENT_FORMAT_LABELS[item.format]}</span>
          <span>{formatHistoryStatus(item.status)}</span>
          {item.topic ? <span>{item.topic}</span> : null}
          <span>{formatContentDate(item.updatedAt)}</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.excerpt}</p>
        {typeof item.duplicateScore === "number" && item.duplicateScore > 0 ? (
          <small>
            Similarite sauvegardee {Math.round(item.duplicateScore * 100)}%
          </small>
        ) : null}
      </div>
      <Link
        className="button-secondary"
        href={`/app/${organizationSlug}/history/${item.type.toLowerCase()}/${item.id}`}
      >
        Ouvrir
      </Link>
    </article>
  );
}

function formatHistoryStatus(
  status: ContentIdeaStatus | ContentItemStatus,
): string {
  if (status in CONTENT_IDEA_STATUS_LABELS) {
    return CONTENT_IDEA_STATUS_LABELS[status as ContentIdeaStatus];
  }

  return CONTENT_STATUS_LABELS[status as ContentItemStatus];
}
