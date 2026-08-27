# ============================================================
# NEXUS REALMS - Nexus Crystal Animation
#
# X/Z = completamente fijas
# Y   = oscilacion vertical +-0.30
# Yaw = rotacion continua
#
# La gema vuelve EXACTAMENTE a su posicion inicial
# cada 80 ticks.
# ============================================================

scoreboard players add @e[type=minecraft:item_display,tag=nexus_crystal_core] nexus_crystal_phase 1


# ------------------------------------------------------------
# FASE 1 — CENTRO -> ARRIBA
# ticks 1..20
#
# 20 x 0.015 = +0.30 bloques
# ------------------------------------------------------------

execute as @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=1..20}] at @s run tp @s ~ ~0.015 ~ ~1.5 ~


# ------------------------------------------------------------
# FASE 2 — ARRIBA -> ABAJO
# ticks 21..60
#
# 40 x -0.015 = -0.60 bloques
#
# +0.30 -> -0.30
# ------------------------------------------------------------

execute as @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=21..60}] at @s run tp @s ~ ~-0.015 ~ ~1.5 ~


# ------------------------------------------------------------
# FASE 3 — ABAJO -> CENTRO
# ticks 61..80
#
# 20 x 0.015 = +0.30 bloques
# ------------------------------------------------------------

execute as @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=61..80}] at @s run tp @s ~ ~0.015 ~ ~1.5 ~


# ------------------------------------------------------------
# REINICIO
# ------------------------------------------------------------

scoreboard players set @e[type=minecraft:item_display,tag=nexus_crystal_core,scores={nexus_crystal_phase=80..}] nexus_crystal_phase 0