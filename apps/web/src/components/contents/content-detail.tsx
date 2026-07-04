"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type {
  ContentDuplicatePayload,
  ContentItemPayload,
  ContentSaveStatus,
} from "@content-ai/shared";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_LABELS,
  SAVE_STATUS_OPTIONS,
  formatContentDate,
} from "@/components/contents/content-labels";
import { EmptyState } from "@/components/shell/empty-state";
import { fetchContent, updateContent } from "@/lib/contents/client";

type ContentDetailProps = {
  contentId: string;
  organizationSlug: string;
};

export function ContentDetail({
  contentId,
  organizationSlug,
}: ContentDetailProps) {
  const [content, setContent] = useState<ContentItemPayload | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<ContentSaveStatus>("DRAFT");
  const [duplicate, setDuplicate] = useState<ContentDuplicatePayload | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      setIsLoading(true);
      const result = await fetchContent(organizationSlug, contentId);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        hydrateForm(result.data.content);
      }

      setIsLoading(false);
    }

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, [contentId, organizationSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!content) {
      return;
    }

    setIsSaving(true);
    const result = await updateContent(organizationSlug, content.id, {
      body: body.trim(),
      status,
      title: title.trim(),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
    });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    hydrateForm(result.data.content);
    setDuplicate(result.data.duplicate);
    setMessage("Contenu mis a jour.");
  }

  function hydrateForm(nextContent: ContentItemPayload) {
    setContent(nextContent);
    setTitle(nextContent.title);
    setBody(nextContent.body);
    setTopic(nextContent.topic ?? "");
    setStatus(toSaveStatus(nextContent.status));
    setDuplicate(
      typeof nextContent.duplicateScore === "number" &&
        nextContent.duplicateScore > 0
        ? {
            matchedContentId: null,
            matchedTitle: null,
            score: nextContent.duplicateScore,
            warning: nextContent.duplicateScore >= 0.72,
          }
        : null,
    );
    setMessage(null);
  }

  if (isLoading) {
    return (
      <EmptyState
        title="Chargement du contenu"
        description="Le contenu sauvegarde est en cours de lecture."
      />
    );
  }

  if (!content) {
    return (
      <EmptyState
        title="Contenu introuvable"
        description={
          message ?? "Ce contenu n'existe pas dans cette organisation."
        }
        action={
          <Link
            className="button-secondary"
            href={`/app/${organizationSlug}/contents`}
          >
            Revenir aux contenus
          </Link>
        }
      />
    );
  }

  return (
    <section className="dashboard-panel content-detail-panel">
      <header>
        <div>
          <p className="eyebrow">Contenu sauvegarde</p>
          <h2>{content.title}</h2>
          <p className="muted">
            {CONTENT_FORMAT_LABELS[content.format]} ·{" "}
            {CONTENT_STATUS_LABELS[content.status]} · Mis a jour le{" "}
            {formatContentDate(content.updatedAt)}
          </p>
        </div>
        <Link
          className="button-secondary"
          href={`/app/${organizationSlug}/contents`}
        >
          Bibliotheque
        </Link>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Titre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Corps</span>
          <textarea
            className="content-body-editor"
            rows={22}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>

        <div className="content-form-grid">
          <label className="field">
            <span>Statut</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ContentSaveStatus)
              }
            >
              {SAVE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Sujet</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            />
          </label>
        </div>

        <DuplicateNotice duplicate={duplicate} />
        {message ? <p className="form-success">{message}</p> : null}

        <div className="form-footer">
          <button className="button" disabled={isSaving} type="submit">
            {isSaving ? "Sauvegarde..." : "Mettre a jour"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DuplicateNotice({
  duplicate,
}: {
  duplicate: ContentDuplicatePayload | null;
}) {
  if (!duplicate || duplicate.score <= 0) {
    return null;
  }

  return (
    <div
      className="duplicate-warning"
      data-tone={duplicate.warning ? "warning" : "neutral"}
    >
      <strong>
        {duplicate.warning ? "Doublon potentiel" : "Similarite detectee"}
      </strong>
      <span>
        Score {Math.round(duplicate.score * 100)}%
        {duplicate.matchedTitle ? ` avec "${duplicate.matchedTitle}"` : ""}.
      </span>
    </div>
  );
}

function toSaveStatus(status: ContentItemPayload["status"]): ContentSaveStatus {
  if (status === "REVIEW" || status === "READY" || status === "ARCHIVED") {
    return status;
  }

  return "DRAFT";
}
