# Nexus Crystal V4 - migra el display existente sin moverlo.
# Quita el fullbright global V3 para que solo el nucleo del OBJ sea emisivo.
execute as @e[type=minecraft:item_display,tag=nexus_crystal_core] run data remove entity @s brightness
tellraw @s {"text":"[Nexus] Visual V4 aplicado al Cristal del Nexo.","color":"light_purple"}
