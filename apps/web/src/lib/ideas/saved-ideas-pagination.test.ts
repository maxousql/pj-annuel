import { describe, expect, it } from "vitest";

import {
  clampSavedIdeasPage,
  paginateSavedIdeas,
  SAVED_IDEAS_PAGE_SIZE,
} from "./saved-ideas-pagination";

describe("saved ideas pagination", () => {
  const ideas = Array.from({ length: 21 }, (_, index) => ({
    id: `idea-${index + 1}`,
  }));

  it("shows at most six ideas on the first page", () => {
    const result = paginateSavedIdeas(ideas, 1);

    expect(SAVED_IDEAS_PAGE_SIZE).toBe(6);
    expect(result.items.map(({ id }) => id)).toEqual([
      "idea-1",
      "idea-2",
      "idea-3",
      "idea-4",
      "idea-5",
      "idea-6",
    ]);
    expect(result).toMatchObject({
      page: 1,
      totalItems: 21,
      totalPages: 4,
    });
  });

  it("returns the remaining ideas on the last page", () => {
    const result = paginateSavedIdeas(ideas, 4);

    expect(result.items.map(({ id }) => id)).toEqual([
      "idea-19",
      "idea-20",
      "idea-21",
    ]);
    expect(result.page).toBe(4);
  });

  it("keeps navigation within the available pages", () => {
    expect(paginateSavedIdeas(ideas, 0).page).toBe(1);
    expect(paginateSavedIdeas(ideas, 12).page).toBe(4);
    expect(clampSavedIdeasPage(2, Number.NaN)).toBe(1);
    expect(clampSavedIdeasPage(2, Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("moves back to the last valid page after the final item is removed", () => {
    expect(clampSavedIdeasPage(4, 18)).toBe(3);
    expect(paginateSavedIdeas(ideas.slice(0, 18), 4).page).toBe(3);
  });
});
