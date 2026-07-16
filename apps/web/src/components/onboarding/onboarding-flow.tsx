"use client";

import type {
  AdvancedOnboardingPayload,
  EditorialContextPayload,
  OnboardingStatePayload,
  OrganizationSummary,
} from "@content-ai/shared";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { LoadingState } from "@/components/shell/loading-state";
import { getApiBaseUrl } from "@/lib/auth/client";
import { createOrganization } from "@/lib/organizations/client";
import {
  applyOnboardingPreset,
  completeOnboarding,
  fetchOnboardingState,
  saveEditorialContext,
  skipAdvancedOnboarding,
} from "@/lib/onboarding/client";

type OnboardingViewState =
  | { status: "loading"; payload?: never; message?: never }
  | { status: "ready"; payload: OnboardingStatePayload; message?: never }
  | { status: "error"; payload?: never; message: string };

type SubmissionState = {
  message: string | null;
  status: "idle" | "submitting";
};

const initialSubmissionState: SubmissionState = {
  message: null,
  status: "idle",
};

export function OnboardingFlow() {
  const [state, setState] = useState<OnboardingViewState>({
    status: "loading",
  });
  const [submission, setSubmission] = useState<SubmissionState>(
    initialSubmissionState,
  );
  const [isEditingContext, setIsEditingContext] = useState(false);

  async function loadState(organizationSlug?: string) {
    try {
      const result = await fetchOnboardingState(organizationSlug);

      if (result.error) {
        setState({ message: result.error.message, status: "error" });
        return;
      }

      setState({ payload: result.data, status: "ready" });
    } catch {
      setState({
        message: "Onboarding indisponible.",
        status: "error",
      });
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  const payload = state.status === "ready" ? state.payload : null;
  const activeOrganization = payload?.activeOrganization ?? null;
  const canEditContext =
    activeOrganization?.role === "ADMIN" ||
    activeOrganization?.role === "EDITOR";
  const currentStepIndex = useMemo(() => {
    if (!payload) {
      return 0;
    }

    if (payload.nextStep === "CREATE_ORGANIZATION") {
      return 0;
    }

    if (payload.nextStep === "CONFIGURE_EDITORIAL_CONTEXT") {
      return 1;
    }

    return 2;
  }, [payload]);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmission({ message: null, status: "submitting" });

    const formData = new FormData(event.currentTarget);

    try {
      const result = await createOrganization({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
      });

      if (result.error) {
        setSubmission({ message: result.error.message, status: "idle" });
        return;
      }

      await loadState(result.data.organization.slug);
      setSubmission(initialSubmissionState);
    } catch {
      setSubmission({
        message: "Creation de l'organisation impossible.",
        status: "idle",
      });
    }
  }

  async function handleSelectOrganization(organizationSlug: string) {
    setSubmission(initialSubmissionState);
    await loadState(organizationSlug);
  }

  async function handleSkipToGuest() {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/onboarding/skip`, {
        credentials: "include",
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Skip onboarding failed:", error);
        setSubmission({
          message: error.message ?? "Impossible de continuer.",
          status: "idle",
        });
        return;
      }

      window.location.assign("/app");
    } catch (error) {
      console.error("Skip onboarding error:", error);
      setSubmission({
        message: "Erreur lors de la requete.",
        status: "idle",
      });
    }
  }

  async function handleSaveContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOrganization) {
      return;
    }

    setSubmission({ message: null, status: "submitting" });

    const formData = new FormData(event.currentTarget);

    try {
      const result = await saveEditorialContext(activeOrganization.slug, {
        positioning: String(formData.get("positioning") ?? ""),
        resourceNotes: String(formData.get("resourceNotes") ?? ""),
        sector: String(formData.get("sector") ?? ""),
        targetAudience: String(formData.get("targetAudience") ?? ""),
        themes: splitThemes(String(formData.get("themes") ?? "")),
        tone: String(formData.get("tone") ?? ""),
      });

      if (result.error) {
        setSubmission({ message: result.error.message, status: "idle" });
        return;
      }

      setState({ payload: result.data, status: "ready" });
      setIsEditingContext(false);
      setSubmission(initialSubmissionState);
    } catch {
      setSubmission({
        message: "Enregistrement du contexte impossible.",
        status: "idle",
      });
    }
  }

  async function handleCompleteOnboarding() {
    if (!activeOrganization) {
      return;
    }

    setSubmission({ message: null, status: "submitting" });

    try {
      const result = await completeOnboarding(activeOrganization.slug);

      if (result.error) {
        setSubmission({ message: result.error.message, status: "idle" });
        return;
      }

      const organizationSlug =
        result.data.activeOrganization?.slug ?? activeOrganization.slug;
      window.location.assign(`/app/${organizationSlug}/dashboard`);
    } catch {
      setSubmission({
        message: "Finalisation impossible.",
        status: "idle",
      });
    }
  }

  async function handleApplyPreset(presetId: string) {
    if (!activeOrganization) {
      return;
    }

    const confirmOverwrite = payload?.editorialContext
      ? window.confirm(
          "Ce preset remplacera le contexte éditorial actuel. Continuer ?",
        )
      : false;

    if (payload?.editorialContext && !confirmOverwrite) return;

    setSubmission({ message: null, status: "submitting" });
    const result = await applyOnboardingPreset(
      activeOrganization.slug,
      presetId,
      confirmOverwrite,
    );

    if (result.error) {
      setSubmission({ message: result.error.message, status: "idle" });
      return;
    }

    setState({ payload: result.data, status: "ready" });
    setSubmission(initialSubmissionState);
  }

  async function handleSkipAdvanced() {
    if (!activeOrganization) {
      return;
    }

    setSubmission({ message: null, status: "submitting" });
    const result = await skipAdvancedOnboarding(activeOrganization.slug);

    if (result.error) {
      setSubmission({ message: result.error.message, status: "idle" });
      return;
    }

    setState({ payload: result.data, status: "ready" });
    setSubmission(initialSubmissionState);
  }

  if (state.status === "loading") {
    return (
      <LoadingState
        title="Préparation de l'onboarding"
        description="Votre espace et vos informations éditoriales sont en cours de vérification."
      />
    );
  }

  if (state.status === "error") {
    return <p className="form-error">{state.message}</p>;
  }

  return (
    <section className="onboarding-layout" aria-labelledby="onboarding-title">
      <aside className="onboarding-steps" aria-label="Progression onboarding">
        {["Organisation", "Contexte éditorial", "Premier dashboard"].map(
          (step, index) => (
            <div
              className="onboarding-step"
              data-status={index < currentStepIndex ? "done" : "todo"}
              aria-current={index === currentStepIndex ? "step" : undefined}
              key={step}
            >
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ),
        )}
      </aside>

      <div className="onboarding-panel">
        <AppPageHeader
          description="Trois réglages suffisent pour adapter les générations à votre marché, votre audience et vos sujets prioritaires."
          eyebrow="Prise en main"
          title="Configurer votre espace contenu."
          titleId="onboarding-title"
        />

        {renderCurrentStep()}
      </div>
    </section>
  );

  function renderCurrentStep() {
    if (!payload) {
      return null;
    }

    if (!activeOrganization) {
      return (
        <OrganizationStep
          organizations={payload.organizations}
          isSubmitting={submission.status === "submitting"}
          message={submission.message}
          onCreate={handleCreateOrganization}
          onSelect={handleSelectOrganization}
          onSkipToGuest={handleSkipToGuest}
        />
      );
    }

    if (
      canEditContext &&
      (payload.nextStep === "CONFIGURE_EDITORIAL_CONTEXT" || isEditingContext)
    ) {
      return (
        <EditorialContextStep
          context={payload.editorialContext}
          isSubmitting={submission.status === "submitting"}
          message={submission.message}
          organization={activeOrganization}
          onSubmit={handleSaveContext}
        />
      );
    }

    return (
      <CompletionStep
        context={payload.editorialContext}
        advanced={payload.advanced}
        canEditContext={canEditContext}
        isSubmitting={submission.status === "submitting"}
        message={submission.message}
        organization={activeOrganization}
        onApplyPreset={handleApplyPreset}
        onComplete={handleCompleteOnboarding}
        onEdit={() => setIsEditingContext(true)}
        onSkipAdvanced={handleSkipAdvanced}
      />
    );
  }
}

type OrganizationStepProps = {
  organizations: OrganizationSummary[];
  isSubmitting: boolean;
  message: string | null;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onSelect: (organizationSlug: string) => void;
  onSkipToGuest?: () => void;
};

function OrganizationStep({
  organizations,
  isSubmitting,
  message,
  onCreate,
  onSelect,
  onSkipToGuest,
}: OrganizationStepProps) {
  return (
    <div className="onboarding-section">
      <div>
        <h2>Choisir l'organisation de depart</h2>
        <p className="muted">
          Creez un espace pour rattacher vos idees, contenus, sources et
          paramètres d'équipe.
        </p>
      </div>

      {organizations.length > 0 ? (
        <div className="choice-list" aria-label="Organisations disponibles">
          {organizations.map((organization) => (
            <button
              className="organization-choice"
              type="button"
              key={organization.id}
              onClick={() => onSelect(organization.slug)}
            >
              <span>
                <strong>{organization.name}</strong>
                <small>{organization.role}</small>
              </span>
              <span aria-hidden="true">Choisir</span>
            </button>
          ))}
        </div>
      ) : null}

      <form className="settings-form onboarding-form" onSubmit={onCreate}>
        <div>
          <h3 className="text-sm font-semibold mb-3">Créer une nouvelle organisation</h3>
        </div>
        <div className="onboarding-form-grid">
          <label className="field">
            <span>Nom de l'organisation</span>
            <input
              name="name"
              type="text"
              autoComplete="organization"
              required
            />
          </label>
          <label className="field">
            <span>Slug public</span>
            <input
              name="slug"
              type="text"
              inputMode="url"
              placeholder="mon-organisation"
            />
          </label>
        </div>
        {message ? (
          <p className="form-error" role="alert">
            {message}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Création..." : "Créer et continuer"}
        </button>
      </form>

      <div className="border-t border-[color:var(--border)] pt-6 mt-6">
        <div className="mb-3">
          <h3 className="text-sm font-semibold mb-1">Vous êtes invité ?</h3>
          <p className="text-xs text-[color:var(--text-muted)]">
            Si vous attendez une invitation, vous pouvez accéder au tableau de bord provisoirement.
          </p>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={onSkipToGuest}
          disabled={isSubmitting}
        >
          Continuer en tant qu'utilisateur invité
        </button>
      </div>
    </div>
  );
}

type EditorialContextStepProps = {
  context: EditorialContextPayload | null;
  isSubmitting: boolean;
  message: string | null;
  organization: OrganizationSummary;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function EditorialContextStep({
  context,
  isSubmitting,
  message,
  organization,
  onSubmit,
}: EditorialContextStepProps) {
  return (
    <form className="settings-form onboarding-form" onSubmit={onSubmit}>
      <div>
        <h2>Contexte éditorial de {organization.name}</h2>
        <p className="muted">
          Ces informations alimentent les prompts IA et les prochaines vues
          metier.
        </p>
      </div>
      <div className="onboarding-form-grid">
        <label className="field">
          <span>Secteur</span>
          <input
            name="sector"
            type="text"
            defaultValue={context?.sector}
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
            placeholder="Fondateurs, CMO, responsables RH..."
            required
          />
        </label>
      </div>
      <div className="onboarding-form-grid">
        <label className="field">
          <span>Ton</span>
          <input
            name="tone"
            type="text"
            defaultValue={context?.tone}
            placeholder="Expert, direct, pedagogique..."
            required
          />
        </label>
        <label className="field">
          <span>Thematiques principales</span>
          <input
            name="themes"
            type="text"
            defaultValue={context?.themes.join(", ")}
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
          placeholder="Optionnel, vous pourrez compléter ce champ plus tard"
        />
      </label>
      <label className="field">
        <span>Notes utiles</span>
        <textarea
          name="resourceNotes"
          defaultValue={context?.resourceNotes ?? ""}
          placeholder="Sources, concurrents, angles interdits, contraintes de marque..."
          rows={4}
        />
      </label>
      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer le contexte"}
      </button>
    </form>
  );
}

type CompletionStepProps = {
  advanced: AdvancedOnboardingPayload | null;
  canEditContext: boolean;
  context: EditorialContextPayload | null;
  isSubmitting: boolean;
  message: string | null;
  organization: OrganizationSummary;
  onApplyPreset: (presetId: string) => void;
  onComplete: () => void;
  onEdit: () => void;
  onSkipAdvanced: () => void;
};

function CompletionStep({
  advanced,
  canEditContext,
  context,
  isSubmitting,
  message,
  organization,
  onApplyPreset,
  onComplete,
  onEdit,
  onSkipAdvanced,
}: CompletionStepProps) {
  const completedSteps = new Set(advanced?.completedSteps ?? []);

  return (
    <div className="onboarding-section">
      <div>
        <h2>
          {context
            ? `${organization.name} est prêt à être utilisé.`
            : `Checklist de ${organization.name}.`}
        </h2>
        <p className="muted">
          {context
            ? "Le dashboard devient accessible et la generation d'idees pourra utiliser ce contexte."
            : "Vous pouvez consulter l'espace pendant qu'un editeur finalise le contexte éditorial."}
        </p>
      </div>

      {context ? (
        <dl className="summary-grid">
          <div>
            <dt>Secteur</dt>
            <dd>{context.sector}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{context.targetAudience}</dd>
          </div>
          <div>
            <dt>Ton</dt>
            <dd>{context.tone}</dd>
          </div>
          <div>
            <dt>Thematiques</dt>
            <dd>{context.themes.join(", ")}</dd>
          </div>
        </dl>
      ) : null}

      {advanced ? (
        <div className="onboarding-section">
          <div>
            <h2>Checklist de prise en main</h2>
            <p className="muted">
              Le parcours avance peut etre ignore, repris ou complete par
              petites etapes.
            </p>
          </div>

          {advanced.availableSteps.includes("PRESET") ? (
            <div className="choice-list" aria-label="Presets sectoriels">
              {advanced.presets.map((preset) => (
                <button
                  className="organization-choice"
                  disabled={isSubmitting}
                  type="button"
                  key={preset.id}
                  onClick={() => onApplyPreset(preset.id)}
                >
                  <span>
                    <strong>{preset.sector}</strong>
                    <small>{preset.tone}</small>
                  </span>
                  <span aria-hidden="true">Appliquer</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="choice-list" aria-label="Checklist avancee">
            {advanced.availableSteps.includes("CHECKLIST") ? (
              <AdvancedStepButton
                completed={completedSteps.has("CHECKLIST")}
                href={`/app/${organization.slug}/settings/editorial-context`}
                label="Verifier le contexte"
              />
            ) : null}
            {advanced.availableSteps.includes("FIRST_IDEA") ? (
              <AdvancedStepButton
                completed={completedSteps.has("FIRST_IDEA")}
                href={`/app/${organization.slug}/ideas/generate`}
                label="Generer une premiere idee"
              />
            ) : null}
            {advanced.availableSteps.includes("FIRST_CONTENT") ? (
              <AdvancedStepButton
                completed={completedSteps.has("FIRST_CONTENT")}
                href={`/app/${organization.slug}/contents/generate`}
                label="Generer un premier contenu"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      <div className="form-footer">
        {canEditContext && context ? (
          <button
            className="button"
            type="button"
            onClick={onComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Ouverture..." : "Terminer et ouvrir le dashboard"}
          </button>
        ) : (
          <Link className="button" href={`/app/${organization.slug}/dashboard`}>
            Ouvrir le dashboard
          </Link>
        )}
        {canEditContext ? (
          <button className="button-secondary" type="button" onClick={onEdit}>
            Modifier le contexte
          </button>
        ) : null}
        <button
          className="button-secondary"
          type="button"
          onClick={onSkipAdvanced}
          disabled={isSubmitting}
        >
          Ignorer le parcours avance
        </button>
      </div>
    </div>
  );
}

function AdvancedStepButton({
  completed,
  href,
  label,
}: {
  completed: boolean;
  href: string;
  label: string;
}) {
  if (completed) {
    return (
      <div className="organization-choice" data-status="done">
        <span>
          <strong>{label}</strong>
          <small>Termine</small>
        </span>
        <span aria-hidden="true">OK</span>
      </div>
    );
  }

  return (
    <Link className="organization-choice" href={href}>
      <span>
        <strong>{label}</strong>
        <small>A faire</small>
      </span>
      <span aria-hidden="true">Ouvrir</span>
    </Link>
  );
}

function splitThemes(value: string): string[] {
  return value
    .split(",")
    .map((theme) => theme.trim())
    .filter(Boolean);
}
