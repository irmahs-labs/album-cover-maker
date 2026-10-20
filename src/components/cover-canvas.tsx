import { useEffect, useRef, useState } from "react";

import { loadAdvisory } from "../lib/advisory";
import { cssFont, loadFonts } from "../lib/fonts";
import {
  drawCover,
  drawPlayer,
  drawRecord,
  PLAYER_ASPECT,
  RECORD_ASPECT,
} from "../lib/render";
import type { Box } from "../lib/render";
import type { CoverState, Photo } from "../lib/state";

/** Bumps whenever the fonts the state uses and the advisory label finish loading, so canvases redraw. */
export const useFontsReady = (state: CoverState): number => {
  const [tick, setTick] = useState(0);
  const { titleFont, subtitleFont, titleStyle, subtitleStyle } = state;
  useEffect(() => {
    let live = true;
    const load = async () => {
      await Promise.all([
        loadFonts([
          cssFont(titleFont, titleStyle, 40),
          cssFont(subtitleFont, subtitleStyle, 40),
          `700 40px "Lato"`,
          `400 40px "Lato"`,
        ]),
        loadAdvisory(),
      ]);
      if (live) {
        setTick((t) => t + 1);
      }
    };
    load();
    return () => {
      live = false;
    };
  }, [titleFont, subtitleFont, titleStyle, subtitleStyle]);
  return tick;
};

interface Props extends Omit<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  "width" | "height"
> {
  kind: Kind;
  state: CoverState;
  photo: Photo | null;
  /** Width in CSS pixels the canvas is rendered for. */
  width: number;
  fontsTick: number;
  /** For the cover: where the text landed, as fractions of the cover's side. */
  onTextBox?: (box: Box | null) => void;
  /** The record mock-up's backdrop: the photo's main colour. */
  background?: string;
}

export type Kind = "cover" | "player" | "record";

const ASPECT: Record<Kind, number> = {
  cover: 1,
  player: PLAYER_ASPECT,
  record: RECORD_ASPECT,
};

/** Placeholder art's main colour, used before there is a photo. */
export const BLANK_BACKGROUND = "#3B4A42";

/** Draws one of the three; for the cover, returns where its text landed. */
const draw = (
  ctx: CanvasRenderingContext2D,
  kind: Kind,
  width: number,
  state: CoverState,
  photo: Photo | null,
  background: string
): Box | null => {
  if (kind === "cover") {
    return drawCover(ctx, width, state, photo);
  }
  if (kind === "player") {
    drawPlayer(ctx, width, state, photo);
  } else {
    drawRecord(ctx, width, state, photo, background);
  }
  return null;
};

export const CoverCanvas = ({
  kind,
  state,
  photo,
  width,
  fontsTick,
  onTextBox,
  background = BLANK_BACKGROUND,
  ...rest
}: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = width * ASPECT[kind];

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
    const box = draw(ctx, kind, canvas.width, state, photo, background);
    if (kind === "cover") {
      const side = canvas.width;
      onTextBox?.(
        box && {
          h: box.h / side,
          w: box.w / side,
          x: box.x / side,
          y: box.y / side,
        }
      );
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- fontsTick is not read: it is listed so the canvas redraws once the fonts finish loading
  }, [kind, state, photo, width, height, fontsTick, onTextBox, background]);

  return <canvas ref={ref} {...rest} />;
};

/** What each export is: its width (the height follows) and file type. */
export const EXPORTS: Record<Kind, { width: number; type: string }> = {
  cover: { type: "image/png", width: 3000 },
  player: { type: "image/png", width: 1080 },
  record: { type: "image/jpeg", width: 3000 },
};

/** Renders the cover, player or record at full export size and downloads it. */
export const exportImage = async (
  kind: Kind,
  state: CoverState,
  photo: Photo | null,
  background: string,
  filename: string
) => {
  const { width, type } = EXPORTS[kind];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(width * ASPECT[kind]);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }
  await loadAdvisory();
  draw(ctx, kind, width, state, photo, background);
  // oxlint-disable-next-line promise/avoid-new -- canvas.toBlob only reports through a callback, so it is wrapped in a promise here
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, 0.92);
  });
  if (!blob) {
    throw new Error("Could not create the image.");
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
