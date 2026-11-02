import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  buttonColor,
  dominantColor,
  dominantHues,
  playerColor,
} from "../lib/color";
import { COMBOS, suggestCombos } from "../lib/combos";
import type { Suggestion } from "../lib/combos";
import { cssFilter, FILTERS } from "../lib/filters";
import { SUBTITLE_FONTS, TITLE_FONTS, cssFont } from "../lib/fonts";
import type { TextStyle } from "../lib/fonts";
import { historyReducer, startHistory } from "../lib/history";
import type { History, HistoryAction } from "../lib/history";
import { currentLanguage, useCopy } from "../lib/language";
import { feelingLucky } from "../lib/lucky";
import { photoRect } from "../lib/render";
import type { Box } from "../lib/render";
import {
  CORNERS,
  DEFAULT_STATE,
  LABEL_SIZES,
  placedText,
  slug,
  TEXT_ALIGNS,
  TEXT_POSITIONS,
} from "../lib/state";
import type { CoverState, Photo } from "../lib/state";
import { linkTo } from "../router";
import { AccountButton } from "./account-button";
import {
  BLANK_BACKGROUND,
  CoverCanvas,
  exportImage,
  useFontsReady,
} from "./cover-canvas";
import type { Kind } from "./cover-canvas";
import { filterPhoto } from "./filter-photo";
import { FontPicker } from "./font-picker";
import { LanguageToggle } from "./language-toggle";
import { Logo } from "./logo";
import { MAKER_COPY } from "./maker-copy";
import type { MakerCopy } from "./maker-copy";
import { ThemeToggle } from "./theme-toggle";
import { Window } from "./window";

const useElementWidth = <T extends HTMLElement>(fallback: number) => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(1, Math.round(entry.contentRect.width)))
    );

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
};

const loadPhoto = async (
  file: File
): Promise<{ photo: Photo; hues: number[]; color: string }> => {
  const url = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 48;
    const ctx = sample.getContext("2d", { willReadFrequently: true });
    let hues = [40];
    let color = BLANK_BACKGROUND;

    if (ctx) {
      ctx.drawImage(img, 0, 0, 48, 48);
      const { data } = ctx.getImageData(0, 0, 48, 48);
      hues = dominantHues(data, 3);
      color = dominantColor(data, BLANK_BACKGROUND);
    }

    return {
      color,
      hues,
      photo: {
        height: img.naturalHeight,
        image: img,
        name: file.name,
        width: img.naturalWidth,
      },
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      currentLanguage() === "fr"
        ? "Ce fichier ne s’ouvre pas comme une image. Essayez un JPEG, PNG ou WebP."
        : "That file couldn't be opened as an image. Try a JPEG, PNG or WebP."
    );
  }
};

const StyleButtons = ({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: TextStyle;
  onChange: (v: TextStyle) => void;
  t: MakerCopy;
}) => {
  const keys: { key: keyof TextStyle; text: string; name: string }[] = [
    { key: "bold", name: t.styles.bold, text: "B" },
    { key: "italic", name: t.styles.italic, text: "I" },
    { key: "underline", name: t.styles.underline, text: "U" },
    { key: "strike", name: t.styles.strike, text: "S" },
  ];

  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would bring its own border, padding and legend layout; this row of buttons is styled as a plain group
      role="group"
      aria-label={t.fontStyle(label)}
      className="style-buttons"
    >
      {keys.map(({ key, text, name }) => (
        <button
          key={key}
          type="button"
          className={`toggle style-${key}`}
          aria-label={`${label} ${name}`}
          aria-pressed={value[key]}
          onClick={() => onChange({ ...value, [key]: !value[key] })}
        >
          {text}
        </button>
      ))}
    </div>
  );
};

const HueSlider = ({
  id,
  label,
  hue,
  color,
  track,
  onChange,
}: {
  id: string;
  label: string;
  hue: number;
  color: string;
  track: string;
  onChange: (h: number) => void;
}) => (
  <label htmlFor={id} className="field">
    <span className="field-row">
      {label}
      <span className="swatch-value">
        <span className="swatch" style={{ background: color }} />
        {color}
      </span>
    </span>
    <input
      id={id}
      className="hue"
      type="range"
      min={0}
      max={360}
      value={hue}
      style={{ background: track }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
);

const ColorInput = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label htmlFor={id} className="color-input" title={`${label}: ${value}`}>
    <span className="visually-hidden">{label}</span>
    <input
      id={id}
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

/** A row of joined buttons where exactly one is chosen. */
const Segmented = <T extends string>({
  label,
  options,
  value,
  disabled,
  name,
  text,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  disabled?: boolean;
  /** Accessible name for an option, when its text alone is not enough. */
  name?: (option: T) => string;
  /** What an option reads as, in the page's language. */
  text: (option: T) => string;
  onChange: (option: T) => void;
}) => (
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would bring its own border, padding and legend layout; this row of buttons is styled as a plain group
  <div role="group" aria-label={label} className="segmented">
    {options.map((option) => (
      <button
        key={option}
        type="button"
        aria-label={name?.(option)}
        aria-pressed={option === value}
        disabled={disabled}
        onClick={() => onChange(option)}
      >
        {text(option)}
      </button>
    ))}
  </div>
);

const DiceIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" />
  </svg>
);

const UndoIcon = ({ redo = false }: { redo?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={redo ? { transform: "scaleX(-1)" } : undefined}
  >
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

/** The settings a combo sets: both fonts, the title's weight and the player colours. */
const comboSettings = (sug: Suggestion) => ({
  buttonHue: sug.buttonHue,
  comboId: sug.combo.id,
  playerHue: sug.playerHue,
  subtitleFont: sug.combo.subtitleFont,
  titleFont: sug.combo.titleFont,
  titleStyle: sug.combo.titleStyle,
});

const wrapHue = (h: number) => ((Math.round(h) % 360) + 360) % 360;

const LockIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d={open ? "M8 11V7a4 4 0 0 1 7.5-2" : "M8 11V8a4 4 0 0 1 8 0v3"} />
  </svg>
);

const RestartIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);

const ROWS = ["top", "middle", "bottom"] as const;
const COLUMNS = ["left", "center", "right"] as const;
const third = (v: number) => Math.min(2, Math.max(0, Math.floor(v * 3)));

/** The text spot under a point given as fractions of the cover's side. */
const spotAt = (p: { x: number; y: number }) =>
  `${ROWS[third(p.y)]}-${COLUMNS[third(p.x)]}` as const;

/** A text spot, "top-left", in words in the page's language. */
const spotName = (
  spot: `${(typeof ROWS)[number]}-${(typeof COLUMNS)[number]}`,
  t: MakerCopy
) => {
  // SAFETY: a text spot is always "<row>-<column>".
  const [r, c] = spot.split("-") as [
    (typeof ROWS)[number],
    (typeof COLUMNS)[number],
  ];

  return t.spot(r, c);
};

const hueTrack = (s: number, l: number) =>
  `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} ${s}% ${l}%)`).join(", ")})`;

const coverHistory = (
  history: History<CoverState>,
  action: HistoryAction<CoverState>
) => historyReducer(history, action);

/** Whether a key press belongs to a text field's own editing, undo included. */
const inTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement &&
      ["text", "search", "url", "email"].includes(target.type)));

/** Where a pointer is on the canvas, as fractions of its width and height. */
const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
  const r = e.currentTarget.getBoundingClientRect();

  return {
    x: (e.clientX - r.left) / r.width,
    y: (e.clientY - r.top) / r.height,
  };
};

const clampPan = (v: number) => Math.max(-1, Math.min(1, v));

/** The cover preview's cursor class: text to drag, a photo to move, or neither. */
const coverCursor = (onText: boolean, hasPhoto: boolean) => {
  if (onText) {
    return "text-draggable";
  }

  return hasPhoto ? "draggable" : undefined;
};

/** An export button's label, while that export is saving or not. */
const exportLabel = (busy: Kind | null, kind: Kind, t: MakerCopy) =>
  busy === kind ? t.saving : t.exports[kind];

export const Maker = () => {
  const [history, dispatch] = useReducer(
    coverHistory,
    DEFAULT_STATE,
    startHistory
  );

  const state = history.present;
  const t = useCopy(MAKER_COPY);

  /**
   * Changes the settings. Changes with the same `group` in quick
   * succession (a word typed, a slider dragged) undo as one step.
   */
  const setState = useCallback(
    (update: (s: CoverState) => CoverState, group?: string) =>
      dispatch({ group, now: Date.now(), type: "set", update }),
    []
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (!(e.metaKey || e.ctrlKey) || e.altKey || inTextField(e.target)) {
        return;
      }

      if (key === "z") {
        e.preventDefault();

        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoHues, setPhotoHues] = useState<number[]>([40]);
  const [photoColor, setPhotoColor] = useState(BLANK_BACKGROUND);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // While locked, the player and button sliders turn together.
  const [huesLocked, setHuesLocked] = useState(true);

  const setHue = (which: "playerHue" | "buttonHue", hue: number) =>
    setState((s) => {
      const other = which === "playerHue" ? "buttonHue" : "playerHue";

      const turned = huesLocked
        ? { [other]: wrapHue(s[other] + hue - s[which]) }
        : {};

      return { ...s, ...turned, comboId: null, [which]: hue };
    }, "hues");

  const fileInput = useRef<HTMLInputElement>(null);
  const fontsTick = useFontsReady(state);
  const [coverBox, coverWidth] = useElementWidth<HTMLDivElement>(500);
  const [recordBox, recordWidth] = useElementWidth<HTMLDivElement>(720);

  const set = useCallback(
    <K extends keyof CoverState>(key: K, value: CoverState[K]) =>
      setState((s) => ({ ...s, [key]: value }), key),
    [setState]
  );

  const suggestions = useMemo(() => suggestCombos(photoHues), [photoHues]);

  // The photo as the previews show it: filtered, at most 1600 px across.
  const shownPhoto = useMemo(
    () => photo && filterPhoto(photo, state.filter, state.filterStrength, 1600),
    [photo, state.filter, state.filterStrength]
  );

  const applyCombo = useCallback(
    (sug: Suggestion) => setState((s) => ({ ...s, ...comboSettings(sug) })),
    [setState]
  );

  const openFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setErrorMessage(MAKER_COPY[currentLanguage()].notImage);

        return;
      }

      try {
        const { photo: next, hues, color } = await loadPhoto(file);
        setPhoto((prev) => {
          if (prev?.image instanceof HTMLImageElement) {
            URL.revokeObjectURL(prev.image.src);
          }

          return next;
        });
        setPhotoHues(hues);
        setPhotoColor(color);
        setErrorMessage(null);
        // Re-frame the photo and re-apply the chosen combo with its colours,
        // as one step.
        setState((s) => {
          const current =
            suggestCombos(hues).find((x) => x.combo.id === s.comboId) ??
            suggestCombos(hues)[0];

          return {
            ...s,
            ...comboSettings(current),
            panX: 0,
            panY: 0,
            zoom: 100,
          };
        });
      } catch (error) {
        // SAFETY: loadPhoto turns every failure to read the file into an
        // Error with a message for the visitor.
        setErrorMessage((error as Error).message);
      }
    },
    [setState]
  );

  // Drag the title to one of nine spots, or anywhere else to move the photo
  // inside the square.
  const drag = useRef<
    | { kind: "photo"; x: number; y: number; panX: number; panY: number }
    | { kind: "text" }
    | null
  >(null);

  const textBox = useRef<Box | null>(null);

  const onTextBox = useCallback((box: Box | null) => {
    textBox.current = box;
  }, []);

  const [draggingText, setDraggingText] = useState(false);
  const [overText, setOverText] = useState(false);

  const onText = (p: { x: number; y: number }) => {
    const b = textBox.current;
    const pad = 0.02;

    return (
      b !== null &&
      p.x >= b.x - pad &&
      p.x <= b.x + b.w + pad &&
      p.y >= b.y - pad &&
      p.y <= b.y + b.h + pad
    );
  };

  const spare = (axis: "x" | "y") => {
    if (!photo) {
      return 0;
    }

    const r = photoRect(photo, coverWidth, state.zoom, 0, 0);

    return ((axis === "x" ? r.w : r.h) - coverWidth) / 2;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (onText(pointAt(e))) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: "text" };
      setDraggingText(true);

      return;
    }

    if (!photo) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      kind: "photo",
      panX: state.panX,
      panY: state.panY,
      x: e.clientX,
      y: e.clientY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;

    if (!d) {
      const over = onText(pointAt(e));

      if (over !== overText) {
        setOverText(over);
      }

      return;
    }

    if (d.kind === "text") {
      const spot = spotAt(pointAt(e));
      setState(
        (s) => (s.textPosition === spot ? s : { ...s, textPosition: spot }),
        "textPosition"
      );

      return;
    }

    const sx = spare("x");
    const sy = spare("y");
    setState(
      (s) => ({
        ...s,
        panX: sx > 0 ? clampPan(d.panX + (e.clientX - d.x) / sx) : 0,
        panY: sy > 0 ? clampPan(d.panY + (e.clientY - d.y) / sy) : 0,
      }),
      "pan"
    );
  };

  const onPointerUp = () => {
    drag.current = null;
    setDraggingText(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? 0.2 : 0.05;

    const moves = new Map<string, [number, number]>([
      ["ArrowDown", [0, -step]],
      ["ArrowLeft", [step, 0]],
      ["ArrowRight", [-step, 0]],
      ["ArrowUp", [0, step]],
    ]);

    const m = moves.get(e.key);

    if (!m || !photo) {
      return;
    }

    e.preventDefault();
    setState(
      (s) => ({
        ...s,
        panX: clampPan(s.panX + m[0]),
        panY: clampPan(s.panY + m[1]),
      }),
      "pan"
    );
  };

  const doExport = async (kind: Kind) => {
    setBusy(kind);

    try {
      const name = slug(`${state.title} ${state.subtitle}`);

      const file = {
        cover: "cover-3000.png",
        player: "player-1080x1440.png",
        record: "record-3000x2000.jpeg",
      }[kind];

      const full =
        photo && filterPhoto(photo, state.filter, state.filterStrength);

      await exportImage(kind, state, full, photoColor, `${name}-${file}`);
    } catch (error) {
      // SAFETY: exportImage throws Errors of its own, and the canvas calls
      // it makes throw DOMExceptions, which are Errors too.
      setErrorMessage((error as Error).message);
    }

    setBusy(null);
  };

  const startOver = () => {
    if (
      // oxlint-disable-next-line no-alert -- the browser's own confirm is the intended check before clearing everything
      !window.confirm(t.startOverConfirm)
    ) {
      return;
    }

    setPhoto((prev) => {
      if (prev?.image instanceof HTMLImageElement) {
        URL.revokeObjectURL(prev.image.src);
      }

      return null;
    });
    setPhotoHues([40]);
    setPhotoColor(BLANK_BACKGROUND);
    setErrorMessage(null);
    dispatch({ type: "reset", value: DEFAULT_STATE });
  };

  const smallPhoto = photo && Math.min(photo.width, photo.height) < 3000;

  // The bare photo, framed as on the cover, for the thumbnails.
  const thumbState = useMemo(
    () => ({ ...state, showLabel: false, showText: false }),
    [state]
  );

  // SAFETY: a TextPosition is always "<row>-<column>".
  const [row, column] = state.textPosition.split("-") as [
    (typeof ROWS)[number],
    (typeof COLUMNS)[number],
  ];

  return (
    <div className="page dotted">
      <header className="topbar maker-topbar">
        <a href="/" onClick={linkTo("/")} className="brand">
          <Logo />
          <span>
            <span className="brand-name">Album Cover Maker</span>
            <span className="brand-by">{t.by}</span>
          </span>
        </a>
        <div className="topbar-actions">
          <button
            type="button"
            className="pill primary"
            onClick={() => setState((s) => feelingLucky(s, photoHues))}
          >
            <DiceIcon />
            {t.lucky}
          </button>
          <button type="button" className="pill" onClick={startOver}>
            <RestartIcon />
            {t.startOver}
          </button>
        </div>
        <div className="topbar-end">
          <p className="topbar-hint">{t.hint}</p>
          <div
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would bring its own border, padding and legend layout; this row of buttons is styled as a plain group
            role="group"
            aria-label={t.history}
            className="history"
          >
            <button
              type="button"
              className="pill small"
              title={t.undoTitle}
              disabled={history.past.length === 0}
              onClick={undo}
            >
              <UndoIcon />
              {t.undo}
            </button>
            <button
              type="button"
              className="pill small"
              title={t.redoTitle}
              disabled={history.future.length === 0}
              onClick={redo}
            >
              <UndoIcon redo />
              {t.redo}
            </button>
          </div>
          <LanguageToggle />
          <ThemeToggle />
          <AccountButton />
        </div>
      </header>

      <main className="maker">
        {errorMessage && (
          <p role="alert" className="error">
            {errorMessage}
            <button
              type="button"
              className="pill small"
              onClick={() => setErrorMessage(null)}
            >
              {t.dismiss}
            </button>
          </p>
        )}

        <section aria-label={t.preview} className="preview-row">
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the window is where a photo can be dropped; the "choose photo" button is the keyboard way in */}
          <Window
            name="cover.png"
            className={`cover-window${dragOver ? " drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              openFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="cover-stage">
              <div ref={coverBox} className="cover-frame">
                <CoverCanvas
                  kind="cover"
                  state={state}
                  photo={shownPhoto}
                  width={coverWidth}
                  fontsTick={fontsTick}
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a canvas has no tag of its own for this; role="img" gives the drawing a name
                  role="img"
                  aria-label={t.coverPreview(state.title, state.subtitle)}
                  tabIndex={photo ? 0 : -1}
                  className={coverCursor(
                    overText || draggingText,
                    photo !== null
                  )}
                  onTextBox={onTextBox}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onPointerLeave={() => setOverText(false)}
                  onKeyDown={onKeyDown}
                />
                {draggingText && (
                  <div className="spot-grid" aria-hidden="true">
                    {TEXT_POSITIONS.map((spot) => (
                      <span
                        key={spot}
                        className={
                          spot === state.textPosition ? "active" : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                {!photo && (
                  <button
                    type="button"
                    className="drop-hint"
                    onClick={() => fileInput.current?.click()}
                  >
                    <strong>{t.dropHere}</strong>
                    <span>{t.chooseOne}</span>
                  </button>
                )}
              </div>
            </div>
            <p className="hint center">{photo ? t.dragHint : t.staysHere}</p>
          </Window>

          <Window name="player.exe" className="player-window">
            <div className="player-stage">
              <CoverCanvas
                kind="player"
                state={state}
                photo={shownPhoto}
                width={250}
                fontsTick={fontsTick}
                className="player-canvas"
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a canvas has no tag of its own for this; role="img" gives the drawing a name
                role="img"
                aria-label={t.playerPreview}
              />
            </div>
          </Window>

          <Window name="record.jpeg" className="record-window">
            <div ref={recordBox} className="record-frame">
              <CoverCanvas
                kind="record"
                state={state}
                photo={shownPhoto}
                width={recordWidth}
                fontsTick={fontsTick}
                background={photoColor}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a canvas has no tag of its own for this; role="img" gives the drawing a name
                role="img"
                aria-label={t.recordPreview}
              />
            </div>
            <p className="hint center">{t.recordHint}</p>
          </Window>
        </section>

        <form
          aria-label={t.settings}
          className="settings"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="stack">
            <fieldset className="panel">
              <legend>{t.legends.photo}</legend>
              {photo ? (
                <div className="photo-info">
                  <CoverCanvas
                    kind="cover"
                    state={thumbState}
                    photo={photo}
                    width={56}
                    fontsTick={0}
                    className="thumb"
                    aria-hidden="true"
                  />
                  <div className="photo-meta">
                    <div className="photo-name">{photo.name}</div>
                    <div className="muted small">
                      {t.cropped(photo.width, photo.height)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted">{t.noPhoto}</p>
              )}
              {smallPhoto && <p className="hint">{t.smallPhoto}</p>}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="visually-hidden"
                id="photo-file"
                onChange={(e) => {
                  openFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="pill wide"
                onClick={() => fileInput.current?.click()}
              >
                {photo ? t.replacePhoto : t.choosePhoto}
              </button>
              <label htmlFor="zoom" className="field">
                <span className="field-row">
                  {t.zoom}
                  <span className="muted">{state.zoom}%</span>
                </span>
                <input
                  id="zoom"
                  type="range"
                  min={100}
                  max={500}
                  value={state.zoom}
                  disabled={!photo}
                  onChange={(e) => set("zoom", Number(e.target.value))}
                />
              </label>
              <div className="field">
                <span>{t.filter}</span>
                <div
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would bring its own border, padding and legend layout; this row of buttons is styled as a plain group
                  role="group"
                  aria-label={t.photoFilter}
                  className="filter-grid"
                >
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="filter"
                      aria-pressed={state.filter === f.id}
                      disabled={!photo}
                      onClick={() => set("filter", f.id)}
                    >
                      <CoverCanvas
                        kind="cover"
                        state={thumbState}
                        photo={photo}
                        width={48}
                        fontsTick={0}
                        style={{ filter: cssFilter(f.id) }}
                        aria-hidden="true"
                      />
                      {t.filters[f.id]}
                    </button>
                  ))}
                </div>
              </div>
              <label htmlFor="filter-strength" className="field">
                <span className="field-row">
                  {t.filterStrength}
                  <span className="muted">{state.filterStrength}%</span>
                </span>
                <input
                  id="filter-strength"
                  type="range"
                  min={0}
                  max={100}
                  value={state.filterStrength}
                  disabled={!photo || state.filter === "original"}
                  onChange={(e) =>
                    set("filterStrength", Number(e.target.value))
                  }
                />
              </label>
            </fieldset>

            <fieldset className="panel grow">
              <legend>{t.legends.export}</legend>
              <button
                type="button"
                className="export"
                disabled={busy !== null}
                onClick={() => doExport("cover")}
              >
                {exportLabel(busy, "cover", t)}
                <span>PNG · 3000 × 3000</span>
              </button>
              <button
                type="button"
                className="export"
                disabled={busy !== null}
                onClick={() => doExport("player")}
              >
                {exportLabel(busy, "player", t)}
                <span>PNG · 1080 × 1440</span>
              </button>
              <button
                type="button"
                className="export"
                disabled={busy !== null}
                onClick={() => doExport("record")}
              >
                {exportLabel(busy, "record", t)}
                <span>JPEG · 3000 × 2000</span>
              </button>
              <p className="hint">{t.streaming}</p>
            </fieldset>
          </div>

          <div className="stack">
            <fieldset className="panel">
              <legend>{t.legends.coverText}</legend>
              <label htmlFor="show-text" className="switch-row">
                {t.showText}
                <input
                  id="show-text"
                  className="switch"
                  type="checkbox"
                  // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props -- a native checkbox carries its own checked state, which ARIA in HTML says not to repeat in aria-checked
                  role="switch"
                  checked={state.showText}
                  onChange={(e) => set("showText", e.target.checked)}
                />
              </label>
              <label htmlFor="main-title" className="field">
                {t.mainTitle}
                <input
                  id="main-title"
                  className="text"
                  value={state.title}
                  maxLength={80}
                  onChange={(e) => set("title", e.target.value)}
                />
              </label>
              <label htmlFor="subtitle" className="field">
                {t.subtitle}
                <input
                  id="subtitle"
                  className="text"
                  value={state.subtitle}
                  maxLength={80}
                  onChange={(e) => set("subtitle", e.target.value)}
                />
              </label>
              <div className="field">
                <span>{t.alignment}</span>
                <Segmented
                  label={t.alignLabel}
                  options={TEXT_ALIGNS}
                  value={state.textAlign}
                  disabled={!state.showText}
                  name={(align) => t.alignName(t.aligns[align])}
                  text={(align) => t.aligns[align]}
                  onChange={(align) => set("textAlign", align)}
                />
              </div>
              <div className="field">
                <span>{t.position}</span>
                <Segmented
                  label={t.vertical}
                  options={ROWS}
                  value={row}
                  disabled={!state.showText}
                  text={(r) => t.positions[r]}
                  onChange={(r) => set("textPosition", `${r}-${column}`)}
                />
                <Segmented
                  label={t.horizontal}
                  options={COLUMNS}
                  value={column}
                  disabled={!state.showText}
                  text={(c) => t.positions[c]}
                  onChange={(c) => set("textPosition", `${row}-${c}`)}
                />
              </div>
              {state.showText && placedText(state) !== state.textPosition && (
                <p className="hint">
                  {t.labelHint(
                    t.corners[state.labelCorner],
                    spotName(placedText(state), t)
                  )}
                </p>
              )}
            </fieldset>

            <fieldset className="panel grow">
              <legend>{t.legends.player}</legend>
              <HueSlider
                id="player-hue"
                label={t.player}
                hue={state.playerHue}
                color={playerColor(state.playerHue)}
                track={hueTrack(62, 86)}
                onChange={(h) => setHue("playerHue", h)}
              />
              <div className="hue-lock">
                <button
                  type="button"
                  className="pill small"
                  aria-pressed={huesLocked}
                  title={t.moveTogether}
                  onClick={() => setHuesLocked((l) => !l)}
                >
                  <LockIcon open={!huesLocked} />
                  {huesLocked ? t.locked : t.unlocked}
                </button>
              </div>
              <HueSlider
                id="button-hue"
                label={t.buttonsAndText}
                hue={state.buttonHue}
                color={buttonColor(state.buttonHue)}
                track={hueTrack(48, 25)}
                onChange={(h) => setHue("buttonHue", h)}
              />
              <p className="hint">
                {huesLocked ? t.huesLocked : t.huesUnlocked} {t.lato}
              </p>
            </fieldset>
          </div>

          <div className="stack">
            <fieldset className="panel">
              <legend>{t.legends.fonts}</legend>
              <div className="field">
                <label htmlFor="title-font">{t.titleFont}</label>
                <FontPicker
                  id="title-font"
                  label={t.titleFont}
                  fonts={TITLE_FONTS}
                  value={state.titleFont}
                  style={state.titleStyle}
                  onChange={(titleFont) =>
                    setState((s) => ({ ...s, comboId: null, titleFont }))
                  }
                />
                <div className="style-row">
                  <StyleButtons
                    t={t}
                    label={t.title}
                    value={state.titleStyle}
                    onChange={(v) =>
                      setState((s) => ({ ...s, comboId: null, titleStyle: v }))
                    }
                  />
                  <ColorInput
                    id="title-color"
                    label={t.titleColour}
                    value={state.titleColor}
                    onChange={(v) => set("titleColor", v)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="subtitle-font">{t.subtitleFont}</label>
                <FontPicker
                  id="subtitle-font"
                  label={t.subtitleFont}
                  fonts={SUBTITLE_FONTS}
                  value={state.subtitleFont}
                  style={state.subtitleStyle}
                  onChange={(subtitleFont) =>
                    setState((s) => ({ ...s, comboId: null, subtitleFont }))
                  }
                />
                <div className="style-row">
                  <StyleButtons
                    t={t}
                    label={t.subtitle}
                    value={state.subtitleStyle}
                    onChange={(v) => set("subtitleStyle", v)}
                  />
                  <ColorInput
                    id="subtitle-color"
                    label={t.subtitleColour}
                    value={state.subtitleColor}
                    onChange={(v) => set("subtitleColor", v)}
                  />
                </div>
              </div>
              <p className="hint">{t.fontsHint}</p>
            </fieldset>

            <fieldset className="panel grow">
              <legend>{t.legends.label}</legend>
              <label htmlFor="pa-show" className="switch-row">
                {t.showLabel}
                <input
                  id="pa-show"
                  className="switch"
                  type="checkbox"
                  // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props -- a native checkbox carries its own checked state, which ARIA in HTML says not to repeat in aria-checked
                  role="switch"
                  checked={state.showLabel}
                  onChange={(e) => set("showLabel", e.target.checked)}
                />
              </label>
              <div className="field">
                <span className="field-row">
                  {t.labelSize}
                  <span className="muted">{t.labelWidth(state.labelSize)}</span>
                </span>
                <div
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would bring its own border, padding and legend layout; this row of buttons is styled as a plain group
                  role="group"
                  aria-label={t.labelSize}
                  className="size-grid"
                >
                  {LABEL_SIZES.map(({ name, percent }) => (
                    <button
                      key={name}
                      type="button"
                      className="toggle size-toggle"
                      aria-label={`${name} ${percent}%`}
                      aria-pressed={state.labelSize === percent}
                      disabled={!state.showLabel}
                      onClick={() => set("labelSize", percent)}
                    >
                      {name}
                      <span className="size-percent">{percent}%</span>
                    </button>
                  ))}
                </div>
                <span className="hint">{t.mostReleases}</span>
              </div>
              <div className="field">
                <span>{t.position}</span>
                <div
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would bring its own border, padding and legend layout; this row of buttons is styled as a plain group
                  role="group"
                  aria-label={t.labelCorner}
                  className="corner-grid"
                >
                  {CORNERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="toggle"
                      aria-pressed={state.labelCorner === c}
                      disabled={!state.showLabel}
                      onClick={() => set("labelCorner", c)}
                    >
                      {t.corners[c]}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          </div>

          <fieldset className="panel combos-panel">
            <legend>{t.legends.combos}</legend>
            <p className="lead">
              {t.combosLead(photo !== null, COMBOS.length)}
            </p>
            <div className="combo-scroll">
              <div
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <ul> would bring list styling to this scrolling row of cards
                role="list"
                aria-label={t.suggested}
                className="combo-list"
              >
                {suggestions.map((sug) => {
                  const active =
                    state.comboId === sug.combo.id &&
                    state.playerHue === sug.playerHue &&
                    state.buttonHue === sug.buttonHue;

                  return (
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an <li> would bring list styling; the list it belongs to is a <div>
                    <div role="listitem" key={sug.combo.id}>
                      <button
                        type="button"
                        className="combo"
                        aria-pressed={active}
                        onClick={() => applyCombo(sug)}
                      >
                        <span
                          className="combo-swatch"
                          style={{
                            background: playerColor(sug.playerHue),
                            color: buttonColor(sug.buttonHue),
                            font: cssFont(
                              sug.combo.titleFont,
                              sug.combo.titleStyle,
                              24
                            ),
                          }}
                        >
                          Aa
                        </span>
                        <span className="combo-text">
                          <span className="combo-name">{sug.combo.name}</span>
                          <span className="combo-fonts">
                            {t.with(sug.combo.subtitleFont)}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </fieldset>
        </form>
      </main>
      <footer className="footer">
        <Logo size={20} /> Album Cover Maker {t.by}
      </footer>
    </div>
  );
};
