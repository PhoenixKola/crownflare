import * as Phaser from 'phaser';
import { ChamberScene } from './scenes/ChamberScene';
export function createGame(onPause: () => void, onController: (active: boolean) => void): { game: Phaser.Game; scene: ChamberScene } {
  const scene = new ChamberScene(onPause, onController);
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
    canvas.setAttribute('aria-label', 'Crownflare playable test chamber');
    canvas.focus();
  });
  return { game, scene };
}
