export type GameAction = 'moveHorizontal' | 'jump' | 'dash' | 'light' | 'heavy' | 'special' | 'transform' | 'finisher' | 'interact' | 'drop' | 'pause';
export const KEYBOARD_BINDINGS: Readonly<Record<GameAction, readonly string[]>> = {
  moveHorizontal: ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'], jump: ['Space', 'KeyW', 'ArrowUp'], dash: ['ShiftLeft', 'ShiftRight'],
  light: ['KeyJ', 'Mouse0'], heavy: ['KeyK', 'Mouse2'], special: ['KeyQ'], transform: ['KeyR'], finisher: ['KeyF'], interact: ['KeyE'], drop: ['KeyS', 'ArrowDown'], pause: ['Escape'],
};
export const GAMEPAD_BINDINGS: Readonly<Partial<Record<GameAction, readonly string[]>>> = {
  moveHorizontal: ['left-axis', 'd-pad'], jump: ['south-button'], dash: ['west-button'], light: ['east-button'], heavy: ['north-button'],
  special: ['right-bumper'], transform: ['left-bumper'], finisher: ['right-trigger'], interact: ['d-pad-up'], pause: ['start'],
};
