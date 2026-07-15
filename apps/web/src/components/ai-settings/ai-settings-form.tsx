"use client";

import { type FormEvent, useEffect, useState } from "react";
import type {
  BrandVoiceProfilePayload,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";
import { Loader2, Save } from "lucide-react";

import { LoadingState } from "@/components/shell/loading-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAiSettings,
  updateBrandVoiceProfile,
} from "@/lib/ai-settings/client";
import { cn } from "@/lib/utils";

type AiSettingsFormProps = {
  organizationSlug: string;
};

const inputClass =
  "rounded-xl border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] placeholder:text-[color:var(--text-subtle)] focus-visible:border-[color:var(--klein)] focus-visible:ring-[color:var(--klein)]/25";
const panelClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--ink)]";

export function AiSettingsForm({ organizationSlug }: AiSettingsFormProps) {
  const [profile, setProfile] = useState<BrandVoiceProfilePayload | null>(null);
  const [promptVersions, setPromptVersions] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      const result = await fetchAiSettings(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setProfile(result.data.profile);
        setPromptVersions(result.data.promptVersions);
        setMessage(null);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setMessage(null);

    const result = await updateBrandVoiceProfile(organizationSlug, {
      creativity: Number(formData.get("creativity") ?? 2),
      examples: splitLines(String(formData.get("examples") ?? "")),
      forbiddenTerms: splitLines(String(formData.get("forbiddenTerms") ?? "")),
      language: String(formData.get("language") ?? "fr") as GenerationLanguage,
      targetLength: String(
        formData.get("targetLength") ?? "standard",
      ) as GenerationTargetLength,
      toneRules: String(formData.get("toneRules") ?? ""),
    });

    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setProfile(result.data.profile);
    setMessage("Profil IA mis a jour.");
  }

  if (isLoading) {
    return <LoadingState title="Chargement des paramètres IA" />;
  }

  if (!profile) {
    return <p className="form-error">{message ?? "Profil IA indisponible."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className={cn(panelClass, "rounded-3xl py-0")}>
        <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
          <CardTitle>Voix de marque avancee</CardTitle>
          <CardDescription>
            Ces consignes personnalisent les générations sans stocker de secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Langue
                </span>
                <select
                  className="h-11 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3"
                  name="language"
                  defaultValue={profile.language}
                >
                  <option value="fr">Francais</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Longueur
                </span>
                <select
                  className="h-11 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3"
                  name="targetLength"
                  defaultValue={profile.targetLength}
                >
                  <option value="short">Courte</option>
                  <option value="standard">Standard</option>
                  <option value="long">Longue</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Creativite
                </span>
                <Input
                  className={cn(inputClass, "h-11")}
                  defaultValue={profile.creativity}
                  max={5}
                  min={1}
                  name="creativity"
                  type="number"
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                Regles de ton
              </span>
              <Textarea
                className={cn(inputClass, "min-h-36 rounded-2xl")}
                name="toneRules"
                defaultValue={profile.toneRules}
                placeholder="Direct, concret, eviter le jargon, toujours donner un exemple..."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Exemples a imiter
                </span>
                <Textarea
                  className={cn(inputClass, "min-h-40 rounded-2xl")}
                  name="examples"
                  defaultValue={profile.examples.join("\n")}
                  placeholder="Un exemple par ligne"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Termes interdits
                </span>
                <Textarea
                  className={cn(inputClass, "min-h-40 rounded-2xl")}
                  name="forbiddenTerms"
                  defaultValue={profile.forbiddenTerms.join("\n")}
                  placeholder="Un terme par ligne"
                />
              </label>
            </div>
            {message ? (
              <p className="rounded-2xl bg-[color:var(--paper-2)] p-3 text-sm font-medium">
                {message}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                className="h-11 rounded-2xl bg-[color:var(--rubric)] px-5 font-bold text-[color:var(--paper)] hover:bg-[color:var(--rubric)]"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={cn(panelClass, "rounded-3xl py-0 xl:self-start")}>
        <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
          <CardTitle>Prompts actifs</CardTitle>
          <CardDescription>
            Traçabilite des versions journalisees.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 py-5">
          {Object.entries(promptVersions).map(([key, version]) => (
            <div
              className="rounded-2xl bg-[color:var(--paper-2)] p-3"
              key={key}
            >
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                {key}
              </span>
              <strong className="mt-1 block">{version}</strong>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function splitLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
