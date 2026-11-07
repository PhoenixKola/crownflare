import assert from 'node:assert/strict';
import test from 'node:test';
import { SUNDERGLASS_ATRIUM } from '../../src/game/rooms/sunderglassAtrium.ts';

test('Sunderglass Atrium keeps every authored platform inside the 1560x270 pixel-space world', () => {
  const { width, height, groundTop } = SUNDERGLASS_ATRIUM.world;
  assert.equal(width, 1560);
  assert.equal(height, 270);
  assert.equal(groundTop, 241);
  assert.equal(SUNDERGLASS_ATRIUM.platforms[0]?.width, width);
  for (const platform of SUNDERGLASS_ATRIUM.platforms) {
    assert.ok(platform.centerX - platform.width / 2 >= 0, `${platform.id} begins outside the room`);
    assert.ok(platform.centerX + platform.width / 2 <= width, `${platform.id} ends outside the room`);
    assert.ok(platform.top >= 150 && platform.top + platform.height <= height, `${platform.id} has invalid vertical geometry`);
  }
});

test('the two encounter anchors, shard, and exit are in order and have traversal spacing', () => {
  const [first, second] = SUNDERGLASS_ATRIUM.sentries;
  assert.ok(first < SUNDERGLASS_ATRIUM.rewardX);
  assert.ok(SUNDERGLASS_ATRIUM.rewardX < second);
  assert.ok(second < SUNDERGLASS_ATRIUM.exitX);
  assert.ok(second - SUNDERGLASS_ATRIUM.rewardX > 700);
  assert.ok(SUNDERGLASS_ATRIUM.exitX < SUNDERGLASS_ATRIUM.world.width);
});
