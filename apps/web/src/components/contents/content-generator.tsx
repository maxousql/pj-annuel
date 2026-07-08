"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type {
  ContentDuplicatePayload,
  ContentGenerationFormat,
  ContentIdeaOption,
  ContentSaveStatus,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Library,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  CONTENT_FORMAT_LABELS,
  SAVE_STATUS_OPTIONS,
} from "@/components/contents/content-labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  fetchSourceIdeas,
  generateContent,
  saveContent,
} from "@/lib/contents/client";

type ContentGeneratorProps = {
  initialIdeaId?: string;
  organizationSlug: string;
};

const GENERATION_FORMATS: ContentGenerationFormat[] = [
  "BLOG_ARTICLE",
  "LINKEDIN_POST",
  "SOCIAL_POST",
  "EMAIL",
  "HOOK",
];

const panelClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/95 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)] ring-1 ring-white/[0.03]";
const fieldClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] placeholder:text-[color:var(--text-subtle)] focus-visible:border-[color:var(--klein)] focus-visible:ring-[color:var(--klein)]/25";
const selectClass =
  "h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3 text-sm font-medium text-[color:var(--ink)] outline-none transition focus:border-[color:var(--klein)] focus:ring-4 focus:ring-[color:var(--klein)]/20 disabled:cursor-not-allowed disabled:opacity-60";

export function ContentGenerator({
  initialIdeaId,
  organizationSlug,
}: ContentGeneratorProps) {
  const [ideas, setIdeas] = useState<ContentIdeaOption[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [format, setFormat] =
    useState<ContentGenerationFormat>("LINKEDIN_POST");
  const [language, setLanguage] = useState<GenerationLanguage>("fr");
  const [targetLength, setTargetLength] =
    useState<GenerationTargetLength>("standard");
  const [creativity, setCreativity] = useState(2);
  const [toneIntensity, setToneIntensity] = useState(3);
  const [brief, setBrief] = useState("");
  const [ideaId, setIdeaId] = useState(initialIdeaId ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<ContentSaveStatus>("DRAFT");
  const [duplicate, setDuplicate] = useState<ContentDuplicatePayload | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedIdea = useMemo(() => {
    return ideas.find((idea) => idea.id === ideaId) ?? null;
  }, [ideaId, ideas]);
  const hasDraft = title.trim().length > 0 || body.trim().length > 0;
  const bodyWordCount = body.trim()
    ? body.trim().split(/\s+/).filter(Boolean).length
    : 0;

  useEffect(() => {
    let isMounted = true;

    async function loadIdeas() {
      setIdeasLoading(true);
      const result = await fetchSourceIdeas(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setIdeas(result.data.ideas);
        hydrateSelectedIdea(result.data.ideas, initialIdeaId);
      }

      setIdeasLoading(false);
    }

    void loadIdeas();

    return () => {
      isMounted = false;
    };
  }, [initialIdeaId, organizationSlug]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!brief.trim() && !ideaId) {
      setMessage("Ajoutez un brief ou selectionnez une idee source.");
      return;
    }

    setIsGenerating(true);
    const result = await generateContent(organizationSlug, {
      ...(brief.trim() ? { brief: brief.trim() } : {}),
      creativity,
      format,
      ...(ideaId ? { ideaId } : {}),
      language,
      targetLength,
      toneIntensity,
    });
    setIsGenerating(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setTitle(result.data.draft.title);
    setBody(result.data.draft.body);
    setDuplicate(result.data.draft.duplicate);
    setTopic(result.data.sourceIdea?.category ?? topic);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!title.trim() || !body.trim()) {
      setMessage("Le titre et le corps sont requis avant sauvegarde.");
      return;
    }

    setIsSaving(true);
    const result = await saveContent(organizationSlug, {
      body: body.trim(),
      ...(brief.trim() ? { brief: brief.trim() } : {}),
      format,
      ...(ideaId ? { ideaId } : {}),
      status,
      title: title.trim(),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
    });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    window.location.assign(
      `/app/${organizationSlug}/contents/${result.data.content.id}`,
    );
  }

  function handleIdeaChange(nextIdeaId: string) {
    setIdeaId(nextIdeaId);
    const nextIdea = ideas.find((idea) => idea.id === nextIdeaId);

    hydrateSelectedIdea(ideas, nextIdea?.id);
  }

  function hydrateSelectedIdea(
    sourceIdeas: ContentIdeaOption[],
    selectedIdeaId: string | undefined,
  ) {
    const nextIdea = sourceIdeas.find((idea) => idea.id === selectedIdeaId);

    if (nextIdea && isGenerationFormat(nextIdea.recommendedFormat)) {
      setFormat(nextIdea.recommendedFormat);
    }

    if (nextIdea?.category) {
      setTopic(nextIdea.category);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <Card className={cn(panelClass, "rounded-3xl py-0")}>
        <CardHeader className="gap-4 border-b border-[color:var(--border-strong)] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
                Generation
              </p>
              <CardTitle className="mt-2 text-xl font-bold text-[color:var(--ink)]">
                Configurer
              </CardTitle>
              <CardDescription className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                Format, source et brief avant appel IA.
              </CardDescription>
            </div>
            <Sparkles className="mt-1 size-5 text-[color:var(--rubric)]" />
          </div>
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-[color:var(--paper-2)]"
            href={`/app/${organizationSlug}/contents`}
          >
            <ArrowLeft className="size-4" />
            Bibliotheque
          </Link>
        </CardHeader>

        <CardContent className="px-5 py-5">
          <form className="grid gap-5" onSubmit={handleGenerate}>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                Format
              </span>
              <select
                className={selectClass}
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ContentGenerationFormat)
                }
              >
                {GENERATION_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {CONTENT_FORMAT_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Langue
                </span>
                <select
                  className={selectClass}
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as GenerationLanguage)
                  }
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
                  className={selectClass}
                  value={targetLength}
                  onChange={(event) =>
                    setTargetLength(
                      event.target.value as GenerationTargetLength,
                    )
                  }
                >
                  <option value="short">Courte</option>
                  <option value="standard">Standard</option>
                  <option value="long">Longue</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Creativite
                </span>
                <Input
                  className={cn(fieldClass, "h-11 rounded-xl")}
                  max={5}
                  min={1}
                  type="number"
                  value={creativity}
                  onChange={(event) =>
                    setCreativity(Number(event.target.value))
                  }
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Intensite ton
                </span>
                <Input
                  className={cn(fieldClass, "h-11 rounded-xl")}
                  max={5}
                  min={1}
                  type="number"
                  value={toneIntensity}
                  onChange={(event) =>
                    setToneIntensity(Number(event.target.value))
                  }
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                Idee source
              </span>
              <select
                className={selectClass}
                disabled={ideasLoading}
                value={ideaId}
                onChange={(event) => handleIdeaChange(event.target.value)}
              >
                <option value="">
                  {ideasLoading ? "Chargement..." : "Aucune idee selectionnee"}
                </option>
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
              </select>
            </label>

            {selectedIdea ? (
              <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge className="bg-[color:var(--klein)]/15 text-[color:var(--klein)]">
                    Source active
                  </Badge>
                  <Badge className="bg-[color:var(--klein)]/15 text-[color:var(--klein)]">
                    {CONTENT_FORMAT_LABELS[selectedIdea.recommendedFormat]}
                  </Badge>
                </div>
                <strong className="block text-sm text-[color:var(--ink)]">
                  {selectedIdea.title}
                </strong>
                <span className="mt-2 block text-sm leading-6 text-[color:var(--text-muted)]">
                  {selectedIdea.angle}
                </span>
              </div>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                Brief
              </span>
              <Textarea
                className={cn(fieldClass, "min-h-44 resize-y rounded-2xl")}
                rows={8}
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Objectif, audience, angle, preuve, contrainte de ton..."
              />
            </label>

            {message ? (
              <Alert className="border-[color:var(--danger)]/40 bg-[color:var(--danger)]/8 text-[color:var(--danger)]">
                <AlertCircle className="size-4" />
                <AlertTitle>Action impossible</AlertTitle>
                <AlertDescription className="text-[color:var(--danger)]/85">
                  {message}
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              className="h-12 rounded-2xl bg-[color:var(--rubric)] font-bold text-[color:var(--paper)] shadow-[0_0_36px_rgba(195,244,0,0.22)] hover:bg-[color:var(--rubric)]"
              disabled={isGenerating}
              type="submit"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {isGenerating ? "Generation..." : "Generer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={cn(panelClass, "min-w-0 rounded-3xl py-0")}>
        <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
                Brouillon
              </p>
              <CardTitle className="mt-2 text-2xl font-bold text-[color:var(--ink)]">
                Edition avant sauvegarde
              </CardTitle>
            </div>
            <Badge className="h-7 bg-[color:var(--paper-2)] px-3 text-[color:var(--text-muted)] ring-1 ring-[color:var(--border-strong)]">
              {hasDraft ? `${bodyWordCount} mots` : "En attente"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-5 sm:px-6">
          {hasDraft ? (
            <form className="grid gap-5" onSubmit={handleSave}>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Titre
                </span>
                <Input
                  className={cn(fieldClass, "h-12 rounded-2xl text-base")}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  Corps
                </span>
                <Textarea
                  className={cn(
                    fieldClass,
                    "min-h-[460px] resize-y rounded-2xl font-mono text-sm leading-7",
                  )}
                  rows={18}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                    Statut
                  </span>
                  <select
                    className={selectClass}
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as ContentSaveStatus)
                    }
                  >
                    {SAVE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                    Sujet
                  </span>
                  <Input
                    className={cn(fieldClass, "h-11 rounded-xl")}
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                  />
                </label>
              </div>

              <DuplicateNotice duplicate={duplicate} />

              <div className="flex justify-end">
                <Button
                  className="h-12 rounded-2xl bg-[color:var(--rubric)] px-6 font-bold text-[color:var(--paper)] shadow-[0_0_36px_rgba(195,244,0,0.22)] hover:bg-[color:var(--rubric)]"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/55 p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--klein)]/15 text-[color:var(--klein)] ring-1 ring-[color:var(--klein)]/25">
                  <FileText className="size-7" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--ink)]">
                  Aucun brouillon
                </h3>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  Generez un contenu depuis un brief ou une idee sauvegardee
                  pour ouvrir l'espace d'edition.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <aside className="grid gap-5 xl:sticky xl:top-5">
        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="px-5 py-5">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[color:var(--ink)]">
              <Library className="size-5 text-[color:var(--klein)]" />
              Contexte
            </CardTitle>
            <CardDescription className="text-[color:var(--text-muted)]">
              Parametres transmis ou prepares pour le contenu.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5">
            <ContextRow label="Format" value={CONTENT_FORMAT_LABELS[format]} />
            <ContextRow label="Langue" value={language.toUpperCase()} />
            <ContextRow label="Longueur" value={targetLength} />
            <ContextRow
              label="Source"
              value={selectedIdea ? selectedIdea.title : "Brief libre"}
            />
            <ContextRow label="Sujet" value={topic || "A definir"} />
            <ContextRow
              label="Brief"
              value={
                brief.trim() ? `${brief.trim().length} caracteres` : "Vide"
              }
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[color:var(--border-strong)] bg-[color:var(--paper-card)] py-0 text-[color:var(--ink)] ring-1 ring-[color:var(--klein)]/20">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase text-[color:var(--rubric)]">
              Flux IA/API
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              La generation reste declenchee par le formulaire de gauche. La
              sauvegarde utilise les champs edites au centre.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3">
      <span className="text-[11px] font-bold uppercase text-[color:var(--text-subtle)]">
        {label}
      </span>
      <strong className="mt-1 block overflow-hidden text-ellipsis text-sm text-[color:var(--ink)]">
        {value}
      </strong>
    </div>
  );
}

function DuplicateNotice({
  duplicate,
}: {
  duplicate: ContentDuplicatePayload | null;
}) {
  if (!duplicate || duplicate.score <= 0) {
    return null;
  }

  return (
    <Alert
      className={cn(
        "border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)]",
        duplicate.warning &&
          "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10",
      )}
    >
      <AlertCircle className="size-4 text-[color:var(--warning)]" />
      <AlertTitle>
        {duplicate.warning ? "Doublon potentiel" : "Similarite detectee"}
      </AlertTitle>
      <AlertDescription className="text-[color:var(--text-muted)]">
        Score {Math.round(duplicate.score * 100)}%
        {duplicate.matchedTitle ? ` avec "${duplicate.matchedTitle}"` : ""}.
      </AlertDescription>
    </Alert>
  );
}

function isGenerationFormat(value: string): value is ContentGenerationFormat {
  return GENERATION_FORMATS.includes(value as ContentGenerationFormat);
}
