import { useEffect, useRef, useState } from "react";

import { loadAdvisory } from "../lib/advisory";
import { cssFont, loadFonts } from "../lib/fonts";
import { drawCover, drawPlayer, PLAYER_ASPECT } from "../lib/render";
import type { Box } from "../lib/render";
import type { CoverState, Photo } from "../lib/state";

/** Bumps whenever the fonts the state uses and the advisory label finish loading, so canvases redraw. */
export function useFontsReady(state: CoverState): number {
  const [tick, setTick] = useState(0);
  const { titleFont, subtitleFont, titleStyle, subtitleStyle } = state;
  useEffect(() => {
    let live = true;
    Promise.all([
      loadFonts([
        cssFont(titleFont, titleStyle, 40),
        cssFont(subtitleFont, subtitleStyle, 40),
        `700 40px "Lato"`,
        `400 40px "Lato"`,
      ]),
      loadAdvisory(),
    ]).then(() => live && setTick((t) => t + 1));
    return () => {
      live = false;
    };
  }, [titleFont, subtitleFont, titleStyle, subtitleStyle]);
  return tick;
}

interface Props extends Omit<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  "width" | "height"
> {
  kind: "cover" | "player";
  state: CoverState;
  photo: Photo | null;
  /** Width in CSS pixels the canvas is rendered for. */
  width: number;
  fontsTick: number;
  /** For the cover: where the text landed, as fractions of the cover's side. */
  onTextBox?: (box: Box | null) => void;
}

export function CoverCanvas({
  kind,
  state,
  photo,
  width,
  fontsTick,
  onTextBox,
  ...rest
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = kind === "cover" ? width : width * PLAYER_ASPECT;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (kind === "cover") {
      const box = drawCover(ctx, canvas.width, state, photo);
      const side = canvas.width;
      onTextBox?.(
        box && {
          h: box.h / side,
          w: box.w / side,
          x: box.x / side,
          y: box.y / side,
        }
      );
    } else {
      drawPlayer(ctx, canvas.width, state, photo);
    }
  }, [kind, state, photo, width, height, fontsTick, onTextBox]);

  return <canvas ref={ref} {...rest} />;
}

/** Renders the cover or player at full export size and downloads it as a PNG. */
export async function exportPng(
  kind: "cover" | "player",
  state: CoverState,
  photo: Photo | null,
  filename: string
) {
  const canvas = document.createElement("canvas");
  canvas.width = kind === "cover" ? 3000 : 1080;
  canvas.height = kind === "cover" ? 3000 : 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }
  await loadAdvisory();
  if (kind === "cover") {
    drawCover(ctx, 3000, state, photo);
  } else {
    drawPlayer(ctx, 1080, state, photo);
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) {
    throw new Error("Could not create the PNG.");
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
