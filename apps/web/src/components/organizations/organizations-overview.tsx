"use client";

import type { OrganizationSummary } from "@content-ai/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
import { fetchOrganizations } from "@/lib/organizations/client";

type OrganizationsState =
  | { status: "loading"; organizations?: never; message?: never }
  | { status: "ready"; organizations: OrganizationSummary[]; message?: never }
  | { status: "error"; organizations?: never; message: string };

export function OrganizationsOverview() {
  const [state, setState] = useState<OrganizationsState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      try {
        const result = await fetchOrganizations();

        if (!isMounted) {
          return;
        }

        if (result.error) {
          setState({ message: result.error.message, status: "error" });
          return;
        }

        setState({
          organizations: result.data.organizations,
          status: "ready",
        });
      } catch {
        if (isMounted) {
          setState({
            message: "Organisations indisponibles.",
            status: "error",
          });
        }
      }
    }

    void loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <LoadingState
        title="Chargement des organisations"
        description="Vos espaces accessibles sont en cours de récupération."
      />
    );
  }

  if (state.status === "error") {
    return <p className="form-error">{state.message}</p>;
  }

  if (state.organizations.length === 0) {
    return (
      <EmptyState
        title="Aucune organisation"
        description="Creez un premier espace de travail pour rattacher les idees, contenus et parametres editoriaux."
        action={
          <Link className="button" href="/app/organizations/new">
            Creer une organisation
          </Link>
        }
      />
    );
  }

  return (
    <section className="organization-list" aria-label="Organisations">
      {state.organizations.map((organization) => (
        <article className="dashboard-panel" key={organization.id}>
          <header>
            <div>
              <p className="eyebrow">{organization.role}</p>
              <h2>{organization.name}</h2>
            </div>
            <Link
              className="button"
              href={`/app/${organization.slug}/dashboard`}
            >
              Ouvrir
            </Link>
          </header>
          <div className="nav-links organization-actions">
            <Link
              className="button-secondary"
              href={`/app/${organization.slug}/settings/members`}
            >
              Membres
            </Link>
            <Link
              className="button-ghost"
              href={`/app/${organization.slug}/dashboard`}
            >
              Dashboard
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
