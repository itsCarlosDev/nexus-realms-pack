"""Reproduce Lite PNGs from original Git assets; requires Pillow 12.0.0.

Example (from the repository root):
python tools/release/optimize_lite_images.py --source-ref e4f5566 --output dist/lite-images
The output directory must be new. No original files are changed.
"""
import argparse
import io
from pathlib import Path
import subprocess

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-ref", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    for name in ("background.png", "mage_expl.png", "mage_expl2.png", "metal_expl.png", "pistolero_expl.png", "warrior.png", "logo.gif"):
        relative = "config/fancymenu/assets/" + (name if name == "logo.gif" else "images/" + name)
        source = subprocess.check_output(["git", "show", f"{args.source_ref}:{relative}"])
        with Image.open(io.BytesIO(source)) as image:
            if name == "logo.gif":
                image.seek(100)
                image = image.convert("RGBA")
                name = "logo.png"
            else:
                image.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                if image.mode == "RGBA" and image.getextrema()[3] == (255, 255):
                    image = image.convert("RGB")
            image.save(args.output / name, format="PNG", optimize=True, compress_level=9)
            print(f"{name}: {image.size}, {(args.output / name).stat().st_size} bytes")


if __name__ == "__main__":
    main()
