import { ADVISORY_ASPECT, advisoryImage } from "./advisory";
import { buttonColor, isDark, playerColor } from "./color";
import { cssFont } from "./fonts";
import type { TextStyle } from "./fonts";
import { placedText } from "./state";
import type { CoverState, Photo, TextPosition } from "./state";

type Ctx = CanvasRenderingContext2D;

const INK = "#2f3b34";
const BARK = "#3b4a42";
const BARK_GRID = "#4e6152";
const SURFACE = "#dde87e";
const SPROUT = "#b8d970";
const CREAM = "#fff3cf";

/** A soft shadow that lifts the text off the photo: dark, or light behind dark text. */
function textShadow(ctx: Ctx, color: string) {
  ctx.fillStyle = color;
  ctx.shadowColor = isDark(color)
    ? "rgba(255, 255, 255, 0.4)"
    : "rgba(0, 0, 0, 0.5)";
}
const GOLD = "#f2d27a";

/** Greedy word wrap. Words longer than `maxWidth` stay on their own line. */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

/** Where the photo lands inside a square of side `size`, honouring zoom and pan. */
export function photoRect(
  photo: { width: number; height: number },
  size: number,
  zoom: number,
  panX: number,
  panY: number
) {
  const scale =
    Math.max(size / photo.width, size / photo.height) * (zoom / 100);
  const w = photo.width * scale;
  const h = photo.height * scale;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    h,
    w,
    x: (size - w) / 2 + (clamp(panX) * (w - size)) / 2,
    y: (size - h) / 2 + (clamp(panY) * (h - size)) / 2,
  };
}

/** Artwork shown until someone adds a photo: a record on the bark grid. */
function drawPlaceholder(ctx: Ctx, size: number) {
  ctx.fillStyle = BARK;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = BARK_GRID;
  ctx.lineWidth = Math.max(1, size / 500);
  const step = size / 40;
  ctx.beginPath();
  for (let p = step; p < size; p += step) {
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
  }
  ctx.stroke();
  const cx = size * 0.62;
  const cy = size * 0.4;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BARK_GRID;
  for (const r of [0.26, 0.22, 0.18, 0.14]) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = SURFACE;
  ctx.strokeStyle = INK;
  ctx.lineWidth = size / 160;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.015, 0, Math.PI * 2);
  ctx.fill();
  // A romduol-style flower in the corner, from the Cute Matcha set.
  const fx = size * 0.2;
  const fy = size * 0.18;
  const pr = size * 0.045;
  ctx.lineWidth = size / 250;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(
      fx + Math.cos(a) * pr * 1.6,
      fy + Math.sin(a) * pr * 1.6,
      pr,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(fx, fy, pr * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SPROUT;
  ctx.fillRect(0, size * 0.97, size, size * 0.03);
}

/** Draws text left-aligned at (x, baseline) with tracking and optional underline/strike. */
function drawStyledText(
  ctx: Ctx,
  text: string,
  x: number,
  baseline: number,
  px: number,
  tracking: number,
  style: TextStyle
) {
  ctx.letterSpacing = `${tracking}px`;
  ctx.fillText(text, x, baseline);
  if (!style.underline && !style.strike) {
    return;
  }
  const width = ctx.measureText(text).width - tracking;
  const thick = Math.max(1, px * 0.06);
  if (style.underline) {
    ctx.fillRect(x, baseline + px * 0.1, width, thick);
  }
  if (style.strike) {
    ctx.fillRect(x, baseline - px * 0.32, width, thick);
  }
}

/**
 * The cover, drawn into the square (0, 0, size, size) of `ctx`. Returns
 * the box the title and subtitle take up, or null when there is no text.
 */
export function drawCover(
  ctx: Ctx,
  size: number,
  state: CoverState,
  photo: Photo | null
): Box | null {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  if (photo) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, size, size);
    const r = photoRect(photo, size, state.zoom, state.panX, state.panY);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo.image, r.x, r.y, r.w, r.h);
  } else {
    drawPlaceholder(ctx, size);
  }

  // The label is skipped for the moment it takes to load; exports wait for it.
  const label = labelBox(size, state);
  const labelArt = advisoryImage();
  if (state.showLabel && labelArt) {
    ctx.drawImage(labelArt, label.x, label.y, label.w, label.h);
  }

  let textBox: Box | null = null;
  if (state.showText && (state.title.trim() || state.subtitle.trim())) {
    ctx.shadowOffsetY = size * 0.004;
    ctx.shadowBlur = size * 0.024;
    ctx.textBaseline = "alphabetic";

    // The text stays between the cover's top and bottom margins. If it
    // would run into the label, it gets the band above or below it instead.
    const position = placedText(state);
    let block = layoutText(ctx, size, state, size * 0.05, size * 0.95);
    let box = placeBlock(block, size, position, size * 0.05, size * 0.95);
    const gap = size * 0.02;
    if (state.showLabel && overlaps(box, label, gap)) {
      const [top, bottom] =
        label.y < size / 2
          ? [label.y + label.h + gap, size * 0.95]
          : [size * 0.05, label.y - gap];
      block = layoutText(ctx, size, state, top, bottom);
      box = placeBlock(block, size, position, top, bottom);
    }

    let { y } = box;
    for (const line of block.lines) {
      y += line.gapBefore;
      ctx.font = line.font;
      textShadow(ctx, line.color);
      const shift =
        state.textAlign === "left"
          ? 0
          : (box.w - line.width) / (state.textAlign === "center" ? 2 : 1);
      drawStyledText(
        ctx,
        line.text,
        box.x + shift,
        y + line.baseline,
        line.px,
        line.tracking,
        line.style
      );
      y += line.height;
    }
    textBox = box;
  }
  ctx.restore();
  ctx.letterSpacing = "0px";
  return textBox;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the advisory label sits on a cover of side `size`. */
export function labelBox(
  size: number,
  state: Pick<CoverState, "labelCorner" | "labelSize">
): Box {
  const w = (size * state.labelSize) / 100;
  const h = w / ADVISORY_ASPECT;
  const m = size * 0.035;
  return {
    h,
    w,
    x: state.labelCorner.endsWith("left") ? m : size - m - w,
    y: state.labelCorner.startsWith("top") ? m : size - m - h,
  };
}

const overlaps = (a: Box, b: Box, gap: number) =>
  a.x < b.x + b.w + gap &&
  a.x + a.w > b.x - gap &&
  a.y < b.y + b.h + gap &&
  a.y + a.h > b.y - gap;

interface TextLine {
  text: string;
  font: string;
  px: number;
  tracking: number;
  style: TextStyle;
  color: string;
  /** Ink width, without the tracking after the last letter. */
  width: number;
  /** Line height, and the baseline's distance from the line's top. */
  height: number;
  baseline: number;
  gapBefore: number;
}

/**
 * Wraps the title and subtitle for a band from `top` to `bottom`. The title
 * shrinks until every line fits the width and the block fits the band,
 * and never takes more than 70% of the cover's height.
 */
function layoutText(
  ctx: Ctx,
  size: number,
  state: CoverState,
  top: number,
  bottom: number
) {
  const maxW = size * 0.88;
  const measure = (s: string) => ctx.measureText(s).width;
  const lines = (
    text: string,
    font: string,
    px: number,
    tracking: number,
    style: TextStyle,
    color: string,
    height: number,
    baseline: number
  ): TextLine[] => {
    ctx.font = font;
    ctx.letterSpacing = `${tracking}px`;
    return wrapLines(text, maxW, measure).map((t) => ({
      baseline,
      color,
      font,
      gapBefore: 0,
      height,
      px,
      style,
      text: t,
      tracking,
      width: measure(t) - tracking,
    }));
  };

  let subtitle: TextLine[] = [];
  if (state.subtitle.trim()) {
    const px = size * 0.038;
    subtitle = lines(
      state.subtitle.trim().toUpperCase(),
      cssFont(state.subtitleFont, state.subtitleStyle, px),
      px,
      size * 0.006,
      state.subtitleStyle,
      state.subtitleColor,
      px * 1.25,
      px * 1.03
    );
  }
  const gap = subtitle.length ? size * 0.012 : 0;
  const subtitleHeight = subtitle.reduce((h, l) => h + l.height, 0) + gap;

  let title: TextLine[] = [];
  if (state.title.trim()) {
    const room = Math.min(size * 0.7, bottom - top - subtitleHeight);
    let px = size * 0.124;
    for (let tries = 0; tries < 30; tries++) {
      title = lines(
        state.title.trim(),
        cssFont(state.titleFont, state.titleStyle, px),
        px,
        size * 0.002,
        state.titleStyle,
        state.titleColor,
        px * 0.95,
        px * 0.87
      );
      const tooWide = title.some((l) => l.width > maxW);
      const tooTall = title.length * px * 0.95 > room;
      if (!tooWide && !tooTall) {
        break;
      }
      px *= 0.92;
    }
    if (subtitle.length) {
      subtitle[0].gapBefore = gap;
    }
  }
  const all = [...title, ...subtitle];
  return {
    h: all.reduce((h, l) => h + l.gapBefore + l.height, 0),
    lines: all,
    w: Math.max(...all.map((l) => l.width)),
  };
}

/** The block's box at `position`, inside the band from `top` to `bottom`. */
function placeBlock(
  block: { w: number; h: number },
  size: number,
  position: TextPosition,
  top: number,
  bottom: number
): Box {
  const [row, column] = position.split("-");
  const side = size * 0.06;
  const x =
    column === "left"
      ? side
      : column === "right"
        ? size - side - block.w
        : (size - block.w) / 2;
  const middle = Math.max(
    top,
    Math.min(size / 2 - block.h / 2, bottom - block.h)
  );
  const y = row === "top" ? top : row === "bottom" ? bottom - block.h : middle;
  return { h: block.h, w: block.w, x, y };
}

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) {
    return text;
  }
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) {
    t = t.slice(0, -1);
  }
  return `${t.trimEnd()}…`;
}

/**
 * A now-playing screen built around the cover, drawn at width `w` and
 * height `w * 4 / 3`. All measurements are in units of a 300 × 400 layout.
 */
export function drawPlayer(
  ctx: Ctx,
  w: number,
  state: CoverState,
  photo: Photo | null
) {
  const u = w / 300;
  const h = w * (4 / 3);
  const bg = playerColor(state.playerHue);
  const fg = buttonColor(state.buttonHue);

  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (photo) {
    // A soft, blurred echo of the photo behind everything.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.filter = `blur(${24 * u}px)`;
    const r = photoRect(photo, h * 1.1, state.zoom, state.panX, state.panY);
    ctx.drawImage(
      photo.image,
      r.x - (h * 1.1 - w) / 2,
      r.y - h * 0.05,
      r.w,
      r.h
    );
    ctx.restore();
    ctx.fillStyle = bg;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  const pad = 28 * u;
  const coverSize = w - pad * 2;
  ctx.save();
  ctx.translate(pad, pad);
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 18 * u;
  ctx.shadowOffsetY = 6 * u;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, coverSize, coverSize);
  ctx.shadowColor = "transparent";
  drawCover(ctx, coverSize, state, photo);
  ctx.restore();

  let y = pad + coverSize + 24 * u;
  ctx.fillStyle = fg;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${17 * u}px "Lato", sans-serif`;
  ctx.fillText(
    fitText(ctx, state.title.trim() || "Untitled", coverSize),
    pad,
    y
  );
  y += 17 * u;
  ctx.font = `400 ${12 * u}px "Lato", sans-serif`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(fitText(ctx, state.subtitle.trim(), coverSize), pad, y);
  ctx.globalAlpha = 1;
  y += 14 * u;

  // Progress bar.
  const progress = 0.38;
  ctx.globalAlpha = 0.25;
  roundRect(ctx, pad, y, coverSize, 3 * u, 1.5 * u);
  ctx.fill();
  ctx.globalAlpha = 1;
  roundRect(ctx, pad, y, coverSize * progress, 3 * u, 1.5 * u);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pad + coverSize * progress, y + 1.5 * u, 5 * u, 0, Math.PI * 2);
  ctx.fill();
  y += 16 * u;
  ctx.font = `400 ${9 * u}px "Lato", sans-serif`;
  ctx.fillText("1:24", pad, y);
  ctx.textAlign = "right";
  ctx.fillText("3:41", pad + coverSize, y);
  ctx.textAlign = "start";

  // Controls: download, previous, pause, next, more.
  const cy = y + 28 * u;
  const slots = [0.06, 0.28, 0.5, 0.72, 0.94].map((f) => pad + coverSize * f);
  const s = 8 * u;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2.2 * u;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(slots[0], cy - s);
  ctx.lineTo(slots[0], cy + s * 0.4);
  ctx.moveTo(slots[0] - s * 0.6, cy - s * 0.1);
  ctx.lineTo(slots[0], cy + s * 0.4);
  ctx.lineTo(slots[0] + s * 0.6, cy - s * 0.1);
  ctx.moveTo(slots[0] - s, cy + s);
  ctx.lineTo(slots[0] + s, cy + s);
  ctx.stroke();

  const skip = (cx: number, dir: 1 | -1) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * s * 0.7, cy - s * 0.8);
    ctx.lineTo(cx - dir * s * 0.5, cy);
    ctx.lineTo(cx + dir * s * 0.7, cy + s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(
      dir === 1 ? cx - s * 0.85 : cx + s * 0.6,
      cy - s * 0.8,
      s * 0.25,
      s * 1.6
    );
  };
  skip(slots[1], 1);
  skip(slots[3], -1);

  ctx.beginPath();
  ctx.arc(slots[2], cy, 18 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bg;
  roundRect(ctx, slots[2] - 5 * u, cy - 6.5 * u, 3.4 * u, 13 * u, u);
  ctx.fill();
  roundRect(ctx, slots[2] + 1.6 * u, cy - 6.5 * u, 3.4 * u, 13 * u, u);
  ctx.fill();
  ctx.fillStyle = fg;
  for (const dx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.arc(slots[4] + dx * u, cy, 2.2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const PLAYER_ASPECT = 4 / 3;

/** The record mock-up's height for a width of 1. */
export const RECORD_ASPECT = 2 / 3;

/**
 * The cover on a flat `background`, with the record peeking out of the
 * sleeve to the right and the album picture on its centre label. Drawn at
 * width `w` and height `w * RECORD_ASPECT`.
 */
export function drawRecord(
  ctx: Ctx,
  w: number,
  state: CoverState,
  photo: Photo | null,
  background: string
) {
  const h = w * RECORD_ASPECT;
  const side = h * 0.7;
  const r = side * 0.48;
  // How far the record sticks out past the sleeve's right edge.
  const peek = side * 0.5;
  const x = (w - side - peek) / 2;
  const y = (h - side) / 2;
  const cx = x + side + peek - r;
  const cy = h / 2;
  const circle = (radius: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  };
  const shadow = (blur: number, drop: number) => {
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = h * blur;
    ctx.shadowOffsetY = h * drop;
  };

  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // The vinyl: black, with faint grooves, two soft glints and a rim.
  ctx.save();
  shadow(0.04, 0.012);
  ctx.fillStyle = "#111211";
  circle(r);
  ctx.fill();
  ctx.restore();
  // Light catching the grooves at two opposite angles, fading either side.
  const sheen = ctx.createConicGradient(0, cx, cy);
  for (const [at, alpha] of [
    [0, 0],
    [0.04, 0.09],
    [0.12, 0],
    [0.5, 0],
    [0.54, 0.09],
    [0.62, 0],
  ]) {
    sheen.addColorStop(at, `rgba(255, 255, 255, ${alpha})`);
  }
  ctx.fillStyle = sheen;
  circle(r);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = Math.max(1, r * 0.004);
  for (let g = 0.42; g < 0.97; g += 0.035) {
    circle(r * g);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  circle(r * 0.995);
  ctx.stroke();

  // The centre label shows the album picture, without the text or label.
  const lr = r * 0.34;
  ctx.save();
  circle(lr);
  ctx.clip();
  ctx.translate(cx - lr, cy - lr);
  drawCover(
    ctx,
    lr * 2,
    { ...state, showLabel: false, showText: false },
    photo
  );
  ctx.restore();
  ctx.fillStyle = background;
  circle(r * 0.03);
  ctx.fill();

  // The sleeve: the cover itself, on top.
  ctx.save();
  shadow(0.05, 0.015);
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, side, side);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  drawCover(ctx, side, state, photo);
  ctx.restore();
  ctx.restore();
}
