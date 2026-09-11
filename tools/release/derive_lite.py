"""Derive Lite from one immutable Git snapshot using the existing Lite contract."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tomllib

from lite_rules import BLOCK, CONTRACT, LITE_NAME, LiteError, protected_layout, sha
from pack_release import RUNTIME_FILES, build_site, forbidden_reason, safe_relative


def static_layout(text: str) -> str:
    """Change only backgrounds and the known animated logo, preserving source actions."""
    text = text.replace("\r\n", "\n")
    logo = "/config/fancymenu/assets/logo.gif"
    expected = protected_layout(text.replace(logo, logo[:-3] + "png"))
    active_video = any(
        block.group(1) == "menu_background"
        and re.search(r"background_type = video(?:_mcef)?\n", block.group())
        and "show_background = true" in block.group()
        for block in BLOCK.finditer(text)
    )

    def replace(block: re.Match) -> str:
        value = block.group()
        if block.group(1) != "menu_background":
            return value
        if re.search(r"background_type = video(?:_mcef)?\n", value):
            return ""
        if active_video and "background_type = image\n" in value:
            value = value.replace("show_background = false", "show_background = true")
            if "image_path = " not in value:
                value = value.replace("  slide =", "  image_path = [source:local]/config/fancymenu/assets/images/background.png\n  slide =")
        return value

    result = BLOCK.sub(replace, text).replace(logo, logo[:-3] + "png")
    if protected_layout(result) != expected:
        raise LiteError("Derivation changed a source menu action/condition")
    return result


def derive_lite(root: Path, source_ref: str, output: Path, bootstrap: Path, generated_at: str) -> None:
    root = root.resolve()
    output = (root / output).resolve()
    if root not in output.parents or (root / "dist").resolve() not in output.parents or output.exists():
        raise LiteError("Derived output must be a NEW directory below this repository's dist/")
    commit = subprocess.check_output(
        ["git", "rev-parse", "--verify", "--end-of-options", source_ref + "^{commit}"],
        cwd=root, text=True,
    ).strip()
    profile = json.loads(CONTRACT.read_text("utf-8"))
    policy = profile["derivation"]
    # One process; read all blobs from the resolved commit, never from a moving ref.
    process = subprocess.Popen(["git", "cat-file", "--batch"], cwd=root,
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE)

    def read(relative: str) -> bytes:
        safe_relative(relative)
        if "\n" in relative or "\r" in relative:
            raise LiteError("Invalid Git snapshot path")
        process.stdin.write(f"{commit}:{relative}\n".encode())
        process.stdin.flush()
        header = process.stdout.readline().split()
        if len(header) != 3 or header[1] != b"blob":
            raise LiteError(f"Missing source blob: {relative}")
        data = process.stdout.read(int(header[2]))
        process.stdout.read(1)
        return data

    try:
        pack_bytes, index_bytes = read("pack.toml"), read("index.toml")
        pack = tomllib.loads(pack_bytes.decode())
        if pack["index"]["hash"] != hashlib.sha256(index_bytes).hexdigest():
            raise LiteError("Source snapshot has a stale Packwiz index hash")
        entries = tomllib.loads(index_bytes.decode())["files"]
        source_entries = {entry["file"]: entry for entry in entries}
        if len(source_entries) != len(entries):
            raise LiteError("Duplicate source indexed path")
        files, retained, changed, excluded = {}, {}, {}, []
        required_mods = {}
        for relative, entry in source_entries.items():
            reason = forbidden_reason(safe_relative(relative))
            if reason:
                raise LiteError(f"Forbidden source indexed path: {relative}: {reason}")
            # Only exact reviewed paths can be removed. New media requires review.
            if relative in policy["removed_paths"]:
                excluded.append(relative)
                continue
            data = read(relative)
            if hashlib.sha256(data).hexdigest() != entry["hash"]:
                raise LiteError(f"Source indexed hash mismatch: {relative}")
            if relative.startswith("mods/") and entry.get("metafile"):
                metadata = tomllib.loads(data.decode())
                if Path(relative).name in policy["removed_client_mods"]:
                    if metadata.get("side") != "client":
                        raise LiteError(f"Refusing to remove a non-client source mod: {relative}")
                    excluded.append(relative)
                    continue
                required_mods[Path(relative).name] = metadata.get("side", "both")
            original = data
            if relative in policy["static_assets"]:
                rule = policy["static_assets"][relative]
                if hashlib.sha256(data).hexdigest() != rule["source_sha256"]:
                    raise LiteError(f"Source artwork changed; review Lite derivative: {relative}")
                data = (root / relative).read_bytes()
                if hashlib.sha256(data).hexdigest() != rule["lite_sha256"]:
                    raise LiteError(f"Lite derivative changed: {relative}")
            elif relative.startswith("config/fancymenu/customization/") and relative.endswith(".txt"):
                data = static_layout(data.decode()).encode()
            elif relative == "config/fancymenu/video_element_controller_metas.json":
                data = b"[]\n"
            elif relative == "config/defaultoptions/options.txt":
                settings = {}
                lines = data.decode().splitlines()
                for line in lines:
                    key, value = line.split(":", 1)
                    if key in settings:
                        raise LiteError(f"Duplicate source default: {key}")
                    settings[key] = value
                if not profile["default_options"].keys() <= settings.keys():
                    raise LiteError("Source defaults no longer contain the reviewed graphical keys")
                settings.update(profile["default_options"])
                enabled = json.loads(settings["resourcePacks"])
                settings["resourcePacks"] = json.dumps(
                    [name for name in enabled if name not in policy["removed_resource_pack_entries"]],
                    separators=(",", ":"), ensure_ascii=False,
                )
                data = ("\n".join(f"{key}:{value}" for key, value in settings.items()) + "\n").encode()
            files[relative] = data
            if data == original:
                retained[relative] = entry["hash"]
            else:
                changed[relative] = {"source_sha256": entry["hash"], "lite_sha256": hashlib.sha256(data).hexdigest()}
        logo = "config/fancymenu/assets/logo.png"
        files[logo] = (root / logo).read_bytes()
        if hashlib.sha256(files[logo]).hexdigest() != policy["logo_sha256"]:
            raise LiteError("Lite static logo changed")
        # Only graphical defaults change; all other settings and common files are source-owned.
        derived = copy.deepcopy(profile)
        derived["required_mods"] = dict(sorted(required_mods.items()))
        derived["required_indexed_files"] = sorted(files)
        # Mod metadata/direct JARs have their own installation checks.
        derived["required_indexed_files"] = [p for p in derived["required_indexed_files"] if not p.startswith("mods/") and not source_entries.get(p, {}).get("metafile")]
        derived["onboarding"] = {
            name: sha(protected_layout(files["config/fancymenu/customization/" + name].decode()))
            for name in profile["onboarding"]
        }
        derived["custom_gui_sha256"] = sha(files["config/fancymenu/custom_gui_screens.txt"].decode().replace("\r\n", "\n"))
        derived["source_snapshot"] = {"commit": commit, "retained": retained, "changed": changed, "excluded": sorted(excluded)}
        # Complete all reads before creating output. No existing directory is removed.
        auxiliary = {p: read(p) for p in set(RUNTIME_FILES.values()) | {
            "tools/prism/template/instance.cfg", "tools/prism/template/mmc-pack.json", ".packwizignore"
        }}
    finally:
        process.stdin.close()
        process.wait()
    output.mkdir(parents=True, exist_ok=False)
    for relative, data in (files | auxiliary).items():
        target = (output / safe_relative(relative)).resolve()
        if output not in target.parents:
            raise LiteError(f"Unsafe derived target: {relative}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    pack_text = pack_bytes.decode().replace("\r\n", "\n")
    pack_text, count = re.subn(r'^name = ".*"$', f'name = "{LITE_NAME}"', pack_text, count=1, flags=re.M)
    if count != 1:
        raise LiteError("Cannot set derived pack identity")
    (output / "pack.toml").write_text(pack_text, encoding="utf-8", newline="\n")
    (output / "index.toml").write_bytes(index_bytes)
    # Packwiz remains authoritative for generated hashes.
    subprocess.run(["packwiz", "refresh"], cwd=output, check=True)
    for relative, expected in retained.items():
        if hashlib.sha256((output / relative).read_bytes()).hexdigest() != expected:
            raise LiteError(f"Retained source content changed: {relative}")
    (output / "lite-contract.json").write_text(json.dumps(derived, indent=2) + "\n", encoding="utf-8", newline="\n")
    build_site(output, output / "_site", bootstrap, commit, generated_at,
               contract=derived, scan_repository=False)
    print(f"Derived Lite from {commit}: {len(retained)} unchanged files, {len(changed)} presentation changes, {len(excluded)} exclusions")
