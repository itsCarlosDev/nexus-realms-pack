# Nexus Realms

Nexus Realms is a private Minecraft modpack for playing with friends.

- Target Minecraft: `1.20.1`
- Loader: Forge
- Forge: `47.x`, exact version pending final choice in Prism Launcher and the server
- Recommended GitHub repo name: `nexus-realms-pack`
- Stable branch: `main`
- Test branch recommendation: `dev`

The pack mixes normal survival and Create building with soulslike warrior combat, tactical shooter gameplay, magic with Iron's Spells, bosses, structures, dinosaurs, dragons, and quest-based progression.

## Version target

Nexus Realms targets Minecraft `1.20.1` with Forge `47.x`.

This is the stable target for the pack because it keeps compatibility with the intended RPG/survival stack, including Create, TacZ, Iron's Spells, Cataclysm, Alex's Mobs, Farmer's Delight, Chef's Delight, YUNG's Better Dungeons, YUNG's Better Mineshafts, Cult of Azazel, Stellara, You Died, and similar Forge 1.20.1 mods.

Do not migrate to Minecraft `1.21.1` for now. The current priority is a stable Forge 1.20.1 pack.

Do not use Arsenal RPG Series, Clavis, or Immersive Hotbar for now because they do not fit the Forge 1.20.1 target well enough for this pack.

Superior RPG and Mushoku Tensei can be used as inspiration for class fantasy, progression, balance, and presentation, but should not be imported as complete packs.

## What packwiz is

packwiz manages Minecraft modpacks as text metadata. Instead of uploading every `.jar` to GitHub manually, packwiz stores `.pw.toml` files that point to Modrinth, CurseForge, or other download sources when possible.

This repo is prepared for packwiz, GitHub Pages, and Prism Launcher. Friends can update automatically from:

```txt
https://USUARIO.github.io/nexus-realms-pack/pack.toml
```

## Install packwiz

Install packwiz using the method recommended for your system:

- macOS with Homebrew, if available:
  ```bash
  brew install packwiz
  ```
- Or download it from the official packwiz releases and place it somewhere in your `PATH`.

Check that it works:

```bash
packwiz --version
```

## Complete the packwiz initialization

`packwiz` was not available when this repo structure was created, so `pack.toml` is intentionally minimal.

Important: Forge is targeted as `47.x`, but the exact Forge build is not pinned yet. Do not publish a playable build until `pack.toml` has the exact Forge version used by Prism Launcher and the server.

Recommended next step after installing packwiz:

```bash
packwiz init
```

Use:

- Pack name: `Nexus Realms`
- Author: `Carlos`
- Minecraft version: `1.20.1`
- Loader: Forge

If packwiz can reuse the existing files, keep the current structure. If it rewrites pack metadata, review the diff in VSCode before committing.

Then run:

```bash
packwiz refresh
```

## Add mods from Modrinth

Use packwiz instead of downloading `.jar` files manually:

```bash
packwiz modrinth add MOD_SLUG
packwiz refresh
```

Example format only:

```bash
packwiz modrinth add modernfix
```

Do not install mods yet unless you are ready to test them.

## Add mods from CurseForge

Use:

```bash
packwiz curseforge add PROJECT_SLUG_OR_ID
packwiz refresh
```

Some CurseForge mods may require extra steps depending on download restrictions. Prefer metadata-managed mods whenever possible.

## Mod sides

Do not create separate `server` and `client` branches. Client/server separation belongs in each mod `.pw.toml` file:

```toml
side = "client"
side = "server"
side = "both"
```

See [docs/mod-side-rules.md](docs/mod-side-rules.md).

## Update configs

1. Change files in `config/`, `defaultconfigs/`, `kubejs/`, `resourcepacks/`, `shaderpacks/`, or other pack folders.
2. Run `packwiz refresh` after packwiz is installed.
3. Run `./scripts/dev-check.sh`.
4. Test in Prism Launcher.
5. Commit the changes.

## First recommended commands

`packwiz refresh` only works when packwiz is installed. If packwiz is not installed, install it first and then run the refresh step.

```bash
git checkout -b dev
packwiz refresh
./scripts/dev-check.sh
git add .
git commit -m "Initial Nexus Realms pack structure"
```

## Commit workflow

```bash
./scripts/dev-check.sh
git status
git add .
git commit -m "Describe the pack change"
```

## Connect with GitHub

Create an empty GitHub repository named `nexus-realms-pack`, then run:

```bash
git branch -M main
git remote add origin https://github.com/USUARIO/nexus-realms-pack.git
git push -u origin main
```

Replace `USUARIO` with your GitHub username.

## Activate GitHub Pages

In GitHub:

1. Open the repo.
2. Go to Settings.
3. Go to Pages.
4. Source: Deploy from branch.
5. Branch: `main`.
6. Folder: `/root`.

Expected URL:

```txt
https://USUARIO.github.io/nexus-realms-pack/pack.toml
```

Use that URL in Prism Launcher and on the server.

## Placeholders to replace

- `USUARIO`: your GitHub username.
- `nexus-realms-pack`: your GitHub repo name, if you choose a different one.
- `URL_DEL_PACK_TOML`: the final GitHub Pages URL for `pack.toml`.

## Private pack note

This repository is for private Nexus Realms configuration and pack metadata. It does not grant rights to redistribute third-party mods. Respect each mod's license and download terms.
