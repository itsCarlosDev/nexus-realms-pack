// Nexus Realms - Nexus Crystal V6
// Shader-safe two-layer crystal in ONE OBJ / ONE item_display.
StartupEvents.registry('item', event => {
  event.create('nexus_crystal')
    .displayName('Cristal del Nexo')
    .maxStackSize(1)
    .modelJson({
      loader: 'forge:obj',
      model: 'kubejs:models/item/nexus_crystal.obj',
      flip_v: true,
      automatic_culling: false,
      shade_quads: true,
      emissive_ambient: true,
      render_type: 'minecraft:translucent',
      textures: {
        shell: 'kubejs:item/nexus_crystal_shell',
        core: 'kubejs:item/nexus_crystal_core',
        particle: 'kubejs:item/nexus_crystal_shell'
      }
    })
})
