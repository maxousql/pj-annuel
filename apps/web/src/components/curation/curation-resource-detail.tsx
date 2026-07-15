"use client";

import type { CuratedResourceDetailPayload } from "@content-ai/shared";
import { ExternalLink, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/shell/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurationResource } from "@/lib/curation/client";
import { exportResourceToNotion } from "@/lib/integrations/client";

type Props = { organizationSlug: string; resourceId: string };

export function CurationResourceDetail({
  organizationSlug,
  resourceId,
}: Props) {
  const [detail, setDetail] = useState<CuratedResourceDetailPayload | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchCurationResource(organizationSlug, resourceId).then((result) => {
      if (!active) return;
      if (result.error) setError(result.error.message);
      else setDetail(result.data);
    });

    return () => {
      active = false;
    };
  }, [organizationSlug, resourceId]);

  async function handleExport() {
    setBusy(true);
    const result = await exportResourceToNotion(organizationSlug, resourceId);
    setBusy(false);

    if (result.error) toast.error(result.error.message);
    else toast.success("Ressource exportee vers Notion.");
  }

  if (error) return <p className="form-error">{error}</p>;
  if (!detail)
    return <LoadingState title="Chargement de la ressource" />;

  const { resource } = detail;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{resource.type}</Badge>
            <Badge variant="secondary">{resource.status}</Badge>
            {resource.topic ? (
              <Badge variant="outline">{resource.topic}</Badge>
            ) : null}
          </div>
          <CardTitle>{resource.title}</CardTitle>
        </div>
        {detail.canEdit ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Exporter vers Notion
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-5">
        <a
          className="inline-flex items-center gap-2 text-[color:var(--klein)]"
          href={resource.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="size-4" /> Ouvrir la source
        </a>
        {resource.description ? (
          <p className="text-[color:var(--text-muted)]">
            {resource.description}
          </p>
        ) : null}
        {resource.summary ? (
          <section className="rounded-2xl bg-[color:var(--paper-2)] p-5">
            <h2 className="text-lg font-bold">Resume IA</h2>
            <p className="mt-3 leading-7">{resource.summary}</p>
            {resource.keyPoints.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {resource.keyPoints.map((point) => (
                  <li key={point}>— {point}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
