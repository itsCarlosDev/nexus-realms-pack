# Update workflow

## Local update

1. Work on `dev`.
2. Add or update mods with packwiz.
3. Change configs or KubeJS files.
4. Run:
   ```bash
   packwiz refresh
   ./scripts/dev-check.sh
   ```
5. Test in Prism Launcher.

## Server test

For gameplay changes, test on a temporary server before merging to `main`.

Use:

```bash
java -jar packwiz-installer-bootstrap.jar -g -s server URL_DEL_PACK_TOML
```

## Stable release

1. Merge `dev` into `main`.
2. Push `main` to GitHub.
3. GitHub Pages serves the updated `pack.toml`.
4. Friends update automatically when they open the Prism instance.

## Avoid manual jars

Prefer:

```bash
packwiz modrinth add MOD_SLUG
packwiz curseforge add PROJECT_SLUG_OR_ID
```

Only commit a `.jar` manually if there is no better option and the license allows redistribution.

