// ============================================================
// NEXUS REALMS - COMANDO TEMPORAL DE PRUEBA PARA PATHS
//
// /nexuspath end
// /nexuspath straight
// /nexuspath corner
// /nexuspath t
// /nexuspath cross
//
// Coloca la pieza a tus pies y la registra como fuente de audio.
// ============================================================

(function () {

    function placePath(player, id) {
        if (!player) {
            return 0
        }

        var level = player.level

        var x = Math.floor(player.x)
        var groundY = Math.floor(player.y) - 1
        var z = Math.floor(player.z)

        var target =
            level.getBlock(
                x,
                groundY + 1,
                z
            )

        if (
            String(target.id) !==
            'minecraft:air'
        ) {
            player.tell(
                '§cNo hay aire encima del suelo para colocar el path.'
            )
            return 0
        }

        target.set(id)

        try {
            if (
                global.NexusAmbient &&
                global.NexusAmbient.registerSource
            ) {
                global.NexusAmbient.registerSource(
                    player.server,
                    String(level.dimension),
                    x,
                    groundY + 1,
                    z
                )
            }
        } catch (error) {
            console.error(
                '[NEXUS PATH TEST] Error registrando audio: ' +
                error
            )
        }

        player.tell(
            '§dPath colocado: ' +
            id +
            ' §7(con audio)'
        )

        return 1
    }


    ServerEvents.commandRegistry(function (event) {
        var Commands = event.commands

        var root =
            Commands.literal('nexuspath')
                .requires(function (source) {
                    return source.hasPermission(2)
                })

        root.then(
            Commands.literal('end')
                .executes(function (ctx) {
                    return placePath(
                        ctx.source.player,
                        'kubejs:nexus_path_end'
                    )
                })
        )

        root.then(
            Commands.literal('straight')
                .executes(function (ctx) {
                    return placePath(
                        ctx.source.player,
                        'kubejs:nexus_path_straight'
                    )
                })
        )

        root.then(
            Commands.literal('corner')
                .executes(function (ctx) {
                    return placePath(
                        ctx.source.player,
                        'kubejs:nexus_path_corner'
                    )
                })
        )

        root.then(
            Commands.literal('t')
                .executes(function (ctx) {
                    return placePath(
                        ctx.source.player,
                        'kubejs:nexus_path_t'
                    )
                })
        )

        root.then(
            Commands.literal('cross')
                .executes(function (ctx) {
                    return placePath(
                        ctx.source.player,
                        'kubejs:nexus_path_cross'
                    )
                })
        )

        event.register(root)
    })

})()
