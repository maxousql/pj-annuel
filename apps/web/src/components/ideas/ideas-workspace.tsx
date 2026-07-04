"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ContentFormat,
  ContentIdeaDuplicatePayload,
  ContentIdeaPayload,
  GeneratedContentIdeaSuggestion,
} from "@content-ai/shared";
import {
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

import {
  CONTENT_FORMAT_LABELS,
  formatContentDate,
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
  fetchIdeas,
  generateIdeas,
  saveIdea,
  updateIdeaStatus,
} from "@/lib/ideas/client";

type IdeasWorkspaceProps = {
  organizationSlug: string;
};

const IDEA_FORMATS: ContentFormat[] = [
  "BLOG_ARTICLE",
  "LINKEDIN_POST",
  "SOCIAL_POST",
  "EMAIL",
  "HOOK",
  "THREAD",
  "OTHER",
];

const panelClass =
  "border-[#18243A] bg-[#0F172A]/95 text-[#E8EEFF] shadow-[0_18px_48px_rgba(0,0,0,0.26)] ring-1 ring-white/[0.03]";
const fieldClass =
  "border-[#24314D] bg-[#121C33] text-[#E8EEFF] placeholder:text-[#6F7B95] focus-visible:border-[#4D80F0] focus-visible:ring-[#4D80F0]/25";
const selectClass =
  "h-11 w-full rounded-xl border border-[#24314D] bg-[#121C33] px-3 text-sm font-medium text-[#E8EEFF] outline-none transition focus:border-[#4D80F0] focus:ring-4 focus:ring-[#4D80F0]/20";

export function IdeasWorkspace({ organizationSlug }: IdeasWorkspaceProps) {
  const [savedIdeas, setSavedIdeas] = useState<ContentIdeaPayload[]>([]);
  const [generatedIdeas, setGeneratedIdeas] = useState<
    GeneratedContentIdeaSuggestion[]
  >([]);
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<ContentFormat>("LINKEDIN_POST");
  const [count, setCount] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const savedIdeaKeys = useMemo(() => {
    return new Set(savedIdeas.map((idea) => buildIdeaKey(idea)));
  }, [savedIdeas]);

  useEffect(() => {
    let isMounted = true;

    async function loadIdeas() {
      setIsLoading(true);
      const result = await fetchIdeas(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setSavedIdeas(result.data.ideas);
      }

      setIsLoading(false);
    }

    void loadIdeas();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsGenerating(true);

    const result = await generateIdeas(organizationSlug, {
      count,
      format,
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      ...(brief.trim() ? { brief: brief.trim() } : {}),
    });

    setIsGenerating(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setGeneratedIdeas(result.data.ideas);
  }

  async function handleSave(idea: GeneratedContentIdeaSuggestion) {
    const ideaKey = buildIdeaKey(idea);

    setMessage(null);
    setSavingKeys((current) => new Set(current).add(ideaKey));

    const result = await saveIdea(organizationSlug, {
      angle: idea.angle,
      ...(idea.category ? { category: idea.category } : {}),
      justification: idea.justification,
      recommendedFormat: idea.recommendedFormat,
      title: idea.title,
    });

    setSavingKeys((current) => {
      const next = new Set(current);
      next.delete(ideaKey);
      return next;
    });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setSavedIdeas((current) => [result.data.idea, ...current]);
  }

  async function handleArchive(ideaId: string) {
    setMessage(null);
    setUpdatingIds((current) => new Set(current).add(ideaId));

    const result = await updateIdeaStatus(organizationSlug, ideaId, "ARCHIVED");

    setUpdatingIds((current) => {
      const next = new Set(current);
      next.delete(ideaId);
      return next;
    });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setSavedIdeas((current) => current.filter((idea) => idea.id !== ideaId));
  }

  async function handleMarkUsed(ideaId: string) {
    setMessage(null);
    setUpdatingIds((current) => new Set(current).add(ideaId));

    const result = await updateIdeaStatus(organizationSlug, ideaId, "USED");

    setUpdatingIds((current) => {
      const next = new Set(current);
      next.delete(ideaId);
      return next;
    });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setSavedIdeas((current) => {
      return current.map((idea) =>
        idea.id === ideaId ? result.data.idea : idea,
      );
    });
  }

  function handleDismissGenerated(idea: GeneratedContentIdeaSuggestion) {
    const ideaKey = buildIdeaKey(idea);

    setGeneratedIdeas((current) => {
      return current.filter((candidate) => buildIdeaKey(candidate) !== ideaKey);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className={cn(panelClass, "rounded-3xl py-0 xl:sticky xl:top-5")}>
        <CardHeader className="gap-4 border-b border-[#18243A] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[#88A8FF]">
                Ideation
              </p>
              <CardTitle className="mt-2 text-xl font-bold text-[#E8EEFF]">
                Brief creatif
              </CardTitle>
              <CardDescription className="mt-1 text-sm leading-6 text-[#A3AEC5]">
                Parametres transmis au generateur d'idees.
              </CardDescription>
            </div>
            <Lightbulb className="mt-1 size-5 text-[#C3F400]" />
          </div>
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#24314D] bg-[#121C33] px-3 text-sm font-medium text-[#E8EEFF] transition hover:bg-[#1A2742]"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            <Plus className="size-4" />
            Creer un contenu
          </Link>
        </CardHeader>

        <CardContent className="px-5 py-5">
          <form className="grid gap-5" onSubmit={handleGenerate}>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[#A3AEC5]">
                Thematique
              </span>
              <Input
                className={cn(fieldClass, "h-11 rounded-xl")}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Activation, retention, veille..."
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[#A3AEC5]">
                Format prefere
              </span>
              <select
                className={selectClass}
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ContentFormat)
                }
              >
                {IDEA_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {CONTENT_FORMAT_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[#A3AEC5]">
                Nombre d'idees
              </span>
              <Input
                className={cn(fieldClass, "h-11 rounded-xl")}
                max={10}
                min={1}
                type="number"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-[#A3AEC5]">
                Brief court
              </span>
              <Textarea
                className={cn(fieldClass, "min-h-40 resize-y rounded-2xl")}
                rows={7}
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Objectif, cible, contrainte de ton, offre a mettre en avant..."
              />
            </label>

            {message ? (
              <Alert className="border-[#F56C7A]/40 bg-[#F56C7A]/10 text-[#FFD7DC]">
                <AlertTitle>Action impossible</AlertTitle>
                <AlertDescription className="text-[#FFD7DC]/85">
                  {message}
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              className="h-12 rounded-2xl bg-[#C3F400] font-bold text-[#071123] shadow-[0_0_36px_rgba(195,244,0,0.22)] hover:bg-[#C3F400]"
              disabled={isGenerating}
              type="submit"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {isGenerating ? "Generation..." : "Generer des idees"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5">
        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[#18243A] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-[#88A8FF]">
                  Suggestions IA
                </p>
                <CardTitle className="mt-2 text-2xl font-bold text-[#E8EEFF]">
                  Idees a selectionner
                </CardTitle>
              </div>
              <Badge className="h-7 bg-[#121C33] px-3 text-[#A3AEC5] ring-1 ring-[#24314D]">
                {generatedIdeas.length} suggestion
                {generatedIdeas.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="px-5 py-5 sm:px-6">
            {generatedIdeas.length > 0 ? (
              <div className="grid gap-4">
                {generatedIdeas.map((idea) => {
                  const ideaKey = buildIdeaKey(idea);
                  const alreadySaved = savedIdeaKeys.has(ideaKey);
                  const isSaving = savingKeys.has(ideaKey);

                  return (
                    <IdeaCard
                      action={
                        <>
                          <Button
                            className="bg-[#C3F400] font-bold text-[#071123] hover:bg-[#C3F400]"
                            disabled={alreadySaved || isSaving}
                            type="button"
                            onClick={() => void handleSave(idea)}
                          >
                            {isSaving ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : alreadySaved ? (
                              <Check className="size-4" />
                            ) : (
                              <Plus className="size-4" />
                            )}
                            {alreadySaved
                              ? "Sauvegardee"
                              : isSaving
                                ? "Sauvegarde..."
                                : "Sauvegarder"}
                          </Button>
                          <Button
                            className="border-[#24314D] bg-transparent text-[#A3AEC5] hover:bg-[#1A2742] hover:text-[#E8EEFF]"
                            type="button"
                            variant="outline"
                            onClick={() => handleDismissGenerated(idea)}
                          >
                            <X className="size-4" />
                            Ignorer
                          </Button>
                        </>
                      }
                      duplicate={idea.duplicate}
                      idea={idea}
                      key={ideaKey}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyIdeaState
                description="Lancez une generation pour obtenir des titres, angles et formats recommandes."
                title="Aucune suggestion"
              />
            )}
          </CardContent>
        </Card>

        <Card className={cn(panelClass, "rounded-3xl py-0")}>
          <CardHeader className="border-b border-[#18243A] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-[#88A8FF]">
                  Historique
                </p>
                <CardTitle className="mt-2 text-2xl font-bold text-[#E8EEFF]">
                  Idees sauvegardees
                </CardTitle>
              </div>
              <Badge className="h-7 bg-[#121C33] px-3 text-[#A3AEC5] ring-1 ring-[#24314D]">
                {savedIdeas.length} en base
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="px-5 py-5 sm:px-6">
            {isLoading ? (
              <EmptyIdeaState
                description="Recuperation des idees sauvegardees."
                loading
                title="Chargement"
              />
            ) : savedIdeas.length > 0 ? (
              <div className="grid gap-4">
                {savedIdeas.map((idea) => {
                  const isUpdating = updatingIds.has(idea.id);

                  return (
                    <IdeaCard
                      action={
                        <>
                          <Link
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#4D80F0] px-2.5 text-sm font-medium text-white transition hover:bg-[#88A8FF] hover:text-[#071123]"
                            href={`/app/${organizationSlug}/contents/generate?ideaId=${idea.id}`}
                          >
                            <ArrowRight className="size-4" />
                            Transformer
                          </Link>
                          <Button
                            className="border-[#24314D] bg-[#121C33] text-[#E8EEFF] hover:bg-[#1A2742]"
                            disabled={isUpdating || idea.status === "USED"}
                            type="button"
                            variant="outline"
                            onClick={() => void handleMarkUsed(idea.id)}
                          >
                            <CheckCircle2 className="size-4" />
                            {idea.status === "USED"
                              ? "Utilisee"
                              : "Marquer utilisee"}
                          </Button>
                          <Button
                            className="text-[#A3AEC5] hover:bg-[#1A2742] hover:text-[#E8EEFF]"
                            disabled={isUpdating}
                            type="button"
                            variant="ghost"
                            onClick={() => void handleArchive(idea.id)}
                          >
                            <Archive className="size-4" />
                            Archiver
                          </Button>
                        </>
                      }
                      idea={idea}
                      key={idea.id}
                      meta={`Sauvegardee le ${formatContentDate(idea.createdAt)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyIdeaState
                description="Sauvegardez une suggestion pour alimenter l'historique et la generation de contenus."
                title="Aucune idee sauvegardee"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyIdeaState({
  description,
  loading = false,
  title,
}: {
  description: string;
  loading?: boolean;
  title: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#24314D] bg-[#050B18]/55 p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#4D80F0]/15 text-[#88A8FF] ring-1 ring-[#4D80F0]/25">
          {loading ? (
            <Loader2 className="size-7 animate-spin" />
          ) : (
            <Sparkles className="size-7" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-[#E8EEFF]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#A3AEC5]">{description}</p>
      </div>
    </div>
  );
}

function IdeaCard({
  action,
  duplicate,
  idea,
  meta,
}: {
  action: ReactNode;
  duplicate?: ContentIdeaDuplicatePayload;
  idea: {
    angle: string;
    category: string | null;
    justification: string;
    recommendedFormat: ContentFormat;
    status?: string;
    title: string;
  };
  meta?: string;
}) {
  return (
    <article className="grid gap-4 rounded-3xl border border-[#18243A] bg-[#121C33] p-5 ring-1 ring-white/[0.03] lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge className="bg-[#4D80F0]/15 text-[#88A8FF]">
            {CONTENT_FORMAT_LABELS[idea.recommendedFormat]}
          </Badge>
          {idea.category ? (
            <Badge className="bg-[#9D50FF]/15 text-[#D6B5FF]">
              {idea.category}
            </Badge>
          ) : null}
          {idea.status ? (
            <Badge className="bg-[#C3F400]/15 text-[#C3F400]">
              {formatIdeaStatus(idea.status)}
            </Badge>
          ) : null}
        </div>
        <h3 className="text-xl font-bold leading-snug text-[#E8EEFF]">
          {idea.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#E8EEFF]/90">{idea.angle}</p>
        <small className="mt-3 block text-sm leading-6 text-[#A3AEC5]">
          {idea.justification}
        </small>
        {meta ? (
          <span className="mt-4 block text-xs font-semibold uppercase text-[#6F7B95]">
            {meta}
          </span>
        ) : null}
        <DuplicateNotice duplicate={duplicate} />
      </div>
      <div className="flex flex-wrap items-start gap-2 lg:max-w-52 lg:justify-end">
        {action}
      </div>
    </article>
  );
}

function DuplicateNotice({
  duplicate,
}: {
  duplicate?: ContentIdeaDuplicatePayload;
}) {
  if (!duplicate || duplicate.score <= 0) {
    return null;
  }

  return (
    <Alert
      className={cn(
        "mt-4 border-[#24314D] bg-[#0F172A] text-[#E8EEFF]",
        duplicate.warning && "border-[#F5C542]/40 bg-[#F5C542]/10",
      )}
    >
      <AlertTitle>
        {duplicate.warning ? "Idee proche detectee" : "Similarite detectee"}
      </AlertTitle>
      <AlertDescription className="text-[#A3AEC5]">
        Score {Math.round(duplicate.score * 100)}%
        {duplicate.matchedTitle ? ` avec "${duplicate.matchedTitle}"` : ""}.
      </AlertDescription>
    </Alert>
  );
}

function buildIdeaKey(idea: { angle: string; title: string }): string {
  return `${idea.title.trim().toLowerCase()}::${idea.angle.trim().toLowerCase()}`;
}

function formatIdeaStatus(status: string): string {
  const labels: Record<string, string> = {
    ARCHIVED: "Archivee",
    DISMISSED: "Ignoree",
    DRAFT: "Brouillon",
    SAVED: "Sauvegardee",
    USED: "Utilisee",
  };

  return labels[status] ?? status;
}
