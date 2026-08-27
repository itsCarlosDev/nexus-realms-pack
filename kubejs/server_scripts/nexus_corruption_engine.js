// ============================================================
// NEXUS REALMS - MOTOR V2 DE PROPAGACION CONECTADA
// Forge 1.20.1 + KubeJS
//
// Requiere las 15 variantes registradas:
// N E S W / NS EW / NE ES SW WN / NEW NES ESW NSW / NESW
//
// Objetivo:
// - La grieta crece bloque a bloque.
// - Cada bloque conoce sus conexiones N/E/S/W.
// - END -> STRAIGHT/CORNER -> T -> CROSS se actualiza solo.
// - Las ramas permanecen visualmente conectadas.
// - Solo trabaja cerca de jugadores.
// - No toca construcciones: usa la whitelist natural existente.
// - V2 inicial: solo avanza sobre superficie a la MISMA altura.
// ============================================================

(function () {

    var NexusBlockPos = Java.loadClass('net.minecraft.core.BlockPos')
    var MarketProtection = null
    var marketProtectionWarningLogged = false

    try {
        MarketProtection = Java.loadClass(
            'dev.itscarlos.nexuscore.market.MarketProtection'
        )
    } catch (error) {
        console.error(
            '[NEXUS V2] Protección del mercado no disponible: ' + error
        )
    }

    var ENGINE_KEY = 'nexus_corruption_engine_v2'
    var SCHEMA_VERSION = 2

    var TICK_INTERVAL = 40
    var TIP_STEPS_PER_CYCLE = 1

    var GROWTH_DELAY_MIN_SECONDS = 30
    var GROWTH_DELAY_MAX_SECONDS = 75

    var DEFAULT_MAX_RADIUS = 48
    var MAX_CELLS_PER_SEED = 160
    var MAX_ACTIVE_TIPS = 8
    var PLAYER_ACTIVE_RADIUS = 96

    var SEARCH_UP = 12
    var SEARCH_DOWN = 20

    var AUDIO_SOURCE_SPACING = 8
    var CRYSTAL_CHANCE = 0.20

    var MIN_STEPS_BEFORE_STOP = 5
    var STOP_CHANCE = 0.04
    var BRANCH_CHANCE = 0.10
    var TURN_CHANCE = 0.20
    var MERGE_CHANCE = 0.10

    var TURN_COOLDOWN_MIN = 2
    var TURN_COOLDOWN_MAX = 4
    var BRANCH_COOLDOWN_MIN = 6
    var BRANCH_COOLDOWN_MAX = 10
    var LOCAL_PROXIMITY_RADIUS = 2

    var DECORATIVE_SCAR_CHANCE = 0.12
    var DECORATIVE_SCARS = [
        'kubejs:nexus_scar_1',
        'kubejs:nexus_scar_2',
        'kubejs:nexus_scar_3',
        'kubejs:nexus_scar_4'
    ]

    var MAX_AUTO_ACTIVE_SEEDS = 2
    var AUTO_FIRST_DELAY_MIN_MINUTES = 30
    var AUTO_FIRST_DELAY_MAX_MINUTES = 60
    var AUTO_DELAY_MIN_MINUTES = 45
    var AUTO_DELAY_MAX_MINUTES = 90
    var AUTO_RETRY_MIN_MINUTES = 5
    var AUTO_RETRY_MAX_MINUTES = 10
    var AUTO_MIN_PLAYER_DISTANCE = 48
    var AUTO_MAX_PLAYER_DISTANCE = 96
    var AUTO_MIN_SEED_DISTANCE = 64
    var MAX_AUTOSPAWN_ATTEMPTS = 6

    var DEBUG = false

    // N=1, E=2, S=4, W=8
    var DIRS = [
        { name: 'N', bit: 1, dx: 0, dz: -1 },
        { name: 'E', bit: 2, dx: 1, dz: 0 },
        { name: 'S', bit: 4, dx: 0, dz: 1 },
        { name: 'W', bit: 8, dx: -1, dz: 0 }
    ]

    var MASK_TO_BLOCK = {
        1:  'kubejs:nexus_path_n',
        2:  'kubejs:nexus_path_e',
        3:  'kubejs:nexus_path_ne',
        4:  'kubejs:nexus_path_s',
        5:  'kubejs:nexus_path_ns',
        6:  'kubejs:nexus_path_es',
        7:  'kubejs:nexus_path_nes',
        8:  'kubejs:nexus_path_w',
        9:  'kubejs:nexus_path_wn',
        10: 'kubejs:nexus_path_ew',
        11: 'kubejs:nexus_path_new',
        12: 'kubejs:nexus_path_sw',
        13: 'kubejs:nexus_path_nsw',
        14: 'kubejs:nexus_path_esw',
        15: 'kubejs:nexus_path_nesw'
    }

    var BLOCK_TO_MASK = {
        'kubejs:nexus_path_n': 1,
        'kubejs:nexus_path_e': 2,
        'kubejs:nexus_path_ne': 3,
        'kubejs:nexus_path_s': 4,
        'kubejs:nexus_path_ns': 5,
        'kubejs:nexus_path_es': 6,
        'kubejs:nexus_path_nes': 7,
        'kubejs:nexus_path_w': 8,
        'kubejs:nexus_path_wn': 9,
        'kubejs:nexus_path_ew': 10,
        'kubejs:nexus_path_new': 11,
        'kubejs:nexus_path_sw': 12,
        'kubejs:nexus_path_nsw': 13,
        'kubejs:nexus_path_esw': 14,
        'kubejs:nexus_path_nesw': 15
    }

    var nexusV2Tick = 0
    var nexusV2Cache = null

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    function isFiniteNumber(value) {
        if (value === null || value === undefined) {
            return false
        }

        var number = Number(value)
        return !isNaN(number) && isFinite(number)
    }

    function numericDiagnostic(value) {
        try {
            return String(value) + ' (' + typeof value + ')'
        } catch (error) {
            return '<no representable> (' + typeof value + ')'
        }
    }

    function autoSpawnPlayerName(player) {
        if (!player) return '<null>'

        try {
            return String(player.name)
        } catch (error) {
            return '<desconocido>'
        }
    }

    function logInvalidAutoSpawnCandidate(
        player,
        rawX,
        rawY,
        rawZ,
        angle,
        distance,
        blockX,
        blockY,
        blockZ,
        detail
    ) {
        console.error(
            '[NEXUS CORRUPTION] Auto-spawn candidato numerico invalido: ' +
            'player=' + autoSpawnPlayerName(player) +
            ' rawX=' + numericDiagnostic(rawX) +
            ' rawY=' + numericDiagnostic(rawY) +
            ' rawZ=' + numericDiagnostic(rawZ) +
            ' angle=' + numericDiagnostic(angle) +
            ' distance=' + numericDiagnostic(distance) +
            ' x=' + numericDiagnostic(blockX) +
            ' guessY=' + numericDiagnostic(blockY) +
            ' z=' + numericDiagnostic(blockZ) +
            (detail ? ' detail=' + detail : '')
        )
    }

    function secondsToCycles(seconds) {
        return Math.max(1, Math.ceil(Number(seconds) * 20 / TICK_INTERVAL))
    }

    function minutesToCycles(minutes) {
        return secondsToCycles(Number(minutes) * 60)
    }

    function randomGrowthWaitCycles() {
        return secondsToCycles(
            randomInt(GROWTH_DELAY_MIN_SECONDS, GROWTH_DELAY_MAX_SECONDS)
        )
    }

    function randomFirstAutoSpawnWaitCycles() {
        return minutesToCycles(
            randomInt(
                AUTO_FIRST_DELAY_MIN_MINUTES,
                AUTO_FIRST_DELAY_MAX_MINUTES
            )
        )
    }

    function randomNormalAutoSpawnWaitCycles() {
        return minutesToCycles(
            randomInt(AUTO_DELAY_MIN_MINUTES, AUTO_DELAY_MAX_MINUTES)
        )
    }

    function randomAutoSpawnRetryWaitCycles() {
        return minutesToCycles(
            randomInt(AUTO_RETRY_MIN_MINUTES, AUTO_RETRY_MAX_MINUTES)
        )
    }

    function defaultState() {
        return {
            schemaVersion: SCHEMA_VERSION,
            enabled: true,
            autoSpawnEnabled: true,
            autoSpawnWaitCycles: randomFirstAutoSpawnWaitCycles(),
            retiredPlaced: 0,
            nextSeedId: 1,
            seeds: []
        }
    }

    function clearedState() {
        return {
            schemaVersion: SCHEMA_VERSION,
            enabled: false,
            autoSpawnEnabled: false,
            autoSpawnWaitCycles: randomFirstAutoSpawnWaitCycles(),
            retiredPlaced: 0,
            nextSeedId: 1,
            seeds: []
        }
    }

    function normaliseTip(tip) {
        if (tip.straightRun === undefined) tip.straightRun = 0
        if (tip.turnCooldown === undefined) tip.turnCooldown = 0
        if (tip.branchCooldown === undefined) {
            tip.branchCooldown = randomInt(
                BRANCH_COOLDOWN_MIN,
                BRANCH_COOLDOWN_MAX
            )
        }
        if (tip.lastTurn === undefined) tip.lastTurn = ''
        if (!Array.isArray(tip.recent)) {
            tip.recent = [
                {
                    x: Math.floor(Number(tip.x)),
                    z: Math.floor(Number(tip.z))
                }
            ]
        }

        return tip
    }

    function loadState(server) {
        if (nexusV2Cache !== null) {
            return nexusV2Cache
        }

        try {
            var raw = String(server.persistentData.getString(ENGINE_KEY) || '')

            if (raw) {
                var parsed = JSON.parse(raw)

                if (parsed && Array.isArray(parsed.seeds)) {
                    if (parsed.enabled === undefined) parsed.enabled = false
                    if (parsed.autoSpawnEnabled === undefined) {
                        parsed.autoSpawnEnabled = true
                    }
                    if (parsed.autoSpawnWaitCycles === undefined) {
                        parsed.autoSpawnWaitCycles =
                            randomFirstAutoSpawnWaitCycles()
                    }
                    if (parsed.retiredPlaced === undefined) {
                        parsed.retiredPlaced = 0
                    }
                    if (parsed.nextSeedId === undefined) {
                        var highestSeedId = 0

                        parsed.seeds.forEach(function (seed) {
                            highestSeedId = Math.max(
                                highestSeedId,
                                Number(seed.id || 0)
                            )
                        })

                        parsed.nextSeedId = highestSeedId + 1
                    }

                    parsed.seeds.forEach(function (seed) {
                        if (!Array.isArray(seed.tips)) seed.tips = []
                        if (seed.placed === undefined) seed.placed = 0
                        if (seed.maxRadius === undefined) seed.maxRadius = DEFAULT_MAX_RADIUS
                        if (seed.kind === undefined) seed.kind = 'manual'
                        if (seed.growthWaitCycles === undefined) {
                            seed.growthWaitCycles = randomGrowthWaitCycles()
                        }
                        seed.tips.forEach(normaliseTip)
                        seed.tips = deduplicateTips(seed.tips)
                    })

                    parsed.schemaVersion = SCHEMA_VERSION

                    nexusV2Cache = parsed
                    return nexusV2Cache
                }
            }
        } catch (error) {
            console.error('[NEXUS V2] Error cargando estado: ' + error)
        }

        nexusV2Cache = defaultState()
        return nexusV2Cache
    }

    function saveState(server) {
        try {
            server.persistentData.putString(
                ENGINE_KEY,
                JSON.stringify(nexusV2Cache || defaultState())
            )
        } catch (error) {
            console.error('[NEXUS V2] Error guardando estado: ' + error)
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

    function isDecorativeScar(id) {
        return DECORATIVE_SCARS.indexOf(String(id)) >= 0
    }

    function chooseDecorativeScar() {
        var roll = Math.random()

        if (roll < 0.30) return DECORATIVE_SCARS[0]
        if (roll < 0.60) return DECORATIVE_SCARS[1]
        if (roll < 0.90) return DECORATIVE_SCARS[2]
        return DECORATIVE_SCARS[3]
    }

    function isProtected(level, x, y, z) {
        if (!MarketProtection) {
            // Fallo cerrado: sin la infraestructura autoritativa no se
            // permite que una modificación automática atraviese el mercado.
            return true
        }

        try {
            return Boolean(
                MarketProtection.isInsideProtectedMarket(
                    level,
                    new NexusBlockPos(
                        Math.floor(Number(x)),
                        Math.floor(Number(y)),
                        Math.floor(Number(z))
                    )
                )
            )
        } catch (error) {
            if (!marketProtectionWarningLogged) {
                marketProtectionWarningLogged = true
                console.error(
                    '[NEXUS V2] No se pudo consultar la protección del mercado: ' +
                    error
                )
            }

            return true
        }
    }

    function getPathMask(id) {
        var value = BLOCK_TO_MASK[String(id)]
        return value === undefined ? null : Number(value)
    }

    function setPathMask(level, x, y, z, mask) {
        var blockId = MASK_TO_BLOCK[Number(mask)]

        if (!blockId) {
            return false
        }

        level.getBlock(x, y, z).set(blockId)
        return true
    }

    function oppositeDir(dir) {
        return (Number(dir) + 2) % 4
    }

    function leftDir(dir) {
        return (Number(dir) + 3) % 4
    }

    function rightDir(dir) {
        return (Number(dir) + 1) % 4
    }

    function randomDir() {
        return Math.floor(Math.random() * 4)
    }

    function maskFromNeighbours(level, x, y, z) {
        var mask = 0

        DIRS.forEach(function (dir) {
            var nx = Number(x) + dir.dx
            var nz = Number(z) + dir.dz

            if (!level.hasChunkAt(new NexusBlockPos(nx, y, nz))) {
                return
            }

            var neighbour = level.getBlock(nx, y, nz)

            if (
                getPathMask(neighbour.id) !== null &&
                !isProtected(level, nx, Number(y) - 1, nz)
            ) {
                mask = mask | dir.bit
            }
        })

        return mask
    }

    function reconcilePathAt(level, x, y, z) {
        if (!level.hasChunkAt(new NexusBlockPos(x, y, z))) {
            return false
        }

        var current = level.getBlock(x, y, z)
        var currentMask = getPathMask(current.id)

        if (
            currentMask === null ||
            isProtected(level, x, Number(y) - 1, z)
        ) {
            return false
        }

        var neighbourMask = maskFromNeighbours(level, x, y, z)

        // No existe una variante de mask 0. Una pieza aislada conserva
        // su END actual hasta que el motor coloque su primer vecino.
        if (neighbourMask === 0 || neighbourMask === currentMask) {
            return false
        }

        return setPathMask(level, x, y, z, neighbourMask)
    }

    function reconcileLocalPaths(level, x, y, z) {
        reconcilePathAt(level, x, y, z)

        DIRS.forEach(function (dir) {
            reconcilePathAt(
                level,
                Number(x) + dir.dx,
                y,
                Number(z) + dir.dz
            )
        })
    }

    function deduplicateTips(tips) {
        var seen = {}
        var result = []

        if (!Array.isArray(tips)) {
            return result
        }

        tips.forEach(function (tip) {
            if (
                !tip ||
                tip.x === undefined ||
                tip.y === undefined ||
                tip.z === undefined ||
                Number(tip.dir) < 0 ||
                Number(tip.dir) > 3
            ) {
                return
            }

            var key =
                Math.floor(Number(tip.x)) + ':' +
                Math.floor(Number(tip.y)) + ':' +
                Math.floor(Number(tip.z))

            if (!seen[key]) {
                seen[key] = true
                result.push(tip)
            }
        })

        return result
    }

    function isOpenTip(level, tip) {
        if (!level.hasChunkAt(new NexusBlockPos(tip.x, tip.y, tip.z))) {
            return true
        }

        var currentMask = getPathMask(
            level.getBlock(tip.x, tip.y, tip.z).id
        )

        if (currentMask === null) {
            return false
        }

        var dir = Number(tip.dir)
        var forward = DIRS[dir]

        if (
            !level.hasChunkAt(
                new NexusBlockPos(
                    Number(tip.x) + forward.dx,
                    tip.y,
                    Number(tip.z) + forward.dz
                )
            )
        ) {
            return true
        }

        var targetMask = getPathMask(
            level.getBlock(
                Number(tip.x) + forward.dx,
                tip.y,
                Number(tip.z) + forward.dz
            ).id
        )

        if (targetMask === null) {
            return true
        }

        var incomingBit = DIRS[oppositeDir(dir)].bit
        return !(
            (currentMask & forward.bit) !== 0 &&
            (targetMask & incomingBit) !== 0
        )
    }

    function findSurfaceY(level, x, guessY, z) {
        if (!level.hasChunkAt(new NexusBlockPos(x, guessY, z))) {
            return null
        }

        var top = guessY + SEARCH_UP
        var bottom = guessY - SEARCH_DOWN

        for (var y = top; y >= bottom; y--) {
            var ground = level.getBlock(x, y, z)

            if (!isNaturalGround(ground.id)) {
                continue
            }

            var above = level.getBlock(x, y + 1, z)
            var aboveMask = getPathMask(above.id)

            if (
                isReplaceableAbove(above.id) ||
                aboveMask !== null ||
                isDecorativeScar(above.id)
            ) {
                return y
            }
        }

        return null
    }

    function killGrassAt(level, x, baseY, z) {
        if (isProtected(level, x, baseY, z)) {
            return
        }

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
            [1, 0, 0.90], [-1, 0, 0.90], [0, 1, 0.90], [0, -1, 0.90],
            [1, 1, 0.55], [-1, 1, 0.55], [1, -1, 0.55], [-1, -1, 0.55],
            [2, 0, 0.20], [-2, 0, 0.20], [0, 2, 0.20], [0, -2, 0.20]
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

    function tryPlaceCrystal(level, x, groundY, z) {
        if (isProtected(level, x, groundY, z)) {
            return false
        }

        var surfaceY = findSurfaceY(level, x, groundY, z)

        if (surfaceY === null || surfaceY !== groundY) {
            return false
        }

        var target = level.getBlock(x, surfaceY + 1, z)

        if (String(target.id) !== 'minecraft:air') {
            return false
        }

        target.set(chooseCrystal())
        return true
    }

    function maybeSpawnCrystals(level, x, groundY, z) {
        if (Math.random() > CRYSTAL_CHANCE) {
            return
        }

        var candidates = [
            [1, 1], [-1, 1], [1, -1], [-1, -1]
        ]

        candidates.sort(function () {
            return Math.random() - 0.5
        })

        var wanted = 1 + Math.floor(Math.random() * 2)
        var placed = 0

        for (var i = 0; i < candidates.length && placed < wanted; i++) {
            if (
                tryPlaceCrystal(
                    level,
                    x + candidates[i][0],
                    groundY,
                    z + candidates[i][1]
                )
            ) {
                placed++
            }
        }
    }

    function loadAudioSources(server) {
        try {
            var raw = String(
                server.persistentData.getString('nexus_ambient_sources_v1') || ''
            )

            if (!raw) return []

            var parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) return parsed
        } catch (error) {
            console.error('[NEXUS V2] Error leyendo audio: ' + error)
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

            if (dx * dx + dy * dy + dz * dz < spacingSq) {
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
            console.error('[NEXUS V2] Error registrando audio: ' + error)
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

            if (dx * dx + dy * dy + dz * dz <= maxSq) {
                return player.level
            }
        }

        return null
    }

    function withinSeedRadius(seed, x, z) {
        var dx = Number(x) - Number(seed.x)
        var dz = Number(z) - Number(seed.z)
        var radius = Number(seed.maxRadius)

        return dx * dx + dz * dz <= radius * radius
    }

    function inspectTarget(level, seed, tip, dir) {
        var d = DIRS[dir]
        var nx = Number(tip.x) + d.dx
        var nz = Number(tip.z) + d.dz
        var currentGroundY = Number(tip.y) - 1

        if (!withinSeedRadius(seed, nx, nz)) {
            return { type: 'blocked' }
        }

        if (!level.hasChunkAt(new NexusBlockPos(nx, currentGroundY, nz))) {
            return { type: 'blocked' }
        }

        if (isProtected(level, nx, currentGroundY, nz)) {
            return { type: 'blocked' }
        }

        var surfaceY = findSurfaceY(level, nx, currentGroundY, nz)

        // La red principal conserva la topología same-Y aprobada.
        if (surfaceY === null || Number(surfaceY) !== currentGroundY) {
            return { type: 'blocked' }
        }

        var targetY = surfaceY + 1
        var target = level.getBlock(nx, targetY, nz)
        var targetMask = getPathMask(target.id)

        if (targetMask !== null) {
            return {
                type: 'path',
                x: nx,
                y: targetY,
                z: nz,
                groundY: surfaceY,
                mask: targetMask
            }
        }

        if (isDecorativeScar(target.id)) {
            return {
                type: 'free',
                x: nx,
                y: targetY,
                z: nz,
                groundY: surfaceY,
                replacesScar: true
            }
        }

        if (!isReplaceableAbove(target.id)) {
            return { type: 'blocked' }
        }

        return {
            type: 'free',
            x: nx,
            y: targetY,
            z: nz,
            groundY: surfaceY,
            replacesScar: false
        }
    }

    function countNearbyPaths(level, x, y, z, radius, skipX, skipZ) {
        var count = 0

        for (var dx = -radius; dx <= radius; dx++) {
            for (var dz = -radius; dz <= radius; dz++) {
                var px = Number(x) + dx
                var pz = Number(z) + dz

                if (px === Number(skipX) && pz === Number(skipZ)) {
                    continue
                }

                if (!level.hasChunkAt(new NexusBlockPos(px, y, pz))) {
                    continue
                }

                if (getPathMask(level.getBlock(px, y, pz).id) !== null) {
                    count++
                }
            }
        }

        return count
    }

    function wasRecentlyVisited(tip, x, z) {
        var recent = Array.isArray(tip.recent) ? tip.recent : []

        for (var i = 0; i < recent.length; i++) {
            if (
                Number(recent[i].x) === Number(x) &&
                Number(recent[i].z) === Number(z)
            ) {
                return true
            }
        }

        return false
    }

    function wouldCloseSmallLoop(level, tip, targetInfo) {
        if (targetInfo.type !== 'path') {
            return false
        }

        if (wasRecentlyVisited(tip, targetInfo.x, targetInfo.z)) {
            return true
        }

        if (Number(tip.steps || 0) < 8) {
            return true
        }

        var closePaths = 0

        for (var dx = -1; dx <= 1; dx++) {
            for (var dz = -1; dz <= 1; dz++) {
                var px = Number(targetInfo.x) + dx
                var pz = Number(targetInfo.z) + dz

                if (
                    (px === Number(targetInfo.x) &&
                        pz === Number(targetInfo.z)) ||
                    (px === Number(tip.x) && pz === Number(tip.z))
                ) {
                    continue
                }

                if (!level.hasChunkAt(new NexusBlockPos(px, targetInfo.y, pz))) {
                    continue
                }

                if (
                    getPathMask(
                        level.getBlock(px, targetInfo.y, pz).id
                    ) !== null
                ) {
                    closePaths++
                }
            }
        }

        if (closePaths >= 2) {
            return true
        }

        return countNearbyPaths(
            level,
            targetInfo.x,
            targetInfo.y,
            targetInfo.z,
            LOCAL_PROXIMITY_RADIUS,
            tip.x,
            tip.z
        ) >= 7
    }

    function turnKind(fromDir, toDir) {
        if (Number(toDir) === leftDir(fromDir)) return 'L'
        if (Number(toDir) === rightDir(fromDir)) return 'R'
        return ''
    }

    function freeCardinalSpace(level, targetInfo) {
        var count = 0

        DIRS.forEach(function (dir) {
            var x = Number(targetInfo.x) + dir.dx
            var z = Number(targetInfo.z) + dir.dz

            if (!level.hasChunkAt(new NexusBlockPos(x, targetInfo.y, z))) {
                return
            }

            var block = level.getBlock(
                x,
                targetInfo.y,
                z
            )

            if (
                isReplaceableAbove(block.id) ||
                isDecorativeScar(block.id)
            ) {
                count++
            }
        })

        return count
    }

    function countOtherCardinalPaths(level, targetInfo, tip) {
        var count = 0

        DIRS.forEach(function (dir) {
            var x = Number(targetInfo.x) + dir.dx
            var z = Number(targetInfo.z) + dir.dz

            if (x === Number(tip.x) && z === Number(tip.z)) {
                return
            }

            if (
                level.hasChunkAt(new NexusBlockPos(x, targetInfo.y, z)) &&
                getPathMask(level.getBlock(x, targetInfo.y, z).id) !== null
            ) {
                count++
            }
        })

        return count
    }

    function scoreCandidate(level, seed, tip, dir, turnImpulseDir) {
        var targetInfo = inspectTarget(level, seed, tip, dir)

        if (targetInfo.type === 'blocked') {
            return null
        }

        if (wouldCloseSmallLoop(level, tip, targetInfo)) {
            return null
        }

        // reconcileLocalPaths conecta toda adyacencia N/E/S/W. Evitamos
        // que una celda aparentemente libre cree un merge lateral implícito.
        if (
            targetInfo.type === 'free' &&
            countOtherCardinalPaths(level, targetInfo, tip) > 0
        ) {
            return null
        }

        // Un encuentro válido no se convierte automáticamente en merge.
        if (targetInfo.type === 'path' && Math.random() >= MERGE_CHANCE) {
            return null
        }

        var turn = turnKind(tip.dir, dir)
        var score = dir === Number(tip.dir) ? 4.0 : 1.0

        if (turn && Number(dir) === Number(turnImpulseDir)) {
            score += 2.0
        }

        if (turn && Number(tip.turnCooldown || 0) > 0) {
            score -= 8.0
        }

        if (turn && tip.lastTurn && String(tip.lastTurn) !== turn) {
            score -= 2.5
        }

        if (Number(tip.straightRun || 0) >= 6) {
            if (turn) {
                score += 2.0
            } else {
                score -= Math.min(4, Number(tip.straightRun) - 5)
            }
        }

        var currentDx = Number(tip.x) - Number(seed.x)
        var currentDz = Number(tip.z) - Number(seed.z)
        var targetDx = Number(targetInfo.x) - Number(seed.x)
        var targetDz = Number(targetInfo.z) - Number(seed.z)
        var currentDistanceSq = currentDx * currentDx + currentDz * currentDz
        var targetDistanceSq = targetDx * targetDx + targetDz * targetDz

        score += targetDistanceSq > currentDistanceSq ? 1.0 : -0.35

        var nearbyPaths = countNearbyPaths(
            level,
            targetInfo.x,
            targetInfo.y,
            targetInfo.z,
            LOCAL_PROXIMITY_RADIUS,
            tip.x,
            tip.z
        )

        score -= Math.max(0, nearbyPaths - 1) * 0.80
        score += freeCardinalSpace(level, targetInfo) * 0.20

        if (targetInfo.type === 'path') {
            score -= 1.5
        }

        score += Math.random() * 3.0 - 1.5

        return {
            dir: Number(dir),
            turn: turn,
            score: score,
            target: targetInfo
        }
    }

    function rankGrowthCandidates(level, seed, tip) {
        var turnImpulseDir = -1

        if (Math.random() < TURN_CHANCE) {
            turnImpulseDir = Math.random() < 0.5
                ? leftDir(tip.dir)
                : rightDir(tip.dir)
        }

        var directions = [
            Number(tip.dir),
            leftDir(tip.dir),
            rightDir(tip.dir)
        ]
        var candidates = []

        directions.forEach(function (dir) {
            var candidate = scoreCandidate(
                level,
                seed,
                tip,
                dir,
                turnImpulseDir
            )
            if (candidate) candidates.push(candidate)
        })

        candidates.sort(function (a, b) {
            return b.score - a.score
        })

        return candidates
    }

    function hasUnloadedGrowthDirection(level, tip) {
        var directions = [
            Number(tip.dir),
            leftDir(tip.dir),
            rightDir(tip.dir)
        ]

        for (var i = 0; i < directions.length; i++) {
            var dir = DIRS[directions[i]]

            if (
                !level.hasChunkAt(
                    new NexusBlockPos(
                        Number(tip.x) + dir.dx,
                        tip.y,
                        Number(tip.z) + dir.dz
                    )
                )
            ) {
                return true
            }
        }

        return false
    }

    function nextTipState(tip, candidate, resetBranchCooldown) {
        var recent = Array.isArray(tip.recent)
            ? tip.recent.slice(-9)
            : []

        recent.push({
            x: Number(candidate.target.x),
            z: Number(candidate.target.z)
        })

        var turned = candidate.turn !== ''

        return {
            x: candidate.target.x,
            y: candidate.target.y,
            z: candidate.target.z,
            dir: candidate.dir,
            steps: Number(tip.steps || 0) + 1,
            straightRun: turned
                ? 0
                : Number(tip.straightRun || 0) + 1,
            turnCooldown: turned
                ? randomInt(TURN_COOLDOWN_MIN, TURN_COOLDOWN_MAX)
                : Math.max(0, Number(tip.turnCooldown || 0) - 1),
            branchCooldown: resetBranchCooldown
                ? randomInt(BRANCH_COOLDOWN_MIN, BRANCH_COOLDOWN_MAX)
                : Math.max(0, Number(tip.branchCooldown || 0) - 1),
            lastTurn: turned ? candidate.turn : String(tip.lastTurn || ''),
            recent: recent
        }
    }

    function connectCandidate(
        server,
        level,
        seed,
        tip,
        candidate,
        resetBranchCooldown
    ) {
        var current = level.getBlock(tip.x, tip.y, tip.z)
        var currentMask = getPathMask(current.id)

        if (currentMask === null) {
            return { result: 'dead', tip: null, cell: null }
        }

        var targetInfo = candidate.target
        var outgoingBit = DIRS[candidate.dir].bit
        var incomingBit = DIRS[oppositeDir(candidate.dir)].bit

        setPathMask(
            level,
            tip.x,
            tip.y,
            tip.z,
            currentMask | outgoingBit
        )

        if (targetInfo.type === 'path') {
            setPathMask(
                level,
                targetInfo.x,
                targetInfo.y,
                targetInfo.z,
                targetInfo.mask | incomingBit
            )

            reconcileLocalPaths(
                level,
                targetInfo.x,
                targetInfo.y,
                targetInfo.z
            )

            if (DEBUG) {
                console.info(
                    '[NEXUS V2] Merge local aceptado en ' +
                    targetInfo.x + ' ' + targetInfo.y + ' ' + targetInfo.z
                )
            }

            return { result: 'merged', tip: null, cell: null }
        }

        var above = level.getBlock(targetInfo.x, targetInfo.y, targetInfo.z)

        // set() directo sustituye una scar decorativa sin disparar su evento
        // de rotura ni destruir el bloque de suelo inferior.
        if (String(above.id) !== 'minecraft:air') {
            above.set('minecraft:air')
        }

        corruptGroundPatch(
            level,
            targetInfo.x,
            targetInfo.groundY,
            targetInfo.z
        )

        setPathMask(
            level,
            targetInfo.x,
            targetInfo.y,
            targetInfo.z,
            incomingBit
        )

        reconcileLocalPaths(
            level,
            targetInfo.x,
            targetInfo.y,
            targetInfo.z
        )

        maybeRegisterAudio(
            server,
            level,
            targetInfo.x,
            targetInfo.y,
            targetInfo.z
        )

        maybeSpawnCrystals(
            level,
            targetInfo.x,
            targetInfo.groundY,
            targetInfo.z
        )

        seed.placed = Number(seed.placed) + 1

        return {
            result: 'new',
            tip: nextTipState(tip, candidate, resetBranchCooldown),
            cell: {
                x: targetInfo.x,
                y: targetInfo.y,
                groundY: targetInfo.groundY,
                z: targetInfo.z,
                dir: candidate.dir
            }
        }
    }

    function maybePlaceDecorativeScar(level, cell) {
        if (!cell || Math.random() >= DECORATIVE_SCAR_CHANCE) {
            return false
        }

        var dir = DIRS[Number(cell.dir)]
        var left = DIRS[leftDir(cell.dir)]
        var right = DIRS[rightDir(cell.dir)]
        var offsets = [
            [left.dx, left.dz],
            [right.dx, right.dz],
            [left.dx * 2, left.dz * 2],
            [right.dx * 2, right.dz * 2],
            [dir.dx + left.dx, dir.dz + left.dz],
            [dir.dx + right.dx, dir.dz + right.dz],
            [-dir.dx + left.dx, -dir.dz + left.dz],
            [-dir.dx + right.dx, -dir.dz + right.dz]
        ]

        offsets.sort(function () {
            return Math.random() - 0.5
        })

        for (var i = 0; i < offsets.length; i++) {
            var x = Number(cell.x) + offsets[i][0]
            var z = Number(cell.z) + offsets[i][1]

            if (
                !level.hasChunkAt(
                    new NexusBlockPos(x, Number(cell.groundY), z)
                ) ||
                isProtected(level, x, cell.groundY, z)
            ) {
                continue
            }

            var surfaceY = findSurfaceY(level, x, cell.groundY, z)

            if (surfaceY === null || Number(surfaceY) !== Number(cell.groundY)) {
                continue
            }

            var target = level.getBlock(x, surfaceY + 1, z)

            // Una scar nunca reemplaza una pieza de la red ni otra scar.
            if (
                getPathMask(target.id) !== null ||
                isDecorativeScar(target.id) ||
                !isReplaceableAbove(target.id)
            ) {
                continue
            }

            if (String(target.id) !== 'minecraft:air') {
                target.set('minecraft:air')
            }

            target.set(chooseDecorativeScar())
            return true
        }

        return false
    }

    function processTip(server, level, seed, tip) {
        var output = { tips: [], cells: [] }

        if (!level.hasChunkAt(new NexusBlockPos(tip.x, tip.y, tip.z))) {
            output.tips.push(tip)
            return output
        }

        if (
            isProtected(
                level,
                tip.x,
                Number(tip.y) - 1,
                tip.z
            )
        ) {
            return output
        }

        normaliseTip(tip)
        reconcileLocalPaths(level, tip.x, tip.y, tip.z)

        if (!isOpenTip(level, tip)) {
            return output
        }

        if (
            Number(tip.steps || 0) >= MIN_STEPS_BEFORE_STOP &&
            Math.random() < STOP_CHANCE
        ) {
            return output
        }

        var candidates = rankGrowthCandidates(level, seed, tip)

        if (candidates.length === 0) {
            if (hasUnloadedGrowthDirection(level, tip)) {
                output.tips.push(tip)
            }
            return output
        }

        var canBranch =
            Number(tip.branchCooldown || 0) <= 0 &&
            Math.random() < BRANCH_CHANCE &&
            seed.tips.length + 2 <= MAX_ACTIVE_TIPS &&
            Number(seed.placed) + 2 <= MAX_CELLS_PER_SEED

        if (canBranch) {
            var forward = null
            var side = null

            candidates.forEach(function (candidate) {
                if (candidate.dir === Number(tip.dir)) {
                    forward = candidate
                } else if (!side) {
                    side = candidate
                }
            })

            if (forward && side) {
                var branchConnected = false

                ;[forward, side].forEach(function (candidate) {
                    if (Number(seed.placed) >= MAX_CELLS_PER_SEED) return

                    var result = connectCandidate(
                        server,
                        level,
                        seed,
                        tip,
                        candidate,
                        true
                    )

                    if (result.result === 'new' && result.tip) {
                        branchConnected = true
                        output.tips.push(result.tip)
                        output.cells.push(result.cell)
                    } else if (result.result === 'merged') {
                        branchConnected = true
                    }
                })

                if (branchConnected) {
                    return output
                }
            }
        }

        var result = connectCandidate(
            server,
            level,
            seed,
            tip,
            candidates[0],
            false
        )

        if (result.result === 'new' && result.tip) {
            output.tips.push(result.tip)
            output.cells.push(result.cell)
        }

        return output
    }

    function isSeedActive(seed) {
        return (
            Number(seed.placed || 0) < MAX_CELLS_PER_SEED &&
            Array.isArray(seed.tips) &&
            seed.tips.length > 0
        )
    }

    function processSeed(server, seed, ignoreCooldown) {
        if (Number(seed.placed) >= MAX_CELLS_PER_SEED) {
            seed.tips = []
            return 0
        }

        seed.tips = deduplicateTips(seed.tips)

        if (!isSeedActive(seed)) {
            return 0
        }

        var level = getActiveLevelForSeed(server, seed)

        if (!level) {
            return 0
        }

        if (!ignoreCooldown && Number(seed.growthWaitCycles || 0) > 0) {
            seed.growthWaitCycles = Number(seed.growthWaitCycles) - 1
            return 0
        }

        var operations = Math.min(TIP_STEPS_PER_CYCLE, seed.tips.length)
        var placed = 0

        for (var i = 0; i < operations; i++) {
            var tip = seed.tips.shift()
            if (!tip) continue

            var produced = processTip(server, level, seed, tip)

            produced.tips.forEach(function (newTip) {
                if (seed.tips.length < MAX_ACTIVE_TIPS) {
                    seed.tips.push(newTip)
                }
            })

            if (produced.cells.length > 0) {
                placed += produced.cells.length

                // Se llama una sola vez por evento aunque una rama haya
                // producido excepcionalmente dos celdas principales.
                maybePlaceDecorativeScar(
                    level,
                    produced.cells[
                        Math.floor(Math.random() * produced.cells.length)
                    ]
                )
            }

            seed.tips = deduplicateTips(seed.tips)
        }

        if (!ignoreCooldown) {
            seed.growthWaitCycles = randomGrowthWaitCycles()
        }

        return placed
    }

    function createSeedAt(server, level, x, guessY, z, kind, preferredDir) {
        var surfaceY = findSurfaceY(level, x, guessY, z)

        if (surfaceY === null) {
            return { seed: null, error: 'ground' }
        }

        if (isProtected(level, x, surfaceY, z)) {
            return { seed: null, error: 'protected' }
        }

        var targetY = surfaceY + 1
        var target = level.getBlock(x, targetY, z)

        if (getPathMask(target.id) !== null) {
            return { seed: null, error: 'path' }
        }

        if (
            !isReplaceableAbove(target.id) &&
            !isDecorativeScar(target.id)
        ) {
            return { seed: null, error: 'occupied' }
        }

        if (String(target.id) !== 'minecraft:air') {
            target.set('minecraft:air')
        }

        var state = loadState(server)
        var preferredDirNumber = Number(preferredDir)
        var dir = DIRS[preferredDirNumber] ? preferredDirNumber : randomDir()

        corruptGroundPatch(level, x, surfaceY, z)

        // La primera pieza es un END apuntando hacia donde crecerá.
        setPathMask(level, x, targetY, z, DIRS[dir].bit)
        maybeRegisterAudio(server, level, x, targetY, z)

        var seed = {
            id: state.nextSeedId,
            kind: String(kind || 'manual'),
            dimension: String(level.dimension),
            x: x,
            y: surfaceY,
            z: z,
            maxRadius: DEFAULT_MAX_RADIUS,
            placed: 1,
            growthWaitCycles: randomGrowthWaitCycles(),
            tips: [
                {
                    x: x,
                    y: targetY,
                    z: z,
                    dir: dir,
                    steps: 0,
                    straightRun: 0,
                    turnCooldown: 0,
                    branchCooldown: randomInt(
                        BRANCH_COOLDOWN_MIN,
                        BRANCH_COOLDOWN_MAX
                    ),
                    lastTurn: '',
                    recent: [{ x: x, z: z }]
                }
            ]
        }

        state.nextSeedId++
        state.seeds.push(seed)

        return { seed: seed, error: '' }
    }

    function addSeed(server, player) {
        var result = createSeedAt(
            server,
            player.level,
            Math.floor(player.x),
            Math.floor(player.y) - 1,
            Math.floor(player.z),
            'manual'
        )

        if (!result.seed) {
            var messages = {
                ground: 'No encuentro suelo natural válido aquí.',
                protected: 'Esta región está protegida.',
                path: 'Ya hay una ruta del Nexo en esta posición.',
                occupied: 'El bloque superior está ocupado.'
            }

            player.tell(
                '§c[Nexo] ' +
                (messages[result.error] || 'No se pudo crear la seed.')
            )
            return 0
        }

        saveState(server)

        player.tell(
            '§d[Nexo] Seed V2 #' +
            result.seed.id +
            ' creada. Dirección inicial: ' +
            DIRS[result.seed.tips[0].dir].name
        )

        return 1
    }

    function countActiveAutoSeeds(state) {
        var count = 0

        state.seeds.forEach(function (seed) {
            if (String(seed.kind) === 'auto' && isSeedActive(seed)) {
                count++
            }
        })

        return count
    }

    function pruneFinishedAutoSeeds(state) {
        state.seeds = state.seeds.filter(function (seed) {
            var keep = String(seed.kind) !== 'auto' || isSeedActive(seed)

            if (!keep) {
                state.retiredPlaced =
                    Number(state.retiredPlaced || 0) +
                    Number(seed.placed || 0)
            }

            return keep
        })
    }

    function isFarEnoughFromSeeds(state, dimension, x, z) {
        var minimumSq = AUTO_MIN_SEED_DISTANCE * AUTO_MIN_SEED_DISTANCE

        for (var i = 0; i < state.seeds.length; i++) {
            var seed = state.seeds[i]

            if (
                !isSeedActive(seed) ||
                String(seed.dimension) !== String(dimension)
            ) {
                continue
            }

            var dx = Number(seed.x) - Number(x)
            var dz = Number(seed.z) - Number(z)

            if (dx * dx + dz * dz < minimumSq) {
                return false
            }
        }

        return true
    }

    function getValidInitialDirections(level, x, surfaceY, z) {
        var validDirections = []

        for (var i = 0; i < DIRS.length; i++) {
            var nx = Number(x) + DIRS[i].dx
            var nz = Number(z) + DIRS[i].dz

            if (
                !level.hasChunkAt(new NexusBlockPos(nx, surfaceY, nz)) ||
                isProtected(level, nx, surfaceY, nz)
            ) {
                continue
            }

            var neighbourY = findSurfaceY(level, nx, surfaceY, nz)

            if (
                neighbourY === null ||
                Number(neighbourY) !== Number(surfaceY)
            ) {
                continue
            }

            var above = level.getBlock(nx, Number(neighbourY) + 1, nz)

            if (
                getPathMask(above.id) !== null ||
                (!isReplaceableAbove(above.id) &&
                    !isDecorativeScar(above.id))
            ) {
                continue
            }

            validDirections.push(i)
        }

        return validDirections
    }

    function tryAutoSpawn(server) {
        var state = loadState(server)

        pruneFinishedAutoSeeds(state)

        if (countActiveAutoSeeds(state) >= MAX_AUTO_ACTIVE_SEEDS) {
            return { seed: null, reason: 'cap' }
        }

        var players = server.players

        if (!players || players.length === 0) {
            return { seed: null, reason: 'players' }
        }

        for (var attempt = 0; attempt < MAX_AUTOSPAWN_ATTEMPTS; attempt++) {
            var player = players[randomInt(0, players.length - 1)]
            var angle = Math.random() * Math.PI * 2
            var distance = randomInt(
                AUTO_MIN_PLAYER_DISTANCE,
                AUTO_MAX_PLAYER_DISTANCE
            )
            var rawX = null
            var rawY = null
            var rawZ = null
            var coordinateError = ''

            try {
                rawX = player ? player.getX() : null
                rawY = player ? player.getY() : null
                rawZ = player ? player.getZ() : null
            } catch (error) {
                coordinateError = String(error)
            }

            if (
                !isFiniteNumber(rawX) ||
                !isFiniteNumber(rawY) ||
                !isFiniteNumber(rawZ) ||
                !isFiniteNumber(angle) ||
                !isFiniteNumber(distance)
            ) {
                logInvalidAutoSpawnCandidate(
                    player,
                    rawX,
                    rawY,
                    rawZ,
                    angle,
                    distance,
                    '<no calculado>',
                    '<no calculado>',
                    '<no calculado>',
                    coordinateError
                )
                continue
            }

            var playerX = Number(rawX)
            var playerY = Number(rawY)
            var playerZ = Number(rawZ)
            var blockX = Math.floor(
                playerX + Math.cos(angle) * Number(distance)
            )
            var blockZ = Math.floor(
                playerZ + Math.sin(angle) * Number(distance)
            )
            var blockY = Math.floor(playerY) - 1

            if (
                !isFiniteNumber(blockX) ||
                !isFiniteNumber(blockY) ||
                !isFiniteNumber(blockZ)
            ) {
                logInvalidAutoSpawnCandidate(
                    player,
                    rawX,
                    rawY,
                    rawZ,
                    angle,
                    distance,
                    blockX,
                    blockY,
                    blockZ,
                    ''
                )
                continue
            }

            var level = player.level
            var probe = new NexusBlockPos(blockX, blockY, blockZ)

            // hasChunkAt está verificado en LevelReader 1.20.1. Solo se
            // inspeccionan candidatos ya cargados; nunca se pide getChunk().
            if (!level.hasChunkAt(probe)) {
                continue
            }

            if (
                !isFarEnoughFromSeeds(
                    state,
                    String(level.dimension),
                    blockX,
                    blockZ
                )
            ) {
                continue
            }

            var surfaceY = findSurfaceY(level, blockX, blockY, blockZ)

            if (
                surfaceY === null ||
                isProtected(level, blockX, surfaceY, blockZ)
            ) {
                continue
            }

            var validInitialDirections = getValidInitialDirections(
                level,
                blockX,
                surfaceY,
                blockZ
            )

            if (validInitialDirections.length === 0) {
                continue
            }

            var initialDir =
                validInitialDirections[
                    Math.floor(Math.random() * validInitialDirections.length)
                ]

            var created = createSeedAt(
                server,
                level,
                blockX,
                surfaceY,
                blockZ,
                'auto',
                initialDir
            )

            if (created.seed) {
                return { seed: created.seed, reason: '' }
            }
        }

        return { seed: null, reason: 'location' }
    }

    function removeNearestSeed(server, player) {
        var state = loadState(server)

        if (state.seeds.length === 0) {
            player.tell('§7[Nexo] No hay seeds.')
            return 0
        }

        var bestIndex = -1
        var bestDistance = Number.MAX_VALUE

        for (var i = 0; i < state.seeds.length; i++) {
            var seed = state.seeds[i]

            if (String(seed.dimension) !== String(player.level.dimension)) {
                continue
            }

            var dx = player.x - seed.x
            var dy = player.y - seed.y
            var dz = player.z - seed.z
            var distSq = dx * dx + dy * dy + dz * dz

            if (distSq < bestDistance) {
                bestDistance = distSq
                bestIndex = i
            }
        }

        if (bestIndex < 0) {
            player.tell('§7[Nexo] No hay seeds en esta dimensión.')
            return 0
        }

        var removed = state.seeds.splice(bestIndex, 1)[0]
        saveState(server)

        player.tell(
            '§7[Nexo] Seed V2 #' + removed.id + ' eliminada del motor.'
        )

        return 1
    }

    ServerEvents.tick(function (event) {
        nexusV2Tick++

        if (nexusV2Tick % TICK_INTERVAL !== 0) {
            return
        }

        var state = loadState(event.server)

        if (!state.enabled) {
            return
        }

        state.seeds.forEach(function (seed) {
            processSeed(event.server, seed, false)
        })

        if (state.autoSpawnEnabled) {
            if (Number(state.autoSpawnWaitCycles || 0) > 0) {
                state.autoSpawnWaitCycles =
                    Number(state.autoSpawnWaitCycles) - 1
            } else {
                var autoResult = tryAutoSpawn(event.server)

                state.autoSpawnWaitCycles = autoResult.seed
                    ? randomNormalAutoSpawnWaitCycles()
                    : randomAutoSpawnRetryWaitCycles()
            }
        }

        saveState(event.server)
    })

    function formatWaitCycles(cycles) {
        var seconds = Math.max(
            0,
            Math.ceil(Number(cycles || 0) * TICK_INTERVAL / 20)
        )

        if (seconds < 60) {
            return seconds + 's'
        }

        return Math.ceil(seconds / 60) + 'min'
    }

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
                        '§d[Nexo] Propagación conectada V2 activada.',
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
                        '§7[Nexo] Propagación V2 detenida.',
                        false
                    )

                    return 1
                })
        )

        root.then(
            Commands.literal('seedadd')
                .executes(function (ctx) {
                    var player = ctx.source.player
                    if (!player) return 0

                    return addSeed(
                        ctx.source.server,
                        player
                    )
                })
        )

        root.then(
            Commands.literal('seedremove')
                .executes(function (ctx) {
                    var player = ctx.source.player
                    if (!player) return 0

                    return removeNearestSeed(
                        ctx.source.server,
                        player
                    )
                })
        )

        root.then(
            Commands.literal('step')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    state.seeds.forEach(function (seed) {
                        processSeed(ctx.source.server, seed, true)
                    })

                    saveState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§d[Nexo] Ejecutado 1 paso manual de propagación V2.',
                        false
                    )

                    return 1
                })
        )

        root.then(
            Commands.literal('status')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    var totalPlaced = Number(state.retiredPlaced || 0)
                    var totalTips = 0
                    var activeSeeds = 0

                    state.seeds.forEach(function (seed) {
                        totalPlaced += Number(seed.placed || 0)
                        totalTips += Array.isArray(seed.tips)
                            ? seed.tips.length
                            : 0
                        if (isSeedActive(seed)) activeSeeds++
                    })

                    ctx.source.sendSuccess(
                        '§d[Nexo V2] enabled=' +
                        state.enabled +
                        ' | auto=' +
                        state.autoSpawnEnabled +
                        ' | seeds=' +
                        state.seeds.length +
                        ' (' + activeSeeds + ' activas)' +
                        ' | celdas=' +
                        totalPlaced +
                        ' | extremos=' +
                        totalTips +
                        ' | próximo auto~' +
                        formatWaitCycles(state.autoSpawnWaitCycles),
                        false
                    )

                    return 1
                })
        )

        var autoSpawnRoot = Commands.literal('autospawn')

        autoSpawnRoot.then(
            Commands.literal('on')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)
                    state.autoSpawnEnabled = true

                    if (Number(state.autoSpawnWaitCycles || 0) <= 0) {
                        state.autoSpawnWaitCycles =
                            randomAutoSpawnRetryWaitCycles()
                    }

                    saveState(ctx.source.server)
                    ctx.source.sendSuccess(
                        '§d[Nexo] Auto-spawn activado. Próximo intento~' +
                        formatWaitCycles(state.autoSpawnWaitCycles) + '.',
                        false
                    )
                    return 1
                })
        )

        autoSpawnRoot.then(
            Commands.literal('off')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)
                    state.autoSpawnEnabled = false
                    saveState(ctx.source.server)
                    ctx.source.sendSuccess(
                        '§7[Nexo] Auto-spawn detenido.',
                        false
                    )
                    return 1
                })
        )

        autoSpawnRoot.then(
            Commands.literal('now')
                .executes(function (ctx) {
                    try {
                        var state = loadState(ctx.source.server)
                        var result = tryAutoSpawn(ctx.source.server)

                        state.autoSpawnWaitCycles = result.seed
                            ? randomNormalAutoSpawnWaitCycles()
                            : randomAutoSpawnRetryWaitCycles()

                        saveState(ctx.source.server)

                        if (result.seed) {
                            ctx.source.sendSuccess(
                                '§d[Nexo] Auto-seed #' + result.seed.id +
                                ' creada en ' + result.seed.x + ' ' +
                                result.seed.y + ' ' + result.seed.z + '.',
                                false
                            )
                            return 1
                        }

                        ctx.source.sendSuccess(
                            '§c[Nexo] No se creó auto-seed (' +
                            result.reason + '). Reintento~' +
                            formatWaitCycles(state.autoSpawnWaitCycles) + '.',
                            false
                        )
                        return 0
                    } catch (error) {
                        console.error(
                            '[NEXUS CORRUPTION] Error en autospawn now: ' +
                            error
                        )

                        if (error && error.stack) {
                            console.error(error.stack)
                        }

                        ctx.source.sendFailure(
                            '§c[Nexo] Error interno en autospawn now. ' +
                            'Revisa el log del servidor.'
                        )
                        return 0
                    }
                })
        )

        autoSpawnRoot.then(
            Commands.literal('status')
                .executes(function (ctx) {
                    var state = loadState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§d[Nexo Auto] enabled=' +
                        state.autoSpawnEnabled +
                        ' | activas=' +
                        countActiveAutoSeeds(state) + '/' +
                        MAX_AUTO_ACTIVE_SEEDS +
                        ' | próximo~' +
                        formatWaitCycles(state.autoSpawnWaitCycles),
                        false
                    )
                    return 1
                })
        )

        root.then(autoSpawnRoot)

        root.then(
            Commands.literal('clear')
                .executes(function (ctx) {
                    nexusV2Cache = clearedState()
                    saveState(ctx.source.server)

                    ctx.source.sendSuccess(
                        '§7[Nexo] Estado V2 limpiado. Los bloques ya colocados no se borran.',
                        false
                    )

                    return 1
                })
        )

        event.register(root)
    })

})()
