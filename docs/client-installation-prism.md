# Client installation with Prism Launcher

This guide is for friends joining Nexus Realms.

## Requirements

- Prism Launcher installed.
- Java compatible with Minecraft 1.20.1 Forge.
- The Nexus Realms pack URL:
  ```txt
  URL_DEL_PACK_TOML
  ```

Final URL format:

```txt
https://itscarlosdev.github.io/nexus-realms-pack/pack.toml
```

## Option A: import a prepared instance

If Carlos provides a prepared Prism instance, import it into Prism Launcher and check that the pre-launch command points to the final pack URL.

## Option B: create the instance manually

1. Open Prism Launcher.
2. Create a new instance.
3. Select Minecraft `1.20.1`.
4. Install Forge using the exact Forge version chosen for the server.
5. Download `packwiz-installer-bootstrap.jar`.
6. Put `packwiz-installer-bootstrap.jar` in the instance folder.
7. Open instance settings.
8. Enable custom commands.
9. Set the pre-launch command:

```bash
"$INST_JAVA" -jar packwiz-installer-bootstrap.jar URL_DEL_PACK_TOML
```

Replace `URL_DEL_PACK_TOML` with:

```txt
https://itscarlosdev.github.io/nexus-realms-pack/pack.toml
```

## Updating

Every time the game starts, the pre-launch command checks the pack and updates changed files automatically.

If the instance does not update:

- Confirm the GitHub Pages URL opens in a browser.
- Confirm the pre-launch command has the correct URL.
- Confirm `packwiz-installer-bootstrap.jar` is in the instance folder.

