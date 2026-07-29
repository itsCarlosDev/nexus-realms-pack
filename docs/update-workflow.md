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

Start `packwiz serve` in the development repository and use the localhost URL
only for that explicit test:

```bash
java -jar packwiz-installer-bootstrap.jar -g -s server http://127.0.0.1:8080/pack.toml
```

## Stable release

1. Merge `dev` into `main`.
2. Push `main` to GitHub.
3. The Pages workflow validates Packwiz, builds the isolated site and deploys:
   `https://itscarlosdev.github.io/nexus-realms-pack/pack.toml`.
4. The server applies that published pack on its next wrapper-controlled
   restart.
5. Friends update automatically when they open the Prism instance.

## Avoid manual jars

Prefer:

```bash
packwiz modrinth add MOD_SLUG
packwiz curseforge add PROJECT_SLUG_OR_ID
```

Only commit a `.jar` manually if there is no better option and the license allows redistribution.
