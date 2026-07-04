"use client";

import type { MembershipSummary } from "@content-ai/shared";
import { useEffect, useState } from "react";

import { AccessDenied } from "@/components/shell/access-denied";
import { EmptyState } from "@/components/shell/empty-state";
import { fetchMembers } from "@/lib/organizations/client";

type MembersListProps = {
  organizationSlug: string;
};

type MembersState =
  | { status: "loading"; members?: never; message?: never }
  | { status: "ready"; members: MembershipSummary[]; message?: never }
  | { status: "denied"; members?: never; message: string }
  | { status: "error"; members?: never; message: string };

export function MembersList({ organizationSlug }: MembersListProps) {
  const [state, setState] = useState<MembersState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      try {
        const result = await fetchMembers(organizationSlug);

        if (!isMounted) {
          return;
        }

        if (result.error) {
          if (result.error.code === "FORBIDDEN") {
            setState({ message: result.error.message, status: "denied" });
            return;
          }

          setState({ message: result.error.message, status: "error" });
          return;
        }

        setState({ members: result.data.members, status: "ready" });
      } catch {
        if (isMounted) {
          setState({ message: "Membres indisponibles.", status: "error" });
        }
      }
    }

    void loadMembers();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  if (state.status === "loading") {
    return (
      <EmptyState
        title="Chargement des membres"
        description="Les acces de l'organisation sont en cours de recuperation."
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
    <>
      {state.members.length === 0 ? (
        <EmptyState
          title="Aucun membre"
          description="Les invitations seront disponibles dans la spec collaboration."
        />
      ) : null}
      <div className="members-table" role="table" aria-label="Membres">
        <div className="members-row members-row-header" role="row">
          <span role="columnheader">Nom</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Role</span>
          <span role="columnheader">Statut</span>
        </div>
        {state.members.map((member) => (
          <div className="members-row" role="row" key={member.id}>
            <span role="cell">{member.name}</span>
            <span role="cell">{member.email}</span>
            <span role="cell">{member.role}</span>
            <span role="cell">{member.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}
