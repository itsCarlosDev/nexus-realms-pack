#!/usr/bin/env python3
"""Generate and audit Nexus Market V5 schematics from verified local assets.

The generator intentionally keeps DecoCraft in a separate air-heavy overlay.
It uses no entities and no block entities.  V4 files are hash-guarded and are
never opened for writing.
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
from collections import Counter, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Iterator

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT, LENGTH = 135, 61, 103
DATA_VERSION = 3465
OFFSET = [-8468, 67, -4935]
WE_OFFSET = [-15, 0, -50]
AIR = "minecraft:air"

V4_HASHES = {
    "nexus_market_spawn_nexus_realms_v4.schem": "adfd40b53db4a543e32248541427449f52e102ebb920e88bc1cb7d4084de2b2c",
    "nexus_market_spawn_nexus_realms_v4_base.schem": "a5e187bad7f36ae3f2b93dbdc86dfafe709f97248c23b6725806e1fc0cbaaadf",
    "nexus_market_spawn_nexus_realms_v4_decocraft.schem": "7ca2becc6d968b6857f18922e7f9a60457b30a19bdbd73a808e87c9b68b2ed14",
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
    {"id": "nexus_custodian", "name": "Custodio del Nexus", "pos": [68, 2, 15], "facing": "south", "zone": "Ayuntamiento / hall"},
    {"id": "chronicler", "name": "Cronista", "pos": [48, 2, 18], "facing": "east", "zone": "Ayuntamiento / archivo"},
    {"id": "guard_captain", "name": "Capitán de la Guardia", "pos": [88, 2, 18], "facing": "west", "zone": "Ayuntamiento / táctica"},
    {"id": "warrior_master", "name": "Maestro Guerrero", "pos": [24, 2, 25], "facing": "south", "zone": "Gremio Guerrero"},
    {"id": "arcane_master", "name": "Maestro Arcanista", "pos": [41, 2, 86], "facing": "east", "zone": "Biblioteca Arcanista"},
    {"id": "metallurgist_master", "name": "Maestro Metalomante", "pos": [78, 2, 94], "facing": "north", "zone": "Taller Metalomante"},
    {"id": "gunsmith", "name": "Armero", "pos": [116, 2, 80], "facing": "west", "zone": "Armería Pistolero"},
    {"id": "explorer", "name": "Explorador", "pos": [110, 2, 36], "facing": "west", "zone": "Lodge Explorador"},
    {"id": "nexus_merchant", "name": "Mercader del Nexus", "pos": [100, 2, 45], "facing": "east", "zone": "Mercado este"},
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
    for (px, pz), hinge in zip(positions, ("left", "right")):
        w.set(px, y, pz, door_state(block, facing, "lower", hinge), "door")
        w.set(px, y + 1, pz, door_state(block, facing, "upper", hinge), "door")


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
    cx, cz = 68, 52
    # Main connected circulation spine.
    road_rect(w, 64, 0, 72, 31)
    road_rect(w, 64, 73, 72, 102)
    road_rect(w, 0, 48, 46, 56)
    road_rect(w, 90, 48, 134, 56)
    road_rect(w, 62, 26, 74, 34)
    road_rect(w, 62, 70, 74, 79)
    # Plaza is broad and intentionally low: no stalls inside radius 22.
    for z in range(cz - 22, cz + 23):
        for x in range(cx - 22, cx + 23):
            d = math.hypot(x - cx, z - cz)
            if d <= 22.35:
                mat = patterned_stone(x, z)
                if 20.6 <= d <= 22.35:
                    mat = "minecraft:polished_andesite"
                elif 13.6 <= d <= 14.6:
                    mat = "minecraft:polished_deepslate"
                w.set(x, 0, z, mat, "plaza")
                w.road_cells.add((x, z))
    # District links, all tied into the central component.
    links = [
        ((37, 35), (57, 38)), ((98, 34), (83, 39)), ((48, 76), (55, 68)),
        ((77, 80), (74, 73)), ((105, 70), (90, 62)), ((18, 83), (48, 76)),
        ((111, 45), (91, 48)),
    ]
    for a, b in links:
        road_line(w, a, b, 3)
    w.road_anchors = {
        "north_gate": (68, 1), "town_hall": (68, 31), "warrior": (37, 35),
        "waystone": (98, 34), "west_gate": (1, 52), "east_gate": (133, 52),
        "arcanist": (48, 76), "metallurgist": (77, 80), "gunsmith": (105, 70),
        "nether": (18, 83), "south_gate": (68, 101),
    }
    # Four formal seating gardens outside the inner circulation ring.
    for gx, gz in ((51, 35), (85, 35), (51, 69), (85, 69)):
        w.fill(gx - 2, 0, gz - 1, gx + 2, 0, gz + 1, "minecraft:coarse_dirt", "planter")
        for x in range(gx - 2, gx + 3):
            w.set(x, 1, gz, "minecraft:azalea_leaves", "landscape")
        w.set(gx, 1, gz - 2, stair("minecraft:dark_oak_stairs", "south"), "bench")
        w.set(gx, 1, gz + 2, stair("minecraft:dark_oak_stairs", "north"), "bench")
        w.set(gx, 0, gz - 2, "minecraft:stone_bricks", "bench_base")
        w.set(gx, 0, gz + 2, "minecraft:stone_bricks", "bench_base")


def build_nexus(w: World) -> None:
    cx, cz = 68, 52
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
    for x, y, z in ((64, 4, 54), (65, 4, 55), (72, 4, 49)):
        w.set(x, y, z, "minecraft:amethyst_block", "crystal_growth")
        w.set(x, y + 1, z, state("minecraft:amethyst_cluster", facing="up", waterlogged=False), "crystal_growth")

    # Four grounded containment pylons; each has base, column, cap and inward arm.
    pylons = [
        (57, 52, "east"), (79, 52, "west"), (68, 41, "south"), (68, 63, "north"),
    ]
    for px, pz, inward in pylons:
        w.fill(px - 1, 1, pz - 1, px + 1, 2, pz + 1, "minecraft:polished_blackstone_bricks", "containment_base")
        w.set(px, 3, pz, "create:andesite_casing", "containment")
        for y in range(4, 10):
            w.set(px, y, pz, support("andesite", "up"), "containment")
        w.set(px, 10, pz, "create:brass_casing", "containment")
        w.set(px, 11, pz, deco_lamp("blue", "brass", "up"), "containment_light")
        # Braced legs make the load path visually explicit.
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            w.set(px + dx, 3, pz + dz, support("copper", "up"), "containment_brace")
            w.set(px + dx, 4, pz + dz, "create:copper_casing", "containment_brace")
        # Arm begins at the cap and terminates before the shard, never floating independently.
        dx, dz = {"east": (1, 0), "west": (-1, 0), "south": (0, 1), "north": (0, -1)}[inward]
        length = 7
        for i in range(1, length + 1):
            facing = inward
            w.set(px + dx * i, 9, pz + dz * i, support("brass", facing), "containment_arm")
        ax, az = px + dx * length, pz + dz * length
        w.set(ax, 8, az, deco_lamp("blue", "copper", "up"), "containment_light")
    # Embedded copper circuit around the dais, with four cardinal nodes.
    ring_points: list[tuple[int, int]] = []
    for z in range(cz - 10, cz + 11):
        for x in range(cx - 10, cx + 11):
            d = math.hypot(x - cx, z - cz)
            if 9.45 <= d <= 10.35:
                ring_points.append((x, z))
    for x, z in ring_points:
        w.set(x, 1, z, sheet("copper", "y"), "containment_circuit")
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
    # Grand south entrance and deep portico.
    for x in range(64, 73):
        for y in (2, 3, 4):
            w.remove(x, y, 30)
    place_double_door(w, 67, 2, 30, "south", "x")
    for x in (62, 74):
        w.vertical(x, 31, 1, 7, "minecraft:polished_blackstone_bricks", "portico")
        w.set(x, 8, 31, "create:brass_casing", "portico")
    w.fill(62, 8, 29, 74, 8, 31, "minecraft:deepslate_tiles", "portico_roof")
    # Windows and exterior depth on every wing.
    add_windows(w, 53, 7, 83, 28, 10)
    add_windows(w, 40, 10, 54, 25, 8)
    add_windows(w, 82, 10, 96, 25, 8)
    # Interior zoning: archive west, tactical east, open central hall and dais.
    w.fill(55, 2, 9, 55, 6, 25, "minecraft:stripped_dark_oak_log", "interior_partition")
    w.fill(81, 2, 9, 81, 6, 25, "minecraft:stripped_dark_oak_log", "interior_partition")
    for z in (11, 16, 21):
        w.fill(43, 2, z, 51, 4, z, "minecraft:bookshelf", "archive")
        w.fill(85, 2, z, 93, 2, z, "minecraft:dark_oak_planks", "tactical_bench")
    w.fill(63, 2, 10, 73, 2, 13, "minecraft:polished_blackstone_bricks", "custodian_dais")
    w.fill(64, 3, 11, 72, 3, 12, "minecraft:dark_oak_planks", "custodian_dais")
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
    place_double_door(w, 108, 2, 31, "north", "x", "minecraft:spruce_door")
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
    # Remote, self-contained portal shrine at the south-west edge.
    w.add_building("Nether transit shrine", (4, 19, 76, 95), "utility")
    w.fill(4, 0, 76, 19, 0, 95, "minecraft:polished_blackstone_bricks", "nether_court")
    for x, z in ((5, 77), (18, 77), (5, 94), (18, 94)):
        w.fill(x - 1, 1, z - 1, x + 1, 2, z + 1, "minecraft:blackstone", "nether_pillar_base")
        w.vertical(x, z, 3, 8, "minecraft:polished_blackstone_bricks", "nether_pillar")
        w.set(x, 9, z, lantern(soul=True), "nether_light")
    # Portal frame and restrained vaulted canopy.
    w.fill(9, 1, 83, 9, 7, 83, "minecraft:obsidian", "nether_portal")
    w.fill(14, 1, 83, 14, 7, 83, "minecraft:obsidian", "nether_portal")
    w.fill(9, 1, 83, 14, 1, 83, "minecraft:obsidian", "nether_portal")
    w.fill(9, 7, 83, 14, 7, 83, "minecraft:obsidian", "nether_portal")
    w.fill(10, 2, 83, 13, 6, 83, state("minecraft:nether_portal", axis="x"), "nether_portal")
    for d in range(0, 5):
        y = 9 + d
        w.fill(4 + d, y, 76, 19 - d, y, 76, "minecraft:polished_blackstone_bricks", "nether_roof")
        w.fill(4 + d, y, 95, 19 - d, y, 95, "minecraft:polished_blackstone_bricks", "nether_roof")
    w.fill(4, 9, 76, 4, 9, 95, "minecraft:polished_blackstone_bricks", "nether_roof")
    w.fill(19, 9, 76, 19, 9, 95, "minecraft:polished_blackstone_bricks", "nether_roof")


def build_market_stall(w: World, name: str, x1: int, z1: int, x2: int, z2: int,
                       canopy: str) -> None:
    w.add_building(name, (x1, x2, z1, z2), "market")
    w.fill(x1, 1, z1, x2, 1, z2, "minecraft:spruce_planks", "stall_floor")
    for x, z in ((x1, z1), (x2, z1), (x1, z2), (x2, z2)):
        w.vertical(x, z, 2, 5, log("minecraft:stripped_dark_oak_log"), "stall_post")
    # Complete pitched canopy, fully supported at four corners.
    mid = (z1 + z2) // 2
    for z in range(z1 - 1, z2 + 2):
        y = 6 + min(z - (z1 - 1), (z2 + 1) - z)
        for x in range(x1 - 1, x2 + 2):
            w.set(x, y, z, canopy, "stall_roof")
        for x in (x1, x2):
            for sy in range(6, y):
                w.set(x, sy, z, log("minecraft:stripped_dark_oak_log"), "roof_support")
    w.fill(x1, 5, z1 - 1, x2, 5, z1 - 1, log("minecraft:stripped_dark_oak_log", "x"), "roof_support")
    w.fill(x1, 5, z2 + 1, x2, 5, z2 + 1, log("minecraft:stripped_dark_oak_log", "x"), "roof_support")
    w.roofs.append(RoofSection(name, x1, x2, z1, z2, 6))
    w.fill(x1 + 1, 2, z1 + 1, x2 - 1, 2, z1 + 1, "minecraft:dark_oak_planks", "counter")
    for x in range(x1 + 2, x2, 3):
        w.set(x, 3, z1 + 1, trapdoor("minecraft:dark_oak_trapdoor", "south", "top"), "counter_detail")


def build_market(w: World) -> None:
    stalls = [
        ("West spice market", 30, 41, 43, 47, "minecraft:orange_wool"),
        ("West provisions market", 30, 58, 43, 64, "minecraft:white_wool"),
        ("East textile market", 93, 41, 106, 47, "minecraft:cyan_wool"),
        ("East produce market", 93, 58, 106, 64, "minecraft:yellow_wool"),
    ]
    for args in stalls:
        build_market_stall(w, *args)
    # Chains for the four market overlay lanterns reach their canopies.
    for x, z in ((36, 44), (36, 61), (99, 44), (99, 61)):
        for y in range(6, 10):
            w.set(x, y, z, chain(), "light_support")
    # Explorer and gunsmith ceiling anchors for overlay lighting.
    w.fill(103, 8, 39, 126, 8, 39, log("minecraft:stripped_dark_oak_log", "x"), "tie_beam")
    w.fill(103, 7, 78, 129, 7, 78, log("minecraft:stripped_dark_oak_log", "x"), "tie_beam")


def add_street_furniture(w: World) -> None:
    # Grounded lamp posts at deliberate intervals, never in the monument sight lines.
    posts = [
        (61, 35), (75, 35), (45, 45), (45, 59), (91, 45), (91, 59),
        (60, 72), (76, 72), (50, 78), (94, 70), (68, 83), (68, 96),
    ]
    for x, z in posts:
        w.set(x, 1, z, "minecraft:polished_blackstone_bricks", "lamp_base")
        w.vertical(x, z, 2, 4, "minecraft:polished_blackstone_wall", "lamp_post")
        w.set(x, 5, z, lantern(), "street_light")


def build_base() -> World:
    w = World("base")
    build_ground_and_roads(w)
    build_nexus(w)
    build_town_hall(w)
    build_warrior(w)
    build_waystone_and_explorer(w)
    build_arcanist(w)
    build_metallurgist(w)
    build_gunsmith(w)
    build_nether_shrine(w)
    build_market(w)
    add_street_furniture(w)
    return w


def build_overlay() -> World:
    w = World("decocraft")
    # Town Hall: furniture follows room zoning and never blocks the central aisle.
    placements: list[tuple[int, int, int, str]] = [
        (58, 2, 23, deco("modular_desk_plank_spruce", "south")),
        (62, 2, 23, deco("modular_desk_plank_spruce", "south")),
        (74, 2, 23, deco("modular_desk_plank_spruce", "south")),
        (78, 2, 23, deco("modular_desk_plank_spruce", "south")),
        (58, 2, 21, deco("office_chair_spruce", "north")),
        (78, 2, 21, deco("office_chair_spruce", "north")),
        (43, 2, 12, deco("filing_cabinet_spruce", "east")),
        (43, 2, 18, deco("filing_cabinet_spruce", "east")),
        (43, 2, 24, deco("filing_cabinet_spruce", "east")),
        (57, 2, 10, deco("grandfather_clock", "east")),
        (58, 3, 23, deco("typewriter_black", "south")),
        (52, 4, 18, deco("world_map", "east")),
        (89, 2, 24, deco("globe_antique", "west")),
        (60, 7, 20, deco("stained_glass_chandelier_embers_on", "north")),
        (68, 7, 20, deco("stained_glass_chandelier_embers_on", "north")),
        (76, 7, 20, deco("stained_glass_chandelier_embers_on", "north")),
        # Warrior district.
        (14, 1, 42, deco("trainingdummy", "south")),
        (20, 1, 42, deco("trainingdummy", "south")),
        (26, 1, 42, deco("trainingdummy", "south")),
        (13, 3, 25, deco("hanging_armorer", "east")),
        (22, 3, 16, deco("hanging_shield", "north")),
        (29, 3, 16, deco("hanging_swords", "north")),
        # Arcanist.
        (31, 3, 73, deco("hanging_magic", "north")),
        (38, 3, 82, deco("crystal_ball", "east")),
        (48, 3, 82, deco("crystal_ball", "west")),
        (37, 7, 84, deco("stained_glass_hanging_lamp_embers_on", "north")),
        # Explorer and Waystone station.
        (125, 3, 34, deco("world_map", "west")),
        (114, 2, 36, deco("globe", "west")),
        (120, 2, 36, deco("globe_antique", "east")),
        (112, 2, 36, deco("backpack_green", "south")),
        (105, 3, 32, deco("hanging_camping", "north")),
        # Merchant instruments are integrated into the east market counters.
        (100, 3, 42, deco("vintage_cash_register", "south")),
        (100, 3, 59, deco("vintage_cash_register", "north")),
    ]
    # Four coherent market groups; every prop sits on a floor or counter.
    market = [
        (32, 2, 43, "fruit_cart", "south"), (36, 2, 43, "barrel_apples_mix", "south"),
        (40, 2, 43, "baguette_basket", "south"), (34, 3, 42, "hanging_produce", "south"),
        (32, 2, 60, "display_counter_bottom_oak", "north"),
        (32, 3, 60, "display_counter_top_pastries", "north"),
        (38, 2, 60, "barrel_carrots", "north"), (41, 2, 60, "baguette_basket", "north"),
        (95, 2, 43, "fruit_cart", "south"), (100, 2, 43, "barrel_apples_mix", "south"),
        (104, 2, 43, "barrel_carrots", "south"), (97, 3, 42, "hanging_produce", "south"),
        (95, 2, 60, "display_counter_bottom_oak", "north"),
        (95, 3, 60, "display_counter_top_pastries", "north"),
        (101, 2, 60, "barrel_apples_mix", "north"), (103, 3, 59, "hanging_produce", "north"),
    ]
    for x, y, z, prop, facing in market:
        placements.append((x, y, z, deco(prop, facing)))
    # Warm lighting under every complete market roof and selected civic exteriors.
    for x, y, z in ((36, 5, 44), (36, 5, 61), (99, 5, 44), (99, 5, 61),
                    (47, 7, 17), (89, 7, 17), (108, 7, 39), (122, 6, 78)):
        placements.append((x, y, z, deco("paper_lantern_1_cream", "north")))
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
            "Name": (TAG_STRING, "Nexus Market V5"),
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
        "highest_occupied_y": max((y for _, y, _ in world.blocks), default=-1),
        "block_entities": 0, "entities": 0, "mod_blocks": dict(sorted(mod_ids.items())),
        "component_count": len(components), "largest_component": len(components[0]) if components else 0,
        "floating_components": floating, "isolated_blocks": isolated,
        "floating_create_blocks": create_floating, "roof_continuity": roof_results,
        "npc_clearance_issues": npc_issues,
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


def render_topdown(world: World, path: Path, scale: int = 6) -> None:
    image = Image.new("RGB", (WIDTH * scale, LENGTH * scale), COLORS["air"])
    draw = ImageDraw.Draw(image)
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
    canvas = Image.new("RGB", ((WIDTH + LENGTH) * scale + 220, 1250), (190, 222, 235))
    draw = ImageDraw.Draw(canvas)
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


def verify_v4_backups(output_dir: Path) -> None:
    for name, expected in V4_HASHES.items():
        path = output_dir / name
        if not path.is_file(): raise FileNotFoundError(f"Required V4 backup missing: {path}")
        actual = sha256(path)
        if actual != expected: raise RuntimeError(f"V4 backup hash changed: {name}: {actual}")


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
                  v4_before: dict[str, str], preview_paths: list[Path]) -> tuple[Path, Path]:
    generated = repo / "generated" / "schematics"
    json_path = generated / "nexus_market_spawn_nexus_realms_v5_audit.json"
    report = {
        "version": "V5", "data_version": DATA_VERSION, "audits": audits,
        "serialized": serialized, "v4_backup_hashes": v4_before,
        "waystone_insert_position": [109, 4, 24],
        "nexus_center": [68, 52],
    }
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md_path = repo / "docs" / "hub" / "nexus-market-v5-audit.md"
    base = audits["base"]; combined = audits["combined"]
    mod_rows = "\n".join(f"| `{k}` | {v} |" for k, v in combined["mod_blocks"].items())
    roof_rows = "\n".join(f"| {r['name']} | {r['cells']} | {r['missing']} |" for r in base["roof_continuity"])
    clearance_rows = "\n".join(f"| {k} | {v:.2f} |" for k, v in sorted(base["nexus_building_clearance"].items()))
    npc_rows = "\n".join(
        f"| `{npc['id']}` | {npc['name']} | {npc['pos'][0]} | {npc['pos'][1]} | {npc['pos'][2]} | {npc['facing']} | {npc['zone']} |"
        for npc in NPC_POSITIONS
    )
    files_rows = "\n".join(f"| `{r['file']}` | {r['bytes']} | {r['palette']} | {r['non_air_blocks']} | `{r['sha256']}` |" for r in serialized)
    text = f"""# Nexus Market V5 — auditoría local

## Archivos generados

| Archivo | Bytes | Palette | Bloques no aire | SHA-256 |
|---|---:|---:|---:|---|
{files_rows}

Los tres archivos V4 se conservaron con sus hashes originales. El overlay V5 contiene aire fuera de sus props y debe pegarse con `//paste -a`; el combined incluye base + DecoCraft.

## Geometría

- Dimensiones: `{WIDTH} × {HEIGHT} × {LENGTH}` (`{WIDTH*HEIGHT*LENGTH}` posiciones).
- Offset NBT: `{OFFSET}`; WEOffset: `{WE_OFFSET}`.
- Centro del Nexus: `68,52`.
- Waystone reservado, no incluido: `WAYSTONE_INSERT_POSITION = 109,4,24`.
- Bloques fuera de límites: `{len(base['out_of_bounds'])}`.
- Estructuras cortadas en límites: `{len(base['cut_structure_contacts'])}`.
- Edificios que alcanzan un límite del schematic: `{len(base['building_boundary_violations'])}`.
- Solapes no aprobados entre edificios: `{len(base['unapproved_building_overlaps'])}`.
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
    verify_v4_backups(output)
    v4_before = {name: sha256(output / name) for name in V4_HASHES}
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
                    "isolated_blocks", "floating_create_blocks", "disconnected_road_anchors"):
            if audit[key]: hard_failures.append(f"{name}:{key}={audit[key][:10]}")
        missing_roofs = [r for r in audit["roof_continuity"] if r["missing"]]
        if missing_roofs: hard_failures.append(f"{name}:roof_gaps={missing_roofs}")
    if audits["base"]["minimum_nexus_building_clearance"] < 10:
        hard_failures.append("Nexus clearance below 10 blocks")
    if unapproved_overlay_collisions:
        hard_failures.append(f"overlay:unapproved_base_collisions={unapproved_overlay_collisions}")
    overlay_ids = {block_id(s).split(":", 1)[1] for s in overlay.blocks.values()}
    if not overlay_ids <= SAFE_DECOCRAFT_IDS: hard_failures.append("unsafe DecoCraft IDs")
    if overlay_ids & BROKEN_DECOCRAFT_IDS: hard_failures.append("broken DecoCraft loot table ID")
    if hard_failures:
        print(json.dumps(audits, indent=2, ensure_ascii=False))
        raise RuntimeError("Audit failed before serialization:\n" + "\n".join(hard_failures))

    paths = {
        "base": output / "nexus_market_spawn_nexus_realms_v5_base.schem",
        "overlay": output / "nexus_market_spawn_nexus_realms_v5_decocraft.schem",
        "combined": output / "nexus_market_spawn_nexus_realms_v5.schem",
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
        args.preview_dir / "nexus_market_v5_topdown.png",
        args.preview_dir / "nexus_market_v5_isometric.png",
        args.preview_dir / "nexus_market_v5_isometric_opposite.png",
    ]
    render_topdown(combined, previews[0]); render_isometric(combined, previews[1])
    render_isometric(combined, previews[2], flip_x=True, flip_z=True)
    report_paths = write_reports(repo, audits, serialized, v4_before, previews)
    verify_v4_backups(output)
    result = {
        "files": [str(p) for p in paths.values()], "reports": [str(p) for p in report_paths],
        "previews": [str(p) for p in previews], "audits": audits, "serialized": serialized,
        "v4_hashes": v4_before,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
