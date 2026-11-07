export const CONTROL_SETTINGS_NAMESPACE = 'project-crownflare:controls:v1';

export const REBINDABLE_ACTIONS = ['jump', 'light', 'heavy', 'dash', 'special', 'interact'] as const;
export type RebindableAction = typeof REBINDABLE_ACTIONS[number];
export type ControlSettings = {
  readonly version: 1;
  readonly deadZone: number;
  readonly rumbleEnabled: boolean;
  readonly buttons: Readonly<Record<RebindableAction, number>>;
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  version: 1,
  deadZone: 0.2,
  rumbleEnabled: false,
  buttons: { jump: 0, light: 2, heavy: 3, dash: 1, special: 5, interact: 12 },
};

export const KEYBOARD_CODES: Readonly<Record<RebindableAction, readonly string[]>> = {
  jump: ['Space', 'KeyW', 'ArrowUp'],
  light: ['KeyJ'],
  heavy: ['KeyK'],
  dash: ['ShiftLeft', 'ShiftRight'],
  special: ['KeyQ'],
  interact: ['KeyE'],
};

export function parseControlSettings(raw: string | null): ControlSettings {
  if (!raw) return DEFAULT_CONTROL_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return DEFAULT_CONTROL_SETTINGS;
    const data = value as Record<string, unknown>;
    const buttons = data.buttons as Record<string, unknown> | undefined;
    if (data.version !== 1 || typeof data.deadZone !== 'number' || data.deadZone < 0.1 || data.deadZone > 0.4 || typeof data.rumbleEnabled !== 'boolean') return DEFAULT_CONTROL_SETTINGS;
    if (!buttons || REBINDABLE_ACTIONS.some((action) => !Number.isInteger(buttons[action]) || Number(buttons[action]) < 0 || Number(buttons[action]) > 15 || Number(buttons[action]) === 9)) return DEFAULT_CONTROL_SETTINGS;
    const indices = REBINDABLE_ACTIONS.map((action) => Number(buttons[action]));
    if (new Set(indices).size !== indices.length) return DEFAULT_CONTROL_SETTINGS;
    return { version: 1, deadZone: data.deadZone, rumbleEnabled: data.rumbleEnabled, buttons: Object.fromEntries(REBINDABLE_ACTIONS.map((action) => [action, Number(buttons[action])])) as Record<RebindableAction, number> };
  } catch { return DEFAULT_CONTROL_SETTINGS; }
}

export function loadControlSettings(storage: Pick<Storage, 'getItem'>): ControlSettings {
  try { return parseControlSettings(storage.getItem(CONTROL_SETTINGS_NAMESPACE)); }
  catch { return DEFAULT_CONTROL_SETTINGS; }
}

export function saveControlSettings(storage: Pick<Storage, 'setItem'>, value: ControlSettings): boolean {
  const validated = parseControlSettings(JSON.stringify(value));
  try { storage.setItem(CONTROL_SETTINGS_NAMESPACE, JSON.stringify(validated)); return true; }
  catch { return false; }
}

export function remapControlButton(settings: ControlSettings, action: RebindableAction, button: number): { readonly ok: boolean; readonly settings: ControlSettings; readonly reason?: string } {
  if (!Number.isInteger(button) || button < 0 || button > 15 || button === 9) return { ok: false, settings, reason: 'Start/Menu is reserved for pause; choose another standard button.' };
  const conflict = REBINDABLE_ACTIONS.find((candidate) => candidate !== action && settings.buttons[candidate] === button);
  if (conflict) return { ok: false, settings, reason: `${buttonLabel(button)} is already assigned to ${conflict}.` };
  return { ok: true, settings: { ...settings, buttons: { ...settings.buttons, [action]: button } } };
}

export type StandardPadLike = {
  readonly connected: boolean;
  readonly mapping: string;
  readonly index: number;
  readonly id: string;
  readonly axes: ArrayLike<number>;
  readonly buttons: ArrayLike<{ readonly pressed: boolean; readonly value?: number }>;
};

export function padHasActivity(pad: StandardPadLike): boolean {
  return Array.from(pad.buttons).some((button) => button?.pressed) || Array.from(pad.axes).some((axis) => Number.isFinite(axis) && Math.abs(axis) > 0.22);
}

export function selectStandardPad(pads: readonly (StandardPadLike | null)[], previousIndex = -1): StandardPadLike | null {
  const usable = pads.filter((pad): pad is StandardPadLike => !!pad?.connected && pad.mapping === 'standard');
  const previous = usable.find((pad) => pad.index === previousIndex);
  if (previous && padHasActivity(previous)) return previous;
  return usable.find(padHasActivity) ?? previous ?? usable[0] ?? null;
}

export function readPadActions(pad: StandardPadLike | null, settings: ControlSettings, axisWasEngaged = false): { readonly axis: number; readonly axisEngaged: boolean; readonly pressed: Readonly<Record<RebindableAction, boolean>>; readonly pausePressed: boolean; readonly interactPressed: boolean } {
  if (!pad) return { axis: 0, axisEngaged: false, pressed: { jump: false, light: false, heavy: false, dash: false, special: false, interact: false }, pausePressed: false, interactPressed: false };
  const axisValue = Number.isFinite(pad.axes[0]) ? Number(pad.axes[0]) : 0;
  const magnitude = Math.abs(axisValue);
  const axisEngaged = axisWasEngaged ? magnitude >= Math.max(0, settings.deadZone - 0.025) : magnitude >= Math.min(1, settings.deadZone + 0.025);
  const axis = axisEngaged ? axisValue : 0;
  const dpad = (button: number) => !!pad.buttons[button]?.pressed;
  const pressed = Object.fromEntries(REBINDABLE_ACTIONS.map((action) => [action, dpad(settings.buttons[action])])) as Record<RebindableAction, boolean>;
  const dpadAxis = Number(dpad(15)) - Number(dpad(14));
  return { axis: dpadAxis || axis, axisEngaged, pressed, pausePressed: dpad(9), interactPressed: pressed.interact };
}

export function buttonLabel(index: number, family: 'xbox' | 'playstation' | 'standard' = 'standard'): string {
  const xbox: Record<number, string> = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'View', 9: 'Menu', 10: 'L3', 11: 'R3', 12: 'D-pad Up', 13: 'D-pad Down', 14: 'D-pad Left', 15: 'D-pad Right' };
  const playstation: Record<number, string> = { 0: 'Cross', 1: 'Circle', 2: 'Square', 3: 'Triangle', 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'Share', 9: 'Options', 10: 'L3', 11: 'R3', 12: 'D-pad Up', 13: 'D-pad Down', 14: 'D-pad Left', 15: 'D-pad Right' };
  const values = family === 'xbox' ? xbox : family === 'playstation' ? playstation : {};
  return values[index] ?? `Button ${index}`;
}

export function controllerFamily(id: string): 'xbox' | 'playstation' | 'standard' {
  const lower = id.toLowerCase();
  if (lower.includes('xbox') || lower.includes('x-input')) return 'xbox';
  if (lower.includes('playstation') || lower.includes('dualshock') || lower.includes('dualsense')) return 'playstation';
  return 'standard';
}
