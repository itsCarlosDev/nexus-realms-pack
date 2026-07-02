# Server installation

Nexus Realms servers should update from the same `pack.toml` URL as clients.

## Requirements

- Forge server for Minecraft `1.20.1`.
- The exact Forge version used by the Prism clients.
- `packwiz-installer-bootstrap.jar` in the server folder.
- Java installed.

## Update command

Run this in the server folder:

```bash
java -jar packwiz-installer-bootstrap.jar -g -s server URL_DEL_PACK_TOML
```

Example final URL format:

```txt
https://USUARIO.github.io/nexus-realms-pack/pack.toml
```

The `-s server` option downloads only mods marked as:

- `side = "server"`
- `side = "both"`

It skips client-only mods such as shaders, minimaps, camera tools, and visual optimization mods.

## Example start.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

PACK_URL="https://USUARIO.github.io/nexus-realms-pack/pack.toml"

java -jar packwiz-installer-bootstrap.jar -g -s server "$PACK_URL"
java -Xms4G -Xmx8G -jar forge-server.jar nogui
```

Adjust memory and the Forge server jar name for your host.

