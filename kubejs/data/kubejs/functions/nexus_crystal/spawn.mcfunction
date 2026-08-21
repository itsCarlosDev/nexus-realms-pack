# Nexus Crystal V3 - UNA sola entidad visual.
# Ejecuta estando en el centro del Nexo.
function kubejs:nexus_crystal/remove

summon minecraft:item_display ~ ~2.6 ~ {Tags:["nexus_crystal","nexus_crystal_core"],item:{id:"kubejs:nexus_crystal",Count:1b},item_display:"fixed",brightness:{block:15,sky:15},shadow_radius:0.0f,shadow_strength:0.0f,view_range:5.0f,start_interpolation:0,interpolation_duration:4,transformation:{translation:[0.0f,0.0f,0.0f],left_rotation:[0.0f,0.0f,0.0f,1.0f],scale:[3.0f,3.0f,3.0f],right_rotation:[0.0f,0.0f,0.0f,1.0f]}}
