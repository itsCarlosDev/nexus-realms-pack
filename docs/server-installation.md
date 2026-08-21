# Nexus Realms production server

Production updates use only:

```text
https://itscarlosdev.github.io/nexus-realms-pack/pack.toml
```

## One-time installation

1. Install the Forge `1.20.1-47.4.10` dedicated server.
2. Put the official `packwiz-installer-bootstrap.jar` in the server root.
3. Download and extract:
   `https://itscarlosdev.github.io/nexus-realms-pack/downloads/NexusRealms-ServerRuntime.zip`
   into the server root. It creates `nexus-runtime/`.
4. Keep the hosting panel configured to use Java 17.
5. Use the startup command below.

## PrismNodes/Pterodactyl startup command

Run from the server root:

```bash
SERVER_ROOT="$PWD" NEXUS_PACK_URL="https://itscarlosdev.github.io/nexus-realms-pack/pack.toml" JAVA_BIN=java NEXUS_ALLOW_OFFLINE_START=false NEXUS_REQUIRE_UPDATE=true bash "$PWD/nexus-runtime/update-server.sh"
```

After a validated update, the wrapper starts Forge with the same structure as
the generated local `run.sh`:

```bash
"$JAVA_BIN" @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt nogui
```

The wrapper acquires `.nexus-update.lock`, verifies Java 17, downloads and
validates the published Packwiz index, runs the installer with side `server`,
applies the SHA-256-allowlisted Java patches, verifies protected state and
starts Forge only after every check succeeds. Update output is appended to
`logs/nexus-update.log`.

For production HTTPS updates, the wrapper also downloads the patcher source
and JourneyMap initialization template published by `main`, verifies them
against `server/runtime.sha256`, and uses the verified cached copies.

`NEXUS_REQUIRE_UPDATE=true` blocks startup when the production update is
unavailable or invalid. An intentional emergency offline start requires both:

```bash
NEXUS_REQUIRE_UPDATE=false
NEXUS_ALLOW_OFFLINE_START=true
```

Localhost is rejected by default. A development-only local Packwiz URL also
requires:

```bash
NEXUS_ALLOW_LOCAL_PACK_URL=true
```

## Protected operational state

Packwiz is rejected if its index manages the active world from `level-name`,
JourneyMap server state, Simple Voice Chat server state or the server identity
files. Before and after an update, the wrapper hashes:

- the complete active world, including `level.dat`, `playerdata`, `entities`,
  `region`, `data`, Easy NPC, FTB Quests, FTB Essentials homes and rank data;
- `ops.json`, `whitelist.json`, bans and `usercache.json`;
- `server.properties` and `eula.txt`;
- `journeymap/server/`;
- `config/voicechat/voicechat-server.properties`;
- `.env` and `secrets/` when present.

Missing FTB Essentials, FTB Ranks and JourneyMap world configuration may be
initialized once. Existing operational copies are never replaced.

The owner gate requires the private `ops.json` to contain exactly one operator
with a valid Minecraft name and UUID at level 4. The updater derives that
identity at runtime; no owner identity is stored in the repository. The server
also requires `op-permission-level=4`.
