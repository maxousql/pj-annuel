"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HistoryDetailPayload } from "@content-ai/shared";

import {
  CONTENT_FORMAT_LABELS,
  formatContentDate,
} from "@/components/contents/content-labels";
import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
import { fetchHistoryItem } from "@/lib/history/client";

type HistoryDetailProps = {
  itemId: string;
  itemType: string;
  organizationSlug: string;
};

export function HistoryDetail({
  itemId,
  itemType,
  organizationSlug,
}: HistoryDetailProps) {
  const [detail, setDetail] = useState<HistoryDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      const result = await fetchHistoryItem(organizationSlug, itemType, itemId);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setDetail(result.data);
        setMessage(null);
      }

      setIsLoading(false);
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [itemId, itemType, organizationSlug]);

  if (isLoading) {
    return (
      <LoadingState
        title="Chargement"
        description="Lecture de l'élément d'historique."
      />
    );
  }

  if (!detail) {
    return (
      <EmptyState
        title="Element introuvable"
        description={message ?? "Cet element n'est pas accessible."}
        action={
          <Link
            className="button-secondary"
            href={`/app/${organizationSlug}/history`}
          >
            Revenir a l'historique
          </Link>
        }
      />
    );
  }

  const item = detail.item;

  return (
    <section className="dashboard-panel history-detail-panel">
      <header>
        <div>
          <p className="eyebrow">
            {item.type === "IDEA" ? "Idee sauvegardee" : "Contenu sauvegarde"}
          </p>
          <h2>{item.title}</h2>
          <p className="muted">
            {CONTENT_FORMAT_LABELS[item.format]} · Mis a jour le{" "}
            {formatContentDate(item.updatedAt)}
          </p>
        </div>
        <Link
          className="button-secondary"
          href={`/app/${organizationSlug}/history`}
        >
          Historique
        </Link>
      </header>

      {item.type === "IDEA" ? (
        <div className="history-detail-body">
          <dl className="summary-grid">
            <div>
              <dt>Thematique</dt>
              <dd>{item.topic ?? "Non precisee"}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{item.status}</dd>
            </div>
          </dl>
          <section>
            <h3>Angle</h3>
            <p>{item.angle}</p>
          </section>
          <section>
            <h3>Justification</h3>
            <p>{item.justification}</p>
          </section>
          <Link
            className="button"
            href={`/app/${organizationSlug}/contents/generate?ideaId=${item.id}`}
          >
            Transformer en contenu
          </Link>
        </div>
      ) : (
        <div className="history-detail-body">
          <dl className="summary-grid">
            <div>
              <dt>Thematique</dt>
              <dd>{item.topic ?? "Non precisee"}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{item.status}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{item.source}</dd>
            </div>
            <div>
              <dt>Similarite</dt>
              <dd>
                {typeof item.duplicateScore === "number"
                  ? `${Math.round(item.duplicateScore * 100)}%`
                  : "Non calculee"}
              </dd>
            </div>
          </dl>
          {item.brief ? (
            <section>
              <h3>Brief</h3>
              <p>{item.brief}</p>
            </section>
          ) : null}
          <section>
            <h3>Corps</h3>
            <pre className="history-content-body">{item.body}</pre>
          </section>
          <Link
            className="button"
            href={`/app/${organizationSlug}/contents/${item.id}`}
          >
            Editer le contenu
          </Link>
        </div>
      )}
    </section>
  );
}
