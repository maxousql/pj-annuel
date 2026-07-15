import type { NotionSyncLogPayload } from "@content-ai/shared";

type NotionSyncStatusPresentation = Readonly<{
  label: string;
  variant: "destructive" | "secondary" | "success" | "warning";
}>;

const NOTION_SYNC_STATUS_PRESENTATIONS = {
  FAILED: { label: "Échec", variant: "destructive" },
  PARTIAL: { label: "Partielle", variant: "warning" },
  SUCCEEDED: { label: "Réussie", variant: "success" },
} as const satisfies Record<
  NotionSyncLogPayload["status"],
  NotionSyncStatusPresentation
>;

const UNKNOWN_STATUS_PRESENTATION = {
  label: "Inconnu",
  variant: "secondary",
} as const satisfies NotionSyncStatusPresentation;

const NOTION_SYNC_OPERATION_LABELS: Record<string, string> = {
  BIDIRECTIONAL_SYNC: "Synchronisation bidirectionnelle",
  EXPORT_CONTENT: "Export de contenu",
  EXPORT_RESOURCE: "Export de ressource",
};

export function getNotionSyncStatusPresentation(
  status: string,
): NotionSyncStatusPresentation {
  return (
    NOTION_SYNC_STATUS_PRESENTATIONS[
      status as NotionSyncLogPayload["status"]
    ] ?? UNKNOWN_STATUS_PRESENTATION
  );
}

export function getNotionSyncOperationLabel(operation: string): string {
  return NOTION_SYNC_OPERATION_LABELS[operation] ?? "Synchronisation Notion";
}

export function formatNotionSyncCounts(
  processedCount: number,
  failedCount: number,
): string {
  const processedLabel =
    processedCount === 1 ? "élément traité" : "éléments traités";
  const failedLabel = failedCount === 1 ? "échec" : "échecs";

  return `${processedCount} ${processedLabel} · ${failedCount} ${failedLabel}`;
}
