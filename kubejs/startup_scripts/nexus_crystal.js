StartupEvents.registry('item', event => {
  event.create('nexus_crystal')
    .displayName('Cristal del Nexo')
    .maxStackSize(1)
    .modelJson({
      loader: 'forge:obj',
      model: 'kubejs:models/item/nexus_crystal.obj',
      flip_v: true,
      automatic_culling: false,
      shade_quads: false,
      emissive_ambient: true,
      render_type: 'minecraft:translucent',
      textures: {
        texture0: 'kubejs:item/nexus_crystal',
        particle: 'kubejs:item/nexus_crystal'
      }
    })
})
