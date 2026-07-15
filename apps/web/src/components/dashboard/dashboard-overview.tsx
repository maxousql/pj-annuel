"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  FileText,
  Lightbulb,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  ContentIdeaStatus,
  ContentItemStatus,
  DashboardLatestItemPayload,
  DashboardSummaryPayload,
} from "@content-ai/shared";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_IDEA_STATUS_LABELS,
  CONTENT_STATUS_LABELS,
  formatContentDate,
} from "@/components/contents/content-labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDashboardSummary } from "@/lib/dashboard/client";

type DashboardOverviewProps = {
  organizationSlug: string;
};

type PipelineItem = {
  count: number;
  label: string;
  tone: "accent" | "muted" | "strong";
};

export function DashboardOverview({
  organizationSlug,
}: DashboardOverviewProps) {
  const [summary, setSummary] = useState<DashboardSummaryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      const result = await fetchDashboardSummary(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setSummary(result.data);
        setMessage(null);
      }

      setIsLoading(false);
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!summary) {
    return (
      <Alert className="max-w-3xl p-5" variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Tableau de bord indisponible</AlertTitle>
        <AlertDescription>
          {message ?? "Les indicateurs n'ont pas pu être chargés."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DashboardContent organizationSlug={organizationSlug} summary={summary} />
  );
}

function DashboardContent({
  organizationSlug,
  summary,
}: {
  organizationSlug: string;
  summary: DashboardSummaryPayload;
}) {
  const otherStatusCount = getOtherStatusCount(summary);
  const pipeline = buildPipeline(summary, otherStatusCount);
  const totalPipelineItems = Math.max(
    pipeline.reduce((total, item) => total + item.count, 0),
    1,
  );

  return (
    <div className="grid w-full max-w-[1320px] gap-8 text-foreground">
      <header className="flex flex-col gap-6 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid max-w-2xl gap-2">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--sage)]">
            Vue d&apos;ensemble
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Votre activité éditoriale
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            Les priorités, les publications et les sujets à reprendre au même
            endroit.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-10 px-4"
            render={
              <Link href={`/app/${organizationSlug}/calendar`}>
                <CalendarDays data-icon="inline-start" aria-hidden="true" />
                Ouvrir le calendrier
              </Link>
            }
            variant="outline"
          />
          {summary.canEdit ? (
            <Button
              className="h-10 px-4"
              render={
                <Link href={`/app/${organizationSlug}/contents/generate`}>
                  <PenLine data-icon="inline-start" aria-hidden="true" />
                  Créer un contenu
                </Link>
              }
              variant="sage"
            />
          ) : null}
        </div>
      </header>

      {!summary.editorialContextConfigured ? (
        <Alert className="border-[color:var(--sage)]/30 bg-[color:var(--sage)]/5 p-4">
          <CircleAlert
            className="text-[color:var(--sage)]"
            aria-hidden="true"
          />
          <AlertTitle>Contexte éditorial à compléter</AlertTitle>
          <AlertDescription>
            {summary.canEdit
              ? "Ajoutez votre ton et vos règles de marque pour mieux cadrer les prochaines générations."
              : "Un administrateur doit compléter le ton et les règles de marque de cet espace."}
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="Indicateurs principaux"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          icon={FileText}
          label="Contenus"
          value={summary.counters.contentsCount}
        />
        <Metric
          icon={Lightbulb}
          label="Idées actives"
          value={summary.counters.ideasCount}
        />
        <Metric
          icon={CircleAlert}
          label="À relire"
          value={summary.counters.toReviewCount}
        />
        <Metric
          icon={Sparkles}
          label="Générations IA"
          value={summary.counters.aiGenerationsCount}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <Card className="py-0">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="text-xl">
              <h2>Pipeline éditorial</h2>
            </CardTitle>
            <CardDescription>
              Répartition réelle des contenus selon leur avancement.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-7 px-5 py-6 sm:px-6">
            <div
              className="flex h-3 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              {pipeline.map((item) => (
                <span
                  className={
                    item.tone === "accent"
                      ? "bg-[color:var(--sage)]"
                      : item.tone === "strong"
                        ? "bg-foreground/70"
                        : "bg-foreground/20"
                  }
                  key={item.label}
                  style={{
                    width: `${(item.count / totalPipelineItems) * 100}%`,
                  }}
                  title={`${item.label} : ${item.count}`}
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {pipeline.map((item) => (
                <div className="grid gap-1" key={item.label}>
                  <strong className="font-mono text-2xl font-semibold tabular-nums">
                    {item.count.toLocaleString("fr-FR")}
                  </strong>
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-1">
                <p className="text-sm font-medium text-foreground">
                  {otherStatusCount > 0
                    ? `${otherStatusCount} contenu${otherStatusCount > 1 ? "s" : ""} avec un autre statut`
                    : "Tous les contenus sont encore en préparation"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {summary.counters.toReviewCount > 0
                    ? `${summary.counters.toReviewCount} élément${summary.counters.toReviewCount > 1 ? "s" : ""} demande${summary.counters.toReviewCount > 1 ? "nt" : ""} une relecture.`
                    : "Le pipeline ne contient aucune relecture en attente."}
                </p>
              </div>
              <Button
                className="self-start sm:self-auto"
                render={
                  <Link href={`/app/${organizationSlug}/library`}>
                    Voir les contenus
                    <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                }
                variant="outline"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b border-border px-5 py-5">
            <CardTitle className="text-xl">
              <h2>À traiter</h2>
            </CardTitle>
            <CardDescription>
              Les prochains contenus à reprendre.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">
                {summary.counters.draftsCount + summary.counters.toReviewCount}{" "}
                en attente
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-1 px-3 py-3">
            {summary.reviewItems.length > 0 ? (
              <>
                {summary.reviewItems.slice(0, 4).map((item) => (
                  <PriorityItem
                    item={item}
                    organizationSlug={organizationSlug}
                    key={`${item.type}:${item.id}`}
                  />
                ))}
                <Button
                  className="mt-2"
                  render={
                    <Link href={`/app/${organizationSlug}/library`}>
                      Voir toute la file
                      <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  }
                  variant="outline"
                />
              </>
            ) : (
              <EmptyBlock
                description="Les brouillons et contenus à relire apparaîtront ici."
                title="Rien à traiter"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <Card className="py-0">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="text-xl">
              <h2>Activité récente</h2>
            </CardTitle>
            <CardDescription>
              Les dernières idées et contenus modifiés.
            </CardDescription>
            <CardAction>
              <Button
                render={
                  <Link href={`/app/${organizationSlug}/history`}>
                    Tout voir
                    <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                }
                size="sm"
                variant="ghost"
              />
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <RecentActivity
              items={summary.latestItems}
              organizationSlug={organizationSlug}
            />
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b border-border px-5 py-5">
            <CardTitle className="text-xl">
              <h2>Sujets actifs</h2>
            </CardTitle>
            <CardDescription>
              Les thèmes les plus présents dans votre espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 px-3 py-3">
            {summary.topTopics.length > 0 ? (
              summary.topTopics.slice(0, 5).map((topic) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 hover:bg-muted/70"
                  key={topic.topic}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color:var(--sage)]/10 text-[color:var(--sage)]">
                      <Lightbulb aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-medium">
                      {topic.topic}
                    </span>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {topic.count}
                  </span>
                </div>
              ))
            ) : (
              <EmptyBlock
                description="Les thèmes récurrents apparaîtront avec vos prochains contenus."
                title="Aucun sujet détecté"
              />
            )}
            <Button
              className="mt-2"
              render={
                <Link href={`/app/${organizationSlug}/ideas`}>
                  Explorer les idées
                  <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              }
              variant="outline"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <article className="grid min-h-32 grid-cols-[auto_1fr] gap-x-4 border-b border-border p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(3)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0">
      <span className="grid size-9 place-items-center rounded-lg bg-[color:var(--sage)]/10 text-[color:var(--sage)]">
        <Icon aria-hidden="true" />
      </span>
      <div className="grid gap-1">
        <strong className="font-mono text-3xl font-semibold leading-none tabular-nums text-foreground">
          {value.toLocaleString("fr-FR")}
        </strong>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </article>
  );
}

function PriorityItem({
  item,
  organizationSlug,
}: {
  item: DashboardLatestItemPayload;
  organizationSlug: string;
}) {
  return (
    <Link
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/70"
      href={getItemHref(organizationSlug, item)}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
        <FileText aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {CONTENT_FORMAT_LABELS[item.format]} -{" "}
          {formatContentDate(item.updatedAt)}
        </span>
      </span>
      <ArrowUpRight
        className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function RecentActivity({
  items,
  organizationSlug,
}: {
  items: DashboardLatestItemPayload[];
  organizationSlug: string;
}) {
  if (items.length === 0) {
    return (
      <div className="p-5">
        <EmptyBlock
          description="Les dernières modifications apparaîtront ici."
          title="Aucune activité récente"
        />
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="hidden grid-cols-[minmax(0,1fr)_130px_130px] border-b border-border px-6 py-3 text-xs font-medium text-muted-foreground md:grid">
        <span>Contenu</span>
        <span>Statut</span>
        <span className="text-right">Modification</span>
      </div>
      {items.slice(0, 5).map((item) => (
        <Link
          className="grid gap-3 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_130px_130px] md:items-center md:px-6"
          href={getItemHref(organizationSlug, item)}
          key={`${item.type}:${item.id}`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              {item.type === "IDEA" ? (
                <Lightbulb aria-hidden="true" />
              ) : (
                <FileText aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {CONTENT_FORMAT_LABELS[item.format]}
              </span>
            </span>
          </span>
          <StatusBadge status={item.status} />
          <span className="text-sm text-muted-foreground md:text-right">
            <span className="md:sr-only">Modifié le </span>
            {formatContentDate(item.updatedAt)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ContentIdeaStatus | ContentItemStatus;
}) {
  const isPublished = status === "PUBLISHED" || status === "USED";

  return (
    <Badge variant={isPublished ? "sage" : "secondary"}>
      {formatDashboardStatus(status)}
    </Badge>
  );
}

function EmptyBlock({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="grid gap-1 rounded-lg border border-dashed border-border p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid w-full max-w-[1320px] gap-8" aria-busy="true">
      <span className="sr-only" role="status">
        Chargement du tableau de bord
      </span>
      <div className="flex flex-col gap-4 border-b border-border pb-7">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

function buildPipeline(
  summary: DashboardSummaryPayload,
  otherStatusCount: number,
): PipelineItem[] {
  return [
    {
      count: summary.counters.draftsCount,
      label: "Brouillons",
      tone: "muted",
    },
    {
      count: summary.counters.toReviewCount,
      label: "À relire",
      tone: "strong",
    },
    { count: otherStatusCount, label: "Autres statuts", tone: "accent" },
  ];
}

function getOtherStatusCount(summary: DashboardSummaryPayload): number {
  return Math.max(
    summary.counters.contentsCount -
      summary.counters.draftsCount -
      summary.counters.toReviewCount,
    0,
  );
}

function getItemHref(
  organizationSlug: string,
  item: DashboardLatestItemPayload,
): string {
  return `/app/${organizationSlug}/history/${item.type.toLowerCase()}/${item.id}`;
}

function formatDashboardStatus(
  status: ContentIdeaStatus | ContentItemStatus,
): string {
  if (status in CONTENT_IDEA_STATUS_LABELS) {
    return CONTENT_IDEA_STATUS_LABELS[status as ContentIdeaStatus];
  }

  return CONTENT_STATUS_LABELS[status as ContentItemStatus];
}
