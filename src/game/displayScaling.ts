import type { DisplayScalingMode } from './persistence/save.ts';

/** Choose a CSS zoom that preserves whole physical pixels for pixel-art mode. */
export function displayZoom(width: number, height: number, mode: DisplayScalingMode, devicePixelRatio = 1): number {
  const fit = Math.min(width / 480, height / 270);
  if (mode === 'fit' || fit < 1) return Math.max(0.1, fit);

  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.max(1, Math.floor(fit * ratio + 1e-6)) / ratio;
}
