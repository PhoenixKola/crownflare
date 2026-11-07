import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IONA_B01E_TEXTURES, ionaB01EAssetKey } from '../../src/game/animation/ionaB01eAnimation.ts';
import { IONA_B01E_FRAME_BOUNDS } from '../../src/game/animation/ionaB01eFrameMetrics.ts';
import { IONA_REFERENCE_CANVAS, IONA_REFERENCE_STANDING_HEIGHT, IonaPlayerPresentation, type IonaPresentationTarget } from '../../src/game/animation/ionaPlayerPresentation.ts';

class FakeTarget implements IonaPresentationTarget {
  origin = { x: 0, y: 0 };
  scale = 0;
  position = { x: 0, y: 0 };
  texture = '';
  flipX = true;
  alpha = 0;
  scaleCalls: number[] = [];
  setOrigin(x: number, y: number): this { this.origin = { x, y }; return this; }
  setScale(scale: number): this { this.scale = scale; this.scaleCalls.push(scale); return this; }
  setTexture(key: string): this { this.texture = key; return this; }
  setPosition(x: number, y: number): this { this.position = { x, y }; return this; }
  setFlipX(flip: boolean): this { this.flipX = flip; return this; }
  setAlpha(alpha: number): this { this.alpha = alpha; return this; }
}

test('all B01E poses keep one selected scale and common canvas foot pivot', () => {
  assert.equal(IONA_B01E_TEXTURES.length, 70);
  assert.equal(Object.keys(IONA_B01E_FRAME_BOUNDS).length, 70);

  for (const reviewSize of [48, 60, 72] as const) {
    const presentation = new IonaPlayerPresentation();
    const target = new FakeTarget();
    presentation.attach(target);
    presentation.setReviewSize(reviewSize);
    const expectedScale = reviewSize / IONA_REFERENCE_STANDING_HEIGHT;
    assert.deepEqual(target.origin, { x: IONA_REFERENCE_CANVAS.pivotX, y: IONA_REFERENCE_CANVAS.pivotY });
    assert.equal(target.scale, expectedScale);
    const selectedScaleCallCount = target.scaleCalls.length;

    for (const { id, facing } of IONA_B01E_TEXTURES) {
      const bounds = IONA_B01E_FRAME_BOUNDS[`${id}-${facing}` as keyof typeof IONA_B01E_FRAME_BOUNDS];
      assert.ok(bounds, `Missing alpha bounds for ${id}-${facing}`);
      assert.ok(bounds[0] >= 0 && bounds[1] >= 0 && bounds[2] <= IONA_REFERENCE_CANVAS.width && bounds[3] <= IONA_REFERENCE_CANVAS.height, `Clipped alpha bounds for ${id}-${facing}`);
      presentation.present({ textureKey: ionaB01EAssetKey(id, facing), x: 127, footY: 241 });
      assert.equal(target.scale, expectedScale, `Scale changed for ${id}-${facing} at ${reviewSize}px`);
      assert.deepEqual(target.position, { x: 127, y: 241 }, `Foot pivot moved for ${id}-${facing}`);
      assert.equal(target.texture, ionaB01EAssetKey(id, facing));
      assert.equal(target.flipX, false);
      assert.equal(target.alpha, 1);
    }

    assert.equal(target.scaleCalls.length, selectedScaleCallCount, 'changing pose must not call setScale');
  }
});

test('the only authored airborne offset moves the shared foot anchor without changing scale', () => {
  const presentation = new IonaPlayerPresentation();
  const target = new FakeTarget();
  presentation.attach(target);
  presentation.present({ textureKey: 'iona-b01e-jump-0-right', x: 80, footY: 220, airborneOffsetY: -12 });
  assert.deepEqual(target.position, { x: 80, y: 208 });
  assert.equal(target.scale, 1);
  assert.deepEqual(target.origin, { x: 0.5, y: 1 });
});

test('ChamberScene no longer rescales from pose alpha height and preserves the fixed physics body', () => {
  const scene = readFileSync('src/game/scenes/ChamberScene.ts', 'utf8');
  assert.doesNotMatch(scene, /fitB01dSpriteToRequestedHeight/);
  assert.match(scene, /this\.body\.setSize\(15, 30\)/);
  assert.match(scene, /this\.playerPresentation\.setReviewSize\(scale\)/);
  assert.match(scene, /this\.playerPresentation\.present\(\{textureKey,x:this\.body\.center\.x,footY:this\.body\.bottom\}\)/);
});
