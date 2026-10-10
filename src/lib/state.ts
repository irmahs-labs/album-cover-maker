import type { SubtitleFont, TextStyle, TitleFont } from "./fonts";
import { PLAIN } from "./fonts";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

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
  playerShowText: boolean;
  playerHue: number;
  buttonHue: number;
  comboId: string | null;
}

export const DEFAULT_STATE: CoverState = {
  zoom: 100,
  panX: 0,
  panY: 0,
  showLabel: true,
  labelSize: 10,
  labelCorner: "top-left",
  showText: true,
  title: "Album title",
  subtitle: "Artist name",
  titleFont: "Bebas Neue",
  subtitleFont: "Figtree",
  titleStyle: PLAIN,
  subtitleStyle: PLAIN,
  playerShowText: true,
  playerHue: 40,
  buttonHue: 35,
  comboId: "night-drive",
};

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cover"
  );
}
