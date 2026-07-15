"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ContentItemPayload } from "@content-ai/shared";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_LABELS,
  formatContentDate,
} from "@/components/contents/content-labels";
import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
import { fetchContents } from "@/lib/contents/client";

type ContentsLibraryProps = {
  organizationSlug: string;
};

export function ContentsLibrary({ organizationSlug }: ContentsLibraryProps) {
  const [contents, setContents] = useState<ContentItemPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadContents() {
      setIsLoading(true);
      const result = await fetchContents(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setErrorMessage(result.error.message);
      } else {
        setContents(result.data.contents);
        setErrorMessage(null);
      }

      setIsLoading(false);
    }

    void loadContents();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  if (isLoading) {
    return (
      <LoadingState
        title="Chargement des contenus"
        description="La bibliothèque de l'organisation est en cours de lecture."
      />
    );
  }

  if (errorMessage) {
    return (
      <EmptyState
        title="Contenus indisponibles"
        description={errorMessage}
        action={
          <Link
            className="button-secondary"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            Generer un contenu
          </Link>
        }
      />
    );
  }

  if (contents.length === 0) {
    return (
      <EmptyState
        title="Aucun contenu"
        description="Les contenus generes et sauvegardes apparaitront ici."
        action={
          <Link
            className="button"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            Generer un contenu
          </Link>
        }
      />
    );
  }

  return (
    <section className="content-list" aria-label="Bibliotheque de contenus">
      {contents.map((content) => (
        <article className="content-list-item" key={content.id}>
          <div>
            <div className="content-list-meta">
              <span>{CONTENT_FORMAT_LABELS[content.format]}</span>
              <span>{CONTENT_STATUS_LABELS[content.status]}</span>
              <span>{formatContentDate(content.updatedAt)}</span>
            </div>
            <h2>{content.title}</h2>
            <p>{createExcerpt(content.body)}</p>
          </div>
          <Link
            className="button-secondary"
            href={`/app/${organizationSlug}/contents/${content.id}`}
          >
            Ouvrir
          </Link>
        </article>
      ))}
    </section>
  );
}

function createExcerpt(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= 180) {
    return trimmed;
  }

  return `${trimmed.slice(0, 180)}...`;
}
