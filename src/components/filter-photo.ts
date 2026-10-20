import { applyMatrix, filterMatrix } from "../lib/filters";
import type { FilterId } from "../lib/filters";
import type { Photo } from "../lib/state";

/**
 * The photo with a filter applied to its pixels, scaled down to `maxSide`
 * if it is bigger (the previews use a smaller copy; exports the full one).
 * Returns the photo itself for Original, 0% strength or no canvas.
 */
export const filterPhoto = (
  photo: Photo,
  filter: FilterId,
  strength: number,
  maxSide = Number.POSITIVE_INFINITY
): Photo => {
  if (filter === "original" || strength <= 0) {
    return photo;
  }

  const scale = Math.min(1, maxSide / Math.max(photo.width, photo.height));
  const width = Math.max(1, Math.round(photo.width * scale));
  const height = Math.max(1, Math.round(photo.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return photo;
  }

  ctx.drawImage(photo.image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  applyMatrix(pixels.data, filterMatrix(filter, strength / 100));
  ctx.putImageData(pixels, 0, 0);

  return { ...photo, height, image: canvas, width };
};
