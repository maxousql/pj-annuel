"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type {
  ContentGenerationFormat,
  CuratedResourcePayload,
  SourceFeedPayload,
} from "@content-ai/shared";
import {
  ExternalLink,
  FileText,
  Loader2,
  Link2,
  Rss,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { CONTENT_FORMAT_LABELS } from "@/components/contents/content-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addResourceUrl,
  addRssFeed,
  fetchCuration,
  importRssFeed,
  summarizeResource,
  useResourceForGeneration,
} from "@/lib/curation/client";
import { saveContent } from "@/lib/contents/client";
import { cn } from "@/lib/utils";

type CurationWorkspaceProps = {
  organizationSlug: string;
};

const GENERATION_FORMATS: ContentGenerationFormat[] = [
  "BLOG_ARTICLE",
  "LINKEDIN_POST",
  "SOCIAL_POST",
  "EMAIL",
  "HOOK",
];

type GeneratedResourceDraft = {
  body: string;
  brief: string;
  format: ContentGenerationFormat;
  savedContentHref: string | null;
  title: string;
  topic: string | null;
};

const panelClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/95 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)]";
const inputClass =
  "h-11 rounded-xl border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] placeholder:text-[color:var(--text-subtle)] focus-visible:border-[color:var(--klein)] focus-visible:ring-[color:var(--klein)]/25";
const selectClass =
  "h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3 text-sm font-medium text-[color:var(--ink)] outline-none transition focus:border-[color:var(--klein)] focus:ring-4 focus:ring-[color:var(--klein)]/20";

export function CurationWorkspace({
  organizationSlug,
}: CurationWorkspaceProps) {
  const [resources, setResources] = useState<CuratedResourcePayload[]>([]);
  const [feeds, setFeeds] = useState<SourceFeedPayload[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [tagNames, setTagNames] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedTitle, setFeedTitle] = useState("");
  const [format, setFormat] =
    useState<ContentGenerationFormat>("LINKEDIN_POST");
  const [draft, setDraft] = useState<GeneratedResourceDraft | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCuration() {
      setIsLoading(true);
      const result = await fetchCuration(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setLoadError(result.error.message);
        toast.error(result.error.message);
      } else {
        setResources(result.data.resources);
        setFeeds(result.data.feeds);
        setCanEdit(result.data.canEdit);
        setLoadError(null);
      }

      setIsLoading(false);
    }

    void loadCuration();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  async function reload() {
    const result = await fetchCuration(organizationSlug);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setResources(result.data.resources);
    setFeeds(result.data.feeds);
    setCanEdit(result.data.canEdit);
    setLoadError(null);
  }

  async function handleAddResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("add-resource");

    const result = await addResourceUrl(organizationSlug, {
      tagNames: splitTags(tagNames),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      url: url.trim(),
    });

    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setResources((current) => [result.data.resource, ...current]);
    setUrl("");
    setTopic("");
    setTagNames("");
    toast.success("URL ajoutee a la veille.");
  }

  async function handleAddFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("add-feed");

    const result = await addRssFeed(organizationSlug, {
      ...(feedTitle.trim() ? { title: feedTitle.trim() } : {}),
      url: feedUrl.trim(),
    });

    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setFeedUrl("");
    setFeedTitle("");
    await reload();
    toast.success(`${result.data.importedCount} ressource(s) importee(s).`);
  }

  async function handleImportFeed(feedId: string) {
    setBusyKey(`feed:${feedId}`);

    const result = await importRssFeed(organizationSlug, feedId);

    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success(`${result.data.importedCount} nouvelle(s) ressource(s).`);
  }

  async function handleSummarize(resourceId: string) {
    setBusyKey(`summary:${resourceId}`);

    const result = await summarizeResource(organizationSlug, resourceId);

    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setResources((current) =>
      current.map((resource) =>
        resource.id === resourceId ? result.data.resource : resource,
      ),
    );
    toast.success("Resume IA ajoute a la ressource.");
  }

  async function handleUseResource(resourceId: string) {
    const resource = resources.find((item) => item.id === resourceId);
    setBusyKey(`generation:${resourceId}`);

    const result = await useResourceForGeneration(
      organizationSlug,
      resourceId,
      {
        creativity: 3,
        format,
        language: "fr",
        targetLength: "standard",
        toneIntensity: 3,
      },
    );

    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setDraft({
      body: result.data.draft.body,
      brief: `Genere depuis la ressource de veille: ${
        resource?.title ?? "ressource"
      }`,
      format,
      savedContentHref: null,
      title: result.data.draft.title,
      topic: resource?.topic ?? null,
    });
    await reload();
    toast.success("Brouillon genere depuis la ressource.");
  }

  async function handleSaveDraft() {
    if (!draft) {
      return;
    }

    setBusyKey("save-draft");
    const result = await saveContent(organizationSlug, {
      body: draft.body,
      brief: draft.brief,
      format: draft.format,
      status: "DRAFT",
      title: draft.title,
      ...(draft.topic ? { topic: draft.topic } : {}),
    });
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    const href = `/app/${organizationSlug}/contents/${result.data.content.id}`;
    setDraft((current) =>
      current
        ? {
            ...current,
            savedContentHref: href,
          }
        : current,
    );
    toast.success("Brouillon enregistre en bibliotheque.");
  }

  if (isLoading) {
    return (
      <Card className={cn(panelClass, "rounded-3xl")}>
        <CardContent className="grid min-h-56 place-items-center p-8 text-center">
          <div>
            <Loader2 className="mx-auto mb-4 size-8 animate-spin text-[color:var(--klein)]" />
            <p className="font-bold">Chargement de la veille...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError && resources.length === 0 && feeds.length === 0) {
    return (
      <Card className={cn(panelClass, "rounded-3xl")}>
        <CardContent className="p-8">{loadError}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="grid gap-5 xl:sticky xl:top-5 xl:self-start">
        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Link2 className="size-5 text-[color:var(--klein)]" />
              Ajouter une URL
            </CardTitle>
            <CardDescription>
              Metadata, doublon et tags sont rattaches a l'organisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <form className="grid gap-4" onSubmit={handleAddResource}>
              <Input
                className={inputClass}
                disabled={!canEdit}
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/article"
                required
              />
              <Input
                className={inputClass}
                disabled={!canEdit}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Thematique"
              />
              <Input
                className={inputClass}
                disabled={!canEdit}
                value={tagNames}
                onChange={(event) => setTagNames(event.target.value)}
                placeholder="Tags separes par virgule"
              />
              <Button
                className="h-11 rounded-2xl bg-[color:var(--rubric)] font-bold text-[color:var(--paper)] hover:bg-[color:var(--rubric)]"
                disabled={!canEdit || busyKey === "add-resource"}
                type="submit"
              >
                {busyKey === "add-resource" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Rss className="size-5 text-[color:var(--klein)]" />
              Flux RSS
            </CardTitle>
            <CardDescription>
              L'import manuel respecte les doublons par URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 py-5">
            <form className="grid gap-4" onSubmit={handleAddFeed}>
              <Input
                className={inputClass}
                disabled={!canEdit}
                type="url"
                value={feedUrl}
                onChange={(event) => setFeedUrl(event.target.value)}
                placeholder="https://example.com/feed.xml"
                required
              />
              <Input
                className={inputClass}
                disabled={!canEdit}
                value={feedTitle}
                onChange={(event) => setFeedTitle(event.target.value)}
                placeholder="Nom du flux"
              />
              <Button
                className="h-11 rounded-2xl"
                disabled={!canEdit || busyKey === "add-feed"}
                type="submit"
                variant="outline"
              >
                {busyKey === "add-feed" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Rss className="size-4" />
                )}
                Ajouter et importer
              </Button>
            </form>

            <div className="grid gap-2">
              {feeds.map((feed) => (
                <div
                  className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3"
                  key={feed.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">
                        {feed.title}
                      </strong>
                      <span className="mt-1 block truncate text-xs text-[color:var(--text-muted)]">
                        {feed.url}
                      </span>
                    </div>
                    <Badge>{feed.status}</Badge>
                  </div>
                  <Button
                    className="mt-3 h-9 w-full rounded-xl"
                    disabled={!canEdit || busyKey === `feed:${feed.id}`}
                    type="button"
                    variant="outline"
                    onClick={() => handleImportFeed(feed.id)}
                  >
                    Importer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>

      <section className="grid min-w-0 gap-5">
        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  Ressources collectees
                </CardTitle>
                <CardDescription>
                  Resumez une source ou utilisez-la comme inspiration.
                </CardDescription>
              </div>
              <select
                className={cn(selectClass, "w-[220px]")}
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ContentGenerationFormat)
                }
              >
                {GENERATION_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {CONTENT_FORMAT_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 py-5">
            {resources.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[color:var(--border-strong)] p-8 text-center">
                <FileText className="mx-auto mb-3 size-8 text-[color:var(--klein)]" />
                <h3 className="text-xl font-bold">Aucune ressource</h3>
                <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                  Ajoutez une URL ou un flux RSS pour demarrer la veille.
                </p>
              </div>
            ) : null}

            {resources.map((resource) => (
              <ResourceCard
                busyKey={busyKey}
                canEdit={canEdit}
                organizationSlug={organizationSlug}
                resource={resource}
                key={resource.id}
                onSummarize={handleSummarize}
                onUse={handleUseResource}
              />
            ))}
          </CardContent>
        </Card>

        {draft ? (
          <Card className={cn(panelClass, "rounded-3xl py-0")}>
            <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Brouillon genere depuis la veille</CardTitle>
                  <CardDescription>
                    Relisez puis enregistrez ce contenu dans la bibliotheque.
                  </CardDescription>
                </div>
                <Button
                  className="h-11 rounded-2xl"
                  disabled={busyKey === "save-draft"}
                  type="button"
                  onClick={handleSaveDraft}
                >
                  {busyKey === "save-draft" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Enregistrer en bibliotheque
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 px-5 py-5">
              <Input className={inputClass} value={draft.title} readOnly />
              <Textarea
                className="min-h-72 rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-2)] font-mono text-sm leading-7"
                value={draft.body}
                readOnly
              />
              {draft.savedContentHref ? (
                <Link
                  className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 py-2 text-sm font-bold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-accent)]"
                  href={draft.savedContentHref}
                >
                  <ExternalLink className="size-4" />
                  Ouvrir le contenu sauvegarde
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}

function ResourceCard({
  busyKey,
  canEdit,
  organizationSlug,
  onSummarize,
  onUse,
  resource,
}: {
  busyKey: string | null;
  canEdit: boolean;
  organizationSlug: string;
  onSummarize: (resourceId: string) => void;
  onUse: (resourceId: string) => void;
  resource: CuratedResourcePayload;
}) {
  return (
    <article className="rounded-3xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge>{resource.type}</Badge>
            <Badge>{resource.status}</Badge>
            {resource.topic ? <Badge>{resource.topic}</Badge> : null}
          </div>
          <h3 className="text-xl font-bold leading-tight text-[color:var(--ink)]">
            <Link href={`/app/${organizationSlug}/curation/${resource.id}`}>
              {resource.title}
            </Link>
          </h3>
          <a
            className="mt-2 block truncate text-sm font-medium text-[color:var(--klein)]"
            href={resource.url}
            rel="noreferrer"
            target="_blank"
          >
            {resource.url}
          </a>
          {resource.description ? (
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {resource.description}
            </p>
          ) : null}
        </div>
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-[260px] lg:grid-cols-1">
          <Button
            className="h-10 rounded-xl"
            disabled={!canEdit || busyKey === `summary:${resource.id}`}
            type="button"
            variant="outline"
            onClick={() => onSummarize(resource.id)}
          >
            {busyKey === `summary:${resource.id}` ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Resumer
          </Button>
          <Button
            className="h-10 rounded-xl bg-[color:var(--rubric)] font-bold text-[color:var(--paper)] hover:bg-[color:var(--rubric)]"
            disabled={!canEdit || busyKey === `generation:${resource.id}`}
            type="button"
            onClick={() => onUse(resource.id)}
          >
            {busyKey === `generation:${resource.id}` ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generer
          </Button>
        </div>
      </div>
      {resource.summary ? (
        <div className="mt-4 rounded-2xl bg-[color:var(--paper-card)] p-4">
          <strong className="text-sm">Resume IA</strong>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {resource.summary}
          </p>
          {resource.keyPoints.length > 0 ? (
            <ul className="mt-3 grid gap-1 text-sm text-[color:var(--text-muted)]">
              {resource.keyPoints.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
