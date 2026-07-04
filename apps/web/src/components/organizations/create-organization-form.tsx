"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createOrganization } from "@/lib/organizations/client";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await createOrganization({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push(`/app/onboarding`);
      router.refresh();
    } catch {
      setError("Creation impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nom de l'organisation</span>
        <input name="name" type="text" autoComplete="organization" required />
      </label>
      <label className="field">
        <span>Slug</span>
        <input
          name="slug"
          type="text"
          inputMode="url"
          placeholder="mon-organisation"
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creation..." : "Creer l'organisation"}
      </button>
    </form>
  );
}
