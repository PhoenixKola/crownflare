from __future__ import annotations
from hashlib import sha256
from pathlib import Path
import json
import wave

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/audio/b04/sunderglass-ambience.wav'
RUNTIME = ROOT / 'public/assets/audio/b04/sunderglass-ambience.wav'
OUT = ROOT / 'review-evidence/b04/audio-audit.json'

def inspect(path: Path) -> dict:
    with wave.open(str(path), 'rb') as clip:
        return {'sha256': sha256(path.read_bytes()).hexdigest(), 'channels': clip.getnchannels(), 'sampleRate': clip.getframerate(), 'sampleWidth': clip.getsampwidth(), 'frames': clip.getnframes(), 'durationSeconds': round(clip.getnframes() / clip.getframerate(), 3)}

def main() -> None:
    errors = []
    if not SOURCE.exists() or not RUNTIME.exists():
        errors.append('missing B04 ambient source or runtime WAV')
        data = {}
    else:
        source, runtime = inspect(SOURCE), inspect(RUNTIME)
        if SOURCE.read_bytes() != RUNTIME.read_bytes(): errors.append('runtime WAV differs from authored source')
        if source['channels'] != 1 or source['sampleRate'] != 44100 or source['sampleWidth'] != 2: errors.append(f'expected 44.1 kHz mono 16-bit PCM: {source}')
        if not 7.9 <= source['durationSeconds'] <= 8.1: errors.append(f'expected an approximately eight second loop: {source}')
        data = {'source': source, 'runtime': runtime}
    report = {'result': 'PASS' if not errors else 'FAIL', 'heardByAgent': 'NO', **data, 'errors': errors}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'result': report['result'], 'source': data.get('source'), 'errors': errors}, indent=2))
    if errors: raise SystemExit(1)

if __name__ == '__main__':
    main()
