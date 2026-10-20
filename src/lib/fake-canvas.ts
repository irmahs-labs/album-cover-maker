/**
 * A stand-in for CanvasRenderingContext2D in tests: it records every method
 * call and the font in effect for each fillText, and measures text as half
 * the font size per character, so layouts can be checked exactly.
 */
export interface Call {
  name: string;
  args: unknown[];
  font: string;
  fillStyle: unknown;
}

export const fontPx = (font: string) =>
  Number(/(?<px>\d+(?:\.\d+)?)px/u.exec(font)?.groups?.px ?? 10);

const noop = () => {
  // A gradient stop changes nothing the tests read.
};

export const fakeContext = () => {
  const calls: Call[] = [];
  // The properties the drawing code has set, from the canvas defaults on.
  const props = new Map<string, unknown>([
    ["fillStyle", "#000"],
    ["font", "10px sans-serif"],
  ]);
  const font = () => String(props.get("font"));
  // SAFETY: the proxy answers every member a CanvasRenderingContext2D has:
  // properties from props, measureText, gradients, and a recording function
  // for any other method.
  const ctx = new Proxy(
    {},
    {
      get(_target, key: string) {
        if (key === "measureText") {
          return (text: string) => ({
            width: text.length * fontPx(font()) * 0.5,
          });
        }
        if (props.has(key)) {
          return props.get(key);
        }
        if (key.startsWith("create") && key.endsWith("Gradient")) {
          return () => ({ addColorStop: noop });
        }
        return (...args: unknown[]) => {
          calls.push({
            args,
            fillStyle: props.get("fillStyle"),
            font: font(),
            name: key,
          });
        };
      },
      set(_target, key: string, value) {
        props.set(key, value);
        return true;
      },
    }
  ) as CanvasRenderingContext2D;

  const named = (name: string) => calls.filter((c) => c.name === name);
  /** Every fillText, as { text, x, y, px }. */
  const texts = () =>
    named("fillText").map((c) => ({
      px: fontPx(c.font),
      text: String(c.args[0]),
      x: Number(c.args[1]),
      y: Number(c.args[2]),
    }));

  return { calls, ctx, named, texts };
};
