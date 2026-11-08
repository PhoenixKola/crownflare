"""Hash B09 visual evidence and measure its ZIP payload without retaining an archive."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "review-evidence" / "b09"
MANIFEST = EVIDENCE / "review-manifest.json"
EXCLUDED = {".git", "node_modules", "dist", ".vite", ".b06-recording-tmp", "__pycache__", "raw"}


def files_under(folder: Path, exclude_manifest: bool = False) -> list[Path]:
    found: list[Path] = []
    for current, directories, filenames in os.walk(folder):
        current_path = Path(current)
        relative_dir = current_path.relative_to(folder)
        directories[:] = [name for name in directories if name not in EXCLUDED]
        if any(part in EXCLUDED for part in relative_dir.parts):
            directories[:] = []
            continue
        for filename in filenames:
            target = current_path / filename
            relative = target.relative_to(folder)
            if any(part in EXCLUDED for part in relative.parts):
                continue
            if exclude_manifest and target == MANIFEST:
                continue
            found.append(target)
    return sorted(found)


def zip_measure(entries: list[tuple[Path, str]]) -> int:
    with TemporaryDirectory(prefix="crownflare-b09-size-") as temporary:
        archive_path = Path(temporary) / "payload.zip"
        with ZipFile(archive_path, "w", ZIP_DEFLATED, compresslevel=1) as archive:
            for source, archive_name in entries:
                archive.write(source, archive_name)
        return archive_path.stat().st_size


evidence_files = files_under(EVIDENCE, exclude_manifest=True)
evidence_entries = []
evidence_bytes = 0
for path in evidence_files:
    raw = path.read_bytes()
    evidence_bytes += len(raw)
    evidence_entries.append({
        "path": path.relative_to(ROOT).as_posix(),
        "bytes": len(raw),
        "sha256": sha256(raw).hexdigest(),
    })

report = json.loads((EVIDENCE / "qa-report.json").read_text(encoding="utf-8"))
video = report.get("video")
video_record = None
if video:
    video_path = ROOT / video["path"]
    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", video["path"]],
        cwd=ROOT, capture_output=True, check=False,
    ).returncode == 0
    video_record = {
        **video,
        "retainedInRepo": video_path.is_file(),
        "gitTracked": tracked,
        "audioTrack": bool(video.get("audioTrack", False)),
    }

project_files = files_under(ROOT, exclude_manifest=True)
project_bytes = sum(path.stat().st_size for path in project_files)
project_entries = [(path, path.relative_to(ROOT).as_posix()) for path in project_files]

manifest = {
    "milestone": "B09",
    "measuredAt": datetime.now(timezone.utc).isoformat(),
    "compression": "ZIP / DEFLATE level 1; temporary archive removed after measuring",
    "evidence": {
        "fileCount": len(evidence_files),
        "bytes": evidence_bytes,
        "compressedBytes": zip_measure([(p, p.relative_to(ROOT).as_posix()) for p in evidence_files]),
        "files": evidence_entries,
        "localGameplayCapture": video_record,
    },
    "repositoryPayload": {
        "fileCount": len(project_files),
        "bytes": project_bytes,
        "compressedBytes": zip_measure(project_entries),
        "exclusions": [".git", "node_modules", "dist", ".vite", "**/__pycache__", "review-evidence/raw", "review-evidence/.b06-recording-tmp", "this manifest itself"],
    },
}
MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "evidence": {key: manifest["evidence"][key] for key in ("fileCount", "bytes", "compressedBytes", "localGameplayCapture")},
    "repositoryPayload": manifest["repositoryPayload"],
    "manifest": MANIFEST.relative_to(ROOT).as_posix(),
}, indent=2))
