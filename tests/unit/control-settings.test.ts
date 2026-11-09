import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTROL_SETTINGS_NAMESPACE, DEFAULT_CONTROL_SETTINGS, buttonLabel, controllerFamily, loadControlSettings, parseControlSettings, padHasActivity, readPadActions, remapControlButton, saveControlSettings, selectStandardPad } from '../../src/game/input/controlSettings.ts';

function pad(index: number, buttons: number[] = [], axes: number[] = [0, 0], mapping = 'standard', connected = true) {
  return { index, id: `Pad ${index}`, mapping, connected, axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) };
}

test('defaults use the documented ergonomic standard mapping', () => {
  assert.deepEqual(DEFAULT_CONTROL_SETTINGS.buttons, { jump: 0, light: 2, heavy: 3, dash: 1, special: 5, interact: 12, transform: 4, finisher: 7 });
});

test('malformed or duplicate stored bindings fall back without touching save namespace', () => {
  assert.equal(parseControlSettings('{bad').version, 1);
  assert.equal(parseControlSettings(JSON.stringify({ ...DEFAULT_CONTROL_SETTINGS, buttons: { ...DEFAULT_CONTROL_SETTINGS.buttons, heavy: 2 } })).buttons.heavy, 3);
  let written = '';
  assert.equal(saveControlSettings({ setItem: (key, value) => { written = `${key}:${value}`; } }, DEFAULT_CONTROL_SETTINGS), true);
  assert.ok(written.startsWith(`${CONTROL_SETTINGS_NAMESPACE}:`));
});

test('deadzone validates to 0.10–0.40 and noisy axes do not move', () => {
  const settings = { ...DEFAULT_CONTROL_SETTINGS, deadZone: 0.25 };
  assert.equal(readPadActions(pad(0, [], [0.2, 0]), settings).axis, 0);
  const crossed = readPadActions(pad(0, [], [0.28, 0]), settings);
  assert.equal(crossed.axis, 0.28, 'axis engages above dead zone plus hysteresis');
  assert.equal(readPadActions(pad(0, [], [0.21, 0]), settings, crossed.axisEngaged).axis, 0, 'axis releases below dead zone minus hysteresis');
  assert.equal(readPadActions(pad(0, [], [0.6, 0]), settings).axis, 0.6);
  assert.equal(parseControlSettings(JSON.stringify({ ...settings, deadZone: 0.41 })).deadZone, DEFAULT_CONTROL_SETTINGS.deadZone);
});

test('D-pad remains active when the analog stick is noisy', () => {
  const value = readPadActions(pad(0, [15], [0.05, 0]), DEFAULT_CONTROL_SETTINGS);
  assert.equal(value.axis, 1);
});

test('nonstandard pads are never misreported as standard and reconnects can select another active pad', () => {
  const unknown = pad(0, [0], [0, 0], '');
  const idle = pad(1);
  const active = pad(2, [2]);
  assert.equal(selectStandardPad([unknown]), null);
  assert.equal(padHasActivity(active), true);
  assert.equal(selectStandardPad([unknown, idle, active], 1)?.index, 2);
});

test('remapping rejects Start and duplicate assignments with useful feedback', () => {
  assert.equal(remapControlButton(DEFAULT_CONTROL_SETTINGS, 'light', 9).ok, false);
  const duplicate = remapControlButton(DEFAULT_CONTROL_SETTINGS, 'light', 3);
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.reason ?? '', /heavy/);
  assert.equal(remapControlButton(DEFAULT_CONTROL_SETTINGS, 'light', 6).settings.buttons.light, 6);
});

test('legacy saved mappings receive a free transform button and the new action stays rebindable', () => {
  const legacy = { version: 1, deadZone: 0.2, rumbleEnabled: false, buttons: { jump: 0, light: 2, heavy: 3, dash: 1, special: 5, interact: 12 } };
  assert.equal(parseControlSettings(JSON.stringify(legacy)).buttons.transform, 4);
  assert.equal(parseControlSettings(JSON.stringify(legacy)).buttons.finisher, 7);
  assert.equal(readPadActions(pad(0, [4]), DEFAULT_CONTROL_SETTINGS).pressed.transform, true);
  assert.equal(readPadActions(pad(0, [7]), DEFAULT_CONTROL_SETTINGS).pressed.finisher, true);
  assert.equal(remapControlButton(DEFAULT_CONTROL_SETTINGS, 'transform', 9).ok, false);
  assert.equal(remapControlButton(DEFAULT_CONTROL_SETTINGS, 'finisher', 9).ok, false);
});

test('controller labels only use Xbox or PlayStation names when the ID identifies a family', () => {
  assert.equal(controllerFamily('Xbox Wireless Controller'), 'xbox');
  assert.equal(buttonLabel(2, 'playstation'), 'Square');
  assert.equal(buttonLabel(0, 'standard'), 'SOUTH');
  assert.equal(buttonLabel(2, 'standard'), 'WEST');
  assert.equal(buttonLabel(12, 'standard'), 'D-PAD UP');
  assert.equal(loadControlSettings({ getItem: () => { throw new Error('storage unavailable'); } }).version, 1);
});
