"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, ArrowRight } from "lucide-react";
import { OrganizationsOverview } from "@/components/organizations/organizations-overview";
import { LoadingState } from "@/components/shell/loading-state";
import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";
import { AppPageHeader } from "@/components/shell/app-page-header";
import type { OrganizationsListPayload } from "@content-ai/shared";

export default function AppHomePage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/organizations`, {
          credentials: "include",
        });
        const result = await readApiResponse<OrganizationsListPayload>(response);
        if (!result.error) {
          setOrganizations(result.data.organizations);
        }
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    }
    void loadOrganizations();
  }, []);

  const isGuest = organizations.length === 0;

  if (isLoading) {
    return <LoadingState title="Chargement" />;
  }

  if (isGuest) {
    return (
      <>
        <section className="app-title">
          <Users className="size-10 text-rubric mb-4" />
          <p className="eyebrow">Mode invité</p>
          <h1>Bienvenue !</h1>
          <p>
            Vous êtes actuellement en tant qu'utilisateur invité. Rejoignez une
            organisation pour accéder aux fonctionnalités complètes.
          </p>
        </section>
        <div className="form-footer">
          <Link className="button" href="/app/organizations/new">
            Créer une organisation
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppPageHeader
        actions={
          <Link className="button" href="/app/organizations/new">
            Nouvelle organisation
          </Link>
        }
        description="Accédez aux espaces de travail rattachés à votre compte et suivez les priorités de chaque équipe."
        eyebrow="Espace protégé"
        title="Choisir une organisation active."
      />
      <OrganizationsOverview />
    </>
  );
}
