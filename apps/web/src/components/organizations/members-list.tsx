"use client";

import type {
  InvitationSummaryPayload,
  MembershipSummary,
  OrganizationRole,
} from "@content-ai/shared";
import { Loader2, MailPlus, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { AccessDenied } from "@/components/shell/access-denied";
import { LoadingState } from "@/components/shell/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createInvitation,
  fetchTeam,
  removeMember,
  resendInvitation,
  revokeInvitation,
  updateMemberRole,
} from "@/lib/invitations/client";

type MembersListProps = { organizationSlug: string };
type State =
  | { status: "loading" }
  | {
      status: "ready";
      invitations: InvitationSummaryPayload[];
      members: MembershipSummary[];
    }
  | { status: "denied"; message: string }
  | { status: "error"; message: string };

export function MembersList({ organizationSlug }: MembersListProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("EDITOR");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const result = await fetchTeam(organizationSlug);

    if (result.error) {
      setState({
        message: result.error.message,
        status: result.error.code === "FORBIDDEN" ? "denied" : "error",
      });
      return;
    }

    setState({
      invitations: result.data.invitations,
      members: result.data.members,
      status: "ready",
    });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationSlug]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("invite");
    const result = await createInvitation(organizationSlug, {
      email: email.trim(),
      role,
    });
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setEmail("");
    await load();
    toast.success("Invitation créée et transmise au service email.");
  }

  async function handleRole(
    member: MembershipSummary,
    nextRole: OrganizationRole,
  ) {
    setBusy(`member:${member.id}`);
    const result = await updateMemberRole(
      organizationSlug,
      member.id,
      nextRole,
    );
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await load();
    toast.success("Rôle mis à jour.");
  }

  async function handleRemove(member: MembershipSummary) {
    if (!window.confirm(`Retirer ${member.name} de l'organisation ?`)) {
      return;
    }

    setBusy(`member:${member.id}`);
    const result = await removeMember(organizationSlug, member.id);
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await load();
    toast.success("Membre retire.");
  }

  async function handleResend(invitation: InvitationSummaryPayload) {
    setBusy(`invitation:${invitation.id}`);
    const result = await resendInvitation(organizationSlug, invitation.id);
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await load();
    toast.success("Invitation relancée.");
  }

  async function handleRevoke(invitation: InvitationSummaryPayload) {
    setBusy(`invitation:${invitation.id}`);
    const result = await revokeInvitation(organizationSlug, invitation.id);
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await load();
    toast.success("Invitation révoquée.");
  }

  if (state.status === "loading") {
    return (
      <LoadingState
        title="Chargement des membres"
        description="Les accès sont en cours de récupération."
      />
    );
  }

  if (state.status === "denied") {
    return <AccessDenied description={state.message} />;
  }

  if (state.status === "error") {
    return <p className="form-error">{state.message}</p>;
  }

  const pendingInvitations = state.invitations.filter(
    (invitation) =>
      invitation.status === "PENDING" || invitation.status === "EXPIRED",
  );

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
        onSubmit={handleInvite}
      >
        <label className="field">
          <span>Email du collaborateur</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Role initial</span>
          <select
            className="h-11.5 w-full rounded-[6px] border-[1.5px] border-(--border-strong) bg-(--surface-raised) px-3.5 text-base"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as OrganizationRole)
            }
          >
            <option value="ADMIN">Administrateur</option>
            <option value="EDITOR">Éditeur</option>
            <option value="READER">Lecteur</option>
          </select>
        </label>
        <Button className="self-end min-h-11.5" type="submit" disabled={busy !== null}>
          {busy === "invite" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MailPlus className="size-4" />
          )}
          Inviter
        </Button>
      </form>

      <div className="members-table" role="table" aria-label="Membres">
        <div className="members-row members-row-header" role="row">
          <span role="columnheader">Nom</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Role</span>
          <span role="columnheader">Action</span>
        </div>
        {state.members.map((member) => (
          <div className="members-row" role="row" key={member.id}>
            <span role="cell">{member.name}</span>
            <span role="cell">{member.email}</span>
            <span role="cell">
              <select
                className="h-9 w-fit min-w-28 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-2.5 text-sm font-medium transition-colors hover:bg-[color:var(--surface-accent)] focus:border-[color:var(--klein)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                value={member.role}
                disabled={busy === `member:${member.id}`}
                onChange={(event) =>
                  void handleRole(
                    member,
                    event.target.value as OrganizationRole,
                  )
                }
                aria-label={`Role de ${member.name}`}
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Éditeur</option>
                <option value="READER">Lecteur</option>
              </select>
            </span>
            <span role="cell">
              <Button
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy === `member:${member.id}`}
                onClick={() => void handleRemove(member)}
              >
                <UserMinus className="size-4" /> Retirer
              </Button>
            </span>
          </div>
        ))}
      </div>

      {pendingInvitations.length > 0 ? (
        <section className="grid gap-3">
          <div>
            <p className="eyebrow">Invitations</p>
            <h3>En attente</h3>
          </div>
          {pendingInvitations.map((invitation) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--paper-2)] p-3"
              key={invitation.id}
            >
              <div>
                <strong>{invitation.email}</strong>
                <p className="muted">
                  {invitation.role} · expire le{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{invitation.status}</Badge>
                {invitation.status !== "REVOKED" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleResend(invitation)}
                    disabled={busy !== null}
                  >
                    <RefreshCw className="size-4" /> Relancer
                  </Button>
                ) : null}
                {invitation.status === "PENDING" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRevoke(invitation)}
                    disabled={busy !== null}
                  >
                    <Trash2 className="size-4" /> Révoquer
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
