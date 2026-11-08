import * as Phaser from 'phaser';
import { ChamberScene } from './scenes/ChamberScene';
import { B04VerticalSliceScene } from './scenes/B04VerticalSliceScene';
import { B06EnemyGauntletScene } from './scenes/B06EnemyGauntletScene';
import { B07ExpeditionScene } from './scenes/B07ExpeditionScene';
import type { B10RunCheckpoint } from './persistence/save';
export function createGame(onPause: () => void, onController: (active: boolean) => void, options: { artReview?: boolean; animationLab?: boolean; ionaPreview?: boolean; b03Combat?: boolean; b04?: boolean; b05?: boolean; b06?: boolean; b07?: boolean; b08?: boolean; b09?: boolean; b10?: boolean; seed?: number; checkpoint?: B10RunCheckpoint | null; runId?: string; reduceMotion?: boolean } = {}): { game: Phaser.Game; scene: ChamberScene } {
  const artReview = import.meta.env.DEV && options.artReview === true;
  const animationLab = import.meta.env.DEV && options.animationLab === true;
  const ionaPreview = import.meta.env.DEV && options.ionaPreview === true;
  const b06 = import.meta.env.DEV && options.b06 === true;
  const b09 = import.meta.env.DEV && options.b09 === true;
  const b10 = options.b10 === true;
  const b08 = import.meta.env.DEV && (options.b08 === true || b09);
  const b07 = import.meta.env.DEV && (options.b07 === true || b08);
  const b05 = import.meta.env.DEV && (options.b05 === true || b06 || b07);
  const b04 = import.meta.env.DEV && (options.b04 === true || b05 || b06 || b07);
  const b03Combat = import.meta.env.DEV && (ionaPreview && options.b03Combat === true || b04 || b05 || b06 || b07);
  const previewEnabled = ionaPreview || b03Combat;
  const scene = b07 || b10
    ? new B07ExpeditionScene(onPause, onController, options.seed, b08 || b10, b09 || b10, b10, options.checkpoint ?? null, options.runId, options.reduceMotion)
    : b06
    ? new B06EnemyGauntletScene(onPause, onController)
    : b04
    ? new B04VerticalSliceScene(onPause, onController, { b05 })
    : new ChamberScene(onPause, onController, { artReview, animationLab, ionaPreview: previewEnabled, b03Combat });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: 480, height: 270,
    pixelArt: true,
    render: { pixelArt: true, antialias: false, roundPixels: true },
    backgroundColor: '#080e1d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 480, height: 270 },
    input: { gamepad: true },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false, fixedStep: true, fps: 60 } },
    scene: [scene],
  });
  game.events.once(Phaser.Core.Events.READY, () => {
    const canvas = game.canvas;
    if (!canvas) return;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', b10 ? 'Crownflare pre-release Spindle Refuge two-region expedition' : artReview ? 'Crownflare B01A true-scale character review' : animationLab ? 'Crownflare provisional Iona animation and combat laboratory' : b09 ? 'Crownflare B09 roguelite run-build expedition' : b08 ? 'Crownflare B08 three-boss expedition playtest' : b07 ? 'Crownflare B07 two-region branching expedition playtest' : b06 ? 'Crownflare B06 enemy roster and combat gauntlet playtest' : b05 ? 'Crownflare B05 Dawnrush transformation combat review' : b04 ? 'Crownflare B04 Sunderglass Atrium combat vertical slice' : b03Combat ? 'Crownflare B03 provisional base combat encounter' : previewEnabled ? 'Crownflare provisional Iona playable preview' : 'Crownflare playable test chamber');
    canvas.focus();
  });
  return { game, scene };
}
