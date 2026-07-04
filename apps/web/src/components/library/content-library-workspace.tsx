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
  type ContentFormat,
  type ContentItemPayload,
  type ContentItemStatus,
  type ContentLibraryPayload,
} from "@content-ai/shared";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid3X3,
  ListFilter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
  Tag,
} from "lucide-react";

import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_LABELS,
  formatContentDate,
} from "@/components/contents/content-labels";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  fetchLibraryContents,
  type FetchLibraryInput,
} from "@/lib/library/client";

type ContentLibraryWorkspaceProps = {
  organizationSlug: string;
};

type FilterState = {
  category: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  format: ContentFormat | "";
  query: string;
  status: ContentItemStatus | "";
  tagId: string;
};

type ViewMode = "cards" | "table";

const EMPTY_FILTERS: FilterState = {
  category: "",
  categoryId: "",
  dateFrom: "",
  dateTo: "",
  format: "",
  query: "",
  status: "",
  tagId: "",
};

const STATUS_OPTIONS = CONTENT_ITEM_STATUSES.filter((status) => {
  return status !== "DELETED";
});

const controlClassName =
  "h-12 rounded-[14px] border-[#24314D] bg-[#121C33] px-4 text-sm text-[#E8EEFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-[#6F7B95] focus:border-[#4D80F0] focus:ring-4 focus:ring-[#4D80F0]/20";

const selectClassName = cn(controlClassName, "w-full appearance-none");

export function ContentLibraryWorkspace({
  organizationSlug,
}: ContentLibraryWorkspaceProps) {
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [library, setLibrary] = useState<ContentLibraryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const apiFilters = useMemo<FetchLibraryInput>(() => {
    return {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      ...(filters.format ? { format: filters.format } : {}),
      page,
      pageSize: 10,
      ...(filters.query ? { query: filters.query } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tagId ? { tagId: filters.tagId } : {}),
    };
  }, [filters, page]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  useEffect(() => {
    let isMounted = true;

    async function loadLibrary() {
      setIsLoading(true);
      const result = await fetchLibraryContents(organizationSlug, apiFilters);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setErrorMessage(result.error.message);
      } else {
        setLibrary(result.data);
        setErrorMessage(null);
      }

      setIsLoading(false);
    }

    void loadLibrary();

    return () => {
      isMounted = false;
    };
  }, [apiFilters, organizationSlug]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(draftFilters);
  }

  function handleReset() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <div className="min-h-[calc(100vh-180px)] rounded-[28px] border border-[#18243A] bg-[#050B18] p-4 text-[#E8EEFF] shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 lg:p-8">
      <section className="mb-8 overflow-hidden rounded-[24px] border border-[#24314D] bg-[#0F172A] px-5 py-6 shadow-[0_18px_48px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-7 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#24314D] bg-[#121C33] px-3 py-1 text-xs font-bold uppercase text-[#A3AEC5]">
              <Sparkles className="size-3.5 text-[#C3F400]" />
              Bibliotheque Architect AI
            </div>
            <h2 className="text-3xl font-extrabold leading-[1.08] text-[#E8EEFF] sm:text-4xl lg:text-5xl">
              Pilotez vos <span className="text-[#C3F400]">contenus</span>{" "}
              depuis une base editoriale premium.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#A3AEC5]">
              Filtrez, qualifiez et retrouvez chaque brouillon, publication ou
              contenu archive sans changer les routes ni les actions existantes.
            </p>
          </div>

          <Link
            className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-[#C3F400] px-5 text-sm font-extrabold text-[#071123] shadow-[0_0_36px_rgba(195,244,0,0.24)] transition hover:bg-[#C3F400]"
            href={`/app/${organizationSlug}/contents/generate`}
          >
            <Plus className="size-4" />
            Generer
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-[#18243A] bg-[#0F172A] py-0 text-[#E8EEFF] shadow-[0_18px_48px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <CardHeader className="gap-3 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-[#88A8FF]">
                  Filtres
                </p>
                <CardTitle className="mt-1 text-2xl font-bold text-[#E8EEFF]">
                  Affiner la base
                </CardTitle>
              </div>
              <Badge className="border-[#24314D] bg-[#121C33] text-[#C3F400]">
                {activeFilterCount} actif(s)
              </Badge>
            </div>
            <CardDescription className="text-sm leading-6 text-[#A3AEC5]">
              Recherche, taxonomie, statut et periode conservent les memes
              parametres API.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <FieldLabel label="Recherche">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6F7B95]" />
                  <Input
                    className={cn(controlClassName, "pl-11")}
                    placeholder="Titre ou corps"
                    value={draftFilters.query}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        query: event.target.value,
                      }))
                    }
                  />
                </div>
              </FieldLabel>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <FieldLabel label="Statut">
                  <select
                    className={selectClassName}
                    value={draftFilters.status}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        status: event.target.value as ContentItemStatus | "",
                      }))
                    }
                  >
                    <option value="">Tous sauf archives</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {CONTENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Format">
                  <select
                    className={selectClassName}
                    value={draftFilters.format}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        format: event.target.value as ContentFormat | "",
                      }))
                    }
                  >
                    <option value="">Tous</option>
                    {CONTENT_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {CONTENT_FORMAT_LABELS[format]}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <FieldLabel label="Tag">
                  <select
                    className={selectClassName}
                    value={draftFilters.tagId}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        tagId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Tous</option>
                    {(library?.tags ?? []).map((tagItem) => (
                      <option key={tagItem.id} value={tagItem.id}>
                        {tagItem.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Categorie">
                  <select
                    className={selectClassName}
                    value={draftFilters.categoryId}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Toutes</option>
                    {(library?.categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>

              <FieldLabel label="Categorie libre">
                <Input
                  className={controlClassName}
                  placeholder="Recherche categorie ou sujet historique"
                  value={draftFilters.category}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </FieldLabel>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel label="Depuis">
                  <Input
                    className={controlClassName}
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        dateFrom: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>

                <FieldLabel label="Jusqu'a">
                  <Input
                    className={controlClassName}
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        dateTo: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <Button
                  className="h-12 flex-1 rounded-2xl bg-[#C3F400] font-extrabold text-[#071123] shadow-[0_0_30px_rgba(195,244,0,0.20)] hover:bg-[#C3F400]"
                  type="submit"
                >
                  <ListFilter className="size-4" />
                  Filtrer
                </Button>
                <Button
                  className="h-12 flex-1 rounded-2xl border-[#24314D] bg-[#121C33] text-[#E8EEFF] hover:bg-[#1A2742]"
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="size-4" />
                  Reinitialiser
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="min-w-0 rounded-[24px] border border-[#18243A] bg-[#0F172A] shadow-[0_18px_48px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <header className="flex flex-col gap-4 border-b border-[#18243A] px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <p className="text-xs font-bold uppercase text-[#88A8FF]">
                Contenus
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[#E8EEFF]">
                {library ? `${library.pagination.total} resultat(s)` : ""}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-2xl border border-[#24314D] bg-[#121C33] p-1">
                <ViewModeButton
                  icon={<Grid3X3 className="size-4" />}
                  isActive={viewMode === "cards"}
                  label="Cards"
                  onClick={() => setViewMode("cards")}
                />
                <ViewModeButton
                  icon={<Table2 className="size-4" />}
                  isActive={viewMode === "table"}
                  label="Table"
                  onClick={() => setViewMode("table")}
                />
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#24314D] bg-[#121C33] px-4 text-sm font-bold text-[#E8EEFF] transition hover:bg-[#1A2742]"
                href={`/app/${organizationSlug}/contents/generate`}
              >
                <Plus className="size-4 text-[#C3F400]" />
                Generer
              </Link>
            </div>
          </header>

          <div className="p-5 lg:p-6">{renderResults()}</div>
        </section>
      </div>
    </div>
  );

  function renderResults() {
    if (isLoading) {
      return (
        <PremiumState
          description="Lecture de la bibliotheque de l'organisation."
          title="Chargement des contenus"
        />
      );
    }

    if (errorMessage) {
      return (
        <PremiumState
          description={errorMessage}
          title="Bibliotheque indisponible"
          tone="danger"
        />
      );
    }

    if (!library || library.contents.length === 0) {
      return (
        <PremiumState
          action={
            <Button
              className="h-11 rounded-2xl bg-[#C3F400] px-5 font-extrabold text-[#071123] hover:bg-[#C3F400]"
              type="button"
              onClick={handleReset}
            >
              <RotateCcw className="size-4" />
              Vider les filtres
            </Button>
          }
          description="Aucun contenu ne correspond aux filtres actifs."
          title="Aucun contenu"
        />
      );
    }

    return (
      <div className="grid gap-5">
        {viewMode === "cards" ? (
          <div className="grid gap-4 2xl:grid-cols-2">
            {library.contents.map((content) => (
              <LibraryContentCard
                content={content}
                organizationSlug={organizationSlug}
                key={content.id}
              />
            ))}
          </div>
        ) : (
          <LibraryContentTable
            contents={library.contents}
            organizationSlug={organizationSlug}
          />
        )}

        <div className="flex flex-col gap-3 rounded-[20px] border border-[#18243A] bg-[#121C33] p-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11 rounded-2xl border-[#24314D] bg-[#0F172A] px-4 text-[#E8EEFF] hover:bg-[#1A2742] disabled:opacity-40"
            disabled={page <= 1}
            type="button"
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="size-4" />
            Precedent
          </Button>
          <span className="text-center text-sm font-bold text-[#A3AEC5]">
            Page{" "}
            <span className="text-[#C3F400]">{library.pagination.page}</span> /{" "}
            {library.pagination.totalPages}
          </span>
          <Button
            className="h-11 rounded-2xl border-[#24314D] bg-[#0F172A] px-4 text-[#E8EEFF] hover:bg-[#1A2742] disabled:opacity-40"
            disabled={page >= library.pagination.totalPages}
            type="button"
            variant="outline"
            onClick={() =>
              setPage((current) =>
                Math.min(library.pagination.totalPages, current + 1),
              )
            }
          >
            Suivant
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }
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
      <span className="text-xs font-bold uppercase text-[#A3AEC5]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ViewModeButton({
  icon,
  isActive,
  label,
  onClick,
}: {
  icon: ReactNode;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-bold transition",
        isActive
          ? "bg-[#C3F400] text-[#071123]"
          : "text-[#A3AEC5] hover:bg-[#1A2742] hover:text-[#E8EEFF]",
      )}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function LibraryContentCard({
  content,
  organizationSlug,
}: {
  content: ContentItemPayload;
  organizationSlug: string;
}) {
  return (
    <article className="group rounded-[24px] border border-[#18243A] bg-[#121C33] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-px hover:border-[#4D80F0]/70 hover:bg-[#15203A]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={content.status} />
          <Badge className="border-[#24314D] bg-[#0F172A] text-[#88A8FF]">
            <FileText className="size-3" />
            {CONTENT_FORMAT_LABELS[content.format]}
          </Badge>
          {content.category ? (
            <Badge className="border-[#24314D] bg-[#0F172A] text-[#E8EEFF]">
              {content.category.name}
            </Badge>
          ) : null}
        </div>

        <div>
          <h4 className="line-clamp-2 text-xl font-bold leading-snug text-[#E8EEFF]">
            {content.title}
          </h4>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#A3AEC5]">
            {createExcerpt(content.body)}
          </p>
        </div>

        {content.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {content.tags.map((tagItem) => (
              <TagBadge
                color={tagItem.color ?? "#C3F400"}
                key={tagItem.id}
                name={tagItem.name}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[#18243A] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F7B95]">
            <CalendarDays className="size-4 text-[#88A8FF]" />
            {formatContentDate(content.updatedAt)}
          </span>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#24314D] bg-[#0F172A] px-4 text-sm font-bold text-[#E8EEFF] transition hover:border-[#C3F400] hover:text-[#C3F400]"
            href={`/app/${organizationSlug}/library/${content.id}`}
          >
            Ouvrir
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function LibraryContentTable({
  contents,
  organizationSlug,
}: {
  contents: ContentItemPayload[];
  organizationSlug: string;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#18243A] bg-[#121C33]">
      <Table>
        <TableHeader className="bg-[#0F172A]">
          <TableRow className="border-[#18243A] hover:bg-[#0F172A]">
            <TableHead className="px-4 text-xs font-bold uppercase text-[#6F7B95]">
              Contenu
            </TableHead>
            <TableHead className="px-4 text-xs font-bold uppercase text-[#6F7B95]">
              Statut
            </TableHead>
            <TableHead className="px-4 text-xs font-bold uppercase text-[#6F7B95]">
              Format
            </TableHead>
            <TableHead className="px-4 text-xs font-bold uppercase text-[#6F7B95]">
              Tags
            </TableHead>
            <TableHead className="px-4 text-xs font-bold uppercase text-[#6F7B95]">
              Maj
            </TableHead>
            <TableHead className="px-4 text-right text-xs font-bold uppercase text-[#6F7B95]">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contents.map((content) => (
            <TableRow
              className="min-h-[72px] border-[#18243A] hover:bg-[#1A2742]"
              key={content.id}
            >
              <TableCell className="max-w-[360px] px-4 py-4">
                <div>
                  <p className="line-clamp-1 font-bold text-[#E8EEFF]">
                    {content.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-[#A3AEC5]">
                    {content.category?.name ?? createExcerpt(content.body)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="px-4 py-4">
                <StatusBadge status={content.status} />
              </TableCell>
              <TableCell className="px-4 py-4 text-sm font-semibold text-[#A3AEC5]">
                {CONTENT_FORMAT_LABELS[content.format]}
              </TableCell>
              <TableCell className="px-4 py-4">
                <div className="flex max-w-[220px] flex-wrap gap-1.5">
                  {content.tags.slice(0, 3).map((tagItem) => (
                    <TagBadge
                      color={tagItem.color ?? "#C3F400"}
                      key={tagItem.id}
                      name={tagItem.name}
                    />
                  ))}
                  {content.tags.length > 3 ? (
                    <Badge className="border-[#24314D] bg-[#0F172A] text-[#A3AEC5]">
                      +{content.tags.length - 3}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="px-4 py-4 text-sm font-semibold text-[#A3AEC5]">
                {formatContentDate(content.updatedAt)}
              </TableCell>
              <TableCell className="px-4 py-4 text-right">
                <Link
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#24314D] bg-[#0F172A] px-3 text-sm font-bold text-[#E8EEFF] transition hover:border-[#C3F400] hover:text-[#C3F400]"
                  href={`/app/${organizationSlug}/library/${content.id}`}
                >
                  Ouvrir
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: ContentItemStatus }) {
  const statusClassName =
    status === "PUBLISHED"
      ? "border-[#C3F400]/30 bg-[#C3F400]/10 text-[#C3F400]"
      : status === "SCHEDULED"
        ? "border-[#88A8FF]/30 bg-[#4D80F0]/15 text-[#88A8FF]"
        : status === "ARCHIVED"
          ? "border-[#6F7B95]/30 bg-[#6F7B95]/15 text-[#A3AEC5]"
          : "border-[#9D50FF]/30 bg-[#9D50FF]/15 text-[#D8BDFF]";

  return (
    <Badge className={cn("font-bold uppercase", statusClassName)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {CONTENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function TagBadge({ color, name }: { color: string; name: string }) {
  return (
    <Badge className="max-w-full border-[#24314D] bg-[#0F172A] text-[#E8EEFF]">
      <span
        className="size-2 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="truncate">{name}</span>
    </Badge>
  );
}

function PremiumState({
  action,
  description,
  title,
  tone = "default",
}: {
  action?: ReactNode;
  description: string;
  title: string;
  tone?: "danger" | "default";
}) {
  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-[24px] border border-dashed border-[#24314D] bg-[#121C33] p-6 text-center">
      <div className="max-w-md">
        <div
          className={cn(
            "mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border",
            tone === "danger"
              ? "border-[#F56C7A]/30 bg-[#F56C7A]/10 text-[#F56C7A]"
              : "border-[#C3F400]/30 bg-[#C3F400]/10 text-[#C3F400]",
          )}
        >
          <Sparkles className="size-6" />
        </div>
        <h4 className="text-2xl font-bold text-[#E8EEFF]">{title}</h4>
        <p className="mt-3 text-sm leading-6 text-[#A3AEC5]">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

function createExcerpt(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= 180) {
    return trimmed;
  }

  return `${trimmed.slice(0, 180)}...`;
}
