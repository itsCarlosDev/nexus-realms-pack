StartupEvents.registry('block', event => {

    // =====================================================
    // GRIETAS DECORATIVAS ACTUALES
    // =====================================================

    const scars = [
        'nexus_scar_1',
        'nexus_scar_2',
        'nexus_scar_3',
        'nexus_scar_4'
    ]

    scars.forEach(id => {
        event.create(id)
            .displayName('Grieta del Nexo')
            .model(`kubejs:block/${id}`)
            .renderType('translucent')
            .soundType('amethyst')
            .hardness(0.1)
            .noCollision()
            .notSolid()
            .noDrops()
            .noItem()
            .fullBlock(false)
            .opaque(false)
            .lightLevel(0.20)
    })


    // =====================================================
    // RED CONECTADA DE CORRUPCIÓN
    // =====================================================

    const paths = [
        'nexus_path_end',
        'nexus_path_straight',
        'nexus_path_corner',
        'nexus_path_t',
        'nexus_path_cross'
    ]

    paths.forEach(id => {
        event.create(id)
            .displayName('Grieta del Nexo')
            .model(`kubejs:block/${id}`)
            .renderType('translucent')
            .soundType('amethyst')
            .hardness(0.1)
            .noCollision()
            .notSolid()
            .noDrops()
            .noItem()
            .fullBlock(false)
            .opaque(false)
            .lightLevel(0.20)
    })
})