"use client";

import type { AccountProfilePayload, AuthProvider } from "@content-ai/shared";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleSlash2,
  FileText,
  KeyRound,
  Lightbulb,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/shell/loading-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  changeAccountPassword,
  fetchAccountProfile,
  getApiBaseUrl,
  PROFILE_UPDATED_EVENT,
  readApiResponse,
  updateAccountProfile,
} from "@/lib/auth/client";
import { getOrganizationRoleLabel } from "@/lib/organizations/roles";

const PROVIDER_LABELS: Record<AuthProvider, string> = {
  CREDENTIALS: "Email et mot de passe",
  GOOGLE: "Google",
};

const fieldClassName =
  "h-11 rounded-lg border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper)] px-3 text-[15px] text-[color:var(--ink)] focus-visible:border-[color:var(--rubric)] focus-visible:ring-[color:var(--rubric)]/20";

const panelClassName =
  "rounded-[22px] border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-5 shadow-[0_12px_32px_rgba(23,19,15,0.06)] sm:p-6";

export function ProfileSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfilePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = await fetchAccountProfile();

    if (result.error) {
      setLoadError(result.error.message);
      setIsLoading(false);
      return;
    }

    setProfile(result.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setIsSavingProfile(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateAccountProfile({
      avatarUrl: String(formData.get("avatarUrl") ?? ""),
      name: String(formData.get("name") ?? ""),
    });

    if (result.error) {
      toast.error("Profil non modifié", {
        description: result.error.message,
      });
      setIsSavingProfile(false);
      return;
    }

    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      return {
        ...currentProfile,
        user: {
          ...result.data.user,
          createdAt: currentProfile.user.createdAt,
        },
      };
    });
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, { detail: result.data.user }),
    );
    toast.success("Profil mis à jour", {
      description: "Vos informations sont visibles dans la barre supérieure.",
    });
    setIsSavingProfile(false);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? "",
    );

    if (newPassword !== passwordConfirmation) {
      setPasswordMessage(
        "Les deux nouveaux mots de passe ne correspondent pas.",
      );
      return;
    }

    if (
      newPassword.length < 10 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setPasswordMessage(
        "Utilisez au moins 10 caractères, avec une lettre et un chiffre.",
      );
      return;
    }

    if (new TextEncoder().encode(newPassword).length > 72) {
      setPasswordMessage(
        "Ce mot de passe dépasse la limite de sécurité. Utilisez une phrase plus courte.",
      );
      return;
    }

    setIsChangingPassword(true);
    const result = await changeAccountPassword({
      currentPassword,
      newPassword,
    });

    if (result.error) {
      setPasswordMessage(result.error.message);
      setIsChangingPassword(false);
      return;
    }

    form.reset();
    toast.success("Mot de passe modifié", {
      description: "Votre nouveau mot de passe est actif dès maintenant.",
    });
    setIsChangingPassword(false);
  }

  async function handleLogout() {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
        credentials: "include",
        method: "POST",
      });
      const result = await readApiResponse<{ ok: boolean }>(response);

      if (result.error) {
        toast.error("Déconnexion impossible", {
          description: result.error.message,
        });
        return;
      }

      window.location.href = "/login";
    } catch {
      toast.error("Déconnexion impossible", {
        description: "Le service de compte est momentanément indisponible.",
      });
    }
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        credentials: "include",
        method: "DELETE",
      });
      const result = await readApiResponse<{ ok: boolean }>(response);

      if (result.error) {
        toast.error("Suppression impossible", {
          description: result.error.message,
        });
        return;
      }

      setIsDeleteDialogOpen(false);
      router.push("/login");
    } catch {
      toast.error("Suppression impossible", {
        description: "Le service de compte est momentanément indisponible.",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  }

  if (isLoading) {
    return <LoadingState title="Chargement de votre compte" />;
  }

  if (loadError || !profile) {
    return (
      <section className={`${panelClassName} grid justify-items-start gap-4`}>
        <div className="grid gap-1">
          <h2 className="font-heading text-xl font-extrabold text-[color:var(--ink)]">
            Compte indisponible
          </h2>
          <p className="text-[15px] text-[color:var(--text-muted)]">
            {loadError ??
              "Les informations du compte n'ont pas pu être chargées."}
          </p>
        </div>
        <Button className="h-10 px-4" onClick={() => void loadProfile()}>
          Réessayer
        </Button>
      </section>
    );
  }

  const { stats, user } = profile;
  const discoveryTotal =
    stats.discoveryFeedbacks.liked +
    stats.discoveryFeedbacks.disliked +
    stats.discoveryFeedbacks.skipped;

  return (
    <div className="grid gap-6" aria-label="Informations du compte">
      <section className="relative overflow-hidden rounded-[26px] border-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper-card)] p-6 shadow-[6px_6px_0_rgba(23,19,15,0.12)] sm:p-8">
        <div className="absolute -right-16 -top-20 size-52 rounded-full bg-[color:var(--rubric-soft)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <Avatar className="size-20 border-[1.5px] border-[color:var(--rubric)] bg-[color:var(--rubric-soft)] sm:size-24">
              {user.avatarUrl ? (
                <AvatarImage alt="" src={user.avatarUrl} />
              ) : null}
              <AvatarFallback className="bg-[color:var(--rubric-soft)] font-heading text-xl font-bold italic text-[color:var(--rubric)] sm:text-2xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--rubric)]">
                Compte Content AI
              </p>
              <h2 className="truncate font-heading text-2xl font-extrabold text-[color:var(--ink)] sm:text-3xl">
                {user.name}
              </h2>
              <p className="mt-1 flex items-center gap-2 truncate text-[14px] font-medium text-[color:var(--text-muted)]">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:max-w-[280px] sm:justify-end">
            {profile.providers.map((provider) => (
              <Badge className="h-7 px-3" key={provider} variant="outline">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                {PROVIDER_LABELS[provider]}
              </Badge>
            ))}
            <Badge className="h-7 px-3" variant="default">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Membre depuis {formatMonthYear(user.createdAt)}
            </Badge>
          </div>
        </div>
      </section>

      <section aria-labelledby="account-activity-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.17em] text-[color:var(--rubric)]">
              Votre activité
            </p>
            <h2
              className="mt-1 font-heading text-2xl font-extrabold text-[color:var(--ink)]"
              id="account-activity-title"
            >
              Votre empreinte éditoriale
            </h2>
          </div>
          <p className="text-[13px] font-medium text-[color:var(--text-muted)]">
            Toutes vos organisations actives
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AccountMetric
            icon={<Lightbulb aria-hidden="true" />}
            label="Idées générées"
            value={stats.contentIdeasGenerated}
          />
          <AccountMetric
            icon={<CheckCircle2 aria-hidden="true" />}
            label="Idées enregistrées"
            value={stats.contentIdeasSaved}
          />
          <AccountMetric
            icon={<FileText aria-hidden="true" />}
            label="Contenus créés"
            value={stats.contentItemsCreated}
          />
          <AccountMetric
            icon={<Sparkles aria-hidden="true" />}
            label="Générations IA réussies"
            value={stats.aiGenerations}
          />
        </div>
        <div className="mt-3 grid gap-3 rounded-[18px] border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
          <div>
            <p className="text-[15px] font-extrabold text-[color:var(--ink)]">
              Préférences de découverte
            </p>
            <p className="text-[13px] text-[color:var(--text-muted)]">
              {discoveryTotal} réaction{discoveryTotal !== 1 ? "s" : ""} pour
              affiner vos recommandations.
            </p>
          </div>
          <DiscoveryMetric
            icon={<ThumbsUp aria-hidden="true" />}
            label="Gardées"
            value={stats.discoveryFeedbacks.liked}
          />
          <DiscoveryMetric
            icon={<ThumbsDown aria-hidden="true" />}
            label="Refusées"
            value={stats.discoveryFeedbacks.disliked}
          />
          <DiscoveryMetric
            icon={<CircleSlash2 aria-hidden="true" />}
            label="Passées"
            value={stats.discoveryFeedbacks.skipped}
          />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className={panelClassName} aria-labelledby="identity-title">
          <PanelHeading
            description="Ces informations identifient votre compte dans Content AI."
            icon={<UserRound aria-hidden="true" />}
            title="Identité et photo"
            titleId="identity-title"
          />
          <form
            className="mt-6 grid gap-5"
            key={`${user.name}-${user.avatarUrl ?? "no-avatar"}`}
            onSubmit={handleProfileSubmit}
          >
            <AccountField label="Nom affiché" name="name">
              <Input
                autoComplete="name"
                className={fieldClassName}
                defaultValue={user.name}
                id="name"
                minLength={2}
                name="name"
                required
                type="text"
              />
            </AccountField>
            <AccountField
              help="L'adresse email de connexion ne peut pas être modifiée ici."
              label="Adresse email"
              name="email"
            >
              <Input
                aria-describedby="email-help"
                className={fieldClassName}
                disabled
                id="email"
                readOnly
                type="email"
                value={user.email}
              />
            </AccountField>
            <AccountField
              help="Utilisez une URL publique complète. Laissez vide pour revenir aux initiales."
              label="URL de l'avatar"
              name="avatarUrl"
            >
              <Input
                aria-describedby="avatarUrl-help"
                autoComplete="url"
                className={fieldClassName}
                defaultValue={user.avatarUrl ?? ""}
                id="avatarUrl"
                name="avatarUrl"
                placeholder="https://exemple.com/photo.jpg"
                type="url"
              />
            </AccountField>
            <div className="flex justify-end border-t border-[color:var(--border-strong)] pt-5">
              <Button
                className="h-11 px-5 text-[14px] font-bold"
                disabled={isSavingProfile}
                type="submit"
              >
                {isSavingProfile ? "Enregistrement…" : "Enregistrer le profil"}
              </Button>
            </div>
          </form>
        </section>

        <section className={panelClassName} aria-labelledby="security-title">
          <PanelHeading
            description="Protégez l'accès à votre espace personnel."
            icon={<KeyRound aria-hidden="true" />}
            title="Sécurité du compte"
            titleId="security-title"
          />
          {profile.credentialsEnabled ? (
            <form className="mt-6 grid gap-5" onSubmit={handlePasswordSubmit}>
              <AccountField label="Mot de passe actuel" name="currentPassword">
                <Input
                  autoComplete="current-password"
                  className={fieldClassName}
                  id="currentPassword"
                  maxLength={128}
                  name="currentPassword"
                  required
                  type="password"
                />
              </AccountField>
              <AccountField
                help="10 caractères minimum, avec au moins une lettre et un chiffre (72 caractères maximum)."
                label="Nouveau mot de passe"
                name="newPassword"
              >
                <Input
                  aria-describedby="newPassword-help"
                  autoComplete="new-password"
                  className={fieldClassName}
                  id="newPassword"
                  maxLength={72}
                  minLength={10}
                  name="newPassword"
                  pattern="(?=.*[A-Za-z])(?=.*\d).{10,}"
                  required
                  type="password"
                />
              </AccountField>
              <AccountField
                label="Confirmer le nouveau mot de passe"
                name="passwordConfirmation"
              >
                <Input
                  autoComplete="new-password"
                  className={fieldClassName}
                  id="passwordConfirmation"
                  maxLength={72}
                  minLength={10}
                  name="passwordConfirmation"
                  required
                  type="password"
                />
              </AccountField>
              {passwordMessage ? (
                <p
                  className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] font-semibold text-destructive"
                  role="alert"
                >
                  {passwordMessage}
                </p>
              ) : null}
              <div className="flex justify-end border-t border-[color:var(--border-strong)] pt-5">
                <Button
                  className="h-11 px-5 text-[14px] font-bold"
                  disabled={isChangingPassword}
                  type="submit"
                >
                  {isChangingPassword
                    ? "Modification…"
                    : "Modifier le mot de passe"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-[16px] border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-5">
              <Badge className="mb-3" variant="outline">
                Connexion Google
              </Badge>
              <p className="font-extrabold text-[color:var(--ink)]">
                Aucun mot de passe Content AI
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[color:var(--text-muted)]">
                Votre accès est protégé par Google. Modifiez votre mot de passe
                depuis votre compte Google si nécessaire.
              </p>
            </div>
          )}
        </section>

        <section
          className={panelClassName}
          aria-labelledby="organizations-title"
        >
          <PanelHeading
            description="Les espaces auxquels votre compte participe actuellement."
            icon={<Building2 aria-hidden="true" />}
            title={`Organisations (${profile.memberships.length})`}
            titleId="organizations-title"
          />
          <div className="mt-6 grid gap-3">
            {profile.memberships.length > 0 ? (
              profile.memberships.map((membership) => (
                <Link
                  className="group flex items-center justify-between gap-4 rounded-[15px] border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper)] p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--ink)] hover:shadow-[3px_3px_0_rgba(23,19,15,0.1)]"
                  href={`/app/${membership.organization.slug}/dashboard`}
                  key={membership.organization.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold text-[color:var(--ink)]">
                      {membership.organization.name}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-[color:var(--text-muted)]">
                      Rejoint le {formatDate(membership.joinedAt)}
                    </p>
                  </div>
                  <Badge className="shrink-0" variant="outline">
                    {getOrganizationRoleLabel(membership.role)}
                  </Badge>
                </Link>
              ))
            ) : (
              <div className="rounded-[15px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-5 text-[14px] text-[color:var(--text-muted)]">
                Votre compte n'est rattaché à aucune organisation active.
              </div>
            )}
          </div>
        </section>

        <section className={panelClassName} aria-labelledby="session-title">
          <PanelHeading
            description="Fermez votre session en cours sur cet appareil."
            icon={<ShieldCheck aria-hidden="true" />}
            title="Session actuelle"
            titleId="session-title"
          />
          <div className="mt-6 flex flex-col gap-4 rounded-[16px] border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-[color:var(--ink)]">
                {user.email}
              </p>
              <p className="mt-1 text-[13px] text-[color:var(--text-muted)]">
                Vous devrez vous identifier de nouveau pour revenir.
              </p>
            </div>
            <Button
              className="h-10 gap-2 px-4"
              onClick={() => void handleLogout()}
              type="button"
              variant="outline"
            >
              <LogOut aria-hidden="true" />
              Se déconnecter
            </Button>
          </div>
        </section>
      </div>

      <section
        className={`${panelClassName} border-destructive/25 bg-destructive/5`}
        aria-labelledby="danger-zone-title"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.17em] text-destructive">
              Zone sensible
            </p>
            <h2
              className="mt-1 font-heading text-xl font-extrabold text-[color:var(--ink)]"
              id="danger-zone-title"
            >
              Supprimer définitivement le compte
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-[color:var(--text-muted)]">
              Votre accès personnel sera supprimé. Les organisations dont vous
              êtes propriétaire et leurs données seront également supprimées.
            </p>
          </div>
          <Button
            className="h-10 shrink-0 gap-2 px-4"
            onClick={() => setIsDeleteDialogOpen(true)}
            type="button"
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
            Supprimer mon compte
          </Button>
        </div>
      </section>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingAccount) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-md border-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper-card)] p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-extrabold text-[color:var(--ink)]">
              Supprimer définitivement votre compte ?
            </DialogTitle>
            <DialogDescription className="leading-6 text-[color:var(--text-muted)]">
              Cette action est irréversible. Votre accès personnel, vos
              organisations et leurs données seront supprimés, puis vous serez
              déconnecté de Content AI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-6 -mb-6 mt-2 border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-6 py-4">
            <DialogClose render={<Button variant="outline" />}>
              Annuler
            </DialogClose>
            <Button
              disabled={isDeletingAccount}
              onClick={() => void handleDeleteAccount()}
              variant="destructive"
            >
              {isDeletingAccount ? "Suppression…" : "Supprimer mon compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="flex min-h-32 items-start gap-4 rounded-[18px] border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color:var(--rubric-soft)] text-[color:var(--rubric)] [&>svg]:size-5">
        {icon}
      </span>
      <div>
        <strong className="font-heading text-3xl font-extrabold tabular-nums text-[color:var(--ink)]">
          {formatNumber(value)}
        </strong>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-[color:var(--text-muted)]">
          {label}
        </p>
      </div>
    </article>
  );
}

function DiscoveryMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[color:var(--text-muted)]">
      <span className="text-[color:var(--rubric)] [&>svg]:size-4">{icon}</span>
      <span>{label}</span>
      <strong className="text-[color:var(--ink)]">{formatNumber(value)}</strong>
    </div>
  );
}

function PanelHeading({
  description,
  icon,
  title,
  titleId,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
  titleId: string;
}) {
  return (
    <header className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--rubric-soft)] text-[color:var(--rubric)] [&>svg]:size-5">
        {icon}
      </span>
      <div>
        <h2
          className="font-heading text-xl font-extrabold text-[color:var(--ink)]"
          id={titleId}
        >
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-5 text-[color:var(--text-muted)]">
          {description}
        </p>
      </div>
    </header>
  );
}

function AccountField({
  children,
  help,
  label,
  name,
}: {
  children: React.ReactNode;
  help?: string;
  label: string;
  name: string;
}) {
  const helpId = help ? `${name}-help` : undefined;

  return (
    <div className="grid gap-2">
      <label
        className="text-[13px] font-extrabold text-[color:var(--ink)]"
        htmlFor={name}
      >
        {label}
      </label>
      {children}
      {help ? (
        <p
          className="text-[12px] leading-5 text-[color:var(--text-muted)]"
          id={helpId}
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonthYear(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
