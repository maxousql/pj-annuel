import { describe, expect, it } from "vitest";

import {
  formatNotionSyncCounts,
  getNotionSyncOperationLabel,
  getNotionSyncStatusPresentation,
} from "./notion-status";

describe("getNotionSyncStatusPresentation", () => {
  it.each([
    ["SUCCEEDED", { label: "Réussie", variant: "success" }],
    ["PARTIAL", { label: "Partielle", variant: "warning" }],
    ["FAILED", { label: "Échec", variant: "destructive" }],
  ] as const)("localise et colore le statut %s", (status, expected) => {
    expect(getNotionSyncStatusPresentation(status)).toEqual(expected);
  });

  it("utilise une presentation neutre pour un statut inconnu", () => {
    expect(getNotionSyncStatusPresentation("UNKNOWN")).toEqual({
      label: "Inconnu",
      variant: "secondary",
    });
  });
});

describe("getNotionSyncOperationLabel", () => {
  it.each([
    ["BIDIRECTIONAL_SYNC", "Synchronisation bidirectionnelle"],
    ["EXPORT_CONTENT", "Export de contenu"],
    ["EXPORT_RESOURCE", "Export de ressource"],
    ["UNKNOWN", "Synchronisation Notion"],
  ])("localise l'operation %s", (operation, expected) => {
    expect(getNotionSyncOperationLabel(operation)).toBe(expected);
  });
});

describe("formatNotionSyncCounts", () => {
  it.each([
    [0, 0, "0 éléments traités · 0 échecs"],
    [1, 1, "1 élément traité · 1 échec"],
    [2, 3, "2 éléments traités · 3 échecs"],
  ])("accorde les compteurs", (processed, failed, expected) => {
    expect(formatNotionSyncCounts(processed, failed)).toBe(expected);
  });
});
