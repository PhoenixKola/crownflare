from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "review-evidence/b12/iona-base-dawnrush-vfx-off.png"
CELL_W, CELL_H, LABEL_H = 96, 60, 17
BASE = [
    ("b01e", "idle-0-right", "IDLE"), ("b01e", "start-0-right", "START"), ("b01e", "run-1-right", "RUN"), ("b01e", "stop-0-right", "STOP"),
    ("b01e", "turn-1-right", "TURN"), ("b01e", "jump-1-right", "JUMP RISE"), ("b01e", "jump-3-right", "JUMP APEX"), ("b01e", "jump-5-right", "JUMP FALL"),
    ("b01e", "dash-2-right", "DASH"), ("b01e", "combo-1-contact-right", "LIGHT 1"), ("b01e", "combo-2-contact-right", "LIGHT 2"), ("b01e", "combo-3-contact-right", "LIGHT 3"),
    ("b03", "heavy-contact-right", "HEAVY"), ("b03", "air-contact-right", "AERIAL"), ("b03", "special-contact-right", "SPECIAL"), ("b03", "hurt-stagger-right", "HURT"), ("b03", "hurt-ko-right", "KO"),
]
DAWNRUSH = [
    ("b05", "idle-ready-right", "IDLE"), ("b05", "sprint-start-right", "START"), ("b05", "run-contact-right", "RUN"), ("b05", "run-crossing-right", "CROSS"),
    ("b05", "turn-ready-right", "TURN"), ("b05", "jump-rise-right", "JUMP RISE"), ("b05", "jump-apex-right", "JUMP APEX"), ("b05", "jump-fall-right", "JUMP FALL"),
    ("b05", "dash-streamline-right", "DASH"), ("b05", "light-1-contact-right", "LIGHT 1"), ("b05", "light-2-contact-right", "LIGHT 2"), ("b05", "light-3-contact-right", "LIGHT 3"),
    ("b05", "heavy-contact-right", "HEAVY"), ("b05", "aerial-contact-right", "AERIAL"), ("b05", "solar-drive-right", "SOLAR"), ("b05", "hurt-stagger-right", "HURT"), ("b05", "hurt-ko-right", "KO"), ("b05", "finisher-impact-right", "FINISHER"),
]
TRANSFORM = [("b05", "transform-anticipation", "TRANSFORM"), ("b05", "transform-ignition", "IGNITE"), ("b05", "transform-ready", "DAWNRUSH"), ("b05", "revert-handoff-right", "REVERSION")]


def asset(folder: str, filename: str) -> Path:
    directory = "b03" if folder == "b03" else folder
    return ROOT / "public/assets/characters/iona" / directory / f"{filename}.png"


def main() -> None:
    rows = [("BASE / FIXED 0.75 SCALE / VFX OFF", BASE), ("DAWNRUSH / FIXED 0.75 SCALE / VFX OFF", DAWNRUSH), ("FORM TRANSITION / VFX OFF", TRANSFORM)]
    columns = max(len(items) for _label, items in rows)
    sheet = Image.new("RGBA", (columns * CELL_W, 24 + len(rows) * (CELL_H + LABEL_H)), (8, 16, 25, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    y = 0
    for row_label, items in rows:
        draw.text((8, y + 5), row_label, font=font, fill=(220, 239, 226, 255))
        y += 24
        for column, (folder, filename, caption) in enumerate(items):
            path = asset(folder, filename)
            if not path.is_file():
                raise SystemExit(f"Missing contact-sheet source: {path.relative_to(ROOT)}")
            frame = Image.open(path).convert("RGBA")
            if frame.size != (128, 80):
                raise SystemExit(f"Unexpected Iona source grid {frame.size}: {path.relative_to(ROOT)}")
            frame = frame.resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            x = column * CELL_W
            sheet.alpha_composite(frame, (x, y))
            draw.text((x + 3, y + CELL_H + 3), caption, font=font, fill=(221, 229, 222, 255))
        y += CELL_H + LABEL_H
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUT, optimize=True)
    print(f"Wrote VFX-off Base/Dawnrush contact sheet: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
