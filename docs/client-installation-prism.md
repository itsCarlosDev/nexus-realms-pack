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

### Lite audit and benchmark baseline (2026-09-11)

This follow-up is maintained directly on `lite`, by explicit task instruction.
It does not merge or synchronize gameplay from `dev`. At the inspected revisions
(`dev` a3cc71d, `lite` fe3f32b), `git rev-list --left-right --count dev...lite`
reports 18/20 exclusive commits. The release workflow checks out `lite` separately;
this is the demonstrated maintenance divergence, not a demonstrated FPS or OOM
cause. The two branches differ in quests, class/boss scripts, NPC versions and
Nexus Core (Lite build.gradle: 0.6.40). Same-server compatibility with current
`dev` is NOT VERIFIED. The implementation for deriving Lite from the same source revision as Standard
is now included in this branch. It is not active in production until these
release-tooling changes are promoted to the branch that runs the publishing
workflow. The current production workflow remains unchanged until that promotion.

The earlier footprint table describes the 1304073 optimization. The current
inventory is **234 Packwiz mod manifests: 24 client, 205 both, 5 server**, plus
the direct Nexus Core JAR. The extra client manifest is Nexus Aether Gloves
Compat. These are manifest counts, not Forge's runtime mod count. No mods,
versions, gameplay files or graphical values are changed by this follow-up.

`tools/release/lite_contract.json` now protects every retained manifest and its
installation side, the direct `nexuscore` mod ID, 241 existing required content
paths, the enabled resource-pack order and the following defaults. Intentional
removals or side changes require reviewing the contract; do not regenerate it
blindly to silence a failure. New gameplay/content files should be added to its
required inventory when introduced. Presence checks do not prove unchanged
semantics, matching server versions or successful networking.

| Default | Value |
|---|---|
| Render / simulation distance | 6 / 5 |
| FPS cap / VSync | 60 / false |
| Graphics / clouds / entity shadows / AO | Fast (`0`) / `"false"` / false / false |
| Entity distance scale / particles | 0.5 / Minimal (`2`) |
| Mipmaps / biome blend / chunk update priority | 0 / 0 / 0 |
| Fullscreen / width and height overrides | false / 0 and 0 |
| Menu blur | 0 |

These are Default Options seed values, not a forced rewrite of a player's
personal `options.txt`. Verify effective settings in a fresh instance; updates
may preserve previous preferences. History (`1466aac`, `b60f95f`) establishes
how 6/5/60 and particles=2 were selected, but contains no Acer benchmark proving
their suitability. The 4/4/30 candidate stays a manual experiment: it reduces
visible terrain and can hide threats/landmarks. Lower client simulation distance
does not set a dedicated server's simulation policy. The already short entity
distance and minimal particles require checking boss telegraphs and ranged
combat before making them more aggressive. A 30 FPS cap alone proves no stability.

#### Optimizers: keep the baseline, measure the interaction

No repository override was found for the seven optimizers below. The accessible
Prism DEV instance has generated configuration files, inspected only as evidence
of its own settings; they are not the Acer settings or distributed defaults.
All seven installed JARs matched their manifest hashes. ImmediatelyFast's
filename mentions 1.20.4, but its Forge metadata supports `[1.20,1.20.4]`, including
1.20.1. Do not replace it based on the filename alone.

| Optimizer / pinned version | Function and overlap | Decision, cost and compatibility test |
|---|---|---|
| [Embeddium](https://github.com/FiniteReality/embeddium) 0.3.31 | Terrain renderer, chunk meshes and visibility; partly overlaps entity/render optimizations. | KEEP. Mesh workers/buffers cost CPU and memory. DEV uses automatic threads (`0`), deferred chunk updates, visible-texture animation and culling. Do not tune worker count without measuring chunk latency and iGPU memory pressure. Check translucent blocks, armors and animated geometry. |
| [Entity Culling](https://github.com/tr7zw/EntityCulling) 1.10.5 | Line-of-sight occlusion adds to chunk/frustum visibility; also skips some client entity ticks. | KEEP / REQUIRES RUNTIME BENCHMARK. Tracing uses CPU threads and state. DEV has tick culling on; the author identifies risks for magic entities and renderers beyond their bounds. Compare on/off in the same scene; check Epic Fight, TaCZ, multipart bosses, NPCs and spells when reappearing from behind walls. Add exceptions only for demonstrated IDs. |
| [ImmediatelyFast](https://github.com/RaphiMC/ImmediatelyFast) 1.5.5 | Batches immediate rendering for HUD, text, entities and particles; overlaps draw submission, not the entire terrain renderer. | KEEP. Buffers/atlases may trade memory for fewer draw calls. DEV enables HUD batching and fast uploads, with experimental switches off. Test inventories, weapon hands, spell overlays and resource-pack shaders. No Acer benefit is measured. |
| [ModernFix](https://github.com/embeddedt/ModernFix) 5.27.58 | Loading, allocations, resource/model and bug fixes; partial memory overlap with FerriteCore. | KEEP. DEV has no explicit mixin overrides and dynamic resources disabled by default. Do not enable experimental resource loading to chase a heap estimate; compare startup, reloads and first use of assets. |
| [FerriteCore](https://github.com/malte0811/FerriteCore) 6.0.1 | Deduplicates blockstate/model data; targets retained memory rather than a guaranteed FPS uplift. | KEEP. DEV has compactFastMap and the risky small threading detector off. Check models and collision/render state after reload; RAM benefit remains unmeasured in this pack. |
| [Dynamic FPS](https://github.com/juliand665/Dynamic-FPS) 3.11.4 | Reduces background work; does not establish foreground combat performance. | KEEP. DEV's private `states.invisible.frame_rate_target=120` is not distributed and must not be copied. Check background CPU/GPU use and recovery after alt-tab separately from active-play measurements. |
| [Particle Core](https://www.curseforge.com/minecraft/mc-mods/particle-core) 0.3.3 | Particle ticking, vertex/light caching and rendering; overlaps ImmediatelyFast's particle submission. | KEEP / REQUIRES RUNTIME BENCHMARK. DEV uses asynchronous ticking, 16384 particles per sheet, no global removal and distance multiplier 1.0. Worker overhead and mixins require spell/horde stress tests; do not add global particle suppression or assume threading improves weak CPUs. |

No additional optimizer is justified by a measured bottleneck. A partial overlap
does not establish redundancy. None is removed merely for that overlap. Existing
TaCZ lazy asset loading remains enabled: its repository comment explicitly says
the render thread can wait on first use before warmup completes. Measure first
equip/first shot as well as warmed combat; a lower startup cost may move a stall
into play. Iron's Spells already disables shield-particle collisions; its arms,
items and contextual UI remain enabled. No custom render listeners are introduced.

Dependency inspection used matching local JARs, including nested Jar-in-Jar
metadata: Connected Glass requires Fusion, TaCZ Tweaks requires YACL and Kotlin,
Third Person Shooting requires Shoulder Surfing, and Particle Core requires
Kotlin and Fzzy Config. All are retained. The client scan matched 227 of the 229
client/both manifests; Create Fix and Nexus Aether Gloves Compat were unavailable
in that DEV instance, so a complete installed dependency/version-range check is
NOT VERIFIED. Metadata presence is not a Forge dependency-resolution test.

#### Reproducible artifact checks

The existing generator still copies the indexed pack and builds a Prism bootstrap
ZIP. It now checks Minecraft/Forge components against `pack.toml` before building
and rechecks those components and the embedded bootstrap hash in the final ZIP.
The contract rejects missing/optional required mods, incorrect sides, missing
metafile flags, missing required content, changed defaults and resource-pack order.
Existing media/exclusion/onboarding checks remain in force. The publish workflow's
Lite build step now runs the regression suite; that workflow change takes effect
when promoted to the branch running the workflow, not simply by editing `lite`.

For two reproducible local builds use the same Python, source bytes, bootstrap,
`--commit` and `--generated-at`. Set `$verifiedBootstrap` to the path of the
bootstrap verified against `tools/prism/bootstrap.sha256`. Use new output
directories to preserve old builds:

```powershell
python -m unittest discover -s tools/release -p test_lite_release.py -v
python tools/release/pack_release.py --root . validate
$sourceCommit = git rev-parse HEAD
$generatedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
python tools/release/pack_release.py --root . build --output dist/lite-check-a/_site --bootstrap $verifiedBootstrap --commit $sourceCommit --generated-at $generatedAt
python tools/release/pack_release.py --root . build --output dist/lite-check-b/_site --bootstrap $verifiedBootstrap --commit $sourceCommit --generated-at $generatedAt
python tools/release/pack_release.py --root . verify-site --site dist/lite-check-a/_site
```

Compare SHA-256 for every relative file in both sites, including archives and
manifest. A ZIP with the production URL downloads the published pack, not the
unpublished local tree. For a local test, serve the isolated site with Python's
HTTP server and use that URL in a separate test instance's Packwiz prelaunch
command, preserving the original production instance. Verify that the imported
instance actually receives this index hash before benchmarking. No local site
is started, published, or installed automatically by these checks.

#### Acer B117 N16Q9: physical benchmark protocol

1. Record exact CPU/iGPU, driver, physical RAM, resolution, Java 17 build,
   effective Prism min/max heap, pack revision/index hash and server revision.
   The model name alone does not establish the installed RAM. Record memory
   used by other applications and graphics; shared iGPU RAM can leave too little
   headroom and trigger paging. Do not prescribe a fixed heap without these data.
2. Use a fresh isolated instance and a repeatable server/test world. Record
   startup time separately. Warm up for five minutes, then capture at least
   three equal runs per scenario, alternating baseline/candidate order.
3. Repeat spawn/Nexus, NPC area, exploration, existing-chunk loading, new-chunk
   generation, normal combat, crowded combat, class ability, boss and horde.
   Fix position, camera, route, resolution, distances, Java, heap and server state
   for optimizer A/B comparisons. Separate generation from loading; use equivalent
   fresh world snapshots for generation comparisons without editing live saves.
4. Measure margin with VSync off and a high/unlimited cap, then separately test
   sustained play capped at 30. For the 4/4/30 profile experiment change only those
   specified variables; do not attribute its result to an optimizer A/B test.
5. Use a frame capture tool that supports Minecraft/OpenGL on the Acer. Record
   its name/version and raw per-frame timestamps. Capture average FPS, median,
   p95/p99 frametime, spikes over 50/100/250 ms and their longest duration. Define
   `1% low = 1000 / mean(slowest 1% frame times in ms)` and keep the definition
   identical across runs. If only F3 is available, report spot observations and
   no fabricated 1% low. Low averages do not excuse long stalls or visible errors.
6. Record process working set/private bytes, system available/committed memory,
   paging, GPU load/shared memory and thermal/clock behavior. Continue at least
   15 minutes after warmup. Correlate stalls with chunk loads, first weapon/spell
   use and GC where logs permit; do not equate a GC pause with the entire stall.
7. Reject a candidate with disappearing bosses, NPCs, guns, spell telegraphs,
   armor or animations, failed class/inventory actions, network/registry errors,
   worse p99/spikes, paging or progressive slowdown. Check behind-wall reappearance
   and fast camera turns specifically for culling. Repeat Entity Culling and
   Particle Core toggles independently through supported controls/settings.
8. Keep per-run results as: scenario, revision, profile, resolution, heap,
   average FPS, 1% low, p99 ms, spike counts, peak process/system memory, visual
   defects and session log. Archive both cold and warm results, including failures.

Emergency mode is a manual candidate, not another configuration system: try a
window near 1280x720 using the launcher/window controls, verify the actual rendered
resolution, then test 4/4/30. 720p has about 44% of the pixels of 1080p; this does
not promise a corresponding FPS gain. Leave `overrideWidth/Height=0` in distributed
defaults. Particles are already Minimal and entity scaling already 0.5: reduce
neither further unless mechanics remain readable. Restore distance or particles
if ranged targets or boss cues disappear. UI scale may need adjustment at 720p.

Not runtime-tested. NO VALIDADO EN RUNTIME.
Rendimiento real en Acer B117 N16Q9: pendiente de benchmark físico.
