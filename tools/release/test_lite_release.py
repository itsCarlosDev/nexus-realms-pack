"""Negative release tests against an isolated copy of the real Lite configuration."""
from pathlib import Path
import io
import hashlib
import json
import os
import re
import shutil
import tempfile
import tomllib
import unittest
import zipfile

from lite_rules import CONTRACT as BASE_CONTRACT, LiteError, validate_lite as check_lite, validate_lite_instance
from pack_release import ReleaseError, safe_relative, validate_prism_components, validate_prism_payload
from derive_lite import derive_lite, static_layout
from lite_rules import protected_layout

ROOT = Path(os.environ.get("NEXUS_LITE_TEST_ROOT", Path(__file__).resolve().parents[2])).resolve()
CONTRACT = ROOT / "lite-contract.json" if "NEXUS_LITE_TEST_ROOT" in os.environ else BASE_CONTRACT


def validate_lite(root):
    return check_lite(root, json.loads(CONTRACT.read_text("utf-8")))


class LiteRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        parent = ROOT / ".tmp-validation"
        parent.mkdir(exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(prefix="lite-tests-", dir=parent)
        cls.root = Path(cls.temp.name).resolve()
        assert parent.resolve() in cls.root.parents
        # Copy only distributed content, never the developer's build/runtime files.
        for entry in tomllib.loads((ROOT / "index.toml").read_text("utf-8"))["files"]:
            relative = safe_relative(entry["file"])
            source = (ROOT / relative).resolve()
            destination = (cls.root / relative).resolve()
            if ROOT not in source.parents or cls.root not in destination.parents:
                raise ReleaseError(f"Unsafe test fixture path: {entry['file']}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        shutil.copy2(ROOT / "index.toml", cls.root / "index.toml")

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def reject_change(self, relative, transform, message):
        path = self.root / relative
        original = path.read_bytes()
        try:
            changed = transform(original)
            self.assertNotEqual(changed, original, "Regression test did not change its fixture")
            path.write_bytes(changed)
            with self.assertRaisesRegex(LiteError, message):
                # Exercise the specific rule without the derived byte snapshot
                # short-circuiting it; snapshot integrity has a separate test.
                contract = json.loads(CONTRACT.read_text("utf-8"))
                contract.pop("source_snapshot", None)
                check_lite(self.root, contract)
        finally:
            path.write_bytes(original)

    def test_current_lite(self):
        metrics = validate_lite(self.root)
        contract = json.loads(CONTRACT.read_text("utf-8"))
        self.assertLessEqual(metrics["asset_bytes"], contract["asset_budget_bytes"])

    def test_derived_source_bytes_are_protected(self):
        relative = "kubejs/server_scripts/nexus_class_selection.js"
        path = self.root / relative
        original = path.read_bytes()
        contract = json.loads(CONTRACT.read_text("utf-8"))
        contract["source_snapshot"] = {"retained": {relative: hashlib.sha256(original).hexdigest()}}
        try:
            path.write_bytes(original + b"\n// changed\n")
            with self.assertRaisesRegex(LiteError, "differs from source contract"):
                check_lite(self.root, contract)
        finally:
            path.write_bytes(original)

    def test_static_derivation_keeps_source_actions(self):
        source = ('menu_background {\n  background_type = video\n  show_background = true\n}\n'
                  'menu_background {\n  background_type = image\n  show_background = false\n  slide = false\n}\n'
                  'layout_action_executable_blocks {\n  [action_type:opengui] = warrior_expl\n}\n')
        result = static_layout(source)
        self.assertEqual(protected_layout(source), protected_layout(result))
        self.assertNotIn("background_type = video", result)
        self.assertIn("image_path = [source:local]/config/fancymenu/assets/images/background.png", result)

    def test_derivation_refuses_existing_or_non_dist_output(self):
        for output in (ROOT, self.root):
            with self.subTest(output=output), self.assertRaisesRegex(LiteError, "NEW directory"):
                derive_lite(ROOT, "dev", output, Path("unused-bootstrap"), "unused-timestamp")

    def test_every_required_mod_is_installed(self):
        contract = json.loads(CONTRACT.read_text("utf-8"))
        contract.pop("source_snapshot", None)
        for name in contract["required_mods"]:
            with self.subTest(mod=name):
                path = self.root / "mods" / name
                data = path.read_bytes()
                try:
                    path.unlink()
                    with self.assertRaisesRegex(LiteError, "Missing essential Lite mod"):
                        check_lite(self.root, contract)
                finally:
                    path.write_bytes(data)

    def test_required_mod_side(self):
        self.reject_change("mods/epic-fight-mod.pw.toml", lambda b: b.replace(b'side = "both"', b'side = "server"'), "Lite mod side changed")

    def test_required_mod_optional(self):
        self.reject_change("mods/epic-fight-mod.pw.toml", lambda b: b + b'\n[option]\noptional = true\n', "cannot be optional")

    def test_required_mod_metafile_flag(self):
        self.reject_change("index.toml", lambda b: re.sub(rb'(file = "mods/epic-fight-mod.pw.toml"[^\[]*?)metafile = true', rb'\1metafile = false', b), "must be indexed as metadata")

    def test_index_cannot_override_mod_side(self):
        self.reject_change("index.toml", lambda b: b.replace(b'file = "mods/epic-fight-mod.pw.toml"', b'file = "mods/epic-fight-mod.pw.toml"\nside = "server"'), "side belongs in its metadata")

    def test_required_content_unindexed(self):
        self.reject_change("index.toml", lambda b: b.replace(b'file = "kubejs/server_scripts/nexus_class_selection.js"', b'file = "kubejs/server_scripts/missing.js"'), "Missing required Lite content")

    def test_nexus_core_missing(self):
        path = next((self.root / "mods").glob("nexus-core-*.jar"))
        original = path.read_bytes()
        try:
            path.unlink()
            with self.assertRaisesRegex(LiteError, "Missing essential direct Lite mod: nexuscore"):
                contract = json.loads(CONTRACT.read_text("utf-8"))
                contract.pop("source_snapshot", None)
                check_lite(self.root, contract)
        finally:
            path.write_bytes(original)

    def test_graphics_defaults(self):
        contract = json.loads(CONTRACT.read_text("utf-8"))
        for key, value in contract["default_options"].items():
            with self.subTest(option=key):
                old = f"{key}:{value}".encode()
                self.reject_change("config/defaultoptions/options.txt", lambda b: b.replace(old, f"{key}:invalid".encode()), "Lite default option")

    def test_duplicate_default(self):
        self.reject_change("config/defaultoptions/options.txt", lambda b: b + b'\nmaxFps:250\n', "Duplicate Lite default option")

    def test_required_builtin_resource_pack(self):
        self.reject_change("config/defaultoptions/options.txt", lambda b: b.replace(b'"tacz_resources",', b''), "Required Lite resource pack order")

    def test_prism_versions(self):
        pack = tomllib.loads((ROOT / "pack.toml").read_text("utf-8"))
        data = (ROOT / "tools/prism/template/mmc-pack.json").read_bytes()
        validate_prism_components(data, pack)
        for old, new in ((b'1.20.1', b'1.21.1'), (b'47.4.10', b'47.4.0')):
            with self.subTest(version=old), self.assertRaises(ReleaseError):
                validate_prism_components(data.replace(old, new), pack)

    def test_embedded_bootstrap_hash(self):
        pack = tomllib.loads((ROOT / "pack.toml").read_text("utf-8"))
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("mmc-pack.json", (ROOT / "tools/prism/template/mmc-pack.json").read_bytes())
            archive.writestr("minecraft/packwiz-installer-bootstrap.jar", b"wrong bootstrap")
        with zipfile.ZipFile(buffer) as archive, self.assertRaisesRegex(ReleaseError, "unexpected Packwiz bootstrap"):
            validate_prism_payload(archive, pack)

    def test_removed_mod_under_renamed_metadata(self):
        self.reject_change("mods/appleskin.pw.toml", lambda b: b.replace(b'AppleSkin', b'Oculus'), "Forbidden Lite mod")

    def test_unmanaged_forbidden_jar(self):
        path = self.root / "mods/Oculus-accidental.jar"
        try:
            path.write_bytes(b"not a real jar")
            with self.assertRaisesRegex(LiteError, "Forbidden direct Lite JAR"):
                validate_lite(self.root)
        finally:
            path.unlink()

    def test_video_returns(self):
        self.reject_change("config/fancymenu/customization/title_screen_layout.txt", lambda b: b + b'\nmenu_background {\n  background_type = video\n  show_background = true\n}\n', "Multimedia consumer")

    def test_missing_static_asset(self):
        self.reject_change("config/fancymenu/customization/title_screen_layout.txt", lambda b: b.replace(b"/assets/logo.png", b"/assets/missing.png"), "Missing/unsafe FancyMenu asset")

    def test_old_gif_reference(self):
        self.reject_change("config/fancymenu/customization/title_screen_layout.txt", lambda b: b.replace(b"/assets/logo.png", b"/assets/logo.gif"), "Multimedia consumer")

    def test_class_action_changed(self):
        self.reject_change("config/fancymenu/customization/nexus_class_selection_layout.txt", lambda b: b.replace(b"[action_type:opengui] = warrior_expl", b"[action_type:opengui] = invalid"), "Onboarding contract changed")

    def test_asset_budget(self):
        path = self.root / "config/fancymenu/assets/accidental.bin"
        try:
            with path.open("wb") as stream:
                stream.truncate(21_000_001)
            with self.assertRaisesRegex(LiteError, "exceed Lite budget"):
                validate_lite(self.root)
        finally:
            path.unlink()

    def test_orphan_controller(self):
        self.reject_change("config/fancymenu/video_element_controller_metas.json", lambda b: b'[{"element_identifier":"old-video"}]', "Orphan video")

    def test_watermedia_consumer(self):
        self.reject_change("config/fancymenu/options.txt", lambda b: b + b'\nwatermedia_consumer = active\n', "Watermedia consumer")

    def test_prism_policy(self):
        data = (ROOT / "tools/prism/template/instance.cfg").read_bytes().replace(b"name=Nexus Realms", b"name=Nexus Realms Lite").replace(b"nexus-realms-pack/pack.toml", b"nexus-realms-pack/lite/pack.toml")
        validate_lite_instance(data)
        for changed in (data.replace(b"/lite/pack.toml", b"/pack.toml"), data.replace(b"AutomaticJava=true", b"AutomaticJava=false"), data + b"\nMaxMemAlloc=8192\n"):
            with self.assertRaises(LiteError):
                validate_lite_instance(changed)


if __name__ == "__main__":
    unittest.main()
