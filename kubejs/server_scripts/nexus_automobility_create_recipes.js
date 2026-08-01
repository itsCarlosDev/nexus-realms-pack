// Nexus Realms: Automobility progression through Create 6.0.8 and
// Create Crafts & Additions 1.3.3. Only selected original recipe IDs are
// replaced; component-bearing results retain Automobility's native format.

ServerEvents.recipes(event => {
  function mechanicRecipe(id, category, sortnum, ingredients, result) {
    event.remove({ id: id })
    event.custom({
      type: 'automobility:auto_mechanic_table',
      category: category,
      sortnum: sortnum,
      ingredients: ingredients,
      result: result
    }).id(id)
  }

  function component(item, componentId) {
    return {
      item: item,
      component: componentId
    }
  }

  event.remove({ id: 'automobility:auto_mechanic_table' })
  event.shaped(
    'automobility:auto_mechanic_table',
    [
      'ACA',
      'SSS'
    ],
    {
      A: 'create:andesite_alloy',
      C: 'create:cogwheel',
      S: '#minecraft:stone_crafting_materials'
    }
  ).id('automobility:auto_mechanic_table')

  event.remove({ id: 'automobility:automobile_assembler' })
  event.shaped(
    'automobility:automobile_assembler',
    [
      'APA',
      'AMA',
      'SSS'
    ],
    {
      A: 'create:andesite_alloy',
      P: 'create:mechanical_press',
      M: 'create:precision_mechanism',
      S: '#minecraft:stone_crafting_materials'
    }
  ).id('automobility:automobile_assembler')

  // Basic workshop tier: a usable motorcar and passenger seat.
  mechanicRecipe(
    'automobility:wheel/standard_wheel',
    'automobility:wheels',
    100,
    [
      { item: 'minecraft:black_wool' },
      { item: 'create:shaft' },
      { item: 'minecraft:black_wool' }
    ],
    component(
      'automobility:automobile_wheel',
      'automobility:standard'
    )
  )

  mechanicRecipe(
    'automobility:engine/stone_engine',
    'automobility:engines',
    0,
    [
      { item: 'minecraft:furnace' },
      { item: 'create:cogwheel' },
      { item: 'minecraft:coal' },
      { item: 'create:shaft' },
      { item: 'create:andesite_alloy' }
    ],
    component(
      'automobility:automobile_engine',
      'automobility:stone'
    )
  )

  mechanicRecipe(
    'automobility:frame/wooden_motorcar',
    'automobility:frames',
    0,
    [
      { item: 'minecraft:redstone' },
      { item: 'create:shaft' },
      { item: 'minecraft:leather' },
      { tag: 'minecraft:planks' },
      { tag: 'minecraft:planks' },
      { item: 'minecraft:smooth_stone' },
      { item: 'create:andesite_alloy' },
      { item: 'minecraft:iron_ingot' }
    ],
    component(
      'automobility:automobile_frame',
      'automobility:wooden_motorcar'
    )
  )

  mechanicRecipe(
    'automobility:attachment/rear/passenger_seat',
    'automobility:attachments',
    100,
    [
      { tag: 'minecraft:wool' },
      { tag: 'minecraft:wool' },
      { tag: 'minecraft:planks' },
      { item: 'create:andesite_alloy' },
      { item: 'create:shaft' },
      { tag: 'minecraft:logs' }
    ],
    component(
      'automobility:rear_attachment',
      'automobility:passenger_seat'
    )
  )

  // Intermediate power tier: Create Crafts & Additions electrical parts.
  mechanicRecipe(
    'automobility:engine/copper_engine',
    'automobility:engines',
    1,
    [
      { item: 'minecraft:copper_ingot' },
      { item: 'minecraft:furnace' },
      { item: 'createaddition:capacitor' },
      { item: 'createaddition:copper_rod' },
      { item: 'create:cogwheel' }
    ],
    component(
      'automobility:automobile_engine',
      'automobility:copper'
    )
  )

  mechanicRecipe(
    'automobility:engine/iron_engine',
    'automobility:engines',
    2,
    [
      { item: 'minecraft:iron_ingot' },
      { item: 'createaddition:electric_motor' },
      { item: 'minecraft:redstone_block' },
      { item: 'create:precision_mechanism' },
      { item: 'createaddition:capacitor' }
    ],
    component(
      'automobility:automobile_engine',
      'automobility:iron'
    )
  )

  // Advanced agricultural tier.
  mechanicRecipe(
    'automobility:wheel/tractor_wheel',
    'automobility:wheels',
    101,
    [
      { item: 'minecraft:black_wool' },
      { item: 'create:belt_connector' },
      { item: 'create:shaft' },
      { item: 'createaddition:brass_rod' }
    ],
    component(
      'automobility:automobile_wheel',
      'automobility:tractor'
    )
  )

  ;[
    ['red', 100],
    ['yellow', 101],
    ['green', 102],
    ['blue', 103]
  ].forEach(entry => {
    const color = entry[0]

    mechanicRecipe(
      `automobility:frame/${color}_tractor`,
      'automobility:frames',
      entry[1],
      [
        { item: 'create:sturdy_sheet' },
        { item: 'create:precision_mechanism' },
        { item: 'createaddition:iron_rod' },
        { item: `minecraft:${color}_dye` },
        { item: 'minecraft:iron_bars' }
      ],
      component(
        'automobility:automobile_frame',
        `automobility:${color}_tractor`
      )
    )
  })

  mechanicRecipe(
    'automobility:attachment/front/crop_harvester',
    'automobility:attachments',
    1,
    [
      { item: 'create:mechanical_harvester' },
      { item: 'create:andesite_alloy' },
      { item: 'createaddition:iron_rod' },
      { item: 'createaddition:copper_rod' },
      { item: 'create:andesite_alloy' }
    ],
    component(
      'automobility:front_attachment',
      'automobility:crop_harvester'
    )
  )

  mechanicRecipe(
    'automobility:attachment/front/grass_cutter',
    'automobility:attachments',
    0,
    [
      { item: 'create:mechanical_saw' },
      { item: 'create:andesite_alloy' },
      { item: 'createaddition:iron_rod' },
      { item: 'create:shaft' },
      { item: 'create:andesite_alloy' }
    ],
    component(
      'automobility:front_attachment',
      'automobility:grass_cutter'
    )
  )

  mechanicRecipe(
    'automobility:attachment/rear/backhoe',
    'automobility:attachments',
    300,
    [
      { item: 'create:mechanical_plough' },
      { item: 'create:andesite_alloy' },
      { item: 'createaddition:iron_rod' },
      { item: 'create:shaft' }
    ],
    component(
      'automobility:rear_attachment',
      'automobility:backhoe'
    )
  )

  mechanicRecipe(
    'automobility:attachment/rear/paver',
    'automobility:attachments',
    301,
    [
      { item: 'create:mechanical_roller' },
      { item: 'create:andesite_alloy' },
      { item: 'createaddition:iron_rod' },
      { item: 'create:shaft' }
    ],
    component(
      'automobility:rear_attachment',
      'automobility:paver'
    )
  )
})
