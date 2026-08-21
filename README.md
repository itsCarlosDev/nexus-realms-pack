# Nexus Realms

<p align="center">
  <img src="https://img.shields.io/badge/Minecraft-1.20.1-62B47A?style=for-the-badge&logo=minecraft&logoColor=white" alt="Minecraft 1.20.1" />
  <img src="https://img.shields.io/badge/Forge-47.4.10-E04E39?style=for-the-badge" alt="Forge 47.4.10" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17" />
  <img src="https://img.shields.io/badge/Packwiz-Managed-4C8BF5?style=for-the-badge" alt="Packwiz" />
  <img src="https://img.shields.io/github/actions/workflow/status/itsCarlosDev/nexus-realms-pack/publish-pack.yml?branch=main&style=for-the-badge&label=Build%20%26%20Deploy" alt="Build and Deploy" />
</p>

**Nexus Realms** is a private multiplayer Minecraft project built around a heavily modified **Forge 1.20.1** environment.

Rather than being only a collection of mods, the project manages **modpack distribution, client/server compatibility, custom gameplay systems, automated releases, class restrictions, progression, testing and deployment**.

The goal is to combine different gameplay styles — RPG combat, magic, firearms, exploration, automation, bosses and progression — while keeping the resulting environment maintainable and reproducible across clients and the dedicated server.

---

## 🔎 At a glance

| Component                | Current target         |
| ------------------------ | ---------------------- |
| Minecraft                | `1.20.1`               |
| Forge                    | `47.4.10`              |
| Java                     | `17`                   |
| Pack format              | `packwiz:1.1.0`        |
| Pack metadata version    | `1.0.0`                |
| Custom Forge mod         | `Nexus Core 0.6.27`    |
| Stable branch            | `main`                 |
| Development branch       | `dev`                  |
| Alternative distribution | `lite`                 |
| Client launcher          | Prism Launcher         |
| Distribution             | Packwiz · GitHub Pages |
| Automation               | GitHub Actions         |

---

## 🎯 Project goals

Nexus Realms started as a private modded Minecraft server for friends, but the technical scope grew as the number of systems and compatibility requirements increased.

The project now focuses on several problems:

* keeping a large modded environment reproducible;
* separating client-only, server-only and shared content correctly;
* maintaining compatibility between unrelated gameplay systems;
* implementing class-specific gameplay restrictions;
* synchronizing clients with the server configuration;
* distributing updates without manually rebuilding installations;
* maintaining Standard and Lite variants;
* testing changes before promoting them to the stable branch;
* automating validation and release tasks.

The repository acts as the source of truth for the modpack configuration and its custom systems.

---

# ⚔️ Gameplay architecture

Nexus Realms combines several different gameplay styles inside the same world.

The current class foundation is based around three main classes:

### Warrior

Focused on melee combat and systems built around **Epic Fight** and compatible weapons.

### Mage

Focused on magic using **Iron's Spells 'n Spellbooks** and related systems.

The Mage class also supports specialization paths such as:

* **Arcanist**
* **Metalomancer**

### Gunslinger

Focused on firearms and tactical combat using **TaCZ** and its related integrations.

---

## 🔐 Class restrictions

One of the main technical challenges is preventing each gameplay system from leaking into the other classes.

Examples include:

* firearms being restricted to Gunslinger;
* Warrior-specific combat equipment being restricted to Warrior;
* magic equipment being restricted to Mage;
* preventing invalid interactions without deleting or duplicating player items;
* keeping restrictions synchronized between normal Minecraft interactions and mod-specific events.

The implementation combines **KubeJS** with the custom **Nexus Core** Forge mod.

At a high level:

```text
Player
  │
  ▼
Class selection
  │
  ├── KubeJS
  │     ├── class state
  │     ├── tags
  │     ├── starter kits
  │     └── UI integration
  │
  ▼
Runtime gameplay
  │
  ├── Nexus Core
  │     ├── Forge-side enforcement
  │     ├── synchronization
  │     └── project-specific policies
  │
  └── Mod-specific integrations
        ├── TaCZ
        ├── Epic Fight
        └── Iron's Spells
```

The objective is not simply to hide incompatible items, but to prevent invalid actions while preserving player inventories safely.

---

# 🧩 Progression and custom systems

Nexus Realms contains additional systems built around the modpack rather than relying exclusively on the default behaviour of individual mods.

Current project areas include:

* class selection and class-specific gameplay;
* Mage specializations;
* progression through eras;
* quests through FTB Quests;
* four-wave horde encounters;
* boss progression;
* protected market systems;
* client keybind profiles;
* multiplayer synchronization;
* exploration and world-generation integrations;
* custom UI and presentation;
* server-side policies for project-specific gameplay.

The exact set of enabled systems evolves as compatibility and balance testing continues.

See [`CHANGELOG.md`](CHANGELOG.md) for the development history.

---

# ☕ Nexus Core

`nexus-core/` contains **Nexus Core**, a custom Forge mod developed specifically for Nexus Realms.

Current version:

```text
0.6.27
```

It targets:

```text
Minecraft 1.20.1
Forge 47.4.10
Java 17
```

Nexus Core complements KubeJS by moving behaviour that requires deeper Forge-side control into Java.

Its responsibilities include project-specific runtime systems and validation policies such as:

* gameplay synchronization;
* class-related runtime behaviour;
* market protection;
* keybind profile safety;
* progression integration;
* camera integration policies;
* class-change policies;
* additional client/server safeguards.

The module has its own Gradle configuration and verification tasks.

Example:

```bash
cd nexus-core
./gradlew check
```

The verification suite includes checks for several project-specific policies, including market boundaries, hostile-spawn rules, keybind migration, class changes and other runtime integrations.

---

# 📦 Packwiz distribution

The modpack is managed using **Packwiz**.

Instead of treating the repository as a folder containing every third-party `.jar`, Packwiz stores metadata describing where compatible files should be obtained.

The repository contains:

```text
pack.toml
index.toml
*.pw.toml
```

This makes the pack easier to:

* version with Git;
* compare between commits;
* update;
* validate;
* distribute;
* reproduce across multiple computers.

---

## Standard distribution

Packwiz endpoint:

```text
https://itscarlosdev.github.io/nexus-realms-pack/pack.toml
```

Prism Launcher distribution:

```text
https://itscarlosdev.github.io/nexus-realms-pack/downloads/NexusRealms-Prism.zip
```

---

## Lite distribution

Nexus Realms also maintains a dedicated **Lite** variant for systems that require a reduced client configuration.

Packwiz endpoint:

```text
https://itscarlosdev.github.io/nexus-realms-pack/lite/pack.toml
```

Prism Launcher distribution:

```text
https://itscarlosdev.github.io/nexus-realms-pack/lite/downloads/NexusRealms-Lite-Prism.zip
```

The Lite version is maintained separately through the `lite` branch while using the same automated release infrastructure.

---

# 🚀 Automated release pipeline

Publishing Nexus Realms is handled through **GitHub Actions**.

Changes pushed to `main` trigger the release workflow.

The pipeline performs several validation and deployment stages before the pack is considered published.

```text
Push to main
      │
      ▼
Checkout repository
      │
      ▼
Install pinned Packwiz
      │
      ▼
Refresh Packwiz metadata
      │
      ▼
Require clean Git state
      │
      ▼
Validate repository
      │
      ▼
Build Standard distribution
      │
      ├───────────────┐
      │               │
      ▼               ▼
Standard Pack      Lite branch
                      │
                      ▼
                 Validate Lite
                      │
                      ▼
                  Build Lite
      │               │
      └───────┬───────┘
              ▼
        GitHub Pages
              │
              ▼
      Production smoke tests
```

The workflow:

1. checks out the stable repository;
2. installs a pinned Packwiz version;
3. refreshes Packwiz metadata;
4. verifies that regeneration produces no unexpected Git diff;
5. validates the Packwiz index and repository safety;
6. builds an isolated Standard distribution;
7. checks out and validates the `lite` branch;
8. builds the Lite distribution;
9. packages Prism Launcher instances;
10. deploys everything through GitHub Pages;
11. runs smoke tests against the deployed Standard and Lite endpoints.

This prevents a normal release from being treated as valid only because it works on one local machine.

---

# 🌐 Distribution architecture

The general update flow is:

```text
                 GitHub repository
                        │
                        ▼
                  GitHub Actions
                        │
                        ▼
                  GitHub Pages
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
       Standard Pack            Lite Pack
             │                     │
             ▼                     ▼
      Prism Launcher         Prism Launcher
             │                     │
             └──────────┬──────────┘
                        ▼
                     Players
```

Packwiz keeps clients synchronized with the published pack metadata without requiring every update to be distributed manually.

---

# 🖥️ Client/server separation

Nexus Realms does **not** use separate Git branches for client and server content.

Packwiz metadata defines where each mod belongs:

```toml
side = "client"
```

```toml
side = "server"
```

or:

```toml
side = "both"
```

This allows the repository to keep a single source of truth while avoiding client-only mods being unnecessarily installed on the dedicated server.

See:

[`docs/mod-side-rules.md`](docs/mod-side-rules.md)

---

# 🌿 Branch strategy

The main branches have different responsibilities.

### `main`

Stable version used as the source for the normal Nexus Realms distribution.

Changes should reach `main` only after validation and gameplay testing.

### `dev`

Development and testing branch.

New mods, compatibility changes, gameplay systems and configuration changes should normally be tested here before being promoted to `main`.

### `lite`

Dedicated source for the reduced Lite distribution.

The GitHub Actions release pipeline builds it alongside the Standard version.

---

# 📁 Repository structure

The repository contains both modpack metadata and project-specific code.

```text
.
├── .github/
│   └── workflows/          # CI/CD and GitHub Pages publishing
│
├── config/                 # Shared mod configuration
├── defaultconfigs/         # Default server/world configurations
│
├── kubejs/
│   ├── assets/
│   ├── data/
│   ├── server_scripts/     # Server-side gameplay logic
│   └── startup_scripts/    # Startup-time KubeJS logic
│
├── nexus-core/             # Custom Forge/Java mod
│
├── docs/                   # Architecture, testing and workflow documentation
│
├── scripts/
│   ├── dev-check.sh
│   ├── refresh-pack.sh
│   ├── update-server.sh
│   └── ...                 # Project utilities and generation scripts
│
├── tools/
│   ├── prism/              # Prism distribution support
│   ├── release/            # Build, validation and release tooling
│   └── server/             # Server-side utilities
│
├── pack.toml               # Packwiz pack metadata
├── index.toml              # Packwiz content index
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

---

# 🛠️ Development setup

## Requirements

For modpack development:

* Git
* Packwiz
* Prism Launcher

For Nexus Core development:

* Java 17
* Gradle / ForgeGradle environment

---

## Install Packwiz

On macOS with Homebrew:

```bash
brew install packwiz
```

Alternatively, download Packwiz from its official releases and add it to your `PATH`.

Verify the installation:

```bash
packwiz --version
```

---

# ➕ Adding or updating mods

Whenever possible, mods should be managed using Packwiz metadata instead of manually committing third-party JAR files.

## Modrinth

```bash
packwiz modrinth add MOD_SLUG
packwiz refresh
```

## CurseForge

```bash
packwiz curseforge add PROJECT_SLUG_OR_ID
packwiz refresh
```

Some CurseForge projects may have download restrictions and require additional handling.

Third-party files should only be included directly when their distribution terms allow it.

---

# 🔄 Development workflow

A typical change should follow this flow:

```text
Create/change feature
        │
        ▼
Update Packwiz/config/code
        │
        ▼
packwiz refresh
        │
        ▼
./scripts/dev-check.sh
        │
        ▼
Local Prism test
        │
        ▼
Dedicated server test
        │
        ▼
Commit
        │
        ▼
Merge into main
```

Typical commands:

```bash
git checkout dev

packwiz refresh
./scripts/dev-check.sh

git status
```

After validating the change:

```bash
git add .
git commit -m "Describe the pack change"
```

Changes affecting areas such as:

* gameplay;
* combat;
* world generation;
* entities;
* dimensions;
* quests;
* server configuration;

should also be tested on a server before being merged into `main`.

---

# 🧪 Validation

Nexus Realms uses multiple validation layers.

## Repository validation

```bash
./scripts/dev-check.sh
```

This is intended to detect common repository or Packwiz consistency problems before changes are committed.

## Packwiz validation

```bash
packwiz refresh
git diff
```

A clean refresh helps ensure the Packwiz index matches the actual repository state.

## Nexus Core validation

```bash
cd nexus-core
./gradlew check
```

Nexus Core includes dedicated policy checks for project-specific systems.

## Release validation

The final GitHub Actions pipeline performs another clean Packwiz refresh, validates the repository, builds the distributions and executes production smoke tests after deployment.

---

# 🤖 AI-assisted development

AI tools are used as part of the Nexus Realms development workflow for tasks such as:

* technical research;
* exploring possible implementations;
* code drafting;
* debugging;
* documentation;
* automation;
* reviewing possible fixes.

AI-generated output is not considered validated simply because it was generated successfully.

Changes still need to be integrated into the real project and tested against the relevant Minecraft client, server, mod interactions and repository workflow before they are treated as stable.

The project is therefore also an exercise in learning how to use AI-assisted development while keeping **testing, verification and technical understanding** as part of the development process.

---

# 📚 Documentation

Additional information is available throughout the repository:

* [`CHANGELOG.md`](CHANGELOG.md) — development history and major changes.
* [`CONTRIBUTING.md`](CONTRIBUTING.md) — development and testing workflow.
* [`docs/`](docs/) — technical notes, compatibility rules and testing documentation.
* [`docs/mod-side-rules.md`](docs/mod-side-rules.md) — client/server Packwiz rules.

---

# 🔒 Private project scope

Nexus Realms is primarily developed as a **private multiplayer project for friends**.

The repository is public for development, documentation and distribution purposes, but the project is not intended to be presented as a general-purpose public modpack with guaranteed support for arbitrary installations.

Configuration and gameplay decisions are made for the specific Nexus Realms environment.

---

# ⚖️ Third-party content

Nexus Realms integrates many third-party Minecraft mods, libraries and resource packs.

Those projects remain the property of their respective authors and are subject to their own licenses and distribution terms.

This repository does **not** grant additional redistribution rights for third-party content.

Packwiz metadata is preferred whenever possible so supported files can be retrieved from their original distribution sources rather than being re-uploaded directly.

---

# 📌 Project status

Nexus Realms is an evolving project.

Compatibility, performance and gameplay systems are tested incrementally, and some experimental ideas may be changed or removed when they introduce instability or conflict with the rest of the pack.

For the current development history, see:

**[`CHANGELOG.md`](CHANGELOG.md)**
