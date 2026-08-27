# Nexus Crystal V5 - preserve current position.
execute as @e[type=minecraft:item_display,tag=nexus_crystal_core] run data remove entity @s brightness
tellraw @s {"text":"[Nexus] Visual V5 limpio aplicado al Cristal del Nexo.","color":"light_purple"}
