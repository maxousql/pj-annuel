"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AutomationsPayload,
  NotificationPayload,
  RecommendationPayload,
} from "@content-ai/shared";
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shell/loading-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAutomations,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateRecommendationStatus,
} from "@/lib/automations/client";
import { cn } from "@/lib/utils";

type NotificationsWorkspaceProps = {
  organizationSlug: string;
};

const panelClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/95 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)]";

export function NotificationsWorkspace({
  organizationSlug,
}: NotificationsWorkspaceProps) {
  const [state, setState] = useState<AutomationsPayload | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const unreadNotifications = useMemo(() => {
    return (state?.notifications ?? []).filter(
      (notification) => notification.status === "UNREAD",
    );
  }, [state?.notifications]);

  const reminderNotifications = state?.notifications ?? [];
  const recommendations = state?.recommendations ?? [];

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      const result = await fetchAutomations(organizationSlug);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setLoadError(result.error.message);
        toast.error(result.error.message);
      } else {
        setState(result.data);
        setLoadError(null);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [organizationSlug]);

  async function reload() {
    const result = await fetchAutomations(organizationSlug);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setState(result.data);
    setLoadError(null);
  }

  async function handleRead(notificationId: string) {
    setBusyKey(`notification:${notificationId}`);
    const result = await markNotificationAsRead(
      organizationSlug,
      notificationId,
    );
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success("Notification marquee comme lue.");
  }

  async function handleReadAll() {
    setBusyKey("notifications:read-all");
    const result = await markAllNotificationsAsRead(organizationSlug);
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success(
      result.data.updatedCount > 0
        ? `${result.data.updatedCount} notification(s) marquee(s) comme lues.`
        : "Aucune notification non lue.",
    );
  }

  async function handleRecommendationStatus(
    recommendationId: string,
    status: "APPLIED" | "DISMISSED",
  ) {
    setBusyKey(`recommendation:${recommendationId}`);
    const result = await updateRecommendationStatus(
      organizationSlug,
      recommendationId,
      status,
    );
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    await reload();
    toast.success(
      status === "APPLIED"
        ? "Recommandation marquee comme faite."
        : "Recommandation ignoree.",
    );
  }

  if (isLoading) {
    return (
      <LoadingState title="Chargement des notifications" />
    );
  }

  if (!state) {
    return (
      <Card className={cn(panelClass, "rounded-3xl")}>
        <CardContent className="p-8">
          {loadError ?? "Notifications indisponibles."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(panelClass, "rounded-3xl py-0")}>
      <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Inbox className="size-6 text-[color:var(--klein)]" />
              Centre de notifications
            </CardTitle>
            <CardDescription>
              Rappels, non lues et recommandations editoriales.
            </CardDescription>
          </div>
          <Button
            className="h-11 rounded-2xl"
            disabled={
              unreadNotifications.length === 0 ||
              busyKey === "notifications:read-all"
            }
            type="button"
            variant="outline"
            onClick={handleReadAll}
          >
            {busyKey === "notifications:read-all" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Tout marquer comme lu
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <Tabs defaultValue="unread" className="gap-5">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-1">
            <TabsTrigger
              className="h-10 flex-none rounded-xl px-3 data-active:bg-[color:var(--paper-card)] data-active:text-[color:var(--ink)]"
              value="unread"
            >
              Non lues
              <Badge>{unreadNotifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              className="h-10 flex-none rounded-xl px-3 data-active:bg-[color:var(--paper-card)] data-active:text-[color:var(--ink)]"
              value="reminders"
            >
              Rappels
              <Badge>{reminderNotifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              className="h-10 flex-none rounded-xl px-3 data-active:bg-[color:var(--paper-card)] data-active:text-[color:var(--ink)]"
              value="recommendations"
            >
              Recommandations
              <Badge>{recommendations.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread">
            <NotificationList
              busyKey={busyKey}
              emptyLabel="Aucune notification non lue."
              notifications={unreadNotifications}
              onRead={handleRead}
            />
          </TabsContent>
          <TabsContent value="reminders">
            <NotificationList
              busyKey={busyKey}
              emptyLabel="Aucun rappel pour le moment."
              notifications={reminderNotifications}
              onRead={handleRead}
            />
          </TabsContent>
          <TabsContent value="recommendations">
            <RecommendationList
              busyKey={busyKey}
              recommendations={recommendations}
              onStatus={handleRecommendationStatus}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function NotificationList({
  busyKey,
  emptyLabel,
  notifications,
  onRead,
}: {
  busyKey: string | null;
  emptyLabel: string;
  notifications: NotificationPayload[];
  onRead: (notificationId: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-8 text-center">
        <Bell className="mx-auto mb-3 size-8 text-[color:var(--klein)]" />
        <p className="text-sm font-bold text-[color:var(--ink)]">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {notifications.map((notification) => (
        <NotificationRow
          busyKey={busyKey}
          notification={notification}
          key={notification.id}
          onRead={onRead}
        />
      ))}
    </div>
  );
}

function NotificationRow({
  busyKey,
  notification,
  onRead,
}: {
  busyKey: string | null;
  notification: NotificationPayload;
  onRead: (notificationId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={notification.status === "UNREAD" ? "default" : "outline"}
            >
              {notification.status === "UNREAD" ? "Non lue" : "Lue"}
            </Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              {formatDate(notification.createdAt)}
            </span>
          </div>
          <strong className="mt-2 block text-[color:var(--ink)]">
            {notification.title}
          </strong>
          <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
            {notification.body}
          </p>
        </div>
        {notification.status === "UNREAD" ? (
          <Button
            className="h-9 shrink-0 rounded-xl"
            disabled={busyKey === `notification:${notification.id}`}
            type="button"
            variant="outline"
            onClick={() => onRead(notification.id)}
          >
            {busyKey === `notification:${notification.id}` ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Marquer lu
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RecommendationList({
  busyKey,
  onStatus,
  recommendations,
}: {
  busyKey: string | null;
  onStatus: (recommendationId: string, status: "APPLIED" | "DISMISSED") => void;
  recommendations: RecommendationPayload[];
}) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-8 text-center">
        <Sparkles className="mx-auto mb-3 size-8 text-[color:var(--rubric)]" />
        <p className="text-sm font-bold text-[color:var(--ink)]">
          Aucune recommandation ouverte.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {recommendations.map((recommendation) => (
        <RecommendationRow
          busyKey={busyKey}
          recommendation={recommendation}
          key={recommendation.id}
          onStatus={onStatus}
        />
      ))}
    </div>
  );
}

function RecommendationRow({
  busyKey,
  onStatus,
  recommendation,
}: {
  busyKey: string | null;
  onStatus: (recommendationId: string, status: "APPLIED" | "DISMISSED") => void;
  recommendation: RecommendationPayload;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge>{recommendation.type}</Badge>
          <p className="mt-2 text-sm font-medium leading-6">
            {recommendation.message}
          </p>
          <span className="mt-2 block text-xs text-[color:var(--text-muted)]">
            {formatDate(recommendation.createdAt)}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            className="h-9 rounded-xl"
            disabled={busyKey === `recommendation:${recommendation.id}`}
            type="button"
            variant="outline"
            onClick={() => onStatus(recommendation.id, "DISMISSED")}
          >
            <X className="size-4" />
            Ignorer
          </Button>
          <Button
            className="h-9 rounded-xl"
            disabled={busyKey === `recommendation:${recommendation.id}`}
            type="button"
            onClick={() => onStatus(recommendation.id, "APPLIED")}
          >
            <Check className="size-4" />
            Fait
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
