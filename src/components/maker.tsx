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
import {
  BLANK_BACKGROUND,
  CoverCanvas,
  exportImage,
  useFontsReady,
} from "./cover-canvas";
import type { Kind } from "./cover-canvas";
import { filterPhoto } from "./filter-photo";
import { FontPicker } from "./font-picker";
import { Logo } from "./logo";

function useElementWidth<T extends HTMLElement>(fallback: number) {
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
}

async function loadPhoto(
  file: File
): Promise<{ photo: Photo; hues: number[]; color: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const sample = document.createElement("canvas");
    sample.width = sample.height = 48;
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
      "That file couldn't be opened as an image. Try a JPEG, PNG or WebP."
    );
  }
}

function StyleButtons({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TextStyle;
  onChange: (v: TextStyle) => void;
}) {
  const keys: { key: keyof TextStyle; text: string; name: string }[] = [
    { key: "bold", name: "bold", text: "B" },
    { key: "italic", name: "italic", text: "I" },
    { key: "underline", name: "underline", text: "U" },
    { key: "strike", name: "strikethrough", text: "S" },
  ];
  return (
    <div
      role="group"
      aria-label={`${label} font style`}
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
}

function HueSlider({
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
}) {
  return (
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
}

function ColorInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
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
}

/** A row of joined buttons where exactly one is chosen. */
function Segmented<T extends string>({
  label,
  options,
  value,
  disabled,
  name,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  disabled?: boolean;
  /** Accessible name for an option, when its text alone is not enough. */
  name?: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
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
          {option}
        </button>
      ))}
    </div>
  );
}

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
const spotName = (spot: string) => spot.replace("-", " ");

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

export function Maker() {
  const [history, dispatch] = useReducer(
    coverHistory,
    DEFAULT_STATE,
    startHistory
  );
  const state = history.present;
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
        setError("That isn't an image. Try a JPEG, PNG or WebP.");
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
        setError(null);
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
        setError((error as Error).message);
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
  const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  };
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
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setState(
      (s) => ({
        ...s,
        panX: sx > 0 ? clamp(d.panX + (e.clientX - d.x) / sx) : 0,
        panY: sy > 0 ? clamp(d.panY + (e.clientY - d.y) / sy) : 0,
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
    const moves: Record<string, [number, number]> = {
      ArrowDown: [0, -step],
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
    };
    const m = moves[e.key];
    if (!m || !photo) {
      return;
    }
    e.preventDefault();
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setState(
      (s) => ({
        ...s,
        panX: clamp(s.panX + m[0]),
        panY: clamp(s.panY + m[1]),
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
      setError((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const startOver = () => {
    if (
      !window.confirm("Start over? Your photo and settings will be cleared.")
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
    setError(null);
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
            <span className="brand-by">by Irma HS</span>
          </span>
        </a>
        <div className="topbar-actions">
          <button
            type="button"
            className="pill primary"
            onClick={() => setState((s) => feelingLucky(s, photoHues))}
          >
            <DiceIcon />
            I'm feeling lucky
          </button>
          <button type="button" className="pill" onClick={startOver}>
            <RestartIcon />
            start over
          </button>
        </div>
        <div className="topbar-end">
          <p className="topbar-hint">
            drop in a photo, add your title, export your cover.
          </p>
          <div role="group" aria-label="History" className="history">
            <button
              type="button"
              className="pill small"
              title="Undo (Ctrl+Z or ⌘Z)"
              disabled={history.past.length === 0}
              onClick={undo}
            >
              <UndoIcon />
              undo
            </button>
            <button
              type="button"
              className="pill small"
              title="Redo (Ctrl+Shift+Z or ⇧⌘Z)"
              disabled={history.future.length === 0}
              onClick={redo}
            >
              <UndoIcon redo />
              redo
            </button>
          </div>
        </div>
      </header>

      <main className="maker">
        {error && (
          <p role="alert" className="error">
            {error}
            <button
              type="button"
              className="pill small"
              onClick={() => setError(null)}
            >
              dismiss
            </button>
          </p>
        )}

        <section aria-label="Preview" className="preview-row">
          <fieldset
            className={`panel cover-panel${dragOver ? " drag-over" : ""}`}
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
            <legend>cover.png</legend>
            <div className="cover-stage">
              <div ref={coverBox} className="cover-frame">
                <CoverCanvas
                  kind="cover"
                  state={state}
                  photo={shownPhoto}
                  width={coverWidth}
                  fontsTick={fontsTick}
                  role="img"
                  aria-label={`Album cover preview: ${state.title} by ${state.subtitle}`}
                  tabIndex={photo ? 0 : -1}
                  className={
                    overText || draggingText
                      ? "text-draggable"
                      : photo
                        ? "draggable"
                        : undefined
                  }
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
                    <strong>Drop a photo here</strong>
                    <span>or click to choose one</span>
                  </button>
                )}
              </div>
            </div>
            <p className="hint center">
              {photo
                ? "Drag the title to place it, or anywhere else to move your photo (arrow keys work too)."
                : "Your photo stays in your browser. Nothing is uploaded."}
            </p>
          </fieldset>

          <fieldset className="panel player-panel">
            <legend>player.exe</legend>
            <div className="player-stage">
              <CoverCanvas
                kind="player"
                state={state}
                photo={shownPhoto}
                width={250}
                fontsTick={fontsTick}
                className="player-canvas"
                role="img"
                aria-label="Music player preview using your cover"
              />
            </div>
          </fieldset>

          <fieldset className="panel record-panel">
            <legend>record.jpeg</legend>
            <div ref={recordBox} className="record-frame">
              <CoverCanvas
                kind="record"
                state={state}
                photo={shownPhoto}
                width={recordWidth}
                fontsTick={fontsTick}
                background={photoColor}
                role="img"
                aria-label="Record mock-up: your cover with the record peeking out"
              />
            </div>
            <p className="hint center">
              The backdrop is your photo's main colour, and the record's label
              shows the picture.
            </p>
          </fieldset>
        </section>

        <form
          aria-label="Settings"
          className="settings"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="stack">
            <fieldset className="panel">
              <legend>photo</legend>
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
                      {photo.width} × {photo.height}, cropped to square
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted">
                  No photo yet. JPEG, PNG and WebP all work.
                </p>
              )}
              {smallPhoto && (
                <p className="hint">
                  This photo is under 3000 px, so the export will be scaled up
                  and may look soft.
                </p>
              )}
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
                {photo ? "replace photo" : "choose photo"}
              </button>
              <label htmlFor="zoom" className="field">
                <span className="field-row">
                  Zoom<span className="muted">{state.zoom}%</span>
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
                <span>Filter</span>
                <div
                  role="group"
                  aria-label="Photo filter"
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
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <label htmlFor="filter-strength" className="field">
                <span className="field-row">
                  Filter strength
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
              <legend>export</legend>
              <button
                type="button"
                className="export"
                disabled={busy !== null}
                onClick={() => doExport("cover")}
              >
                {busy === "cover" ? "Saving…" : "Cover"}
                <span>PNG · 3000 × 3000</span>
              </button>
              <button
                type="button"
                className="export"
                disabled={busy !== null}
                onClick={() => doExport("player")}
              >
                {busy === "player" ? "Saving…" : "Player"}
                <span>PNG · 1080 × 1440</span>
              </button>
              <button
                type="button"
                className="export"
                disabled={busy !== null}
                onClick={() => doExport("record")}
              >
                {busy === "record" ? "Saving…" : "Record"}
                <span>JPEG · 3000 × 2000</span>
              </button>
              <p className="hint">
                Streaming stores ask for at least 3000 × 3000.
              </p>
            </fieldset>
          </div>

          <div className="stack">
            <fieldset className="panel">
              <legend>cover text</legend>
              <label htmlFor="show-text" className="switch-row">
                Show text on the cover
                <input
                  id="show-text"
                  className="switch"
                  type="checkbox"
                  role="switch"
                  checked={state.showText}
                  onChange={(e) => set("showText", e.target.checked)}
                />
              </label>
              <label htmlFor="main-title" className="field">
                Main title
                <input
                  id="main-title"
                  className="text"
                  value={state.title}
                  maxLength={80}
                  onChange={(e) => set("title", e.target.value)}
                />
              </label>
              <label htmlFor="subtitle" className="field">
                Subtitle
                <input
                  id="subtitle"
                  className="text"
                  value={state.subtitle}
                  maxLength={80}
                  onChange={(e) => set("subtitle", e.target.value)}
                />
              </label>
              <div className="field">
                <span>Alignment</span>
                <Segmented
                  label="Text alignment"
                  options={TEXT_ALIGNS}
                  value={state.textAlign}
                  disabled={!state.showText}
                  name={(align) => `Align ${align}`}
                  onChange={(align) => set("textAlign", align)}
                />
              </div>
              <div className="field">
                <span>Position</span>
                <Segmented
                  label="Vertical position"
                  options={ROWS}
                  value={row}
                  disabled={!state.showText}
                  onChange={(r) => set("textPosition", `${r}-${column}`)}
                />
                <Segmented
                  label="Horizontal position"
                  options={COLUMNS}
                  value={column}
                  disabled={!state.showText}
                  onChange={(c) => set("textPosition", `${row}-${c}`)}
                />
              </div>
              {state.showText && placedText(state) !== state.textPosition && (
                <p className="hint">
                  The label has the {spotName(state.labelCorner)} corner, so the
                  text sits in the {spotName(placedText(state))}.
                </p>
              )}
            </fieldset>

            <fieldset className="panel grow">
              <legend>player</legend>
              <HueSlider
                id="player-hue"
                label="Player"
                hue={state.playerHue}
                color={playerColor(state.playerHue)}
                track={hueTrack(62, 86)}
                onChange={(h) =>
                  setState(
                    (s) => ({ ...s, comboId: null, playerHue: h }),
                    "playerHue"
                  )
                }
              />
              <HueSlider
                id="button-hue"
                label="Buttons and text"
                hue={state.buttonHue}
                color={buttonColor(state.buttonHue)}
                track={hueTrack(48, 25)}
                onChange={(h) =>
                  setState(
                    (s) => ({ ...s, buttonHue: h, comboId: null }),
                    "buttonHue"
                  )
                }
              />
              <p className="hint">
                The player's text always uses Lato. Its album picture is your
                cover, exactly as designed.
              </p>
            </fieldset>
          </div>

          <div className="stack">
            <fieldset className="panel">
              <legend>fonts</legend>
              <div className="field">
                <label htmlFor="title-font">Title font</label>
                <FontPicker
                  id="title-font"
                  label="Title font"
                  fonts={TITLE_FONTS}
                  value={state.titleFont}
                  style={state.titleStyle}
                  onChange={(titleFont) =>
                    setState((s) => ({ ...s, comboId: null, titleFont }))
                  }
                />
                <div className="style-row">
                  <StyleButtons
                    label="Title"
                    value={state.titleStyle}
                    onChange={(v) =>
                      setState((s) => ({ ...s, comboId: null, titleStyle: v }))
                    }
                  />
                  <ColorInput
                    id="title-color"
                    label="Title colour"
                    value={state.titleColor}
                    onChange={(v) => set("titleColor", v)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="subtitle-font">Subtitle font</label>
                <FontPicker
                  id="subtitle-font"
                  label="Subtitle font"
                  fonts={SUBTITLE_FONTS}
                  value={state.subtitleFont}
                  style={state.subtitleStyle}
                  onChange={(subtitleFont) =>
                    setState((s) => ({ ...s, comboId: null, subtitleFont }))
                  }
                />
                <div className="style-row">
                  <StyleButtons
                    label="Subtitle"
                    value={state.subtitleStyle}
                    onChange={(v) => set("subtitleStyle", v)}
                  />
                  <ColorInput
                    id="subtitle-color"
                    label="Subtitle colour"
                    value={state.subtitleColor}
                    onChange={(v) => set("subtitleColor", v)}
                  />
                </div>
              </div>
              <p className="hint">
                Title and subtitle fonts are separate sets, so the two never
                clash.
              </p>
            </fieldset>

            <fieldset className="panel grow">
              <legend>label</legend>
              <label htmlFor="pa-show" className="switch-row">
                Show the label
                <input
                  id="pa-show"
                  className="switch"
                  type="checkbox"
                  role="switch"
                  checked={state.showLabel}
                  onChange={(e) => set("showLabel", e.target.checked)}
                />
              </label>
              <div className="field">
                <span className="field-row">
                  Label size
                  <span className="muted">{state.labelSize}% of the width</span>
                </span>
                <div role="group" aria-label="Label size" className="size-grid">
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
                <span className="hint">Most releases use S (10%).</span>
              </div>
              <div className="field">
                <span>Position</span>
                <div
                  role="group"
                  aria-label="Label corner"
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
                      {c.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          </div>

          <fieldset className="panel combos-panel">
            <legend>combos</legend>
            <p className="lead">
              {photo
                ? "Picked from your photo."
                : "Add a photo and these pick up its colours."}{" "}
              Each of the {COMBOS.length} sets the cover fonts and player
              colours.
            </p>
            <div className="combo-scroll">
              <div
                role="list"
                aria-label="Suggested combos"
                className="combo-list"
              >
                {suggestions.map((sug) => {
                  const active =
                    state.comboId === sug.combo.id &&
                    state.playerHue === sug.playerHue &&
                    state.buttonHue === sug.buttonHue;
                  return (
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
                            with {sug.combo.subtitleFont}
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
        <Logo size={20} /> Album Cover Maker by Irma HS · no login, no uploads
      </footer>
    </div>
  );
}
