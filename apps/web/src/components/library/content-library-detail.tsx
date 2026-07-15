"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CONTENT_FORMATS,
  CONTENT_ITEM_STATUSES,
  type ContentCategoryPayload,
  type ContentFormat,
  type ContentItemPayload,
  type ContentItemStatus,
  type ContentTagPayload,
} from "@content-ai/shared";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  FolderPlus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
} from "lucide-react";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_LABELS,
  formatContentDate,
} from "@/components/contents/content-labels";
import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
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
  archiveLibraryContent,
  createLibraryCategory,
  createLibraryTag,
  fetchLibraryContent,
  restoreLibraryContent,
  updateLibraryContent,
} from "@/lib/library/client";

type ContentLibraryDetailProps = {
  contentId: string;
  organizationSlug: string;
};

const STATUS_OPTIONS = CONTENT_ITEM_STATUSES.filter((status) => {
  return status !== "DELETED";
});

const controlClassName =
  "h-12 rounded-[14px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-sm text-[color:var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--klein)] focus:ring-4 focus:ring-[color:var(--klein)]/20";

const selectClassName = cn(controlClassName, "w-full appearance-none");

export function ContentLibraryDetail({
  contentId,
  organizationSlug,
}: ContentLibraryDetailProps) {
  const [content, setContent] = useState<ContentItemPayload | null>(null);
  const [tags, setTags] = useState<ContentTagPayload[]>([]);
  const [categories, setCategories] = useState<ContentCategoryPayload[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<ContentFormat>("LINKEDIN_POST");
  const [status, setStatus] = useState<ContentItemStatus>("DRAFT");
  const [categoryId, setCategoryId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#2733d6");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedTagSet = useMemo(() => {
    return new Set(selectedTagIds);
  }, [selectedTagIds]);

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      setIsLoading(true);
      const result = await fetchLibraryContent(organizationSlug, contentId);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setMessage(result.error.message);
      } else {
        hydrateState(
          result.data.content,
          result.data.tags,
          result.data.categories,
        );
      }

      setIsLoading(false);
    }

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, [contentId, organizationSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await updateLibraryContent(organizationSlug, content.id, {
      body: body.trim(),
      categoryId: categoryId || null,
      format,
      status,
      tagIds: selectedTagIds,
      title: title.trim(),
      ...(topic.trim() ? { topic: topic.trim() } : { topic: "" }),
    });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    hydrateState(result.data.content, result.data.tags, result.data.categories);
    setMessage("Contenu mis a jour.");
  }

  async function handleCreateTag() {
    const name = newTagName.trim();

    if (!name) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await createLibraryTag(organizationSlug, {
      color: newTagColor,
      name,
    });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setTags((current) => upsertById(current, result.data.tag));
    setSelectedTagIds((current) => [
      ...new Set([...current, result.data.tag.id]),
    ]);
    setNewTagName("");
    setMessage("Tag cree.");
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();

    if (!name) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await createLibraryCategory(organizationSlug, { name });
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setCategories((current) => upsertById(current, result.data.category));
    setCategoryId(result.data.category.id);
    setNewCategoryName("");
    setMessage("Categorie creee.");
  }

  async function handleArchive() {
    if (!content) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await archiveLibraryContent(organizationSlug, content.id);
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    hydrateState(result.data.content, result.data.tags, result.data.categories);
    setMessage("Contenu archive.");
  }

  async function handleRestore() {
    if (!content) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await restoreLibraryContent(organizationSlug, content.id);
    setIsSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    hydrateState(result.data.content, result.data.tags, result.data.categories);
    setMessage("Contenu restaure.");
  }

  function hydrateState(
    nextContent: ContentItemPayload,
    nextTags: ContentTagPayload[],
    nextCategories: ContentCategoryPayload[],
  ) {
    setContent(nextContent);
    setTags(nextTags);
    setCategories(nextCategories);
    setTitle(nextContent.title);
    setBody(nextContent.body);
    setTopic(nextContent.topic ?? "");
    setFormat(nextContent.format);
    setStatus(nextContent.status);
    setCategoryId(nextContent.categoryId ?? "");
    setSelectedTagIds(nextContent.tags.map((tagItem) => tagItem.id));
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((candidate) => candidate !== tagId);
      }

      return [...current, tagId];
    });
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Chargement du contenu"
        description="La fiche bibliothèque est en cours de lecture."
      />
    );
  }

  if (!content) {
    return (
      <EmptyState
        title="Contenu introuvable"
        description={
          message ?? "Ce contenu n'existe pas dans cette organisation."
        }
        action={
          <Link
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-sm font-bold text-[color:var(--ink)] transition hover:bg-[color:var(--paper-2)]"
            href={`/app/${organizationSlug}/library`}
          >
            Revenir a la bibliotheque
          </Link>
        }
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-180px)] rounded-[28px] border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-4 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)] sm:p-6 lg:p-8">
      <section className="mb-6 rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-5 shadow-[0_2px_10px_rgba(23,19,15,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              className="mb-5 inline-flex h-10 items-center gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 text-sm font-bold text-[color:var(--text-muted)] transition hover:text-[color:var(--rubric)]"
              href={`/app/${organizationSlug}/library`}
            >
              <ArrowLeft className="size-4" />
              Bibliotheque
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={content.status} />
              <Badge className="border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--klein)]">
                <FileText className="size-3" />
                {CONTENT_FORMAT_LABELS[content.format]}
              </Badge>
            </div>
            <h2 className="mt-4 max-w-4xl text-3xl font-extrabold leading-[1.08] text-[color:var(--ink)] sm:text-4xl lg:text-5xl">
              {content.title}
            </h2>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--text-muted)]">
              <CalendarDays className="size-4 text-[color:var(--klein)]" />
              Mis a jour le {formatContentDate(content.updatedAt)}
            </p>
          </div>

          <div className="rounded-[20px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
            <p className="text-xs font-bold uppercase text-[color:var(--text-subtle)]">
              Selection
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[color:var(--rubric)]">
              {selectedTagIds.length}
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              tag(s) associe(s)
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 border-[color:var(--border-strong)] bg-[color:var(--paper-card)] py-0 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)]">
          <CardHeader className="gap-3 border-b border-[color:var(--border-strong)] px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
                Edition
              </p>
              <CardTitle className="mt-1 text-2xl font-bold text-[color:var(--ink)]">
                Detail contenu
              </CardTitle>
            </div>
            <CardDescription className="text-sm leading-6 text-[color:var(--text-muted)]">
              Les champs ci-dessous alimentent directement le payload de mise a
              jour existant.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 py-5 sm:px-6">
            <form className="grid gap-6" onSubmit={handleSubmit}>
              <FieldLabel label="Titre">
                <Input
                  className={controlClassName}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </FieldLabel>

              <FieldLabel label="Corps">
                <Textarea
                  className="min-h-[460px] resize-y rounded-[18px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 py-4 text-sm leading-7 text-[color:var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--klein)] focus:ring-4 focus:ring-[color:var(--klein)]/20"
                  rows={22}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </FieldLabel>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Format">
                  <select
                    className={selectClassName}
                    value={format}
                    onChange={(event) =>
                      setFormat(event.target.value as ContentFormat)
                    }
                  >
                    {CONTENT_FORMATS.map((option) => (
                      <option key={option} value={option}>
                        {CONTENT_FORMAT_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Statut">
                  <select
                    className={selectClassName}
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as ContentItemStatus)
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {CONTENT_STATUS_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="Categorie">
                  <select
                    className={selectClassName}
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                  >
                    <option value="">Sans categorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Sujet historique">
                  <Input
                    className={controlClassName}
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                  />
                </FieldLabel>
              </div>

              <div className="rounded-[22px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
                      Tags
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-subtle)]">
                      Cochez les tags editoriaux associes au contenu.
                    </p>
                  </div>
                  <Badge className="border-[color:var(--rubric)]/30 bg-[color:var(--rubric)]/10 text-[color:var(--rubric)]">
                    {selectedTagIds.length} selectionne(s)
                  </Badge>
                </div>

                {tags.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-4 text-sm text-[color:var(--text-muted)]">
                    Aucun tag disponible.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {tags.map((tagItem) => {
                      const isSelected = selectedTagSet.has(tagItem.id);

                      return (
                        <label
                          className={cn(
                            "flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-bold transition",
                            isSelected
                              ? "border-[color:var(--rubric)]/50 bg-[color:var(--rubric)]/10 text-[color:var(--ink)]"
                              : "border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--text-muted)] hover:bg-[color:var(--paper-2)]",
                          )}
                          key={tagItem.id}
                        >
                          <input
                            className="sr-only"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTag(tagItem.id)}
                          />
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: tagItem.color ?? "#d8401f" }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{tagItem.name}</span>
                          {isSelected ? (
                            <Check className="ml-auto size-4 shrink-0 text-[color:var(--rubric)]" />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {message ? (
                <p className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-4 py-3 text-sm font-bold text-[color:var(--rubric)]">
                  {message}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-[color:var(--border-strong)] pt-5 sm:flex-row">
                <Button
                  className="h-12 rounded-2xl bg-[color:var(--rubric)] px-5 font-extrabold text-[color:var(--paper)] shadow-[0_0_30px_rgba(195,244,0,0.20)] hover:bg-[color:var(--rubric)]"
                  disabled={isSaving}
                  type="submit"
                >
                  <Save className="size-4" />
                  {isSaving ? "Sauvegarde..." : "Mettre a jour"}
                </Button>
                {content.status === "ARCHIVED" ? (
                  <Button
                    className="h-12 rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-5 text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
                    disabled={isSaving}
                    type="button"
                    variant="outline"
                    onClick={handleRestore}
                  >
                    <RotateCcw className="size-4" />
                    Restaurer
                  </Button>
                ) : (
                  <Button
                    className="h-12 rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-5 text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
                    disabled={isSaving}
                    type="button"
                    variant="outline"
                    onClick={handleArchive}
                  >
                    <Archive className="size-4" />
                    Archiver
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="grid gap-6">
          <Card className="border-[color:var(--border-strong)] bg-[color:var(--paper-card)] py-0 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)]">
            <CardHeader className="gap-3 px-5 py-5">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-[color:var(--rubric)]/30 bg-[color:var(--rubric)]/10 text-[color:var(--rubric)]">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[color:var(--klein)]">
                  Organisation
                </p>
                <CardTitle className="mt-1 text-2xl font-bold text-[color:var(--ink)]">
                  Tags et categories
                </CardTitle>
              </div>
              <CardDescription className="text-sm leading-6 text-[color:var(--text-muted)]">
                Creez une taxonomie locale puis associez-la au contenu courant.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-5 px-5 pb-5">
              <div className="rounded-[22px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
                <FieldLabel label="Nouveau tag">
                  <Input
                    className={controlClassName}
                    value={newTagName}
                    onChange={(event) => setNewTagName(event.target.value)}
                  />
                </FieldLabel>
                <div className="mt-4 grid grid-cols-[1fr_64px] gap-3">
                  <FieldLabel label="Couleur">
                    <Input
                      className="h-12 rounded-[14px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-1"
                      type="color"
                      value={newTagColor}
                      onChange={(event) => setNewTagColor(event.target.value)}
                    />
                  </FieldLabel>
                  <div className="flex items-end">
                    <span
                      className="block size-12 rounded-2xl border border-[color:var(--border-strong)]"
                      style={{ background: newTagColor }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <Button
                  className="mt-4 h-11 w-full rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
                  disabled={isSaving || !newTagName.trim()}
                  type="button"
                  variant="outline"
                  onClick={handleCreateTag}
                >
                  <Tag className="size-4 text-[color:var(--rubric)]" />
                  Creer le tag
                </Button>
              </div>

              <div className="rounded-[22px] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
                <FieldLabel label="Nouvelle categorie">
                  <Input
                    className={controlClassName}
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                  />
                </FieldLabel>
                <Button
                  className="mt-4 h-11 w-full rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
                  disabled={isSaving || !newCategoryName.trim()}
                  type="button"
                  variant="outline"
                  onClick={handleCreateCategory}
                >
                  <FolderPlus className="size-4 text-[color:var(--rubric)]" />
                  Creer la categorie
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: ContentItemStatus }) {
  const statusClassName =
    status === "PUBLISHED"
      ? "border-[color:var(--rubric)]/30 bg-[color:var(--rubric)]/10 text-[color:var(--rubric)]"
      : status === "SCHEDULED"
        ? "border-[color:var(--klein)]/30 bg-[color:var(--klein)]/15 text-[color:var(--klein)]"
        : status === "ARCHIVED"
          ? "border-[color:var(--text-subtle)]/30 bg-[color:var(--text-subtle)]/15 text-[color:var(--text-muted)]"
          : "border-[color:var(--klein)]/30 bg-[color:var(--klein)]/15 text-[color:var(--klein)]";

  return (
    <Badge className={cn("font-bold uppercase", statusClassName)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {CONTENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function upsertById<TItem extends { id: string }>(
  items: TItem[],
  item: TItem,
): TItem[] {
  if (items.some((candidate) => candidate.id === item.id)) {
    return items.map((candidate) => {
      return candidate.id === item.id ? item : candidate;
    });
  }

  return [...items, item].sort((first, second) =>
    "name" in first && "name" in second
      ? String(first.name).localeCompare(String(second.name))
      : 0,
  );
}
