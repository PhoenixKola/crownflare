import type { DisplayScalingMode } from './persistence/save.ts';

/** Keep pixel-art nearest-neighbor scaled without shrinking a viewport unnecessarily. */
export function displayZoom(width: number, height: number, mode: DisplayScalingMode, devicePixelRatio = 1): number {
  const fit = Math.min(width / 480, height / 270);
  if (mode === 'fit' || fit < 1) return Math.max(0.1, fit);

  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const physicalInteger = Math.max(1, Math.floor(fit * ratio + 1e-6)) / ratio;
  // An integer-only zoom can waste a quarter or more of a 16:9 view (e.g.
  // 1366x768 falls from 1366x768 to 960x540). Use it only when it fills nearly
  // all of the available area; CSS image-rendering: pixelated keeps the fit
  // fallback crisp when source pixels land on alternating device-pixel widths.
  return physicalInteger / fit >= 0.9 - 1e-9 ? physicalInteger : fit;
}
