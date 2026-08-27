# Nexus Crystal V6
# Un ancla invisible + UNA sola gema visible

function kubejs:nexus_crystal/remove

# Punto fijo del Nexo
summon minecraft:marker ~ ~ ~ {Tags:["nexus_crystal_anchor"]}

# ÚNICA gema visible
summon minecraft:item_display ~ ~2.6 ~ {Tags:["nexus_crystal","nexus_crystal_core"],item:{id:"kubejs:nexus_crystal",Count:1b},item_display:"fixed",billboard:"fixed",brightness:{block:15,sky:15},shadow_radius:0.0f,shadow_strength:0.0f,view_range:16.0f,transformation:{translation:[0.0f,0.0f,0.0f],left_rotation:[0.0f,0.0f,0.0f,1.0f],scale:[3.0f,3.0f,3.0f],right_rotation:[0.0f,0.0f,0.0f,1.0f]}}