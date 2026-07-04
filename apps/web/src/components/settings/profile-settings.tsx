"use client";

import type { AuthSessionPayload } from "@content-ai/shared";
import { FormEvent, useEffect, useState } from "react";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

type ProfileState =
  | { status: "loading"; user?: never; message?: never }
  | { status: "ready"; user: AuthSessionPayload["user"]; message?: string }
  | { status: "error"; user?: never; message: string };

export function ProfileSettings() {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          credentials: "include",
        });
        const result = await readApiResponse<AuthSessionPayload>(response);

        if (!isMounted) {
          return;
        }

        if (!response.ok || result.error) {
          setState({
            message: result.error?.message ?? "Profil indisponible.",
            status: "error",
          });
          return;
        }

        setState({ status: "ready", user: result.data.user });
      } catch {
        if (isMounted) {
          setState({ message: "Profil indisponible.", status: "error" });
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.status !== "ready") {
      return;
    }

    setIsSaving(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        body: JSON.stringify({
          avatarUrl: String(formData.get("avatarUrl") ?? ""),
          name: String(formData.get("name") ?? ""),
        }),
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });
      const result = await readApiResponse<AuthSessionPayload>(response);

      if (!response.ok || result.error) {
        setState({
          message: result.error?.message ?? "Mise a jour impossible.",
          status: "ready",
          user: state.user,
        });
        return;
      }

      setState({
        message: "Profil mis a jour.",
        status: "ready",
        user: result.data.user,
      });
    } catch {
      setState({
        message: "Mise a jour impossible.",
        status: "ready",
        user: state.user,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      credentials: "include",
      method: "POST",
    });
    window.location.href = "/login";
  }

  if (state.status === "loading") {
    return <p className="muted">Chargement du profil...</p>;
  }

  if (state.status === "error") {
    return <p className="form-error">{state.message}</p>;
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nom affiche</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={state.user.name}
          required
        />
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" value={state.user.email} disabled readOnly />
      </label>
      <label className="field">
        <span>Avatar URL</span>
        <input
          name="avatarUrl"
          type="url"
          autoComplete="url"
          defaultValue={state.user.avatarUrl ?? ""}
        />
      </label>
      {state.message ? <p className="muted">{state.message}</p> : null}
      <div className="form-footer">
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={handleLogout}
        >
          Se deconnecter
        </button>
      </div>
    </form>
  );
}
