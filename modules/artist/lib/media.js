// Indexed WebP frames, bundled for the portfolio preview.
export const FRAME_COUNT = 41;
export const FRAME_CONCURRENCY = 6;

export const frameUrl = (size, index) => new URL(
  `../assets/${size}-${String(index).padStart(2, '0')}.webp`,
  import.meta.url
).href;
