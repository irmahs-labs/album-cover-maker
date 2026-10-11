import { deflateSync } from "node:zlib";

/**
 * A 600 × 600 test photo made on the fly: a warm orange gradient with a
 * blue disc, so its colours are easy to tell apart from the advisory
 * label's black and white.
 */
export const testPhoto = () => {
  const size = 600;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x += 1) {
      const inDisc = (x - 400) ** 2 + (y - 200) ** 2 < 120 ** 2;
      const rgb = inDisc
        ? [40, 80, 200]
        : [
            200 + Math.round((55 * x) / size),
            120 + Math.round((60 * y) / size),
            60,
          ];
      row.set(rgb, 1 + x * 3);
    }
    rows.push(row);
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const crc32 = (data: Buffer) => {
  let crc = 0xff_ff_ff_ff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xed_b8_83_20 : crc >>> 1;
    }
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
};

/** Width and height from a PNG's header. */
export const pngSize = (png: Buffer) => ({
  height: png.readUInt32BE(20),
  width: png.readUInt32BE(16),
});
