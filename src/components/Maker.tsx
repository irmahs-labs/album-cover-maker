import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buttonColor, dominantHues, playerColor } from "../lib/color";
import { suggestCombos, type Suggestion } from "../lib/combos";
import { SUBTITLE_FONTS, TITLE_FONTS, cssFont, type TextStyle } from "../lib/fonts";
import { photoRect } from "../lib/render";
import { CORNERS, DEFAULT_STATE, slug, type CoverState, type Photo } from "../lib/state";
import { linkTo } from "../router";
import { CoverCanvas, exportPng, useFontsReady } from "./Canvas";
import { Logo } from "./Logo";

function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(1, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

async function loadPhoto(file: File): Promise<{ photo: Photo; hues: number[] }> {
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
    return { photo: { image: img, width: img.naturalWidth, height: img.naturalHeight, name: file.name }, hues };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("That file couldn't be opened as an image. Try a JPEG, PNG or WebP.");
  }
}

function StyleButtons({ label, value, onChange }: { label: string; value: TextStyle; onChange: (v: TextStyle) => void }) {
  const keys: { key: keyof TextStyle; text: string; name: string }[] = [
    { key: "bold", text: "B", name: "bold" },
    { key: "italic", text: "I", name: "italic" },
    { key: "underline", text: "U", name: "underline" },
    { key: "strike", text: "S", name: "strikethrough" },
  ];
  return (
    <div role="group" aria-label={`${label} font style`} className="style-buttons">
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

function HueSlider({ id, label, hue, color, track, onChange }: { id: string; label: string; hue: number; color: string; track: string; onChange: (h: number) => void }) {
  return (
    <label htmlFor={id} className="field">
      <span className="field-row">
        {label}
        <span className="swatch-value">
          <span className="swatch" style={{ background: color }} />
          {color}
        </span>
      </span>
      <input id={id} className="hue" type="range" min={0} max={360} value={hue} style={{ background: track }} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

const hueTrack = (s: number, l: number) =>
  `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} ${s}% ${l}%)`).join(", ")})`;

export function Maker() {
  const [state, setState] = useState<CoverState>(DEFAULT_STATE);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoHues, setPhotoHues] = useState<number[]>([40]);
  const [round, setRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"cover" | "player" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fontsTick = useFontsReady(state);
  const [coverBox, coverWidth] = useElementWidth<HTMLDivElement>(500);

  const set = useCallback(<K extends keyof CoverState>(key: K, value: CoverState[K]) => setState((s) => ({ ...s, [key]: value })), []);

  const suggestions = useMemo(() => suggestCombos(photoHues, round), [photoHues, round]);

  const applyCombo = useCallback((sug: Suggestion) => {
    setState((s) => ({
      ...s,
      comboId: sug.combo.id,
      titleFont: sug.combo.titleFont,
      subtitleFont: sug.combo.subtitleFont,
      titleStyle: sug.combo.titleStyle,
      playerHue: sug.playerHue,
      buttonHue: sug.buttonHue,
    }));
  }, []);

  const openFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("That isn't an image. Try a JPEG, PNG or WebP.");
        return;
      }
      try {
        const { photo: next, hues } = await loadPhoto(file);
        setPhoto((prev) => {
          if (prev?.image instanceof HTMLImageElement) URL.revokeObjectURL(prev.image.src);
          return next;
        });
        setPhotoHues(hues);
        setRound(0);
        setError(null);
        setState((s) => ({ ...s, zoom: 100, panX: 0, panY: 0 }));
        // Re-apply the chosen combo with the new photo's colours.
        const current = suggestCombos(hues, 0).find((x) => x.combo.id === state.comboId) ?? suggestCombos(hues, 0)[0];
        applyCombo(current);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [applyCombo, state.comboId],
  );

  // Drag the preview to move the photo inside the square.
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const spare = (axis: "x" | "y") => {
    if (!photo) return 0;
    const r = photoRect(photo, coverWidth, state.zoom, 0, 0);
    return ((axis === "x" ? r.w : r.h) - coverWidth) / 2;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
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
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? 0.2 : 0.05;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[e.key];
    if (!m || !photo) return;
    e.preventDefault();
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setState((s) => ({ ...s, panX: clamp(s.panX + m[0]), panY: clamp(s.panY + m[1]) }));
  };

  const doExport = async (kind: "cover" | "player") => {
    setBusy(kind);
    try {
      const name = slug(`${state.title} ${state.subtitle}`);
      await exportPng(kind, state, photo, kind === "cover" ? `${name}-cover-3000.png` : `${name}-player-1080x1440.png`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const startOver = () => {
    if (!window.confirm("Start over? Your photo and settings will be cleared.")) return;
    setPhoto((prev) => {
      if (prev?.image instanceof HTMLImageElement) URL.revokeObjectURL(prev.image.src);
      return null;
    });
    setPhotoHues([40]);
    setRound(0);
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
        <p className="topbar-hint">drop in a photo, add your title, export your cover.</p>
      </header>

      <main className="maker">
        {error && (
          <p role="alert" className="error">
            {error}
            <button type="button" className="pill small" onClick={() => setError(null)}>
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
                  className={photo ? "draggable" : undefined}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onKeyDown={onKeyDown}
                />
                {!photo && (
                  <button type="button" className="drop-hint" onClick={() => fileInput.current?.click()}>
                    <strong>Drop a photo here</strong>
                    <span>or click to choose one</span>
                  </button>
                )}
              </div>
            </div>
            <p className="hint center">{photo ? "Drag the cover (or use the arrow keys) to move your photo." : "Your photo stays in your browser. Nothing is uploaded."}</p>
          </fieldset>

          <fieldset className="panel player-panel">
            <legend>player.exe</legend>
            <div className="player-stage">
              <CoverCanvas kind="player" state={state} photo={photo} width={290} fontsTick={fontsTick} className="player-canvas" role="img" aria-label="Music player preview using your cover" />
            </div>
          </fieldset>
        </section>

        <form aria-label="Settings" className="settings" onSubmit={(e) => e.preventDefault()}>
          <div className="stack">
            <fieldset className="panel">
              <legend>parental advisory</legend>
              <label htmlFor="pa-show" className="switch-row">
                Show the label
                <input id="pa-show" className="switch" type="checkbox" role="switch" checked={state.showLabel} onChange={(e) => set("showLabel", e.target.checked)} />
              </label>
              <label htmlFor="pa-size" className="field">
                <span className="field-row">
                  Label size<span className="muted">{state.labelSize}%</span>
                </span>
                <input id="pa-size" type="range" min={8} max={20} value={state.labelSize} disabled={!state.showLabel} onChange={(e) => set("labelSize", Number(e.target.value))} />
                <span className="hint">Most releases sit at 8 to 12% of the width.</span>
              </label>
              <div className="field">
                <span>Corner</span>
                <div role="group" aria-label="Label corner" className="corner-grid">
                  {CORNERS.map((c) => (
                    <button key={c} type="button" className="toggle" aria-pressed={state.labelCorner === c} disabled={!state.showLabel} onClick={() => set("labelCorner", c)}>
                      {c.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="panel grow">
              <legend>player</legend>
              <label htmlFor="player-text" className="switch-row">
                Show title and subtitle
                <input id="player-text" className="switch" type="checkbox" role="switch" checked={state.playerShowText} onChange={(e) => set("playerShowText", e.target.checked)} />
              </label>
              <HueSlider id="player-hue" label="Player" hue={state.playerHue} color={playerColor(state.playerHue)} track={hueTrack(62, 86)} onChange={(h) => setState((s) => ({ ...s, playerHue: h, comboId: null }))} />
              <HueSlider id="button-hue" label="Buttons and text" hue={state.buttonHue} color={buttonColor(state.buttonHue)} track={hueTrack(48, 25)} onChange={(h) => setState((s) => ({ ...s, buttonHue: h, comboId: null }))} />
              <p className="hint">The player's text always uses Figtree. Its album picture is your cover, exactly as designed.</p>
            </fieldset>
          </div>

          <fieldset className="panel">
            <legend>cover text</legend>
            <label htmlFor="show-text" className="switch-row">
              Show text on the cover
              <input id="show-text" className="switch" type="checkbox" role="switch" checked={state.showText} onChange={(e) => set("showText", e.target.checked)} />
            </label>
            <label htmlFor="main-title" className="field">
              Main title
              <input id="main-title" className="text" value={state.title} maxLength={80} onChange={(e) => set("title", e.target.value)} />
            </label>
            <label htmlFor="subtitle" className="field">
              Subtitle
              <input id="subtitle" className="text" value={state.subtitle} maxLength={80} onChange={(e) => set("subtitle", e.target.value)} />
            </label>
            <div className="field">
              <label htmlFor="title-font">Title font</label>
              <select id="title-font" className="select" style={{ font: cssFont(state.titleFont, state.titleStyle, 19) }} value={state.titleFont} onChange={(e) => setState((s) => ({ ...s, titleFont: e.target.value as CoverState["titleFont"], comboId: null }))}>
                {TITLE_FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <StyleButtons label="Title" value={state.titleStyle} onChange={(v) => setState((s) => ({ ...s, titleStyle: v, comboId: null }))} />
            </div>
            <div className="field">
              <label htmlFor="subtitle-font">Subtitle font</label>
              <select id="subtitle-font" className="select" style={{ font: cssFont(state.subtitleFont, state.subtitleStyle, 15) }} value={state.subtitleFont} onChange={(e) => setState((s) => ({ ...s, subtitleFont: e.target.value as CoverState["subtitleFont"], comboId: null }))}>
                {SUBTITLE_FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <StyleButtons label="Subtitle" value={state.subtitleStyle} onChange={(v) => set("subtitleStyle", v)} />
            </div>
            <p className="hint">Title and subtitle fonts are separate sets, so the two never clash.</p>
          </fieldset>

          <fieldset className="panel">
            <legend>combos</legend>
            <p className="lead">{photo ? "Picked from your photo." : "Add a photo and these pick up its colours."} Each one sets the cover fonts and player colours.</p>
            <div role="list" aria-label="Suggested combos" className="combo-list">
              {suggestions.map((sug) => {
                const active = state.comboId === sug.combo.id && state.playerHue === sug.playerHue && state.buttonHue === sug.buttonHue;
                return (
                  <div role="listitem" key={sug.combo.id}>
                    <button type="button" className="combo" aria-pressed={active} onClick={() => applyCombo(sug)}>
                      <span className="combo-swatch" style={{ background: playerColor(sug.playerHue), color: buttonColor(sug.buttonHue), font: cssFont(sug.combo.titleFont, sug.combo.titleStyle, 24) }}>
                        Aa
                      </span>
                      <span className="combo-text">
                        <span className="combo-name">{sug.combo.name}</span>
                        <span className="combo-fonts">
                          {sug.combo.titleFont}
                          {sug.combo.titleStyle.italic ? " italic" : ""} + {sug.combo.subtitleFont}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="pill" onClick={() => setRound((r) => r + 1)}>
              shuffle ideas
            </button>
          </fieldset>

          <div className="stack">
            <fieldset className="panel">
              <legend>photo</legend>
              {photo ? (
                <div className="photo-info">
                  <CoverCanvas kind="cover" state={{ ...state, showText: false, showLabel: false }} photo={photo} width={56} fontsTick={0} className="thumb" aria-hidden="true" />
                  <div className="photo-meta">
                    <div className="photo-name">{photo.name}</div>
                    <div className="muted small">
                      {photo.width} × {photo.height}, cropped to square
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted">No photo yet. JPEG, PNG and WebP all work.</p>
              )}
              {smallPhoto && <p className="hint">This photo is under 3000 px, so the export will be scaled up and may look soft.</p>}
              <input ref={fileInput} type="file" accept="image/*" className="visually-hidden" id="photo-file" onChange={(e) => {
                openFile(e.target.files?.[0]);
                e.target.value = "";
              }} />
              <button type="button" className="pill" onClick={() => fileInput.current?.click()}>
                {photo ? "replace photo" : "choose photo"}
              </button>
              <label htmlFor="zoom" className="field">
                <span className="field-row">
                  Zoom<span className="muted">{state.zoom}%</span>
                </span>
                <input id="zoom" type="range" min={100} max={200} value={state.zoom} disabled={!photo} onChange={(e) => set("zoom", Number(e.target.value))} />
              </label>
            </fieldset>

            <fieldset className="panel grow">
              <legend>export</legend>
              <button type="button" className="export" disabled={busy !== null} onClick={() => doExport("cover")}>
                {busy === "cover" ? "Saving…" : "Cover"}
                <span>PNG · 3000 × 3000</span>
              </button>
              <button type="button" className="export" disabled={busy !== null} onClick={() => doExport("player")}>
                {busy === "player" ? "Saving…" : "Player"}
                <span>PNG · 1080 × 1440</span>
              </button>
              <p className="hint">Streaming stores ask for at least 3000 × 3000.</p>
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
