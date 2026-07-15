"use client";

import { useEffect, useRef, useState } from "react";
import type {
  IdeaDiscoveryCandidatePayload,
  IdeaDiscoveryFeedPayload,
  IdeaDiscoveryProfilePayload,
  IdeaDiscoveryRejectionReason,
  IdeaDiscoverySignal,
} from "@content-ai/shared";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudUpload,
  Compass,
  Lightbulb,
  Loader2,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  ThumbsDown,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  type Variants,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { toast } from "sonner";

import { CONTENT_FORMAT_LABELS } from "@/components/contents/content-labels";
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
import {
  fetchIdeaDiscoveryFeed,
  generateIdeaDiscoveryFeed,
  resetIdeaDiscoveryPreferences,
  submitIdeaDiscoveryFeedback,
} from "@/lib/ideas/client";
import {
  mergeCanonicalDiscoveryProfile,
  removeDiscoveryCandidate,
  restoreDiscoveryCandidate,
} from "@/lib/ideas/discovery-optimistic";
import { cn } from "@/lib/utils";

type IdeaDiscoveryWorkspaceProps = {
  onIdeaSaved?: () => void;
  organizationSlug: string;
};

const panelClass =
  "border-[color:var(--border-strong)] bg-[color:var(--paper-card)]/95 text-[color:var(--ink)] shadow-[0_2px_10px_rgba(23,19,15,0.05)] ring-1 ring-white/[0.03]";

type SwipeDirection = -1 | 0 | 1;

const REJECTION_REASONS: Array<{
  description: string;
  label: string;
  value: IdeaDiscoveryRejectionReason;
}> = [
  {
    description: "Le sujet ne correspond pas à votre ligne éditoriale.",
    label: "Hors sujet",
    value: "OFF_TOPIC",
  },
  {
    description: "Votre organisation a déjà couvert ce sujet.",
    label: "Déjà traité",
    value: "ALREADY_COVERED",
  },
  {
    description: "L'angle convient, mais pas le format proposé.",
    label: "Mauvais format",
    value: "WRONG_FORMAT",
  },
  {
    description: "La proposition manque de précision ou de singularité.",
    label: "Trop générique",
    value: "TOO_GENERIC",
  },
  {
    description: "L'idée peut être pertinente à un autre moment.",
    label: "Pas maintenant",
    value: "NOT_NOW",
  },
];

export function IdeaDiscoveryWorkspace({
  onIdeaSaved,
  organizationSlug,
}: IdeaDiscoveryWorkspaceProps) {
  const [feed, setFeed] = useState<IdeaDiscoveryFeedPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(0);
  const [selectedReason, setSelectedReason] =
    useState<IdeaDiscoveryRejectionReason | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingCandidateIdsRef = useRef(new Set<string>());
  const requestEpochRef = useRef(0);
  const shouldFocusNextCard = useRef(false);
  const organizationSlugRef = useRef(organizationSlug);
  const reduceMotion = useReducedMotion();
  organizationSlugRef.current = organizationSlug;

  const activeCandidate = feed?.candidates[0] ?? null;

  useEffect(() => {
    let isMounted = true;
    const requestSlug = organizationSlug;
    const requestEpoch = requestEpochRef.current + 1;
    requestEpochRef.current = requestEpoch;
    pendingCandidateIdsRef.current.clear();

    async function load() {
      setIsLoading(true);
      setIsGenerating(false);
      setPendingFeedbackCount(0);
      setSwipeDirection(0);
      setSelectedReason(null);
      setIsRejecting(false);
      setIsResetting(false);
      setFeed(null);
      setError(null);
      const currentFeed = await fetchIdeaDiscoveryFeed(requestSlug);

      if (!isMounted || organizationSlugRef.current !== requestSlug) return;

      if (currentFeed.error) {
        setError(currentFeed.error.message);
        setIsLoading(false);
        return;
      }

      if (currentFeed.data.candidates.length > 0) {
        setFeed(currentFeed.data);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsGenerating(true);
      const generatedFeed = await generateIdeaDiscoveryFeed(requestSlug);

      if (!isMounted || organizationSlugRef.current !== requestSlug) return;

      if (generatedFeed.error) {
        setFeed(currentFeed.data);
        setError(generatedFeed.error.message);
      } else {
        setFeed(generatedFeed.data);
        setError(null);
      }

      setIsGenerating(false);
      setIsLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
      if (requestEpochRef.current === requestEpoch) {
        requestEpochRef.current += 1;
      }
    };
  }, [organizationSlug]);

  useEffect(() => {
    if (activeCandidate && shouldFocusNextCard.current) {
      headingRef.current?.focus();
      shouldFocusNextCard.current = false;
    }
  }, [activeCandidate]);

  async function generateNewSelection() {
    if (pendingFeedbackCount > 0) return;

    const requestSlug = organizationSlug;
    setError(null);
    setIsRejecting(false);
    setSelectedReason(null);
    setIsGenerating(true);

    const result = await generateIdeaDiscoveryFeed(requestSlug);

    if (organizationSlugRef.current !== requestSlug) return;

    setIsGenerating(false);

    if (result.error) {
      setError(result.error.message);
      toast.error(result.error.message);
      return;
    }

    setFeed(result.data);
    setAnnouncement(
      `${result.data.candidates.length} nouvelle${
        result.data.candidates.length > 1 ? "s" : ""
      } proposition${result.data.candidates.length > 1 ? "s" : ""}.`,
    );
  }

  async function sendFeedback(
    candidate: IdeaDiscoveryCandidatePayload,
    signal: IdeaDiscoverySignal,
    reason?: IdeaDiscoveryRejectionReason,
  ) {
    if (pendingCandidateIdsRef.current.has(candidate.id)) return;

    const requestSlug = organizationSlug;
    const requestEpoch = requestEpochRef.current;
    const candidateId = candidate.id;
    pendingCandidateIdsRef.current.add(candidateId);
    setError(null);
    setSwipeDirection(toSwipeDirection(signal));
    setPendingFeedbackCount((current) => current + 1);
    setFeed((current) =>
      current ? removeDiscoveryCandidate(current, candidateId) : current,
    );
    setIsRejecting(false);
    setSelectedReason(null);
    shouldFocusNextCard.current = true;
    setAnnouncement(toPendingAnnouncement(signal));

    const result = await submitIdeaDiscoveryFeedback(
      requestSlug,
      candidateId,
      signal,
      reason,
    );

    if (
      organizationSlugRef.current !== requestSlug ||
      requestEpochRef.current !== requestEpoch
    ) {
      return;
    }

    if (result.error) {
      setFeed((current) =>
        current ? restoreDiscoveryCandidate(current, candidate) : current,
      );
      setIsRejecting(signal === "DISLIKE" && Boolean(reason));
      setSelectedReason(reason ?? null);
      shouldFocusNextCard.current = true;
      setAnnouncement(
        "L'enregistrement a échoué. La proposition a été restaurée.",
      );
      setError(result.error.message);
      toast.error(result.error.message);
    } else {
      const savedSignal = result.data.feedback.signal;
      setFeed((current) =>
        current
          ? mergeCanonicalDiscoveryProfile(current, result.data.profile)
          : current,
      );

      if (savedSignal === "LIKE") {
        onIdeaSaved?.();
        setAnnouncement("Idée ajoutée à vos idées sauvegardées.");
        toast.success("Idée ajoutée à vos idées sauvegardées.");
      } else if (savedSignal === "DISLIKE") {
        setAnnouncement("Préférence prise en compte.");
      } else {
        setAnnouncement("Proposition passée sans modifier vos préférences.");
      }
    }

    pendingCandidateIdsRef.current.delete(candidateId);
    setPendingFeedbackCount((current) => Math.max(0, current - 1));
  }

  async function resetPreferences() {
    if (pendingFeedbackCount > 0) return;

    const requestSlug = organizationSlug;
    setIsResetting(true);
    setError(null);

    const result = await resetIdeaDiscoveryPreferences(requestSlug);

    if (organizationSlugRef.current !== requestSlug) return;

    setIsResetting(false);

    if (result.error) {
      setError(result.error.message);
      toast.error(result.error.message);
      return;
    }

    setFeed((current) =>
      current ? { ...current, profile: result.data.profile } : current,
    );
    setResetDialogOpen(false);
    setAnnouncement("Préférences apprises réinitialisées.");
    toast.success("Les préférences apprises ont été réinitialisées.");
  }

  if (isLoading) {
    return (
      <DiscoveryLoadingState
        generating={isGenerating}
        title={
          isGenerating
            ? "Préparation de votre sélection"
            : "Chargement de votre sélection"
        }
      />
    );
  }

  if (!feed) {
    return (
      <DiscoveryUnavailableState
        error={error}
        isGenerating={isGenerating}
        onRetry={() => void generateNewSelection()}
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="discovery-selection-title" className="min-w-0">
        <Card className={cn(panelClass, "overflow-hidden rounded-3xl py-0")}>
          <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--klein)]">
                  <Compass className="size-4" />
                  Sélection éditoriale
                </p>
                <CardTitle
                  className="mt-2 text-2xl font-bold text-[color:var(--ink)]"
                  id="discovery-selection-title"
                >
                  Des idées choisies pour votre organisation
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl leading-6 text-[color:var(--text-muted)]">
                  Gardez les propositions utiles, précisez celles qui ne
                  correspondent pas à votre organisation, ou passez sans
                  influencer son profil.
                </CardDescription>
              </div>
              <div
                className="flex flex-wrap items-center gap-2"
                aria-live="polite"
              >
                {pendingFeedbackCount > 0 ? (
                  <Badge className="h-8 gap-1.5 bg-[color:var(--klein)]/10 px-3 text-[color:var(--klein)] ring-1 ring-[color:var(--klein)]/20">
                    <CloudUpload className="size-3.5" />
                    {pendingFeedbackCount} en cours
                  </Badge>
                ) : null}
                <Badge className="h-8 shrink-0 bg-[color:var(--paper-2)] px-3 text-[color:var(--text-muted)] ring-1 ring-[color:var(--border-strong)]">
                  {feed.candidates.length} restante
                  {feed.candidates.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-5 py-6 sm:px-6 sm:py-7">
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>

            {error ? (
              <Alert className="mb-5 border-[color:var(--danger)]/40 bg-[color:var(--danger)]/8 text-[color:var(--danger)]">
                <AlertTitle>Action impossible</AlertTitle>
                <AlertDescription className="text-[color:var(--danger)]/85">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}

            {activeCandidate ? (
              <div className="mx-auto max-w-3xl pb-2 sm:px-4">
                <div className="relative grid pb-4">
                  {feed.candidates.length > 2 ? (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-10 bottom-0 top-7 rounded-[1.75rem] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)]/55"
                    />
                  ) : null}
                  {feed.candidates.length > 1 ? (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-5 bottom-2 top-3 rounded-[1.75rem] border border-[color:var(--border-strong)] bg-[color:var(--paper-card)]"
                    />
                  ) : null}

                  <AnimatePresence
                    custom={{
                      direction: swipeDirection,
                      reduceMotion: Boolean(reduceMotion),
                    }}
                    initial={false}
                  >
                    <DiscoveryCandidateCard
                      candidate={activeCandidate}
                      headingRef={headingRef}
                      isRejecting={isRejecting}
                      key={activeCandidate.id}
                      reduceMotion={Boolean(reduceMotion)}
                      selectedReason={selectedReason}
                      onCancelReject={() => {
                        setIsRejecting(false);
                        setSelectedReason(null);
                      }}
                      onChooseReason={setSelectedReason}
                      onDislike={() => setIsRejecting(true)}
                      onFeedback={(signal, reason) =>
                        void sendFeedback(activeCandidate, signal, reason)
                      }
                    />
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 text-xs font-medium text-[color:var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowLeft className="size-3.5 text-[color:var(--danger)]" />
                    Glissez pour refuser
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    Glissez pour garder
                    <ArrowRight className="size-3.5 text-[color:var(--rubric)]" />
                  </span>
                </div>
              </div>
            ) : (
              <DiscoveryCompleteState
                pendingFeedbackCount={pendingFeedbackCount}
                isGenerating={isGenerating}
                onGenerate={() => void generateNewSelection()}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <PreferenceProfileCard
        isResetting={isResetting || pendingFeedbackCount > 0}
        profile={feed.profile}
        onReset={() => setResetDialogOpen(true)}
      />

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="rounded-3xl border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--ink)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Réinitialiser les préférences de l'organisation ?
            </DialogTitle>
            <DialogDescription className="leading-6 text-[color:var(--text-muted)]">
              Les prochaines sélections repartiront du contexte éditorial de
              l'organisation. Votre historique de réactions sera conservé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[color:var(--border-strong)] bg-[color:var(--paper-2)]">
            <DialogClose render={<Button variant="outline" />}>
              Annuler
            </DialogClose>
            <Button
              disabled={isResetting}
              type="button"
              onClick={() => void resetPreferences()}
            >
              {isResetting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DiscoveryCardMotionContext = {
  direction: SwipeDirection;
  reduceMotion: boolean;
};

const discoveryCardVariants: Variants = {
  animate: {
    opacity: 1,
    pointerEvents: "auto",
    rotate: 0,
    scale: 1,
    x: 0,
    y: 0,
    zIndex: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: ({ direction, reduceMotion }: DiscoveryCardMotionContext) =>
    reduceMotion
      ? {
          opacity: 0,
          pointerEvents: "none",
          transition: { duration: 0.08 },
          zIndex: 2,
        }
      : direction === 0
        ? {
            opacity: 0,
            pointerEvents: "none",
            scale: 0.96,
            transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
            y: -36,
            zIndex: 2,
          }
        : {
            opacity: 0,
            pointerEvents: "none",
            rotate: direction * 12,
            transition: {
              damping: 28,
              mass: 0.72,
              stiffness: 250,
              type: "spring",
            },
            x: direction * 900,
            zIndex: 2,
          },
  initial: ({ reduceMotion }: DiscoveryCardMotionContext) =>
    reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.97, y: 14, zIndex: 0 },
};

function DiscoveryCandidateCard({
  candidate,
  headingRef,
  isRejecting,
  onCancelReject,
  onChooseReason,
  onDislike,
  onFeedback,
  reduceMotion,
  selectedReason,
}: {
  candidate: IdeaDiscoveryCandidatePayload;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  isRejecting: boolean;
  onCancelReject: () => void;
  onChooseReason: (reason: IdeaDiscoveryRejectionReason) => void;
  onDislike: () => void;
  onFeedback: (
    signal: IdeaDiscoverySignal,
    reason?: IdeaDiscoveryRejectionReason,
  ) => void;
  reduceMotion: boolean;
  selectedReason: IdeaDiscoveryRejectionReason | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10]);
  const rejectOpacity = useTransform(x, [-130, -30, 0], [1, 0.2, 0]);
  const keepOpacity = useTransform(x, [0, 30, 130], [0, 0.2, 1]);

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const reachedDistance = Math.abs(info.offset.x) >= 105;
    const reachedVelocity = Math.abs(info.velocity.x) >= 650;

    if (!reachedDistance && !reachedVelocity) return;

    const horizontalIntent =
      Math.abs(info.offset.x) >= 20 ? info.offset.x : info.velocity.x;
    onFeedback(horizontalIntent > 0 ? "LIKE" : "DISLIKE");
  }

  return (
    <motion.article
      animate="animate"
      aria-roledescription="carte de proposition"
      className={cn(
        "relative col-start-1 row-start-1 grid min-h-[34rem] cursor-grab gap-6 touch-pan-y rounded-[1.75rem] border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-5 shadow-[0_12px_32px_rgba(23,19,15,0.08)] will-change-transform active:cursor-grabbing sm:p-7",
        isRejecting && "cursor-default active:cursor-default",
      )}
      data-candidate-id={candidate.id}
      data-testid="idea-discovery-card"
      drag={!reduceMotion && !isRejecting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.78}
      dragMomentum={false}
      dragSnapToOrigin
      exit="exit"
      initial="initial"
      style={{ rotate, x }}
      variants={discoveryCardVariants}
      whileDrag={{ scale: 1.012 }}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-5 top-5 rounded-xl border-2 border-[color:var(--rubric)] bg-[color:var(--paper-card)]/95 px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-[color:var(--rubric)] shadow-sm"
        style={{ opacity: keepOpacity, rotate: -7 }}
      >
        À garder
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-5 rounded-xl border-2 border-[color:var(--danger)] bg-[color:var(--paper-card)]/95 px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-[color:var(--danger)] shadow-sm"
        style={{ opacity: rejectOpacity, rotate: 7 }}
      >
        Pas pour nous
      </motion.div>

      <div>
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge className="bg-[color:var(--klein)]/12 text-[color:var(--klein)] ring-1 ring-[color:var(--klein)]/20">
            {CONTENT_FORMAT_LABELS[candidate.recommendedFormat]}
          </Badge>
          {candidate.category ? (
            <Badge className="bg-[color:var(--paper-card)] text-[color:var(--text-muted)] ring-1 ring-[color:var(--border-strong)]">
              {candidate.category}
            </Badge>
          ) : null}
          {candidate.isExploratory ? (
            <Badge className="gap-1 bg-[color:var(--rubric)]/15 text-[color:var(--ink)] ring-1 ring-[color:var(--rubric)]/30">
              <Sparkles className="size-3" />
              Piste exploratoire
            </Badge>
          ) : null}
        </div>

        <h3
          className="max-w-2xl text-2xl font-bold leading-tight text-[color:var(--ink)] outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-[color:var(--klein)] sm:text-3xl"
          ref={headingRef}
          tabIndex={-1}
        >
          {candidate.title}
        </h3>
        <p className="mt-5 text-base leading-7 text-[color:var(--ink)]/90">
          {candidate.angle}
        </p>

        <div className="mt-6 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[color:var(--ink)]">
            <Lightbulb className="size-4 text-[color:var(--rubric)]" />
            Pourquoi cette idée ?
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {candidate.justification}
          </p>
        </div>

        <DuplicateNotice candidate={candidate} />
      </div>

      <div className="mt-auto">
        {isRejecting ? (
          <RejectionReasonPicker
            selectedReason={selectedReason}
            onCancel={onCancelReject}
            onChoose={onChooseReason}
            onConfirm={() => onFeedback("DISLIKE", selectedReason ?? undefined)}
          />
        ) : (
          <div className="grid gap-3 border-t border-[color:var(--border-strong)] pt-5 sm:grid-cols-3">
            <Button
              className="h-12 rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--ink)] hover:bg-[color:var(--paper-card)]"
              type="button"
              variant="outline"
              onClick={onDislike}
            >
              <ThumbsDown className="size-4" />
              Pas pour nous
            </Button>
            <Button
              className="h-12 rounded-2xl text-[color:var(--text-muted)] hover:bg-[color:var(--paper-card)] hover:text-[color:var(--ink)]"
              type="button"
              variant="ghost"
              onClick={() => onFeedback("SKIP")}
            >
              <SkipForward className="size-4" />
              Passer
            </Button>
            <Button
              className="h-12 rounded-2xl bg-[color:var(--rubric)] font-bold text-white hover:bg-[color:var(--rubric)]"
              type="button"
              onClick={() => onFeedback("LIKE")}
            >
              <Check className="size-4" />À garder
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function RejectionReasonPicker({
  onCancel,
  onChoose,
  onConfirm,
  selectedReason,
}: {
  onCancel: () => void;
  onChoose: (reason: IdeaDiscoveryRejectionReason) => void;
  onConfirm: () => void;
  selectedReason: IdeaDiscoveryRejectionReason | null;
}) {
  const selected = REJECTION_REASONS.find(
    (reason) => reason.value === selectedReason,
  );

  return (
    <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-4 sm:p-5">
      <p className="font-bold text-[color:var(--ink)]">
        Qu'est-ce qui vous correspond moins ?
      </p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
        Le motif est facultatif, mais il améliore les prochaines propositions.
      </p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Motif du refus"
      >
        {REJECTION_REASONS.map((reason) => (
          <button
            aria-pressed={selectedReason === reason.value}
            className={cn(
              "min-h-10 rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--klein)]",
              selectedReason === reason.value
                ? "border-[color:var(--klein)] bg-[color:var(--klein)] text-white"
                : "border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] hover:border-[color:var(--klein)]/50",
            )}
            key={reason.value}
            type="button"
            onClick={() => onChoose(reason.value)}
          >
            {reason.label}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-5 text-xs text-[color:var(--text-muted)]">
        {selected?.description ?? "Vous pouvez aussi confirmer sans motif."}
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          className="bg-[color:var(--klein)] text-white hover:bg-[color:var(--klein)]"
          type="button"
          onClick={onConfirm}
        >
          <ThumbsDown className="size-4" />
          Confirmer le refus
        </Button>
      </div>
    </div>
  );
}

function DuplicateNotice({
  candidate,
}: {
  candidate: IdeaDiscoveryCandidatePayload;
}) {
  if (!candidate.duplicate || candidate.duplicate.score <= 0) return null;

  return (
    <Alert
      className={cn(
        "mt-5 border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--ink)]",
        candidate.duplicate.warning &&
          "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10",
      )}
    >
      <AlertTitle>
        {candidate.duplicate.warning
          ? "Idée proche détectée"
          : "Similarité détectée"}
      </AlertTitle>
      <AlertDescription className="text-[color:var(--text-muted)]">
        Score de similarité de {Math.round(candidate.duplicate.score * 100)} %
        {candidate.duplicate.matchedTitle
          ? ` avec « ${candidate.duplicate.matchedTitle} »`
          : ""}
        .
      </AlertDescription>
    </Alert>
  );
}

function PreferenceProfileCard({
  isResetting,
  onReset,
  profile,
}: {
  isResetting: boolean;
  onReset: () => void;
  profile: IdeaDiscoveryProfilePayload;
}) {
  const hasPreferences = profile.learnedSignals > 0;

  return (
    <aside aria-labelledby="preference-profile-title">
      <Card className={cn(panelClass, "rounded-3xl py-0 xl:sticky xl:top-5")}>
        <CardHeader className="border-b border-[color:var(--border-strong)] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--klein)]">
                Personnalisation
              </p>
              <CardTitle
                className="mt-2 text-xl font-bold text-[color:var(--ink)]"
                id="preference-profile-title"
              >
                Préférences apprises
              </CardTitle>
              <CardDescription className="mt-2 leading-6 text-[color:var(--text-muted)]">
                Ces signaux complètent votre contexte éditorial sans le
                modifier.
              </CardDescription>
            </div>
            <Sparkles className="mt-1 size-5 text-[color:var(--rubric)]" />
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <ProfileMetric label="À garder" value={profile.likedCount} />
            <ProfileMetric label="Refusées" value={profile.dislikedCount} />
          </div>

          {hasPreferences ? (
            <div className="grid gap-5">
              <PreferenceGroup
                emptyLabel="Aucun thème favori identifié"
                label="Thèmes appréciés"
                values={profile.preferredThemes.map((item) => item.name)}
              />
              <PreferenceGroup
                emptyLabel="Aucun thème évité identifié"
                label="Thèmes à éviter"
                values={profile.avoidedThemes.map((item) => item.name)}
                variant="muted"
              />
              <PreferenceGroup
                emptyLabel="Aucun format favori identifié"
                label="Formats appréciés"
                values={profile.preferredFormats.map(
                  (item) => CONTENT_FORMAT_LABELS[item.format],
                )}
              />
              <PreferenceGroup
                emptyLabel="Aucun format évité identifié"
                label="Formats à éviter"
                values={profile.avoidedFormats.map(
                  (item) => CONTENT_FORMAT_LABELS[item.format],
                )}
                variant="muted"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-4">
              <p className="text-sm font-bold text-[color:var(--ink)]">
                Le profil se construit avec vos choix
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                Les passages restent neutres. Seules les idées gardées ou
                refusées influencent les prochaines sélections.
              </p>
            </div>
          )}

          <Button
            className="h-11 w-full rounded-2xl border-[color:var(--border-strong)] bg-[color:var(--paper-2)] text-[color:var(--ink)] hover:bg-[color:var(--paper-2)]"
            disabled={!hasPreferences || isResetting}
            type="button"
            variant="outline"
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            Réinitialiser l'apprentissage
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-3">
      <strong className="block text-2xl font-bold text-[color:var(--ink)]">
        {value}
      </strong>
      <span className="mt-1 block text-xs font-medium text-[color:var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

function PreferenceGroup({
  emptyLabel,
  label,
  values,
  variant = "accent",
}: {
  emptyLabel: string;
  label: string;
  values: string[];
  variant?: "accent" | "muted";
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        {label}
      </p>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge
              className={cn(
                "font-medium",
                variant === "accent"
                  ? "bg-[color:var(--klein)]/12 text-[color:var(--klein)]"
                  : "bg-[color:var(--paper-2)] text-[color:var(--text-muted)] ring-1 ring-[color:var(--border-strong)]",
              )}
              key={value}
            >
              {value}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[color:var(--text-subtle)]">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

function DiscoveryLoadingState({
  generating,
  title,
}: {
  generating: boolean;
  title: string;
}) {
  return (
    <Card className={cn(panelClass, "rounded-3xl")}>
      <CardContent className="grid min-h-[30rem] place-items-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--klein)]/12 text-[color:var(--klein)] ring-1 ring-[color:var(--klein)]/20">
            <Loader2 className="size-7 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-[color:var(--ink)]">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            {generating
              ? "Nous croisons votre contexte éditorial avec des angles variés."
              : "Nous retrouvons les propositions encore disponibles."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryUnavailableState({
  error,
  isGenerating,
  onRetry,
}: {
  error: string | null;
  isGenerating: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className={cn(panelClass, "rounded-3xl")}>
      <CardContent className="grid min-h-[26rem] place-items-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--danger)]/10 text-[color:var(--danger)]">
            <Compass className="size-7" />
          </div>
          <h2 className="text-2xl font-bold text-[color:var(--ink)]">
            Sélection indisponible
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
            {error ?? "Impossible de préparer vos propositions pour le moment."}
          </p>
          <Button
            className="mt-6 h-11 rounded-2xl"
            disabled={isGenerating}
            type="button"
            onClick={onRetry}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Réessayer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryCompleteState({
  isGenerating,
  onGenerate,
  pendingFeedbackCount,
}: {
  isGenerating: boolean;
  onGenerate: () => void;
  pendingFeedbackCount: number;
}) {
  const isFinalizing = pendingFeedbackCount > 0;

  return (
    <div className="grid min-h-[30rem] place-items-center rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-2)] p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--rubric)]/15 text-[color:var(--ink)] ring-1 ring-[color:var(--rubric)]/25">
          {isFinalizing ? (
            <CloudUpload className="size-7" />
          ) : (
            <Check className="size-7" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-[color:var(--ink)]">
          {isFinalizing ? "Finalisation de vos choix" : "Sélection terminée"}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
          {isFinalizing
            ? `${pendingFeedbackCount} choix en cours d'enregistrement. Vous pouvez déjà consulter le résultat de votre sélection.`
            : "Vos choix sont enregistrés. Préparez une nouvelle sélection pour continuer à affiner les propositions."}
        </p>
        <Button
          className="mt-6 h-11 rounded-2xl"
          disabled={isGenerating || isFinalizing}
          type="button"
          onClick={onGenerate}
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isGenerating
            ? "Préparation..."
            : isFinalizing
              ? "Enregistrement..."
              : "Nouvelle sélection"}
        </Button>
      </div>
    </div>
  );
}

function toSwipeDirection(signal: IdeaDiscoverySignal): SwipeDirection {
  if (signal === "LIKE") return 1;
  if (signal === "DISLIKE") return -1;
  return 0;
}

function toPendingAnnouncement(signal: IdeaDiscoverySignal): string {
  if (signal === "LIKE") {
    return "Idée mise de côté. La proposition suivante est disponible.";
  }

  if (signal === "DISLIKE") {
    return "Préférence mise de côté. La proposition suivante est disponible.";
  }

  return "Proposition passée. La suivante est disponible.";
}
