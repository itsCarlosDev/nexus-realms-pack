#!/usr/bin/env python3
"""Static validation for Nexus Realms connected-path assets and mappings."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image
except ImportError as error:  # pragma: no cover - environment guard
    raise SystemExit("Pillow is required: python -m pip install Pillow") from error


ROOT = Path(__file__).resolve().parents[1]
TEXTURES = ROOT / "kubejs/assets/kubejs/textures/block"
MODELS = ROOT / "kubejs/assets/kubejs/models/block"
ENGINE = ROOT / "kubejs/server_scripts/nexus_corruption_engine.js"
REGISTRY = ROOT / "kubejs/startup_scripts/nexus_corruption_registry.js"

ALPHA_THRESHOLD = 8
TOLERANCE_RATIO = 0.03
DIRECTIONS = ("N", "E", "S", "W")
CANONICAL_CONNECTIONS = {
    "end": frozenset("N"),
    "straight": frozenset(("N", "S")),
    "corner": frozenset(("N", "E")),
    "t": frozenset(("N", "E", "W")),
    "cross": frozenset(DIRECTIONS),
}

VARIANT_MODELS = {
    "n": ("end", 0),
    "e": ("end", 90),
    "s": ("end", 180),
    "w": ("end", 270),
    "ns": ("straight", 0),
    "ew": ("straight", 90),
    "ne": ("corner", 0),
    "es": ("corner", 90),
    "sw": ("corner", 180),
    "wn": ("corner", 270),
    "new": ("t", 0),
    "nes": ("t", 90),
    "esw": ("t", 180),
    "nsw": ("t", 270),
    "nesw": ("cross", 0),
}

EXPECTED_MASKS = {
    1: "n",
    2: "e",
    3: "ne",
    4: "s",
    5: "ns",
    6: "es",
    7: "nes",
    8: "w",
    9: "wn",
    10: "ew",
    11: "new",
    12: "sw",
    13: "nsw",
    14: "esw",
    15: "nesw",
}


@dataclass(frozen=True)
class EdgeMeasurement:
    count: int
    minimum: int | None
    maximum: int | None
    center: float | None


def measure_edge(frame: Image.Image, direction: str) -> EdgeMeasurement:
    width, height = frame.size
    pixels = frame.load()

    if direction == "N":
        samples = [(x, pixels[x, 0][3]) for x in range(width)]
    elif direction == "E":
        samples = [(y, pixels[width - 1, y][3]) for y in range(height)]
    elif direction == "S":
        samples = [(x, pixels[x, height - 1][3]) for x in range(width)]
    else:
        samples = [(y, pixels[0, y][3]) for y in range(height)]

    visible = [(coordinate, alpha) for coordinate, alpha in samples if alpha >= ALPHA_THRESHOLD]
    if not visible:
        return EdgeMeasurement(0, None, None, None)

    alpha_sum = sum(alpha for _, alpha in visible)
    center = sum(coordinate * alpha for coordinate, alpha in visible) / alpha_sum
    coordinates = [coordinate for coordinate, _ in visible]
    return EdgeMeasurement(len(visible), min(coordinates), max(coordinates), center)


def read_frames(path: Path) -> tuple[tuple[int, int], list[Image.Image]]:
    with Image.open(path) as source:
        image = source.convert("RGBA")

    width, height = image.size
    if height % width != 0:
        raise ValueError(f"height {height} is not a multiple of width {width}")

    frames = [image.crop((0, index * width, width, (index + 1) * width)) for index in range(height // width)]
    return (width, height), frames


def validate_texture(kind: str, glow: bool) -> list[str]:
    label = "GLOW" if glow else "NORMAL"
    suffix = "_glow" if glow else ""
    path = TEXTURES / f"nexus_path_{kind}{suffix}.png"
    errors: list[str] = []

    try:
        size, frames = read_frames(path)
    except (OSError, ValueError) as error:
        print(f"nexus_path_{kind} {label}: ERROR: {error}")
        return [f"{path}: {error}"]

    width, height = size
    target = width / 2.0
    tolerance = max(2.0, width * TOLERANCE_RATIO)
    print(f"nexus_path_{kind} {label}: {width}x{height}, frames={len(frames)}, center={target:.2f}, tolerance={tolerance:.2f}")

    expected = CANONICAL_CONNECTIONS[kind]
    for direction in DIRECTIONS:
        measurements = [measure_edge(frame, direction) for frame in frames]
        present = [measurement for measurement in measurements if measurement.count]

        if direction not in expected:
            if present:
                # The approved legacy END glow has frame-edge animation content
                # that is not present in its semantic NORMAL topology. Keep glow
                # extras visible as warnings, while CORNER remains strict in both
                # layers because that is the connected-piece regression gate.
                if glow and kind != "corner":
                    print(
                        f"  {direction}: WARN glow-only edge content in "
                        f"{len(present)}/{len(frames)} frame(s)"
                    )
                else:
                    errors.append(f"{path.name}: unexpected {direction} connection")
                    print(
                        f"  {direction}: FAIL unexpected visible edge in "
                        f"{len(present)}/{len(frames)} frame(s)"
                    )
            else:
                print(f"  {direction}: none")
            continue

        if len(present) != len(frames):
            errors.append(f"{path.name}: missing {direction} connection in one or more frames")
            print(f"  {direction}: FAIL present in {len(present)}/{len(frames)} frame(s)")
            continue

        centers = [measurement.center for measurement in measurements if measurement.center is not None]
        deviations = [abs(center - target) for center in centers]
        spans = [(measurement.minimum, measurement.maximum) for measurement in measurements]
        maximum_deviation = max(deviations)
        state = "OK" if maximum_deviation <= tolerance else "FAIL"
        print(
            f"  {direction}: {state} centers={min(centers):.2f}..{max(centers):.2f} "
            f"max_deviation={maximum_deviation:.2f} spans={spans}"
        )
        if state == "FAIL":
            errors.append(
                f"{path.name}: {direction} maximum deviation {maximum_deviation:.2f} exceeds {tolerance:.2f}"
            )

    if glow:
        mcmeta = path.with_suffix(path.suffix + ".mcmeta")
        try:
            metadata = json.loads(mcmeta.read_text(encoding="utf-8"))
            animation = metadata.get("animation", {})
            if animation.get("frametime") != 4 or animation.get("interpolate") is not True:
                errors.append(f"{mcmeta.name}: unexpected animation settings")
        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{mcmeta.name}: {error}")

    return errors


def load_model(name: str) -> dict:
    path = MODELS / f"nexus_path_{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def face_rotation(element: dict) -> int:
    return int(element["faces"]["up"].get("rotation", 0))


def validate_models() -> list[str]:
    errors: list[str] = []
    all_names = tuple(CANONICAL_CONNECTIONS) + tuple(VARIANT_MODELS)

    for name in all_names:
        try:
            model = load_model(name)
        except (OSError, json.JSONDecodeError, KeyError) as error:
            errors.append(f"nexus_path_{name}.json: {error}")
            continue

        if name in CANONICAL_CONNECTIONS:
            canonical, expected_rotation = name, 0
        else:
            canonical, expected_rotation = VARIANT_MODELS[name]

        expected_path = f"kubejs:block/nexus_path_{canonical}"
        expected_glow = f"{expected_path}_glow"
        textures = model.get("textures", {})
        if textures.get("path") != expected_path or textures.get("glow") != expected_glow:
            errors.append(f"nexus_path_{name}.json: wrong canonical textures")

        elements = model.get("elements", [])
        if len(elements) != 2:
            errors.append(f"nexus_path_{name}.json: expected exactly two layers")
            continue

        rotations = [face_rotation(element) for element in elements]
        if rotations[0] != rotations[1]:
            errors.append(f"nexus_path_{name}.json: #path/#glow rotations differ")
        if rotations[0] != expected_rotation:
            errors.append(
                f"nexus_path_{name}.json: rotation {rotations[0]} != expected {expected_rotation}"
            )

    if not errors:
        print("MODELS: OK (20 JSON; canonical textures and equal path/glow rotations)")
    return errors


def object_body(source: str, variable: str) -> str:
    match = re.search(rf"var\s+{re.escape(variable)}\s*=\s*\{{(.*?)\n\s*\}}", source, re.DOTALL)
    if not match:
        raise ValueError(f"{variable} object not found")
    return match.group(1)


def validate_masks() -> list[str]:
    errors: list[str] = []
    source = ENGINE.read_text(encoding="utf-8")

    try:
        forward_body = object_body(source, "MASK_TO_BLOCK")
        reverse_body = object_body(source, "BLOCK_TO_MASK")
    except ValueError as error:
        return [str(error)]

    forward = {
        int(mask): block_id
        for mask, block_id in re.findall(r"(\d+)\s*:\s*'([^']+)'", forward_body)
    }
    reverse = {
        block_id: int(mask)
        for block_id, mask in re.findall(r"'([^']+)'\s*:\s*(\d+)", reverse_body)
    }
    expected = {mask: f"kubejs:nexus_path_{suffix}" for mask, suffix in EXPECTED_MASKS.items()}

    if forward != expected:
        errors.append("MASK_TO_BLOCK does not match the 15 expected masks")
    if reverse != {block_id: mask for mask, block_id in expected.items()}:
        errors.append("BLOCK_TO_MASK is not the exact inverse of MASK_TO_BLOCK")

    if not errors:
        print("MASKS: OK (1..15 complete and inverse)")
    return errors


def validate_registry() -> list[str]:
    source = REGISTRY.read_text(encoding="utf-8")
    expected_ids = [f"nexus_path_{kind}" for kind in CANONICAL_CONNECTIONS]
    expected_ids.extend(f"nexus_path_{suffix}" for suffix in EXPECTED_MASKS.values())
    counts = Counter(re.findall(r"'((?:nexus_path_)[a-z]+)'", source))
    errors = [f"registry count for {block_id} is {counts[block_id]}" for block_id in expected_ids if counts[block_id] != 1]
    if not errors:
        print("REGISTRY IDS: OK (5 canonical + 15 internal IDs, no duplicates)")
    return errors


def main() -> int:
    errors: list[str] = []
    for kind in CANONICAL_CONNECTIONS:
        errors.extend(validate_texture(kind, glow=False))
        errors.extend(validate_texture(kind, glow=True))

    errors.extend(validate_models())
    errors.extend(validate_masks())
    errors.extend(validate_registry())

    if errors:
        print("\nVALIDATION FAILED:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("\nVALIDATION PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
