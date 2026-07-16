export const SAVED_IDEAS_PAGE_SIZE = 6;

export type SavedIdeasPage<T> = {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
};

export function clampSavedIdeasPage(
  page: number,
  totalItems: number,
  pageSize = SAVED_IDEAS_PAGE_SIZE,
): number {
  const normalizedPageSize = normalizePageSize(pageSize);
  const normalizedTotalItems = Number.isFinite(totalItems)
    ? Math.max(0, Math.trunc(totalItems))
    : 0;
  const totalPages = Math.max(
    1,
    Math.ceil(normalizedTotalItems / normalizedPageSize),
  );
  const normalizedPage = Number.isFinite(page) ? Math.trunc(page) : 1;

  return Math.min(totalPages, Math.max(1, normalizedPage));
}

export function paginateSavedIdeas<T>(
  ideas: readonly T[],
  page: number,
  pageSize = SAVED_IDEAS_PAGE_SIZE,
): SavedIdeasPage<T> {
  const normalizedPageSize = normalizePageSize(pageSize);
  const currentPage = clampSavedIdeasPage(
    page,
    ideas.length,
    normalizedPageSize,
  );
  const firstItemIndex = (currentPage - 1) * normalizedPageSize;

  return {
    items: ideas.slice(firstItemIndex, firstItemIndex + normalizedPageSize),
    page: currentPage,
    totalItems: ideas.length,
    totalPages: Math.max(1, Math.ceil(ideas.length / normalizedPageSize)),
  };
}

function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return SAVED_IDEAS_PAGE_SIZE;
  }

  return Math.trunc(pageSize);
}
