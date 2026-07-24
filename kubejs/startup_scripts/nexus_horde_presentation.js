// Nexus Realms - capa de presentacion para The Hordes.
// The Hordes conserva el evento base, el spawning nativo y sus comandos finales.
// Nexus Horde Director decide las transiciones kill-gated; este archivo solo las presenta.
//
// Version revisada:
// - corrige la posicion de sonidos y particulas;
// - evita comandos redundantes de bossbar;
// - diferencia la irrupcion del combate activo;
// - conserva la API y los nombres usados por nexus_horde_director.js;
// - mantiene una presentacion personal y consistente para el propietario de la horda.

const NEXUS_HORDE_PRESENTATION_TOTAL_WAVES = 4
const NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS = 200
const NEXUS_HORDE_PRESENTATION_UPDATE_INTERVAL = 5
const NEXUS_HORDE_PRESENTATION_TREMOR_TICKS = 40
const NEXUS_HORDE_PRESENTATION_TREMOR_PULSE_TICKS = 5
const NEXUS_HORDE_PRESENTATION_SPAWN_QUIET_TICKS = 20

const NEXUS_HORDE_PRESENTATION_WARNING_PHASES = [
  { id: 'early', threshold: 200, color: 'dark_purple' },
  { id: 'middle', threshold: 120, color: 'gold' },
  { id: 'immediate', threshold: 40, color: 'red' }
]

const NEXUS_HORDE_PRESENTATION_ERA_MESSAGES = {
  1: {
    early: [
      'El Nexus despierta. Su pulso alcanza el otro lado.',
      'Una vibracion recorre el Nexus. Algo escucha tras el velo.'
    ],
    middle: [
      'El pulso del Nexus se acelera. Preparaos.',
      'El Nexus vuelve a latir. Algo ha respondido al otro lado.'
    ],
    immediate: [
      'El velo se debilita. La horda esta cerca.',
      'El aire se desgarra alrededor del Nexus. Resistid.'
    ],
    startSubtitle: 'El primer pulso ha rasgado el velo.',
    victorySubtitle: 'La incursion ha sido contenida.'
  },
  2: {
    early: [
      'Las grietas del Nexus comienzan a abrirse.',
      'El pulso del Nexus ensancha las grietas entre mundos.'
    ],
    middle: [
      'Las grietas responden. Algo busca un camino hacia este mundo.',
      'El Nexus vuelve a latir. La oscuridad se acerca.'
    ],
    immediate: [
      'Las grietas se abren. La horda esta a punto de cruzar.',
      'El velo cede ante el Nexus. Preparaos para el impacto.'
    ],
    startSubtitle: 'Las grietas han abierto un camino.',
    victorySubtitle: 'Las grietas vuelven a cerrarse.'
  },
  3: {
    early: [
      'La maquinaria de contencion pierde estabilidad.',
      'Los mecanismos del Nexus registran un pulso imposible.'
    ],
    middle: [
      'Los anillos de contencion ya no frenan al Nexus.',
      'La contencion se sobrecarga. Algo fuerza el paso.'
    ],
    immediate: [
      'La contencion ha fallado. El velo esta cediendo.',
      'El Nexus rompe sus limites. La horda va a atravesarlo.'
    ],
    startSubtitle: 'La contencion ha fallado.',
    victorySubtitle: 'Los anillos de contencion vuelven a estabilizarse.'
  },
  4: {
    early: [
      'El Nexus responde directamente desde el otro lado.',
      'Una voluntad remota ha encontrado el pulso del Nexus.'
    ],
    middle: [
      'El Nexus ha llamado... y algo ha respondido.',
      'El velo se curva ante la voluntad del Nexus.'
    ],
    immediate: [
      'El velo se rompe. La respuesta ya esta aqui.',
      'El Nexus se abre. Lo que aguarda al otro lado avanza.'
    ],
    startSubtitle: 'La respuesta ha atravesado el velo.',
    victorySubtitle: 'La voluntad del Nexus permanece intacta.'
  }
}

const NEXUS_HORDE_PRESENTATION_START_MESSAGES = [
  'LA HORDA ATRAVIESA EL NEXUS',
  'EL VELO CEDE: LA HORDA HA LLEGADO',
  'EL NEXUS SE ABRE. LA HORDA IRRUMPE'
]

const NEXUS_HORDE_PRESENTATION_WAVE_MESSAGES = {
  1: 'PRIMER PULSO',
  2: 'LA GRIETA SE ENSANCHA',
  3: 'LA CONTENCION CEDE',
  4: 'MANIFESTACION FINAL'
}

const nexusHordePresentationStates = new Map()
const nexusHordePresentationLoggedErrors = new Set()
let nexusHordePresentationServerTick = 0

function nexusHordePresentationLogErrorOnce(key, message, error) {
  if (nexusHordePresentationLoggedErrors.has(key)) return

  nexusHordePresentationLoggedErrors.add(key)
  console.error(message)

  if (error) {
    console.error(error)
  }
}

function nexusHordePresentationRunSilent(server, command) {
  if (!server) return false

  try {
    return server.getCommands().performPrefixedCommand(
      server.createCommandSourceStack().withSuppressedOutput(),
      command
    ) > 0
  } catch (error) {
    var presentationCommandType = String(command)
      .split(' ')
      .slice(0, 2)
      .join(' ')

    nexusHordePresentationLogErrorOnce(
      `command:${presentationCommandType}:${String(error)}`,
      `Nexus Realms Hordes: fallo de presentacion al ejecutar '${presentationCommandType}'`,
      error
    )

    return false
  }
}

function nexusHordePresentationPlayerId(player) {
  return String(player.uuid)
}

function nexusHordePresentationPlayerName(player) {
  return String(player.getGameProfile().getName())
}

function nexusHordePresentationSafeId(value) {
  return String(value).replace(/-/g, '')
}

function nexusHordePresentationEntityId(entity) {
  return String(entity.uuid)
}

function nexusHordePresentationComponent(text, color, bold) {
  return JSON.stringify({
    text: text === undefined || text === null ? '' : String(text),
    color: color || 'white',
    italic: false,
    bold: Boolean(bold)
  })
}

function nexusHordePresentationCurrentEra(server) {
  var presentationEraData = server.persistentData

  var presentationStoredEra = presentationEraData.contains('nexusEra')
    ? Number(presentationEraData.getInt('nexusEra'))
    : 1

  return Math.max(
    1,
    Math.min(4, presentationStoredEra || 1)
  )
}

function nexusHordePresentationEraMessages(state) {
  return NEXUS_HORDE_PRESENTATION_ERA_MESSAGES[state.era] ||
    NEXUS_HORDE_PRESENTATION_ERA_MESSAGES[1]
}

function nexusHordePresentationNarrativeIndex(
  state,
  phase,
  optionCount
) {
  var presentationNameHash = 0
  var presentationSource =
    `${state.playerName}:${state.startedAt}:${phase}`

  for (
    var presentationIndex = 0;
    presentationIndex < presentationSource.length;
    presentationIndex++
  ) {
    presentationNameHash = (
      presentationNameHash * 31 +
      presentationSource.charCodeAt(presentationIndex)
    ) % 2147483647
  }

  return presentationNameHash % optionCount
}

function nexusHordePresentationSelectNarrative(
  state,
  phase,
  options
) {
  if (!options || options.length === 0) return ''

  var presentationSelected = options[
    nexusHordePresentationNarrativeIndex(
      state,
      phase,
      options.length
    )
  ]

  return presentationSelected === undefined ||
    presentationSelected === null
    ? ''
    : String(presentationSelected)
}

function nexusHordePresentationActionbar(
  player,
  text,
  color
) {
  var presentationServer = player.getServer()
  var presentationName =
    nexusHordePresentationPlayerName(player)

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationName} actionbar ${nexusHordePresentationComponent(text, color, false)}`
  )
}

function nexusHordePresentationPlaySoundAtPlayer(
  state,
  sound,
  volume,
  pitch
) {
  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `execute at ${state.playerName} run playsound ${sound} master ${state.playerName} ~ ~ ~ ${volume} ${pitch}`
  )
}

function nexusHordePresentationParticleAtPlayer(
  state,
  particle,
  offset,
  delta,
  speed,
  count
) {
  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `execute at ${state.playerName} run particle ${particle} ${offset} ${delta} ${speed} ${count} normal ${state.playerName}`
  )
}

function nexusHordePresentationBossbarResetCache(state) {
  state.bossbarCache = {
    name: null,
    color: null,
    style: null,
    max: null,
    value: null,
    visible: null
  }
}

function nexusHordePresentationBossbarRemove(
  state,
  server
) {
  nexusHordePresentationRunSilent(
    server || state.player.getServer(),
    `bossbar remove ${state.bossbarId}`
  )

  state.bossbarAvailable = false
  nexusHordePresentationBossbarResetCache(state)
}

function nexusHordePresentationBossbarSetName(
  state,
  text,
  color
) {
  if (!state.bossbarAvailable) return

  var presentationNameKey =
    `${color || 'white'}:${String(text)}`

  if (
    state.bossbarCache.name === presentationNameKey
  ) return

  state.bossbarCache.name = presentationNameKey

  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `bossbar set ${state.bossbarId} name ${nexusHordePresentationComponent(text, color, false)}`
  )
}

function nexusHordePresentationBossbarSetColor(
  state,
  color
) {
  if (
    !state.bossbarAvailable ||
    state.bossbarCache.color === color
  ) return

  state.bossbarCache.color = color

  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `bossbar set ${state.bossbarId} color ${color}`
  )
}

function nexusHordePresentationBossbarSetStyle(
  state,
  style
) {
  if (
    !state.bossbarAvailable ||
    state.bossbarCache.style === style
  ) return

  state.bossbarCache.style = style

  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `bossbar set ${state.bossbarId} style ${style}`
  )
}

function nexusHordePresentationBossbarSetMax(
  state,
  maximum
) {
  if (!state.bossbarAvailable) return

  var presentationMaximum = Math.max(
    1,
    Math.floor(Number(maximum) || 1)
  )

  if (
    state.bossbarCache.max === presentationMaximum
  ) return

  state.bossbarCache.max = presentationMaximum

  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `bossbar set ${state.bossbarId} max ${presentationMaximum}`
  )
}

function nexusHordePresentationBossbarSetValue(
  state,
  value
) {
  if (!state.bossbarAvailable) return

  var presentationMaximum = Math.max(
    1,
    Number(state.bossbarCache.max) || 1
  )

  var presentationValue = Math.max(
    0,
    Math.min(
      presentationMaximum,
      Math.floor(Number(value) || 0)
    )
  )

  if (
    state.bossbarCache.value === presentationValue
  ) return

  state.bossbarCache.value = presentationValue

  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `bossbar set ${state.bossbarId} value ${presentationValue}`
  )
}

function nexusHordePresentationBossbarSetVisible(
  state,
  visible
) {
  if (!state.bossbarAvailable) return

  var presentationVisible = Boolean(visible)

  if (
    state.bossbarCache.visible === presentationVisible
  ) return

  state.bossbarCache.visible =
    presentationVisible

  nexusHordePresentationRunSilent(
    state.player.getServer(),
    `bossbar set ${state.bossbarId} visible ${presentationVisible}`
  )
}

function nexusHordePresentationBossbarCreate(state) {
  var presentationServer =
    state.player.getServer()

  nexusHordePresentationBossbarRemove(
    state,
    presentationServer
  )

  var presentationCreated =
    nexusHordePresentationRunSilent(
      presentationServer,
      `bossbar add ${state.bossbarId} ${nexusHordePresentationComponent('☠ EL NEXUS SE ABRE EN 10 s', 'yellow', false)}`
    )

  state.bossbarAvailable = presentationCreated
  nexusHordePresentationBossbarResetCache(state)

  if (!presentationCreated) return

  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} players ${state.playerName}`
  )

  nexusHordePresentationBossbarSetName(
    state,
    '☠ EL NEXUS SE ABRE EN 10 s',
    'yellow'
  )

  nexusHordePresentationBossbarSetColor(
    state,
    'yellow'
  )

  nexusHordePresentationBossbarSetStyle(
    state,
    'progress'
  )

  nexusHordePresentationBossbarSetMax(
    state,
    NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS
  )

  nexusHordePresentationBossbarSetValue(
    state,
    NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS
  )

  nexusHordePresentationBossbarSetVisible(
    state,
    true
  )
}

function nexusHordePresentationBossbarCountdown(
  state,
  ticksRemaining
) {
  if (!state.bossbarAvailable) return

  var presentationTicksLeft = Math.max(
    0,
    Number(ticksRemaining) || 0
  )

  var presentationSecondsLeft = Math.ceil(
    presentationTicksLeft / 20
  )

  if (
    state.lastCountdownSecond ===
      presentationSecondsLeft &&
    presentationTicksLeft > 0
  ) return

  state.lastCountdownSecond =
    presentationSecondsLeft

  var presentationColor =
    presentationTicksLeft <= 60
      ? 'red'
      : 'yellow'

  var presentationText =
    presentationTicksLeft <= 0
      ? '☠ EL NEXUS SE ESTA ABRIENDO'
      : `☠ EL NEXUS SE ABRE EN ${presentationSecondsLeft} s`

  nexusHordePresentationBossbarSetName(
    state,
    presentationText,
    presentationColor
  )

  nexusHordePresentationBossbarSetColor(
    state,
    presentationColor
  )

  nexusHordePresentationBossbarSetStyle(
    state,
    'progress'
  )

  nexusHordePresentationBossbarSetMax(
    state,
    NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS
  )

  nexusHordePresentationBossbarSetValue(
    state,
    Math.min(
      NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS,
      presentationTicksLeft
    )
  )
}

function nexusHordePresentationWaveLabel(state) {
  return state.currentWave >= state.totalWaves
    ? 'OLEADA FINAL'
    : `OLEADA ${state.currentWave}/${state.totalWaves}`
}

function nexusHordePresentationBossbarWave(state) {
  if (!state.bossbarAvailable) return

  var presentationAlive =
    state.alive.size

  var presentationWaveLabel =
    nexusHordePresentationWaveLabel(state)

  var presentationText
  var presentationMaximum
  var presentationValue

  if (!state.spawningComplete) {
    presentationMaximum = Math.max(
      1,
      state.expectedWaveSize,
      state.spawnedCount
    )

    presentationValue = Math.min(
      presentationMaximum,
      state.spawnedCount
    )

    presentationText =
      `☠ ${presentationWaveLabel} · IRRUPCION ${state.spawnedCount}/${presentationMaximum}`
  } else {
    presentationMaximum = Math.max(
      1,
      state.expectedWaveSize,
      state.spawnedCount,
      presentationAlive
    )

    presentationValue = Math.min(
      presentationMaximum,
      presentationAlive
    )

    presentationText =
      `☠ ${presentationWaveLabel} · ${presentationAlive} RESTANTES`
  }

  nexusHordePresentationBossbarSetName(
    state,
    presentationText,
    'red'
  )

  nexusHordePresentationBossbarSetColor(
    state,
    'red'
  )

  nexusHordePresentationBossbarSetStyle(
    state,
    'progress'
  )

  nexusHordePresentationBossbarSetMax(
    state,
    presentationMaximum
  )

  nexusHordePresentationBossbarSetValue(
    state,
    presentationValue
  )

  state.bossbarDirty = false
}

function nexusHordePresentationShowWarnings(
  state,
  ticksRemaining
) {
  var presentationEraMessages =
    nexusHordePresentationEraMessages(state)

  NEXUS_HORDE_PRESENTATION_WARNING_PHASES.forEach(
    presentationPhase => {
      if (
        ticksRemaining > presentationPhase.threshold ||
        state.warningPhasesShown.has(
          presentationPhase.id
        )
      ) return

      state.warningPhasesShown.add(
        presentationPhase.id
      )

      nexusHordePresentationActionbar(
        state.player,
        nexusHordePresentationSelectNarrative(
          state,
          presentationPhase.id,
          presentationEraMessages[
            presentationPhase.id
          ]
        ),
        presentationPhase.color
      )

      if (
        presentationPhase.id === 'immediate'
      ) {
        nexusHordePresentationPlaySoundAtPlayer(
          state,
          'minecraft:block.respawn_anchor.deplete',
          0.8,
          0.7
        )
      }
    }
  )
}

function nexusHordePresentationTremorPulse(state) {
  if (
    !state.tremorStarted ||
    state.tremorEndsAt < 0 ||
    nexusHordePresentationServerTick >=
      state.tremorEndsAt ||
    nexusHordePresentationServerTick <
      state.nextTremorPulseAt
  ) return

  state.nextTremorPulseAt =
    nexusHordePresentationServerTick +
    NEXUS_HORDE_PRESENTATION_TREMOR_PULSE_TICKS

  nexusHordePresentationParticleAtPlayer(
    state,
    'minecraft:reverse_portal',
    '~ ~1 ~',
    '1.25 0.55 1.25',
    '0.035',
    10
  )

  nexusHordePresentationParticleAtPlayer(
    state,
    'minecraft:poof',
    '~ ~0.1 ~',
    '1.4 0.15 1.4',
    '0.02',
    6
  )
}

function nexusHordePresentationStartTremor(state) {
  if (state.tremorStarted) return

  state.tremorStarted = true

  state.tremorEndsAt =
    nexusHordePresentationServerTick +
    NEXUS_HORDE_PRESENTATION_TREMOR_TICKS

  state.nextTremorPulseAt =
    nexusHordePresentationServerTick

  nexusHordePresentationPlaySoundAtPlayer(
    state,
    'minecraft:entity.warden.heartbeat',
    0.9,
    0.65
  )

  nexusHordePresentationPlaySoundAtPlayer(
    state,
    'minecraft:block.respawn_anchor.deplete',
    0.7,
    0.55
  )

  nexusHordePresentationTremorPulse(state)
}

function nexusHordePresentationShowStart(state) {
  if (state.startPresented) return

  state.startPresented = true

  nexusHordePresentationStartTremor(state)

  var presentationTitle =
    nexusHordePresentationSelectNarrative(
      state,
      'start',
      NEXUS_HORDE_PRESENTATION_START_MESSAGES
    )

  var presentationSubtitle =
    nexusHordePresentationEraMessages(state)
      .startSubtitle ||
    'El pulso ha rasgado el velo.'

  var presentationServer =
    state.player.getServer()

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${state.playerName} times 10 50 15`
  )

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${state.playerName} subtitle ${nexusHordePresentationComponent(presentationSubtitle, 'dark_purple', false)}`
  )

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${state.playerName} title ${nexusHordePresentationComponent(presentationTitle, 'red', true)}`
  )
}

function nexusHordePresentationShowWaveAnnouncement(
  state
) {
  var presentationWaveMessage =
    NEXUS_HORDE_PRESENTATION_WAVE_MESSAGES[
      state.currentWave
    ] ||
    nexusHordePresentationWaveLabel(state)

  var presentationText =
    state.currentWave >= state.totalWaves
      ? presentationWaveMessage
      : `${nexusHordePresentationWaveLabel(state)} · ${presentationWaveMessage}`

  nexusHordePresentationActionbar(
    state.player,
    presentationText,
    state.currentWave >= state.totalWaves
      ? 'dark_red'
      : 'red'
  )

  if (
    state.currentWave >= state.totalWaves
  ) {
    nexusHordePresentationPlaySoundAtPlayer(
      state,
      'minecraft:entity.warden.roar',
      0.7,
      0.8
    )
  }
}

function nexusHordePresentationMarkWaveCleared(
  player
) {
  var presentationPlayerId =
    nexusHordePresentationPlayerId(player)

  var presentationState =
    nexusHordePresentationStates.get(
      presentationPlayerId
    )

  if (
    !presentationState ||
    presentationState.waveClearPresented
  ) return

  presentationState.waveClearPresented = true
  presentationState.spawningComplete = true
  presentationState.alive.clear()
  presentationState.bossbarDirty = false

  nexusHordePresentationBossbarSetName(
    presentationState,
    '☠ PULSO DEL NEXUS · OLEADA SUPERADA',
    'green'
  )

  nexusHordePresentationBossbarSetColor(
    presentationState,
    'green'
  )

  nexusHordePresentationBossbarSetStyle(
    presentationState,
    'progress'
  )

  nexusHordePresentationBossbarSetMax(
    presentationState,
    1
  )

  nexusHordePresentationBossbarSetValue(
    presentationState,
    1
  )

  nexusHordePresentationActionbar(
    player,
    'OLEADA SUPERADA',
    'green'
  )

  nexusHordePresentationPlaySoundAtPlayer(
    presentationState,
    'minecraft:block.note_block.bell',
    0.8,
    1.35
  )
}

function nexusHordePresentationShowVictory(player) {
  var presentationPlayerId =
    nexusHordePresentationPlayerId(player)

  var presentationState =
    nexusHordePresentationStates.get(
      presentationPlayerId
    )

  if (
    !presentationState ||
    presentationState.victoryPresented
  ) return

  presentationState.victoryPresented = true

  var presentationServer =
    player.getServer()

  var presentationSubtitle =
    nexusHordePresentationEraMessages(
      presentationState
    ).victorySubtitle ||
    'La incursion ha sido contenida.'

  nexusHordePresentationBossbarSetName(
    presentationState,
    '☠ EL NEXUS RESISTE',
    'green'
  )

  nexusHordePresentationBossbarSetColor(
    presentationState,
    'green'
  )

  nexusHordePresentationBossbarSetStyle(
    presentationState,
    'progress'
  )

  nexusHordePresentationBossbarSetMax(
    presentationState,
    1
  )

  nexusHordePresentationBossbarSetValue(
    presentationState,
    1
  )

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationState.playerName} times 10 70 20`
  )

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationState.playerName} subtitle ${nexusHordePresentationComponent(presentationSubtitle, 'green', false)}`
  )

  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationState.playerName} title ${nexusHordePresentationComponent('EL NEXUS RESISTE', 'gold', true)}`
  )

  nexusHordePresentationActionbar(
    player,
    'La Horda ha sido derrotada.',
    'green'
  )

  nexusHordePresentationPlaySoundAtPlayer(
    presentationState,
    'minecraft:ui.toast.challenge_complete',
    1,
    1
  )
}

function nexusHordePresentationCreateState(
  player
) {
  var presentationPlayerId =
    nexusHordePresentationPlayerId(player)

  var presentationState = {
    player: player,
    playerId: presentationPlayerId,

    playerName:
      nexusHordePresentationPlayerName(player),

    bossbarId:
      `nexus:horde_${nexusHordePresentationSafeId(presentationPlayerId)}`,

    bossbarAvailable: false,
    bossbarCache: null,
    bossbarDirty: true,

    startedAt:
      nexusHordePresentationServerTick,

    era:
      nexusHordePresentationCurrentEra(
        player.getServer()
      ),

    preparing: true,

    preparationEndsAt:
      nexusHordePresentationServerTick +
      NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS,

    lastCountdownSecond: -1,
    warningPhasesShown: new Set(),

    startPresented: false,
    tremorStarted: false,
    tremorEndsAt: -1,
    nextTremorPulseAt: -1,

    currentWave: 0,

    totalWaves:
      NEXUS_HORDE_PRESENTATION_TOTAL_WAVES,

    expectedWaveSize: 1,
    spawnedCount: 0,
    spawningComplete: false,
    waveStartedAt: -1,
    lastSpawnAt: -1,

    waveClearPresented: false,
    victoryPresented: false,

    alive: new Map()
  }

  nexusHordePresentationBossbarResetCache(
    presentationState
  )

  return presentationState
}

function nexusHordePresentationCleanup(
  state,
  server
) {
  nexusHordePresentationBossbarRemove(
    state,
    server
  )

  state.alive.clear()

  nexusHordePresentationStates.delete(
    state.playerId
  )
}

function nexusHordePresentationRemoveEntity(
  entity
) {
  var presentationEntityId =
    nexusHordePresentationEntityId(entity)

  nexusHordePresentationStates.forEach(
    presentationState => {
      if (
        presentationState.alive.delete(
          presentationEntityId
        )
      ) {
        presentationState.bossbarDirty = true
      }
    }
  )
}

function nexusHordePresentationRefreshAliveEntities(
  state
) {
  var presentationRemovedAny = false

  state.alive.forEach(
    (
      presentationEntity,
      presentationEntityId
    ) => {
      try {
        if (!presentationEntity.isAlive()) {
          state.alive.delete(
            presentationEntityId
          )

          presentationRemovedAny = true
        }
      } catch (ignored) {
        // Una referencia descargada no altera el ciclo funcional
        // de The Hordes. Nexus Horde Director sigue siendo
        // autoritativo para cerrar la oleada.
      }
    }
  )

  if (presentationRemovedAny) {
    state.bossbarDirty = true
  }
}

function nexusHordePresentationRefreshSpawnPhase(
  state
) {
  if (
    state.spawningComplete ||
    state.spawnedCount <= 0
  ) return

  var presentationReachedExpected =
    state.spawnedCount >=
    state.expectedWaveSize

  var presentationSpawnQuiet =
    state.lastSpawnAt >= 0 &&
    nexusHordePresentationServerTick -
      state.lastSpawnAt >=
      NEXUS_HORDE_PRESENTATION_SPAWN_QUIET_TICKS

  if (
    !presentationReachedExpected &&
    !presentationSpawnQuiet
  ) return

  state.spawningComplete = true
  state.bossbarDirty = true
}

function nexusHordePresentationTickState(state) {
  try {
    if (state.preparing) {
      var presentationRemaining = Math.max(
        0,
        state.preparationEndsAt -
          nexusHordePresentationServerTick
      )

      nexusHordePresentationShowWarnings(
        state,
        presentationRemaining
      )

      nexusHordePresentationBossbarCountdown(
        state,
        presentationRemaining
      )

      return
    }

    nexusHordePresentationTremorPulse(state)

    nexusHordePresentationRefreshAliveEntities(
      state
    )

    nexusHordePresentationRefreshSpawnPhase(
      state
    )

    if (state.waveClearPresented) return

    if (state.bossbarDirty) {
      nexusHordePresentationBossbarWave(
        state
      )
    }
  } catch (error) {
    nexusHordePresentationLogErrorOnce(
      `tick:${state.playerId}:${String(error)}`,
      `Nexus Realms Hordes: fallo al actualizar la presentacion de ${state.playerName}`,
      error
    )
  }
}

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeStartEvent',
  event => {
    var presentationStartPlayer =
      event.getPlayer()

    var presentationStartPlayerId =
      nexusHordePresentationPlayerId(
        presentationStartPlayer
      )

    var presentationPreviousState =
      nexusHordePresentationStates.get(
        presentationStartPlayerId
      )

    if (presentationPreviousState) {
      nexusHordePresentationCleanup(
        presentationPreviousState,
        presentationStartPlayer.getServer()
      )
    }

    var presentationStartState =
      nexusHordePresentationCreateState(
        presentationStartPlayer
      )

    nexusHordePresentationStates.set(
      presentationStartPlayerId,
      presentationStartState
    )

    nexusHordePresentationBossbarCreate(
      presentationStartState
    )

    nexusHordePresentationShowWarnings(
      presentationStartState,
      NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS
    )

    nexusHordePresentationPlaySoundAtPlayer(
      presentationStartState,
      'minecraft:event.raid.horn',
      1,
      1
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeStartWaveEvent',
  event => {
    var presentationWavePlayer =
      event.getPlayer()

    var presentationWavePlayerId =
      nexusHordePresentationPlayerId(
        presentationWavePlayer
      )

    var presentationWaveState =
      nexusHordePresentationStates.get(
        presentationWavePlayerId
      )

    if (!presentationWaveState) {
      presentationWaveState =
        nexusHordePresentationCreateState(
          presentationWavePlayer
        )

      nexusHordePresentationStates.set(
        presentationWavePlayerId,
        presentationWaveState
      )

      nexusHordePresentationBossbarCreate(
        presentationWaveState
      )
    }

    presentationWaveState.preparing = false
    presentationWaveState.alive.clear()
    presentationWaveState.waveClearPresented = false
    presentationWaveState.bossbarDirty = true

    presentationWaveState.currentWave =
      Math.min(
        presentationWaveState.totalWaves,
        presentationWaveState.currentWave + 1
      )

    presentationWaveState.expectedWaveSize =
      Math.max(
        1,
        Number(event.getCount()) || 1
      )

    presentationWaveState.spawnedCount = 0
    presentationWaveState.spawningComplete = false

    presentationWaveState.waveStartedAt =
      nexusHordePresentationServerTick

    presentationWaveState.lastSpawnAt = -1

    if (
      presentationWaveState.currentWave === 1
    ) {
      nexusHordePresentationShowStart(
        presentationWaveState
      )
    }

    nexusHordePresentationShowWaveAnnouncement(
      presentationWaveState
    )

    nexusHordePresentationBossbarWave(
      presentationWaveState
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeSpawnEntityEvent',
  event => {
    var presentationSpawnPlayer =
      event.getPlayer()

    var presentationSpawnState =
      nexusHordePresentationStates.get(
        nexusHordePresentationPlayerId(
          presentationSpawnPlayer
        )
      )

    if (!presentationSpawnState) return

    var presentationSpawnEntity =
      event.getEntity()

    var presentationSpawnEntityId =
      nexusHordePresentationEntityId(
        presentationSpawnEntity
      )

    if (
      !presentationSpawnState.alive.has(
        presentationSpawnEntityId
      )
    ) {
      presentationSpawnState.alive.set(
        presentationSpawnEntityId,
        presentationSpawnEntity
      )

      presentationSpawnState.spawnedCount += 1

      presentationSpawnState.lastSpawnAt =
        nexusHordePresentationServerTick

      presentationSpawnState.bossbarDirty = true
    }

    if (
      presentationSpawnState.spawnedCount >=
      presentationSpawnState.expectedWaveSize
    ) {
      presentationSpawnState.spawningComplete = true
    }
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.living.LivingDeathEvent',
  event => {
    nexusHordePresentationRemoveEntity(
      event.getEntity()
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.EntityLeaveLevelEvent',
  event => {
    var presentationLeavingEntity =
      event.getEntity()

    try {
      if (
        !presentationLeavingEntity.isAlive()
      ) {
        nexusHordePresentationRemoveEntity(
          presentationLeavingEntity
        )
      }
    } catch (ignored) {
      // Descargar un chunk no equivale a terminar una oleada.
    }
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeEndEvent',
  event => {
    var presentationEndPlayer =
      event.getPlayer()

    var presentationEndState =
      nexusHordePresentationStates.get(
        nexusHordePresentationPlayerId(
          presentationEndPlayer
        )
      )

    if (presentationEndState) {
      nexusHordePresentationCleanup(
        presentationEndState,
        presentationEndPlayer.getServer()
      )
    }
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedOutEvent',
  event => {
    var presentationLogoutPlayer =
      event.getEntity()

    var presentationLogoutState =
      nexusHordePresentationStates.get(
        nexusHordePresentationPlayerId(
          presentationLogoutPlayer
        )
      )

    if (presentationLogoutState) {
      nexusHordePresentationCleanup(
        presentationLogoutState,
        presentationLogoutPlayer.getServer()
      )
    }
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent',
  event => {
    var presentationLoginPlayer =
      event.getEntity()

    var presentationStaleState =
      nexusHordePresentationCreateState(
        presentationLoginPlayer
      )

    nexusHordePresentationBossbarRemove(
      presentationStaleState,
      presentationLoginPlayer.getServer()
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.server.ServerStoppingEvent',
  event => {
    var presentationStoppingServer =
      event.getServer()

    var presentationStoppingStates = []

    nexusHordePresentationStates.forEach(
      presentationState => {
        presentationStoppingStates.push(
          presentationState
        )
      }
    )

    presentationStoppingStates.forEach(
      presentationState => {
        nexusHordePresentationCleanup(
          presentationState,
          presentationStoppingServer
        )
      }
    )

    nexusHordePresentationStates.clear()
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.TickEvent$ServerTickEvent',
  event => {
    if (String(event.phase) !== 'END') return

    nexusHordePresentationServerTick += 1

    if (
      nexusHordePresentationServerTick %
        NEXUS_HORDE_PRESENTATION_UPDATE_INTERVAL !==
      0
    ) return

    nexusHordePresentationStates.forEach(
      presentationState => {
        nexusHordePresentationTickState(
          presentationState
        )
      }
    )
  }
)

// API explicita opcional para nexus_horde_director.js.
// Se mantienen tambien las funciones superiores con sus nombres
// originales para no romper la integracion existente.
if (typeof global !== 'undefined') {
  global.NexusHordePresentation = {
    markWaveCleared:
      nexusHordePresentationMarkWaveCleared,

    showVictory:
      nexusHordePresentationShowVictory
  }
}