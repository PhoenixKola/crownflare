/** Tracks the rising edge for gamepad Start, including a button held across the pause boundary. */
export class GamepadStartEdge {
  private wasDown = false;

  reset(currentlyDown = false): void { this.wasDown = currentlyDown; }

  poll(isDown: boolean): boolean {
    const justPressed = isDown && !this.wasDown;
    this.wasDown = isDown;
    return justPressed;
  }
}
