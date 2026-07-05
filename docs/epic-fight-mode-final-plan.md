# Epic Fight Mode Final Plan

## Final architecture

- KubeJS blocks items by class.
- Epic Tweaks controls Battle/Mining Mode using item preferences.
- `canSwitchPlayerMode` must stay `true`.
- Epic Fight Toggle Battle/Mining Mode must be Not Bound.
- `minecraft:air` / Air must be configured as Preferred Tool from Epic Fight Item Preferences.
- TaCZ guns and Iron's Spells spellbooks must stay in Mining/Vanilla Mode.
- Warrior enters Battle Mode automatically when equipping compatible warrior weapons.
- Mage and Gunslinger stay in Mining/Vanilla Mode with empty hand, spellbook or TaCZ.
- Punchy keeps control of normal empty-hand/vanilla interactions when Air is not treated as an Epic Fight weapon.

## Epic Tweaks target values

If the generated Epic Tweaks config exists, the target values are:

```toml
autoswitch_mode = true
enforce_mode = true
filter_animation_first_person = true
```

Do not invent the config file if the mod has not generated it yet.

## Manual setup required if configs are missing

1. Start Minecraft from Prism.
2. Enter a test world.
3. Run `/gamerule canSwitchPlayerMode true`.
4. Open Epic Fight config/menu.
5. Go to Item Preferences.
6. Set Air / `minecraft:air` to Preferred Tool.
7. Open Controls.
8. Set Epic Fight Toggle Battle/Mining Mode to Not Bound.
9. Set TaCZ Reload to R.
10. Set Iron's Spells Spell Wheel to V or Z.
11. Run `/defaultoptions saveKeys` or `/defaultoptions saveAll`.
12. Close Minecraft.
13. Copy/version the generated configs into the pack.

## Do not use

- Do not use `canSwitchPlayerMode=false` as the final solution.
- Do not run `/epicfight mode mining <player>` every tick.
- Do not create root `options.txt`.
- Do not invent Epic Fight datapack overrides for `air.json` without validating the real structure.
