// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { linkTo, navigate } from "./router";

const click = (init: Partial<MouseEvent> = {}) => {
  const event = {
    altKey: false,
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...init,
    preventDefault: vi.fn(),
  };
  linkTo("/make")(event);
  return event;
};

describe("router", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    window.scrollTo = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("changes the path, tells listeners and scrolls to the top", () => {
    const listener = vi.fn();
    window.addEventListener("popstate", listener);
    navigate("/make");
    window.removeEventListener("popstate", listener);
    expect(window.location.pathname).toBe("/make");
    expect(listener).toHaveBeenCalledOnce();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("does nothing when already on that page", () => {
    const push = vi.spyOn(window.history, "pushState");
    navigate("/");
    expect(push).not.toHaveBeenCalled();
  });

  it("handles a plain click in the app", () => {
    const event = click();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/make");
  });

  it.each([
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])(
    "leaves %o to the browser, so the link opens in a new tab or window",
    (init) => {
      const event = click(init);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe("/");
    }
  );
});
