import labelUrl from "../assets/parental-advisory.svg";

/** Width over height of the label artwork (2000 × 1250). */
export const ADVISORY_ASPECT = 2000 / 1250;

let image: HTMLImageElement | null = null;
let loading: Promise<HTMLImageElement | null> | null = null;

/** The label artwork once it has loaded, else null. */
export const advisoryImage = () => image;

const load = async () => {
  const img = new Image();
  img.src = labelUrl;
  try {
    await img.decode();
    image = img;
    return img;
  } catch {
    return null;
  }
};

/** Loads the label artwork once. Resolves to null if it fails; never rejects. */
export const loadAdvisory = () => {
  loading ??= load();
  return loading;
};
