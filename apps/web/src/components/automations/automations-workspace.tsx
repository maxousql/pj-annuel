"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AutomationRulePayload,
  AutomationRuleType,
  AutomationsPayload,
  RecommendationPayload,
} from "@content-ai/shared";
import {
  Bell,
  Check,
  Clock3,
  Loader2,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { LoadingState } from "@/components/shell/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchAutomations,
  updateAutomationRule,
  updateNotificationPreferences,
  updateRecommendationStatus,
} from "@/lib/automations/client";
import { cn } from "@/lib/utils";

type AutomationsWorkspaceProps = {
  organizationSlug: string;
};

const panelClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/95 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)]";

export function AutomationsWorkspace({
  organizationSlug,
}: AutomationsWorkspaceProps) {
  const [state, setState] = useState<AutomationsPayload | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const rulesByType = useMemo(() => {
    return new Map((state?.rules ?? []).map((rule) => [rule.type, rule]));
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      const result = await fetchAutomations(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setLoadError(result.error.message);
        toast.error(result.error.message);
      } else {
        setState(result.data);
        setLoadError(null);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  async function reload() {
    const result = await fetchAutomations(organizationSlug);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setState(result.data);
    setLoadError(null);
  }

  async function handleToggleRule(type: AutomationRuleType) {
    const rule = rulesByType.get(type);
    const nextStatus = rule?.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    setBusyKey(`rule:${type}`);
    const result = await updateAutomationRule(organizationSlug, type, {
      reminderHoursBefore: type === "PUBLICATION_REMINDER" ? 48 : undefined,
      status: nextStatus,
      timezone:
        type === "PUBLICATION_REMINDER"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined,
    });
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success(
      nextStatus === "ACTIVE"
        ? "Automatisation activée."
        : "Automatisation mise en pause.",
    );
  }

  async function handleRecommendationStatus(
    recommendationId: string,
    status: "APPLIED" | "DISMISSED",
  ) {
    setBusyKey(`recommendation:${recommendationId}`);
    const result = await updateRecommendationStatus(
      organizationSlug,
      recommendationId,
      status,
    );
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success(
      status === "APPLIED"
        ? "Recommandation marquée comme faite."
        : "Recommandation ignorée.",
    );
  }

  async function handlePreference(nextInAppEnabled: boolean) {
    setBusyKey("preferences");
    const result = await updateNotificationPreferences(organizationSlug, {
      inAppEnabled: nextInAppEnabled,
    });
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success("Préférences de notifications mises à jour.");
  }

  if (isLoading) {
    return (
      <LoadingState title="Chargement des automatisations" />
    );
  }

  if (!state) {
    return (
      <Card className={cn(panelClass, "rounded-3xl")}>
        <CardContent className="p-8">
          {loadError ?? "Automations indisponibles."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid min-w-0 gap-5">
        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle>Règles actives</CardTitle>
            <CardDescription>
              Les automatisations proposent, notifient, mais ne modifient pas
              les contenus sans action utilisateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 py-5 md:grid-cols-2">
            <RuleCard
              busyKey={busyKey}
              canEdit={state.canEdit}
              description="Crée une notification quand une publication planifiée approche."
              icon={Bell}
              rule={rulesByType.get("PUBLICATION_REMINDER")}
              title="Rappels de publication"
              type="PUBLICATION_REMINDER"
              onToggle={handleToggleRule}
            />
            <RuleCard
              busyKey={busyKey}
              canEdit={state.canEdit}
              description="Détecte contenus non planifiés et idées à transformer."
              icon={Sparkles}
              rule={rulesByType.get("EDITORIAL_RECOMMENDATION")}
              title="Recommandations editoriales"
              type="EDITORIAL_RECOMMENDATION"
              onToggle={handleToggleRule}
            />
          </CardContent>
        </Card>

        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle>Recommandations</CardTitle>
            <CardDescription>
              Actions suggerees par le moteur deterministe V2.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 py-5">
            {state.recommendations.length === 0 ? (
              <p className="rounded-2xl bg-[color:var(--paper-2)] p-4 text-sm text-[color:var(--text-muted)]">
                Aucune recommandation ouverte.
              </p>
            ) : null}
            {state.recommendations.map((recommendation) => (
              <RecommendationRow
                busyKey={busyKey}
                recommendation={recommendation}
                key={recommendation.id}
                onStatus={handleRecommendationStatus}
              />
            ))}
          </CardContent>
        </Card>
      </section>

      <aside className="grid gap-5 xl:sticky xl:top-5 xl:self-start">
        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle>Jobs planifiés</CardTitle>
            <CardDescription>
              Les automatisations tournent en arrière-plan quand les règles sont
              actives.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 py-5">
            <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-5 text-[color:var(--klein)]" />
                <div>
                  <strong className="block text-sm">
                    Rappels de publication
                  </strong>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                    Controle toutes les 15 minutes les publications proches et
                    notifie les membres actifs.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 text-[color:var(--rubric)]" />
                <div>
                  <strong className="block text-sm">
                    Recommandations editoriales
                  </strong>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                    Analyse toutes les heures les contenus non planifiés et les
                    idées sauvegardées.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle>Centre de notifications</CardTitle>
            <CardDescription>
              Lecture, filtres et recommandations sont regroupés dans une page
              dédiée.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <Link
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-sm font-bold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-accent)]"
              href={`/app/${organizationSlug}/notifications`}
            >
              <Bell className="size-4" />
              Ouvrir les notifications
            </Link>
          </CardContent>
        </Card>

        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
            <CardTitle>Préférences</CardTitle>
            <CardDescription>
              Activation des notifications internes.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-[color:var(--paper-2)] p-4 text-sm font-bold">
              Notifications in-app
              <input
                checked={state.preferences.inAppEnabled}
                disabled={busyKey === "preferences"}
                type="checkbox"
                onChange={(event) => handlePreference(event.target.checked)}
              />
            </label>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function RuleCard({
  busyKey,
  canEdit,
  description,
  icon: Icon,
  onToggle,
  rule,
  title,
  type,
}: {
  busyKey: string | null;
  canEdit: boolean;
  description: string;
  icon: typeof Bell;
  onToggle: (type: AutomationRuleType) => void;
  rule: AutomationRulePayload | undefined;
  title: string;
  type: AutomationRuleType;
}) {
  const active = rule?.status === "ACTIVE";

  return (
    <div className="rounded-3xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-11 place-items-center rounded-2xl bg-[color:var(--paper-card)] text-[color:var(--klein)]">
          <Icon className="size-5" />
        </div>
        <Badge>{active ? "Active" : "Pausee"}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
        {description}
      </p>
      <Button
        className="mt-4 h-10 w-full rounded-xl"
        disabled={!canEdit || busyKey === `rule:${type}`}
        type="button"
        variant={active ? "outline" : "default"}
        onClick={() => onToggle(type)}
      >
        {busyKey === `rule:${type}` ? (
          <Loader2 className="size-4 animate-spin" />
        ) : active ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
        {active ? "Mettre en pause" : "Activer"}
      </Button>
    </div>
  );
}

function RecommendationRow({
  busyKey,
  onStatus,
  recommendation,
}: {
  busyKey: string | null;
  onStatus: (recommendationId: string, status: "APPLIED" | "DISMISSED") => void;
  recommendation: RecommendationPayload;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge>{recommendation.type}</Badge>
          <p className="mt-2 text-sm font-medium leading-6">
            {recommendation.message}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            className="h-9 rounded-xl"
            disabled={busyKey === `recommendation:${recommendation.id}`}
            type="button"
            variant="outline"
            onClick={() => onStatus(recommendation.id, "DISMISSED")}
          >
            Ignorer
          </Button>
          <Button
            className="h-9 rounded-xl"
            disabled={busyKey === `recommendation:${recommendation.id}`}
            type="button"
            onClick={() => onStatus(recommendation.id, "APPLIED")}
          >
            <Check className="size-4" />
            Fait
          </Button>
        </div>
      </div>
    </div>
  );
}
