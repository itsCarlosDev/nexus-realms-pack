# ============================================================
# NEXUS REALMS - Nexus Crystal Animation
# Minecraft 1.20.1
#
# UNA gema.
# Movimiento vertical real.
# Rotacion real.
# 20 actualizaciones por segundo.
# ============================================================

# Avanza el contador
scoreboard players add @e[type=minecraft:item_display,tag=nexus_crystal_core] nexus_crystal_phase 1


# ------------------------------------------------------------
# SUBIDA
# ticks 1 - 40
#
# 0.015 bloques/tick
# 40 * 0.015 = 0.60 bloques
# ------------------------------------------------------------

execute as @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=1..40}] at @s run tp @s ~ ~0.015 ~ ~1.5 ~


# ------------------------------------------------------------
# BAJADA
# ticks 41 - 80
# ------------------------------------------------------------

execute as @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=41..80}] at @s run tp @s ~ ~-0.015 ~ ~1.5 ~


# ------------------------------------------------------------
# FIN DEL CICLO
# ------------------------------------------------------------

scoreboard players set @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=80..}] nexus_crystal_phase 0