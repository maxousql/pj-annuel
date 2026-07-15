import { describe, expect, it } from "vitest";

import {
  resolveDiscoveryCardExit,
  resolveDiscoveryCardInitial,
} from "./discovery-motion";

describe("idea discovery motion variants", () => {
  it("uses safe defaults when Motion does not provide custom context", () => {
    expect(() => resolveDiscoveryCardInitial()).not.toThrow();
    expect(() => resolveDiscoveryCardExit(undefined)).not.toThrow();
    expect(resolveDiscoveryCardInitial()).toEqual({
      opacity: 0,
      scale: 0.97,
      y: 14,
      zIndex: 0,
    });
  });

  it("preserves reduced-motion and directional exits", () => {
    expect(resolveDiscoveryCardInitial(true)).toEqual({ opacity: 0 });
    expect(
      resolveDiscoveryCardExit({ direction: 1, reduceMotion: false }),
    ).toMatchObject({ rotate: 12, x: 900 });
    expect(
      resolveDiscoveryCardExit({ direction: -1, reduceMotion: false }),
    ).toMatchObject({ rotate: -12, x: -900 });
  });
});
