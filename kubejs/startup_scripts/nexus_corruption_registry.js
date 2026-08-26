StartupEvents.registry('block', event => {

    const scars = [
        'nexus_scar_1',
        'nexus_scar_2',
        'nexus_scar_3',
        'nexus_scar_4'
    ]

    scars.forEach(id => {
        event.create(id)
            .displayName('Grieta del Nexo')
            .soundType('stone')
            .model(`kubejs:block/${id}`)
            .renderType('translucent')
            .hardness(0.5)
            .noCollision()
            .notSolid()
            .noDrops()
            .noItem()
            .fullBlock(false)
            .opaque(false)
            .lightLevel(0.20)
    })
})