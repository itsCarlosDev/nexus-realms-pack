# Nexus Realms Keybind Plan

## TaCZ / Firearms

- TaCZ Reload: R
- R must be used only for TaCZ Reload.

## Punchy

- Punchy config/menu: F8
- Punchy stays installed.
- Punchy Item Blacklist must exclude TaCZ weapons.
- Preferred blacklist regex: `^tacz:.*$`
- Manual steps:
  1. Equip a TaCZ weapon.
  2. Press F8.
  3. Open Item Blacklist.
  4. Add `^tacz:.*$` if regex is supported.
  5. If regex is not supported, add each TaCZ weapon/item manually.
  6. Press Save Profile.
  7. Test that normal tools still use Punchy but TaCZ guns do not duplicate.

## Combat

- Combat Roll: Left Alt
- Better Combat: keep default attack behavior.
- Do not use R for roll.

## Shaders

- Oculus Reload Shaders: F10 or Unbound.
- Do not use F8 because F8 opens Punchy config/menu.

## Camera

- Shoulder Surfing Reloaded base stays installed.
- Do not use SSR Camera Fixes for now because it caused broken camera/mouse/WASD behavior.
- Configure Biohazard-style camera manually:
  - right shoulder;
  - medium-close distance;
  - character visible;
  - weapon visible without duplication;
  - usable crosshair;
  - mouse camera must remain responsive.
- Shoulder Surfing Toggle Perspective: free key, avoid R/J/Left Alt.
- Shoulder Surfing Swap Shoulder: free key or extra mouse button if available.
- JourneyMap fullscreen: J.

## Pack 14.3 Biohazard Gunplay

- Third Person Shooting should improve TaCZ + Shoulder Surfing behavior.
- Keep TaCZ Reload on R.
- Keep Punchy menu/config on F8.
- Keep Combat Roll on Left Alt.
- Oculus Reload Shaders should remain F10 or Unbound.
- Do not use SSR Camera Fixes.
- Test Shoulder Surfing with TaCZ ADS and hip-fire.
- Test whether projectiles/crosshair feel aligned in third person.
- If camera still feels wrong, tune Shoulder Surfing base settings manually before adding more mods.

## Default Options

- Do not commit root options.txt.
- Final keybind export will be done later with:
  `/defaultoptions saveKeys`
- Only commit config/defaultoptions/keybindings.txt when generated from a tested Prism instance.

## Manual steps in Prism

1. Open Controls.
2. Search for "Reload".
3. Leave R only on TaCZ Reload.
4. Search for "Roll".
5. Set Combat Roll to Left Alt.
6. Search for "Shader".
7. Set Oculus Reload Shaders to F10 or Unbound.
8. Open Punchy config/menu.
9. Add `^tacz:.*$` to item blacklist/exclusion if available, or add TaCZ weapons/items manually.
10. Open Shoulder Surfing config/menu.
11. Tune camera to right shoulder, medium-close distance, usable crosshair.
12. When all final keybinds are done, run `/defaultoptions saveKeys` in a later final pack.
