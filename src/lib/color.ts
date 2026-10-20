export type RGB = [number, number, number];

/** The red, green and blue before lightness, for the 60° sextant `hue` is in. */
const sextant = (hue: number, c: number, x: number): RGB => {
  if (hue < 60) {
    return [c, x, 0];
  }
  if (hue < 120) {
    return [x, c, 0];
  }
  if (hue < 180) {
    return [0, c, x];
  }
  if (hue < 240) {
    return [0, x, c];
  }
  if (hue < 300) {
    return [x, 0, c];
  }
  return [c, 0, x];
};

export const hslToRgb = (h: number, s: number, l: number): RGB => {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] = sextant(hue, c, x);
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

export const rgbToHex = ([r, g, b]: RGB): string =>
  `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

export const hslToHex = (h: number, s: number, l: number): string =>
  rgbToHex(hslToRgb(h, s, l));

/** Returns [hue 0-360, saturation 0-1, lightness 0-1]. */
export const rgbToHsl = (
  r: number,
  g: number,
  b: number
): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
};

/** Whether a #rrggbb colour is dark enough to want a light shadow behind it. */
export const isDark = (hex: string): boolean => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  // oxlint-disable-next-line no-bitwise -- unpacks the red, green and blue bytes of 0xrrggbb
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 100;
};

/** Player background: a pale tint of the hue. */
export const playerColor = (hue: number) => hslToHex(hue, 62, 86);
/** Player buttons and text: a deep shade of the hue, dark enough to read on any player colour. */
export const buttonColor = (hue: number) => hslToHex(hue, 48, 15);

const BINS = 24;

/**
 * The most prominent hues in an image, strongest first. Pixels that are
 * nearly grey, black or white barely count, so a photo's mood colour wins
 * over its shadows. Falls back to `fallback` for a colourless image.
 */
export const dominantHues = (
  data: ArrayLike<number>,
  count = 3,
  fallback = 40
): number[] => {
  const weight = Array.from({ length: BINS }, () => 0);
  const sumSin = Array.from({ length: BINS }, () => 0);
  const sumCos = Array.from({ length: BINS }, () => 0);
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) {
      continue;
    }
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const w = s * (1 - Math.abs(2 * l - 1));
    if (w < 0.08) {
      continue;
    }
    const bin = Math.floor(h / (360 / BINS)) % BINS;
    const rad = (h * Math.PI) / 180;
    weight[bin] += w;
    sumSin[bin] += Math.sin(rad) * w;
    sumCos[bin] += Math.cos(rad) * w;
  }
  const bins = weight.map((w, bin) => ({ bin, w })).filter((b) => b.w > 0);
  bins.sort((a, b) => b.w - a.w);
  const hues: number[] = [];
  for (const { bin } of bins) {
    const deg =
      ((Math.atan2(sumSin[bin], sumCos[bin]) * 180) / Math.PI + 360) % 360;
    // Skip hues too close to one already picked so the suggestions differ.
    if (
      hues.some(
        (h) => Math.min(Math.abs(h - deg), 360 - Math.abs(h - deg)) < 30
      )
    ) {
      continue;
    }
    hues.push(Math.round(deg));
    if (hues.length === count) {
      break;
    }
  }
  return hues.length ? hues : [fallback];
};

/**
 * The image's most common colour, as #RRGGBB: pixels are grouped into
 * 512 coarse colour boxes, and the average of the fullest box wins.
 * Falls back to `fallback` for an image with no opaque pixels.
 */
export const dominantColor = (
  data: ArrayLike<number>,
  fallback = "#3B4A42"
): string => {
  const count = Array.from({ length: 512 }, () => 0);
  const sums = Array.from({ length: 512 }, () => [0, 0, 0]);
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) {
      continue;
    }
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // oxlint-disable-next-line no-bitwise -- packs the top 3 bits of each channel into a 9-bit box index
    const box = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    count[box] += 1;
    sums[box][0] += r;
    sums[box][1] += g;
    sums[box][2] += b;
  }
  const top = count.indexOf(Math.max(...count));
  if (count[top] === 0) {
    return fallback;
  }
  const [r, g, b] = sums[top].map((s) => Math.round(s / count[top]));
  return rgbToHex([r, g, b]);
};
