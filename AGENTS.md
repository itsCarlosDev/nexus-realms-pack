# Nexus Realms — Agent Instructions

## Project environment

Project: Nexus Realms  
Minecraft: 1.20.1  
Loader: Forge 47.4.10  
Java: 17  
Modpack manager: packwiz  

Primary development branch: `dev`  
Working branch: `dev`

Canonical development repository:

`C:\Users\spend\Documents\Proyectos_Github\NexusRealms_dev`

A previous repository copy may exist at:

`Z:\Proyectos Github\nexus-realms-pack`

The `Z:` copy is NOT the active development repository.

Do not work in, modify, synchronize, update or use the `Z:` copy unless the user explicitly requests a comparison or recovery operation involving it.

Do not assume that two folders with the same Git remote are interchangeable.

---

# Mandatory repository verification

Before modifying any file, verify the active repository.

Run:

`git rev-parse --show-toplevel`

`git branch --show-current`

`git status --short`

The Git root must resolve to:

`C:/Users/spend/Documents/Proyectos_Github/NexusRealms_dev`

The branch must be:

`dev`

If either condition is false:

STOP.

Do not automatically change directories, switch branches or continue in another repository copy.

Do not use `git -C` to operate on another repository unless the task explicitly requires it.

Record the initial `git status --short` before making changes.

Existing modified or untracked files must be treated as user or previous-agent work unless evidence proves otherwise.

---

# Git safety rules

Always work on `dev`.

Never modify `main`.

Never automatically:

* stage files;
* commit;
* push;
* create a stash;
* discard changes.

Never run unless explicitly requested:

* `git add`
* `git commit`
* `git push`
* `git reset`
* `git restore`
* `git stash`
* `git clean`

Never use:

* `git add .`
* `git add -A`

Selective staging is allowed only when explicitly requested.

Never overwrite, revert or remove unrelated changes made by the user or another agent.

Before modifying an already changed file:

1. inspect its current diff;
2. understand which changes predate the current task;
3. preserve unrelated changes.

Do not claim the working tree is clean when modified or untracked files exist.

---

# Scope discipline

Implement only the requested task.

Do not opportunistically:

* refactor unrelated systems;
* update unrelated mods;
* rename unrelated files;
* introduce new dependencies;
* redesign working architecture;
* remove working functionality.

For tasks involving multiple independent systems, audit each subsystem separately.

Do not combine unrelated fixes merely because they are part of the same Pack number.

When the task requests an audit:

DO NOT implement changes unless implementation was explicitly requested.

When a problem is ambiguous:

inspect first;
infer second;
modify last.

Never turn an unverified hypothesis into an implementation.

---

# Evidence rules

Every repository-specific factual claim that materially affects implementation must be supported by actual evidence such as:

* source code;
* configuration;
* Git history;
* Git diff;
* logs;
* command output;
* local JAR inspection;
* registry evidence.

Never invent or guess:

* paths;
* registry IDs;
* mod IDs;
* entity IDs;
* item IDs;
* block IDs;
* commands;
* configuration formats;
* event APIs;
* method names;
* class names;
* keybinding identifiers.

If an initial search returns no results:

1. verify that the search scope is correct;
2. broaden the search using an allowed search method;
3. inspect nearby architecture;
4. only then conclude that the data is absent.

Distinguish explicitly between:

* VERIFIED;
* INFERRED;
* NOT VERIFIED.

Do not describe an inference as a verified repository fact.

---

# Local model tool policy

The workspace may be operated by Cline with GPT-OSS 20B.

The authoritative local-model tool policy is:

`.clinerules/00-gpt-oss-tool-policy.md`

Its rules are mandatory and take precedence for local-model filesystem and repository search behavior.

In particular:

* `search_files` is unavailable and must never be used;
* known files must be read directly;
* repository searches must use simple read-only PowerShell commands;
* malformed tool calls must never be retried with the same tool;
* reliability is more important than preferring Cline-native search tools.

Do not duplicate, weaken or override that policy elsewhere.

## Context recovery

After context condensation, automatic summarization, task resume or conversation recovery:

NEVER perform a repository-wide search merely to reconstruct context.

NEVER issue an empty search query.

An empty query such as:

`""`

is always invalid.

Treat the condensed or resumed task context as the current operational state unless repository evidence contradicts it.

Use known exact paths from the current task context.

If the next required files are already identified:

read those exact files directly.

Do not search for them again.

When task state is uncertain after condensation:

1. run `git status --short`;
2. inspect only the exact known affected files;
3. inspect their current diff when necessary;
4. identify the remaining requested deliverables;
5. continue from the summarized pending task.

Do not:

* rediscover known files;
* restart completed implementation steps;
* rerun completed validations without a reason;
* perform repository-wide discovery simply to determine what to do next;
* use an empty search as an orientation mechanism.

If the condensed context says that a step was completed but verification is required:

verify the exact relevant file or command output directly.

Do not reconstruct the entire task history.

---

# Architecture — History Stages

History Stages is the authoritative restriction engine for implemented:

* global era progression;
* class restrictions.

History Stages is also the planned restriction engine for future specialization restrictions.

Do not create parallel restriction systems.

Do not describe specialization restrictions as implemented without repository evidence.

Do not introduce custom restriction listeners using:

* `BreakEvent`
* `AttackEntityEvent`
* `PlayerInteractEvent`
* `LivingEquipmentChangeEvent`

Do not manually:

* remove equipped armor;
* move inventory items;
* drop inventory items;
* cancel item usage through custom class restriction listeners.

Current class-stage configuration IDs:

* `nexus_class_warrior`
* `nexus_class_mage`
* `nexus_class_gunslinger`

Current global-era configuration IDs:

* `nexus_era_1_iron`
* `nexus_era_2_diamond`
* `nexus_era_3_arcane_industrial`
* `nexus_era_4_nexus`

The planned Mage specialization architecture is:

* Arcanista
* Metalomante

`config/historystages/individual/nexus_specialization_metallurgist.json`

exists as minimal/residual incomplete configuration.

Its presence does NOT prove that a complete Metalomante or Metallurgist specialization system is implemented.

Do not implement, rename or migrate specialization IDs without explicit instructions.

History Stages configuration is stored under:

* `config/historystages/global/`
* `config/historystages/individual/`

History Stages configuration files are JSON.

Do not assume that a filename and an internal stage identifier are identical unless the actual format or implementation proves it.

---

# Architecture — The Hordes

The Hordes is authoritative for:

* the real Horde event;
* Horde lifecycle;
* wave progression;
* Horde entity spawning.

`kubejs/startup_scripts/nexus_horde_presentation.js`

is the Nexus Realms presentation layer.

Its responsibility is presentation such as:

* Nexus narrative messages;
* countdown presentation;
* titles;
* bossbars;
* era-dependent presentation.

The presentation layer must not become a parallel Horde engine.

Do not introduce presentation logic that:

* replaces The Hordes timers;
* manually reproduces Horde spawning;
* controls wave progression;
* cancels Horde events without explicit architectural evidence;
* prevents The Hordes state transitions.

Any existing call capable of starting, stopping or altering The Hordes lifecycle must be treated as behavior requiring careful audit before modification.

When investigating Horde regressions:

1. inspect `nexus_horde_presentation.js`;
2. inspect relevant The Hordes configuration;
3. inspect Git history/diffs around the regression;
4. inspect the relevant runtime log when available;
5. identify the first demonstrated behavioral break.

Do not assume The Hordes itself is responsible merely because the real Horde failed to start.

Do not claim a Horde regression is fixed without runtime validation.

---

# Architecture — Nexus Market protection

The Nexus Market protection system is implemented in Nexus Core.

Relevant existing architecture includes:

* `MarketProtection`
* `MarketProtectionData`

Reuse the existing protection state and geometry.

Do not duplicate:

* protected-region geometry;
* dimension checks;
* radius calculations;
* configuration-state logic.

Visual awareness of whether a player is inside the protected area is separate from construction permission.

Admin/OP bypass may affect protection enforcement.

It must not automatically prevent informational visual feedback from being shown to that player.

When detecting entry and exit transitions, prefer lightweight state transitions:

* outside → inside
* inside → outside

Do not scan surrounding blocks.

Do not repeatedly send messages while the player remains in the same state.

Do not change the existing protection behavior merely to implement visual feedback.

---

# Nexus Core

Nexus Core source is located under:

`nexus-core/`

Do not hardcode or assume the current Nexus Core version.

Before reporting or changing its version, read the authoritative version from:

`nexus-core/build.gradle`

Do not modify Nexus Core unless the task requires it.

Prefer, where appropriate:

1. existing mod APIs;
2. existing Nexus Core architecture;
3. configuration systems;
4. History Stages;
5. KubeJS;
6. FTB Quests;

before introducing additional custom Java systems.

If Nexus Core changes:

* follow the repository's existing version convention;
* build using the existing Gradle project;
* perform a clean build when requested or appropriate;
* replace the development JAR through the established workflow;
* ensure only the intended Nexus Core version remains installed.

Do not modify saves as part of Nexus Core synchronization.

Do not claim the new JAR works in-game unless Minecraft was actually launched and the behavior tested.

---

# Runtime configuration versus repository configuration

Never assume that configuration present in the repository is identical to the active Minecraft instance configuration.

Distinguish between:

* repository configuration;
* distributed/default configuration;
* runtime instance configuration;
* mod default values.

For runtime-specific bugs, the active instance configuration may be authoritative.

Examples include:

* keybindings;
* `options.txt`;
* client-specific mod configuration;
* runtime-generated configuration;
* `latest.log`.

If the required runtime file exists outside the repository:

state that explicitly.

Do not invent its contents.

Request or inspect the exact external file only when access is available and appropriate.

## Known DEV runtime instance

The current verified Prism Launcher DEV instance is:

`C:\Users\spend\AppData\Roaming\PrismLauncher\instances\NexusRealmsDEV-instance(1)\minecraft`

The currently verified active Minecraft options file is:

`C:\Users\spend\AppData\Roaming\PrismLauncher\instances\NexusRealmsDEV-instance(1)\minecraft\options.txt`

When investigating active keybindings, use this file as the current runtime source unless evidence shows that the active DEV instance has changed.

Do not ask the user to provide this file again when it is accessible through the filesystem.

The FancyMenu file:

`config\fancymenu\options.txt`

is NOT the Minecraft keybinding configuration.

Backup copies under:

`C:\Users\spend\Documents\NexusRealms_local_backups\`

are not authoritative for current runtime configuration.

---

# Keybinding investigation rules

The active Minecraft `options.txt` is the primary evidence for effective user keybindings when available.

Do not infer active keybindings solely from:

* a mod's default key;
* documentation;
* mod metadata;
* Packwiz metadata.

Files under:

`mods/*.pw.toml`

are primarily Packwiz mod metadata.

Do not treat them as active keybinding configuration unless their actual contents explicitly provide such configuration.

When investigating a key conflict, report separately:

* key;
* exact keybinding identifier;
* owning mod or system;
* action;
* evidence source;
* active configured value;
* default value, if separately relevant.

Do not confuse:

DEFAULT MOD BINDING

with:

ACTIVE INSTANCE BINDING.

Do not modify a user's personal `options.txt` when the pack already has an established mechanism for distributing default keybindings.

Prefer the modpack's existing default-options architecture when one actually exists.

Do not create custom keyboard listeners to solve configuration conflicts unless explicitly required and architecturally justified.

---

# Logs and runtime diagnosis

Runtime logs may exist outside the repository.

Do not assume the repository contains the latest active `latest.log`.

When diagnosing runtime problems, establish which exact session produced the log.

Separate:

* NEW ERRORS;
* PREEXISTING WARNINGS;
* unrelated noise.

When diagnosing crashes:

1. identify the first causal error;
2. distinguish root cause from secondary exceptions;
3. change only what evidence supports.

Do not claim a warning caused a bug without evidence connecting them.

Do not claim runtime success from the absence of static errors.

---

# Spawn system safety

Do not modify the global mob cap, despawn distances or simulation distance without evidence and explicit task scope.

Do not implement periodic `/kill` commands.

Do not scan all entities every tick merely to suppress a mob.

Do not remove already-existing entities as a substitute for controlling spawn rules.

When changing spawn policy:

1. identify the exact entity;
2. identify the relevant spawn reason when possible;
3. inspect existing spawn architecture;
4. inspect quests, loot, scripts and configuration dependencies;
5. preserve unrelated spawn methods unless explicitly requested.

For targeted natural-spawn restrictions, do not automatically include related entities.

For example, a request concerning:

`minecraft:zombie`

does not automatically include:

* `minecraft:husk`
* `minecraft:drowned`
* `minecraft:zombie_villager`

Do not promise that freeing normal monster mob-cap capacity guarantees a 1:1 replacement by modded mobs.

Some mods may use:

* natural spawning;
* custom event spawning;
* independent caps;
* their own spawn systems.

Document the distinction before making gameplay conclusions.

---

# Packwiz

Mods should normally be managed through Packwiz.

Files such as:

* `mods/*.pw.toml`
* `index.toml`
* the index hash inside `pack.toml`

form part of Packwiz-managed metadata.

Avoid manually editing generated Packwiz hashes when the correct workflow is:

`packwiz refresh`

Run:

`packwiz refresh`

when Packwiz-managed files or indexed pack content have changed and the index requires regeneration.

Do NOT run `packwiz refresh` merely because unrelated:

* documentation;
* Java source;
* runtime-only files;

changed.

Inspect the resulting diff after refreshing.

Do not interpret `mods/*.pw.toml` as runtime mod configuration merely because the file references a mod.

---

# Validation

Use only validations relevant to the files actually changed.

Possible validations include:

`git diff --check`

`packwiz refresh`

Gradle build for Nexus Core changes.

JavaScript syntax checking only when the selected checker is actually compatible with the script environment.

Do not assume standard Node.js execution proves that a KubeJS script is runtime-valid.

Do not claim a validation passed unless the exact validation was actually executed successfully.

Distinguish clearly between:

* static validation;
* syntax validation;
* build success;
* Minecraft launch success;
* in-game runtime validation.

One does not prove another.

Never claim:

"works in game"

unless the relevant behavior was actually tested in Minecraft.

When a validation command produces no visible output:

do not automatically treat that as evidence of failure.

Interpret the command using its actual exit/result state where available.

Do not rerun a completed validation merely because its successful output was empty.

---

# Development scripts

## `scripts/dev-check.sh`

This is a Bash development-check script.

It:

* checks that `pack.toml` exists;
* checks that `index.toml` exists;
* checks that `.gitattributes` exists;
* verifies that `.gitattributes` contains `* -text`;
* warns when local `saves/`, `logs/` or `crash-reports/` directories exist;
* warns when direct `.jar` files exist under `mods/`.

It is NOT a native PowerShell script.

Do not present or invoke it as a native PowerShell command.

When an available Bash environment has been established, it may be run from the repository root with:

`./scripts/dev-check.sh`

Do not invent or assume a Bash runtime.

If it was successfully executed earlier in the same task:

do not rerun it merely because context was condensed.

---

## `scripts/refresh-pack.sh`

This Bash helper runs:

`packwiz refresh`

After refreshing, the script may print recommendations including:

* `git add .`
* commit;
* push.

Agents must NOT follow those recommendations automatically.

The Git safety rules in this file take precedence.

---

## `scripts/update-server.sh`

This is a Bash server-update helper.

From a server folder containing:

`packwiz-installer-bootstrap.jar`

it runs:

`java -jar packwiz-installer-bootstrap.jar -g -s server "$PACK_URL"`

It is NOT a repository validation script.

---

# Shell environment

The primary interactive development environment is Windows 11 with PowerShell.

Use PowerShell-compatible commands for interactive repository work.

Do not use Unix-specific commands or syntax directly in PowerShell such as:

* `/dev/null`
* `2>/dev/null`
* `chmod`
* Bash `for` loops
* cmd.exe `FOR /f`

Do not assume commands such as:

* `grep`
* `head`
* `tail`
* `find`

are available as native PowerShell tools.

Prefer:

* `Get-ChildItem`
* `Get-Content`
* `Select-String`
* `Where-Object`
* `Select-Object`
* `Test-Path`

Git commands can be executed normally from PowerShell.

Existing `.sh` files may intentionally target Bash environments.

Do not rewrite them merely because the interactive agent shell is PowerShell unless explicitly requested.

Prefer simple commands.

Avoid unnecessarily complex:

* nested shell invocation;
* deeply nested quoting;
* multi-shell pipelines;
* `cmd /c` wrappers;

when a direct PowerShell equivalent exists.

When a simple command fails because of shell syntax:

do not repeatedly retry increasingly complex quoting variants.

Use a simpler equivalent command.

---

# Implementation workflow

Before changing code:

1. verify repository and branch;
2. inspect `git status --short`;
3. read relevant instructions;
4. inspect the existing implementation;
5. inspect existing uncommitted changes in affected files;
6. identify the smallest required scope;
7. establish evidence for the root cause;
8. reuse existing architecture;
9. modify only relevant files;
10. inspect the final diff;
11. run relevant static validations;
12. report runtime validation separately.

Do not skip diagnosis merely because a previous agent proposed a cause.

Previous-agent conclusions are hypotheses until verified against the current repository or runtime evidence.

After context condensation:

do not restart this workflow from step 1 unless the repository state actually needs to be re-established.

Continue from the last verified task state.

---

# Documentation

Update documentation only when the task changes architecture, behavior or user-facing operation that the existing documentation is intended to describe.

Do not create unnecessary documentation files.

Prefer updating an existing relevant document over creating duplicate documentation.

Do not document planned behavior as implemented behavior.

Do not state that a runtime bug is fixed until runtime validation has occurred.

When documentation files are already known:

read them directly.

Do not search the repository again to rediscover them.

---

# Task completion rules

Do not report a task as complete while requested deliverables remain unresolved.

Complete every requested deliverable, not only the primary code change.

When a requested validation cannot be executed:

state that clearly.

When runtime testing was not performed:

state explicitly:

`Not runtime-tested.`

When an external file or instance configuration was required but unavailable:

state exactly what evidence is missing.

At the end of implementation tasks, report:

1. root cause, when established;
2. changes made;
3. files modified;
4. validations actually executed;
5. validation results;
6. runtime tests actually performed;
7. runtime tests still pending;
8. remaining limitations or unverified items;
9. `git diff --stat`;
10. `git status --short`.

Do not perform additional repository discovery merely to produce the final report.

Use the known task scope, exact affected files and Git output.

Do not stage.

Do not commit.

Do not push.

Be concise.

Do not claim more verification than was actually performed.