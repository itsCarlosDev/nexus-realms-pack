# Nexus Realms client with Prism Launcher

Production clients use only:

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
