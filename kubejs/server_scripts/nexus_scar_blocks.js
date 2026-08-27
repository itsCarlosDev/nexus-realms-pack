// ============================================================
// NEXUS REALMS - CORRUPCION LIGADA AL BLOQUE INFERIOR
//
// Compatible con grietas antiguas + piezas de path.
// ============================================================

(function () {
    var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')

    var nexusBreakBlocks = [
        'kubejs:nexus_scar_1',
        'kubejs:nexus_scar_2',
        'kubejs:nexus_scar_3',
        'kubejs:nexus_scar_4',

        'kubejs:nexus_path_end',
        'kubejs:nexus_path_straight',
        'kubejs:nexus_path_corner',
        'kubejs:nexus_path_t',
        'kubejs:nexus_path_cross'
    ]

    function isNexusCorruption(id) {
        return nexusBreakBlocks.indexOf(String(id)) >= 0
    }

    function unregisterAudio(event, x, y, z) {
        try {
            if (
                global.NexusAmbient &&
                global.NexusAmbient.unregisterSource
            ) {
                global.NexusAmbient.unregisterSource(
                    event.server,
                    String(event.level.dimension),
                    x,
                    y,
                    z
                )
            }
        } catch (error) {
            console.error(
                '[NEXUS BREAK] Error eliminando fuente de audio: ' +
                error
            )
        }
    }

    nexusBreakBlocks.forEach(function (blockId) {
        BlockEvents.broken(
            blockId,
            function (event) {
                var x = event.block.x
                var y = event.block.y
                var z = event.block.z

                unregisterAudio(
                    event,
                    x,
                    y,
                    z
                )

                var belowPos =
                    new BlockPos(
                        x,
                        y - 1,
                        z
                    )

                event.level.destroyBlock(
                    belowPos,
                    true,
                    event.player
                )
            }
        )
    })

    BlockEvents.broken(function (event) {
        var above =
            event.level.getBlock(
                event.block.x,
                event.block.y + 1,
                event.block.z
            )

        if (
            isNexusCorruption(
                above.id
            )
        ) {
            unregisterAudio(
                event,
                above.x,
                above.y,
                above.z
            )

            above.set('minecraft:air')
        }
    })
})()
