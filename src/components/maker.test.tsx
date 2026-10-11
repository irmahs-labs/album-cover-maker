// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { COMBOS } from "../lib/combos";
import { DEFAULT_STATE } from "../lib/state";
import { setUpDom } from "./dom-test-setup";
import { Maker } from "./maker";

setUpDom();

const input = (id: string) =>
  document.querySelector<HTMLInputElement>(`#${id}`)!;
const select = (id: string) =>
  document.querySelector<HTMLSelectElement>(`#${id}`)!;
const preview = () =>
  screen.getByRole("img", { name: /^Album cover preview/u });
const comboList = () => screen.getByRole("list", { name: "Suggested combos" });
const comboButton = (name: string) =>
  within(comboList())
    .getAllByRole("button")
    .find((b) => b.querySelector(".combo-name")?.textContent === name)!;
const pressed = (el: HTMLElement) => el.getAttribute("aria-pressed") === "true";

describe("maker: cover text", () => {
  it("starts with the default title, subtitle and first pairing", () => {
    render(<Maker />);
    expect(input("main-title").value).toBe(DEFAULT_STATE.title);
    expect(input("subtitle").value).toBe(DEFAULT_STATE.subtitle);
    expect(select("title-font").value).toBe(COMBOS[0].titleFont);
    expect(select("subtitle-font").value).toBe(COMBOS[0].subtitleFont);
    expect(pressed(comboButton(COMBOS[0].name))).toBe(true);
  });

  it("puts what you type on the cover", async () => {
    render(<Maker />);
    await userEvent.clear(input("main-title"));
    await userEvent.type(input("main-title"), "Sleepless Nights");
    await userEvent.clear(input("subtitle"));
    await userEvent.type(input("subtitle"), "Alexa");
    expect(preview().getAttribute("aria-label")).toBe(
      "Album cover preview: Sleepless Nights by Alexa"
    );
  });

  it("toggles bold, italic, underline and strikethrough independently", async () => {
    render(<Maker />);
    const group = screen.getByRole("group", { name: "Title font style" });
    const bold = within(group).getByRole("button", { name: "Title bold" });
    const strike = within(group).getByRole("button", {
      name: "Title strikethrough",
    });
    await userEvent.click(bold);
    await userEvent.click(strike);
    expect(pressed(bold)).toBe(true);
    expect(pressed(strike)).toBe(true);
    expect(
      pressed(within(group).getByRole("button", { name: "Title italic" }))
    ).toBe(false);
    await userEvent.click(bold);
    expect(pressed(bold)).toBe(false);
  });
});

describe("maker: text placement", () => {
  const group = (name: string) =>
    within(screen.getByRole("group", { name })).getAllByRole(
      "button"
    ) as HTMLButtonElement[];
  const spot = (name: string) =>
    within(screen.getByRole("group", { name: "Text position" })).getByRole(
      "button",
      { name }
    );
  const pressedNames = (name: string) =>
    group(name)
      .filter(pressed)
      .map((b) => b.getAttribute("aria-label"));

  it("offers nine spots, starting bottom left", () => {
    render(<Maker />);
    expect(
      group("Text position").map((b) => b.getAttribute("aria-label"))
    ).toEqual([
      "top left",
      "top center",
      "top right",
      "middle left",
      "middle center",
      "middle right",
      "bottom left",
      "bottom center",
      "bottom right",
    ]);
    expect(pressedNames("Text position")).toEqual(["bottom left"]);
  });

  it("moves the text to the spot you pick", async () => {
    render(<Maker />);
    await userEvent.click(spot("top right"));
    expect(pressedNames("Text position")).toEqual(["top right"]);
  });

  it("aligns left, center or right, starting left", async () => {
    render(<Maker />);
    expect(pressedNames("Text alignment")).toEqual(["Align left"]);
    await userEvent.click(screen.getByRole("button", { name: "Align center" }));
    expect(pressedNames("Text alignment")).toEqual(["Align center"]);
  });

  it("explains that the label keeps its corner and the text moves to the middle", async () => {
    render(<Maker />);
    const note =
      "The label has the top left corner, so the text sits in the middle left.";
    expect(screen.queryByText(note)).toBeNull();
    await userEvent.click(spot("top left"));
    expect(screen.getByText(note)).toBeTruthy();
    await userEvent.click(input("pa-show"));
    expect(screen.queryByText(note)).toBeNull();
  });

  it("disables position and alignment when the cover has no text", async () => {
    render(<Maker />);
    await userEvent.click(input("show-text"));
    expect(group("Text position").every((b) => b.disabled)).toBe(true);
    expect(group("Text alignment").every((b) => b.disabled)).toBe(true);
  });

  it("always shows the title in the player, with no switch for it", () => {
    render(<Maker />);
    const switches = screen
      .getAllByRole("switch")
      .map((el) => el.closest("label")?.textContent?.trim());
    expect(switches).toEqual(["Show the label", "Show text on the cover"]);
  });
});

describe("maker: combos", () => {
  it("lists every pairing", () => {
    render(<Maker />);
    expect(within(comboList()).getAllByRole("button")).toHaveLength(
      COMBOS.length
    );
  });

  it("sets both fonts when you pick a pairing", async () => {
    render(<Maker />);
    await userEvent.click(comboButton("Cinzel"));
    expect(select("title-font").value).toBe("Cinzel");
    expect(select("subtitle-font").value).toBe("Fauna One");
    expect(pressed(comboButton("Cinzel"))).toBe(true);
    expect(pressed(comboButton(COMBOS[0].name))).toBe(false);
  });

  it("turns on bold for a family paired with itself", async () => {
    render(<Maker />);
    await userEvent.click(comboButton("Quicksand Bold"));
    expect(pressed(screen.getByRole("button", { name: "Title bold" }))).toBe(
      true
    );
  });

  it("drops the pairing highlight once you pick a font by hand", async () => {
    render(<Maker />);
    await userEvent.selectOptions(select("title-font"), "Ultra");
    const highlighted = within(comboList())
      .getAllByRole("button")
      .filter(pressed);
    expect(highlighted).toHaveLength(0);
  });

  it("reshuffles the list", async () => {
    render(<Maker />);
    const order = () =>
      [...comboList().querySelectorAll(".combo-name")].map(
        (n) => n.textContent
      );
    const before = order();
    await userEvent.click(
      screen.getByRole("button", { name: "shuffle ideas" })
    );
    expect(order()).not.toEqual(before);
    expect([...order()].sort()).toEqual([...before].sort());
  });
});

describe("maker: parental advisory", () => {
  it("disables the size and corner controls when the label is off", async () => {
    render(<Maker />);
    const buttons = (group: string) =>
      within(screen.getByRole("group", { name: group })).getAllByRole(
        "button"
      ) as HTMLButtonElement[];
    expect(buttons("Label size").some((b) => b.disabled)).toBe(false);
    await userEvent.click(input("pa-show"));
    expect(buttons("Label size").every((b) => b.disabled)).toBe(true);
    expect(buttons("Label corner").every((b) => b.disabled)).toBe(true);
  });

  it("moves the label to the corner you pick", async () => {
    render(<Maker />);
    const group = screen.getByRole("group", { name: "Label corner" });
    await userEvent.click(
      within(group).getByRole("button", { name: "bottom right" })
    );
    expect(
      pressed(within(group).getByRole("button", { name: "bottom right" }))
    ).toBe(true);
    expect(
      pressed(within(group).getByRole("button", { name: "top left" }))
    ).toBe(false);
  });

  const sizeButtons = () =>
    within(screen.getByRole("group", { name: "Label size" })).getAllByRole(
      "button"
    );

  it("offers six sizes, XS to XXL, each with its percentage", () => {
    render(<Maker />);
    expect(sizeButtons().map((b) => b.textContent)).toEqual([
      "XS8%",
      "S10%",
      "M12%",
      "L14%",
      "XL16%",
      "XXL20%",
    ]);
  });

  it("starts on S, 10% of the width", () => {
    render(<Maker />);
    const pressedSizes = sizeButtons().filter(pressed);
    expect(pressedSizes.map((b) => b.textContent)).toEqual(["S10%"]);
    expect(screen.getByText("10% of the width")).toBeTruthy();
  });

  it("switches to the size you pick, one at a time", async () => {
    render(<Maker />);
    await userEvent.click(screen.getByRole("button", { name: "XXL 20%" }));
    expect(
      sizeButtons()
        .filter(pressed)
        .map((b) => b.textContent)
    ).toEqual(["XXL20%"]);
    expect(screen.getByText("20% of the width")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "XS 8%" }));
    expect(screen.getByText("8% of the width")).toBeTruthy();
  });
});

describe("maker: photo", () => {
  const upload = (file: File) =>
    fireEvent.change(input("photo-file"), { target: { files: [file] } });

  it("has zoom off until there is a photo", () => {
    render(<Maker />);
    expect(input("zoom").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "choose photo" })).toBeTruthy();
  });

  it("refuses a file that is not an image, and the message can be dismissed", async () => {
    render(<Maker />);
    upload(new File(["hello"], "notes.txt", { type: "text/plain" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /That isn't an image/u
    );
    await userEvent.click(screen.getByRole("button", { name: "dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains when an image file cannot be opened", async () => {
    render(<Maker />);
    upload(new File(["not really a png"], "broken.png", { type: "image/png" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /couldn't be opened as an image/u
    );
  });

  it("promises the photo stays in the browser", () => {
    render(<Maker />);
    expect(
      screen.getByText("Your photo stays in your browser. Nothing is uploaded.")
    ).toBeTruthy();
  });
});

describe("maker: export and start over", () => {
  it("offers both exports at their sizes", () => {
    render(<Maker />);
    expect(
      screen.getByRole("button", { name: /Cover\s*PNG · 3000 × 3000/u })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Player\s*PNG · 1080 × 1440/u })
    ).toBeTruthy();
  });

  it("keeps everything when you cancel start over", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Maker />);
    await userEvent.clear(input("main-title"));
    await userEvent.type(input("main-title"), "Keep me");
    await userEvent.click(screen.getByRole("button", { name: "start over" }));
    expect(input("main-title").value).toBe("Keep me");
  });

  it("resets everything when you confirm start over", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Maker />);
    await userEvent.clear(input("main-title"));
    await userEvent.type(input("main-title"), "Throw away");
    await userEvent.click(comboButton("Cinzel"));
    await userEvent.click(screen.getByRole("button", { name: "start over" }));
    expect(input("main-title").value).toBe(DEFAULT_STATE.title);
    expect(select("title-font").value).toBe(DEFAULT_STATE.titleFont);
  });
});
