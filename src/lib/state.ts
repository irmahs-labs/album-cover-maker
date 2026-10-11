import type { SubtitleFont, TextStyle, TitleFont } from "./fonts";
import { PLAIN } from "./fonts";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export const CORNERS: Corner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

/** The advisory label's sizes, as a % of the cover's width. */
export const LABEL_SIZES = [
  { name: "XS", percent: 8 },
  { name: "S", percent: 10 },
  { name: "M", percent: 12 },
  { name: "L", percent: 14 },
  { name: "XL", percent: 16 },
  { name: "XXL", percent: 20 },
] as const;

export interface Photo {
  image: CanvasImageSource;
  width: number;
  height: number;
  name: string;
}

export interface CoverState {
  zoom: number; // 100-200 (%)
  panX: number; // -1..1, where the crop sits inside the spare width
  panY: number; // -1..1
  showLabel: boolean;
  labelSize: number; // % of cover width
  labelCorner: Corner;
  showText: boolean;
  title: string;
  subtitle: string;
  titleFont: TitleFont;
  subtitleFont: SubtitleFont;
  titleStyle: TextStyle;
  subtitleStyle: TextStyle;
  /** Text colours, as lowercase #rrggbb. */
  titleColor: string;
  subtitleColor: string;
  playerShowText: boolean;
  playerHue: number;
  buttonHue: number;
  comboId: string | null;
}

export const DEFAULT_STATE: CoverState = {
  buttonHue: 35,
  comboId: "abril-fatface-lato",
  labelCorner: "top-left",
  labelSize: 10,
  panX: 0,
  panY: 0,
  playerHue: 40,
  playerShowText: true,
  showLabel: true,
  showText: true,
  subtitle: "Artist name",
  subtitleColor: "#fff3cf",
  subtitleFont: "Lato",
  subtitleStyle: PLAIN,
  title: "Album title",
  titleColor: "#fff3cf",
  titleFont: "Abril Fatface",
  titleStyle: PLAIN,
  zoom: 100,
};

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replaceAll(/[̀-ͯ]/g, "")
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "") || "cover"
  );
}
