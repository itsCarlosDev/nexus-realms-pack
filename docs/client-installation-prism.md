# Nexus Realms client with Prism Launcher

Standard production clients use:

```text
https://itscarlosdev.github.io/nexus-realms-pack/pack.toml
```

## Import the prepared instance

1. Download `NexusRealms-Prism.zip` from:
   `https://itscarlosdev.github.io/nexus-realms-pack/downloads/NexusRealms-Prism.zip`.
2. In Prism Launcher, choose **Add Instance** and **Import**.
3. Select the downloaded ZIP.
4. Select a Java 17 runtime if Prism does not choose one automatically.

The template defines Minecraft `1.20.1`, Forge `47.4.10` and this exact
pre-launch command:

```bash
"$INST_JAVA" -jar packwiz-installer-bootstrap.jar https://itscarlosdev.github.io/nexus-realms-pack/pack.toml
```

Packwiz runs before Minecraft. It downloads added and changed files and asks
for confirmation when files managed by a previous pack version must be
removed. Do not cancel that synchronization when joining the production
server.

The export contains only `instance.cfg`, `mmc-pack.json` and the official
Packwiz bootstrap under `minecraft/`. It contains no account, save, log,
crash report, screenshot, token, personal audio setting or personal
`options.txt`.

## Nexus Realms Lite

The Lite branch builds `NexusRealms-Lite-Prism.zip`, with instance name
`Nexus Realms Lite` and the Packwiz endpoint
`https://itscarlosdev.github.io/nexus-realms-pack/lite/pack.toml`.
Automatic Java selection remains enabled for Minecraft 1.20.1 / Forge 47.4.10.
The generator selects Lite defaults from the pack identity and rejects a
Standard URL or instance name for a Lite build. The final ZIP is verified.

The ZIP is a bootstrap, not an offline copy of the modpack. It still contains
only three files and downloads the currently published Lite revision at launch.
A local build does not publish changes: import testing of this revision through
the production endpoint must wait until that revision is published.

### Lite memory policy

Memory remains inherited from Prism's global settings: no `OverrideMemory`,
`MinMemAlloc` or `MaxMemAlloc` is distributed. Alex's physical RAM and effective
heap limit were not supplied. This avoids forcing an unverified allocation on
an integrated-GPU machine, but an inherited limit that is too small can still
cause OOM. Record and review the effective minimum and maximum before testing;
this policy does not establish that any particular heap size is sufficient.

### Static presentation and footprint

Lite keeps FancyMenu, its 15 layouts, all eight class/information layouts,
custom screen identifiers, buttons, actions and loading requirements. The three
active video backgrounds now use the existing static `background.png`.
`logo.gif` is replaced with frame 100 (zero-based) as a 960x540 RGBA PNG.
All five MP4s and their orphan video-controller metadata are removed.
The six large PNGs are resized from 2752x1536 to 1920x1072 with Lanczos, keeping
aspect ratio to pixel rounding and full RGB/RGBA color rather than palette reduction.

| Metric | Before | After |
|---|---:|---:|
| Client-only mod metadata | 44 | 23 |
| Shared mod metadata | 205 | 205 |
| Server-only mod metadata | 5 | 5 |
| Total mod metadata | 254 | 233 |
| FancyMenu asset bytes | 330,792,376 | 18,751,117 |
| MP4 files | 5 | 0 |
| Animated GIFs in FancyMenu assets | 1 | 0 |
| Optional resource-pack metadata | 13 | 0 |

The 312,041,259-byte reduction is disk/distribution footprint, not measured Java
heap savings. The original OOM is not proven fixed. Mod metadata counts do not
equal Forge's count, which also includes bundled dependencies.

Watermedia and its binaries are removed because FancyMenu declares Watermedia
optional and there are no remaining active multimedia consumers. EMF, ETF and
the two remaining Fresh Animations addons are removed; NexusRealms and
NexusRealms_ES contain no OptiFine CEM/emissive configuration requiring them.
Entity Culling stays independent. AAA Particles: World is removed; the shared
AAA Particles core remains.

Additional client-only removals: Better Advancements, BetterF3, Chat Heads,
Chat Animation, CinematicZoom, CMDCam, Fancy Toasts, Freecam, Immersive UI,
Inventory HUD+, Item Borders, Legendary Tooltips, Not Enough Animations,
Perception, Punchy and You Died. Only Punchy's removed built-in pack entry is
deleted from Default Options; graphics settings, TaCZ lazy loading and Iron's
Spells Lite settings are preserved.

All 13 optional external resource packs were inactive in Lite defaults and are
removed: Better Lanterns, Better Trident Model Trail, DMC5 Yamato, Eclectic
Trove, Enchant Icons, EpicFight Extra Sword Trail, FA Player Extension,
Fresh Animations Emissive, Low On Fire, More Power Trail, Our Story FTB Theme,
Torches Reimagined and True Nitwit Texture. The base Fresh Animations pack
was already absent. NexusRealms, NexusRealms_ES, TaCZ and required built-in
Epic Fight/EFN/Fragmentum/Hordes layers remain.

Fusion stays because Connected Glass requires it; YACL stays because TaCZ
Tweaks requires it; Shoulder Surfing stays because Third Person Shooting
requires it. No shared mod, Nexus Core source/JAR or KubeJS behavior changes.
No threading knobs are changed: repository ModernFix/Embeddium overrides were
absent, and the inspected DEV runtime configuration is not Alex's configuration.

### Reproduce and validate

From the repository root, with Python 3.11+ and the existing Packwiz executable:

```powershell
packwiz refresh
packwiz refresh
python tools/release/pack_release.py --root . validate
python -m unittest discover -s tools/release -p test_lite_release.py -v
python tools/release/pack_release.py --root . build --output _site --bootstrap <verified-bootstrap.jar>
python tools/release/pack_release.py --root . verify-site --site _site
git diff --check
```

The existing Pages workflow already runs the Lite checkout's validator and
builder, so the new checks apply there without changes to Standard or deployment.
They reject removed mods (including raw JAR filenames), video/GIF references,
missing or unindexed local assets, altered onboarding, orphan controllers,
oversized/animated PNGs and invalid Lite instance identity. The asset budget is
21,000,000 bytes, chosen after measuring 18,751,117 bytes (about 12% margin).
Deliberate onboarding or exclusion changes require reviewing `lite_contract.json`.

Image derivation is reproducible with the locally used Pillow 12.0.0:

```powershell
python tools/release/optimize_lite_images.py --source-ref e4f5566 --output dist/lite-images
```

The output directory must be new. This reads original assets from Git and writes
only derived PNGs there. All seven generated PNGs were reproduced byte-for-byte.

### Required test on Alex's PC after publication

1. Import the new Lite ZIP into a **new** Prism instance.
2. Do not copy mods or configs from the old instance; do not delete unmanaged JARs from it.
3. Record physical RAM and effective Prism minimum/maximum memory.
4. Launch Minecraft and record time to the menu.
5. Inspect the mod list: Oculus, Distant Horizons, Sound Physics Remastered,
   Visuality, Presence Footsteps and Advancement Plaques must be absent, along
   with all 21 removals listed above. Particular remains as `particular-reforged`;
   Particle Rain is supplied by `pretty-rain` (verified JAR ID `particlerain`).
   Both have `both` metadata and remain unchanged under the shared-mod constraint.
6. Connect to Nexus Realms and remain online for 15 minutes.
7. Open inventory, pause menu, FancyMenu screens and class selection when appropriate.
8. Walk through the market and world; check models, UI and combat.
9. Inspect that session's `latest.log` for `OutOfMemoryError` and connection/registry errors.
10. Compare time and stability with the old instance, keeping its files intact.

Not runtime-tested. A missing OOM in static checks/build is not runtime evidence.
