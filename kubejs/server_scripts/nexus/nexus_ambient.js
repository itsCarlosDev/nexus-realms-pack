// ============================================================
// Nexus Realms - Ambiente del Nexo V2
// Forge 1.20.1 + KubeJS
// ============================================================

(() => {

    // Pon true durante las pruebas.
    // Cuando funcione lo cambiamos a false.
    const DEBUG = true

    const SCARS = [
        'kubejs:nexus_scar_1',
        'kubejs:nexus_scar_2',
        'kubejs:nexus_scar_3',
        'kubejs:nexus_scar_4'
    ]

    // Radio alrededor del jugador para detectar grietas
    const SCAR_RADIUS = 8

    // Buscar grietas una vez por segundo
    const CHECK_INTERVAL = 20


    // Duración REAL de tus sonidos en ticks
    // 20 ticks = 1 segundo
    const TRACKS = {

        1: {
            normal: 'kubejs:kevin_1',
            fade: 'kubejs:kevin_1_fade',

            // 19.392 segundos
            duration: 388,

            minLoops: 1,
            maxLoops: 3
        },

        2: {
            normal: 'kubejs:kevin_2',
            fade: 'kubejs:kevin_2_fade',

            // 9.707 segundos
            duration: 194,

            minLoops: 3,
            maxLoops: 6
        },

        3: {
            normal: 'kubejs:kevin_3',
            fade: 'kubejs:kevin_3_fade',

            // 4.544 segundos
            duration: 91,

            minLoops: 8,
            maxLoops: 14
        }
    }


    // Estado temporal de cada jugador
    const STATES = {}


    function randomInt(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min
    }


    function getState(player) {

        const name = player.username

        if (!STATES[name]) {

            STATES[name] = {

                tick: 0,

                source: null,

                currentTrack: 0,

                loopsRemaining: 0,

                phase: 'idle',

                nextSoundTick: 0,

                hadSource: false
            }
        }

        return STATES[name]
    }


    // ========================================================
    // BUSCAR GRIETA
    // ========================================================

    function findNearbyScar(player) {

        const level = player.level

        const px = Math.floor(player.x)
        const py = Math.floor(player.y)
        const pz = Math.floor(player.z)

        let closest = null
        let closestDistance = SCAR_RADIUS * SCAR_RADIUS


        for (let x = -SCAR_RADIUS; x <= SCAR_RADIUS; x++) {

            for (let z = -SCAR_RADIUS; z <= SCAR_RADIUS; z++) {

                // Un poco más de margen vertical
                for (let y = -3; y <= 3; y++) {

                    const distance =
                        x * x +
                        y * y +
                        z * z


                    if (distance > closestDistance) {
                        continue
                    }


                    const bx = px + x
                    const by = py + y
                    const bz = pz + z


                    const block = level.getBlock(
                        bx,
                        by,
                        bz
                    )


                    if (SCARS.indexOf(block.id) !== -1) {

                        closestDistance = distance

                        closest = {

                            x: bx + 0.5,
                            y: by + 0.1,
                            z: bz + 0.5
                        }
                    }
                }
            }
        }


        return closest
    }


    // ========================================================
    // REPRODUCIR SONIDO
    // ========================================================

    function play(player, source, sound) {

        const username = player.username

        const command =
            `playsound ${sound} ambient ${username} ` +
            `${source.x} ${source.y} ${source.z} ` +
            `0.65 1 0`


        if (DEBUG) {

            console.log(
                `[NEXUS] Ejecutando: ${command}`
            )
        }


        player.server.runCommandSilent(command)
    }


    // ========================================================
    // ELEGIR PISTA
    // ========================================================

    function chooseTrack(state) {

        let next


        // No permitir que salga inmediatamente
        // la misma canción anterior
        do {

            next = randomInt(1, 3)

        } while (
            next === state.currentTrack &&
            state.currentTrack !== 0
        )


        state.currentTrack = next

        const track = TRACKS[next]


        state.loopsRemaining = randomInt(
            track.minLoops,
            track.maxLoops
        )


        state.phase = 'normal'


        if (DEBUG) {

            console.log(
                `[NEXUS] Nueva pista: ${next} | loops: ${state.loopsRemaining}`
            )
        }
    }


    // ========================================================
    // CICLO DE AUDIO
    // ========================================================

    function updateAudio(player, state) {

        if (!state.source) {
            return
        }


        // Primera canción
        if (state.phase === 'idle') {

            chooseTrack(state)
        }


        const track = TRACKS[state.currentTrack]


        // ----------------------------------------------------
        // LOOP NORMAL
        // ----------------------------------------------------

        if (state.phase === 'normal') {


            if (state.loopsRemaining > 0) {

                play(
                    player,
                    state.source,
                    track.normal
                )


                state.loopsRemaining--


                state.nextSoundTick =
                    state.tick +
                    track.duration


                return
            }


            // ------------------------------------------------
            // ÚLTIMA REPETICIÓN CON FADE
            // ------------------------------------------------

            play(
                player,
                state.source,
                track.fade
            )


            state.phase = 'waiting_after_fade'


            // duración del sonido
            // +
            // 1-3 segundos de silencio
            state.nextSoundTick =
                state.tick +
                track.duration +
                randomInt(20, 60)


            return
        }


        // ----------------------------------------------------
        // DESPUÉS DEL FADE
        // ----------------------------------------------------

        if (state.phase === 'waiting_after_fade') {

            chooseTrack(state)

            // Lo iniciamos inmediatamente
            updateAudio(
                player,
                state
            )
        }
    }


    // ========================================================
    // PLAYER TICK
    // ========================================================

    PlayerEvents.tick(event => {

        const player = event.player

        const state = getState(player)


        state.tick++


        // ----------------------------------------------------
        // BUSCAR GRIETAS
        // ----------------------------------------------------

        if (
            state.tick %
            CHECK_INTERVAL ===
            0
        ) {

            const source =
                findNearbyScar(player)


            // Acabamos de entrar
            if (
                source &&
                !state.hadSource
            ) {

                if (DEBUG) {

                    player.tell(
                        '§5[NEXUS] §dGrieta detectada. Iniciando ambiente.'
                    )
                }


                // Reproducir inmediatamente
                state.nextSoundTick =
                    state.tick
            }


            // Acabamos de salir
            if (
                !source &&
                state.hadSource
            ) {

                if (DEBUG) {

                    player.tell(
                        '§5[NEXUS] §7Has salido del área corrupta.'
                    )
                }


                state.phase = 'idle'

                state.currentTrack = 0

                state.loopsRemaining = 0
            }


            state.source = source

            state.hadSource =
                source !== null
        }


        // No hay corrupción cerca
        if (!state.source) {
            return
        }


        // ----------------------------------------------------
        // TOCA REPRODUCIR
        // ----------------------------------------------------

        if (
            state.tick >=
            state.nextSoundTick
        ) {

            updateAudio(
                player,
                state
            )
        }
    })


    // ========================================================
    // LIMPIAR ESTADO AL SALIR
    // ========================================================

    PlayerEvents.loggedOut(event => {

        const username =
            event.player.username


        delete STATES[username]
    })

})()