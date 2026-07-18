#!/usr/bin/env python3
"""Generate and audit Nexus Market V6 schematics from verified local assets.

The generator intentionally keeps DecoCraft in a separate air-heavy overlay.
It uses no entities and no block entities. V4 and V5 files are hash-guarded
and are never opened for writing.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import math
import os
import struct
import sys
import zipfile
import zlib
from collections import Counter, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Iterator

try:
    from PIL import Image, ImageDraw
except ImportError:  # The local audit must remain runnable without downloads.
    Image = None
    ImageDraw = None


WIDTH, HEIGHT, LENGTH = 181, 73, 151
DATA_VERSION = 3465
OFFSET = [-8468, 67, -4935]
WE_OFFSET = [-15, 0, -50]
AIR = "minecraft:air"
GROUND_Y = 10
NEXUS_CENTER = (90, 75)

V4_HASHES = {
    "nexus_market_spawn_nexus_realms_v4.schem": "adfd40b53db4a543e32248541427449f52e102ebb920e88bc1cb7d4084de2b2c",
    "nexus_market_spawn_nexus_realms_v4_base.schem": "a5e187bad7f36ae3f2b93dbdc86dfafe709f97248c23b6725806e1fc0cbaaadf",
    "nexus_market_spawn_nexus_realms_v4_decocraft.schem": "7ca2becc6d968b6857f18922e7f9a60457b30a19bdbd73a808e87c9b68b2ed14",
}

V5_HASHES = {
    "nexus_market_spawn_nexus_realms_v5.schem": "b167b4c5639235e7942bf9b4a5f43bc045e02c53a88e0df0f1ae59d3db748db6",
    "nexus_market_spawn_nexus_realms_v5_base.schem": "a66d7d4eb2b44ba913bff53f023c730a0d9c8e37be00f70033db820894214e2d",
    "nexus_market_spawn_nexus_realms_v5_decocraft.schem": "4e0e92fb61fc4fb8b93e6796d0935c81b877c5147f0cdf997dc008a9f443f16c",
}

SAFE_DECOCRAFT_IDS = {
    "backpack_green", "baguette_basket", "barrel_apples_mix", "barrel_carrots",
    "crystal_ball", "display_counter_bottom_oak", "display_counter_top_pastries",
    "filing_cabinet_spruce", "fruit_cart", "globe", "globe_antique",
    "grandfather_clock", "hanging_armorer", "hanging_camping", "hanging_magic",
    "hanging_produce", "hanging_shield", "hanging_swords",
    "modular_desk_plank_spruce", "office_chair_spruce", "paper_lantern_1_cream",
    "stained_glass_chandelier_embers_on", "stained_glass_hanging_lamp_embers_on",
    "stained_glass_sconce_embers_on", "stained_glass_table_lamp_embers_on",
    "trainingdummy", "typewriter_black", "vintage_cash_register", "world_map",
}

BROKEN_DECOCRAFT_IDS = {
    "china_cabinet_open_birch", "china_cabinet_open_black", "china_cabinet_open_cherry",
    "china_cabinet_open_ebony", "china_cabinet_open_oak", "china_cabinet_open_palm",
    "china_cabinet_open_spruce", "china_cabinet_open_white", "laptop_closed_black",
    "laptop_closed_pink", "laptop_closed_silver", "picnic_basket", "picnic_basket_closed",
    "school_desk_open_black", "school_desk_open_blue", "school_desk_open_cyan",
    "school_desk_open_gray", "school_desk_open_green", "school_desk_open_light_blue",
    "school_desk_open_light_gray", "school_desk_open_lime", "school_desk_open_magenta",
    "school_desk_open_orange", "school_desk_open_pink", "school_desk_open_purple",
    "school_desk_open_red", "school_desk_open_white", "school_desk_open_yellow",
}

NPC_POSITIONS = [
    {"id": "nexus_custodian", "name": "Custodio del Nexus", "pos": [90, 12, 18], "facing": "south", "zone": "Ayuntamiento / hall"},
    {"id": "chronicler", "name": "Cronista", "pos": [70, 12, 21], "facing": "east", "zone": "Ayuntamiento / archivo"},
    {"id": "guard_captain", "name": "Capitán de la Guardia", "pos": [110, 12, 21], "facing": "west", "zone": "Ayuntamiento / táctica"},
    {"id": "warrior_master", "name": "Maestro Guerrero", "pos": [26, 12, 38], "facing": "south", "zone": "Gremio Guerrero"},
    {"id": "arcane_master", "name": "Maestro Arcanista", "pos": [70, 12, 127], "facing": "east", "zone": "Biblioteca Arcanista"},
    {"id": "metallurgist_master", "name": "Maestro Metalomante", "pos": [120, 12, 133], "facing": "north", "zone": "Taller Metalomante"},
    {"id": "gunsmith", "name": "Armero", "pos": [156, 12, 125], "facing": "west", "zone": "Armería Pistolero"},
    {"id": "explorer", "name": "Explorador", "pos": [146, 12, 48], "facing": "west", "zone": "Lodge Explorador"},
    {"id": "nexus_merchant", "name": "Mercader del Nexus", "pos": [126, 11, 85], "facing": "west", "zone": "Mercado este"},
]


def state(block: str, **props: Any) -> str:
    if not props:
        return block
    values = ",".join(f"{k}={str(v).lower()}" for k, v in sorted(props.items()))
    return f"{block}[{values}]"


def stair(block: str, facing: str, half: str = "bottom") -> str:
    return state(block, facing=facing, half=half, shape="straight", waterlogged=False)


def slab(block: str, slab_type: str = "bottom") -> str:
    return state(block, type=slab_type, waterlogged=False)


def log(block: str, axis: str = "y") -> str:
    return state(block, axis=axis)


def lantern(soul: bool = False, hanging: bool = False) -> str:
    return state("minecraft:soul_lantern" if soul else "minecraft:lantern",
                 hanging=hanging, waterlogged=False)


def chain(axis: str = "y") -> str:
    return state("minecraft:chain", axis=axis, waterlogged=False)


def door_state(block: str, facing: str, half: str, hinge: str) -> str:
    return state(block, facing=facing, half=half, hinge=hinge, open=False, powered=False)


def trapdoor(block: str, facing: str, half: str = "bottom", open_: bool = False) -> str:
    return state(block, facing=facing, half=half, open=open_, powered=False, waterlogged=False)


def support(material: str, facing: str) -> str:
    return state(f"createdeco:{material}_support", facing=facing, waterlogged=False)


def sheet(material: str, axis: str = "y") -> str:
    return state(f"createdeco:{material}_sheet_metal", axis=axis)


def deco_lamp(color: str, metal: str, facing: str = "down") -> str:
    return state(f"createdeco:{color}_{metal}_lamp", facing=facing,
                 inverted=False, lit=True, waterlogged=False)


def deco(prop: str, facing: str = "north") -> str:
    if prop not in SAFE_DECOCRAFT_IDS:
        raise ValueError(f"Unsafe DecoCraft ID requested: {prop}")
    return state(f"decocraft:{prop}", facing=facing)


@dataclass
class RoofSection:
    name: str
    x1: int
    x2: int
    z1: int
    z2: int
    min_y: int
    excluded: set[tuple[int, int]] = field(default_factory=set)


@dataclass
class Building:
    name: str
    footprint: tuple[int, int, int, int]
    category: str


class World:
    def __init__(self, name: str):
        self.name = name
        self.blocks: dict[tuple[int, int, int], str] = {}
        self.roles: dict[tuple[int, int, int], str] = {}
        self.roofs: list[RoofSection] = []
        self.buildings: list[Building] = []
        self.road_cells: set[tuple[int, int]] = set()
        self.road_anchors: dict[str, tuple[int, int]] = {}
        self.nexus_cells: set[tuple[int, int]] = set()

    def inside(self, x: int, y: int, z: int) -> bool:
        return 0 <= x < WIDTH and 0 <= y < HEIGHT and 0 <= z < LENGTH

    def set(self, x: int, y: int, z: int, block: str, role: str = "structure") -> None:
        if not self.inside(x, y, z):
            raise IndexError(f"Out of bounds: {(x, y, z)} -> {block}")
        pos = (x, y, z)
        if block == AIR:
            self.blocks.pop(pos, None)
            self.roles.pop(pos, None)
        else:
            self.blocks[pos] = block
            self.roles[pos] = role

    def get(self, x: int, y: int, z: int) -> str:
        return self.blocks.get((x, y, z), AIR)

    def remove(self, x: int, y: int, z: int) -> None:
        self.set(x, y, z, AIR)

    def fill(self, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int,
             block: str, role: str = "structure") -> None:
        xa, xb = sorted((x1, x2)); ya, yb = sorted((y1, y2)); za, zb = sorted((z1, z2))
        for y in range(ya, yb + 1):
            for z in range(za, zb + 1):
                for x in range(xa, xb + 1):
                    self.set(x, y, z, block, role)

    def hollow_box(self, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int,
                   block: str, role: str = "structure") -> None:
        for y in range(y1, y2 + 1):
            for z in range(z1, z2 + 1):
                for x in range(x1, x2 + 1):
                    if x in (x1, x2) or y in (y1, y2) or z in (z1, z2):
                        self.set(x, y, z, block, role)

    def vertical(self, x: int, z: int, y1: int, y2: int, block: str,
                 role: str = "structure") -> None:
        self.fill(x, y1, z, x, y2, z, block, role)

    def add_building(self, name: str, footprint: tuple[int, int, int, int], category: str) -> None:
        self.buildings.append(Building(name, footprint, category))


def merge_shifted(dst: World, src: World, dx: int = 0, dy: int = 0, dz: int = 0) -> None:
    """Merge a complete district while translating blocks and audit metadata."""
    for (x, y, z), block in src.blocks.items():
        dst.set(x + dx, y + dy, z + dz, block, src.roles[(x, y, z)])
    dst.roofs.extend(
        RoofSection(r.name, r.x1 + dx, r.x2 + dx, r.z1 + dz, r.z2 + dz,
                    r.min_y + dy, {(x + dx, z + dz) for x, z in r.excluded})
        for r in src.roofs
    )
    dst.buildings.extend(
        Building(b.name,
                 (b.footprint[0] + dx, b.footprint[1] + dx,
                  b.footprint[2] + dz, b.footprint[3] + dz), b.category)
        for b in src.buildings
    )
    dst.road_cells.update((x + dx, z + dz) for x, z in src.road_cells)
    dst.road_anchors.update({name: (x + dx, z + dz) for name, (x, z) in src.road_anchors.items()})
    dst.nexus_cells.update((x + dx, z + dz) for x, z in src.nexus_cells)


def _inside_rounded_plateau(x: int, z: int, inset: int, radius: int = 14) -> bool:
    left, right = inset, WIDTH - 1 - inset
    top, bottom = inset, LENGTH - 1 - inset
    if not (left <= x <= right and top <= z <= bottom):
        return False
    cx = left + radius if x < left + radius else right - radius if x > right - radius else x
    cz = top + radius if z < top + radius else bottom - radius if z > bottom - radius else z
    return (x - cx) ** 2 + (z - cz) ** 2 <= radius ** 2


def build_foundation(w: World) -> None:
    """Create a deep, rounded terrain plate so no district depends on world terrain."""
    for y in range(GROUND_Y):
        inset = 3 + (y * 5 // max(1, GROUND_Y - 1))
        for z in range(inset, LENGTH - inset):
            for x in range(inset, WIDTH - inset):
                if not _inside_rounded_plateau(x, z, inset):
                    continue
                n = (x * 13 + z * 29 + y * 7 + x * z) % 31
                if y >= GROUND_Y - 2:
                    block = "minecraft:dirt" if n else "minecraft:coarse_dirt"
                elif y >= 5:
                    block = "minecraft:stone" if n % 5 else "minecraft:tuff"
                else:
                    block = "minecraft:deepslate" if n % 7 else "minecraft:cobbled_deepslate"
                w.set(x, y, z, block, "terrain_foundation")
    top_inset = 8
    for z in range(top_inset, LENGTH - top_inset):
        for x in range(top_inset, WIDTH - top_inset):
            if _inside_rounded_plateau(x, z, top_inset):
                block = "minecraft:grass_block" if (x * 17 + z * 11) % 23 else "minecraft:coarse_dirt"
                w.set(x, GROUND_Y, z, block, "terrain_surface")


def patterned_stone(x: int, z: int) -> str:
    n = (x * 37 + z * 19 + x * z * 3) % 29
    if n == 0:
        return "minecraft:mossy_stone_bricks"
    if n in (1, 2):
        return "minecraft:cracked_stone_bricks"
    if n in (3, 4, 5):
        return "minecraft:andesite"
    return "minecraft:stone_bricks"


def road_rect(w: World, x1: int, z1: int, x2: int, z2: int) -> None:
    for z in range(z1, z2 + 1):
        for x in range(x1, x2 + 1):
            w.set(x, 0, z, patterned_stone(x, z), "road")
            w.road_cells.add((x, z))


def bresenham(a: tuple[int, int], b: tuple[int, int]) -> Iterator[tuple[int, int]]:
    x1, z1 = a; x2, z2 = b
    dx = abs(x2 - x1); dz = abs(z2 - z1)
    sx = 1 if x1 < x2 else -1; sz = 1 if z1 < z2 else -1
    err = dx - dz
    while True:
        yield x1, z1
        if (x1, z1) == (x2, z2):
            break
        e2 = 2 * err
        if e2 > -dz:
            err -= dz; x1 += sx
        if e2 < dx:
            err += dx; z1 += sz


def road_line(w: World, a: tuple[int, int], b: tuple[int, int], radius: int = 2) -> None:
    for cx, cz in bresenham(a, b):
        for dz in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if dx * dx + dz * dz <= radius * radius + 1:
                    x, z = cx + dx, cz + dz
                    if 0 <= x < WIDTH and 0 <= z < LENGTH:
                        w.set(x, 0, z, patterned_stone(x, z), "road")
                        w.road_cells.add((x, z))


def disk(w: World, cx: int, cz: int, radius: int, y: int, block: str,
         role: str = "structure", inner: float = -1) -> None:
    for z in range(cz - radius, cz + radius + 1):
        for x in range(cx - radius, cx + radius + 1):
            d = math.hypot(x - cx, z - cz)
            if inner <= d <= radius + 0.25:
                w.set(x, y, z, block, role)


def place_double_door(w: World, x: int, y: int, z: int, facing: str,
                      along: str = "x", block: str = "minecraft:dark_oak_door") -> None:
    positions = [(x, z), (x + 1, z)] if along == "x" else [(x, z), (x, z + 1)]
    # Hinges are placed on the outside edges of the pair. The apparent left
    # side reverses with the facing direction; using one fixed pair made the
    # south and west Town Hall doors fold into each other in-game.
    normal_hinges = ("left", "right")
    hinges = normal_hinges if facing in ({"north"} if along == "x" else {"east"}) else tuple(reversed(normal_hinges))
    for (px, pz), hinge in zip(positions, hinges):
        w.set(px, y, pz, door_state(block, facing, "lower", hinge), "door")
        w.set(px, y + 1, pz, door_state(block, facing, "upper", hinge), "door")


def pressure_plate(block: str = "minecraft:polished_blackstone_pressure_plate") -> str:
    return state(block, powered=False)


def gabled_building(
    w: World, name: str, x1: int, z1: int, x2: int, z2: int, wall_top: int,
    ridge_axis: str = "x", wall: str = "minecraft:stone_bricks",
    upper: str = "minecraft:calcite", timber: str = "minecraft:stripped_dark_oak_log",
    roof_stair: str = "minecraft:dark_oak_stairs", roof_block: str = "minecraft:dark_oak_planks",
    floor: str = "minecraft:spruce_planks", category: str = "secondary",
) -> None:
    w.add_building(name, (x1, x2, z1, z2), category)
    w.fill(x1, 1, z1, x2, 1, z2, floor, "floor")
    # Solid foundations and layered envelope.
    for y in range(2, wall_top + 1):
        material = wall if y <= 3 else upper
        for x in range(x1, x2 + 1):
            w.set(x, y, z1, material, "wall"); w.set(x, y, z2, material, "wall")
        for z in range(z1, z2 + 1):
            w.set(x1, y, z, material, "wall"); w.set(x2, y, z, material, "wall")
    # Corner posts, rhythmic bays, and a continuous upper ring beam.
    for x in (x1, x2):
        for z in (z1, z2):
            w.vertical(x, z, 2, wall_top, log(timber), "beam")
    if ridge_axis == "x":
        for x in range(x1 + 5, x2, 5):
            w.vertical(x, z1, 4, wall_top, log(timber), "beam")
            w.vertical(x, z2, 4, wall_top, log(timber), "beam")
        for x in range(x1, x2 + 1):
            w.set(x, 6 if wall_top >= 7 else wall_top, z1, log(timber, "x"), "beam")
            w.set(x, 6 if wall_top >= 7 else wall_top, z2, log(timber, "x"), "beam")
    else:
        for z in range(z1 + 5, z2, 5):
            w.vertical(x1, z, 4, wall_top, log(timber), "beam")
            w.vertical(x2, z, 4, wall_top, log(timber), "beam")
        for z in range(z1, z2 + 1):
            w.set(x1, 6 if wall_top >= 7 else wall_top, z, log(timber, "z"), "beam")
            w.set(x2, 6 if wall_top >= 7 else wall_top, z, log(timber, "z"), "beam")
    # Roof surface: every footprint column has a roof block above it.
    if ridge_axis == "x":
        lo, hi = z1 - 1, z2 + 1; mid = (lo + hi) / 2
        roof_y: dict[int, int] = {}
        for z in range(lo, hi + 1):
            d = min(z - lo, hi - z)
            y = wall_top + 1 + d
            roof_y[z] = y
            facing = "south" if z < mid else "north"
            mat = roof_block if abs(z - mid) < 0.75 else stair(roof_stair, facing)
            for x in range(x1 - 1, x2 + 2):
                w.set(x, y, z, mat, "roof")
        for x in (x1, x2):
            for z in range(z1 + 1, z2):
                for y in range(wall_top + 1, roof_y[z]):
                    w.set(x, y, z, upper, "gable")
                if z % 4 == 0:
                    w.set(x, max(wall_top + 1, roof_y[z] - 1), z, log(timber, "z"), "beam")
        # Fascias and sparse full triangular trusses make every stepped roof
        # course physically part of a grounded load path.
        w.fill(x1 - 1, wall_top, lo, x2 + 1, wall_top, lo, log(timber, "x"), "roof_support")
        w.fill(x1 - 1, wall_top, hi, x2 + 1, wall_top, hi, log(timber, "x"), "roof_support")
        trusses = sorted(set([x1, x2, *range(x1 + 4, x2, 6)]))
        for tx in trusses:
            for z in range(z1, z2 + 1):
                for y in range(wall_top + 1, roof_y[z]):
                    w.set(tx, y, z, log(timber), "roof_support")
        for tx in range(x1 + 4, x2, 6):
            w.fill(tx, wall_top, z1, tx, wall_top, z2, log(timber, "z"), "tie_beam")
        w.roofs.append(RoofSection(name, x1, x2, z1, z2, wall_top + 1))
    else:
        lo, hi = x1 - 1, x2 + 1; mid = (lo + hi) / 2
        roof_y: dict[int, int] = {}
        for x in range(lo, hi + 1):
            d = min(x - lo, hi - x)
            y = wall_top + 1 + d
            roof_y[x] = y
            facing = "east" if x < mid else "west"
            mat = roof_block if abs(x - mid) < 0.75 else stair(roof_stair, facing)
            for z in range(z1 - 1, z2 + 2):
                w.set(x, y, z, mat, "roof")
        for z in (z1, z2):
            for x in range(x1 + 1, x2):
                for y in range(wall_top + 1, roof_y[x]):
                    w.set(x, y, z, upper, "gable")
                if x % 4 == 0:
                    w.set(x, max(wall_top + 1, roof_y[x] - 1), z, log(timber, "x"), "beam")
        w.fill(lo, wall_top, z1 - 1, lo, wall_top, z2 + 1, log(timber, "z"), "roof_support")
        w.fill(hi, wall_top, z1 - 1, hi, wall_top, z2 + 1, log(timber, "z"), "roof_support")
        trusses = sorted(set([z1, z2, *range(z1 + 4, z2, 6)]))
        for tz in trusses:
            for x in range(x1, x2 + 1):
                for y in range(wall_top + 1, roof_y[x]):
                    w.set(x, y, tz, log(timber), "roof_support")
        for tz in range(z1 + 4, z2, 6):
            w.fill(x1, wall_top, tz, x2, wall_top, tz, log(timber, "x"), "tie_beam")
        w.roofs.append(RoofSection(name, x1, x2, z1, z2, wall_top + 1))


def pyramid_roof(w: World, name: str, x1: int, z1: int, x2: int, z2: int,
                 base_y: int, block: str = "minecraft:deepslate_tiles") -> None:
    level = 0
    xa, xb, za, zb = x1 - 1, x2 + 1, z1 - 1, z2 + 1
    while xa <= xb and za <= zb:
        y = base_y + level
        # A filled stepped course gives the tower a genuinely closed cap and
        # supports the next inset course vertically.
        w.fill(xa, y, za, xb, y, zb, block, "roof")
        xa += 1; xb -= 1; za += 1; zb -= 1; level += 1
    w.roofs.append(RoofSection(name, x1, x2, z1, z2, base_y))


def add_windows(w: World, x1: int, z1: int, x2: int, z2: int, wall_top: int,
                glass: str = "minecraft:light_blue_stained_glass") -> None:
    # Windows are recessed between structural bays on all four elevations.
    for x in range(x1 + 3, x2 - 1, 5):
        for z in (z1, z2):
            if w.get(x, 4, z) != AIR:
                w.set(x, 4, z, glass, "window"); w.set(x, 5, z, glass, "window")
                for sx in (x - 1, x + 1):
                    w.set(sx, 4, z, log("minecraft:stripped_dark_oak_log"), "window_frame")
                    w.set(sx, 5, z, log("minecraft:stripped_dark_oak_log"), "window_frame")
                outside = z - 1 if z == z1 else z + 1
                outward = "north" if z == z1 else "south"
                w.set(x, 3, outside, slab("minecraft:stone_brick_slab", "top"), "window_sill")
                for sx, shutter_facing in ((x - 1, "west"), (x + 1, "east")):
                    w.set(sx, 4, outside, trapdoor("minecraft:dark_oak_trapdoor", shutter_facing, "bottom", True), "shutter")
                    w.set(sx, 5, outside, trapdoor("minecraft:dark_oak_trapdoor", shutter_facing, "top", True), "shutter")
    for z in range(z1 + 3, z2 - 1, 5):
        for x in (x1, x2):
            if w.get(x, 4, z) != AIR:
                w.set(x, 4, z, glass, "window"); w.set(x, 5, z, glass, "window")
                for sz in (z - 1, z + 1):
                    w.set(x, 4, sz, log("minecraft:stripped_dark_oak_log"), "window_frame")
                    w.set(x, 5, sz, log("minecraft:stripped_dark_oak_log"), "window_frame")
                outside = x - 1 if x == x1 else x + 1
                w.set(outside, 3, z, slab("minecraft:stone_brick_slab", "top"), "window_sill")
                for sz, shutter_facing in ((z - 1, "north"), (z + 1, "south")):
                    w.set(outside, 4, sz, trapdoor("minecraft:dark_oak_trapdoor", shutter_facing, "bottom", True), "shutter")
                    w.set(outside, 5, sz, trapdoor("minecraft:dark_oak_trapdoor", shutter_facing, "top", True), "shutter")


def chimney(w: World, x: int, z: int, y1: int, y2: int) -> None:
    w.fill(x, y1, z, x + 1, y2, z + 1, "minecraft:bricks", "chimney")
    w.fill(x - 1, y2, z - 1, x + 2, y2, z + 2, slab("minecraft:brick_slab", "top"), "chimney_cap")


def hanging_light(w: World, x: int, z: int, ceiling_y: int, soul: bool = False) -> None:
    w.set(x, ceiling_y, z, chain(), "light_support")
    w.set(x, ceiling_y - 1, z, lantern(soul=soul, hanging=True), "light")


def build_ground_and_roads(w: World) -> None:
    cx, cz = NEXUS_CENTER
    # Broad cardinal avenues. They stop inside the rounded terrain plate and
    # connect every district without creating the compressed V5 crossroads.
    road_rect(w, 86, 8, 94, 50)
    road_rect(w, 86, 100, 94, 142)
    road_rect(w, 8, 71, 64, 79)
    road_rect(w, 116, 71, 172, 79)
    road_rect(w, 84, 35, 96, 53)
    road_rect(w, 84, 97, 96, 119)
    # Plaza grows from radius 22 to 26 and remains completely unobstructed.
    for z in range(cz - 26, cz + 27):
        for x in range(cx - 26, cx + 27):
            d = math.hypot(x - cx, z - cz)
            if d <= 26.35:
                mat = patterned_stone(x, z)
                if 24.6 <= d <= 26.35:
                    mat = "minecraft:polished_andesite"
                elif 14.6 <= d <= 15.6:
                    mat = "minecraft:polished_deepslate"
                w.set(x, 0, z, mat, "plaza")
                w.road_cells.add((x, z))
    # District links, deliberately routed through open forecourts.
    links = [
        ((25, 48), (64, 70)), ((145, 53), (115, 68)), ((66, 112), (86, 103)),
        ((116, 118), (95, 108)), ((142, 121), (97, 102)), ((46, 124), (86, 105)),
        ((126, 74), (116, 75)), ((54, 74), (64, 75)),
    ]
    for a, b in links:
        road_line(w, a, b, 3)
    w.road_anchors = {
        "north_gate": (90, 9), "town_hall": (90, 35), "warrior": (25, 48),
        "waystone": (145, 53), "west_gate": (9, 75), "east_gate": (171, 75),
        "arcanist": (66, 112), "metallurgist": (116, 118), "gunsmith": (142, 121),
        "nether": (46, 124), "south_gate": (90, 141),
    }
    # Four village gardens soften the transition from civic plaza to districts.
    for gx, gz in ((67, 49), (113, 49), (67, 101), (113, 101)):
        w.fill(gx - 2, 0, gz - 1, gx + 2, 0, gz + 1, "minecraft:coarse_dirt", "planter")
        for x in range(gx - 2, gx + 3):
            w.set(x, 1, gz, "minecraft:azalea_leaves", "landscape")
        w.set(gx, 1, gz - 2, stair("minecraft:dark_oak_stairs", "south"), "bench")
        w.set(gx, 1, gz + 2, stair("minecraft:dark_oak_stairs", "north"), "bench")
        w.set(gx, 0, gz - 2, "minecraft:stone_bricks", "bench_base")
        w.set(gx, 0, gz + 2, "minecraft:stone_bricks", "bench_base")


def build_nexus(w: World) -> None:
    cx, cz = NEXUS_CENTER
    # Formal stepped dais, readable as one object rather than scattered rubble.
    disk(w, cx, cz, 8, 1, "minecraft:polished_blackstone_bricks", "nexus_dais")
    disk(w, cx, cz, 7, 2, "minecraft:polished_deepslate", "nexus_dais")
    disk(w, cx, cz, 5, 3, "minecraft:deepslate_tiles", "nexus_dais")
    for z in range(cz - 8, cz + 9):
        for x in range(cx - 8, cx + 9):
            if math.hypot(x - cx, z - cz) <= 8.4:
                w.nexus_cells.add((x, z))

    # A single tapered, slightly leaning lithic shard with two intentional fins.
    layers = []
    for y in range(4, 26):
        if y <= 7: rx, rz, shift = 4, 3, 0
        elif y <= 13: rx, rz, shift = 3, 3, 0
        elif y <= 18: rx, rz, shift = 3, 2, 1
        elif y <= 22: rx, rz, shift = 2, 2, 1
        else: rx, rz, shift = 1, 1, 2
        layers.append((y, rx, rz, shift))
        for z in range(cz - rz, cz + rz + 1):
            for x in range(cx + shift - rx, cx + shift + rx + 1):
                dx = (x - (cx + shift)) / max(rx, 1)
                dz = (z - cz) / max(rz, 1)
                if dx * dx + dz * dz <= 1.18:
                    n = (x * 11 + y * 17 + z * 23) % 19
                    mat = "minecraft:deepslate_tiles"
                    if n in (0, 1): mat = "minecraft:cracked_deepslate_bricks"
                    elif n == 2: mat = "minecraft:tuff"
                    elif n == 3: mat = "minecraft:polished_blackstone_bricks"
                    w.set(x, y, z, mat, "nexus_monolith")
                    w.nexus_cells.add((x, z))
    # Coherent rear fin and lower counter-fin, physically fused to the core.
    for y in range(7, 21):
        reach = max(0, 4 - abs(14 - y) // 3)
        for dz in range(1, reach + 1):
            w.set(cx - 2, y, cz - 2 - dz, "minecraft:deepslate_bricks", "nexus_fin")
            w.nexus_cells.add((cx - 2, cz - 2 - dz))
    for y in range(5, 14):
        reach = max(0, 3 - abs(9 - y) // 2)
        for dx in range(1, reach + 1):
            w.set(cx + 3 + dx, y, cz + 1, "minecraft:polished_blackstone_bricks", "nexus_fin")
            w.nexus_cells.add((cx + 3 + dx, cz + 1))
    # Continuous south-facing fissure: glass is backed by physical light blocks.
    for y in range(6, 23):
        shift = 0 if y <= 13 else (1 if y <= 22 else 2)
        x = cx + shift + (1 if y in (10, 11, 18) else 0)
        z = cz + (3 if y <= 13 else 2)
        color = "minecraft:cyan_stained_glass" if y % 5 else "minecraft:purple_stained_glass"
        w.set(x, y, z, color, "nexus_fissure")
        if w.inside(x, y, z - 1):
            w.set(x, y, z - 1, "minecraft:sea_lantern", "hidden_light")
    # Small, localized crystal growth at the base only.
    for x, y, z in ((cx - 4, 4, cz + 2), (cx - 3, 4, cz + 3), (cx + 4, 4, cz - 3)):
        w.set(x, y, z, "minecraft:amethyst_block", "crystal_growth")
        w.set(x, y + 1, z, state("minecraft:amethyst_cluster", facing="up", waterlogged=False), "crystal_growth")

    # Crying obsidian is fused into the fissure and produces native purple
    # particles without entities, commands, or invisible particle emitters.
    for x, y, z in ((cx - 2, 8, cz + 2), (cx + 2, 13, cz + 2),
                    (cx, 17, cz - 2), (cx + 2, 21, cz)):
        w.set(x, y, z, "minecraft:crying_obsidian", "nexus_particle_stone")

    # The industrial pylons are replaced by an irregular ritual boundary.
    # Five low resonators read as village magic and never appear to hold up the rock.
    resonators = [(-10, -4, "cyan"), (8, -9, "purple"), (11, 5, "cyan"),
                  (3, 11, "purple"), (-9, 8, "cyan")]
    for dx, dz, color in resonators:
        px, pz = cx + dx, cz + dz
        w.fill(px - 1, 1, pz - 1, px + 1, 1, pz + 1,
               "minecraft:polished_deepslate", "arcane_resonator")
        w.set(px, 2, pz, "minecraft:crying_obsidian", "arcane_resonator")
        w.set(px, 3, pz, f"minecraft:{color}_stained_glass", "arcane_resonator")
        w.set(px, 4, pz, state("minecraft:end_rod", facing="up"), "arcane_resonator_light")
        w.nexus_cells.add((px, pz))

    # Inlaid runes replace the copper containment circuit.
    ring_points: list[tuple[int, int]] = []
    for z in range(cz - 10, cz + 11):
        for x in range(cx - 10, cx + 11):
            d = math.hypot(x - cx, z - cz)
            if 9.45 <= d <= 10.35:
                ring_points.append((x, z))
    for index, (x, z) in enumerate(ring_points):
        rune = "minecraft:cyan_glazed_terracotta" if index % 5 else "minecraft:crying_obsidian"
        w.set(x, 0, z, rune, "arcane_rune_ring")
        w.nexus_cells.add((x, z))


def build_town_hall(w: World) -> None:
    # Three interlocking masses plus a tower; each mass has a complete roof.
    gabled_building(w, "Town Hall central nave", 53, 7, 83, 28, 10, "x",
                    wall="minecraft:deepslate_bricks", upper="minecraft:stone_bricks",
                    roof_stair="minecraft:deepslate_tile_stairs", roof_block="minecraft:deepslate_tiles",
                    floor="minecraft:polished_andesite", category="principal")
    gabled_building(w, "Town Hall west wing", 40, 10, 54, 25, 8, "z",
                    wall="minecraft:stone_bricks", upper="minecraft:calcite",
                    roof_stair="minecraft:dark_oak_stairs", roof_block="minecraft:dark_oak_planks",
                    category="principal")
    gabled_building(w, "Town Hall east wing", 82, 10, 96, 25, 8, "z",
                    wall="minecraft:stone_bricks", upper="minecraft:calcite",
                    roof_stair="minecraft:dark_oak_stairs", roof_block="minecraft:dark_oak_planks",
                    category="principal")
    gabled_building(w, "Town Hall entrance", 61, 22, 75, 30, 9, "z",
                    wall="minecraft:deepslate_bricks", upper="minecraft:stone_bricks",
                    roof_stair="minecraft:deepslate_tile_stairs", roof_block="minecraft:deepslate_tiles",
                    floor="minecraft:polished_andesite", category="principal")
    # Central administrative tower rises through, and is closed by a pyramidal roof.
    w.add_building("Town Hall clock tower", (63, 73, 6, 15), "principal")
    for y in range(9, 19):
        for x in range(63, 74):
            for z in range(6, 16):
                if x in (63, 73) or z in (6, 15):
                    mat = "minecraft:deepslate_bricks" if y <= 11 else "minecraft:stone_bricks"
                    w.set(x, y, z, mat, "tower")
    for x in (63, 73):
        for z in (6, 15):
            w.vertical(x, z, 9, 18, log("minecraft:stripped_dark_oak_log"), "beam")
    for x, z, facing in ((68, 6, "north"), (68, 15, "south"), (63, 10, "west"), (73, 10, "east")):
        w.set(x, 14, z, "minecraft:light_blue_stained_glass", "tower_window")
        w.set(x, 15, z, "minecraft:light_blue_stained_glass", "tower_window")
    pyramid_roof(w, "Town Hall clock tower", 63, 6, 73, 15, 19, "minecraft:weathered_cut_copper")
    # Grand south entrance and deep portico. The opening is five blocks wide,
    # has a clear vestibule, correctly paired hinges, steps and pressure plates.
    for x in range(65, 72):
        for y in (2, 3, 4, 5):
            w.remove(x, y, 30)
    for z in range(22, 31):
        for y in (2, 3, 4):
            for x in range(66, 71):
                w.remove(x, y, z)
    w.fill(65, 1, 29, 71, 1, 31, "minecraft:polished_andesite", "entrance_floor")
    for x in range(65, 72):
        w.set(x, 1, 32, stair("minecraft:polished_andesite_stairs", "south"), "entrance_step")
    place_double_door(w, 67, 2, 30, "south", "x")
    for x in (67, 68):
        w.set(x, 2, 29, pressure_plate(), "door_control")
        w.set(x, 2, 31, pressure_plate(), "door_control")
    for x in (62, 74):
        w.vertical(x, 31, 1, 7, "minecraft:polished_blackstone_bricks", "portico")
        w.set(x, 8, 31, "create:brass_casing", "portico")
    w.fill(62, 8, 29, 74, 8, 31, "minecraft:deepslate_tiles", "portico_roof")
    # Windows and exterior depth on every wing.
    add_windows(w, 53, 7, 83, 28, 10)
    add_windows(w, 40, 10, 54, 25, 8)
    add_windows(w, 82, 10, 96, 25, 8)
    # Interior zoning: archive west, tactical east, reception, open central hall and dais.
    w.fill(55, 2, 9, 55, 6, 25, "minecraft:stripped_dark_oak_log", "interior_partition")
    w.fill(81, 2, 9, 81, 6, 25, "minecraft:stripped_dark_oak_log", "interior_partition")
    # Open the complete overlap of each wing and the central nave.  Each
    # junction is three blocks thick because both gabled shells contribute a
    # boundary wall in addition to the interior partition.
    for passage_xs in ((53, 54, 55), (81, 82, 83)):
        for x in passage_xs:
            for z in range(16, 19):
                for y in range(2, 5):
                    w.remove(x, y, z)
            w.fill(x, 5, 16, x, 5, 18,
                   log("minecraft:stripped_dark_oak_log", "z"), "partition_header")
    for z in (11, 16, 21):
        w.fill(43, 2, z, 51, 4, z, "minecraft:bookshelf", "archive")
        w.fill(85, 2, z, 93, 2, z, "minecraft:dark_oak_planks", "tactical_bench")
    w.fill(63, 2, 10, 73, 2, 13, "minecraft:polished_blackstone_bricks", "custodian_dais")
    w.fill(64, 3, 11, 72, 3, 12, "minecraft:dark_oak_planks", "custodian_dais")
    # Reception is split around the ceremonial centreline, so entering players
    # can actually reach the hall and all three NPC areas.
    w.fill(58, 2, 24, 64, 2, 25, "minecraft:dark_oak_planks", "reception_counter")
    w.fill(72, 2, 24, 78, 2, 25, "minecraft:dark_oak_planks", "reception_counter")
    for x in (59, 63, 73, 77):
        w.set(x, 3, 24, trapdoor("minecraft:dark_oak_trapdoor", "south", "top"), "reception_detail")
    # Waiting benches, archive reading tables and the tactical planning table.
    for x in (59, 64, 72, 77):
        w.set(x, 2, 21, stair("minecraft:spruce_stairs", "south"), "hall_bench")
    w.fill(58, 2, 17, 62, 2, 18, "minecraft:spruce_planks", "reading_table")
    w.fill(74, 2, 17, 78, 2, 18, "minecraft:spruce_planks", "meeting_table")
    w.fill(85, 2, 23, 93, 2, 24, "minecraft:polished_deepslate", "tactical_table")
    # A restrained civic runner and side rugs make the interior legible as a
    # finished public building rather than an empty shell.
    w.fill(67, 2, 24, 69, 2, 27, "minecraft:blue_carpet", "civic_rug")
    w.fill(66, 2, 17, 70, 2, 18, "minecraft:cyan_carpet", "civic_rug")
    w.fill(44, 2, 14, 50, 2, 14, "minecraft:brown_carpet", "archive_rug")
    w.fill(86, 2, 14, 92, 2, 14, "minecraft:red_carpet", "tactical_rug")
    # Gallery beams and integrated lighting.
    for x in sorted(set([*range(57, 80, 6), 60, 68, 76])):
        w.fill(x, 8, 7, x, 8, 28, log("minecraft:stripped_dark_oak_log", "z"), "ceiling_beam")
    w.fill(40, 8, 17, 54, 8, 17, log("minecraft:stripped_dark_oak_log", "x"), "ceiling_beam")
    w.fill(82, 8, 17, 96, 8, 17, log("minecraft:stripped_dark_oak_log", "x"), "ceiling_beam")
    for pos in ((60, 20), (68, 20), (76, 20), (47, 17), (89, 17)):
        hanging_light(w, pos[0], pos[1], 8, False)
    chimney(w, 44, 13, 2, 14); chimney(w, 91, 13, 2, 14)
    # A supported balcony breaks the monumental south facade without
    # narrowing the ceremonial approach.
    w.fill(64, 6, 30, 72, 6, 32, slab("minecraft:dark_oak_slab", "top"), "balcony")
    for x in (64, 72):
        w.set(x, 5, 31, support("brass", "up"), "balcony_support")
        w.set(x, 7, 32, "minecraft:dark_oak_fence", "balcony_railing")
    for x in range(65, 72):
        w.set(x, 7, 32, "minecraft:dark_oak_fence", "balcony_railing")


def build_warrior(w: World) -> None:
    gabled_building(w, "Warrior guildhall", 12, 15, 36, 34, 8, "x",
                    wall="minecraft:cobblestone", upper="minecraft:spruce_planks",
                    roof_stair="minecraft:dark_oak_stairs", roof_block="minecraft:dark_oak_planks",
                    category="district")
    add_windows(w, 12, 15, 36, 34, 8, "minecraft:orange_stained_glass")
    for x in range(20, 28):
        w.remove(x, 2, 34); w.remove(x, 3, 34)
    for x in range(19, 29):
        for y in range(3, 6):
            w.remove(x, y, 35)
    place_double_door(w, 23, 2, 34, "south", "x", "minecraft:spruce_door")
    # Supported forge porch and training yard.
    w.add_building("Warrior training yard", (10, 29, 37, 44), "open_district")
    w.fill(16, 1, 34, 28, 1, 41, "minecraft:stone_bricks", "forge_floor")
    for x in (16, 22, 28):
        w.vertical(x, 40, 2, 6, log("minecraft:stripped_spruce_log"), "porch_post")
    w.fill(15, 7, 33, 29, 7, 41, "minecraft:dark_oak_planks", "porch_roof")
    for x in range(10, 30):
        w.set(x, 0, 44, "minecraft:cobblestone", "yard_edge")
    for z in range(37, 45):
        w.set(10, 1, z, "minecraft:spruce_fence", "yard_fence")
        w.set(29, 1, z, "minecraft:spruce_fence", "yard_fence")
    w.fill(13, 0, 38, 15, 0, 42, "minecraft:gravel", "training_pad")
    w.fill(25, 0, 38, 28, 0, 42, "minecraft:gravel", "training_pad")
    w.fill(14, 0, 42, 28, 0, 42, "minecraft:gravel", "training_pad")
    for x in (14, 20, 26):
        w.set(x, 1, 39, "minecraft:target", "training_target")
        w.set(x, 2, 39, "minecraft:target", "training_target")
    w.set(19, 2, 28, "minecraft:anvil", "forge")
    w.set(21, 2, 28, "minecraft:smithing_table", "forge")
    w.set(23, 2, 28, "minecraft:crafting_table", "forge")
    chimney(w, 15, 18, 2, 14)
    hanging_light(w, 22, 26, 8)


def build_waystone_and_explorer(w: World) -> None:
    # Open transit pavilion: all roof loads terminate in visible pillars.
    w.add_building("Waystone transit pavilion", (98, 120, 14, 34), "district")
    w.fill(98, 1, 14, 120, 1, 34, "minecraft:polished_andesite", "waystone_floor")
    pillar_positions = [(99, 15), (109, 15), (119, 15), (99, 33), (109, 33), (119, 33)]
    for x, z in pillar_positions:
        w.fill(x - 1, 1, z - 1, x + 1, 2, z + 1, "minecraft:deepslate_bricks", "pavilion_base")
        w.vertical(x, z, 3, 8, log("minecraft:stripped_dark_oak_log"), "pavilion_post")
        w.set(x, 9, z, "create:copper_casing", "pavilion_cap")
    # Complete gable roof with copper ridge.
    for z in range(13, 36):
        d = min(z - 13, 35 - z)
        y = 9 + d // 2
        mat = "minecraft:weathered_cut_copper" if z in (24, 25) else stair("minecraft:dark_oak_stairs", "south" if z < 24 else "north")
        for x in range(97, 122):
            w.set(x, y, z, mat, "roof")
    # Three timber trusses span the pavilion and join every roof course to
    # the grounded posts below.
    for tx in (99, 109, 119):
        for z in range(14, 35):
            d = min(z - 13, 35 - z)
            roof_y = 9 + d // 2
            for y in range(9, roof_y):
                w.set(tx, y, z, log("minecraft:stripped_dark_oak_log"), "roof_support")
    w.roofs.append(RoofSection("Waystone transit pavilion", 98, 120, 14, 34, 9))
    # Empty, precisely reserved waystone dais.
    disk(w, 109, 24, 4, 2, "minecraft:polished_deepslate", "waystone_dais")
    disk(w, 109, 24, 2, 3, "minecraft:polished_blackstone_bricks", "waystone_dais")
    for y in (4, 5, 6):
        w.remove(109, y, 24)
    for x, z in ((99, 15), (119, 15), (99, 33), (119, 33)):
        w.set(x, 7, z, deco_lamp("blue", "copper", "up"), "waystone_light")
    # Explorer lodge is a distinct, fully closed mass behind the pavilion.
    gabled_building(w, "Explorer lodge", 103, 31, 126, 40, 7, "x",
                    wall="minecraft:stone_bricks", upper="minecraft:spruce_planks",
                    roof_stair="minecraft:dark_oak_stairs", roof_block="minecraft:dark_oak_planks",
                    category="district")
    add_windows(w, 103, 31, 126, 40, 7, "minecraft:cyan_stained_glass")
    place_double_door(w, 104, 2, 31, "north", "x", "minecraft:spruce_door")
    w.set(116, 2, 36, "minecraft:cartography_table", "explorer_interior")
    w.fill(119, 2, 34, 124, 3, 34, "minecraft:bookshelf", "explorer_interior")
    chimney(w, 122, 34, 2, 12)


def build_arcanist(w: World) -> None:
    gabled_building(w, "Arcanist library", 27, 72, 50, 94, 8, "x",
                    wall="minecraft:stone_bricks", upper="minecraft:dark_oak_planks",
                    roof_stair="minecraft:deepslate_tile_stairs", roof_block="minecraft:deepslate_tiles",
                    category="district")
    add_windows(w, 27, 72, 50, 94, 8, "minecraft:purple_stained_glass")
    # Attached observatory tower with a closed copper roof.
    w.add_building("Arcanist observatory", (43, 55, 76, 89), "district")
    w.fill(43, 1, 76, 55, 1, 89, "minecraft:polished_deepslate", "tower_floor")
    for y in range(2, 14):
        for x in range(43, 56):
            for z in range(76, 90):
                if x in (43, 55) or z in (76, 89):
                    mat = "minecraft:deepslate_bricks" if y <= 4 else "minecraft:stone_bricks"
                    w.set(x, y, z, mat, "tower_wall")
    for x, z in ((49, 76), (49, 89), (43, 82), (55, 82)):
        w.set(x, 8, z, "minecraft:purple_stained_glass", "tower_window")
        w.set(x, 9, z, "minecraft:cyan_stained_glass", "tower_window")
    pyramid_roof(w, "Arcanist observatory", 43, 76, 55, 89, 14, "minecraft:oxidized_cut_copper")
    # Library interior and supported balcony.
    for z in (75, 79, 83, 87, 91):
        w.fill(29, 2, z, 35, 4, z, "minecraft:bookshelf", "library")
    w.set(38, 2, 82, "minecraft:dark_oak_planks", "arcane_table")
    w.set(48, 2, 82, "minecraft:dark_oak_planks", "arcane_table")
    w.fill(36, 6, 74, 47, 6, 78, "minecraft:dark_oak_planks", "balcony")
    for x in (36, 47):
        w.vertical(x, 78, 2, 5, log("minecraft:stripped_dark_oak_log"), "balcony_support")
    for x in range(36, 48):
        w.set(x, 7, 74, "minecraft:dark_oak_fence", "balcony_railing")
    place_double_door(w, 37, 2, 72, "north", "x")
    hanging_light(w, 37, 84, 8, True)


def build_metallurgist(w: World) -> None:
    gabled_building(w, "Metallurgist workshop", 62, 80, 90, 99, 8, "x",
                    wall="minecraft:polished_andesite", upper="minecraft:stone_bricks",
                    roof_stair="minecraft:deepslate_tile_stairs", roof_block="minecraft:deepslate_tiles",
                    floor="minecraft:polished_deepslate", category="district")
    add_windows(w, 62, 80, 90, 99, 8, "minecraft:cyan_stained_glass")
    place_double_door(w, 74, 2, 80, "north", "x")
    for x in (74, 75):
        for y in (2, 3, 4):
            w.remove(x, y, 79)
    # Grounded gantry integrated into the envelope, not a second free-standing factory.
    for x in (66, 86):
        w.fill(x - 1, 1, 84, x + 1, 2, 86, "minecraft:polished_blackstone_bricks", "gantry_base")
        w.vertical(x, 85, 3, 7, support("andesite", "up"), "gantry")
        w.set(x, 8, 85, "create:brass_casing", "gantry")
    for x in range(67, 86):
        w.set(x, 8, 85, support("brass", "east"), "gantry")
    for x in range(68, 85, 4):
        w.set(x, 7, 85, deco_lamp("blue", "brass", "down"), "gantry_light")
    w.fill(68, 2, 89, 84, 2, 91, "minecraft:dark_oak_planks", "workbench")
    for x, block in ((70, "minecraft:smithing_table"), (76, "minecraft:anvil"), (82, "minecraft:crafting_table")):
        w.set(x, 3, 90, block, "workshop_tool")
    chimney(w, 65, 84, 2, 14)


def build_gunsmith(w: World) -> None:
    gabled_building(w, "Gunsmith armory", 103, 67, 129, 89, 8, "z",
                    wall="minecraft:deepslate_bricks", upper="minecraft:spruce_planks",
                    roof_stair="minecraft:dark_oak_stairs", roof_block="minecraft:dark_oak_planks",
                    floor="minecraft:polished_andesite", category="district")
    add_windows(w, 103, 67, 129, 89, 8, "minecraft:orange_stained_glass")
    place_double_door(w, 103, 2, 76, "west", "z")
    # Industrial facade ribs and a supported loading awning.
    for z in range(70, 88, 5):
        w.vertical(102, z, 2, 7, support("industrial_iron", "up"), "facade_support")
    w.fill(98, 7, 72, 103, 7, 84, sheet("industrial_iron", "y"), "loading_awning")
    for z in (72, 78, 84):
        w.vertical(98, z, 1, 6, support("industrial_iron", "up"), "awning_support")
    w.fill(108, 2, 71, 125, 2, 73, "minecraft:dark_oak_planks", "armory_bench")
    for z in (78, 82, 86):
        w.set(126, 2, z, "minecraft:target", "armory_target")
        w.set(126, 3, z, "minecraft:target", "armory_target")
    chimney(w, 122, 70, 2, 14)


def build_nether_shrine(w: World) -> None:
    # A remote open-air Nexus Realms gateway replaces the V5 rectangular shed.
    # The complete court has a deep foundation supplied by build_foundation().
    cx, cz = 29, 124
    w.add_building("Nether arcane gateway", (16, 42, 109, 139), "utility")
    for z in range(109, 140):
        for x in range(16, 43):
            d = math.hypot(x - cx, z - cz)
            if d <= 15.2:
                if 13.3 <= d <= 15.2:
                    mat = "minecraft:polished_blackstone_bricks"
                elif 7.8 <= d <= 8.8:
                    mat = "minecraft:cracked_deepslate_tiles"
                else:
                    mat = "minecraft:deepslate_tiles" if (x + z) % 7 else "minecraft:tuff"
                w.set(x, 0, z, mat, "nether_court")
    # The east approach is wide and level, with a readable threshold.
    w.fill(38, 0, 121, 46, 0, 127, "minecraft:polished_blackstone_bricks", "nether_approach")
    for z in range(122, 127):
        w.set(42, 1, z, stair("minecraft:polished_blackstone_brick_stairs", "east"), "nether_step")

    # Buttressed asymmetric gateway. Every fin grows from a broad masonry base.
    for x1, x2, peak in ((20, 24, 10), (34, 38, 12)):
        w.fill(x1, 1, 121, x2, 2, 129, "minecraft:polished_blackstone_bricks", "gateway_base")
        for x in range(x1, x2 + 1):
            height = peak - abs(x - ((x1 + x2) // 2))
            for y in range(3, height + 1):
                for z in range(122, 129):
                    if z in (122, 128) or x in (x1, x2):
                        n = (x * 7 + y * 13 + z * 17) % 11
                        mat = "minecraft:deepslate_bricks" if n else "minecraft:cracked_deepslate_bricks"
                        w.set(x, y, z, mat, "gateway_buttress")
    # A stepped stone arch binds both grounded buttresses above the portal.
    for step, (xa, xb) in enumerate(((22, 36), (23, 35), (24, 34), (25, 33))):
        y = 9 + step
        w.fill(xa, y, 123, xb, y, 127, "minecraft:polished_blackstone_bricks", "gateway_arch")
    for x in (22, 36):
        w.vertical(x, 125, 4, 9, "minecraft:deepslate_bricks", "gateway_arch_support")

    # Functional portal embedded within the lithic arch.
    w.fill(26, 2, 125, 26, 9, 125, "minecraft:obsidian", "nether_portal")
    w.fill(31, 2, 125, 31, 9, 125, "minecraft:obsidian", "nether_portal")
    w.fill(26, 2, 125, 31, 2, 125, "minecraft:obsidian", "nether_portal")
    w.fill(26, 9, 125, 31, 9, 125, "minecraft:crying_obsidian", "nether_portal")
    w.fill(27, 3, 125, 30, 8, 125, state("minecraft:nether_portal", axis="x"), "nether_portal")
    for x, y in ((26, 4), (31, 5), (26, 8), (31, 8)):
        w.set(x, y, 125, "minecraft:crying_obsidian", "gateway_particle_stone")

    # Cyan/violet side fissures identify it as Nexus Realms architecture while
    # leaving the Nether field itself visually dominant.
    for x, z, color in ((23, 122, "cyan"), (23, 128, "purple"),
                        (35, 122, "purple"), (35, 128, "cyan")):
        w.set(x, 5, z, "minecraft:sea_lantern", "gateway_hidden_light")
        w.set(x, 6, z, f"minecraft:{color}_stained_glass", "gateway_fissure")
        w.set(x, 7, z, state("minecraft:end_rod", facing="up"), "gateway_light")

    # Low ritual stones and village seating finish the court without a giant roof.
    for x, z in ((19, 114), (39, 115), (19, 135), (38, 134)):
        w.fill(x - 1, 1, z - 1, x + 1, 1, z + 1, "minecraft:blackstone", "gateway_runestone_base")
        w.set(x, 2, z, "minecraft:crying_obsidian", "gateway_runestone")
        w.set(x, 3, z, lantern(soul=True), "gateway_runestone_light")
    for x, z, facing in ((22, 133, "north"), (36, 133, "north"),
                         (22, 116, "south"), (36, 116, "south")):
        w.set(x, 1, z, stair("minecraft:dark_oak_stairs", facing), "gateway_bench")


def build_market_stall(w: World, name: str, x1: int, z1: int, x2: int, z2: int,
                       canopy: str, accent: str) -> None:
    w.add_building(name, (x1, x2, z1, z2), "market")
    w.fill(x1, 1, z1, x2, 1, z2, "minecraft:spruce_planks", "stall_floor")
    for x, z in ((x1, z1), (x2, z1), (x1, z2), (x2, z2)):
        w.vertical(x, z, 2, 5, log("minecraft:stripped_dark_oak_log"), "stall_post")
    # Complete pitched canopy, fully supported at four corners.
    mid = (z1 + z2) // 2
    for z in range(z1 - 1, z2 + 2):
        y = 6 + min(z - (z1 - 1), (z2 + 1) - z)
        for x in range(x1 - 1, x2 + 2):
            material = accent if ((x - x1) // 2) % 2 else canopy
            w.set(x, y, z, material, "stall_roof")
        for x in (x1, x2):
            for sy in range(6, y):
                w.set(x, sy, z, log("minecraft:stripped_dark_oak_log"), "roof_support")
    w.fill(x1, 5, z1 - 1, x2, 5, z1 - 1, log("minecraft:stripped_dark_oak_log", "x"), "roof_support")
    w.fill(x1, 5, z2 + 1, x2, 5, z2 + 1, log("minecraft:stripped_dark_oak_log", "x"), "roof_support")
    w.roofs.append(RoofSection(name, x1, x2, z1, z2, 6))
    w.fill(x1 + 1, 2, z1 + 1, x2 - 1, 2, z1 + 1, "minecraft:dark_oak_planks", "counter")
    for x in range(x1 + 2, x2, 3):
        w.set(x, 3, z1 + 1, trapdoor("minecraft:dark_oak_trapdoor", "south", "top"), "counter_detail")
    # Deep timber eaves and side rails keep the pavilion from reading as a
    # loose coloured tent.
    for x in range(x1, x2 + 1):
        w.set(x, 5, z1, log("minecraft:stripped_dark_oak_log", "x"), "stall_frame")
        w.set(x, 5, z2, log("minecraft:stripped_dark_oak_log", "x"), "stall_frame")
    for z in range(z1 + 1, z2):
        w.set(x1, 2, z, "minecraft:dark_oak_fence", "stall_rail")
        w.set(x2, 2, z, "minecraft:dark_oak_fence", "stall_rail")


def build_market(w: World) -> None:
    stalls = [
        ("West spice market", 47, 68, 61, 78, "minecraft:orange_terracotta", "minecraft:yellow_terracotta"),
        ("West provisions market", 47, 88, 61, 98, "minecraft:light_gray_wool", "minecraft:white_wool"),
        ("East textile market", 119, 68, 133, 78, "minecraft:cyan_wool", "minecraft:blue_wool"),
        ("East produce market", 119, 88, 133, 98, "minecraft:yellow_terracotta", "minecraft:red_terracotta"),
    ]
    for x1, z1, x2, z2 in ((44, 65, 64, 81), (44, 85, 64, 101),
                           (116, 65, 136, 81), (116, 85, 136, 101)):
        for z in range(z1, z2 + 1):
            for x in range(x1, x2 + 1):
                if (x + z) % 7:
                    w.set(x, 0, z, "minecraft:gravel", "market_square")
                else:
                    w.set(x, 0, z, "minecraft:coarse_dirt", "market_square")
    for args in stalls:
        build_market_stall(w, *args)
    # Chains for the four market overlay lanterns reach their canopies.
    for x, z in ((54, 73), (54, 93), (126, 73), (126, 93)):
        for y in range(6, 12):
            w.set(x, y, z, chain(), "light_support")
    for x, z in ((51, 72), (57, 72), (51, 92), (57, 92),
                 (123, 72), (130, 72), (123, 92), (130, 92)):
        for y in range(6, 11):
            w.set(x, y, z, chain(), "produce_support")
    # Village notice boards, waterless planters and seating define each market
    # forecourt without blocking the axial views toward the Nexus.
    for x, z in ((44, 84), (136, 84)):
        w.fill(x - 1, 0, z - 2, x + 1, 0, z + 2, "minecraft:coarse_dirt", "market_planter")
        w.vertical(x, z, 1, 3, log("minecraft:stripped_spruce_log"), "notice_post")
        w.fill(x - 1, 3, z, x + 1, 4, z, "minecraft:spruce_planks", "notice_board")
        w.set(x - 2, 1, z, stair("minecraft:spruce_stairs", "east"), "market_bench")
        w.set(x + 2, 1, z, stair("minecraft:spruce_stairs", "west"), "market_bench")


def village_lamppost(w: World, x: int, z: int, axis: str = "x", soul: bool = False) -> None:
    """Grounded timber village lamp with a supported double hanging lantern."""
    w.fill(x - 1, 1, z - 1, x + 1, 1, z + 1, "minecraft:cobblestone", "lamp_base")
    w.vertical(x, z, 2, 6, log("minecraft:stripped_spruce_log"), "lamp_post")
    if axis == "x":
        w.fill(x - 2, 6, z, x + 2, 6, z, log("minecraft:dark_oak_log", "x"), "lamp_arm")
        ends = ((x - 2, z), (x + 2, z))
    else:
        w.fill(x, 6, z - 2, x, 6, z + 2, log("minecraft:dark_oak_log", "z"), "lamp_arm")
        ends = ((x, z - 2), (x, z + 2))
    for lx, lz in ends:
        w.set(lx, 5, lz, chain(), "lamp_chain")
        w.set(lx, 4, lz, lantern(soul=soul, hanging=True), "street_light")
    for dx, dz, facing in ((-1, 0, "east"), (1, 0, "west"), (0, -1, "south"), (0, 1, "north")):
        w.set(x + dx, 2, z + dz,
              trapdoor("minecraft:spruce_trapdoor", facing, "bottom", True), "lamp_base_detail")


def add_street_furniture(w: World) -> None:
    # Warm village lamps line the civil routes; only the arcane south-west route
    # uses soul lanterns. None sits inside the clear Nexus plaza.
    posts = [
        (78, 43, "x", False), (102, 43, "x", False),
        (67, 51, "z", False), (113, 51, "z", False),
        (60, 61, "z", False), (120, 61, "z", False),
        (39, 66, "x", False), (141, 66, "x", False),
        (22, 68, "x", False), (158, 68, "x", False),
        (39, 84, "x", False), (141, 84, "x", False),
        (66, 90, "z", False), (114, 90, "z", False),
        (68, 106, "x", True), (112, 106, "x", False),
        (52, 111, "z", True), (128, 111, "z", False),
        (80, 114, "x", False), (100, 114, "x", False),
        (90, 137, "x", False),
    ]
    for x, z, axis, soul in posts:
        village_lamppost(w, x, z, axis, soul)

    # Low magical milestones carry the arcane identity into the village roads
    # without turning every street into an industrial installation.
    for x, z in ((72, 53), (108, 53), (67, 98), (113, 98), (57, 110)):
        w.fill(x - 1, 1, z - 1, x + 1, 1, z + 1, "minecraft:mossy_stone_bricks", "rune_marker")
        w.set(x, 2, z, "minecraft:crying_obsidian", "rune_marker")
        w.set(x, 3, z, lantern(soul=True), "rune_light")


def build_base() -> World:
    w = World("base")
    build_foundation(w)

    # Every surface and district is raised over the ten-block terrain plate.
    # Districts retain their authored internal proportions while receiving
    # substantially larger civic, market and inter-district clearances.
    for builder, dx, dz in (
        (build_ground_and_roads, 0, 0),
        (build_nexus, 0, 0),
        (build_town_hall, 22, 3),
        (build_warrior, 2, 13),
        (build_waystone_and_explorer, 36, 12),
        (build_arcanist, 29, 41),
        (build_metallurgist, 42, 39),
        (build_gunsmith, 40, 45),
        (build_nether_shrine, 0, 0),
        (build_market, 0, 0),
        (add_street_furniture, 0, 0),
    ):
        district = World(builder.__name__)
        builder(district)
        merge_shifted(w, district, dx, GROUND_Y, dz)
    return w


def build_overlay() -> World:
    w = World("decocraft")
    placements: list[tuple[int, int, int, str]] = [
        # Town Hall reception and administration. Furniture is arranged around
        # the clear central aisle and all three reserved NPC interaction zones.
        (80, 12, 26, deco("modular_desk_plank_spruce", "south")),
        (84, 12, 26, deco("modular_desk_plank_spruce", "south")),
        (96, 12, 26, deco("modular_desk_plank_spruce", "south")),
        (100, 12, 26, deco("modular_desk_plank_spruce", "south")),
        (80, 12, 24, deco("office_chair_spruce", "north")),
        (84, 12, 24, deco("office_chair_spruce", "north")),
        (96, 12, 24, deco("office_chair_spruce", "north")),
        (100, 12, 24, deco("office_chair_spruce", "north")),
        (65, 12, 15, deco("filing_cabinet_spruce", "east")),
        (65, 12, 21, deco("filing_cabinet_spruce", "east")),
        (65, 12, 27, deco("filing_cabinet_spruce", "east")),
        (73, 12, 15, deco("filing_cabinet_spruce", "west")),
        (73, 12, 27, deco("filing_cabinet_spruce", "west")),
        (79, 12, 13, deco("grandfather_clock", "east")),
        (101, 12, 13, deco("grandfather_clock", "west")),
        (80, 13, 26, deco("typewriter_black", "south")),
        (84, 13, 26, deco("typewriter_black", "south")),
        (96, 13, 26, deco("typewriter_black", "south")),
        (74, 14, 21, deco("world_map", "east")),
        (106, 14, 21, deco("world_map", "west")),
        (88, 12, 27, deco("globe_antique", "south")),
        (114, 12, 25, deco("globe_antique", "west")),
        (82, 13, 20, deco("stained_glass_table_lamp_embers_on", "north")),
        (98, 13, 20, deco("stained_glass_table_lamp_embers_on", "north")),
        (82, 17, 23, deco("stained_glass_chandelier_embers_on", "north")),
        (90, 17, 23, deco("stained_glass_chandelier_embers_on", "north")),
        (98, 17, 23, deco("stained_glass_chandelier_embers_on", "north")),
        (69, 17, 20, deco("stained_glass_chandelier_embers_on", "north")),
        (111, 17, 20, deco("stained_glass_chandelier_embers_on", "north")),
        (63, 14, 18, deco("stained_glass_sconce_embers_on", "east")),
        (117, 14, 18, deco("stained_glass_sconce_embers_on", "west")),

        # Warrior district translated into its wider north-west plot.
        (16, 11, 55, deco("trainingdummy", "south")),
        (22, 11, 55, deco("trainingdummy", "south")),
        (28, 11, 55, deco("trainingdummy", "south")),
        (15, 13, 38, deco("hanging_armorer", "east")),
        (24, 13, 29, deco("hanging_shield", "north")),
        (31, 13, 29, deco("hanging_swords", "north")),

        # Arcanist library and observatory.
        (60, 13, 114, deco("hanging_magic", "north")),
        (67, 13, 123, deco("crystal_ball", "east")),
        (77, 13, 123, deco("crystal_ball", "west")),
        (66, 17, 125, deco("stained_glass_hanging_lamp_embers_on", "north")),
        (61, 12, 130, deco("globe_antique", "east")),

        # Explorer lodge and transit pavilion.
        (161, 13, 46, deco("world_map", "west")),
        (150, 12, 48, deco("globe", "west")),
        (156, 12, 48, deco("globe_antique", "east")),
        (148, 12, 48, deco("backpack_green", "south")),
        (159, 13, 51, deco("hanging_camping", "south")),
        (137, 12, 32, deco("backpack_green", "south")),
        (153, 12, 32, deco("backpack_green", "south")),
    ]

    # Four dense but navigable merchant groups. Props are spaced so large
    # DecoCraft models do not overlap counters, columns or player circulation.
    market: list[tuple[int, int, int, str, str]] = [
        # West spice pavilion.
        (49, 12, 73, "fruit_cart", "east"), (58, 12, 73, "fruit_cart", "west"),
        (49, 12, 76, "barrel_apples_mix", "south"), (52, 12, 76, "barrel_carrots", "south"),
        (56, 12, 76, "barrel_apples_mix", "south"), (59, 12, 76, "baguette_basket", "south"),
        (50, 13, 69, "vintage_cash_register", "south"),
        (56, 13, 69, "baguette_basket", "south"), (59, 13, 69, "baguette_basket", "south"),
        (51, 15, 72, "hanging_produce", "south"), (57, 15, 72, "hanging_produce", "south"),
        # West provisions pavilion.
        (49, 12, 93, "display_counter_bottom_oak", "east"),
        (49, 13, 93, "display_counter_top_pastries", "east"),
        (54, 12, 93, "display_counter_bottom_oak", "north"),
        (54, 13, 93, "display_counter_top_pastries", "north"),
        (59, 12, 93, "barrel_carrots", "west"), (49, 12, 96, "baguette_basket", "north"),
        (53, 12, 96, "barrel_apples_mix", "north"), (58, 12, 96, "baguette_basket", "north"),
        (51, 15, 92, "hanging_produce", "north"), (57, 15, 92, "hanging_produce", "north"),
        (57, 13, 89, "vintage_cash_register", "north"),
        # East textile / mixed goods pavilion.
        (121, 12, 73, "display_counter_bottom_oak", "east"),
        (121, 13, 73, "display_counter_top_pastries", "east"),
        (126, 12, 73, "fruit_cart", "south"), (131, 12, 73, "barrel_apples_mix", "west"),
        (122, 12, 76, "baguette_basket", "south"), (127, 12, 76, "barrel_carrots", "south"),
        (131, 12, 76, "baguette_basket", "south"),
        (122, 13, 69, "vintage_cash_register", "south"),
        (123, 15, 72, "hanging_produce", "south"), (130, 15, 72, "hanging_produce", "south"),
        # East produce pavilion.
        (121, 12, 93, "fruit_cart", "east"), (129, 12, 93, "fruit_cart", "west"),
        (121, 12, 96, "barrel_apples_mix", "north"), (124, 12, 96, "barrel_carrots", "north"),
        (128, 12, 96, "barrel_apples_mix", "north"), (131, 12, 96, "baguette_basket", "north"),
        (122, 13, 89, "vintage_cash_register", "north"),
        (126, 13, 89, "baguette_basket", "north"), (129, 13, 89, "baguette_basket", "north"),
        (123, 15, 92, "hanging_produce", "north"), (130, 15, 92, "hanging_produce", "north"),
    ]
    for x, y, z, prop, facing in market:
        placements.append((x, y, z, deco(prop, facing)))

    # Warm DecoCraft lanterns hang from the fully connected market roof chains.
    for x, y, z in ((54, 15, 73), (54, 15, 93), (126, 15, 73), (126, 15, 93)):
        placements.append((x, y, z, deco("paper_lantern_1_cream", "north")))
    for x, y, z in ((46, 14, 68), (62, 14, 78), (46, 14, 88), (62, 14, 98),
                    (118, 14, 68), (134, 14, 78), (118, 14, 88), (134, 14, 98)):
        placements.append((x, y, z, deco("stained_glass_sconce_embers_on", "north")))
    for x, y, z, block in placements:
        w.set(x, y, z, block, "decocraft_prop")
    return w


def combine(base: World, overlay: World) -> World:
    out = World("combined")
    out.blocks = dict(base.blocks)
    out.roles = dict(base.roles)
    for pos, block in overlay.blocks.items():
        out.blocks[pos] = block
        out.roles[pos] = overlay.roles[pos]
    out.roofs = list(base.roofs)
    out.buildings = list(base.buildings)
    out.road_cells = set(base.road_cells)
    out.road_anchors = dict(base.road_anchors)
    out.nexus_cells = set(base.nexus_cells)
    return out


# --- Minimal complete NBT codec for Sponge schematic v2 --------------------

TAG_END, TAG_BYTE, TAG_SHORT, TAG_INT, TAG_LONG = 0, 1, 2, 3, 4
TAG_FLOAT, TAG_DOUBLE, TAG_BYTE_ARRAY, TAG_STRING = 5, 6, 7, 8
TAG_LIST, TAG_COMPOUND, TAG_INT_ARRAY, TAG_LONG_ARRAY = 9, 10, 11, 12


def _wstr(value: str) -> bytes:
    raw = value.encode("utf-8")
    return struct.pack(">H", len(raw)) + raw


def _payload(tag_type: int, value: Any) -> bytes:
    if tag_type == TAG_BYTE: return struct.pack(">b", int(value))
    if tag_type == TAG_SHORT: return struct.pack(">h", int(value))
    if tag_type == TAG_INT: return struct.pack(">i", int(value))
    if tag_type == TAG_LONG: return struct.pack(">q", int(value))
    if tag_type == TAG_FLOAT: return struct.pack(">f", float(value))
    if tag_type == TAG_DOUBLE: return struct.pack(">d", float(value))
    if tag_type == TAG_BYTE_ARRAY:
        return struct.pack(">i", len(value)) + bytes(value)
    if tag_type == TAG_STRING: return _wstr(value)
    if tag_type == TAG_LIST:
        child_type, children = value
        return bytes([child_type]) + struct.pack(">i", len(children)) + b"".join(
            _payload(child_type, child) for child in children)
    if tag_type == TAG_COMPOUND:
        return b"".join(_tag(t, name, val) for name, (t, val) in value.items()) + b"\x00"
    if tag_type == TAG_INT_ARRAY:
        return struct.pack(">i", len(value)) + b"".join(struct.pack(">i", int(v)) for v in value)
    if tag_type == TAG_LONG_ARRAY:
        return struct.pack(">i", len(value)) + b"".join(struct.pack(">q", int(v)) for v in value)
    raise ValueError(tag_type)


def _tag(tag_type: int, name: str, value: Any) -> bytes:
    return bytes([tag_type]) + _wstr(name) + _payload(tag_type, value)


def encode_varint(value: int) -> bytes:
    out = bytearray()
    while True:
        part = value & 0x7F
        value >>= 7
        out.append(part | (0x80 if value else 0))
        if not value:
            return bytes(out)


def decode_varints(data: bytes) -> list[int]:
    values: list[int] = []
    value = shift = 0
    for raw in data:
        value |= (raw & 0x7F) << shift
        if raw & 0x80:
            shift += 7
            if shift > 35: raise ValueError("VarInt too large")
        else:
            values.append(value); value = shift = 0
    if shift:
        raise ValueError("Truncated VarInt")
    return values


def write_schematic(world: World, path: Path) -> dict[str, Any]:
    states = sorted(set(world.blocks.values()) | {AIR})
    states.remove(AIR); states.insert(0, AIR)
    palette = {block: index for index, block in enumerate(states)}
    data = bytearray()
    for y in range(HEIGHT):
        for z in range(LENGTH):
            for x in range(WIDTH):
                data.extend(encode_varint(palette[world.get(x, y, z)]))
    root: dict[str, tuple[int, Any]] = {
        "Version": (TAG_INT, 2),
        "DataVersion": (TAG_INT, DATA_VERSION),
        "Width": (TAG_SHORT, WIDTH),
        "Height": (TAG_SHORT, HEIGHT),
        "Length": (TAG_SHORT, LENGTH),
        "Offset": (TAG_INT_ARRAY, OFFSET),
        "PaletteMax": (TAG_INT, len(palette)),
        "Palette": (TAG_COMPOUND, {k: (TAG_INT, v) for k, v in palette.items()}),
        "BlockData": (TAG_BYTE_ARRAY, bytes(data)),
        "BlockEntities": (TAG_LIST, (TAG_COMPOUND, [])),
        "Entities": (TAG_LIST, (TAG_COMPOUND, [])),
        "Metadata": (TAG_COMPOUND, {
            "WEOffsetX": (TAG_INT, WE_OFFSET[0]), "WEOffsetY": (TAG_INT, WE_OFFSET[1]),
            "WEOffsetZ": (TAG_INT, WE_OFFSET[2]), "FAWEVersion": (TAG_INT, 402),
            "Name": (TAG_STRING, "Nexus Market V6"),
        }),
    }
    raw = _tag(TAG_COMPOUND, "Schematic", root)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as target:
        with gzip.GzipFile(fileobj=target, mode="wb", compresslevel=9, mtime=0) as zipped:
            zipped.write(raw)
    return {"palette": palette, "block_data_length": len(data), "bytes": path.stat().st_size}


class NBTReader:
    def __init__(self, data: bytes): self.f = io.BytesIO(data)
    def read(self, n: int) -> bytes:
        data = self.f.read(n)
        if len(data) != n: raise EOFError
        return data
    def string(self) -> str:
        size = struct.unpack(">H", self.read(2))[0]
        return self.read(size).decode("utf-8")
    def payload(self, t: int) -> Any:
        if t == TAG_BYTE: return struct.unpack(">b", self.read(1))[0]
        if t == TAG_SHORT: return struct.unpack(">h", self.read(2))[0]
        if t == TAG_INT: return struct.unpack(">i", self.read(4))[0]
        if t == TAG_LONG: return struct.unpack(">q", self.read(8))[0]
        if t == TAG_FLOAT: return struct.unpack(">f", self.read(4))[0]
        if t == TAG_DOUBLE: return struct.unpack(">d", self.read(8))[0]
        if t == TAG_BYTE_ARRAY:
            n = struct.unpack(">i", self.read(4))[0]; return self.read(n)
        if t == TAG_STRING: return self.string()
        if t == TAG_LIST:
            child = self.read(1)[0]; n = struct.unpack(">i", self.read(4))[0]
            return [self.payload(child) for _ in range(n)]
        if t == TAG_COMPOUND:
            out = {}
            while True:
                child = self.read(1)[0]
                if child == TAG_END: return out
                # Assignment evaluates its right-hand side before the target;
                # read the tag name explicitly before consuming its payload.
                name = self.string()
                out[name] = self.payload(child)
        if t == TAG_INT_ARRAY:
            n = struct.unpack(">i", self.read(4))[0]
            return [struct.unpack(">i", self.read(4))[0] for _ in range(n)]
        if t == TAG_LONG_ARRAY:
            n = struct.unpack(">i", self.read(4))[0]
            return [struct.unpack(">q", self.read(8))[0] for _ in range(n)]
        raise ValueError(t)
    def root(self) -> tuple[str, Any]:
        t = self.read(1)[0]
        if t != TAG_COMPOUND: raise ValueError("NBT root is not a compound")
        return self.string(), self.payload(t)


def parse_schematic(path: Path) -> dict[str, Any]:
    with gzip.open(path, "rb") as f:
        name, root = NBTReader(f.read()).root()
    return {"root_name": name, **root}


def block_id(block_state: str) -> str:
    return block_state.split("[", 1)[0]


def block_properties(block_state: str) -> dict[str, str]:
    if "[" not in block_state:
        return {}
    raw = block_state.split("[", 1)[1][:-1]
    return dict(part.split("=", 1) for part in raw.split(",") if part)


def locate_jars(instance: Path) -> dict[str, Path]:
    mods = instance / "mods"
    patterns = {
        "create": "create-1.20.1-6.0.8.jar",
        "createdeco": "createdeco-2.0.3-1.20.1-forge.jar",
        "decocraft": "decocraft-3.0.4-1.20.1-slim.jar",
        "framedblocks": "FramedBlocks-9.4.3.jar",
    }
    jars = {name: mods / filename for name, filename in patterns.items()}
    missing = [str(p) for p in jars.values() if not p.is_file()]
    if missing: raise FileNotFoundError("Missing local mod JARs: " + ", ".join(missing))
    prism = instance.parents[2]
    vanilla = list((prism / "libraries").rglob("minecraft-1.20.1-client.jar"))
    if not vanilla:
        vanilla = list((prism / "libraries").rglob("*1.20.1*client*.jar"))
    if not vanilla: raise FileNotFoundError("Minecraft 1.20.1 client JAR not found locally")
    jars["minecraft"] = vanilla[0]
    return jars


def validate_registry(states: Iterable[str], jars: dict[str, Path]) -> tuple[list[str], list[str]]:
    resources: dict[str, dict[str, dict[str, Any]]] = {}
    for namespace, jar in jars.items():
        if namespace == "framedblocks":
            ns = "framedblocks"
        elif namespace == "minecraft":
            ns = "minecraft"
        else:
            ns = namespace
        with zipfile.ZipFile(jar) as zf:
            prefix = f"assets/{ns}/blockstates/"
            resources[ns] = {}
            for name in zf.namelist():
                if name.startswith(prefix) and name.endswith(".json") and "/" not in name[len(prefix):]:
                    resources[ns][Path(name).stem] = json.loads(zf.read(name).decode("utf-8"))
    missing_ids = []
    invalid_states = []
    model_ignored = {"waterlogged", "powered"}
    for s in sorted(set(states)):
        identifier = block_id(s)
        namespace, path = identifier.split(":", 1)
        if namespace not in resources or path not in resources[namespace]:
            missing_ids.append(identifier)
            continue
        props = block_properties(s)
        if not props:
            continue  # Bare IDs resolve to the block's registered default state.
        definition = resources[namespace][path]
        if "variants" in definition:
            variant_props = []
            keys: set[str] = set()
            for key in definition["variants"]:
                parsed = dict(part.split("=", 1) for part in key.split(",") if part)
                variant_props.append(parsed); keys.update(parsed)
            projected = {k: v for k, v in props.items() if k in keys}
            unknown = set(props) - keys - model_ignored
            if unknown or projected not in variant_props:
                invalid_states.append(s)
        elif "multipart" in definition:
            allowed: dict[str, set[str]] = {}
            def collect_when(value: Any) -> None:
                if isinstance(value, dict):
                    for key, child in value.items():
                        if key in {"OR", "AND"}:
                            collect_when(child)
                        elif isinstance(child, str):
                            allowed.setdefault(key, set()).update(child.split("|"))
                        else:
                            collect_when(child)
                elif isinstance(value, list):
                    for child in value: collect_when(child)
            for part in definition["multipart"]:
                collect_when(part.get("when", {}))
            unknown = set(props) - set(allowed) - model_ignored
            wrong = {k: v for k, v in props.items() if k in allowed and v not in allowed[k]}
            if unknown or wrong:
                invalid_states.append(s)
    return sorted(set(missing_ids)), sorted(set(invalid_states))


def structural_components(world: World) -> list[set[tuple[int, int, int]]]:
    remaining = set(world.blocks)
    components = []
    while remaining:
        start = remaining.pop(); comp = {start}; queue = deque([start])
        while queue:
            x, y, z = queue.popleft()
            for nxt in ((x+1,y,z),(x-1,y,z),(x,y+1,z),(x,y-1,z),(x,y,z+1),(x,y,z-1)):
                if nxt in remaining:
                    remaining.remove(nxt); comp.add(nxt); queue.append(nxt)
        components.append(comp)
    return sorted(components, key=len, reverse=True)


def audit_world(world: World, jars: dict[str, Path], is_overlay: bool = False) -> dict[str, Any]:
    out_of_bounds = [p for p in world.blocks if not world.inside(*p)]
    invalid_ids, invalid_states = validate_registry(world.blocks.values(), jars)
    ids = Counter(block_id(s) for s in world.blocks.values())
    mod_ids = {k: v for k, v in ids.items() if not k.startswith("minecraft:")}
    cut_structure_contacts = [
        pos for pos, role in world.roles.items()
        if role not in {"road", "plaza"}
        and (pos[0] in {0, WIDTH - 1} or pos[1] == HEIGHT - 1 or pos[2] in {0, LENGTH - 1})
    ]
    building_boundary_violations = [
        building.name for building in world.buildings
        if building.footprint[0] <= 0 or building.footprint[1] >= WIDTH - 1
        or building.footprint[2] <= 0 or building.footprint[3] >= LENGTH - 1
    ]
    allowed_overlap_groups = [
        lambda a, b: a.startswith("Town Hall") and b.startswith("Town Hall"),
        lambda a, b: {a, b} == {"Arcanist library", "Arcanist observatory"},
        lambda a, b: {a, b} == {"Waystone transit pavilion", "Explorer lodge"},
    ]
    related_groups = allowed_overlap_groups + [
        lambda a, b: {a, b} == {"Warrior guildhall", "Warrior training yard"},
    ]
    unapproved_building_overlaps = []
    for index, first in enumerate(world.buildings):
        ax1, ax2, az1, az2 = first.footprint
        for second in world.buildings[index + 1:]:
            bx1, bx2, bz1, bz2 = second.footprint
            ix1, ix2 = max(ax1, bx1), min(ax2, bx2)
            iz1, iz2 = max(az1, bz1), min(az2, bz2)
            if ix1 <= ix2 and iz1 <= iz2:
                if not any(rule(first.name, second.name) for rule in allowed_overlap_groups):
                    unapproved_building_overlaps.append({
                        "first": first.name, "second": second.name,
                        "intersection": [ix1, ix2, iz1, iz2],
                    })
    building_clearances = []
    if not is_overlay:
        for index, first in enumerate(world.buildings):
            ax1, ax2, az1, az2 = first.footprint
            for second in world.buildings[index + 1:]:
                if any(rule(first.name, second.name) for rule in related_groups):
                    continue
                bx1, bx2, bz1, bz2 = second.footprint
                dx = max(bx1 - ax2 - 1, ax1 - bx2 - 1, 0)
                dz = max(bz1 - az2 - 1, az1 - bz2 - 1, 0)
                building_clearances.append({
                    "first": first.name, "second": second.name,
                    "clearance": round(math.hypot(dx, dz), 2),
                    "axis_gaps": [dx, dz],
                })
        building_clearances.sort(key=lambda item: item["clearance"])
    components = structural_components(world)
    floating = []
    isolated = []
    if not is_overlay:
        for comp in components:
            grounded = any(y <= 1 for _, y, _ in comp)
            if not grounded:
                floating.append({"size": len(comp), "sample": min(comp)})
            if len(comp) == 1:
                isolated.append(next(iter(comp)))
    create_floating = []
    if not is_overlay:
        comp_index = {pos: idx for idx, comp in enumerate(components) for pos in comp}
        grounded_components = {i for i, comp in enumerate(components) if any(y <= 1 for _, y, _ in comp)}
        for pos, s in world.blocks.items():
            if block_id(s).startswith(("create:", "createdeco:")) and comp_index[pos] not in grounded_components:
                create_floating.append(pos)
    npc_issues = []
    if not is_overlay:
        for npc in NPC_POSITIONS:
            x, y, z = npc["pos"]
            occupied = [
                (xx, yy, zz) for xx in range(x - 1, x + 2) for zz in range(z - 1, z + 2)
                for yy in (y, y + 1) if world.get(xx, yy, zz) != AIR
            ]
            missing_floor = [
                (xx, y - 1, zz) for xx in range(x - 1, x + 2) for zz in range(z - 1, z + 2)
                if world.get(xx, y - 1, zz) == AIR
            ]
            if occupied or missing_floor:
                npc_issues.append({"id": npc["id"], "occupied": occupied, "missing_floor": missing_floor})
    foundation_support_gaps = []
    unsupported_contact_blocks = []
    door_issues = []
    town_hall_navigation_unreachable = []
    if not is_overlay:
        required_cells = set(world.road_cells)
        for building in world.buildings:
            x1, x2, z1, z2 = building.footprint
            required_cells.update((x, z) for x in range(x1, x2 + 1) for z in range(z1, z2 + 1))
        for x, z in sorted(required_cells):
            missing_layers = [y for y in range(GROUND_Y) if world.get(x, y, z) == AIR]
            if missing_layers:
                foundation_support_gaps.append({"column": [x, z], "missing_layers": missing_layers})
        contact_roles = {
            "floor", "stall_floor", "waystone_floor", "forge_floor", "training_pad",
            "nether_court", "nether_approach", "market_square", "road", "plaza",
            "entrance_floor", "entrance_step", "yard_edge", "planter", "market_planter",
        }
        for (x, y, z), role in world.roles.items():
            if role in contact_roles and y > 0 and world.get(x, y - 1, z) == AIR:
                unsupported_contact_blocks.append([x, y, z, role])
        passable_suffixes = ("_pressure_plate", "_carpet")
        facing_vector = {"north": (0, -1), "south": (0, 1), "west": (-1, 0), "east": (1, 0)}
        for (x, y, z), block in world.blocks.items():
            if not block_id(block).endswith("_door") or block_properties(block).get("half") != "lower":
                continue
            identifier = block_id(block)
            upper = world.get(x, y + 1, z)
            issue: dict[str, Any] = {"position": [x, y, z], "block": block, "problems": []}
            if block_id(upper) != identifier or block_properties(upper).get("half") != "upper":
                issue["problems"].append("missing matching upper half")
            if world.get(x, y - 1, z) == AIR:
                issue["problems"].append("missing threshold floor")
            facing = block_properties(block).get("facing")
            if facing not in facing_vector:
                issue["problems"].append("invalid facing")
            else:
                dx, dz = facing_vector[facing]
                for label, sign in (("front", 1), ("back", -1)):
                    for yy in (y, y + 1):
                        adjacent = world.get(x + dx * sign, yy, z + dz * sign)
                        adjacent_id = block_id(adjacent)
                        if adjacent != AIR and not adjacent_id.endswith(passable_suffixes):
                            issue["problems"].append(f"blocked {label} at y={yy}: {adjacent}")
            if issue["problems"]:
                door_issues.append(issue)
        # Verify actual two-block-high circulation from the exterior Town Hall
        # threshold to every civic NPC reservation, including DecoCraft furniture.
        walk_y = GROUND_Y + 2
        passable_ids = ("_pressure_plate", "_carpet", "_door")
        def walkable(x: int, z: int) -> bool:
            if not (60 <= x <= 120 and 7 <= z <= 35):
                return False
            if world.get(x, walk_y - 1, z) == AIR:
                return False
            for yy in (walk_y, walk_y + 1):
                current = world.get(x, yy, z)
                if current != AIR and not block_id(current).endswith(passable_ids):
                    return False
            return True
        starts = [(89, 34), (90, 34)]
        reached = {pos for pos in starts if walkable(*pos)}
        queue = deque(reached)
        while queue:
            x, z = queue.popleft()
            for nxt in ((x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)):
                if nxt not in reached and walkable(*nxt):
                    reached.add(nxt); queue.append(nxt)
        for npc in NPC_POSITIONS[:3]:
            target = (npc["pos"][0], npc["pos"][2])
            if target not in reached:
                town_hall_navigation_unreachable.append({"id": npc["id"], "target": list(target)})
    roof_results = []
    if not is_overlay:
        for roof in world.roofs:
            missing = []
            for z in range(roof.z1, roof.z2 + 1):
                for x in range(roof.x1, roof.x2 + 1):
                    if (x, z) in roof.excluded: continue
                    covered = any(world.roles.get((x, y, z)) in {
                                      "roof", "portico_roof", "stall_roof", "chimney",
                                      "chimney_cap", "tower", "nether_roof"
                                  }
                                  for y in range(roof.min_y, HEIGHT))
                    if not covered: missing.append((x, z))
            total = (roof.x2 - roof.x1 + 1) * (roof.z2 - roof.z1 + 1) - len(roof.excluded)
            roof_results.append({"name": roof.name, "cells": total, "missing": len(missing), "samples": missing[:10]})
    # Road connectivity is evaluated on the 2D surface graph.
    disconnected_anchors = []
    road_component: set[tuple[int, int]] = set()
    if world.road_cells:
        start = next(iter(world.road_cells)); road_component.add(start); queue = deque([start])
        while queue:
            x, z = queue.popleft()
            for nxt in ((x+1,z),(x-1,z),(x,z+1),(x,z-1)):
                if nxt in world.road_cells and nxt not in road_component:
                    road_component.add(nxt); queue.append(nxt)
        disconnected_anchors = [name for name, pos in world.road_anchors.items() if pos not in road_component]
    # Exact planar clearance from the complete Nexus/mechanism footprint to building envelopes.
    distances = {}
    if world.nexus_cells:
        for building in world.buildings:
            x1, x2, z1, z2 = building.footprint
            cells = ((x, z) for x in range(x1, x2 + 1) for z in range(z1, z2 + 1))
            minimum = min(math.hypot(nx - x, nz - z) for x, z in cells for nx, nz in world.nexus_cells)
            distances[building.name] = round(minimum, 2)
    result = {
        "dimensions": [WIDTH, HEIGHT, LENGTH], "volume": WIDTH * HEIGHT * LENGTH,
        "non_air_blocks": len(world.blocks), "palette_states": len(set(world.blocks.values()) | {AIR}),
        "out_of_bounds": out_of_bounds, "invalid_registry_ids": invalid_ids,
        "invalid_blockstates": invalid_states,
        "cut_structure_contacts": cut_structure_contacts,
        "building_boundary_violations": building_boundary_violations,
        "unapproved_building_overlaps": unapproved_building_overlaps,
        "building_clearances": building_clearances,
        "minimum_unrelated_building_clearance": building_clearances[0]["clearance"] if building_clearances else None,
        "highest_occupied_y": max((y for _, y, _ in world.blocks), default=-1),
        "block_entities": 0, "entities": 0, "mod_blocks": dict(sorted(mod_ids.items())),
        "component_count": len(components), "largest_component": len(components[0]) if components else 0,
        "floating_components": floating, "isolated_blocks": isolated,
        "floating_create_blocks": create_floating, "roof_continuity": roof_results,
        "npc_clearance_issues": npc_issues,
        "foundation_support_gaps": foundation_support_gaps,
        "unsupported_contact_blocks": unsupported_contact_blocks,
        "door_issues": door_issues,
        "town_hall_navigation_unreachable": town_hall_navigation_unreachable,
        "road_cells": len(world.road_cells), "road_connected_cells": len(road_component),
        "disconnected_road_anchors": disconnected_anchors,
        "nexus_building_clearance": distances,
        "minimum_nexus_building_clearance": min(distances.values()) if distances else None,
    }
    return result


COLORS = {
    "air": (185, 220, 235), "road": (145, 143, 137), "plaza": (157, 157, 151),
    "roof": (63, 39, 31), "wood": (91, 54, 34), "stone": (91, 91, 96),
    "darkstone": (45, 43, 53), "copper": (82, 139, 123), "brass": (181, 143, 55),
    "cyan": (37, 170, 188), "purple": (132, 67, 168), "green": (67, 116, 63),
    "market": (207, 153, 73), "deco": (202, 133, 68), "other": (130, 116, 101),
}


def color_for(s: str, role: str = "") -> tuple[int, int, int]:
    i = block_id(s); text = i.lower()
    if role in ("road", "plaza"): return COLORS[role]
    if "roof" in role: return COLORS["roof"]
    if i.startswith("decocraft:"): return COLORS["deco"]
    if "cyan" in text or "blue_" in text or "sea_lantern" in text: return COLORS["cyan"]
    if "purple" in text or "amethyst" in text: return COLORS["purple"]
    if "copper" in text or "oxidized" in text or "weathered" in text: return COLORS["copper"]
    if "brass" in text: return COLORS["brass"]
    if any(k in text for k in ("leaves", "azalea", "moss")): return COLORS["green"]
    if any(k in text for k in ("planks", "log", "wood", "fence", "bookshelf")): return COLORS["wood"]
    if any(k in text for k in ("deepslate", "blackstone", "industrial_iron")): return COLORS["darkstone"]
    if any(k in text for k in ("stone", "andesite", "tuff", "calcite", "brick")): return COLORS["stone"]
    if "wool" in text: return COLORS["market"]
    return COLORS["other"]


class Raster:
    """Tiny RGB/PNG raster used when Pillow is not installed locally."""
    def __init__(self, width: int, height: int, background: tuple[int, int, int]):
        self.width = width
        self.height = height
        self.data = bytearray(background * (width * height))

    def pixel(self, x: int, y: int, color: tuple[int, int, int]) -> None:
        if 0 <= x < self.width and 0 <= y < self.height:
            index = (y * self.width + x) * 3
            self.data[index:index + 3] = bytes(color)

    def rectangle(self, box: tuple[int, int, int, int], fill: tuple[int, int, int] | None = None,
                  outline: tuple[int, int, int] | None = None, width: int = 1) -> None:
        x1, y1, x2, y2 = map(int, box)
        if fill is not None:
            for y in range(max(0, y1), min(self.height - 1, y2) + 1):
                for x in range(max(0, x1), min(self.width - 1, x2) + 1):
                    self.pixel(x, y, fill)
        if outline is not None:
            for offset in range(width):
                for x in range(x1 + offset, x2 - offset + 1):
                    self.pixel(x, y1 + offset, outline); self.pixel(x, y2 - offset, outline)
                for y in range(y1 + offset, y2 - offset + 1):
                    self.pixel(x1 + offset, y, outline); self.pixel(x2 - offset, y, outline)

    def polygon(self, points: list[tuple[int, int]], fill: tuple[int, int, int]) -> None:
        min_y = max(0, min(y for _, y in points)); max_y = min(self.height - 1, max(y for _, y in points))
        for y in range(min_y, max_y + 1):
            scan_y = y + 0.5
            intersections: list[float] = []
            for index, (x1, y1) in enumerate(points):
                x2, y2 = points[(index + 1) % len(points)]
                if y1 == y2:
                    continue
                if min(y1, y2) <= scan_y < max(y1, y2):
                    intersections.append(x1 + (scan_y - y1) * (x2 - x1) / (y2 - y1))
            intersections.sort()
            for left, right in zip(intersections[0::2], intersections[1::2]):
                for x in range(max(0, math.ceil(left)), min(self.width - 1, math.floor(right)) + 1):
                    self.pixel(x, y, fill)

    def save(self, path: Path) -> None:
        def chunk(kind: bytes, payload: bytes) -> bytes:
            return (struct.pack(">I", len(payload)) + kind + payload
                    + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF))
        raw = b"".join(
            b"\x00" + bytes(self.data[y * self.width * 3:(y + 1) * self.width * 3])
            for y in range(self.height)
        )
        png = (b"\x89PNG\r\n\x1a\n"
               + chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0))
               + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
        path.write_bytes(png)


def render_topdown(world: World, path: Path, scale: int = 6) -> None:
    if Image is not None:
        image = Image.new("RGB", (WIDTH * scale, LENGTH * scale), COLORS["air"])
        draw = ImageDraw.Draw(image)
    else:
        image = Raster(WIDTH * scale, LENGTH * scale, COLORS["air"])
        draw = image
    for z in range(LENGTH):
        for x in range(WIDTH):
            positions = [(y, world.get(x, y, z)) for y in range(HEIGHT - 1, -1, -1) if world.get(x, y, z) != AIR]
            if positions:
                y, s = positions[0]; c = color_for(s, world.roles.get((x, y, z), ""))
                shade = min(24, y)
                c = tuple(min(255, v + shade) for v in c)
                draw.rectangle((x*scale, z*scale, (x+1)*scale-1, (z+1)*scale-1), fill=c)
    for building in world.buildings:
        x1, x2, z1, z2 = building.footprint
        draw.rectangle((x1*scale, z1*scale, (x2+1)*scale-1, (z2+1)*scale-1), outline=(245,230,180), width=1)
    path.parent.mkdir(parents=True, exist_ok=True); image.save(path)


def render_isometric(world: World, path: Path, scale: int = 6,
                     flip_x: bool = False, flip_z: bool = False) -> None:
    if Image is not None:
        canvas = Image.new("RGB", ((WIDTH + LENGTH) * scale + 220, 1250), (190, 222, 235))
        draw = ImageDraw.Draw(canvas)
    else:
        canvas = Raster((WIDTH + LENGTH) * scale + 220, 1250, (190, 222, 235))
        draw = canvas
    ox, oy = LENGTH * scale + 110, 230
    exposed = []
    for (x, y, z), s in world.blocks.items():
        dx = -1 if flip_x else 1; dz = -1 if flip_z else 1
        if (world.get(x, y + 1, z) == AIR or world.get(x + dx, y, z) == AIR or world.get(x, y, z + dz) == AIR):
            tx = WIDTH - 1 - x if flip_x else x
            tz = LENGTH - 1 - z if flip_z else z
            exposed.append((tx + tz + y * 0.01, tx, y, tz, x, z, s))
    for _, tx, y, tz, x, z, s in sorted(exposed):
        sx = ox + (tx - tz) * scale
        sy = oy + (tx + tz) * scale // 2 - y * scale
        c = color_for(s, world.roles.get((x, y, z), ""))
        top = tuple(min(255, v + 28) for v in c)
        left = tuple(max(0, int(v * .72)) for v in c)
        right = tuple(max(0, int(v * .86)) for v in c)
        draw.polygon([(sx,sy),(sx+scale,sy+scale//2),(sx,sy+scale),(sx-scale,sy+scale//2)], fill=top)
        draw.polygon([(sx-scale,sy+scale//2),(sx,sy+scale),(sx,sy+2*scale),(sx-scale,sy+3*scale//2)], fill=left)
        draw.polygon([(sx+scale,sy+scale//2),(sx,sy+scale),(sx,sy+2*scale),(sx+scale,sy+3*scale//2)], fill=right)
    path.parent.mkdir(parents=True, exist_ok=True); canvas.save(path)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_backups(output_dir: Path) -> None:
    for name, expected in {**V4_HASHES, **V5_HASHES}.items():
        path = output_dir / name
        if not path.is_file(): raise FileNotFoundError(f"Required backup missing: {path}")
        actual = sha256(path)
        if actual != expected: raise RuntimeError(f"Backup hash changed: {name}: {actual}")


def validate_serialized(path: Path, expected_non_air: int) -> dict[str, Any]:
    nbt = parse_schematic(path)
    palette = nbt["Palette"]
    indices = decode_varints(nbt["BlockData"])
    errors = []
    if [nbt["Width"], nbt["Height"], nbt["Length"]] != [WIDTH, HEIGHT, LENGTH]: errors.append("dimensions")
    if nbt["DataVersion"] != DATA_VERSION: errors.append("DataVersion")
    if len(indices) != WIDTH * HEIGHT * LENGTH: errors.append("BlockData volume")
    if set(palette.values()) != set(range(len(palette))): errors.append("palette indices")
    if any(i not in set(palette.values()) for i in indices): errors.append("unknown palette index")
    reverse = {v: k for k, v in palette.items()}
    non_air = sum(reverse[i] != AIR for i in indices)
    if non_air != expected_non_air: errors.append(f"non-air {non_air}!={expected_non_air}")
    if nbt["Entities"]: errors.append("entities")
    if nbt["BlockEntities"]: errors.append("block entities")
    if any(block_id(s) == "waystones:waystone" for s in palette): errors.append("waystone")
    if any(s.startswith("minecraft:cauldron[") for s in palette): errors.append("invalid cauldron state")
    return {
        "file": path.name, "bytes": path.stat().st_size, "sha256": sha256(path),
        "gzip_nbt": True, "data_version": nbt["DataVersion"], "palette": len(palette),
        "block_data_indices": len(indices), "non_air_blocks": non_air,
        "block_entities": len(nbt["BlockEntities"]), "entities": len(nbt["Entities"]),
        "errors": errors,
    }


def write_reports(repo: Path, audits: dict[str, Any], serialized: list[dict[str, Any]],
                  v4_before: dict[str, str], v5_before: dict[str, str],
                  preview_paths: list[Path]) -> tuple[Path, Path]:
    generated = repo / "generated" / "schematics"
    json_path = generated / "nexus_market_spawn_nexus_realms_v6_audit.json"
    report = {
        "version": "V6", "data_version": DATA_VERSION, "audits": audits,
        "serialized": serialized, "v4_backup_hashes": v4_before,
        "v5_backup_hashes": v5_before,
        "waystone_insert_position": [145, 14, 36],
        "nexus_center": list(NEXUS_CENTER),
        "ground_surface_y": GROUND_Y,
    }
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md_path = repo / "docs" / "hub" / "nexus-market-v6-audit.md"
    base = audits["base"]; combined = audits["combined"]
    mod_rows = "\n".join(f"| `{k}` | {v} |" for k, v in combined["mod_blocks"].items())
    roof_rows = "\n".join(f"| {r['name']} | {r['cells']} | {r['missing']} |" for r in base["roof_continuity"])
    clearance_rows = "\n".join(f"| {k} | {v:.2f} |" for k, v in sorted(base["nexus_building_clearance"].items()))
    npc_rows = "\n".join(
        f"| `{npc['id']}` | {npc['name']} | {npc['pos'][0]} | {npc['pos'][1]} | {npc['pos'][2]} | {npc['facing']} | {npc['zone']} |"
        for npc in NPC_POSITIONS
    )
    files_rows = "\n".join(f"| `{r['file']}` | {r['bytes']} | {r['palette']} | {r['non_air_blocks']} | `{r['sha256']}` |" for r in serialized)
    text = f"""# Nexus Market V6 — auditoría local

## Archivos generados

| Archivo | Bytes | Palette | Bloques no aire | SHA-256 |
|---|---:|---:|---:|---|
{files_rows}

Los tres archivos V4 y los tres V5 se conservaron con sus hashes originales. El overlay V6 contiene aire fuera de sus props y debe pegarse con `//paste -a`; el combined incluye base + DecoCraft.

## Geometría

- Dimensiones: `{WIDTH} × {HEIGHT} × {LENGTH}` (`{WIDTH*HEIGHT*LENGTH}` posiciones).
- Offset NBT: `{OFFSET}`; WEOffset: `{WE_OFFSET}`.
- Centro del Nexus: `{NEXUS_CENTER[0]},{NEXUS_CENTER[1]}`.
- Superficie del terreno incluido: `y={GROUND_Y}`; cimentación continua hasta `y=0`.
- Waystone reservado, no incluido: `WAYSTONE_INSERT_POSITION = 145,14,36`.
- Bloques fuera de límites: `{len(base['out_of_bounds'])}`.
- Estructuras cortadas en límites: `{len(base['cut_structure_contacts'])}`.
- Edificios que alcanzan un límite del schematic: `{len(base['building_boundary_violations'])}`.
- Solapes no aprobados entre edificios: `{len(base['unapproved_building_overlaps'])}`.
- Distancia mínima entre edificios no relacionados: `{base['minimum_unrelated_building_clearance']:.2f}` bloques.
- Columnas sin cimentación continua: `{len(base['foundation_support_gaps'])}`.
- Suelos o accesos sin apoyo inferior: `{len(base['unsupported_contact_blocks'])}`.
- Puertas incompletas o bloqueadas: `{len(base['door_issues'])}`.
- Destinos interiores del Ayuntamiento inaccesibles desde la entrada: `{len(base['town_hall_navigation_unreachable'])}`.
- Componentes flotantes detectables: `{len(combined['floating_components'])}`.
- Bloques aislados: `{len(combined['isolated_blocks'])}`.
- Bloques Create/Create Deco flotantes: `{len(combined['floating_create_blocks'])}`.
- Anclas de caminos desconectadas: `{len(base['disconnected_road_anchors'])}`.
- Distancia mínima Nexus–edificio: `{base['minimum_nexus_building_clearance']:.2f}` bloques.
- BlockEntities: `0`; Entities: `0`.
- IDs inválidos contra JARs locales: `{len(combined['invalid_registry_ids'])}`.
- Blockstates inválidos contra recursos locales: `{len(combined['invalid_blockstates'])}`.
- Colisiones overlay/base no aprobadas: `{len(audits['overlay']['unapproved_base_collisions'])}`.
- Reservas NPC con problemas de espacio o suelo: `{len(combined['npc_clearance_issues'])}`.

## Continuidad de cubiertas

| Estructura | Celdas auditadas | Sin cubierta |
|---|---:|---:|
{roof_rows}

## Separación del Nexus

| Edificio | Distancia mínima |
|---|---:|
{clearance_rows}

## Bloques de mods

| Registry ID | Cantidad |
|---|---:|
{mod_rows}

## Posiciones NPC reservadas

| ID | Nombre | x | y | z | Orientación | Zona |
|---|---|---:|---:|---:|---|---|
{npc_rows}

FramedBlocks no se serializó: sus formas necesitan BlockEntities de material/camouflage para verse correctamente y no se introdujeron placeholders opacos o potencialmente invisibles. Create Deco se usa solo en soportes, metal estructural e iluminación conectada físicamente.

## Resultado automático

- Gzip/NBT, dimensiones, DataVersion, Palette, BlockData y recuentos: válidos.
- `Entities = 0`; `BlockEntities = 0`.
- Sin Waystone funcional ni `minecraft:cauldron[level=0]`.
- Sin IDs ausentes en los JARs locales de Minecraft, Create, Create Deco y DecoCraft.
- Overlay DecoCraft limitado a la lista local de seguridad alta y sin las 28 loot tables defectuosas.
- Caminos principales conectados y cubiertas cerradas según proyección vertical.
- Ayuntamiento con puertas dobles funcionales, umbral, controles y circulación interior auditada.
- Crying obsidian integrado en Nexus y portal como fuente de partículas nativas sin entidades.
"""
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(text, encoding="utf-8")
    return json_path, md_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--instance", type=Path, required=True)
    parser.add_argument("--preview-dir", type=Path, required=True)
    args = parser.parse_args()
    repo = args.repo.resolve(); output = repo / "generated" / "schematics"
    verify_backups(output)
    v4_before = {name: sha256(output / name) for name in V4_HASHES}
    v5_before = {name: sha256(output / name) for name in V5_HASHES}
    jars = locate_jars(args.instance.resolve())

    base = build_base(); overlay = build_overlay(); combined = combine(base, overlay)
    audits = {
        "base": audit_world(base, jars),
        "overlay": audit_world(overlay, jars, is_overlay=True),
        "combined": audit_world(combined, jars),
    }
    overlay_collisions = [
        {
            "position": list(pos), "overlay": block, "base": base.blocks[pos],
            "base_role": base.roles.get(pos),
        }
        for pos, block in sorted(overlay.blocks.items()) if pos in base.blocks
    ]
    unapproved_overlay_collisions = [
        item for item in overlay_collisions if item["base_role"] != "light"
    ]
    audits["overlay"]["base_collisions"] = overlay_collisions
    audits["overlay"]["unapproved_base_collisions"] = unapproved_overlay_collisions
    hard_failures = []
    for name in ("base", "combined"):
        audit = audits[name]
        for key in ("out_of_bounds", "invalid_registry_ids", "invalid_blockstates",
                    "cut_structure_contacts", "building_boundary_violations",
                    "unapproved_building_overlaps", "floating_components", "npc_clearance_issues",
                    "isolated_blocks", "floating_create_blocks", "disconnected_road_anchors",
                    "foundation_support_gaps", "unsupported_contact_blocks", "door_issues",
                    "town_hall_navigation_unreachable"):
            if audit[key]: hard_failures.append(f"{name}:{key}={audit[key][:10]}")
        missing_roofs = [r for r in audit["roof_continuity"] if r["missing"]]
        if missing_roofs: hard_failures.append(f"{name}:roof_gaps={missing_roofs}")
    if audits["base"]["minimum_nexus_building_clearance"] < 10:
        hard_failures.append("Nexus clearance below 10 blocks")
    if audits["base"]["minimum_unrelated_building_clearance"] < 8:
        hard_failures.append("Unrelated building clearance below 8 blocks")
    if unapproved_overlay_collisions:
        hard_failures.append(f"overlay:unapproved_base_collisions={unapproved_overlay_collisions}")
    overlay_ids = {block_id(s).split(":", 1)[1] for s in overlay.blocks.values()}
    if not overlay_ids <= SAFE_DECOCRAFT_IDS: hard_failures.append("unsafe DecoCraft IDs")
    if overlay_ids & BROKEN_DECOCRAFT_IDS: hard_failures.append("broken DecoCraft loot table ID")
    if hard_failures:
        print(json.dumps(audits, indent=2, ensure_ascii=False))
        raise RuntimeError("Audit failed before serialization:\n" + "\n".join(hard_failures))

    paths = {
        "base": output / "nexus_market_spawn_nexus_realms_v6_base.schem",
        "overlay": output / "nexus_market_spawn_nexus_realms_v6_decocraft.schem",
        "combined": output / "nexus_market_spawn_nexus_realms_v6.schem",
    }
    for key, path in paths.items():
        write_schematic({"base": base, "overlay": overlay, "combined": combined}[key], path)
    serialized = [validate_serialized(paths[key], len(world.blocks)) for key, world in
                  (("base", base), ("overlay", overlay), ("combined", combined))]
    if any(item["errors"] for item in serialized):
        raise RuntimeError("Serialized schematic validation failed: " + repr(serialized))
    # Orthographic controls are temporary review assets, not pack content.
    args.preview_dir.mkdir(parents=True, exist_ok=True)
    previews = [
        args.preview_dir / "nexus_market_v6_topdown.png",
        args.preview_dir / "nexus_market_v6_isometric.png",
        args.preview_dir / "nexus_market_v6_isometric_opposite.png",
    ]
    render_topdown(combined, previews[0]); render_isometric(combined, previews[1])
    render_isometric(combined, previews[2], flip_x=True, flip_z=True)
    report_paths = write_reports(repo, audits, serialized, v4_before, v5_before, previews)
    verify_backups(output)
    result = {
        "files": [str(p) for p in paths.values()], "reports": [str(p) for p in report_paths],
        "previews": [str(p) for p in previews], "audits": audits, "serialized": serialized,
        "v4_hashes": v4_before, "v5_hashes": v5_before,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
