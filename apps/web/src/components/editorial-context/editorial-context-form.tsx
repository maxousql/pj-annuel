"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type {
  EditorialContextPayload,
  EditorialContextSummaryPayload,
  OrganizationRole,
} from "@content-ai/shared";

import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
import {
  fetchEditorialContext,
  fetchEditorialContextSummary,
  saveEditorialContext,
} from "@/lib/editorial-context/client";
import { fetchActiveOrganization } from "@/lib/organizations/client";

type EditorialContextFormProps = {
  organizationSlug: string;
};

export function EditorialContextForm({
  organizationSlug,
}: EditorialContextFormProps) {
  const [context, setContext] = useState<EditorialContextPayload | null>(null);
  const [summary, setSummary] = useState<EditorialContextSummaryPayload | null>(
    null,
  );
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = role === "ADMIN" || role === "EDITOR";

  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      setIsLoading(true);
      const [organizationResult, contextResult, summaryResult] =
        await Promise.all([
          fetchActiveOrganization(organizationSlug),
          fetchEditorialContext(organizationSlug),
          fetchEditorialContextSummary(organizationSlug),
        ]);

      if (!isMounted) {
        return;
      }

      if (organizationResult.error) {
        setMessage(organizationResult.error.message);
      } else {
        setRole(organizationResult.data.membership.role);
      }

      if (contextResult.error) {
        setMessage(contextResult.error.message);
      } else {
        setContext(contextResult.data.editorialContext);
      }

      if (!summaryResult.error) {
        setSummary(summaryResult.data.summary);
      }

      setIsLoading(false);
    }

    void loadContext();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!canEdit) {
      setMessage("Role insuffisant pour modifier le contexte éditorial.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    setIsSaving(true);
    const result = await saveEditorialContext(organizationSlug, {
      positioning: String(formData.get("positioning") ?? ""),
      resourceNotes: String(formData.get("resourceNotes") ?? ""),
      sector: String(formData.get("sector") ?? ""),
      targetAudience: String(formData.get("targetAudience") ?? ""),
      themes: splitThemes(String(formData.get("themes") ?? "")),
      tone: String(formData.get("tone") ?? ""),
    });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setContext(result.data.editorialContext);
    const summaryResult = await fetchEditorialContextSummary(organizationSlug);

    if (!summaryResult.error) {
      setSummary(summaryResult.data.summary);
    }

    setMessage("Contexte editorial mis à jour.");
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Chargement du contexte"
        description="Les informations éditoriales de l'organisation sont en cours de lecture."
      />
    );
  }

  return (
    <div className="editorial-context-layout">
      <section className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Configuration</p>
            <h2>Contexte principal</h2>
          </div>
          <Link
            className="button-secondary"
            href={`/app/${organizationSlug}/settings`}
          >
            Paramètres
          </Link>
        </header>

        {!canEdit ? (
          <p className="form-error">
            Lecture seule. Les administrateurs et éditeurs peuvent modifier ce
            contexte.
          </p>
        ) : null}

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="onboarding-form-grid">
            <label className="field">
              <span>Secteur</span>
              <input
                name="sector"
                type="text"
                defaultValue={context?.sector}
                disabled={!canEdit}
                placeholder="SaaS B2B, retail, formation..."
                required
              />
            </label>
            <label className="field">
              <span>Audience cible</span>
              <input
                name="targetAudience"
                type="text"
                defaultValue={context?.targetAudience}
                disabled={!canEdit}
                placeholder="Fondateurs, CMO, responsables RH..."
                required
              />
            </label>
          </div>

          <div className="onboarding-form-grid">
            <label className="field">
              <span>Ton</span>
              <input
                list="editorial-tone-options"
                name="tone"
                type="text"
                defaultValue={context?.tone}
                disabled={!canEdit}
                placeholder="Expert, direct, pedagogique..."
                required
              />
              <datalist id="editorial-tone-options">
                <option value="Expert et direct" />
                <option value="Pédagogique et accessible" />
                <option value="Inspire et engageant" />
                <option value="Sobre et analytique" />
              </datalist>
            </label>
            <label className="field">
              <span>Thematiques principales</span>
              <input
                name="themes"
                type="text"
                defaultValue={context?.themes.join(", ")}
                disabled={!canEdit}
                placeholder="IA, productivite, acquisition"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Positionnement</span>
            <input
              name="positioning"
              type="text"
              defaultValue={context?.positioning}
              disabled={!canEdit}
              placeholder="Votre promesse ou difference principale"
            />
          </label>

          <label className="field">
            <span>Ressources et contraintes</span>
            <textarea
              name="resourceNotes"
              defaultValue={context?.resourceNotes ?? ""}
              disabled={!canEdit}
              placeholder="Sources, concurrents, angles interdits, contraintes de marque..."
              rows={6}
            />
          </label>

          {message ? (
            <p
              className={
                message.includes("mis a jour") ? "form-success" : "form-error"
              }
              role="status"
            >
              {message}
            </p>
          ) : null}

          {canEdit ? (
            <div className="form-footer">
              <button className="button" type="submit" disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Resume IA</p>
            <h2>Version injectee</h2>
          </div>
        </header>
        <ContextSummary summary={summary} />
      </section>
    </div>
  );
}

function ContextSummary({
  summary,
}: {
  summary: EditorialContextSummaryPayload | null;
}) {
  if (!summary?.configured) {
    return (
      <EmptyState
        title="Contexte incomplet"
        description="Renseignez le secteur, l'audience, le ton et au moins une thematique."
      />
    );
  }

  return (
    <dl className="context-summary-list">
      {summary.sector ? (
        <div>
          <dt>Secteur</dt>
          <dd>{summary.sector}</dd>
        </div>
      ) : null}
      {summary.targetAudience ? (
        <div>
          <dt>Audience</dt>
          <dd>{summary.targetAudience}</dd>
        </div>
      ) : null}
      {summary.tone ? (
        <div>
          <dt>Ton</dt>
          <dd>{summary.tone}</dd>
        </div>
      ) : null}
      {summary.themes?.length ? (
        <div>
          <dt>Thematiques</dt>
          <dd>{summary.themes.join(", ")}</dd>
        </div>
      ) : null}
      {summary.positioning ? (
        <div>
          <dt>Positionnement</dt>
          <dd>{summary.positioning}</dd>
        </div>
      ) : null}
      {summary.resourceNotes ? (
        <div>
          <dt>Ressources</dt>
          <dd>{summary.resourceNotes}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function splitThemes(value: string): string[] {
  return value
    .split(",")
    .map((theme) => theme.trim())
    .filter(Boolean);
}
