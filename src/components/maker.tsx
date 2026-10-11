import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buttonColor, dominantHues, playerColor } from "../lib/color";
import { COMBOS, suggestCombos } from "../lib/combos";
import type { Suggestion } from "../lib/combos";
import { SUBTITLE_FONTS, TITLE_FONTS, cssFont } from "../lib/fonts";
import type { TextStyle } from "../lib/fonts";
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
import type { CoverState, Photo, TextAlign } from "../lib/state";
import { linkTo } from "../router";
import { CoverCanvas, exportPng, useFontsReady } from "./cover-canvas";
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
): Promise<{ photo: Photo; hues: number[] }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const sample = document.createElement("canvas");
    sample.width = sample.height = 48;
    const ctx = sample.getContext("2d", { willReadFrequently: true });
    let hues = [40];
    if (ctx) {
      ctx.drawImage(img, 0, 0, 48, 48);
      hues = dominantHues(ctx.getImageData(0, 0, 48, 48).data, 3);
    }
    return {
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

/** Three bars, lined up the way the text is. */
function AlignIcon({ align }: { align: TextAlign }) {
  const x = (w: number) =>
    align === "left" ? 3 : align === "right" ? 21 - w : 12 - w / 2;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {[18, 12, 15].map((w, i) => (
        <rect
          key={w}
          x={x(w)}
          y={5 + i * 6}
          width={w}
          height={2.6}
          rx={1.3}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

const ROWS = ["top", "middle", "bottom"] as const;
const COLUMNS = ["left", "center", "right"] as const;
const third = (v: number) => Math.min(2, Math.max(0, Math.floor(v * 3)));
/** The text spot under a point given as fractions of the cover's side. */
const spotAt = (p: { x: number; y: number }) =>
  `${ROWS[third(p.y)]}-${COLUMNS[third(p.x)]}` as const;
const spotName = (spot: string) => spot.replace("-", " ");

const hueTrack = (s: number, l: number) =>
  `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} ${s}% ${l}%)`).join(", ")})`;

export function Maker() {
  const [state, setState] = useState<CoverState>(DEFAULT_STATE);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoHues, setPhotoHues] = useState<number[]>([40]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"cover" | "player" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fontsTick = useFontsReady(state);
  const [coverBox, coverWidth] = useElementWidth<HTMLDivElement>(500);

  const set = useCallback(
    <K extends keyof CoverState>(key: K, value: CoverState[K]) =>
      setState((s) => ({ ...s, [key]: value })),
    []
  );

  const suggestions = useMemo(() => suggestCombos(photoHues), [photoHues]);

  const applyCombo = useCallback((sug: Suggestion) => {
    setState((s) => ({
      ...s,
      buttonHue: sug.buttonHue,
      comboId: sug.combo.id,
      playerHue: sug.playerHue,
      subtitleFont: sug.combo.subtitleFont,
      titleFont: sug.combo.titleFont,
      titleStyle: sug.combo.titleStyle,
    }));
  }, []);

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
        const { photo: next, hues } = await loadPhoto(file);
        setPhoto((prev) => {
          if (prev?.image instanceof HTMLImageElement) {
            URL.revokeObjectURL(prev.image.src);
          }
          return next;
        });
        setPhotoHues(hues);
        setError(null);
        setState((s) => ({ ...s, panX: 0, panY: 0, zoom: 100 }));
        // Re-apply the chosen combo with the new photo's colours.
        const current =
          suggestCombos(hues).find((x) => x.combo.id === state.comboId) ??
          suggestCombos(hues)[0];
        applyCombo(current);
      } catch (error) {
        setError((error as Error).message);
      }
    },
    [applyCombo, state.comboId]
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
      setState((s) =>
        s.textPosition === spot ? s : { ...s, textPosition: spot }
      );
      return;
    }
    const sx = spare("x");
    const sy = spare("y");
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setState((s) => ({
      ...s,
      panX: sx > 0 ? clamp(d.panX + (e.clientX - d.x) / sx) : 0,
      panY: sy > 0 ? clamp(d.panY + (e.clientY - d.y) / sy) : 0,
    }));
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
    setState((s) => ({
      ...s,
      panX: clamp(s.panX + m[0]),
      panY: clamp(s.panY + m[1]),
    }));
  };

  const doExport = async (kind: "cover" | "player") => {
    setBusy(kind);
    try {
      const name = slug(`${state.title} ${state.subtitle}`);
      await exportPng(
        kind,
        state,
        photo,
        kind === "cover"
          ? `${name}-cover-3000.png`
          : `${name}-player-1080x1440.png`
      );
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
    setError(null);
    setState(DEFAULT_STATE);
  };

  const smallPhoto = photo && Math.min(photo.width, photo.height) < 3000;

  return (
    <div className="page dotted">
      <header className="topbar">
        <a href="/" onClick={linkTo("/")} className="brand">
          <Logo />
          <span>
            <span className="brand-name">Album Cover Maker</span>
            <span className="brand-by">by Irma HS</span>
          </span>
        </a>
        <p className="topbar-hint">
          drop in a photo, add your title, export your cover.
        </p>
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
                  photo={photo}
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
            <div className="cover-tools">
              <label htmlFor="zoom" className="field zoom-field">
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
              <button
                type="button"
                className="pill primary lucky"
                onClick={() => setState((s) => feelingLucky(s, photoHues))}
              >
                I'm feeling lucky
              </button>
            </div>
          </fieldset>

          <fieldset className="panel player-panel">
            <legend>player.exe</legend>
            <div className="player-stage">
              <CoverCanvas
                kind="player"
                state={state}
                photo={photo}
                width={290}
                fontsTick={fontsTick}
                className="player-canvas"
                role="img"
                aria-label="Music player preview using your cover"
              />
            </div>
          </fieldset>
        </section>

        <form
          aria-label="Settings"
          className="settings"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="stack">
            <fieldset className="panel">
              <legend>parental advisory</legend>
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
                <span>Corner</span>
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

            <fieldset className="panel grow">
              <legend>player</legend>
              <HueSlider
                id="player-hue"
                label="Player"
                hue={state.playerHue}
                color={playerColor(state.playerHue)}
                track={hueTrack(62, 86)}
                onChange={(h) =>
                  setState((s) => ({ ...s, comboId: null, playerHue: h }))
                }
              />
              <HueSlider
                id="button-hue"
                label="Buttons and text"
                hue={state.buttonHue}
                color={buttonColor(state.buttonHue)}
                track={hueTrack(48, 25)}
                onChange={(h) =>
                  setState((s) => ({ ...s, buttonHue: h, comboId: null }))
                }
              />
              <p className="hint">
                The player's text always uses Lato. Its album picture is your
                cover, exactly as designed.
              </p>
            </fieldset>
          </div>

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
            <div className="placement">
              <div className="field">
                <span>Position</span>
                <div
                  role="group"
                  aria-label="Text position"
                  className="spot-buttons"
                >
                  {TEXT_POSITIONS.map((spot) => (
                    <button
                      key={spot}
                      type="button"
                      className="toggle spot"
                      aria-label={spotName(spot)}
                      aria-pressed={state.textPosition === spot}
                      disabled={!state.showText}
                      onClick={() => set("textPosition", spot)}
                    />
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Alignment</span>
                <div
                  role="group"
                  aria-label="Text alignment"
                  className="align-buttons"
                >
                  {TEXT_ALIGNS.map((align) => (
                    <button
                      key={align}
                      type="button"
                      className="toggle"
                      aria-label={`Align ${align}`}
                      aria-pressed={state.textAlign === align}
                      disabled={!state.showText}
                      onClick={() => set("textAlign", align)}
                    >
                      <AlignIcon align={align} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {state.showText && placedText(state) !== state.textPosition && (
              <p className="hint">
                The label has the {spotName(state.labelCorner)} corner, so the
                text sits in the {spotName(placedText(state))}.
              </p>
            )}
            <div className="field">
              <label htmlFor="title-font">Title font</label>
              <select
                id="title-font"
                className="select"
                style={{ font: cssFont(state.titleFont, state.titleStyle, 19) }}
                value={state.titleFont}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    comboId: null,
                    titleFont: e.target.value as CoverState["titleFont"],
                  }))
                }
              >
                {TITLE_FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
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
              <select
                id="subtitle-font"
                className="select"
                style={{
                  font: cssFont(state.subtitleFont, state.subtitleStyle, 15),
                }}
                value={state.subtitleFont}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    comboId: null,
                    subtitleFont: e.target.value as CoverState["subtitleFont"],
                  }))
                }
              >
                {SUBTITLE_FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
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

          <div className="stack">
            <fieldset className="panel">
              <legend>photo</legend>
              {photo ? (
                <div className="photo-info">
                  <CoverCanvas
                    kind="cover"
                    state={{ ...state, showLabel: false, showText: false }}
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
                className="pill"
                onClick={() => fileInput.current?.click()}
              >
                {photo ? "replace photo" : "choose photo"}
              </button>
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
              <p className="hint">
                Streaming stores ask for at least 3000 × 3000.
              </p>
              <button type="button" className="pill" onClick={startOver}>
                start over
              </button>
            </fieldset>
          </div>
        </form>
      </main>
      <footer className="footer">
        <Logo size={20} /> Album Cover Maker by Irma HS · no login, no uploads
      </footer>
    </div>
  );
}
