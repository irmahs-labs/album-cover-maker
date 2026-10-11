/**
 * Photo filters. Each is a chain of CSS filter functions, turned into one
 * colour matrix (the formulas of the CSS Filter Effects spec) and applied
 * to the photo's pixels, so the canvas export looks the same in every
 * browser: Safari's canvas has no `filter`. The thumbnails use the same
 * chain as plain CSS.
 */
type Op =
  | "grayscale"
  | "sepia"
  | "saturate"
  | "hue-rotate"
  | "brightness"
  | "contrast";

export const FILTERS = [
  { id: "original", name: "Original", ops: [] },
  { id: "mono", name: "Mono", ops: [["grayscale", 1]] },
  {
    id: "warm",
    name: "Warm",
    ops: [
      ["sepia", 0.35],
      ["saturate", 1.2],
    ],
  },
  {
    id: "cool",
    name: "Cool",
    ops: [
      ["hue-rotate", -18],
      ["saturate", 0.85],
      ["brightness", 1.05],
    ],
  },
  {
    id: "fade",
    name: "Fade",
    ops: [
      ["contrast", 0.8],
      ["brightness", 1.12],
      ["saturate", 0.7],
    ],
  },
  {
    id: "vivid",
    name: "Vivid",
    ops: [
      ["saturate", 1.6],
      ["contrast", 1.1],
    ],
  },
] as const satisfies readonly {
  id: string;
  name: string;
  ops: readonly (readonly [Op, number])[];
}[];

export type FilterId = (typeof FILTERS)[number]["id"];

const opsOf = (id: FilterId): readonly (readonly [Op, number])[] =>
  FILTERS.find((f) => f.id === id)?.ops ?? [];

/** An op's amount that changes nothing. */
const IDENTITY: Record<Op, number> = {
  brightness: 1,
  contrast: 1,
  grayscale: 0,
  "hue-rotate": 0,
  saturate: 1,
  sepia: 0,
};

/** Each op's amount moved from "no change" towards its full amount by `strength` (0–1). */
const scaled = (id: FilterId, strength: number) =>
  opsOf(id).map(
    ([op, amount]) =>
      [op, IDENTITY[op] + (amount - IDENTITY[op]) * strength] as const
  );

/** The filter as a CSS `filter` value, for previews drawn by the browser. */
export function cssFilter(id: FilterId, strength = 1): string {
  const parts = scaled(id, strength).map(([op, a]) =>
    op === "hue-rotate" ? `hue-rotate(${a}deg)` : `${op}(${a})`
  );
  return parts.length ? parts.join(" ") : "none";
}

/**
 * A colour matrix: three rows of [r, g, b, offset], the offset in 0–255.
 * Row i gives channel i of the result.
 */
export type Matrix = number[];

const IDENTITY_MATRIX: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

const rgbMatrix = (m: number[]): Matrix => [
  m[0],
  m[1],
  m[2],
  0,
  m[3],
  m[4],
  m[5],
  0,
  m[6],
  m[7],
  m[8],
  0,
];

function opMatrix(op: Op, a: number): Matrix {
  switch (op) {
    case "grayscale": {
      const k = 1 - Math.min(1, a);
      return rgbMatrix([
        0.2126 + 0.7874 * k,
        0.7152 - 0.7152 * k,
        0.0722 - 0.0722 * k,
        0.2126 - 0.2126 * k,
        0.7152 + 0.2848 * k,
        0.0722 - 0.0722 * k,
        0.2126 - 0.2126 * k,
        0.7152 - 0.7152 * k,
        0.0722 + 0.9278 * k,
      ]);
    }
    case "sepia": {
      const k = 1 - Math.min(1, a);
      return rgbMatrix([
        0.393 + 0.607 * k,
        0.769 - 0.769 * k,
        0.189 - 0.189 * k,
        0.349 - 0.349 * k,
        0.686 + 0.314 * k,
        0.168 - 0.168 * k,
        0.272 - 0.272 * k,
        0.534 - 0.534 * k,
        0.131 + 0.869 * k,
      ]);
    }
    case "saturate": {
      return rgbMatrix([
        0.213 + 0.787 * a,
        0.715 - 0.715 * a,
        0.072 - 0.072 * a,
        0.213 - 0.213 * a,
        0.715 + 0.285 * a,
        0.072 - 0.072 * a,
        0.213 - 0.213 * a,
        0.715 - 0.715 * a,
        0.072 + 0.928 * a,
      ]);
    }
    case "hue-rotate": {
      const r = (a * Math.PI) / 180;
      const [c, s] = [Math.cos(r), Math.sin(r)];
      return rgbMatrix([
        0.213 + c * 0.787 - s * 0.213,
        0.715 - c * 0.715 - s * 0.715,
        0.072 - c * 0.072 + s * 0.928,
        0.213 - c * 0.213 + s * 0.143,
        0.715 + c * 0.285 + s * 0.14,
        0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787,
        0.715 - c * 0.715 + s * 0.715,
        0.072 + c * 0.928 + s * 0.072,
      ]);
    }
    case "brightness": {
      return [a, 0, 0, 0, 0, a, 0, 0, 0, 0, a, 0];
    }
    case "contrast": {
      const o = 127.5 * (1 - a);
      return [a, 0, 0, o, 0, a, 0, o, 0, 0, a, o];
    }
    default: {
      return IDENTITY_MATRIX;
    }
  }
}

/** `a` applied after `b`. */
function compose(a: Matrix, b: Matrix): Matrix {
  const out: Matrix = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      let v = j === 3 ? a[i * 4 + 3] : 0;
      for (let k = 0; k < 3; k++) {
        v += a[i * 4 + k] * b[k * 4 + j];
      }
      out.push(v);
    }
  }
  return out;
}

/** The whole filter at `strength` (0–1) as one matrix. */
export const filterMatrix = (id: FilterId, strength = 1): Matrix =>
  scaled(id, strength).reduce(
    (m, [op, a]) => compose(opMatrix(op, a), m),
    IDENTITY_MATRIX
  );

/** Runs RGBA pixels through a matrix in place; alpha is kept. */
export function applyMatrix(data: Uint8ClampedArray, m: Matrix) {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    data[i] = m[0] * r + m[1] * g + m[2] * b + m[3];
    data[i + 1] = m[4] * r + m[5] * g + m[6] * b + m[7];
    data[i + 2] = m[8] * r + m[9] * g + m[10] * b + m[11];
  }
}
