// ============================================================
// NEXUS REALMS - AMBIENTE ESPACIAL DINAMICO DE LAS GRIETAS
// Forge 1.20.1 + KubeJS
//
// - Cada grieta registrada es una fuente de sonido real.
// - /nexusscar registra automaticamente la nueva grieta.
// - Al romper una grieta, nexus_scar_blocks.js la desregistra.
// - Las fuentes se guardan en server.persistentData.
// ============================================================

(function () {
    var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
    var BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')

    var SOURCES_KEY = 'nexus_ambient_sources_v1'
    var MAX_AUDIBLE_DISTANCE = 16
    var LOOP_OVERLAP = 2
    var CROSSFADE_TICKS = 60
    var BASE_VOLUME = 0.85
    var DEBUG = false

    var TRACKS = {
        1: {
            normal: 'kubejs:kevin_1',
            fadeInFast: 'kubejs:kevin_1_fade_in_fast',
            fadeIn: 'kubejs:kevin_1_fade_in',
            fadeOut: 'kubejs:kevin_1_fade',
            duration: 388,
            minNormalLoops: 0,
            maxNormalLoops: 2
        },
        2: {
            normal: 'kubejs:kevin_2',
            fadeInFast: 'kubejs:kevin_2_fade_in_fast',
            fadeIn: 'kubejs:kevin_2_fade_in',
            fadeOut: 'kubejs:kevin_2_fade',
            duration: 194,
            minNormalLoops: 2,
            maxNormalLoops: 5
        },
        3: {
            normal: 'kubejs:kevin_3',
            fadeInFast: 'kubejs:kevin_3_fade_in_fast',
            fadeIn: 'kubejs:kevin_3_fade_in',
            fadeOut: 'kubejs:kevin_3_fade',
            duration: 91,
            minNormalLoops: 6,
            maxNormalLoops: 12
        }
    }

    var nexusAmbientTick = 0
    var nexusAmbientStates = {}
    var nexusAmbientSourceCache = null

    function sourceKey(source) {
        return String(source.dimension) + ':' +
            Number(source.x) + ':' +
            Number(source.y) + ':' +
            Number(source.z)
    }

    function normaliseSource(dimension, x, y, z) {
        return {
            dimension: String(dimension),
            x: Math.floor(Number(x)),
            y: Math.floor(Number(y)),
            z: Math.floor(Number(z))
        }
    }

    function loadSources(server) {
        if (nexusAmbientSourceCache !== null) {
            return nexusAmbientSourceCache
        }

        nexusAmbientSourceCache = []

        try {
            var raw = String(server.persistentData.getString(SOURCES_KEY) || '')
            if (raw) {
                var parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                    parsed.forEach(function (entry) {
                        if (
                            entry &&
                            entry.dimension !== undefined &&
                            entry.x !== undefined &&
                            entry.y !== undefined &&
                            entry.z !== undefined
                        ) {
                            nexusAmbientSourceCache.push(
                                normaliseSource(entry.dimension, entry.x, entry.y, entry.z)
                            )
                        }
                    })
                }
            }
        } catch (error) {
            console.error('[NEXUS AMBIENT] No se pudieron cargar las fuentes persistentes: ' + error)
        }

        // Mantiene funcionando la grieta de prueba antigua.
        // Cuando ya no la necesites puedes borrar este bloque.
        var legacy = normaliseSource('minecraft:overworld', -62, 67, 307)
        var legacyKey = sourceKey(legacy)
        var foundLegacy = nexusAmbientSourceCache.some(function (source) {
            return sourceKey(source) === legacyKey
        })

        if (!foundLegacy) {
            nexusAmbientSourceCache.push(legacy)
        }

        return nexusAmbientSourceCache
    }

    function saveSources(server) {
        try {
            server.persistentData.putString(
                SOURCES_KEY,
                JSON.stringify(nexusAmbientSourceCache || [])
            )
        } catch (error) {
            console.error('[NEXUS AMBIENT] No se pudieron guardar las fuentes: ' + error)
        }
    }

    global.NexusAmbient = {
        registerSource: function (server, dimension, x, y, z) {
            var sources = loadSources(server)
            var source = normaliseSource(dimension, x, y, z)
            var key = sourceKey(source)

            var exists = sources.some(function (candidate) {
                return sourceKey(candidate) === key
            })

            if (!exists) {
                sources.push(source)
                saveSources(server)

                if (DEBUG) {
                    console.info('[NEXUS AMBIENT] Fuente añadida: ' + key)
                }
            }

            return true
        },

        unregisterSource: function (server, dimension, x, y, z) {
            var sources = loadSources(server)
            var key = sourceKey(normaliseSource(dimension, x, y, z))
            var before = sources.length

            nexusAmbientSourceCache = sources.filter(function (candidate) {
                return sourceKey(candidate) !== key
            })

            if (nexusAmbientSourceCache.length !== before) {
                saveSources(server)

                if (DEBUG) {
                    console.info('[NEXUS AMBIENT] Fuente eliminada: ' + key)
                }
            }

            return true
        }
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    function getPlayerState(player) {
        var username = String(player.username)

        if (!nexusAmbientStates[username]) {
            nexusAmbientStates[username] = {
                source: null,
                currentTrack: 0,
                phase: 'idle',
                normalLoopsRemaining: 0,
                nextSoundTick: 0
            }
        }

        return nexusAmbientStates[username]
    }

    function isScarAt(level, source) {
        try {
            var pos = new BlockPos(source.x, source.y, source.z)
            var state = level.getBlockState(pos)
            var id = String(BuiltInRegistries.BLOCK.getKey(state.getBlock()))

            return (
                id === 'kubejs:nexus_scar_1' ||
                id === 'kubejs:nexus_scar_2' ||
                id === 'kubejs:nexus_scar_3' ||
                id === 'kubejs:nexus_scar_4'
            )
        } catch (error) {
            return false
        }
    }

    function findNearestSoundBlock(player) {
        var dimension = String(player.level.dimension)
        var maxDistanceSq = MAX_AUDIBLE_DISTANCE * MAX_AUDIBLE_DISTANCE
        var nearest = null
        var nearestDistanceSq = maxDistanceSq
        var sources = loadSources(player.server)

        sources.forEach(function (source) {
            if (source.dimension !== dimension) {
                return
            }

            // Evita que una posición antigua siga sonando si ya no hay grieta.
            if (!isScarAt(player.level, source)) {
                return
            }

            var sx = source.x + 0.5
            var sy = source.y + 0.1
            var sz = source.z + 0.5

            var dx = player.x - sx
            var dy = player.y - sy
            var dz = player.z - sz
            var distanceSq = dx * dx + dy * dy + dz * dz

            if (distanceSq <= nearestDistanceSq) {
                nearestDistanceSq = distanceSq
                nearest = source
            }
        })

        return nearest
    }

    function playTrack(server, player, source, sound) {
        var username = String(player.username)
        var x = source.x + 0.5
        var y = source.y + 0.1
        var z = source.z + 0.5

        server.runCommandSilent(
            'playsound ' + sound + ' ambient ' + username + ' ' +
            x + ' ' + y + ' ' + z + ' ' +
            BASE_VOLUME + ' 1 0'
        )

        if (DEBUG) {
            console.info(
                '[NEXUS] ' + username + ' -> ' + sound +
                ' @ ' + source.x + ' ' + source.y + ' ' + source.z
            )
        }
    }

    function stopNexusSounds(server, player) {
        var username = String(player.username)

        var sounds = [
            'kubejs:kevin_1',
            'kubejs:kevin_1_fade_in_fast',
            'kubejs:kevin_1_fade_in',
            'kubejs:kevin_1_fade',
            'kubejs:kevin_2',
            'kubejs:kevin_2_fade_in_fast',
            'kubejs:kevin_2_fade_in',
            'kubejs:kevin_2_fade',
            'kubejs:kevin_3',
            'kubejs:kevin_3_fade_in_fast',
            'kubejs:kevin_3_fade_in',
            'kubejs:kevin_3_fade'
        ]

        sounds.forEach(function (sound) {
            server.runCommandSilent(
                'stopsound ' + username + ' ambient ' + sound
            )
        })
    }

    function pickDifferentTrack(previousTrack) {
        var next

        do {
            next = randomInt(1, 3)
        } while (previousTrack !== 0 && next === previousTrack)

        return next
    }

    function startTrack(server, player, state, previousTrack, fastEntry) {
        var nextTrack = pickDifferentTrack(previousTrack)
        var track = TRACKS[nextTrack]

        state.currentTrack = nextTrack
        state.normalLoopsRemaining = randomInt(
            track.minNormalLoops,
            track.maxNormalLoops
        )
        state.phase = 'normal'

        var sound = fastEntry ? track.fadeInFast : track.fadeIn

        playTrack(server, player, state.source, sound)

        state.nextSoundTick =
            nexusAmbientTick +
            track.duration -
            LOOP_OVERLAP
    }

    function processAudio(server, player, state) {
        if (!state.source) {
            return
        }

        if (state.phase === 'idle') {
            startTrack(server, player, state, 0, true)
            return
        }

        var track = TRACKS[state.currentTrack]

        if (state.phase === 'normal') {
            if (state.normalLoopsRemaining > 0) {
                playTrack(server, player, state.source, track.normal)
                state.normalLoopsRemaining--
                state.nextSoundTick =
                    nexusAmbientTick +
                    track.duration -
                    LOOP_OVERLAP
                return
            }

            playTrack(server, player, state.source, track.fadeOut)
            state.phase = 'crossfade'
            state.nextSoundTick =
                nexusAmbientTick +
                track.duration -
                CROSSFADE_TICKS
            return
        }

        if (state.phase === 'crossfade') {
            var previousTrack = state.currentTrack
            startTrack(server, player, state, previousTrack, false)
        }
    }

    ServerEvents.tick(function (event) {
        nexusAmbientTick++

        event.server.players.forEach(function (player) {
            var state = getPlayerState(player)
            var nearest = findNearestSoundBlock(player)

            if (nearest && !state.source) {
                state.source = nearest
                state.currentTrack = 0
                state.phase = 'idle'
                state.normalLoopsRemaining = 0
                state.nextSoundTick = nexusAmbientTick
            } else if (nearest && state.source) {
                state.source = nearest
            } else if (!nearest && state.source) {
                stopNexusSounds(event.server, player)
                state.source = null
                state.currentTrack = 0
                state.phase = 'idle'
                state.normalLoopsRemaining = 0
                return
            }

            if (
                state.source &&
                nexusAmbientTick >= state.nextSoundTick
            ) {
                processAudio(event.server, player, state)
            }
        })
    })
})()
