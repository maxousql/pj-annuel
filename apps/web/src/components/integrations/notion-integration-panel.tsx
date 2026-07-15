"use client";

import type {
  NotionConflictStrategy,
  NotionDatabasePayload,
  NotionIntegrationPayload,
  NotionPropertyMappingPayload,
} from "@content-ai/shared";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Unplug,
  Workflow,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  connectNotion,
  disconnectNotion,
  fetchNotionIntegration,
  listNotionDatabases,
  saveNotionMapping,
  syncNotion,
} from "@/lib/integrations/client";

const DEFAULT_MAPPING: NotionPropertyMappingPayload = {
  channel: "Canal",
  date: "Date de publication",
  entityType: "Type",
  sourceUrl: "URL source",
  status: "Statut",
  title: "Nom",
};

type Props = { organizationSlug: string };

export function NotionIntegrationPanel({ organizationSlug }: Props) {
  const [integration, setIntegration] =
    useState<NotionIntegrationPayload | null>(null);
  const [databases, setDatabases] = useState<NotionDatabasePayload[]>([]);
  const [databaseId, setDatabaseId] = useState("");
  const [mapping, setMapping] =
    useState<NotionPropertyMappingPayload>(DEFAULT_MAPPING);
  const [conflictStrategy, setConflictStrategy] =
    useState<NotionConflictStrategy>("NEWEST_WINS");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function load() {
    const result = await fetchNotionIntegration(organizationSlug);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setIntegration(result.data);
    setError(null);

    if (result.data.mapping) {
      setDatabaseId(result.data.mapping.databaseId);
      setMapping(result.data.mapping.propertyMapping);
      setConflictStrategy(result.data.mapping.conflictStrategy);
    }
  }

  useEffect(() => {
    void load();
    // `load` only depends on the organization route segment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationSlug]);

  useEffect(() => {
    if (!integration?.connected || !integration.canConfigure) {
      return;
    }

    let active = true;

    void listNotionDatabases(organizationSlug).then((result) => {
      if (!active || result.error) {
        return;
      }

      setDatabases(result.data.databases);
    });

    return () => {
      active = false;
    };
  }, [integration?.canConfigure, integration?.connected, organizationSlug]);

  async function handleConnect() {
    setBusy("connect");
    const result = await connectNotion(organizationSlug);
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    window.location.assign(result.data.authorizationUrl);
  }

  async function handleDisconnect() {
    if (!window.confirm("Deconnecter Notion et supprimer le mapping actif ?")) {
      return;
    }

    setBusy("disconnect");
    const result = await disconnectNotion(organizationSlug);
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setDatabases([]);
    setDatabaseId("");
    await load();
    toast.success("Notion a ete deconnecte.");
  }

  async function handleSaveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const database = databases.find((candidate) => candidate.id === databaseId);

    if (!database) {
      toast.error("Selectionnez une base Notion.");
      return;
    }

    setBusy("mapping");
    const result = await saveNotionMapping(organizationSlug, {
      conflictStrategy,
      databaseId: database.id,
      databaseName: database.name,
      propertyMapping: mapping,
    });
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await load();
    toast.success("Mapping Notion enregistre.");
  }

  async function handleSync() {
    setSyncMessage(null);
    setBusy("sync");
    const result = await syncNotion(organizationSlug);
    setBusy(null);

    if (result.error) {
      toast.error(result.error.message);
      await load();
      return;
    }

    await load();
    const message =
      result.data.message ??
      `${result.data.processedCount} element(s) synchronise(s), ${result.data.failedCount} echec(s).`;
    setSyncMessage(message);
    if (result.data.status === "FAILED") toast.error(message);
    else if (result.data.status === "PARTIAL") toast.warning(message);
    else toast.success(message);
  }

  if (!integration) {
    return <LoadingState title="Chargement de l'intégration" />;
  }

  return (
    <div className="grid gap-5">
      {error ? <p className="form-error">{error}</p> : null}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-5" /> Notion
            </CardTitle>
            <CardDescription>
              Export des contenus et ressources, puis synchronisation des
              statuts et dates.
            </CardDescription>
          </div>
          <Badge variant={integration.connected ? "default" : "secondary"}>
            {integration.connected
              ? "Connecte"
              : integration.connection?.status === "ERROR"
                ? "A reconnecter"
                : "Non connecte"}
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
                  <Unplug className="size-4" /> Deconnecter
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
            <CardTitle>Base et proprietes</CardTitle>
            <CardDescription>
              Les six proprietes doivent exister dans la base selectionnee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSaveMapping}>
              <label className="grid gap-2 text-sm font-medium">
                Base cible
                <select
                  className="h-11 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3"
                  value={databaseId}
                  onChange={(event) => setDatabaseId(event.target.value)}
                  required
                >
                  <option value="">Selectionner une base</option>
                  {databases.map((database) => (
                    <option key={database.id} value={database.id}>
                      {database.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(mapping).map(([key, value]) => (
                  <label className="grid gap-2 text-sm font-medium" key={key}>
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
                Regle de conflit
                <select
                  className="h-11 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] px-3"
                  value={conflictStrategy}
                  onChange={(event) =>
                    setConflictStrategy(
                      event.target.value as NotionConflictStrategy,
                    )
                  }
                >
                  <option value="NEWEST_WINS">
                    Modification la plus recente
                  </option>
                  <option value="LOCAL_WINS">Application prioritaire</option>
                  <option value="NOTION_WINS">Notion prioritaire</option>
                </select>
              </label>
              <div>
                <Button type="submit" disabled={busy !== null}>
                  {busy === "mapping" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Enregistrer le mapping
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {integration.mapping ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Synchronisation</CardTitle>
              <CardDescription>
                Base active : {integration.mapping.databaseName}
              </CardDescription>
            </div>
            {integration.canSync ? (
              <Button
                type="button"
                onClick={handleSync}
                disabled={busy !== null}
              >
                {busy === "sync" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Synchroniser
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {syncMessage ? <p className="mb-3 text-sm">{syncMessage}</p> : null}
            {integration.logs.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">
                Aucune synchronisation executee.
              </p>
            ) : (
              <div className="grid gap-2">
                {integration.logs.map((log) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
                    key={log.id}
                  >
                    <span>{log.operation}</span>
                    <span>
                      {log.processedCount} traite(s) · {log.failedCount}{" "}
                      echec(s)
                    </span>
                    <Badge
                      variant={
                        log.status === "SUCCEEDED" ? "default" : "secondary"
                      }
                    >
                      {log.status}
                    </Badge>
                    {log.errorMessage ? (
                      <span className="w-full text-[color:var(--text-muted)]">
                        {log.errorMessage}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function propertyLabel(key: string): string {
  return (
    {
      channel: "Canal",
      date: "Date",
      entityType: "Type d'element",
      sourceUrl: "URL source",
      status: "Statut",
      title: "Titre",
    }[key] ?? key
  );
}
