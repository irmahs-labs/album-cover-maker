// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { COMBOS } from "../lib/combos";
import { SUBTITLE_FONTS, TITLE_FONTS } from "../lib/fonts";
import { textColors } from "../lib/lucky";
import { DEFAULT_STATE } from "../lib/state";
import { setUpDom } from "./dom-test-setup";
import { Maker } from "./maker";

setUpDom();

const input = (id: string) =>
  document.querySelector<HTMLInputElement>(`#${id}`)!;
/** The font a menu shows as chosen. */
const fontOf = (id: string) =>
  document.querySelector<HTMLButtonElement>(`#${id}`)!.textContent;
const pickFont = async (id: string, name: string) => {
  await userEvent.click(document.querySelector<HTMLButtonElement>(`#${id}`)!);
  await userEvent.click(screen.getByRole("option", { name }));
};
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
    expect(fontOf("title-font")).toBe(COMBOS[0].titleFont);
    expect(fontOf("subtitle-font")).toBe(COMBOS[0].subtitleFont);
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
  /** Picks a spot: its row in one group, its column in the other. */
  const spot = async (row: string, column: string) => {
    const pick = (group: string, name: string) =>
      userEvent.click(
        within(screen.getByRole("group", { name: group })).getByRole("button", {
          name,
        })
      );
    await pick("Vertical position", row);
    await pick("Horizontal position", column);
  };
  const pressedNames = (name: string) =>
    group(name)
      .filter(pressed)
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);

  it("offers top, middle or bottom and left, center or right, starting bottom left", () => {
    render(<Maker />);
    const names = (g: string) => group(g).map((b) => b.textContent);
    expect(names("Vertical position")).toEqual(["top", "middle", "bottom"]);
    expect(names("Horizontal position")).toEqual(["left", "center", "right"]);
    expect(pressedNames("Vertical position")).toEqual(["bottom"]);
    expect(pressedNames("Horizontal position")).toEqual(["left"]);
  });

  it("moves the text to the spot you pick, row and column separately", async () => {
    render(<Maker />);
    await spot("top", "right");
    expect(pressedNames("Vertical position")).toEqual(["top"]);
    expect(pressedNames("Horizontal position")).toEqual(["right"]);
    await spot("middle", "right");
    expect(pressedNames("Vertical position")).toEqual(["middle"]);
    expect(pressedNames("Horizontal position")).toEqual(["right"]);
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
    await spot("top", "left");
    expect(screen.getByText(note)).toBeTruthy();
    await userEvent.click(input("pa-show"));
    expect(screen.queryByText(note)).toBeNull();
  });

  it("disables position and alignment when the cover has no text", async () => {
    render(<Maker />);
    await userEvent.click(input("show-text"));
    expect(group("Vertical position").every((b) => b.disabled)).toBe(true);
    expect(group("Horizontal position").every((b) => b.disabled)).toBe(true);
    expect(group("Text alignment").every((b) => b.disabled)).toBe(true);
  });

  it("always shows the title in the player, with no switch for it", () => {
    render(<Maker />);
    const switches = screen
      .getAllByRole("switch")
      .map((el) => el.closest("label")?.textContent?.trim());
    expect([...switches].sort()).toEqual([
      "Show text on the cover",
      "Show the label",
    ]);
  });
});

describe("maker: font menus", () => {
  const titleButton = () => screen.getByRole("button", { name: "Title font" });
  const options = () => screen.getAllByRole("option");
  const activeOption = () => {
    const list = screen.getByRole("listbox");
    return document.querySelector(
      `#${list.getAttribute("aria-activedescendant")}`
    )?.textContent;
  };

  it("writes every font in the list in its own font", async () => {
    render(<Maker />);
    await userEvent.click(titleButton());
    expect(screen.getByRole("listbox", { name: "Title font" })).toBeTruthy();
    expect(options().map((o) => o.textContent)).toEqual(TITLE_FONTS);
    for (const option of options()) {
      expect(option.style.fontFamily).toMatch(
        new RegExp(`^"${option.textContent}",`, "u")
      );
    }
  });

  it("does the same for the subtitle fonts", async () => {
    render(<Maker />);
    await userEvent.click(
      screen.getByRole("button", { name: "Subtitle font" })
    );
    expect(options().map((o) => o.textContent)).toEqual(SUBTITLE_FONTS);
    const families = new Set(options().map((o) => o.style.fontFamily));
    expect(families.size).toBe(SUBTITLE_FONTS.length);
  });

  it("shows the chosen font on its button, with its treatment", async () => {
    render(<Maker />);
    expect(titleButton().style.fontFamily).toMatch(/^"Abril Fatface",/u);
    expect(titleButton().style.fontWeight).toBe("400");
    await userEvent.click(screen.getByRole("button", { name: "Title bold" }));
    expect(titleButton().style.fontWeight).toBe("700");
  });

  it("marks the chosen font, and picking one closes the list", async () => {
    render(<Maker />);
    await userEvent.click(titleButton());
    const chosen = options().filter(
      (o) => o.getAttribute("aria-selected") === "true"
    );
    expect(chosen.map((o) => o.textContent)).toEqual(["Abril Fatface"]);
    await userEvent.click(screen.getByRole("option", { name: "Cinzel" }));
    expect(fontOf("title-font")).toBe("Cinzel");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(titleButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("works from the keyboard", async () => {
    render(<Maker />);
    titleButton().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(activeOption()).toBe("Abril Fatface");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(fontOf("title-font")).toBe(TITLE_FONTS[2]);
    expect(document.activeElement).toBe(titleButton());
    // Escape closes without changing anything.
    await userEvent.keyboard("{ArrowDown}{End}{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(fontOf("title-font")).toBe(TITLE_FONTS[2]);
  });

  it("jumps to a font as you type its name", async () => {
    render(<Maker />);
    titleButton().focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("ci");
    expect(activeOption()).toBe("Cinzel");
    await userEvent.keyboard("{Enter}");
    expect(fontOf("title-font")).toBe("Cinzel");
  });

  it("closes when you click somewhere else", async () => {
    render(<Maker />);
    await userEvent.click(titleButton());
    await userEvent.click(input("main-title"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(fontOf("title-font")).toBe("Abril Fatface");
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
    expect(fontOf("title-font")).toBe("Cinzel");
    expect(fontOf("subtitle-font")).toBe("Fauna One");
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
    await pickFont("title-font", "Ultra");
    const highlighted = within(comboList())
      .getAllByRole("button")
      .filter(pressed);
    expect(highlighted).toHaveLength(0);
  });

  it("has no shuffle button any more", () => {
    render(<Maker />);
    expect(screen.queryByRole("button", { name: "shuffle ideas" })).toBeNull();
  });
});

describe("maker: I'm feeling lucky", () => {
  const lucky = () =>
    userEvent.click(screen.getByRole("button", { name: "I'm feeling lucky" }));
  const pressedIn = (group: string) =>
    within(screen.getByRole("group", { name: group }))
      .getAllByRole("button")
      .filter(pressed)
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);

  it("rolls the label, fonts, text colours and treatment, and player colours", async () => {
    render(<Maker />);
    // Every roll lands on the last choice, and no treatment is switched on.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    await lucky();
    const last = COMBOS.at(-1);
    expect(pressedIn("Label size")).toEqual(["XXL 20%"]);
    expect(pressedIn("Label corner")).toEqual(["bottom right"]);
    expect(fontOf("title-font")).toBe(last?.titleFont);
    expect(fontOf("subtitle-font")).toBe(last?.subtitleFont);
    expect(input("title-color").value).toBe(textColors([40]).at(-1));
    expect(input("subtitle-color").value).toBe(textColors([40]).at(-1));
    expect(pressedIn("Subtitle font style")).toEqual([]);
    // 40 + 0.98 × 90, and the buttons opposite it on the wheel.
    expect(input("player-hue").value).toBe("128");
    expect(input("button-hue").value).toBe("308");
  });

  it("can switch every treatment on", async () => {
    render(<Maker />);
    vi.spyOn(Math, "random").mockReturnValue(0);
    await lucky();
    expect(pressedIn("Title font style")).toEqual([
      "Title bold",
      "Title italic",
      "Title underline",
      "Title strikethrough",
    ]);
    expect(pressedIn("Label size")).toEqual(["XS 8%"]);
  });

  it("keeps the words, and whether the label and text show", async () => {
    render(<Maker />);
    await userEvent.clear(input("main-title"));
    await userEvent.type(input("main-title"), "Sleepless Nights");
    await userEvent.click(input("pa-show"));
    await lucky();
    expect(input("main-title").value).toBe("Sleepless Nights");
    expect(input("subtitle").value).toBe(DEFAULT_STATE.subtitle);
    expect(input("pa-show").checked).toBe(false);
    expect(input("show-text").checked).toBe(true);
  });
});

describe("maker: text colours", () => {
  it("starts both in cream and changes each on its own", () => {
    render(<Maker />);
    expect(input("title-color").value).toBe("#fff3cf");
    fireEvent.change(input("title-color"), { target: { value: "#1f2420" } });
    expect(input("title-color").value).toBe("#1f2420");
    expect(input("subtitle-color").value).toBe("#fff3cf");
  });

  it("names both pickers", () => {
    render(<Maker />);
    expect(screen.getByLabelText("Title colour")).toBe(input("title-color"));
    expect(screen.getByLabelText("Subtitle colour")).toBe(
      input("subtitle-color")
    );
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

  it("has zoom off until there is a photo, and it goes from 100% to 500%", () => {
    render(<Maker />);
    expect(input("zoom").disabled).toBe(true);
    expect([input("zoom").min, input("zoom").max]).toEqual(["100", "500"]);
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

describe("maker: undo and redo", () => {
  const undoButton = () => screen.getByRole("button", { name: "undo" });
  const redoButton = () => screen.getByRole("button", { name: "redo" });
  const sizePressed = () =>
    within(screen.getByRole("group", { name: "Label size" }))
      .getAllByRole("button")
      .filter(pressed)
      .map((b) => b.getAttribute("aria-label"));

  it("has nothing to undo or redo at the start", () => {
    render(<Maker />);
    expect((undoButton() as HTMLButtonElement).disabled).toBe(true);
    expect((redoButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("takes back a change and puts it back", async () => {
    render(<Maker />);
    await userEvent.click(screen.getByRole("button", { name: "XXL 20%" }));
    await userEvent.click(undoButton());
    expect(sizePressed()).toEqual(["S 10%"]);
    await userEvent.click(redoButton());
    expect(sizePressed()).toEqual(["XXL 20%"]);
    expect((redoButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("undoes a whole word typed at once in one step", async () => {
    render(<Maker />);
    await userEvent.clear(input("main-title"));
    await userEvent.type(input("main-title"), "Sleepless");
    await userEvent.click(undoButton());
    expect(input("main-title").value).toBe(DEFAULT_STATE.title);
  });

  it("undoes each lucky roll on its own", async () => {
    render(<Maker />);
    const lucky = screen.getByRole("button", { name: "I'm feeling lucky" });
    vi.spyOn(Math, "random").mockReturnValue(0);
    await userEvent.click(lucky);
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    await userEvent.click(lucky);
    expect(sizePressed()).toEqual(["XXL 20%"]);
    await userEvent.click(undoButton());
    expect(sizePressed()).toEqual(["XS 8%"]);
    await userEvent.click(undoButton());
    expect(sizePressed()).toEqual(["S 10%"]);
  });

  it("answers Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y outside text fields", async () => {
    render(<Maker />);
    await userEvent.click(screen.getByRole("button", { name: "XL 16%" }));
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(sizePressed()).toEqual(["S 10%"]);
    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(sizePressed()).toEqual(["XL 16%"]);
    await userEvent.keyboard("{Control>}z{/Control}{Control>}y{/Control}");
    expect(sizePressed()).toEqual(["XL 16%"]);
  });

  it("leaves Ctrl+Z inside a text field to the field", async () => {
    render(<Maker />);
    await userEvent.click(screen.getByRole("button", { name: "XL 16%" }));
    await userEvent.click(input("main-title"));
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(sizePressed()).toEqual(["XL 16%"]);
  });

  it("starts the history afresh on start over", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Maker />);
    await userEvent.click(screen.getByRole("button", { name: "XL 16%" }));
    await userEvent.click(screen.getByRole("button", { name: "start over" }));
    expect((undoButton() as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("maker: export and start over", () => {
  it("offers all three exports at their sizes", () => {
    render(<Maker />);
    expect(
      screen.getByRole("button", { name: /Cover\s*PNG · 3000 × 3000/u })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Player\s*PNG · 1080 × 1440/u })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Record\s*JPEG · 3000 × 2000/u })
    ).toBeTruthy();
  });

  it("previews the record mock-up in its own window", () => {
    render(<Maker />);
    const preview = screen.getByRole("img", { name: /^Record mock-up/u });
    expect(
      preview.closest("fieldset")?.querySelector("legend")?.textContent
    ).toBe("record.jpeg");
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
    expect(fontOf("title-font")).toBe(DEFAULT_STATE.titleFont);
  });
});
