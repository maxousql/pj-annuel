"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Lightbulb,
  MoreHorizontal,
  Plus,
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
import { Badge } from "@/components/ui/badge";
import { fetchDashboardSummary } from "@/lib/dashboard/client";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  organizationSlug: string;
};

type Accent = "blue" | "lime" | "violet";

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
    return (
      <DashboardState
        icon={BarChart3}
        title="Chargement du tableau de bord"
        description="Lecture des indicateurs editoriaux de l'organisation."
      />
    );
  }

  if (!summary) {
    return (
      <DashboardState
        icon={BarChart3}
        title="Dashboard indisponible"
        description={message ?? "Les indicateurs n'ont pas pu etre charges."}
      />
    );
  }

  const completionRate = getCompletionRate(summary);
  const publishedCount = Math.max(
    summary.counters.contentsCount -
      summary.counters.draftsCount -
      summary.counters.toReviewCount,
    0,
  );
  const chartBars = buildChartBars(summary);

  return (
    <div className="grid w-full max-w-[1048px] gap-[36px] text-[#E8EEFF]">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <h1 className="text-[40px] font-extrabold leading-[1.05] text-[#E8EEFF] sm:text-[44px]">
            Tableau de bord
          </h1>
          <p className="mt-3 max-w-[520px] text-[22px] font-medium leading-[1.35] text-[#A3AEC5]">
            Bienvenue. Voici l'etat de votre strategie de contenu.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:pt-[26px]">
          <DashboardAction
            href={`/app/${organizationSlug}/history`}
            icon={Download}
            variant="secondary"
          >
            Exporter le rapport
          </DashboardAction>
          {summary.canEdit ? (
            <DashboardAction
              href={`/app/${organizationSlug}/contents/generate`}
              icon={Plus}
              variant="primary"
            >
              Creer un contenu
            </DashboardAction>
          ) : null}
        </div>
      </section>

      <section className="grid gap-[26px] lg:grid-cols-3">
        <StatCard
          accent="blue"
          icon={Sparkles}
          label="Contenus generes"
          suffix="+12%"
          value={summary.counters.aiGenerationsCount}
        />
        <StatCard
          accent="violet"
          icon={Lightbulb}
          label="Idees en attente"
          suffix="Nouveau"
          value={summary.counters.ideasCount}
        />
        <StatCard
          accent="lime"
          icon={CalendarDays}
          label="Contenus planifies"
          suffix={`${summary.counters.toReviewCount} a relire`}
          value={publishedCount}
        />
      </section>

      <section className="grid gap-[36px] xl:grid-cols-[minmax(0,686px)_325px]">
        <Panel className="min-h-[541px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-extrabold leading-tight text-[#E8EEFF]">
                Performance editoriale
              </h2>
              <p className="mt-1 text-[16px] font-medium text-[#A3AEC5]">
                Engagement cumule des 30 derniers jours
              </p>
            </div>
            <div className="flex h-10 rounded-[8px] bg-[#1A2742] p-1">
              <span className="grid h-8 min-w-[69px] place-items-center rounded-[6px] bg-[#84A4FF] px-4 text-[13px] font-extrabold text-[#071123]">
                Vues
              </span>
              <span className="grid h-8 min-w-[88px] place-items-center px-4 text-[13px] font-bold text-[#A3AEC5]">
                Actions
              </span>
            </div>
          </div>

          <div className="mt-[38px] h-[288px] border-b border-l border-[#172139] pl-2">
            <div className="flex h-full items-end gap-px">
              {chartBars.map((bar, index) => (
                <div
                  className="flex h-full min-w-0 flex-1 items-end"
                  key={`${bar.primary}-${index}`}
                >
                  <div className="relative h-full w-full">
                    <span
                      className="absolute bottom-0 left-0 right-0 rounded-t-[8px] bg-[#263756]"
                      style={{ height: `${bar.secondary}%` }}
                    />
                    <span
                      className="absolute bottom-0 left-0 right-0 rounded-t-[8px] bg-[#84A4FF]"
                      style={{ height: `${bar.primary}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-[29px] grid grid-cols-4 text-[12px] font-black uppercase text-[#7D879E]">
            <span>Semaine 1</span>
            <span>Semaine 2</span>
            <span>Semaine 3</span>
            <span>Semaine 4</span>
          </div>
        </Panel>

        <Panel className="min-h-[541px]">
          <div className="mb-[34px] flex items-center justify-between gap-4">
            <h2 className="text-[24px] font-extrabold leading-tight text-[#E8EEFF]">
              A venir
            </h2>
            <MoreHorizontal className="size-5 text-[#A3AEC5]" />
          </div>
          <div className="grid gap-5">
            {summary.reviewItems.slice(0, 3).map((item, index) => (
              <UpcomingItem item={item} index={index} key={item.id} />
            ))}
            {summary.reviewItems.length === 0 ? (
              <CompactEmpty>Aucun contenu en attente.</CompactEmpty>
            ) : null}
          </div>
          <Link
            className="mt-[28px] inline-flex h-[51px] w-full items-center justify-center rounded-[12px] border border-[#24314D] bg-transparent text-[16px] font-extrabold text-[#E8EEFF] transition hover:bg-[#121C33]"
            href={`/app/${organizationSlug}/calendar`}
          >
            Voir tout le calendrier
          </Link>
        </Panel>
      </section>

      <section className="grid gap-[36px] xl:grid-cols-[minmax(0,686px)_325px]">
        <Panel className="min-h-[544px] p-0">
          <div className="flex items-center justify-between px-[37px] pb-7 pt-[38px]">
            <h2 className="text-[24px] font-extrabold text-[#E8EEFF]">
              Contenus recents
            </h2>
            <Link
              className="text-[14px] font-extrabold text-[#84A4FF]"
              href={`/app/${organizationSlug}/history`}
            >
              Voir tout
            </Link>
          </div>
          <RecentTable
            items={summary.latestItems}
            organizationSlug={organizationSlug}
          />
        </Panel>

        <Panel className="min-h-[544px]">
          <h2 className="mb-[29px] text-[24px] font-extrabold text-[#E8EEFF]">
            Idees a explorer
          </h2>
          <div className="grid gap-5">
            {summary.topTopics.slice(0, 2).map((topic, index) => (
              <IdeaCard
                count={topic.count}
                index={index}
                topic={topic.topic}
                key={topic.topic}
              />
            ))}
            {summary.topTopics.length === 0 ? (
              <CompactEmpty>Aucune idee a explorer.</CompactEmpty>
            ) : null}
          </div>
          <Link
            className="mt-[29px] inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#334461] bg-[#22304D] text-[15px] font-extrabold text-[#A3AEC5] transition hover:border-[#84A4FF] hover:text-[#E8EEFF]"
            href={`/app/${organizationSlug}/ideas`}
          >
            <Lightbulb className="size-5" />
            Nouvelle inspiration
          </Link>
        </Panel>
      </section>
    </div>
  );
}

function DashboardAction({
  children,
  href,
  icon: Icon,
  variant,
}: {
  children: ReactNode;
  href: string;
  icon: LucideIcon;
  variant: "primary" | "secondary";
}) {
  return (
    <Link
      className={cn(
        "inline-flex h-[82px] min-w-[220px] items-center justify-center gap-5 rounded-[12px] px-6 text-center text-[18px] font-extrabold leading-tight transition",
        variant === "primary" &&
          "bg-[#84A4FF] text-[#071123] shadow-[0_15px_32px_rgba(132,164,255,0.24)] hover:bg-[#9AB5FF]",
        variant === "secondary" &&
          "bg-[#1A2742] text-[#E8EEFF] hover:bg-[#22304D]",
      )}
      href={href}
    >
      <Icon className="size-6 shrink-0" />
      <span className="max-w-[128px]">{children}</span>
    </Link>
  );
}

function StatCard({
  accent,
  icon: Icon,
  label,
  suffix,
  value,
}: {
  accent: Accent;
  icon: LucideIcon;
  label: string;
  suffix: string;
  value: number;
}) {
  return (
    <article
      className={cn(
        "min-h-[194px] rounded-[16px] border border-[#172139] bg-[#0B1326] p-[27px]",
        accent === "violet" &&
          "bg-[linear-gradient(135deg,#0B1326_0%,#171633_100%)]",
        accent === "lime" &&
          "bg-[linear-gradient(135deg,#0B1326_0%,#12291F_100%)]",
      )}
    >
      <span
        className={cn(
          "grid size-[52px] place-items-center rounded-[13px]",
          accent === "blue" && "bg-[#18294B] text-[#84A4FF]",
          accent === "violet" && "bg-[#2B1E58] text-[#B783FF]",
          accent === "lime" && "bg-[#203613] text-[#C3F400]",
        )}
      >
        <Icon className="size-6" />
      </span>
      <p className="mt-[21px] text-[16px] font-semibold text-[#A3AEC5]">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-3">
        <strong className="text-[34px] font-extrabold leading-none text-[#E8EEFF]">
          {value.toLocaleString("fr-FR")}
        </strong>
        <span
          className={cn(
            "pb-1 text-[13px] font-extrabold",
            accent === "blue" && "text-[#C3F400]",
            accent === "violet" && "text-[#C7CBE0]",
            accent === "lime" && "text-[#C3F400]",
          )}
        >
          {suffix}
        </span>
      </div>
    </article>
  );
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[#172139] bg-[#081226] p-[37px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function UpcomingItem({
  index,
  item,
}: {
  index: number;
  item: DashboardLatestItemPayload;
}) {
  const days = ["MAR", "MER", "JEU"];

  return (
    <article className="grid min-h-[97px] grid-cols-[56px_minmax(0,1fr)] items-center gap-4 rounded-[14px] bg-[#121C33] px-[18px]">
      <div className="grid size-[56px] place-items-center rounded-[13px] bg-[#1B2A48] text-center">
        <span className="block text-[13px] font-extrabold text-[#84A4FF]">
          {days[index] ?? "VEN"}
        </span>
        <strong className="block text-[23px] font-extrabold leading-none text-[#DCE4FF]">
          {12 + index}
        </strong>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[16px] font-extrabold leading-[1.25] text-[#E8EEFF]">
          {item.title}
        </h3>
        <p className="mt-1 truncate text-[13px] font-medium text-[#A3AEC5]">
          {CONTENT_FORMAT_LABELS[item.format]} -{" "}
          {formatContentDate(item.updatedAt)}
        </p>
      </div>
    </article>
  );
}

function RecentTable({
  items,
  organizationSlug,
}: {
  items: DashboardLatestItemPayload[];
  organizationSlug: string;
}) {
  if (items.length === 0) {
    return (
      <div className="px-[37px] pb-[37px]">
        <CompactEmpty>Les contenus recents apparaitront ici.</CompactEmpty>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1.4fr)_110px_110px_110px] border-b border-[#172139] px-[37px] pb-[17px] text-[12px] font-black uppercase text-[#7D879E]">
        <span>Titre du contenu</span>
        <span>Statut</span>
        <span>Score IA</span>
        <span className="text-right">Date</span>
      </div>
      <div className="grid">
        {items.slice(0, 3).map((item) => (
          <Link
            className="grid min-h-[91px] grid-cols-[minmax(0,1.4fr)_110px_110px_110px] items-center border-b border-[#172139] px-[37px] transition hover:bg-[#101A31]"
            href={`/app/${organizationSlug}/history/${item.type.toLowerCase()}/${item.id}`}
            key={`${item.type}:${item.id}`}
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-[#1B2A48] text-[#A3AEC5]">
                <FileText className="size-4" />
              </span>
              <span className="line-clamp-2 text-[17px] font-extrabold leading-[1.15] text-[#E8EEFF]">
                {item.title}
              </span>
            </div>
            <StatusBadge status={item.status} />
            <div className="flex items-center gap-2 text-[15px] font-bold text-[#DCE4FF]">
              <span className="h-1 w-9 rounded-full bg-[#84A4FF]" />
              {scoreForStatus(item.status)}%
            </div>
            <span className="truncate text-right text-[14px] font-medium text-[#A3AEC5]">
              {formatContentDate(item.updatedAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function IdeaCard({
  count,
  index,
  topic,
}: {
  count: number;
  index: number;
  topic: string;
}) {
  const label = index === 0 ? "Tech" : "Trend";
  const confidence = index === 0 ? "Haut potentiel" : "Relevant";

  return (
    <article className="min-h-[151px] rounded-[14px] border border-[#24314D] bg-[#1A2742] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Badge
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-[11px] font-black uppercase",
            index === 0
              ? "bg-[#7E4CC2] text-[#E8D7FF]"
              : "bg-[#4A6514] text-[#C3F400]",
          )}
        >
          {label}
        </Badge>
        <span className="text-[11px] font-black uppercase text-[#A3AEC5]">
          {confidence}
        </span>
      </div>
      <h3 className="line-clamp-3 text-[17px] font-extrabold leading-[1.24] text-[#E8EEFF]">
        {topic}
      </h3>
      <p className="mt-3 text-[13px] font-semibold text-[#A3AEC5]">
        {count} occurrence{count > 1 ? "s" : ""}
      </p>
    </article>
  );
}

function CompactEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#24314D] bg-[#0B1326] p-5 text-[15px] font-semibold text-[#A3AEC5]">
      {children}
    </div>
  );
}

function DashboardState({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="max-w-[1048px] rounded-[18px] border border-[#172139] bg-[#081226] p-[37px] text-[#E8EEFF]">
      <div className="flex items-start gap-4">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[13px] bg-[#18294B] text-[#84A4FF]">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[24px] font-extrabold">{title}</h2>
          <p className="mt-2 text-[16px] font-medium leading-6 text-[#A3AEC5]">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: ContentIdeaStatus | ContentItemStatus;
}) {
  const tone = getStatusTone(status);

  return (
    <Badge
      className={cn(
        "w-fit rounded-[5px] px-2 py-1 text-[11px] font-black uppercase",
        tone === "lime" && "bg-[#4A6514] text-[#C3F400]",
        tone === "blue" && "bg-[#17284E] text-[#84A4FF]",
        tone === "violet" && "bg-[#273047] text-[#A3AEC5]",
      )}
    >
      {formatDashboardStatus(status)}
    </Badge>
  );
}

function buildChartBars(summary: DashboardSummaryPayload) {
  const base = [23, 45, 32, 68, 26, 52, 82, 29, 33, 56];
  const modifier = Math.min(summary.counters.aiGenerationsCount, 30);

  return base.map((value, index) => {
    const primary = Math.min(
      88,
      Math.max(18, value + ((modifier + index) % 12)),
    );
    return {
      primary,
      secondary: Math.min(100, primary + 22),
    };
  });
}

function scoreForStatus(status: ContentIdeaStatus | ContentItemStatus): number {
  if (status === "PUBLISHED" || status === "USED") {
    return 92;
  }

  if (status === "REVIEW" || status === "SAVED") {
    return 84;
  }

  return 65;
}

function getCompletionRate(summary: DashboardSummaryPayload): number {
  if (summary.counters.contentsCount === 0) {
    return 0;
  }

  const completed =
    summary.counters.contentsCount -
    summary.counters.draftsCount -
    summary.counters.toReviewCount;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((completed / summary.counters.contentsCount) * 100),
    ),
  );
}

function getStatusTone(
  status: ContentIdeaStatus | ContentItemStatus,
): "blue" | "lime" | "violet" {
  if (status === "SAVED" || status === "PUBLISHED" || status === "USED") {
    return "lime";
  }

  if (status === "REVIEW" || status === "SCHEDULED") {
    return "blue";
  }

  return "violet";
}

function formatDashboardStatus(
  status: ContentIdeaStatus | ContentItemStatus,
): string {
  if (status in CONTENT_IDEA_STATUS_LABELS) {
    return CONTENT_IDEA_STATUS_LABELS[status as ContentIdeaStatus];
  }

  return CONTENT_STATUS_LABELS[status as ContentItemStatus];
}
