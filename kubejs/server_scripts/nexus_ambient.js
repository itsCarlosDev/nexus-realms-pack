// ============================================================
// NEXUS REALMS - AMBIENTE ESPACIAL DE LAS GRIETAS
// Forge 1.20.1 + KubeJS
//
// Cada grieta registrada es una FUENTE DE SONIDO REAL.
// No existe un centro de "zona" artificial.
//
// - El sonido sale desde la grieta más cercana.
// - Cuanto más te alejas del bloque, menos se oye.
// - La detección se hace cada tick: respuesta prácticamente inmediata.
// - Entrada con fade-in rápido (0.75 s).
// - Loops con pequeño solape.
// - Cambio de pista con crossfade, SIN pausa.
// ============================================================


// ============================================================
// FUENTES DE SONIDO
// ============================================================
//
// Para la prueba actual conocemos esta grieta real.
//
// IMPORTANTE:
// Cuando hagamos el motor de corrupción, cada vez que el sistema
// coloque nexus_scar_1..4 añadirá automáticamente aquí / al registro
// persistente su posición. No habrá que escribirlas a mano.
//
const NEXUS_SOUND_BLOCKS = [
    {
        dimension: 'minecraft:overworld',
        x: -62,
        y: 67,
        z: 307
    }
]


// Distancia máxima en la que merece la pena mantener el audio.
// Coincide con attenuation_distance = 16 del sounds.json.
//
// Esto NO es una "zona de corrupción": simplemente evita mandar
// al cliente un sonido que ya debería ser prácticamente inaudible.
const MAX_AUDIBLE_DISTANCE = 16


// ============================================================
// TRACKS
// ============================================================

const TRACKS = {

    1: {
        normal: 'kubejs:kevin_1',

        // Entrada inicial rápida.
        fadeInFast: 'kubejs:kevin_1_fade_in_fast',

        // Crossfade entre pistas.
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


// ~100 ms de solape entre loops del MISMO sonido.
const LOOP_OVERLAP = 2

// Los fade-in/fade-out largos duran 3 segundos.
const CROSSFADE_TICKS = 60

// Volumen base en el propio bloque.
// La distancia hará el resto mediante la atenuación espacial.
const BASE_VOLUME = 0.85

const DEBUG = false



// ============================================================
// ESTADO
// ============================================================

let nexusGlobalTick = 0

const NEXUS_STATES = {}



// ============================================================
// UTILIDADES
// ============================================================

function randomInt(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min
}


function getPlayerState(player) {

    const username = String(player.username)

    if (!NEXUS_STATES[username]) {

        NEXUS_STATES[username] = {

            source: null,

            currentTrack: 0,

            phase: 'idle',

            normalLoopsRemaining: 0,

            nextSoundTick: 0
        }
    }

    return NEXUS_STATES[username]
}



// ============================================================
// BUSCAR LA GRIETA REGISTRADA MÁS CERCANA
// ============================================================

function findNearestSoundBlock(player) {

    const dimension =
        String(player.level.dimension)

    const maxDistanceSq =
        MAX_AUDIBLE_DISTANCE *
        MAX_AUDIBLE_DISTANCE

    let nearest = null
    let nearestDistanceSq = maxDistanceSq


    NEXUS_SOUND_BLOCKS.forEach(source => {

        if (
            source.dimension !==
            dimension
        ) {
            return
        }


        // Centro real del bloque.
        const sx = source.x + 0.5
        const sy = source.y + 0.1
        const sz = source.z + 0.5


        const dx =
            player.x - sx

        const dy =
            player.y - sy

        const dz =
            player.z - sz


        const distanceSq =
            dx * dx +
            dy * dy +
            dz * dz


        if (
            distanceSq <= nearestDistanceSq
        ) {

            nearestDistanceSq =
                distanceSq

            nearest = source
        }
    })


    return nearest
}



// ============================================================
// REPRODUCCIÓN ESPACIAL DESDE EL BLOQUE
// ============================================================

function playTrack(
    server,
    player,
    source,
    sound
) {

    const username =
        String(player.username)


    const x =
        source.x + 0.5

    const y =
        source.y + 0.1

    const z =
        source.z + 0.5


    server.runCommandSilent(
        `playsound ${sound} ambient ${username} ` +
        `${x} ${y} ${z} ` +
        `${BASE_VOLUME} 1 0`
    )


    if (DEBUG) {

        console.info(
            `[NEXUS] ${username} -> ${sound}` +
            ` @ ${source.x} ${source.y} ${source.z}`
        )
    }
}



// ============================================================
// PARAR AUDIO
// ============================================================

function stopNexusSounds(
    server,
    player
) {

    const username =
        String(player.username)


    const sounds = [

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


    sounds.forEach(sound => {

        server.runCommandSilent(
            `stopsound ${username} ambient ${sound}`
        )
    })
}



// ============================================================
// TRACK ALEATORIO DISTINTO
// ============================================================

function pickDifferentTrack(previousTrack) {

    let next


    do {

        next =
            randomInt(1, 3)

    } while (
        previousTrack !== 0 &&
        next === previousTrack
    )


    return next
}



// ============================================================
// EMPEZAR TRACK
// ============================================================

function startTrack(
    server,
    player,
    state,
    previousTrack,
    fastEntry
) {

    const nextTrack =
        pickDifferentTrack(
            previousTrack
        )


    const track =
        TRACKS[nextTrack]


    state.currentTrack =
        nextTrack


    state.normalLoopsRemaining =
        randomInt(
            track.minNormalLoops,
            track.maxNormalLoops
        )


    state.phase =
        'normal'


    // Al acercarse por primera vez:
    // fade-in muy corto de 0.75 s.
    //
    // Entre pistas:
    // fade-in largo de 3 s para el crossfade.
    const sound =
        fastEntry
            ? track.fadeInFast
            : track.fadeIn


    playTrack(
        server,
        player,
        state.source,
        sound
    )


    state.nextSoundTick =
        nexusGlobalTick +
        track.duration -
        LOOP_OVERLAP
}



// ============================================================
// CICLO DE AUDIO
// ============================================================

function processAudio(
    server,
    player,
    state
) {

    if (!state.source) {
        return
    }


    // Primera reproducción al acercarse a una grieta.
    if (
        state.phase ===
        'idle'
    ) {

        startTrack(
            server,
            player,
            state,
            0,
            true
        )

        return
    }


    const track =
        TRACKS[state.currentTrack]


    // ========================================================
    // LOOPS NORMALES
    // ========================================================

    if (
        state.phase ===
        'normal'
    ) {

        if (
            state.normalLoopsRemaining > 0
        ) {

            playTrack(
                server,
                player,
                state.source,
                track.normal
            )


            state.normalLoopsRemaining--


            state.nextSoundTick =
                nexusGlobalTick +
                track.duration -
                LOOP_OVERLAP


            return
        }


        // ====================================================
        // FADE-OUT
        // ====================================================

        playTrack(
            server,
            player,
            state.source,
            track.fadeOut
        )


        state.phase =
            'crossfade'


        // NO esperamos al final.
        //
        // Cuando quedan 3 segundos de este fade-out,
        // empieza el fade-in del siguiente track.
        state.nextSoundTick =
            nexusGlobalTick +
            track.duration -
            CROSSFADE_TICKS


        return
    }


    // ========================================================
    // CROSSFADE SIN PAUSA
    // ========================================================

    if (
        state.phase ===
        'crossfade'
    ) {

        const previousTrack =
            state.currentTrack


        startTrack(
            server,
            player,
            state,
            previousTrack,
            false
        )
    }
}



// ============================================================
// SERVER TICK
// ============================================================

ServerEvents.tick(event => {

    nexusGlobalTick++


    event.server.players.forEach(player => {

        const state =
            getPlayerState(player)


        // ====================================================
        // FUENTE REAL MÁS CERCANA - CADA TICK
        // ====================================================

        const nearest =
            findNearestSoundBlock(player)


        // Acaba de acercarse a una grieta.
        if (
            nearest &&
            !state.source
        ) {

            state.source =
                nearest


            state.currentTrack =
                0


            state.phase =
                'idle'


            state.normalLoopsRemaining =
                0


            // Inmediato.
            state.nextSoundTick =
                nexusGlobalTick
        }


        // Sigue cerca: actualizamos la fuente al bloque
        // más cercano sin reiniciar el track.
        else if (
            nearest &&
            state.source
        ) {

            state.source =
                nearest
        }


        // Ya no queda ninguna grieta audible cerca.
        else if (
            !nearest &&
            state.source
        ) {

            stopNexusSounds(
                event.server,
                player
            )


            state.source =
                null


            state.currentTrack =
                0


            state.phase =
                'idle'


            state.normalLoopsRemaining =
                0


            return
        }


        // ====================================================
        // AUDIO - CADA TICK
        // ====================================================

        if (
            state.source &&
            nexusGlobalTick >=
            state.nextSoundTick
        ) {

            processAudio(
                event.server,
                player,
                state
            )
        }
    })
})
