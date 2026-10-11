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
  Number(/(\d+(?:\.\d+)?)px/u.exec(font)?.[1] ?? 10);

export const fakeContext = () => {
  const calls: Call[] = [];
  const props: Record<string, unknown> = {
    fillStyle: "#000",
    font: "10px sans-serif",
  };
  const ctx = new Proxy(props, {
    get(target, key: string) {
      if (key === "measureText") {
        return (text: string) => ({
          width: text.length * fontPx(String(target.font)) * 0.5,
        });
      }
      if (key in target) {
        return target[key];
      }
      if (key.startsWith("create") && key.endsWith("Gradient")) {
        return () => ({ addColorStop() {} });
      }
      return (...args: unknown[]) => {
        calls.push({
          args,
          fillStyle: target.fillStyle,
          font: String(target.font),
          name: key,
        });
      };
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

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
