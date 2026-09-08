"""Offline regression checks for the deliberately static Lite distribution.

The contract is reviewed with changes to onboarding or the Lite exclusion list.
No launcher instance or installed user JAR is modified by these checks.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import struct
import tomllib

LITE_NAME = "Nexus Realms Lite"
LITE_URL = "https://itscarlosdev.github.io/nexus-realms-pack/lite/pack.toml"
LITE_ZIP = "NexusRealms-Lite-Prism.zip"
CONTRACT = Path(__file__).with_name("lite_contract.json")
BLOCK = re.compile(r"^(\S[^\n{}]*?) \{\n.*?^\}\n?", re.MULTILINE | re.DOTALL)
LOCAL_RESOURCE = re.compile(r"\[source:local\]/([^\r\n]+)")


class LiteError(ValueError):
    pass


def protected_layout(text: str) -> str:
    """Keep every button, action, condition and screen property, excluding backgrounds."""
    return "\n".join(
        block.group().strip()
        for block in BLOCK.finditer(text)
        if block.group(1) != "menu_background"
    )


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def validate_lite(root: Path) -> dict:
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    indexed = {e["file"] for e in tomllib.loads((root / "index.toml").read_text("utf-8"))["files"]}
    metadata = {}
    for path in (root / "mods").glob("*.pw.toml"):
        meta = tomllib.loads(path.read_text("utf-8"))
        metadata[path.name] = meta
        if f"mods/{path.name}" not in indexed:
            raise LiteError(f"Unindexed Lite mod: {path.name}")
        values = [normalized(path.name), normalized(meta["name"]), normalized(meta["filename"])]
        if any(value.startswith(prefix) for value in values for prefix in contract["forbidden_prefixes"]):
            raise LiteError(f"Forbidden Lite mod: {path.name}")
    for path in (root / "mods").glob("*.jar"):
        if any(normalized(path.name).startswith(prefix) for prefix in contract["forbidden_prefixes"]):
            raise LiteError(f"Forbidden direct Lite JAR: {path.name}")
    for name in contract["required_mods"]:
        if name not in metadata:
            raise LiteError(f"Missing essential Lite mod: {name}")
    for path in indexed:
        if path.startswith("mods/") and any(normalized(Path(path).name).startswith(prefix) for prefix in contract["forbidden_prefixes"]):
            raise LiteError(f"Forbidden indexed Lite mod: {path}")

    # Inactive editor defaults must not hide a new multimedia consumer.
    fancy = root / "config/fancymenu"
    layout_count = 0
    for path in fancy.rglob("*"):
        if path.suffix not in {".txt", ".json"}:
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(r"logo\.gif|\.mp4|background_type\s*=\s*video|element_type\s*=\s*video|action_type:[^\]]*video", text, re.I):
            raise LiteError(f"Multimedia consumer in Lite: {path.relative_to(root)}")
        if re.search(r"watermedia", text, re.I):
            # FancyMenu's own disabled debug flag is not a media consumer.
            rest = re.sub(r"^B:dev_force_watermedia_missing = 'false';\s*$", "", text, flags=re.M)
            if re.search(r"watermedia", rest, re.I):
                raise LiteError(f"Unexpected Watermedia consumer: {path.relative_to(root)}")
        for match in LOCAL_RESOURCE.finditer(text):
            relative = match.group(1).strip()
            resource = (root / relative).resolve()
            if root.resolve() not in resource.parents or not resource.is_file():
                raise LiteError(f"Missing/unsafe FancyMenu asset in {path.name}: {relative}")
            if relative not in indexed:
                raise LiteError(f"FancyMenu asset not distributed: {relative}")
        if path.parent.name == "customization":
            layout_count += 1
    for filename, expected in contract["onboarding"].items():
        path = fancy / "customization" / filename
        if not path.is_file() or sha(protected_layout(path.read_text("utf-8"))) != expected:
            raise LiteError(f"Onboarding contract changed: {filename}")
    if sha((fancy / "custom_gui_screens.txt").read_text("utf-8")) != contract["custom_gui_sha256"]:
        raise LiteError("Custom screen identifiers/behavior changed")
    if json.loads((fancy / "video_element_controller_metas.json").read_text("utf-8")):
        raise LiteError("Orphan video controller metadata")

    assets = [p for p in (fancy / "assets").rglob("*") if p.is_file()]
    size = sum(p.stat().st_size for p in assets)
    if size > contract["asset_budget_bytes"]:
        raise LiteError(f"FancyMenu assets exceed Lite budget: {size} > {contract['asset_budget_bytes']}")
    for path in assets:
        if path.suffix.lower() in {".gif", ".mp4", ".webm", ".mov"}:
            raise LiteError(f"Animated media distributed in Lite: {path.name}")
        if path.suffix.lower() == ".png":
            data = path.read_bytes()
            if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 33:
                raise LiteError(f"Invalid PNG: {path.name}")
            width, height = struct.unpack(">II", data[16:24])
            if width > 1920 or height > 1080:
                raise LiteError(f"Oversized Lite PNG: {path.name} ({width}x{height})")
            offset = 8
            while offset + 12 <= len(data):
                length = struct.unpack(">I", data[offset:offset + 4])[0]
                if data[offset + 4:offset + 8] == b"acTL":
                    raise LiteError(f"Animated PNG in Lite: {path.name}")
                offset += length + 12

    options = (root / "config/defaultoptions/options.txt").read_text("utf-8")
    enabled = json.loads(next(line.split(":", 1)[1] for line in options.splitlines() if line.startswith("resourcePacks:")))
    for name in ("file/NexusRealms", "file/NexusRealms_ES"):
        if name not in enabled or not (root / "resourcepacks" / name[5:] / "pack.mcmeta").is_file():
            raise LiteError(f"Missing mandatory resource pack: {name}")
    if "mod/punchy:punchy" in enabled:
        raise LiteError("Removed Punchy resource pack still enabled")
    for path in (root / "resourcepacks").glob("*.pw.toml"):
        if path.name in contract["removed_resourcepacks"]:
            raise LiteError(f"Removed cosmetic resource pack returned: {path.name}")
    for name in enabled:
        if name.startswith("file/") and not (root / "resourcepacks" / name[5:]).exists():
            raise LiteError(f"Missing enabled resource pack: {name}")
    return {"client_mods": sum(m.get("side", "both") == "client" for m in metadata.values()), "asset_bytes": size, "layouts": layout_count}


def validate_lite_instance(data: bytes) -> None:
    lines = data.decode("utf-8").splitlines()
    properties = dict(line.split("=", 1) for line in lines if "=" in line)
    for key, value in {"name": LITE_NAME, "AutomaticJava": "true", "OverrideJavaLocation": "false", "OverrideCommands": "true"}.items():
        if properties.get(key) != value:
            raise LiteError(f"Lite instance {key} must be {value!r}")
    if not properties.get("PreLaunchCommand", "").endswith(" " + LITE_URL):
        raise LiteError("Lite instance does not target /lite/pack.toml")
    if any(key in properties for key in ("OverrideMemory", "MinMemAlloc", "MaxMemAlloc")):
        raise LiteError("Lite memory policy is inherited; review policy before adding overrides")
