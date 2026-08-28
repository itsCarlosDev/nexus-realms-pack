// ============================================================
// NEXUS REALMS - COLOCACION DE GRIETAS + TERRENO CORROMPIDO
//
// IMPORTANTE:
// Todo va dentro de una IIFE para no redeclarar variables de otros
// server_scripts de KubeJS.
// ============================================================

(function () {
    var nexusPlaceScars = [
        'kubejs:nexus_scar_1',
        'kubejs:nexus_scar_2',
        'kubejs:nexus_scar_3',
        'kubejs:nexus_scar_4'
    ]

    function dryGrass(level, x, baseY, z) {
        for (var dy = 2; dy >= -2; dy--) {
            var block = level.getBlock(x, baseY + dy, z)
            var id = String(block.id)

            // Tierra corrompida permanente:
            // el césped vanilla no puede volver a extenderse aquí.
            if (
                id === 'minecraft:grass_block' ||
                id === 'minecraft:dirt'
            ) {
                block.set('minecraft:coarse_dirt')
                return
            }

            if (
                id === 'minecraft:air' ||
                id === 'minecraft:grass' ||
                id === 'minecraft:tall_grass' ||
                id === 'minecraft:snow'
            ) {
                continue
            }

            return
        }
    }

    function corruptGround(level, x, y, z) {
        var positions = [
            [ 0,  0, 1.00],

            [ 1,  0, 0.95],
            [-1,  0, 0.95],
            [ 0,  1, 0.95],
            [ 0, -1, 0.95],

            [ 1,  1, 0.70],
            [-1,  1, 0.70],
            [ 1, -1, 0.70],
            [-1, -1, 0.70],

            [ 2,  0, 0.45],
            [-2,  0, 0.45],
            [ 0,  2, 0.45],
            [ 0, -2, 0.45],

            [ 2,  1, 0.25],
            [ 2, -1, 0.25],
            [-2,  1, 0.25],
            [-2, -1, 0.25],

            [ 1,  2, 0.25],
            [-1,  2, 0.25],
            [ 1, -2, 0.25],
            [-1, -2, 0.25]
        ]

        positions.forEach(function (entry) {
            var dx = entry[0]
            var dz = entry[1]
            var chance = entry[2]

            if (Math.random() <= chance) {
                dryGrass(level, x + dx, y, z + dz)
            }
        })
    }

    function canPlaceCrystal(level, x, y, z) {
        var target = level.getBlock(x, y, z)
        var below = level.getBlock(x, y - 1, z)

        if (String(target.id) !== 'minecraft:air') {
            return false
        }

        var belowId = String(below.id)

        return (
            belowId === 'minecraft:coarse_dirt' ||
            belowId === 'minecraft:dirt' ||
            belowId === 'minecraft:stone' ||
            belowId === 'minecraft:deepslate' ||
            belowId === 'minecraft:sand' ||
            belowId === 'minecraft:gravel'
        )
    }


    function placeNexusCrystal(level, x, y, z) {

        if (!canPlaceCrystal(level, x, y, z)) {
            return false
        }

        var roll = Math.random()
        var crystal

        if (roll < 0.55) {
            crystal = 'minecraft:small_amethyst_bud'
        } else if (roll < 0.85) {
            crystal = 'minecraft:medium_amethyst_bud'
        } else {
            crystal = 'minecraft:amethyst_cluster'
        }

        level.getBlock(x, y, z).set(crystal)

        return true
    }


    function spawnNexusCrystals(level, x, y, z) {

        // Solo ~40% de las grietas generan cristales.
        if (Math.random() > 0.40) {
            return
        }

        var candidates = [
            [ 1,  0],
            [-1,  0],
            [ 0,  1],
            [ 0, -1],

            [ 1,  1],
            [-1,  1],
            [ 1, -1],
            [-1, -1],

            [ 2,  0],
            [-2,  0],
            [ 0,  2],
            [ 0, -2]
        ]

        // Desordenamos posiciones
        candidates.sort(function () {
            return Math.random() - 0.5
        })

        var wanted = 1 + Math.floor(Math.random() * 3)
        var placed = 0

        for (
            var i = 0;
            i < candidates.length && placed < wanted;
            i++
        ) {

            var dx = candidates[i][0]
            var dz = candidates[i][1]

            if (
                placeNexusCrystal(
                    level,
                    x + dx,
                    y + 1,
                    z + dz
                )
            ) {
                placed++
            }
        }
    }

    function placeNexusScar(player, forcedScar) {
        if (!player) {
            return 0
        }

        var level = player.level

        var x = Math.floor(player.x)
        var y = Math.floor(player.y) - 1
        var z = Math.floor(player.z)

        var above = level.getBlock(x, y + 1, z)

        if (String(above.id) !== 'minecraft:air') {
            player.tell('§cNo hay espacio para colocar la grieta.')
            return 0
        }

        corruptGround(level, x, y, z)

        var scar = forcedScar

        if (!scar) {
            scar = nexusPlaceScars[
                Math.floor(Math.random() * nexusPlaceScars.length)
            ]
        }

        above.set(scar)
        spawnNexusCrystals(level, x, y, z)

        // REGISTRO AUTOMATICO COMO FUENTE DE SONIDO.
        try {
            if (
                global.NexusAmbient &&
                global.NexusAmbient.registerSource
            ) {
                global.NexusAmbient.registerSource(
                    player.server,
                    String(level.dimension),
                    x,
                    y + 1,
                    z
                )
            } else {
                console.warn(
                    '[NEXUS PLACE] NexusAmbient no esta disponible; ' +
                    'la grieta se coloco pero no se registro para audio.'
                )
            }
        } catch (error) {
            console.error(
                '[NEXUS PLACE] Error registrando audio: ' + error
            )
        }

        player.tell('§dGrieta colocada: ' + scar)
        return 1
    }

    ServerEvents.commandRegistry(function (event) {
        var Commands = event.commands

        var command = Commands.literal('nexusscar')
            .requires(function (source) {
                return source.hasPermission(2)
            })
            .executes(function (ctx) {
                return placeNexusScar(ctx.source.player, null)
            })

        command.then(
            Commands.literal('1')
                .executes(function (ctx) {
                    return placeNexusScar(
                        ctx.source.player,
                        'kubejs:nexus_scar_1'
                    )
                })
        )

        command.then(
            Commands.literal('2')
                .executes(function (ctx) {
                    return placeNexusScar(
                        ctx.source.player,
                        'kubejs:nexus_scar_2'
                    )
                })
        )

        command.then(
            Commands.literal('3')
                .executes(function (ctx) {
                    return placeNexusScar(
                        ctx.source.player,
                        'kubejs:nexus_scar_3'
                    )
                })
        )

        command.then(
            Commands.literal('4')
                .executes(function (ctx) {
                    return placeNexusScar(
                        ctx.source.player,
                        'kubejs:nexus_scar_4'
                    )
                })
        )

        event.register(command)
    })
})()
