import type { NotionSchemaHealthPayload } from "@content-ai/shared";

export function canRepairNotionSchema(
  health: NotionSchemaHealthPayload,
): boolean {
  return (
    health.status === "DRIFTED" &&
    health.issues.length > 0 &&
    health.issues.every((issue) => issue.reparable)
  );
}

export function getNotionDriftGuidance(
  health: NotionSchemaHealthPayload | undefined,
): string {
  if (!health || health.issues.length === 0) {
    return "Relancez le contrôle du schéma pour obtenir le détail de la dérive.";
  }
  return health.issues.some((issue) => !issue.reparable)
    ? "La source configurée doit être sélectionnée de nouveau dans le mapping avancé."
    : "Vérifiez les détails puis confirmez une réparation non destructive.";
}
