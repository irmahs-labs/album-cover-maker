// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "../app";
import { chooseLanguage } from "../lib/language";
import { setUpDom } from "./dom-test-setup";

setUpDom();

afterEach(() => {
  act(() => chooseLanguage("en"));
  localStorage.clear();
});

describe("the header's language pill", () => {
  it("puts the page in French and back, and remembers it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const english = screen.getByRole("button", { name: "English" });
    expect(english.getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Français" }));
    expect(
      screen.getByRole("heading", {
        name: "Créez la pochette de votre album dans votre navigateur.",
      })
    ).toBeTruthy();
    expect(localStorage.getItem("lang")).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(
      screen.getByRole("heading", {
        name: "Make your album cover in your browser.",
      })
    ).toBeTruthy();
  });
});
