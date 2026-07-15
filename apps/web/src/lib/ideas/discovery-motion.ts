import type { Variants } from "motion/react";

export type DiscoverySwipeDirection = -1 | 0 | 1;

export type DiscoveryCardMotionContext = {
  direction: DiscoverySwipeDirection;
  reduceMotion: boolean;
};

export function resolveDiscoveryCardExit(context?: DiscoveryCardMotionContext) {
  const direction = context?.direction ?? 0;
  const reduceMotion = context?.reduceMotion ?? false;

  if (reduceMotion) {
    return {
      opacity: 0,
      pointerEvents: "none" as const,
      transition: { duration: 0.08 },
      zIndex: 2,
    };
  }

  if (direction === 0) {
    return {
      opacity: 0,
      pointerEvents: "none" as const,
      scale: 0.96,
      transition: {
        duration: 0.18,
        ease: [0.4, 0, 1, 1] as const,
      },
      y: -36,
      zIndex: 2,
    };
  }

  return {
    opacity: 0,
    pointerEvents: "none" as const,
    rotate: direction * 12,
    transition: {
      damping: 28,
      mass: 0.72,
      stiffness: 250,
      type: "spring" as const,
    },
    x: direction * 900,
    zIndex: 2,
  };
}

export function resolveDiscoveryCardInitial(reduceMotion = false) {
  return reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.97, y: 14, zIndex: 0 };
}

export const discoveryCardVariants: Variants = {
  animate: {
    opacity: 1,
    pointerEvents: "auto",
    rotate: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
    x: 0,
    y: 0,
    zIndex: 1,
  },
  exit: resolveDiscoveryCardExit,
};
