import * as Phaser from 'phaser';
import { ChamberScene } from './scenes/ChamberScene';
import { B04VerticalSliceScene } from './scenes/B04VerticalSliceScene';
export function createGame(onPause: () => void, onController: (active: boolean) => void, options: { artReview?: boolean; animationLab?: boolean; ionaPreview?: boolean; b03Combat?: boolean; b04?: boolean } = {}): { game: Phaser.Game; scene: ChamberScene } {
  const artReview = import.meta.env.DEV && options.artReview === true;
  const animationLab = import.meta.env.DEV && options.animationLab === true;
  const ionaPreview = import.meta.env.DEV && options.ionaPreview === true;
  const b03Combat = import.meta.env.DEV && ionaPreview && options.b03Combat === true;
  const b04 = import.meta.env.DEV && options.b04 === true;
  const scene = b04
    ? new B04VerticalSliceScene(onPause, onController)
    : new ChamberScene(onPause, onController, { artReview, animationLab, ionaPreview, b03Combat });
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
    canvas.setAttribute('aria-label', artReview ? 'Crownflare B01A true-scale character review' : animationLab ? 'Crownflare provisional Iona animation and combat laboratory' : b04 ? 'Crownflare B04 Sunderglass Atrium combat vertical slice' : b03Combat ? 'Crownflare B03 provisional base combat encounter' : ionaPreview ? 'Crownflare provisional Iona playable preview' : 'Crownflare playable test chamber');
    canvas.focus();
  });
  return { game, scene };
}
