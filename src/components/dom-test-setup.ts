import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * jsdom has no canvas, ResizeObserver, scrolling or object URLs. The
 * canvases simply draw nothing here (the drawing is covered by
 * src/lib/draw.test.ts and the end-to-end tests).
 */
const noop = () => {
  // jsdom lays nothing out, so there is never a resize to report.
};

export const setUpDom = () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    window.scrollTo = vi.fn();
    window.ResizeObserver = class implements ResizeObserver {
      observe = noop;
      unobserve = noop;
      disconnect = noop;
    };
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
};
