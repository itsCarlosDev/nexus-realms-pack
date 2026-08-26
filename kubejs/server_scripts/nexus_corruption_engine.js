// ============================================================
// NEXUS REALMS - MOTOR DE PROPAGACION REAL DE LA CORRUPCION
// Forge 1.20.1 + KubeJS
//
// Diseñado para:
// - Propagacion lenta y controlada desde focos/semillas.
// - Solo bloques naturales: no toca construcciones normales.
// - Solo trabaja cuando hay jugadores cerca del foco.
// - No fuerza chunks.
// - Convierte grass/dirt/podzol/mycelium -> coarse_dirt.
// - Coloca grietas, algunas amatistas y registra audio espaciado.
// - Estado persistente entre reinicios.
// ============================================================

(function () {

    var ENGINE_KEY = 'nexus_corruption_engine_v1'
    var AUDIO_KEY = 'nexus_ambient_sources_v1'

    var TICK_INTERVAL = 80
    var SCARS_PER_CYCLE = 2
    var RADIUS_GROWTH = 0.50
    var DEFAULT_MAX_RADIUS = 48
    var MAX_SCARS_PER_SEED = 160
    var PLAYER_ACTIVE_RADIUS = 96
    var SEARCH_UP = 12
    var SEARCH_DOWN = 20
    var AUDIO_SOURCE_SPACING = 8
    var CRYSTAL_CHANCE = 0.40
    var DEBUG = false

    var nexusPropagationTick = 0
    var nexusEngineCache = null

    function defaultState() {
        return {
            enabled: false,
            nextSeedId: 1,
            roundRobin: 0,
            seeds: []
        }
    }

    function loadState(server) {
        if (nexusEngineCache !== null) {
            return nexusEngineCache
        }

        try {
            var raw = String(server.persistentData.getString(ENGINE_KEY) || '')

            if (raw) {
                var parsed = JSON.parse(raw)

                if (parsed && Array.isArray(parsed.seeds)) {
                    nexusEngineCache = parsed

                    if (nexusEngineCache.enabled === undefined) {
                        nexusEngineCache.enabled = false
                    }

                    if (nexusEngineCache.nextSeedId === undefined) {
                        nexusEngineCache.nextSeedId = 1
                    }

                    if (nexusEngineCache.roundRobin === undefined) {
                        nexusEngineCache.roundRobin = 0
                    }

                    return nexusEngineCache
                }
            }
        } catch (error) {
            console.error('[NEXUS CORRUPTION] Error cargando estado: ' + error)
        }

        nexusEngineCache = defaultState()
        return nexusEngineCache
    }

    function saveState(server) {
        try {
            server.persistentData.putString(
                ENGINE_KEY,
                JSON.stringify(nexusEngineCache || defaultState())
            )
        } catch (error) {
            console.error('[NEXUS CORRUPTION] Error guardando estado: ' + error)
        }
    }

    function isNaturalGround(id) {
        id = String(id)

        return (
            id === 'minecraft:grass_block' ||
            id === 'minecraft:dirt' ||
            id === 'minecraft:coarse_dirt' ||
            id === 'minecraft:podzol' ||
            id === 'minecraft:mycelium' ||
            id === 'minecraft:sand' ||
            id === 'minecraft:red_sand' ||
            id === 'minecraft:gravel' ||
            id === 'minecraft:stone' ||
            id === 'minecraft:deepslate' ||
            id === 'minecraft:tuff'
        )
    }

    function isReplaceableAbove(id) {
        id = String(id)

        return (
            id === 'minecraft:air' ||
            id === 'minecraft:grass' ||
            id === 'minecraft:tall_grass' ||
            id === 'minecraft:snow'
        )
    }

    function chooseScar() {
        var roll = Math.random()

        if (roll < 0.35) return 'kubejs:nexus_scar_1'
        if (roll < 0.65) return 'kubejs:nexus_scar_2'
        if (roll < 0.95) return 'kubejs:nexus_scar_3'

        return 'kubejs:nexus_scar_4'
    }

    function findSurfaceY(level, x, guessY, z) {
        var top = guessY + SEARCH_UP
        var bottom = guessY - SEARCH_DOWN

        for (var y = top; y >= bottom; y--) {
            var ground = level.getBlock(x, y, z)

            if (!isNaturalGround(ground.id)) {
                continue
            }

            var above = level.getBlock(x, y + 1, z)

            if (isReplaceableAbove(above.id)) {
                return y
            }
        }

        return null
    }

    function killGrassAt(level, x, baseY, z) {
        var surfaceY = findSurfaceY(level, x, baseY, z)

        if (surfaceY === null) {
            return
        }

        var ground = level.getBlock(x, surfaceY, z)
        var id = String(ground.id)

        if (
            id === 'minecraft:grass_block' ||
            id === 'minecraft:dirt' ||
            id === 'minecraft:podzol' ||
            id === 'minecraft:mycelium'
        ) {
            ground.set('minecraft:coarse_dirt')
        }
    }

    function corruptGroundPatch(level, x, y, z) {
        var positions = [
            [0, 0, 1.00],
            [1, 0, 0.95], [-1, 0, 0.95], [0, 1, 0.95], [0, -1, 0.95],
            [1, 1, 0.70], [-1, 1, 0.70], [1, -1, 0.70], [-1, -1, 0.70],
            [2, 0, 0.35], [-2, 0, 0.35], [0, 2, 0.35], [0, -2, 0.35],
            [2, 1, 0.20], [2, -1, 0.20], [-2, 1, 0.20], [-2, -1, 0.20],
            [1, 2, 0.20], [-1, 2, 0.20], [1, -2, 0.20], [-1, -2, 0.20]
        ]

        positions.forEach(function (entry) {
            if (Math.random() <= entry[2]) {
                killGrassAt(level, x + entry[0], y, z + entry[1])
            }
        })
    }

    function chooseCrystal() {
        var roll = Math.random()

        if (roll < 0.55) return 'minecraft:small_amethyst_bud'
        if (roll < 0.85) return 'minecraft:medium_amethyst_bud'

        return 'minecraft:amethyst_cluster'
    }

    function tryPlaceCrystal(level, x, guessY, z) {
        var surfaceY = findSurfaceY(level, x, guessY, z)

        if (surfaceY === null) {
            return false
        }

        var target = level.getBlock(x, surfaceY + 1, z)

        if (String(target.id) !== 'minecraft:air') {
            return false
        }

        target.set(chooseCrystal())
        return true
    }

    function spawnCrystals(level, x, y, z) {
        if (Math.random() > CRYSTAL_CHANCE) {
            return
        }

        var candidates = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [2, 0], [-2, 0], [0, 2], [0, -2]
        ]

        candidates.sort(function () {
            return Math.random() - 0.5
        })

        var wanted = 1 + Math.floor(Math.random() * 3)
        var placed = 0

        for (var i = 0; i < candidates.length && placed < wanted; i++) {
            if (tryPlaceCrystal(level, x + candidates[i][0], y, z + candidates[i][1])) {
                placed++
            }
        }
    }

    function loadAudioSources(server) {
        try {
            var raw = String(server.persistentData.getString(AUDIO_KEY) || '')

            if (!raw) {
                return []
            }

            var parsed = JSON.parse(raw)

            if (Array.isArray(parsed)) {
                return parsed
            }
        } catch (error) {
            console.error('[NEXUS CORRUPTION] Error leyendo fuentes de audio: ' + error)
        }

        return []
    }

    function hasNearbyAudioSource(server, dimension, x, y, z) {
        var spacingSq = AUDIO_SOURCE_SPACING * AUDIO_SOURCE_SPACING
        var sources = loadAudioSources(server)

        for (var i = 0; i < sources.length; i++) {
            var source = sources[i]

            if (String(source.dimension) !== String(dimension)) {
                continue
            }

            var dx = Number(source.x) - x
            var dy = Number(source.y) - y
            var dz = Number(source.z) - z

            var distanceSq = dx * dx + dy * dy + dz * dz

            if (distanceSq < spacingSq) {
                return true
            }
        }

        return false
    }

    function maybeRegisterAudio(server, level, x, y, z) {
        if (hasNearbyAudioSource(server, String(level.dimension), x, y, z)) {
            return
        }

        try {
            if (global.NexusAmbient && global.NexusAmbient.registerSource) {
                global.NexusAmbient.registerSource(
                    server,
                    String(level.dimension),
                    x,
                    y,
                    z
                )
            }
        } catch (error) {
            console.error('[NEXUS CORRUPTION] Error registrando audio: ' + error)
        }
    }

    function getActiveLevelForSeed(server, seed) {
        var maxSq = PLAYER_ACTIVE_RADIUS * PLAYER_ACTIVE_RADIUS
        var players = server.players

        for (var i = 0; i < players.length; i++) {
            var player = players[i]

            if (String(player.level.dimension) !== String(seed.dimension)) {
                continue
            }

            var dx = player.x - seed.x
            var dy = player.y - seed.y
            var dz = player.z - seed.z

            var distanceSq = dx * dx + dy * dy + dz * dz

            if (distanceSq <= maxSq) {
                return player.level
            }
        }

        return null
    }

    function placeAutomaticScar(server, level, seed, x, z) {
        var surfaceY = findSurfaceY(level, x, seed.y, z)

        if (surfaceY === null) {
            return false
        }

        var ground = level.getBlock(x, surfaceY, z)

        if (!isNaturalGround(ground.id)) {
            return false
        }

        var above = level.getBlock(x, surfaceY + 1, z)
        var aboveId = String(above.id)

        if (!isReplaceableAbove(aboveId)) {
            return false
        }

        if (aboveId !== 'minecraft:air') {
            above.set('minecraft:air')
        }

        corruptGroundPatch(level, x, surfaceY, z)

        var scarBlock = level.getBlock(x, surfaceY + 1, z)

        if (String(scarBlock.id) !== 'minecraft:air') {
            return false
        }

        scarBlock.set(chooseScar())

        spawnCrystals(level, x, surfaceY, z)

        maybeRegisterAudio(server, level, x, surfaceY + 1, z)

        seed.placed++

        if (DEBUG) {
            console.info(
                '[NEXUS CORRUPTION] Seed #' +
                seed.id +
                ' -> grieta en ' +
                x + ' ' +
                (surfaceY + 1) + ' ' +
                z
            )
        }

        return true
    }

    function randomCandidate(seed) {
        var radius = Number(seed.radius)

        if (radius < 2) {
            radius = 2
        }

        var distance

        if (radius < seed.maxRadius - 0.01) {
            var inner = Math.max(1, radius - 5)
            distance = inner + Math.random() * (radius - inner)
        } else {
            distance = 2 + Math.random() * Math.max(1, radius - 2)
        }

        var angle = Math.random() * Math.PI * 2

        return {
            x: Math.floor(seed.x + Math.cos(angle) * distance),
            z: Math.floor(seed.z + Math.sin(angle) * distance)
        }
    }

    function processSeed(server, seed) {
        if (Number(seed.placed) >= MAX_SCARS_PER_SEED) {
            return
        }

        var level = getActiveLevelForSeed(server, seed)

        if (!level) {
            return
        }

        if (seed.radius < seed.maxRadius) {
            seed.radius = Math.min(
                seed.maxRadius,
                Number(seed.radius) + RADIUS_GROWTH
            )
        }

        var placedThisCycle = 0
        var maxAttempts = SCARS_PER_CYCLE * 6

        for (
            var attempt = 0;
            attempt < maxAttempts &&
            placedThisCycle < SCARS_PER_CYCLE &&
            seed.placed < MAX_SCARS_PER_SEED;
            attempt++
        ) {
            var candidate = randomCandidate(seed)

            if (placeAutomaticScar(server, level, seed, candidate.x, candidate.z)) {
                placedThisCycle++
            }
        }
    }

    ServerEvents.tick(function (event) {
        nexusPropagationTick++

        if (nexusPropagationTick % TICK_INTERVAL !== 0) {
            return
        }

        var state = loadState(event.server)

        if (!state.enabled || state.seeds.length === 0) {
            return
        }

        if (state.roundRobin >= state.seeds.length) {
            state.roundRobin = 0
        }

        var seed = state.seeds[state.roundRobin]

        state.roundRobin = (state.roundRobin + 1) % state.seeds.length

        processSeed(event.server, seed)
        saveState(event.server)
    })

    ServerEvents.commandRegistry(function (event) {
        var Commands = event.commands

        var root =
            Commands.literal('nexuscorruption')
                .requires(function (source) {
                    return source.hasPermission(2)
                })

        root.then(
            Commands.literal('start')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    state.enabled = true
                    saveState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§d[Nexo] Propagacion activada.',
                        false
                    )

                    return 1
                })
        )

        root.then(
            Commands.literal('stop')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    state.enabled = false
                    saveState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§7[Nexo] Propagacion detenida.',
                        false
                    )

                    return 1
                })
        )

        root.then(
            Commands.literal('seedadd')
                .executes(function (ctx) {
                    var player = ctx.source.player

                    if (!player) {
                        return 0
                    }

                    var state = loadState(ctx.source.server)

                    var seed = {
                        id: state.nextSeedId,
                        dimension: String(player.level.dimension),
                        x: Math.floor(player.x),
                        y: Math.floor(player.y) - 1,
                        z: Math.floor(player.z),
                        radius: 3,
                        maxRadius: DEFAULT_MAX_RADIUS,
                        placed: 0
                    }

                    state.nextSeedId++
                    state.seeds.push(seed)

                    saveState(ctx.source.server)

                    player.tell(
                        '§d[Nexo] Foco #' +
                        seed.id +
                        ' creado en ' +
                        seed.x + ' ' +
                        seed.y + ' ' +
                        seed.z +
                        ' §7(radio max ' +
                        seed.maxRadius +
                        ').'
                    )

                    return 1
                })
        )

        root.then(
            Commands.literal('seedremove')
                .executes(function (ctx) {
                    var player = ctx.source.player

                    if (!player) {
                        return 0
                    }

                    var state = loadState(ctx.source.server)

                    var nearestIndex = -1
                    var nearestDistanceSq = 16 * 16

                    for (var i = 0; i < state.seeds.length; i++) {
                        var seed = state.seeds[i]

                        if (String(seed.dimension) !== String(player.level.dimension)) {
                            continue
                        }

                        var dx = player.x - seed.x
                        var dy = player.y - seed.y
                        var dz = player.z - seed.z

                        var distanceSq = dx * dx + dy * dy + dz * dz

                        if (distanceSq < nearestDistanceSq) {
                            nearestDistanceSq = distanceSq
                            nearestIndex = i
                        }
                    }

                    if (nearestIndex < 0) {
                        player.tell(
                            '§c[Nexo] No hay ningun foco a menos de 16 bloques.'
                        )
                        return 0
                    }

                    var removed = state.seeds.splice(nearestIndex, 1)[0]

                    saveState(ctx.source.server)

                    player.tell(
                        '§7[Nexo] Foco #' +
                        removed.id +
                        ' eliminado.'
                    )

                    return 1
                })
        )

        root.then(
            Commands.literal('status')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§d[Nexo] Estado: ' +
                        (state.enabled ? '§aACTIVO' : '§cPARADO') +
                        ' §7| focos: ' +
                        state.seeds.length,
                        false
                    )

                    state.seeds.forEach(function (seed) {
                        ctx.source.sendSuccess(
                            '§7  #' +
                            seed.id +
                            ' ' +
                            seed.dimension +
                            ' @ ' +
                            seed.x + ' ' +
                            seed.y + ' ' +
                            seed.z +
                            ' | radio ' +
                            Number(seed.radius).toFixed(1) +
                            '/' +
                            seed.maxRadius +
                            ' | grietas ' +
                            seed.placed +
                            '/' +
                            MAX_SCARS_PER_SEED,
                            false
                        )
                    })

                    return 1
                })
        )

        root.then(
            Commands.literal('clear')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    state.enabled = false
                    state.seeds = []
                    state.roundRobin = 0

                    saveState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§7[Nexo] Focos eliminados. Los bloques ya generados permanecen.',
                        false
                    )

                    return 1
                })
        )

        event.register(root)
    })

})()
