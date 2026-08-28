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
    // PIEZAS BASE DE PRUEBA
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


    // =====================================================
    // VARIANTES INTERNAS DE CONEXIÓN N/E/S/W
    // =====================================================

    const pathVariants = [
        'nexus_path_n',
        'nexus_path_e',
        'nexus_path_s',
        'nexus_path_w',

        'nexus_path_ns',
        'nexus_path_ew',

        'nexus_path_ne',
        'nexus_path_es',
        'nexus_path_sw',
        'nexus_path_wn',

        'nexus_path_new',
        'nexus_path_nes',
        'nexus_path_esw',
        'nexus_path_nsw',

        'nexus_path_nesw'
    ]

    pathVariants.forEach(id => {
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
