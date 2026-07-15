"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Library,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  PUBLICATION_CHANNELS,
  PUBLICATION_STATUSES,
  type PublicationChannel,
  type PublicationPlanPayload,
  type PublicationPlansPayload,
  type PublicationStatus,
} from "@content-ai/shared";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_LABELS,
} from "@/components/contents/content-labels";
import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createPublicationPlan,
  deletePublicationPlan,
  fetchPublicationPlans,
  updatePublicationPlan,
} from "@/lib/publication-plans/client";
import { cn } from "@/lib/utils";

type EditorialCalendarWorkspaceProps = {
  organizationSlug: string;
};

type ViewMode = "list" | "month";

type FilterState = {
  channel: PublicationChannel | "";
  status: PublicationStatus | "";
};

type PlanFormState = {
  channel: PublicationChannel;
  contentId: string;
  notes: string;
  scheduledAt: string;
  status: PublicationStatus;
};

const CHANNEL_LABELS: Record<PublicationChannel, string> = {
  BLOG: "Blog",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OTHER: "Autre",
  X: "X",
};

const PLAN_STATUS_LABELS: Record<PublicationStatus, string> = {
  CANCELLED: "Annulee",
  PLANNED: "Planifiee",
  PUBLISHED: "Publiee",
};

const EMPTY_FILTERS: FilterState = {
  channel: "",
  status: "",
};

const inputClassName =
  "h-11 rounded-[12px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3 text-sm text-[color:var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none placeholder:text-[color:var(--text-subtle)] focus-visible:border-[color:var(--klein)] focus-visible:ring-[color:var(--klein)]/25";

const selectClassName = cn(
  inputClassName,
  "w-full appearance-none truncate pr-9",
);

const panelClassName =
  "rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] shadow-[0_2px_10px_rgba(23,19,15,0.05)]";

export function EditorialCalendarWorkspace({
  organizationSlug,
}: EditorialCalendarWorkspaceProps) {
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [calendar, setCalendar] = useState<PublicationPlansPayload | null>(
    null,
  );
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(() => createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const monthRange = useMemo(() => getMonthRange(monthCursor), [monthCursor]);
  const monthDays = useMemo(() => getCalendarDays(monthCursor), [monthCursor]);

  useEffect(() => {
    let isMounted = true;

    async function loadCalendar() {
      setIsLoading(true);
      const result = await fetchPublicationPlans(organizationSlug, {
        from: monthRange.from,
        to: monthRange.to,
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      });

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setErrorMessage(result.error.message);
      } else {
        setCalendar(result.data);
        setErrorMessage(null);
      }

      setIsLoading(false);
    }

    void loadCalendar();

    return () => {
      isMounted = false;
    };
  }, [filters, monthRange.from, monthRange.to, organizationSlug]);

  useEffect(() => {
    if (!calendar || form.contentId) {
      return;
    }

    const firstContent = calendar.contentOptions[0];

    if (firstContent) {
      setForm((current) => ({
        ...current,
        contentId: firstContent.id,
      }));
    }
  }, [calendar, form.contentId]);

  const plansByDay = useMemo(() => {
    const groups = new Map<string, PublicationPlanPayload[]>();

    (calendar?.plans ?? []).forEach((plan) => {
      const key = toLocalDateKey(plan.scheduledAt);
      const group = groups.get(key) ?? [];
      group.push(plan);
      groups.set(key, group);
    });

    return groups;
  }, [calendar]);

  async function reloadCalendar() {
    const result = await fetchPublicationPlans(organizationSlug, {
      from: monthRange.from,
      to: monthRange.to,
      ...(filters.channel ? { channel: filters.channel } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    });

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    setCalendar(result.data);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.contentId || !form.scheduledAt) {
      setErrorMessage("Choisissez un contenu et une date.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      channel: form.channel,
      contentId: form.contentId,
      notes: form.notes.trim() ? form.notes.trim() : null,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      status: form.status,
    };
    const result = editingPlanId
      ? await updatePublicationPlan(organizationSlug, editingPlanId, payload)
      : await createPublicationPlan(organizationSlug, payload);

    if (result.error) {
      setErrorMessage(result.error.message);
    } else {
      setSuccessMessage(
        editingPlanId ? "Planification mise a jour." : "Planification creee.",
      );
      setEditingPlanId(null);
      setForm(createEmptyForm(calendar?.contentOptions[0]?.id));
      await reloadCalendar();
    }

    setIsSaving(false);
  }

  async function handleDelete(planId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await deletePublicationPlan(organizationSlug, planId);

    if (result.error) {
      setErrorMessage(result.error.message);
    } else {
      setSuccessMessage("Planification supprimee.");
      if (editingPlanId === planId) {
        setEditingPlanId(null);
        setForm(createEmptyForm(calendar?.contentOptions[0]?.id));
      }
      await reloadCalendar();
    }

    setIsSaving(false);
  }

  function selectPlan(plan: PublicationPlanPayload) {
    setEditingPlanId(plan.id);
    setForm({
      channel: plan.channel,
      contentId: plan.contentId,
      notes: plan.notes ?? "",
      scheduledAt: toDateTimeLocalInput(plan.scheduledAt),
      status: plan.status,
    });
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function planDay(day: Date) {
    setEditingPlanId(null);
    setForm((current) => ({
      ...current,
      scheduledAt: toDateTimeLocalInput(atLocalHour(day, 9)),
    }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function resetForm() {
    setEditingPlanId(null);
    setForm(createEmptyForm(calendar?.contentOptions[0]?.id));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  const plannedCount = calendar?.plans.length ?? 0;
  const conflictCount =
    calendar?.plans.filter((plan) => plan.conflictCount > 0).length ?? 0;
  const editableContentCount = calendar?.contentOptions.length ?? 0;

  return (
    <div className="grid gap-6 text-[color:var(--ink)] xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className={cn(panelClassName, "min-w-0 overflow-hidden")}>
        <header className="flex flex-col gap-5 border-b border-[color:var(--border-strong)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
              Calendrier editorial
            </p>
            <div className="mt-2 flex min-w-0 flex-wrap items-end gap-3">
              <h2 className="truncate text-2xl font-bold leading-tight text-[color:var(--ink)] sm:text-3xl">
                {formatMonthLabel(monthCursor)}
              </h2>
              <Badge className="border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--text-muted)]">
                {calendar ? `${plannedCount} publication(s)` : "Chargement"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="size-10 rounded-full border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
              size="icon"
              type="button"
              variant="outline"
              onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
              aria-label="Mois precedent"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              className="h-10 rounded-[14px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
              type="button"
              variant="outline"
              onClick={() => setMonthCursor(startOfMonth(new Date()))}
            >
              Aujourd'hui
            </Button>
            <Button
              className="size-10 rounded-full border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
              size="icon"
              type="button"
              variant="outline"
              onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
              aria-label="Mois suivant"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-4 border-b border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/35 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between lg:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
            <label className="grid gap-2 text-sm">
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                Canal
              </span>
              <select
                className={selectClassName}
                value={filters.channel}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    channel: event.target.value as PublicationChannel | "",
                  }))
                }
              >
                <option value="">Tous</option>
                {PUBLICATION_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABELS[channel]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                Statut
              </span>
              <select
                className={selectClassName}
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as PublicationStatus | "",
                  }))
                }
              >
                <option value="">Tous</option>
                {PUBLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PLAN_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PUBLICATION_STATUSES.map((status) => (
              <span
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold uppercase",
                  getStatusPillClassName(status),
                )}
                key={status}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    getStatusDotClassName(status),
                  )}
                />
                {PLAN_STATUS_LABELS[status]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-[360px]">
              <div className="rounded-[16px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3">
                <span className="block text-xs text-[color:var(--text-subtle)]">
                  Plans
                </span>
                <strong className="text-lg text-[color:var(--rubric)]">
                  {plannedCount}
                </strong>
              </div>
              <div className="rounded-[16px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3">
                <span className="block text-xs text-[color:var(--text-subtle)]">
                  Conflits
                </span>
                <strong className="text-lg text-[color:var(--danger)]">
                  {conflictCount}
                </strong>
              </div>
              <div className="rounded-[16px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3">
                <span className="block text-xs text-[color:var(--text-subtle)]">
                  Disponibles
                </span>
                <strong className="text-lg text-[color:var(--klein)]">
                  {editableContentCount}
                </strong>
              </div>
            </div>

            <div
              className="inline-flex w-fit rounded-full border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-1"
              role="tablist"
            >
              <Button
                className={cn(
                  "h-9 rounded-full px-4",
                  viewMode === "month"
                    ? "bg-[color:var(--rubric)] text-[color:var(--paper)] shadow-[0_0_24px_rgba(195,244,0,0.22)] hover:bg-[color:var(--rubric)]"
                    : "bg-transparent text-[color:var(--text-muted)] hover:bg-[color:var(--paper-2)] hover:text-[color:var(--ink)]",
                )}
                type="button"
                variant="ghost"
                onClick={() => setViewMode("month")}
              >
                Mois
              </Button>
              <Button
                className={cn(
                  "h-9 rounded-full px-4",
                  viewMode === "list"
                    ? "bg-[color:var(--rubric)] text-[color:var(--paper)] shadow-[0_0_24px_rgba(195,244,0,0.22)] hover:bg-[color:var(--rubric)]"
                    : "bg-transparent text-[color:var(--text-muted)] hover:bg-[color:var(--paper-2)] hover:text-[color:var(--ink)]",
                )}
                type="button"
                variant="ghost"
                onClick={() => setViewMode("list")}
              >
                Liste
              </Button>
            </div>
          </header>

          {renderMainContent()}
        </div>
      </section>

      <aside className="grid gap-6 xl:content-start">
        <section className={cn(panelClassName, "p-4 sm:p-5")}>
          <header className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
                Planifier
              </p>
              <h2 className="mt-1 text-xl font-bold text-[color:var(--ink)]">
                {editingPlanId ? "Edition" : "Nouveau slot"}
              </h2>
            </div>
            <span className="flex size-10 items-center justify-center rounded-full bg-[color:var(--rubric)] text-[color:var(--paper)] shadow-[0_0_28px_rgba(195,244,0,0.28)]">
              <Plus className="size-5" />
            </span>
          </header>

          {calendar?.canEdit ? (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Contenu
                </span>
                <select
                  className={selectClassName}
                  value={form.contentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contentId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Choisir</option>
                  {(calendar?.contentOptions ?? []).map((content) => (
                    <option key={content.id} value={content.id}>
                      {content.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Date
                </span>
                <Input
                  className={inputClassName}
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scheduledAt: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                    Canal
                  </span>
                  <select
                    className={selectClassName}
                    value={form.channel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        channel: event.target.value as PublicationChannel,
                      }))
                    }
                  >
                    {PUBLICATION_CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>
                        {CHANNEL_LABELS[channel]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                    Statut
                  </span>
                  <select
                    className={selectClassName}
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as PublicationStatus,
                      }))
                    }
                  >
                    {PUBLICATION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {PLAN_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Notes
                </span>
                <Textarea
                  className={cn(inputClassName, "min-h-24 resize-y py-3")}
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>

              {errorMessage ? (
                <p
                  className="rounded-[14px] border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]"
                  role="alert"
                >
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p
                  className="rounded-[14px] border border-[color:var(--rubric)]/25 bg-[color:var(--rubric)]/10 px-3 py-2 text-sm text-[color:var(--rubric)]"
                  role="status"
                >
                  {successMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  className="h-11 rounded-[16px] bg-[color:var(--rubric)] px-5 font-bold text-[color:var(--paper)] shadow-[0_0_32px_rgba(195,244,0,0.28)] hover:bg-[color:var(--rubric)]"
                  type="submit"
                  disabled={isSaving || !calendar.contentOptions.length}
                >
                  <CalendarDays className="size-4" />
                  {editingPlanId ? "Mettre a jour" : "Planifier"}
                </Button>
                <Button
                  className="h-11 rounded-[16px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  <RotateCcw className="size-4" />
                  Annuler
                </Button>
              </div>

              {!calendar.contentOptions.length ? (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  Aucun contenu planifiable. Creez un contenu depuis la
                  bibliotheque.
                </p>
              ) : null}
            </form>
          ) : (
            <div className="rounded-[20px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
              <EmptyState
                title="Lecture seule"
                description="Votre role permet de consulter le calendrier sans modifier les planifications."
              />
            </div>
          )}
        </section>

        <section className={cn(panelClassName, "p-4 sm:p-5")}>
          <header className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
                Backlog
              </p>
              <h2 className="mt-1 text-xl font-bold text-[color:var(--ink)]">
                Contenus non planifies
              </h2>
            </div>
            <Library className="size-5 text-[color:var(--rubric)]" />
          </header>

          {calendar && calendar.contentOptions.length > 0 ? (
            <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
              {calendar.contentOptions.map((content) => (
                <button
                  className={cn(
                    "group grid gap-2 rounded-[18px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3 text-left transition hover:border-[color:var(--klein)]/70 hover:bg-[color:var(--paper-2)]",
                    form.contentId === content.id &&
                      "border-[color:var(--rubric)]/60",
                  )}
                  key={content.id}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      contentId: content.id,
                    }))
                  }
                >
                  <strong className="line-clamp-2 text-sm leading-5 text-[color:var(--ink)]">
                    {content.title}
                  </strong>
                  <span className="text-xs font-medium text-[color:var(--text-muted)]">
                    Pret a planifier
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-[18px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4 text-sm leading-6 text-[color:var(--text-muted)]">
              Aucun contenu disponible pour la planification.
            </p>
          )}
        </section>
      </aside>
    </div>
  );

  function renderMainContent() {
    if (isLoading) {
      return (
        <LoadingState
          title="Chargement du calendrier"
          description="Lecture des planifications de la période demandée."
        />
      );
    }

    if (errorMessage && !calendar) {
      return (
        <EmptyState
          title="Calendrier indisponible"
          description={errorMessage}
        />
      );
    }

    if (!calendar) {
      return null;
    }

    if (viewMode === "list") {
      return renderList(calendar.plans, calendar.canEdit);
    }

    return (
      <div className="overflow-x-auto rounded-[20px] border border-[color:var(--border-strong)] bg-[color:var(--paper-card)]">
        <div className="grid min-w-[860px] grid-cols-7">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              className="border-b border-r border-[color:var(--border-strong)] bg-[color:var(--paper-card)] px-3 py-3 text-xs font-bold uppercase text-[color:var(--text-subtle)] last:border-r-0"
              key={day}
            >
              {day}
            </div>
          ))}
          {monthDays.map((day) => {
            const key = toLocalDateKey(day);
            const dayPlans = plansByDay.get(key) ?? [];

            return (
              <article
                className={cn(
                  "min-h-[148px] border-b border-r border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-3 transition last:border-r-0 hover:bg-[color:var(--paper-2)]",
                  day.getMonth() !== monthCursor.getMonth() &&
                    "bg-[color:var(--paper-card)] text-[color:var(--text-subtle)]",
                )}
                data-outside-month={day.getMonth() !== monthCursor.getMonth()}
                key={key}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--paper-2)] text-sm font-bold text-[color:var(--ink)]">
                    {day.getDate()}
                  </span>
                  {calendar.canEdit ? (
                    <Button
                      className="size-8 rounded-full bg-transparent text-[color:var(--klein)] hover:bg-[color:var(--paper-2)] hover:text-[color:var(--rubric)]"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => planDay(day)}
                      aria-label={`Planifier le ${day.getDate()}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  ) : null}
                </header>

                <div className="grid gap-2">
                  {dayPlans.map((plan) => (
                    <button
                      className={cn(
                        "grid gap-1 rounded-[14px] border p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-px",
                        getStatusCardClassName(plan.status),
                      )}
                      data-status={plan.status}
                      draggable={calendar.canEdit}
                      key={plan.id}
                      type="button"
                      onClick={() => selectPlan(plan)}
                    >
                      <span className="flex items-center gap-1 text-[11px] font-bold uppercase">
                        <Clock3 className="size-3" />
                        {formatPlanTime(plan.scheduledAt)}
                      </span>
                      <strong className="line-clamp-2 text-xs leading-4 text-[color:var(--ink)]">
                        {plan.content.title}
                      </strong>
                      <span className="flex items-center justify-between gap-2 text-[11px] text-[color:var(--text-muted)]">
                        <span className="truncate">
                          {CHANNEL_LABELS[plan.channel]}
                        </span>
                        {plan.conflictCount > 0 ? (
                          <em className="not-italic text-[color:var(--danger)]">
                            Conflit
                          </em>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  function renderList(plans: PublicationPlanPayload[], canEdit: boolean) {
    if (plans.length === 0) {
      return (
        <EmptyState
          title="Aucune planification"
          description="Cette periode ne contient pas encore de publication planifiee."
          action={
            <Link
              className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-sm font-medium text-[color:var(--ink)] transition hover:bg-[color:var(--paper-2)]"
              href={`/app/${organizationSlug}/library`}
            >
              Ouvrir la bibliotheque
            </Link>
          }
        />
      );
    }

    return (
      <div className="grid gap-3">
        {plans.map((plan) => (
          <article
            className="grid gap-4 rounded-[20px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
            key={plan.id}
          >
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className={getStatusPillClassName(plan.status)}>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      getStatusDotClassName(plan.status),
                    )}
                  />
                  {PLAN_STATUS_LABELS[plan.status]}
                </Badge>
                <Badge className="border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--text-muted)]">
                  {formatPlanDateTime(plan.scheduledAt)}
                </Badge>
                <Badge className="border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--text-muted)]">
                  {CHANNEL_LABELS[plan.channel]}
                </Badge>
                <Badge className="border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--text-muted)]">
                  {CONTENT_FORMAT_LABELS[plan.content.format]}
                </Badge>
                <Badge className="border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--text-muted)]">
                  {CONTENT_STATUS_LABELS[plan.content.status]}
                </Badge>
              </div>
              <h3 className="truncate text-lg font-bold text-[color:var(--ink)]">
                {plan.content.title}
              </h3>
              {plan.notes ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  {plan.notes}
                </p>
              ) : null}
              {plan.conflictCount > 0 ? (
                <small className="mt-2 block text-sm font-medium text-[color:var(--danger)]">
                  {plan.conflictCount} autre publication est prevue le meme jour
                  sur ce canal.
                </small>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button
                className="h-10 rounded-[14px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] px-4 text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
                type="button"
                variant="outline"
                onClick={() => selectPlan(plan)}
              >
                <Edit3 className="size-4" />
                Modifier
              </Button>
              {canEdit ? (
                <Button
                  className="h-10 rounded-[14px] px-4 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                  type="button"
                  variant="ghost"
                  onClick={() => void handleDelete(plan.id)}
                  disabled={isSaving}
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    );
  }
}

function getStatusPillClassName(status: PublicationStatus): string {
  if (status === "PUBLISHED") {
    return "border-[color:var(--rubric)]/25 bg-[color:var(--rubric)]/15 text-[color:var(--rubric)]";
  }

  if (status === "CANCELLED") {
    return "border-[color:var(--danger)]/25 bg-[color:var(--danger)]/15 text-[color:var(--danger)]";
  }

  return "border-[color:var(--klein)]/30 bg-[color:var(--klein)]/15 text-[color:var(--klein)]";
}

function getStatusDotClassName(status: PublicationStatus): string {
  if (status === "PUBLISHED") {
    return "bg-[color:var(--rubric)]";
  }

  if (status === "CANCELLED") {
    return "bg-[color:var(--danger)]";
  }

  return "bg-[color:var(--klein)]";
}

function getStatusCardClassName(status: PublicationStatus): string {
  if (status === "PUBLISHED") {
    return "border-[color:var(--rubric)]/25 bg-[color:var(--rubric)]/10 text-[color:var(--rubric)] hover:border-[color:var(--rubric)]/50";
  }

  if (status === "CANCELLED") {
    return "border-[color:var(--danger)]/25 bg-[color:var(--danger)]/10 text-[color:var(--danger)] hover:border-[color:var(--danger)]/50";
  }

  return "border-[color:var(--klein)]/25 bg-[color:var(--klein)]/10 text-[color:var(--klein)] hover:border-[color:var(--klein)]/50";
}

function createEmptyForm(contentId = ""): PlanFormState {
  return {
    channel: "LINKEDIN",
    contentId,
    notes: "",
    scheduledAt: toDateTimeLocalInput(atLocalHour(new Date(), 9)),
    status: "PLANNED",
  };
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getMonthRange(value: Date): { from: string; to: string } {
  const from = new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function getCalendarDays(month: Date): Date[] {
  const start = startOfMonth(month);
  const startOffset = (start.getDay() + 6) % 7;
  const gridStart = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    return new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
  });
}

function atLocalHour(value: Date, hour: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    hour,
    0,
    0,
    0,
  );
}

function toDateTimeLocalInput(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toLocalDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatPlanTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPlanDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
