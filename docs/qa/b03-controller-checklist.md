# B03 controller settings and hands-on checklist

## Tested behavior

The centralized mapper reads keyboard/mouse and the active connected **standard-mapped** Gamepad API pad. The current defaults are:

| Action | Keyboard / mouse | Xbox-style standard indices | PlayStation-style standard indices |
| --- | --- | --- | --- |
| Move | A/D or arrows | Left stick / D-pad | Left stick / D-pad |
| Jump | Space / W / Up | A / 0 | Cross / 0 |
| Light / combo | J / left click | X / 2 | Square / 2 |
| Heavy / launcher | K / right click | Y / 3 | Triangle / 3 |
| Dodge / dash | Shift | B / 1 | Circle / 1 |
| Resonance special | Q | RB / 5 | R1 / 5 |
| Interact | E | D-pad Up / 12 | D-pad Up / 12 |
| Pause | Esc | Menu / Start / 9 | Options / Start / 9 |

LB/L1 transformation and RT/R2 finisher prompts are marked unavailable; they do not trigger unimplemented game actions. Keyboard and mouse remain usable whenever a controller is connected.

## Automated Chrome coverage

The current B03 QA uses a labeled **synthetic Gamepad API fixture**, not a physical controller. It covers standard indices 0/1/2/3/5/9/12, live test buttons and axes, 0.20 dead zone with hysteresis, adjustment to 0.10, duplicate remap rejection, Start safety, reset/defaults, settings persistence across reload, corrupt-storage fallback, unknown mapping disclosure, active selection across three pads, index change/reconnect, East/back, settings open while paused, and a Start press held across the pause edge. Unsupported vibration is shown as unsupported. The rumble preview and gameplay haptics call `playEffect` only after feature detection and failures are caught.

## Owner hardware check

Use the dev server and candidate route:

1. Start `npm run dev`, open `http://127.0.0.1:5173/?b03=1` in Chrome, and choose **Controls / Controller** at the title.
2. Connect one Xbox controller and one DualSense/DualShock controller separately. Confirm the status says Connected, identifies the family only when its reported ID supports that label, and shows the selected index.
3. Move the left stick slowly across 0.20 and 0.10 dead-zone settings; check the on-screen signed value. Confirm the D-pad still moves independently.
4. Remap Light to a free button, attempt a duplicate button, then press Start/Menu during capture. Save and reload; confirm the chosen binding persists. Reset to defaults afterward.
5. Enter the chamber and try move, jump, light combo, heavy, dodge, Resonance, interact and pause. Test left and right directions. Reconnect or change the active controller and check that inputs recover.
6. On the pause screen open Settings, cancel/save, and resume. Confirm no held attack fires when leaving the menu. If a Test Rumble button is enabled, use it once at its low-strength preview setting; otherwise the screen should say unsupported.
7. Record the controller model, Windows version, Chrome version, connection type, latency/feel notes, whether vibration actually worked, and any binding problem on the owner decision card.

**Physical controller status:** PENDING OWNER HANDS-ON TEST. No hardware was available to the automated run.
