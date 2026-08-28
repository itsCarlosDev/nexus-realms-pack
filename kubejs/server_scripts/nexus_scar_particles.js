(function () {

    var NEXUS_PARTICLE_SOURCES_KEY = 'nexus_ambient_sources_v1'

    var NEXUS_PARTICLE_RADIUS = 14
    var NEXUS_PARTICLE_INTERVAL = 8   // cada 0,4 s
    var NEXUS_MAX_SOURCES_PER_PLAYER = 3

    var nexusParticleTick = 0


    function getNexusParticleSources(server) {

        try {
            var raw = String(
                server.persistentData.getString(NEXUS_PARTICLE_SOURCES_KEY) || ''
            )

            if (!raw) {
                return []
            }

            var parsed = JSON.parse(raw)

            if (Array.isArray(parsed)) {
                return parsed
            }

        } catch (error) {
            console.error(
                '[NEXUS PARTICLES] Error leyendo las grietas: ' + error
            )
        }

        return []
    }


    ServerEvents.tick(function (event) {

        nexusParticleTick++

        if (nexusParticleTick % NEXUS_PARTICLE_INTERVAL !== 0) {
            return
        }


        var sources = getNexusParticleSources(event.server)

        if (sources.length === 0) {
            return
        }


        event.server.players.forEach(function (player) {

            var playerDimension = String(player.level.dimension)

            var nearby = []


            sources.forEach(function (source) {

                if (String(source.dimension) !== playerDimension) {
                    return
                }

                var sx = Number(source.x) + 0.5
                var sy = Number(source.y) + 0.08
                var sz = Number(source.z) + 0.5

                var dx = player.x - sx
                var dy = player.y - sy
                var dz = player.z - sz

                var distanceSq =
                    dx * dx +
                    dy * dy +
                    dz * dz

                if (
                    distanceSq <=
                    NEXUS_PARTICLE_RADIUS * NEXUS_PARTICLE_RADIUS
                ) {
                    nearby.push({
                        source: source,
                        distanceSq: distanceSq
                    })
                }
            })


            nearby.sort(function (a, b) {
                return a.distanceSq - b.distanceSq
            })


            var amount = Math.min(
                nearby.length,
                NEXUS_MAX_SOURCES_PER_PLAYER
            )


            for (var i = 0; i < amount; i++) {

                var source = nearby[i].source

                var x = Number(source.x) + 0.5
                var y = Number(source.y) + 0.10
                var z = Number(source.z) + 0.5


                // Partícula violeta principal
                event.server.runCommandSilent(
                    'particle minecraft:reverse_portal ' +
                    x + ' ' +
                    y + ' ' +
                    z + ' ' +
                    '0.28 0.06 0.28 ' +
                    '0.015 2 normal ' +
                    player.username
                )


                // Pequeña chispa ocasional
                if (Math.random() < 0.20) {

                    event.server.runCommandSilent(
                        'particle minecraft:end_rod ' +
                        x + ' ' +
                        (y + 0.05) + ' ' +
                        z + ' ' +
                        '0.18 0.03 0.18 ' +
                        '0.005 1 normal ' +
                        player.username
                    )
                }
            }
        })
    })

})()