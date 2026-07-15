"use client";

import type {
  NotionConflictStrategy,
  NotionDatabasePayload,
  NotionIntegrationPayload,
  NotionParentPagePayload,
  NotionPropertyMappingPayload,
} from "@content-ai/shared";
import {
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Unplug,
  WandSparkles,
  Workflow,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/shell/loading-state";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  checkNotionSchemaHealth,
  connectNotion,
  disconnectNotion,
  fetchNotionIntegration,
  listNotionDatabases,
  listNotionParentPages,
  provisionNotionDatabase,
  repairNotionSchema,
  saveNotionMapping,
  syncNotion,
} from "@/lib/integrations/client";
import {
  formatNotionSyncCounts,
  getNotionSyncOperationLabel,
  getNotionSyncStatusPresentation,
} from "@/lib/integrations/notion-status";
import {
  canRepairNotionSchema,
  getNotionDriftGuidance,
} from "@/lib/integrations/notion-setup";

const DEFAULT_MAPPING: NotionPropertyMappingPayload = {
  channel: "Canal",
  date: "Date de publication",
  entityType: "Type",
  sourceUrl: "URL source",
  status: "Statut",
  title: "Nom",
};

const CONFLICT_ITEMS = [
  { label: "Modification la plus récente", value: "NEWEST_WINS" },
  { label: "Application prioritaire", value: "LOCAL_WINS" },
  { label: "Notion prioritaire", value: "NOTION_WINS" },
];

type Props = { organizationSlug: string };

export function NotionIntegrationPanel({ organizationSlug }: Props) {
  const [integration, setIntegration] =
    useState<NotionIntegrationPayload | null>(null);
  const [databases, setDatabases] = useState<NotionDatabasePayload[]>([]);
  const [pages, setPages] = useState<NotionParentPagePayload[]>([]);
  const [dataSourceId, setDataSourceId] = useState("");
  const [parentPageId, setParentPageId] = useState("");
  const [mapping, setMapping] =
    useState<NotionPropertyMappingPayload>(DEFAULT_MAPPING);
  const [conflictStrategy, setConflictStrategy] =
    useState<NotionConflictStrategy>("NEWEST_WINS");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const loadGeneration = useRef(0);

  async function load(
    slug = organizationSlug,
    generation = loadGeneration.current,
  ) {
    try {
      const result = await fetchNotionIntegration(slug);
      if (generation !== loadGeneration.current) return;
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setIntegration(result.data);
      setError(null);
      if (result.data.mapping) {
        setDataSourceId(result.data.mapping.dataSourceId ?? "");
        setParentPageId(result.data.mapping.parentPageId ?? "");
        setMapping(result.data.mapping.propertyMapping);
        setConflictStrategy(result.data.mapping.conflictStrategy);
      } else {
        setDataSourceId("");
        setParentPageId("");
        setMapping(DEFAULT_MAPPING);
        setConflictStrategy("NEWEST_WINS");
      }
    } catch (caught) {
      if (generation === loadGeneration.current) {
        setError(clientErrorMessage(caught));
      }
    }
  }

  useEffect(() => {
    const generation = ++loadGeneration.current;
    setIntegration(null);
    setDatabases([]);
    setPages([]);
    setDataSourceId("");
    setParentPageId("");
    setMapping(DEFAULT_MAPPING);
    setConflictStrategy("NEWEST_WINS");
    setBusy(null);
    setError(null);
    setSyncMessage(null);
    setProvisionDialogOpen(false);
    setRepairDialogOpen(false);
    void load(organizationSlug, generation);
    // `load` only depends on the organization route segment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationSlug]);

  useEffect(() => {
    if (!integration?.connected || !integration.canConfigure) return;
    let active = true;
    void Promise.allSettled([
      listNotionDatabases(organizationSlug),
      listNotionParentPages(organizationSlug),
    ]).then(([sourcesOutcome, pagesOutcome]) => {
      if (!active) return;
      const messages: string[] = [];
      if (sourcesOutcome.status === "fulfilled") {
        if (sourcesOutcome.value.error)
          messages.push(sourcesOutcome.value.error.message);
        else setDatabases(sourcesOutcome.value.data.databases);
      } else {
        messages.push(clientErrorMessage(sourcesOutcome.reason));
      }
      if (pagesOutcome.status === "fulfilled") {
        if (pagesOutcome.value.error)
          messages.push(pagesOutcome.value.error.message);
        else setPages(pagesOutcome.value.data.pages);
      } else {
        messages.push(clientErrorMessage(pagesOutcome.reason));
      }
      if (messages.length > 0) setError([...new Set(messages)].join(" "));
    });
    return () => {
      active = false;
    };
  }, [integration?.canConfigure, integration?.connected, organizationSlug]);

  async function handleConnect() {
    const generation = loadGeneration.current;
    setBusy("connect");
    try {
      const result = await connectNotion(organizationSlug);
      if (result.error) return toast.error(result.error.message);
      window.location.assign(result.data.authorizationUrl);
    } catch (caught) {
      toast.error(clientErrorMessage(caught));
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Déconnecter Notion et supprimer le mapping actif ?"))
      return;
    const generation = loadGeneration.current;
    setBusy("disconnect");
    try {
      const result = await disconnectNotion(organizationSlug);
      if (result.error) return toast.error(result.error.message);
      setDatabases([]);
      setPages([]);
      setDataSourceId("");
      setParentPageId("");
      setMapping(DEFAULT_MAPPING);
      setConflictStrategy("NEWEST_WINS");
      await load(organizationSlug, generation);
      toast.success("Notion a été déconnecté.");
    } catch (caught) {
      toast.error(clientErrorMessage(caught));
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  async function handleProvision() {
    if (!parentPageId)
      return toast.error("Sélectionnez une page parent Notion.");
    const generation = loadGeneration.current;
    setBusy("provision");
    try {
      const result = await provisionNotionDatabase(
        organizationSlug,
        parentPageId,
      );
      if (result.error) return toast.error(result.error.message);
      setProvisionDialogOpen(false);
      await load(organizationSlug, generation);
      toast.success(
        result.data.recovered
          ? "La base Planif existante a été retrouvée."
          : "La base Planif est prête.",
      );
    } catch (caught) {
      toast.error(clientErrorMessage(caught));
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  async function handleSaveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const source = databases.find(
      (candidate) => candidate.dataSourceId === dataSourceId,
    );
    if (!source)
      return toast.error("Sélectionnez une source de données Notion.");
    const generation = loadGeneration.current;
    setBusy("mapping");
    try {
      const result = await saveNotionMapping(organizationSlug, {
        conflictStrategy,
        databaseId: source.databaseId,
        databaseName: source.name,
        dataSourceId: source.dataSourceId,
        propertyMapping: mapping,
      });
      if (result.error) return toast.error(result.error.message);
      await load(organizationSlug, generation);
      toast.success("Mapping Notion enregistré.");
    } catch (caught) {
      toast.error(clientErrorMessage(caught));
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  async function handleHealthCheck() {
    const generation = loadGeneration.current;
    setBusy("health");
    try {
      const result = await checkNotionSchemaHealth(organizationSlug);
      await load(organizationSlug, generation);
      if (result.error) return toast.error(result.error.message);
      toast.success(
        result.data.health.status === "READY"
          ? "Le schéma Notion est sain."
          : "Une dérive du schéma a été détectée.",
      );
    } catch (caught) {
      await load(organizationSlug, generation);
      toast.error(clientErrorMessage(caught));
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  async function handleRepair() {
    const generation = loadGeneration.current;
    setBusy("repair");
    try {
      const result = await repairNotionSchema(organizationSlug);
      if (result.error) return toast.error(result.error.message);
      setRepairDialogOpen(false);
      await load(organizationSlug, generation);
      toast.success(
        "Le schéma Notion a été réparé sans suppression de colonne.",
      );
    } catch (caught) {
      toast.error(clientErrorMessage(caught));
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  async function handleSync() {
    const generation = loadGeneration.current;
    setSyncMessage(null);
    setBusy("sync");
    try {
      const result = await syncNotion(organizationSlug);
      if (result.error) {
        toast.error(result.error.message);
        await load(organizationSlug, generation);
        return;
      }
      await load(organizationSlug, generation);
      const message =
        result.data.message ??
        `${result.data.processedCount} élément(s) synchronisé(s), ${result.data.failedCount} échec(s).`;
      setSyncMessage(message);
      if (result.data.status === "FAILED") toast.error(message);
      else if (result.data.status === "PARTIAL") toast.warning(message);
      else toast.success(message);
    } catch (caught) {
      toast.error(clientErrorMessage(caught));
      await load(organizationSlug, generation);
    } finally {
      if (generation === loadGeneration.current) setBusy(null);
    }
  }

  if (!integration) {
    if (error) {
      return (
        <Card>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Intégration indisponible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }
    return <LoadingState title="Chargement de l'intégration" />;
  }

  const health = integration.mapping?.schemaHealth;
  const canRepair = health ? canRepairNotionSchema(health) : false;
  const pageItems = pages.map((page) => ({
    label: page.name,
    value: page.id,
  }));
  const databaseItems = databases.map((source) => ({
    label: source.name,
    value: source.dataSourceId,
  }));

  return (
    <div className="grid gap-5">
      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Intégration indisponible</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-5" /> Notion
            </CardTitle>
            <CardDescription>
              Une base Planif prête à synchroniser, ou un mapping avancé vers
              une source existante.
            </CardDescription>
          </div>
          <Badge variant={integration.connected ? "default" : "secondary"}>
            {integration.connected
              ? "Connecté"
              : integration.connection?.status === "ERROR"
                ? "À reconnecter"
                : "Non connecté"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {integration.connected ? (
            <>
              <span className="text-sm text-[color:var(--text-muted)]">
                {integration.connection?.workspaceName ?? "Workspace Notion"}
              </span>
              {integration.canConfigure ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={busy !== null}
                >
                  <Unplug className="size-4" /> Déconnecter
                </Button>
              ) : null}
            </>
          ) : integration.canConfigure ? (
            <Button
              type="button"
              onClick={handleConnect}
              disabled={busy !== null}
            >
              {busy === "connect" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Connecter Notion
            </Button>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">
              Un administrateur doit connecter Notion.
            </p>
          )}
        </CardContent>
      </Card>

      {integration.connected && integration.canConfigure ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Le mode automatique est recommandé. Aucune création distante n’est
              lancée sans votre confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue={
                integration.mapping?.setupMode === "ADVANCED"
                  ? "advanced"
                  : "managed"
              }
            >
              <TabsList>
                <TabsTrigger value="managed">
                  <WandSparkles /> Automatique
                </TabsTrigger>
                <TabsTrigger value="advanced">
                  <Database /> Mapping avancé
                </TabsTrigger>
              </TabsList>
              <TabsContent value="managed" className="grid gap-4 pt-4">
                <Alert>
                  <ShieldCheck />
                  <AlertTitle>Base gérée « Planif »</AlertTitle>
                  <AlertDescription>
                    Planif crée six colonnes, mémorise leurs identifiants et
                    absorbe les renommages futurs.
                  </AlertDescription>
                </Alert>
                <label className="grid gap-2 text-sm font-medium">
                  Page dans laquelle créer la base
                  <Select
                    items={pageItems}
                    value={parentPageId || null}
                    onValueChange={(value) => setParentPageId(value ?? "")}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Sélectionner une page autorisée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {pageItems.map((page) => (
                          <SelectItem key={page.value} value={page.value}>
                            {page.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>
                <div>
                  <Button
                    type="button"
                    disabled={!parentPageId || busy !== null}
                    onClick={() => setProvisionDialogOpen(true)}
                  >
                    <WandSparkles className="size-4" />
                    {integration.mapping?.managed
                      ? "Reprendre la configuration"
                      : "Créer ma base Planif"}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="advanced" className="pt-4">
                <form className="grid gap-4" onSubmit={handleSaveMapping}>
                  <label className="grid gap-2 text-sm font-medium">
                    Source de données cible
                    <Select
                      items={databaseItems}
                      value={dataSourceId || null}
                      onValueChange={(value) => setDataSourceId(value ?? "")}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Sélectionner une source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {databaseItems.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(mapping).map(([key, value]) => (
                      <label
                        className="grid gap-2 text-sm font-medium"
                        key={key}
                      >
                        {propertyLabel(key)}
                        <Input
                          value={value}
                          onChange={(event) =>
                            setMapping((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <label className="grid gap-2 text-sm font-medium">
                    Règle de conflit
                    <Select
                      items={CONFLICT_ITEMS}
                      value={conflictStrategy}
                      onValueChange={(value) =>
                        value &&
                        setConflictStrategy(value as NotionConflictStrategy)
                      }
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CONFLICT_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <div>
                    <Button
                      type="submit"
                      disabled={busy !== null || !dataSourceId}
                    >
                      {busy === "mapping" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Enregistrer le mapping
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : null}

      {integration.mapping ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Santé et synchronisation</CardTitle>
              <CardDescription>
                Base active : {integration.mapping.databaseName}
              </CardDescription>
            </div>
            <Badge
              variant={
                health?.status === "READY"
                  ? "success"
                  : health?.status === "DRIFTED"
                    ? "warning"
                    : "secondary"
              }
            >
              {healthLabel(health?.status)}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            {health?.status === "DRIFTED" ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Le schéma Notion a dérivé</AlertTitle>
                <AlertDescription>
                  <span className="block">
                    {canRepair
                      ? "Vérifiez les détails puis confirmez une réparation non destructive."
                      : getNotionDriftGuidance(health)}
                  </span>
                  {health.issues.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {health.issues.map((issue) => (
                        <li key={`${issue.code}-${issue.field}`}>
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {integration.canConfigure ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={handleHealthCheck}
                >
                  {busy === "health" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  Contrôler le schéma
                </Button>
              ) : null}
              {integration.canConfigure && canRepair ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => setRepairDialogOpen(true)}
                >
                  Réparer
                </Button>
              ) : null}
              {integration.canSync ? (
                <Button
                  type="button"
                  onClick={handleSync}
                  disabled={busy !== null || health?.status !== "READY"}
                >
                  {busy === "sync" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Synchroniser
                </Button>
              ) : null}
            </div>
            {syncMessage ? <p className="text-sm">{syncMessage}</p> : null}
            <SyncLogs integration={integration} />
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={provisionDialogOpen} onOpenChange={setProvisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer la base Planif ?</DialogTitle>
            <DialogDescription>
              Une base et ses six propriétés seront créées sous la page choisie.
              En cas de réponse réseau ambiguë, Planif recherchera son marqueur
              avant toute nouvelle création.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Annuler
            </DialogClose>
            <Button
              type="button"
              onClick={handleProvision}
              disabled={busy !== null}
            >
              {busy === "provision" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Confirmer la création
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repairDialogOpen} onOpenChange={setRepairDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réparer le schéma Notion ?</DialogTitle>
            <DialogDescription>
              Planif ajoutera les propriétés ou options manquantes. Aucune
              propriété existante ne sera supprimée ni convertie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Annuler
            </DialogClose>
            <Button
              type="button"
              onClick={handleRepair}
              disabled={busy !== null}
            >
              {busy === "repair" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Confirmer la réparation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SyncLogs({ integration }: { integration: NotionIntegrationPayload }) {
  if (integration.logs.length === 0) {
    return (
      <p className="text-sm text-[color:var(--text-muted)]">
        Aucune synchronisation exécutée.
      </p>
    );
  }
  return (
    <div className="grid gap-2">
      {integration.logs.map((log) => {
        const presentation = getNotionSyncStatusPresentation(log.status);
        return (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            key={log.id}
          >
            <span>{getNotionSyncOperationLabel(log.operation)}</span>
            <span>
              {formatNotionSyncCounts(log.processedCount, log.failedCount)}
            </span>
            <Badge variant={presentation.variant}>{presentation.label}</Badge>
            {log.errorMessage ? (
              <span className="w-full text-[color:var(--text-muted)]">
                {log.errorMessage}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function healthLabel(status: string | undefined): string {
  return (
    {
      DRIFTED: "À réparer",
      PROVISIONING: "Configuration en cours",
      READY: "Prête",
      UNAVAILABLE: "Indisponible",
      UNCHECKED: "À contrôler",
    }[status ?? "UNCHECKED"] ?? "À contrôler"
  );
}

function propertyLabel(key: string): string {
  return (
    {
      channel: "Canal",
      date: "Date",
      entityType: "Type d'élément",
      sourceUrl: "URL source",
      status: "Statut",
      title: "Titre",
    }[key] ?? key
  );
}

function clientErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "L’intégration Notion est momentanément indisponible.";
}
