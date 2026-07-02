# Branch strategy

## main

`main` is the stable branch used by friends through Prism Launcher and GitHub Pages.

Only merge changes into `main` after local testing. For risky gameplay changes, also test on a server.

## dev

`dev` is the recommended branch for testing new mods, configs, KubeJS changes, quests, and balance changes.

Recommended flow:

1. Work in `dev`.
2. Test locally.
3. Test on a server when needed.
4. Merge to `main`.
5. Push `main`.
6. Friends update automatically when opening Prism.

## Do not split server and client branches

Do not create separate `server` and `client` branches. That duplicates the modpack and makes it harder to maintain.

Use packwiz mod sides instead:

```toml
side = "client"
side = "server"
side = "both"
```

