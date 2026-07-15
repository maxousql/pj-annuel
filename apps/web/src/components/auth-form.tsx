"use client";

import type {
  AuthSessionPayload,
  InvitationPreviewPayload,
} from "@content-ai/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  getApiBaseUrl,
  getSafeNextPath,
  readApiResponse,
} from "@/lib/auth/client";
import {
  fetchInvitationPreview,
  acceptInvitation,
} from "@/lib/invitations/client";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
  invitationToken?: string | null;
};

const authConfig = {
  login: {
    title: "Connexion",
    submitLabel: "Se connecter",
    alternateText: "Pas encore de compte ?",
    alternateHref: "/register",
    alternateLabel: "Creer un compte",
  },
  register: {
    title: "Creation de compte",
    submitLabel: "Creer le compte",
    alternateText: "Deja inscrit ?",
    alternateHref: "/login",
    alternateLabel: "Se connecter",
  },
} satisfies Record<AuthMode, Record<string, string>>;

export function AuthForm({ mode, invitationToken }: AuthFormProps) {
  const config = authConfig[mode];
  const isRegister = mode === "register";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alternateNextPath, setAlternateNextPath] = useState("/app");
  const [invitationPreview, setInvitationPreview] =
    useState<InvitationPreviewPayload | null>(null);
  const [prefilledEmail, setPrefilledEmail] = useState("");

  useEffect(() => {
    setAlternateNextPath(getSafeNextPath());
  }, []);

  useEffect(() => {
    if (!invitationToken || mode !== "register") return;

    void fetchInvitationPreview(invitationToken).then((result) => {
      if (result.error) {
        setError(result.error.message);
      } else {
        setInvitationPreview(result.data);
        setPrefilledEmail(result.data.email);
      }
    });
  }, [invitationToken, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = {
      ...(isRegister ? { name: String(formData.get("name") ?? "") } : {}),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        body: JSON.stringify(payload),
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const result = await readApiResponse<AuthSessionPayload>(response);

      if (!response.ok || result.error) {
        setError(result.error?.message ?? "Authentification impossible.");
        return;
      }

      if (isRegister && invitationToken) {
        const acceptResult = await acceptInvitation(invitationToken);
        if (acceptResult.error) {
          setError(acceptResult.error.message);
          return;
        }
        router.push(`/app/${acceptResult.data.organizationSlug}/dashboard`);
      } else {
        const nextPath = getSafeNextPath();
        router.push(
          isRegister && nextPath === "/app" ? "/app/onboarding" : nextPath,
        );
      }
      router.refresh();
    } catch {
      setError("Authentification impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    const nextPath = encodeURIComponent(getSafeNextPath());
    window.location.href = `${getApiBaseUrl()}/api/auth/google?next=${nextPath}`;
  }

  const alternateHref = `${config.alternateHref}?next=${encodeURIComponent(alternateNextPath)}`;

  return (
    <section className="auth-panel" aria-labelledby={`${mode}-title`}>
      <div>
        {invitationPreview ? (
          <>
            <p className="eyebrow">Invitation d'équipe</p>
            <h1 id={`${mode}-title`}>
              Rejoindre {invitationPreview.organizationName}
            </h1>
          </>
        ) : (
          <>
            <p className="eyebrow">Acces securise</p>
            <h1 id={`${mode}-title`}>{config.title}</h1>
          </>
        )}
      </div>
      <form className="auth-form" method="post" onSubmit={handleSubmit}>
        {isRegister ? (
          <label className="field">
            <span>Nom complet</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={prefilledEmail}
            required
          />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 10 : undefined}
            pattern={isRegister ? "(?=.*[A-Za-z])(?=.*\\d).{10,}" : undefined}
            aria-describedby={isRegister ? "password-help" : undefined}
            required
          />
          {isRegister ? (
            <small className="field-help" id="password-help">
              10 caracteres minimum, avec au moins une lettre et un chiffre.
            </small>
          ) : null}
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-footer">
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Traitement..." : config.submitLabel}
          </button>
          <span className="muted">
            {config.alternateText}{" "}
            <Link href={alternateHref}>{config.alternateLabel}</Link>
          </span>
        </div>
      </form>
      <button
        className="button-secondary"
        type="button"
        onClick={handleGoogleLogin}
      >
        Continuer avec Google
      </button>
    </section>
  );
}
