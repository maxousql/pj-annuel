"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrganizationRole } from "@content-ai/shared";

import { AccessDenied } from "@/components/shell/access-denied";
import { LoadingState } from "@/components/shell/loading-state";
import { fetchActiveOrganization } from "@/lib/organizations/client";

type OrganizationSettingsPanelProps = {
  organizationSlug: string;
};

type OrganizationSettingsState =
  | {
      status: "loading";
      organizationName?: never;
      role?: never;
      message?: never;
    }
  | { status: "ready"; organizationName: string; role: OrganizationRole }
  | { status: "denied"; organizationName?: never; message: string }
  | { status: "error"; organizationName?: never; message: string };

export function OrganizationSettingsPanel({
  organizationSlug,
}: OrganizationSettingsPanelProps) {
  const [state, setState] = useState<OrganizationSettingsState>({
    status: "loading",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadOrganization() {
      try {
        const result = await fetchActiveOrganization(organizationSlug);

        if (!isMounted) {
          return;
        }

        if (result.error) {
          setState({
            message: result.error.message,
            status: result.error.code === "FORBIDDEN" ? "denied" : "error",
          });
          return;
        }

        setState({
          organizationName: result.data.organization.name,
          role: result.data.membership.role,
          status: "ready",
        });
      } catch {
        if (isMounted) {
          setState({
            message: "Paramètres d'organisation indisponibles.",
            status: "error",
          });
        }
      }
    }

    void loadOrganization();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  if (state.status === "loading") {
    return (
      <LoadingState
        title="Chargement des paramètres"
        description="Les droits sur cette organisation sont en cours de vérification."
      />
    );
  }

  if (state.status === "denied") {
    return <AccessDenied description={state.message} />;
  }

  if (state.status === "error") {
    return <p className="form-error">{state.message}</p>;
  }

  return (
    <section className="settings-grid" aria-label="Paramètres organisation">
      <article className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Contexte editorial</p>
            <h2>IA et positionnement</h2>
          </div>
        </header>
        <p className="muted">
          Secteur, audience, ton, thématiques et contraintes utilisées par les
          générations.
        </p>
        <div className="form-footer">
          <Link
            className="button"
            href={`/app/${organizationSlug}/settings/editorial-context`}
          >
            Ouvrir le contexte
          </Link>
        </div>
      </article>
      <article className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Profil IA V2</p>
            <h2>Voix de marque</h2>
          </div>
        </header>
        <p className="muted">
          Langue, longueur, créativité, exemples et termes interdits utilisés
          par les prompts versionnés.
        </p>
        {state.role === "ADMIN" ? (
          <div className="form-footer">
            <Link
              className="button-secondary"
              href={`/app/${organizationSlug}/settings/ai`}
            >
              Configurer l'IA
            </Link>
          </div>
        ) : (
          <p className="muted">Reserve aux administrateurs.</p>
        )}
      </article>
      <article className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Identite</p>
            <h2>{state.organizationName}</h2>
          </div>
        </header>
        <p className="muted">
          La modification du nom, du slug et des paramètres avancés sera ajoutée
          avec les prochains modules d'administration.
        </p>
        {state.role !== "ADMIN" ? (
          <p className="muted">Reserve aux administrateurs.</p>
        ) : null}
      </article>
      <article className="settings-panel">
        <header>
          <div>
            <p className="eyebrow">Accès</p>
            <h2>Membres et rôles</h2>
          </div>
        </header>
        <p className="muted">
          Les administrateurs peuvent consulter les membres depuis la section
          dediee.
        </p>
        {state.role === "ADMIN" ? (
          <div className="form-footer">
            <Link
              className="button-secondary"
              href={`/app/${organizationSlug}/settings/members`}
            >
              Voir les membres
            </Link>
          </div>
        ) : (
          <p className="muted">Reserve aux administrateurs.</p>
        )}
      </article>
    </section>
  );
}
