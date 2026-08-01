#!/usr/bin/env python3
"""Validate Nexus Realms Packwiz releases and build an isolated Pages site."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request
import zipfile


PRODUCTION_URL = "https://itscarlosdev.github.io/nexus-realms-pack/pack.toml"
BOOTSTRAP_SHA256 = (
    "A8FBB24DC604278E97F4688E82D3D91A318B98EFC08D5DBFCBCBCAB6443D116C"
)

FORBIDDEN_FILE_NAMES = {
    ".env",
    "iniciar_server_local.md",
    "ops.json",
    "server.properties",
    "whitelist.json",
    "banned-players.json",
    "banned-ips.json",
    "usercache.json",
    "eula.txt",
    "level.dat",
    "options.txt",
    "servers.dat",
    "launcher_profiles.json",
    "realms_persistence.json",
}
FORBIDDEN_SEGMENTS = {
    "camera_images",
    "saves",
    "world",
    "playerdata",
    "logs",
    "crash-reports",
    "screenshots",
    "backups",
    "secrets",
}
FORBIDDEN_SUFFIXES = {".bak", ".old", ".orig", ".mrpack"}
SECRET_PATTERNS = {
    "private key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(
        rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})"
    ),
    "AWS access key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "Discord webhook": re.compile(
        rb"https://(?:canary\.|ptb\.)?discord(?:app)?\.com/api/webhooks/\d+/[A-Za-z0-9._-]+"
    ),
    "OpenAI token": re.compile(
        rb"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b"
    ),
    "JWT": re.compile(
        rb"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"
    ),
    "credential-bearing URL": re.compile(
        rb"https?://[^\s/:@]+:[^\s/@]+@[^\s]+"
    ),
    "local user path": re.compile(
        rb"(?:[A-Za-z]:\\[U]sers\\[^\\\r\n]+|/[U]sers/[^/\r\n]+|/[h]ome/[^/\r\n]+)"
    ),
}

RUNTIME_FILES = {
    "server/update-server.sh": "scripts/update-server.sh",
    "server/NexusServerPatcher.java": "tools/server/NexusServerPatcher.java",
    (
        "server/templates/journeymap.server.global.config"
    ): "tools/server/templates/journeymap.server.global.config",
}


class ReleaseError(RuntimeError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_toml(path: Path) -> dict:
    try:
        with path.open("rb") as stream:
            return tomllib.load(stream)
    except (OSError, tomllib.TOMLDecodeError) as error:
        raise ReleaseError(f"Invalid TOML {path}: {error}") from error


def safe_relative(value: str) -> PurePosixPath:
    if not value or "\\" in value:
        raise ReleaseError(f"Unsafe Packwiz path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or "." in path.parts:
        raise ReleaseError(f"Unsafe Packwiz path: {value!r}")
    return path


def forbidden_reason(path: PurePosixPath) -> str | None:
    lower_parts = tuple(part.lower() for part in path.parts)
    name = lower_parts[-1]
    relative_text = path.as_posix().lower()
    allowed_options_paths = {
        "config/defaultoptions/options.txt",
        "config/drippyloadingscreen/options.txt",
        "config/fancymenu/options.txt",
    }
    if (
        (
            name in FORBIDDEN_FILE_NAMES
            and relative_text not in allowed_options_paths
        )
        or name.startswith(".env.")
    ):
        return f"operational/personal file name {name!r}"
    if any(part in FORBIDDEN_SEGMENTS for part in lower_parts):
        return "runtime, world, backup or secret directory"
    if name.endswith("~") or any(name.endswith(suffix) for suffix in FORBIDDEN_SUFFIXES):
        return "backup/export suffix"
    if (
        len(lower_parts) == 1
        and name.startswith("backup_")
        and name.endswith(".zip")
    ):
        return "root backup archive"
    if (
        len(lower_parts) >= 3
        and lower_parts[-3:] == (
            "config",
            "voicechat",
            "voicechat-server.properties",
        )
    ):
        return "operational Simple Voice Chat server configuration"
    if "journeymap" in lower_parts and "server" in lower_parts:
        return "operational JourneyMap server configuration"
    return None


def repository_candidates(root: Path) -> list[Path]:
    command = [
        "git",
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
    ]
    try:
        output = subprocess.check_output(command, cwd=root)
    except (OSError, subprocess.CalledProcessError) as error:
        raise ReleaseError(f"Unable to enumerate repository files: {error}") from error
    paths = []
    for raw in output.split(b"\0"):
        if raw:
            paths.append(root / os.fsdecode(raw))
    return paths


def security_scan(root: Path) -> None:
    failures: list[str] = []
    for path in repository_candidates(root):
        if not path.is_file():
            continue
        relative = PurePosixPath(path.relative_to(root).as_posix())
        reason = forbidden_reason(relative)
        if reason in {
            "operational Simple Voice Chat server configuration",
            "operational JourneyMap server configuration",
        }:
            reason = None
        if reason:
            failures.append(f"{relative}: {reason}")
            continue
        try:
            if path.stat().st_size > 8 * 1024 * 1024:
                continue
            data = path.read_bytes()
        except OSError as error:
            failures.append(f"{relative}: unreadable ({error})")
            continue
        if b"\0" in data[:4096]:
            continue
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(data):
                failures.append(f"{relative}: possible {label}")
    if failures:
        raise ReleaseError(
            "Repository safety scan rejected:\n  - " + "\n  - ".join(failures)
        )


def validate_pack(root: Path, *, scan_repository: bool = True) -> tuple[dict, list[dict]]:
    root = root.resolve()
    pack_path = root / "pack.toml"
    index_path = root / "index.toml"
    pack = load_toml(pack_path)

    if pack.get("pack-format") != "packwiz:1.1.0":
        raise ReleaseError("pack.toml must use packwiz:1.1.0")
    versions = pack.get("versions", {})
    if versions.get("minecraft") != "1.20.1":
        raise ReleaseError("Minecraft version must be 1.20.1")
    if versions.get("forge") != "47.4.10":
        raise ReleaseError("Forge version must be 47.4.10")

    index_definition = pack.get("index", {})
    if index_definition.get("file") != "index.toml":
        raise ReleaseError("pack.toml must reference index.toml")
    if index_definition.get("hash-format") != "sha256":
        raise ReleaseError("pack.toml index hash-format must be sha256")
    actual_index_hash = sha256_file(index_path)
    if index_definition.get("hash", "").lower() != actual_index_hash:
        raise ReleaseError(
            "pack.toml index hash mismatch: "
            f"expected {index_definition.get('hash')}, got {actual_index_hash}"
        )

    index = load_toml(index_path)
    if index.get("hash-format") != "sha256":
        raise ReleaseError("index.toml hash-format must be sha256")
    entries = index.get("files")
    if not isinstance(entries, list) or not entries:
        raise ReleaseError("index.toml contains no [[files]] entries")

    seen: set[str] = set()
    validated: list[dict] = []
    for entry in entries:
        value = entry.get("file")
        if not isinstance(value, str):
            raise ReleaseError("Packwiz entry without a string file path")
        relative = safe_relative(value)
        relative_text = relative.as_posix()
        if relative_text in seen:
            raise ReleaseError(f"Duplicate Packwiz entry: {relative_text}")
        seen.add(relative_text)

        reason = forbidden_reason(relative)
        if reason:
            raise ReleaseError(f"Forbidden indexed path {relative_text}: {reason}")
        source = root.joinpath(*relative.parts)
        if not source.is_file():
            raise ReleaseError(f"Indexed file is missing: {relative_text}")
        actual_hash = sha256_file(source)
        expected_hash = str(entry.get("hash", "")).lower()
        if expected_hash != actual_hash:
            raise ReleaseError(
                f"Indexed hash mismatch for {relative_text}: "
                f"expected {expected_hash}, got {actual_hash}"
            )

        if entry.get("metafile") is True:
            metadata = load_toml(source)
            side = metadata.get("side", "both")
            if side not in {"client", "server", "both"}:
                raise ReleaseError(f"{relative_text}: invalid side {side!r}")
            download = metadata.get("download", {})
            if download.get("hash-format") not in {"sha1", "sha256", "sha512", "murmur2"}:
                raise ReleaseError(f"{relative_text}: invalid download hash-format")
            if not isinstance(download.get("hash"), str):
                raise ReleaseError(f"{relative_text}: missing download hash")
            if (
                not isinstance(download.get("url"), str)
                and download.get("mode") != "metadata:curseforge"
            ):
                raise ReleaseError(
                    f"{relative_text}: missing URL or CurseForge metadata mode"
                )

        validated.append(
            {
                "path": relative_text,
                "sha256": actual_hash,
                "size": source.stat().st_size,
            }
        )

    if scan_repository:
        security_scan(root)
    return pack, validated


def ensure_output_safe(root: Path, output: Path) -> Path:
    root = root.resolve()
    output = output.resolve()
    if output == root or root not in output.parents:
        raise ReleaseError(f"Output must be a child of the repository: {output}")
    if output.name not in {"_site", ".release-site"}:
        raise ReleaseError(f"Refusing unexpected release output path: {output}")
    return output


def write_zip(path: Path, entries: dict[str, tuple[bytes, int]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(entries):
            data, mode = entries[name]
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (mode & 0xFFFF) << 16
            archive.writestr(info, data)


def build_site(
    root: Path,
    output: Path,
    bootstrap: Path,
    commit: str,
    generated_at: str,
) -> None:
    root = root.resolve()
    output = ensure_output_safe(root, output)
    bootstrap = bootstrap.resolve()
    pack, indexed = validate_pack(root)

    if sha256_file(bootstrap).upper() != BOOTSTRAP_SHA256:
        raise ReleaseError(
            f"Unexpected Packwiz bootstrap SHA-256: {sha256_file(bootstrap)}"
        )

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    shutil.copy2(root / "pack.toml", output / "pack.toml")
    shutil.copy2(root / "index.toml", output / "index.toml")
    for entry in indexed:
        relative = PurePosixPath(entry["path"])
        source = root.joinpath(*relative.parts)
        destination = output.joinpath(*relative.parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    (output / ".nojekyll").write_bytes(b"")

    runtime_entries: dict[str, tuple[bytes, int]] = {}
    for destination_text, source_text in RUNTIME_FILES.items():
        source = root / source_text
        destination = output / destination_text
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        mode = 0o755 if destination_text.endswith(".sh") else 0o644
        runtime_entries[
            f"nexus-runtime/{PurePosixPath(destination_text).name}"
            if "/templates/" not in destination_text
            else "nexus-runtime/templates/journeymap.server.global.config"
        ] = (source.read_bytes(), mode)

    runtime_hash_lines = []
    for relative in (
        "NexusServerPatcher.java",
        "templates/journeymap.server.global.config",
    ):
        path = output / "server" / relative
        runtime_hash_lines.append(f"{sha256_file(path)}  {relative}")
    runtime_hashes = ("\n".join(runtime_hash_lines) + "\n").encode("ascii")
    (output / "server/runtime.sha256").write_bytes(runtime_hashes)
    runtime_entries["nexus-runtime/runtime.sha256"] = (
        runtime_hashes,
        0o644,
    )

    write_zip(
        output / "downloads/NexusRealms-ServerRuntime.zip",
        runtime_entries,
    )

    prism_instance = (root / "tools/prism/template/instance.cfg").read_bytes()
    expected_command = (
        b'PreLaunchCommand=\\"$INST_JAVA\\" -jar '
        b"packwiz-installer-bootstrap.jar "
        + PRODUCTION_URL.encode("ascii")
    )
    if expected_command not in prism_instance:
        raise ReleaseError("Prism template does not contain the production pre-launch command")
    prism_entries = {
        "instance.cfg": (prism_instance, 0o644),
        "mmc-pack.json": (
            (root / "tools/prism/template/mmc-pack.json").read_bytes(),
            0o644,
        ),
        "minecraft/packwiz-installer-bootstrap.jar": (
            bootstrap.read_bytes(),
            0o644,
        ),
    }
    write_zip(output / "downloads/NexusRealms-Prism.zip", prism_entries)

    published_files = []
    for path in sorted(
        item
        for item in output.rglob("*")
        if item.is_file()
        and item.name not in {"manifest.json", ".nojekyll"}
    ):
        relative = path.relative_to(output).as_posix()
        published_files.append(
            {
                "path": relative,
                "sha256": sha256_file(path),
                "size": path.stat().st_size,
            }
        )

    manifest = {
        "schemaVersion": 1,
        "pack": {
            "name": pack.get("name"),
            "version": pack.get("version"),
            "minecraft": pack["versions"]["minecraft"],
            "forge": pack["versions"]["forge"],
        },
        "source": {
            "commit": commit,
            "generatedAt": generated_at,
            "packUrl": PRODUCTION_URL,
        },
        "files": published_files,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    verify_site(output)


def verify_zip_names(path: Path, expected: set[str]) -> None:
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        if names != expected:
            raise ReleaseError(
                f"Unexpected ZIP contents in {path.name}: {sorted(names)}"
            )
        for info in archive.infolist():
            if info.is_dir() or ".." in PurePosixPath(info.filename).parts:
                raise ReleaseError(f"Unsafe ZIP member: {info.filename}")


def verify_site(site: Path) -> None:
    site = site.resolve()
    _, indexed = validate_pack(site, scan_repository=False)
    manifest_path = site / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ReleaseError(f"Invalid manifest.json: {error}") from error

    manifest_paths = set()
    for entry in manifest.get("files", []):
        relative = safe_relative(entry["path"])
        path = site.joinpath(*relative.parts)
        if not path.is_file():
            raise ReleaseError(f"Manifest file missing from site: {relative}")
        if sha256_file(path) != entry.get("sha256"):
            raise ReleaseError(f"Manifest hash mismatch: {relative}")
        if path.stat().st_size != entry.get("size"):
            raise ReleaseError(f"Manifest size mismatch: {relative}")
        manifest_paths.add(relative.as_posix())

    expected_indexed = {entry["path"] for entry in indexed}
    if not expected_indexed.issubset(manifest_paths):
        missing = expected_indexed - manifest_paths
        raise ReleaseError(f"Indexed files absent from manifest: {sorted(missing)}")

    verify_zip_names(
        site / "downloads/NexusRealms-Prism.zip",
        {
            "instance.cfg",
            "mmc-pack.json",
            "minecraft/packwiz-installer-bootstrap.jar",
        },
    )
    verify_zip_names(
        site / "downloads/NexusRealms-ServerRuntime.zip",
        {
            "nexus-runtime/update-server.sh",
            "nexus-runtime/NexusServerPatcher.java",
            "nexus-runtime/runtime.sha256",
            "nexus-runtime/templates/journeymap.server.global.config",
        },
    )


def fetch(url: str, timeout: float = 30.0) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "NexusRealms-Pages-SmokeTest/1"},
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                raise ReleaseError(f"HTTP {response.status}: {url}")

            return response.read()

    except urllib.error.HTTPError as error:
        raise ReleaseError(
            f"HTTP {error.code}: {url}"
        ) from error

    except urllib.error.URLError as error:
        raise ReleaseError(
            f"URL error for {url}: {error.reason}"
        ) from error


def smoke_remote(base_url: str) -> None:
    base_url = base_url.rstrip("/") + "/"
    pack_data = fetch(urllib.parse.urljoin(base_url, "pack.toml"))
    index_data = fetch(urllib.parse.urljoin(base_url, "index.toml"))
    manifest_data = fetch(urllib.parse.urljoin(base_url, "manifest.json"))
    pack = tomllib.loads(pack_data.decode("utf-8"))
    if sha256_bytes(index_data) != pack["index"]["hash"].lower():
        raise ReleaseError("Remote index hash does not match remote pack.toml")
    index = tomllib.loads(index_data.decode("utf-8"))
    for entry in index["files"]:
        relative = safe_relative(entry["file"])
        encoded = urllib.parse.quote(relative.as_posix(), safe="/")
        data = fetch(urllib.parse.urljoin(base_url, encoded))
        if sha256_bytes(data) != entry["hash"].lower():
            raise ReleaseError(f"Remote indexed hash mismatch: {relative}")
    manifest = json.loads(manifest_data)
    for entry in manifest["files"]:
        relative = safe_relative(entry["path"])
        encoded = urllib.parse.quote(relative.as_posix(), safe="/")
        data = fetch(urllib.parse.urljoin(base_url, encoded))
        if sha256_bytes(data) != entry["sha256"]:
            raise ReleaseError(f"Remote manifest hash mismatch: {relative}")


def git_value(root: Path, *args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            cwd=root,
            text=True,
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("validate")

    build = subparsers.add_parser("build")
    build.add_argument("--output", type=Path, default=Path("_site"))
    build.add_argument("--bootstrap", type=Path, required=True)
    build.add_argument("--commit")
    build.add_argument("--generated-at")

    verify = subparsers.add_parser("verify-site")
    verify.add_argument("--site", type=Path, default=Path("_site"))

    smoke = subparsers.add_parser("smoke")
    smoke.add_argument("--base-url", default=PRODUCTION_URL.rsplit("/", 1)[0] + "/")
    smoke.add_argument("--attempts", type=int, default=1)
    smoke.add_argument("--delay", type=float, default=10.0)

    arguments = parser.parse_args()
    root = arguments.root.resolve()
    try:
        if arguments.command == "validate":
            _, entries = validate_pack(root)
            print(f"Validated {len(entries)} indexed Packwiz files.")
        elif arguments.command == "build":
            commit = arguments.commit or git_value(root, "rev-parse", "HEAD")
            generated_at = arguments.generated_at or (
                dt.datetime.now(dt.timezone.utc)
                .replace(microsecond=0)
                .isoformat()
                .replace("+00:00", "Z")
            )
            output = arguments.output
            if not output.is_absolute():
                output = root / output
            build_site(root, output, arguments.bootstrap, commit, generated_at)
            print(f"Built and verified isolated Pages site: {output}")
        elif arguments.command == "verify-site":
            site = arguments.site
            if not site.is_absolute():
                site = root / site
            verify_site(site)
            print(f"Verified Pages site: {site}")
        elif arguments.command == "smoke":
            last_error: Exception | None = None
            for attempt in range(1, arguments.attempts + 1):
                try:
                    smoke_remote(arguments.base_url)
                    print(f"Remote smoke test passed on attempt {attempt}.")
                    break
                except (
                    OSError,
                    ReleaseError,
                    urllib.error.URLError,
                    ValueError,
                ) as error:
                    last_error = error
                    if attempt == arguments.attempts:
                        raise
                    print(
                        f"Smoke attempt {attempt} failed: {error}",
                        file=sys.stderr,
                    )
                    time.sleep(arguments.delay)
            if last_error is not None and attempt == arguments.attempts:
                raise last_error
    except (
        OSError,
        ReleaseError,
        tomllib.TOMLDecodeError,
        json.JSONDecodeError,
        urllib.error.URLError,
    ) as error:
        print(f"release validation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
