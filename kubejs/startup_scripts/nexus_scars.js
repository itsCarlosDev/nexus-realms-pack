StartupEvents.registry('block', event => {
  
  function createNexusScar(id, displayName, modelPath) {
    event.create(id)
      .displayName(displayName)
      .model(modelPath)
      .renderType('translucent')
      .noCollision()
      .notSolid()
      .fullBlock(false)
      .opaque(false)
      .defaultCutout()
  }

  createNexusScar(
    'nexus_scar_1',
    'Grieta del Nexo',
    'kubejs:block/nexus_scar_1'
  )

  createNexusScar(
    'nexus_scar_2',
    'Grieta del Nexo',
    'kubejs:block/nexus_scar_2'
  )

  createNexusScar(
    'nexus_scar_3',
    'Grieta del Nexo',
    'kubejs:block/nexus_scar_3'
  )

  createNexusScar(
    'nexus_scar_4',
    'Grieta del Nexo',
    'kubejs:block/nexus_scar_4'
  )
})