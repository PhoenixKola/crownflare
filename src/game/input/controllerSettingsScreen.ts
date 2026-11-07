import { CONTROL_SETTINGS_NAMESPACE, DEFAULT_CONTROL_SETTINGS, REBINDABLE_ACTIONS, buttonLabel, controllerFamily, loadControlSettings, remapControlButton, saveControlSettings, selectStandardPad, type ControlSettings, type RebindableAction, type StandardPadLike } from './controlSettings';

type SettingsHooks = { readonly onClose: () => void; readonly onApply: (settings: ControlSettings) => void };
type HapticActuator = { readonly type?: string; playEffect?: (type: string, options: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<string>; reset?: () => Promise<void> };
const actionTitle: Record<RebindableAction, string> = { jump: 'Jump', light: 'Light / Combo', heavy: 'Heavy / Launcher', dash: 'Dodge / Dash', special: 'Resonance Special', interact: 'Interact', transform: 'Dawnrush Transform', finisher: 'Dawnfall Breaker Finisher' };

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing controller settings UI: ${id}`);
  return element as T;
}

function availablePads(): (Gamepad | null)[] {
  try { return Array.from(navigator.getGamepads?.() ?? []); }
  catch { return []; }
}

export class ControllerSettingsScreen {
  private readonly root = byId<HTMLElement>('settings-screen');
  private readonly status = byId<HTMLElement>('controller-status');
  private readonly message = byId<HTMLElement>('settings-message');
  private readonly deadZone = byId<HTMLInputElement>('deadzone-range');
  private readonly deadZoneValue = byId<HTMLOutputElement>('deadzone-value');
  private readonly rumble = byId<HTMLInputElement>('rumble-enabled');
  private readonly rumbleSupport = byId<HTMLElement>('rumble-support');
  private readonly rumbleTest = byId<HTMLButtonElement>('rumble-test');
  private readonly axisFill = byId<HTMLElement>('axis-fill');
  private readonly axisValue = byId<HTMLOutputElement>('axis-value');
  private readonly focusables = (): HTMLElement[] => Array.from(this.root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')).filter((element) => !element.closest('.hidden'));
  private settings: ControlSettings = DEFAULT_CONTROL_SETTINGS;
  private pendingAction: RebindableAction | null = null;
  private ignoredHeld = new Set<number>();
  private previousButtons: boolean[] = [];
  private previousAxisY = 0;
  private axisEngaged = false;
  private padIndex = -1;
  private frame = 0;
  private hooks: SettingsHooks | null = null;
  private returnFocus: HTMLElement | null = null;
  private opened = false;

  constructor() {
    for (const action of REBINDABLE_ACTIONS) {
      this.root.querySelector<HTMLButtonElement>(`[data-capture="${action}"]`)?.addEventListener('click', () => this.beginCapture(action));
    }
    this.deadZone.addEventListener('input', () => {
      this.settings = { ...this.settings, deadZone: Number(this.deadZone.value) };
      this.deadZoneValue.value = Number(this.deadZone.value).toFixed(2);
    });
    this.rumble.addEventListener('change', () => { this.settings = { ...this.settings, rumbleEnabled: this.rumble.checked }; });
    byId<HTMLButtonElement>('settings-reset').addEventListener('click', () => {
      this.settings = DEFAULT_CONTROL_SETTINGS;
      this.pendingAction = null;
      this.render();
      this.setMessage('Default buttons and 0.20 dead zone restored. Save to apply them.');
    });
    byId<HTMLButtonElement>('settings-save').addEventListener('click', () => this.save());
    byId<HTMLButtonElement>('settings-cancel').addEventListener('click', () => this.close(false));
    byId<HTMLButtonElement>('settings-close').addEventListener('click', () => this.close(false));
    this.rumbleTest.addEventListener('click', () => { void this.testRumble(); });
    this.root.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') { event.preventDefault(); event.stopPropagation(); if (this.pendingAction) this.cancelCapture(); else this.close(false); }
    });
  }

  open(hooks: SettingsHooks): void {
    if (this.opened) return;
    this.opened = true;
    this.hooks = hooks;
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.settings = this.readSaved();
    this.pendingAction = null;
    this.root.classList.remove('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    this.render();
    byId<HTMLButtonElement>('settings-close').focus();
    this.previousButtons = [];
    this.padIndex = -1;
    this.frame = requestAnimationFrame(() => this.poll());
  }

  private close(save: boolean): void {
    if (!this.opened) return;
    if (!save) this.settings = this.readSaved();
    this.opened = false;
    this.pendingAction = null;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.root.classList.add('hidden');
    this.root.setAttribute('aria-hidden', 'true');
    const hooks = this.hooks;
    this.hooks = null;
    hooks?.onClose();
    this.returnFocus?.focus({ preventScroll: true });
    this.returnFocus = null;
  }

  private readSaved(): ControlSettings {
    try { return loadControlSettings(window.localStorage); }
    catch { return DEFAULT_CONTROL_SETTINGS; }
  }

  private save(): void {
    let success = false;
    try { success = saveControlSettings(window.localStorage, this.settings); }
    catch { success = false; }
    if (!success) { this.setMessage('Could not save settings in this browser. Defaults remain active.'); return; }
    this.hooks?.onApply(this.settings);
    this.setMessage(`Saved to ${CONTROL_SETTINGS_NAMESPACE}. Keyboard and mouse remain active.`);
    this.close(true);
  }

  private render(): void {
    for (const action of REBINDABLE_ACTIONS) {
      const button = this.root.querySelector<HTMLButtonElement>(`[data-rebind="${action}"]`);
      const capture = this.root.querySelector<HTMLButtonElement>(`[data-capture="${action}"]`);
      if (button) button.textContent = this.labelFor(this.settings.buttons[action]);
      if (capture) { capture.textContent = this.pendingAction === action ? 'PRESS BUTTON…' : 'REMAP'; capture.setAttribute('aria-pressed', String(this.pendingAction === action)); }
    }
    this.deadZone.value = this.settings.deadZone.toFixed(2);
    this.deadZoneValue.value = this.settings.deadZone.toFixed(2);
    this.rumble.checked = this.settings.rumbleEnabled;
    this.updateRumbleSupport(null);
  }

  private get family(): 'xbox' | 'playstation' | 'standard' {
    const pad = selectStandardPad(availablePads() as (StandardPadLike | null)[], this.padIndex);
    return pad ? controllerFamily(pad.id) : 'standard';
  }

  private labelFor(index: number): string {
    const family = this.family;
    return family === 'standard' ? `Button ${index}` : `${buttonLabel(index, family)} · ${index}`;
  }

  private setMessage(value: string): void { this.message.textContent = value; }

  private beginCapture(action: RebindableAction): void {
    const pads = availablePads();
    const pad = selectStandardPad(pads as (StandardPadLike | null)[], this.padIndex);
    if (!pad) { this.setMessage('Connect a controller with Standard mapping, then choose REMAP again.'); return; }
    this.pendingAction = action;
    this.ignoredHeld = new Set(Array.from(pad.buttons).flatMap((button, index) => button?.pressed ? [index] : []));
    this.previousButtons = Array.from(pad.buttons, (button) => !!button?.pressed);
    this.setMessage(`Press one standard button for ${actionTitle[action]}. Start/Menu is reserved; Escape cancels.`);
    this.render();
    this.root.querySelector<HTMLButtonElement>(`[data-capture="${action}"]`)?.focus();
  }

  private cancelCapture(): void {
    const action = this.pendingAction;
    this.pendingAction = null;
    this.ignoredHeld.clear();
    this.render();
    this.setMessage(action ? `${actionTitle[action]} remapping cancelled.` : 'Remapping cancelled.');
  }

  private updateRumbleSupport(pad: Gamepad | null): void {
    const actuator = (pad as (Gamepad & { vibrationActuator?: HapticActuator }) | null)?.vibrationActuator;
    const supported = !!actuator && typeof actuator.playEffect === 'function';
    this.rumbleSupport.textContent = pad ? supported ? 'Supported on this controller' : 'Unsupported by this controller' : 'Connect a supported controller';
    this.rumble.disabled = !supported;
    this.rumbleTest.disabled = !supported;
    if (!supported) this.rumble.checked = false;
  }

  private async testRumble(): Promise<void> {
    const pad = selectStandardPad(availablePads() as (StandardPadLike | null)[], this.padIndex) as (Gamepad | null);
    const actuator = (pad as (Gamepad & { vibrationActuator?: HapticActuator }) | null)?.vibrationActuator;
    if (!actuator || typeof actuator.playEffect !== 'function') { this.setMessage('Rumble is not supported by the active controller/browser.'); return; }
    try {
      await actuator.playEffect('dual-rumble', { duration: 45, strongMagnitude: 0.12, weakMagnitude: 0.12 });
      this.setMessage('Sent a short 45 ms rumble preview.');
    } catch { this.setMessage('The controller declined the rumble preview.'); }
  }

  private poll(): void {
    if (!this.opened) return;
    const pads = availablePads();
    const connected = pads.filter((pad): pad is Gamepad => !!pad?.connected);
    const standard = selectStandardPad(pads as (StandardPadLike | null)[], this.padIndex) as (Gamepad | null);
    const pad = standard ?? connected[0] ?? null;
    if ((pad?.index ?? -1) !== this.padIndex) {
      this.padIndex = pad?.index ?? -1;
      this.axisEngaged = false;
      this.previousButtons = pad ? Array.from(pad.buttons, (button) => !!button.pressed) : [];
    }
    const standardMapped = !!standard;
    const family = standard ? controllerFamily(standard.id) : 'standard';
    if (!connected.length) this.status.textContent = 'NOT CONNECTED · Keyboard and mouse are ready; press a controller button after connecting to detect it.';
    else if (!standardMapped) this.status.textContent = `CONNECTED · ${pad?.id || 'Controller'} · INDEX ${pad?.index ?? '—'} · UNKNOWN MAPPING (standard controls unavailable)`;
    else this.status.textContent = `CONNECTED · ${standard.id || 'Standard controller'} · ${family === 'standard' ? 'STANDARD / NEUTRAL LABELS' : `${family.toUpperCase()} LABELS`} · INDEX ${standard.index}`;
    this.updateRumbleSupport(standard);
    const rawAxis = standard?.axes[0] ?? 0;
    const magnitude = Number.isFinite(rawAxis) ? Math.abs(rawAxis) : 0;
    this.axisEngaged = this.axisEngaged ? magnitude >= Math.max(0, this.settings.deadZone - 0.025) : magnitude >= Math.min(1, this.settings.deadZone + 0.025);
    const axis = this.axisEngaged ? Math.max(-1, Math.min(1, rawAxis)) : 0;
    this.axisValue.value = axis.toFixed(2);
    this.axisFill.style.width = `${Math.abs(axis) * 50}%`;
    this.axisFill.style.left = axis < 0 ? '50%' : '50%';
    this.axisFill.style.transform = axis < 0 ? 'translateX(-100%)' : 'none';
    for (const element of this.root.querySelectorAll<HTMLElement>('[data-test-button]')) {
      const index = Number(element.dataset.testButton);
      const down = !!standard?.buttons[index]?.pressed;
      element.classList.toggle('active', down);
    }
    if (this.pendingAction && standard) this.captureButton(standard);
    else if (standard) this.navigate(standard);
    this.previousButtons = standard ? Array.from(standard.buttons, (button) => !!button.pressed) : [];
    this.frame = requestAnimationFrame(() => this.poll());
  }

  private captureButton(pad: Gamepad): void {
    for (const index of [...this.ignoredHeld]) if (!pad.buttons[index]?.pressed) this.ignoredHeld.delete(index);
    if (this.ignoredHeld.size) return;
    if (pad.buttons[9]?.pressed && !this.previousButtons[9]) { this.cancelCapture(); return; }
    for (let index = 0; index < pad.buttons.length; index += 1) {
      if (!pad.buttons[index]?.pressed || this.previousButtons[index]) continue;
      const action = this.pendingAction;
      if (!action) return;
      const result = remapControlButton(this.settings, action, index);
      if (!result.ok) { this.setMessage(result.reason ?? 'That button cannot be assigned.'); return; }
      this.settings = result.settings;
      this.pendingAction = null;
      this.render();
      this.setMessage(`${actionTitle[action]} is now on ${this.labelFor(index)}. Save to apply it.`);
      return;
    }
  }

  private navigate(pad: Gamepad): void {
    const up = !!pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.65;
    const down = !!pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.65;
    const previousUp = this.previousButtons[12] || this.previousAxisY < -0.65;
    const previousDown = this.previousButtons[13] || this.previousAxisY > 0.65;
    if ((up && !previousUp) || (down && !previousDown)) {
      const items = this.focusables();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const delta = up ? -1 : 1;
      items[(current + delta + items.length) % items.length]?.focus();
    }
    const east = !!pad.buttons[1]?.pressed;
    if (east && !this.previousButtons[1]) { this.close(false); return; }
    const start = !!pad.buttons[9]?.pressed;
    if (start && !this.previousButtons[9]) { this.close(false); return; }
    const south = !!pad.buttons[0]?.pressed;
    if (south && !this.previousButtons[0] && this.root.contains(document.activeElement)) (document.activeElement as HTMLElement).click();
    this.previousAxisY = pad.axes[1] ?? 0;
  }
}
