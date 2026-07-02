# Contributing

Nexus Realms is a private modpack for friends. Changes should be tested before they are merged into the stable `main` branch.

## Workflow

1. Work on a local `dev` branch.
2. Add or update mods with packwiz whenever possible.
3. Run `packwiz refresh` after changing pack files, once packwiz is installed.
4. Run `./scripts/dev-check.sh`.
5. Test locally in Prism Launcher.
6. Test on a server before merging into `main` when the change affects gameplay, world generation, quests, combat, dimensions, entities, or configs.

## Rules

- Do not commit personal worlds, logs, screenshots, crash reports, tokens, or credentials.
- Do not upload third-party mod `.jar` files unless there is no packwiz-compatible source and the license allows it.
- Do not use separate `server` and `client` branches. Use packwiz `side = "client"`, `side = "server"`, or `side = "both"` in mod `.pw.toml` files.
- Keep `main` stable for friends.

