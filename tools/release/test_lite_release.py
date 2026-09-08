"""Negative release tests against an isolated copy of the real Lite configuration."""
from pathlib import Path
import shutil
import tempfile
import unittest

from lite_rules import LiteError, validate_lite, validate_lite_instance

ROOT = Path(__file__).resolve().parents[2]


class LiteRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        parent = ROOT / ".tmp-validation"
        parent.mkdir(exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(prefix="lite-tests-", dir=parent)
        cls.root = Path(cls.temp.name).resolve()
        assert parent.resolve() in cls.root.parents
        for name in ("mods", "config/fancymenu", "config/defaultoptions", "resourcepacks"):
            shutil.copytree(ROOT / name, cls.root / name)
        shutil.copy2(ROOT / "index.toml", cls.root / "index.toml")

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def reject_change(self, relative, transform, message):
        path = self.root / relative
        original = path.read_bytes()
        try:
            path.write_bytes(transform(original))
            with self.assertRaisesRegex(LiteError, message):
                validate_lite(self.root)
        finally:
            path.write_bytes(original)

    def test_current_lite(self):
        self.assertEqual(validate_lite(self.root)["client_mods"], 23)

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
        self.reject_change("config/fancymenu/customization/nexus_class_selection_layout.txt", lambda b: b.replace(b"/nexus_select arcanist", b"/nexus_select invalid"), "Onboarding contract changed")

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
