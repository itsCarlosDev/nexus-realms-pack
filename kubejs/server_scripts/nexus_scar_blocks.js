// ============================================================
// NEXUS REALMS - GRIETA LIGADA AL BLOQUE INFERIOR
//
// - Picar la grieta rompe tambien el bloque de debajo.
// - Picar el bloque inferior elimina la grieta.
// - La fuente de sonido se elimina del registro.
// ============================================================

(function () {
    var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')

    var nexusBreakScars = [
        'kubejs:nexus_scar_1',
        'kubejs:nexus_scar_2',
        'kubejs:nexus_scar_3',
        'kubejs:nexus_scar_4'
    ]

    function isNexusScar(id) {
        return nexusBreakScars.indexOf(String(id)) >= 0
    }

    function unregisterScarAudio(event, x, y, z) {
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
                '[NEXUS BREAK] Error eliminando fuente de audio: ' + error
            )
        }
    }

    nexusBreakScars.forEach(function (scar) {
        BlockEvents.broken(scar, function (event) {
            var x = event.block.x
            var y = event.block.y
            var z = event.block.z

            unregisterScarAudio(event, x, y, z)

            var belowPos = new BlockPos(x, y - 1, z)

            // Mantiene el comportamiento que ya te funcionaba:
            // la grieta se rompe normalmente y se destruye también el suelo.
            event.level.destroyBlock(
                belowPos,
                true,
                event.player
            )
        })
    })

    BlockEvents.broken(function (event) {
        var above = event.level.getBlock(
            event.block.x,
            event.block.y + 1,
            event.block.z
        )

        if (isNexusScar(above.id)) {
            unregisterScarAudio(
                event,
                above.x,
                above.y,
                above.z
            )

            above.set('minecraft:air')
        }
    })
})()
