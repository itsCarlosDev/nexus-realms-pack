// Nexus Realms - capa de presentacion para The Hordes.
// The Hordes conserva el evento base, el spawning nativo y sus comandos finales.
// Nexus Horde Director decide las transiciones kill-gated; este archivo solo las presenta.

const NEXUS_HORDE_PRESENTATION_TOTAL_WAVES = 4
const NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS = 200
const NEXUS_HORDE_PRESENTATION_UPDATE_INTERVAL = 5
const NEXUS_HORDE_PRESENTATION_TREMOR_TICKS = 40
const NEXUS_HORDE_PRESENTATION_TREMOR_PULSE_TICKS = 5

const NEXUS_HORDE_PRESENTATION_WARNING_PHASES = [
  { id: 'early', threshold: 200, color: 'dark_purple' },
  { id: 'middle', threshold: 120, color: 'gold' },
  { id: 'immediate', threshold: 40, color: 'red' }
]

const NEXUS_HORDE_PRESENTATION_ERA_MESSAGES = {
  1: {
    early: [
      'El Nexus despierta. Su pulso alcanza el otro lado.',
      'Una vibración recorre el Nexus. Algo escucha tras el velo.'
    ],
    middle: [
      'El pulso del Nexus se acelera. Preparaos.',
      'El Nexus vuelve a latir. Algo ha respondido al otro lado.'
    ],
    immediate: [
      'El velo se debilita. La horda está cerca.',
      'El aire se desgarra alrededor del Nexus. Resistid.'
    ]
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
      'Las grietas se abren. La horda está a punto de cruzar.',
      'El velo cede ante el Nexus. Preparaos para el impacto.'
    ]
  },
  3: {
    early: [
      'La maquinaria de contención pierde estabilidad.',
      'Los mecanismos del Nexus registran un pulso imposible.'
    ],
    middle: [
      'Los anillos de contención ya no frenan al Nexus.',
      'La contención se sobrecarga. Algo fuerza el paso.'
    ],
    immediate: [
      'La contención ha fallado. El velo está cediendo.',
      'El Nexus rompe sus límites. La horda va a atravesarlo.'
    ]
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
      'El velo se rompe. La respuesta ya está aquí.',
      'El Nexus se abre. Lo que aguarda al otro lado avanza.'
    ]
  }
}

const NEXUS_HORDE_PRESENTATION_START_MESSAGES = [
  'LA HORDA ATRAVIESA EL NEXUS',
  'EL VELO CEDE: LA HORDA HA LLEGADO',
  'EL NEXUS SE ABRE. LA HORDA IRRUMPE'
]

const nexusHordePresentationStates = new Map()
const nexusHordePresentationLoggedErrors = new Set()
let nexusHordePresentationServerTick = 0

function nexusHordePresentationLogErrorOnce(key, message, error) {
  if (nexusHordePresentationLoggedErrors.has(key)) return
  nexusHordePresentationLoggedErrors.add(key)
  console.error(message)
  if (error) console.error(error)
}

function nexusHordePresentationRunSilent(server, command) {
  if (!server) return false

  try {
    return server.getCommands().performPrefixedCommand(
      server.createCommandSourceStack().withSuppressedOutput(),
      command
    ) > 0
  } catch (error) {
    var presentationCommandType = String(command).split(' ').slice(0, 2).join(' ')
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
  return Math.max(1, Math.min(4, presentationStoredEra || 1))
}

function nexusHordePresentationNarrativeIndex(state, phase, optionCount) {
  var presentationNameHash = 0
  var presentationSource = `${state.playerName}:${phase}`
  for (var presentationIndex = 0; presentationIndex < presentationSource.length; presentationIndex++) {
    presentationNameHash = (
      presentationNameHash * 31 + presentationSource.charCodeAt(presentationIndex)
    ) % 2147483647
  }

  return presentationNameHash % optionCount
}

function nexusHordePresentationSelectNarrative(state, phase, options) {
  if (!options || options.length === 0) return ''
  var presentationSelected = options[
    nexusHordePresentationNarrativeIndex(state, phase, options.length)
  ]
  return presentationSelected === undefined || presentationSelected === null
    ? ''
    : String(presentationSelected)
}

function nexusHordePresentationActionbar(player, text, color) {
  var presentationServer = player.getServer()
  var presentationName = nexusHordePresentationPlayerName(player)
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationName} actionbar ${nexusHordePresentationComponent(text, color, false)}`
  )
}

function nexusHordePresentationBossbarRemove(state, server) {
  nexusHordePresentationRunSilent(
    server || state.player.getServer(),
    `bossbar remove ${state.bossbarId}`
  )
}

function nexusHordePresentationBossbarCreate(state) {
  var presentationServer = state.player.getServer()
  nexusHordePresentationBossbarRemove(state, presentationServer)
  var presentationCreated = nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar add ${state.bossbarId} ${nexusHordePresentationComponent('☠ EL NEXUS SE ABRE EN 10 s', 'yellow', false)}`
  )
  state.bossbarAvailable = presentationCreated
  if (!presentationCreated) return

  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} players ${state.playerName}`
  )
  nexusHordePresentationRunSilent(presentationServer, `bossbar set ${state.bossbarId} color yellow`)
  nexusHordePresentationRunSilent(presentationServer, `bossbar set ${state.bossbarId} style progress`)
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} max ${NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} value ${NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS}`
  )
  nexusHordePresentationRunSilent(presentationServer, `bossbar set ${state.bossbarId} visible true`)
}

function nexusHordePresentationBossbarCountdown(state, ticksRemaining) {
  if (!state.bossbarAvailable) return
  var presentationServer = state.player.getServer()
  var presentationTicksLeft = Math.max(0, Number(ticksRemaining) || 0)
  var presentationSecondsLeft = Math.max(1, Math.ceil(presentationTicksLeft / 20))
  var presentationColor = presentationTicksLeft <= 60 ? 'red' : 'yellow'
  var presentationText = `☠ EL NEXUS SE ABRE EN ${presentationSecondsLeft} s`

  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} name ${nexusHordePresentationComponent(presentationText, presentationColor, false)}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} color ${presentationColor}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} max ${NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} value ${Math.min(NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS, presentationTicksLeft)}`
  )
}

function nexusHordePresentationBossbarWave(state) {
  if (!state.bossbarAvailable) return
  var presentationServer = state.player.getServer()
  var presentationAlive = state.alive.size
  var presentationMaximum = Math.max(1, state.expectedWaveSize, presentationAlive)
  var presentationWaveLabel = state.currentWave >= state.totalWaves
    ? 'OLEADA FINAL'
    : `OLEADA ${state.currentWave}/${state.totalWaves}`
  var presentationText = `☠ PULSO DEL NEXUS · ${presentationWaveLabel} · ${presentationAlive} ENEMIGOS`

  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} name ${nexusHordePresentationComponent(presentationText, 'red', false)}`
  )
  nexusHordePresentationRunSilent(presentationServer, `bossbar set ${state.bossbarId} color red`)
  nexusHordePresentationRunSilent(presentationServer, `bossbar set ${state.bossbarId} style progress`)
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} max ${presentationMaximum}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `bossbar set ${state.bossbarId} value ${Math.min(presentationMaximum, presentationAlive)}`
  )
}

function nexusHordePresentationShowWarnings(state, ticksRemaining) {
  var presentationEra = nexusHordePresentationCurrentEra(state.player.getServer())
  var presentationEraMessages = NEXUS_HORDE_PRESENTATION_ERA_MESSAGES[presentationEra] ||
    NEXUS_HORDE_PRESENTATION_ERA_MESSAGES[1]

  NEXUS_HORDE_PRESENTATION_WARNING_PHASES.forEach(presentationPhase => {
    if (
      ticksRemaining > presentationPhase.threshold ||
      state.warningPhasesShown.has(presentationPhase.id)
    ) return

    state.warningPhasesShown.add(presentationPhase.id)
    nexusHordePresentationActionbar(
      state.player,
      nexusHordePresentationSelectNarrative(
        state,
        presentationPhase.id,
        presentationEraMessages[presentationPhase.id]
      ),
      presentationPhase.color
    )

    if (presentationPhase.id === 'immediate') {
      nexusHordePresentationRunSilent(
        state.player.getServer(),
        `playsound minecraft:block.respawn_anchor.deplete master ${state.playerName} ~ ~ ~ 0.8 0.7`
      )
    }
  })
}

function nexusHordePresentationTremorPulse(state) {
  if (
    !state.tremorStarted ||
    state.tremorEndsAt < 0 ||
    nexusHordePresentationServerTick >= state.tremorEndsAt ||
    nexusHordePresentationServerTick < state.nextTremorPulseAt
  ) return

  state.nextTremorPulseAt =
    nexusHordePresentationServerTick + NEXUS_HORDE_PRESENTATION_TREMOR_PULSE_TICKS
  var presentationServer = state.player.getServer()
  nexusHordePresentationRunSilent(
    presentationServer,
    `execute at ${state.playerName} run particle minecraft:reverse_portal ~ ~1 ~ 1.25 0.55 1.25 0.035 10 force @a[distance=..64]`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `execute at ${state.playerName} run particle minecraft:poof ~ ~0.1 ~ 1.4 0.15 1.4 0.02 6 force @a[distance=..64]`
  )
}

function nexusHordePresentationStartTremor(state) {
  if (state.tremorStarted) return
  state.tremorStarted = true
  state.tremorEndsAt =
    nexusHordePresentationServerTick + NEXUS_HORDE_PRESENTATION_TREMOR_TICKS
  state.nextTremorPulseAt = nexusHordePresentationServerTick

  var presentationServer = state.player.getServer()
  nexusHordePresentationRunSilent(
    presentationServer,
    `execute at ${state.playerName} run playsound minecraft:entity.warden.heartbeat master @a[distance=..48] ~ ~ ~ 0.9 0.65`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `execute at ${state.playerName} run playsound minecraft:block.respawn_anchor.deplete master @a[distance=..48] ~ ~ ~ 0.7 0.55`
  )
  nexusHordePresentationTremorPulse(state)
}

function nexusHordePresentationShowStart(state) {
  if (state.startPresented) return
  state.startPresented = true
  nexusHordePresentationStartTremor(state)

  var presentationTitle = nexusHordePresentationSelectNarrative(
    state,
    'start',
    NEXUS_HORDE_PRESENTATION_START_MESSAGES
  )
  var presentationServer = state.player.getServer()
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${state.playerName} times 10 50 15`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${state.playerName} subtitle ${nexusHordePresentationComponent('El pulso ha rasgado el velo.', 'dark_purple', false)}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${state.playerName} title ${nexusHordePresentationComponent(presentationTitle, 'red', true)}`
  )
}

function nexusHordePresentationMarkWaveCleared(player) {
  var presentationPlayerId = nexusHordePresentationPlayerId(player)
  var presentationState = nexusHordePresentationStates.get(presentationPlayerId)
  if (!presentationState || presentationState.waveClearPresented) return

  presentationState.waveClearPresented = true
  presentationState.alive.clear()
  var presentationServer = player.getServer()
  if (presentationState.bossbarAvailable) {
    nexusHordePresentationRunSilent(
      presentationServer,
      `bossbar set ${presentationState.bossbarId} name ${nexusHordePresentationComponent('☠ PULSO DEL NEXUS · OLEADA SUPERADA', 'green', false)}`
    )
    nexusHordePresentationRunSilent(
      presentationServer,
      `bossbar set ${presentationState.bossbarId} color green`
    )
    nexusHordePresentationRunSilent(
      presentationServer,
      `bossbar set ${presentationState.bossbarId} max 1`
    )
    nexusHordePresentationRunSilent(
      presentationServer,
      `bossbar set ${presentationState.bossbarId} value 1`
    )
  }
  nexusHordePresentationActionbar(player, 'OLEADA SUPERADA', 'green')
  nexusHordePresentationRunSilent(
    presentationServer,
    `playsound minecraft:block.note_block.bell master ${presentationState.playerName} ~ ~ ~ 0.8 1.35`
  )
}

function nexusHordePresentationShowVictory(player) {
  var presentationPlayerId = nexusHordePresentationPlayerId(player)
  var presentationState = nexusHordePresentationStates.get(presentationPlayerId)
  if (!presentationState || presentationState.victoryPresented) return

  presentationState.victoryPresented = true
  var presentationServer = player.getServer()
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationState.playerName} times 10 70 20`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationState.playerName} subtitle ${nexusHordePresentationComponent('La incursión ha sido contenida.', 'green', false)}`
  )
  nexusHordePresentationRunSilent(
    presentationServer,
    `title ${presentationState.playerName} title ${nexusHordePresentationComponent('EL NEXUS RESISTE', 'gold', true)}`
  )
  nexusHordePresentationActionbar(player, 'La Horda ha sido derrotada.', 'green')
  nexusHordePresentationRunSilent(
    presentationServer,
    `playsound minecraft:ui.toast.challenge_complete master ${presentationState.playerName} ~ ~ ~ 1 1`
  )
}

function nexusHordePresentationCreateState(player) {
  var presentationPlayerId = nexusHordePresentationPlayerId(player)
  return {
    player: player,
    playerId: presentationPlayerId,
    playerName: nexusHordePresentationPlayerName(player),
    bossbarId: `nexus:horde_${nexusHordePresentationSafeId(presentationPlayerId)}`,
    bossbarAvailable: false,
    preparing: true,
    preparationEndsAt: nexusHordePresentationServerTick + NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS,
    warningPhasesShown: new Set(),
    startPresented: false,
    tremorStarted: false,
    tremorEndsAt: -1,
    nextTremorPulseAt: -1,
    currentWave: 0,
    totalWaves: NEXUS_HORDE_PRESENTATION_TOTAL_WAVES,
    expectedWaveSize: 1,
    waveClearPresented: false,
    victoryPresented: false,
    alive: new Map()
  }
}

function nexusHordePresentationCleanup(state, server) {
  nexusHordePresentationBossbarRemove(state, server)
  state.alive.clear()
  nexusHordePresentationStates.delete(state.playerId)
}

function nexusHordePresentationRemoveEntity(entity) {
  var presentationEntityId = nexusHordePresentationEntityId(entity)
  nexusHordePresentationStates.forEach(presentationState => {
    presentationState.alive.delete(presentationEntityId)
  })
}

function nexusHordePresentationTickState(state) {
  try {
    if (state.preparing) {
      var presentationRemaining = Math.max(
        0,
        state.preparationEndsAt - nexusHordePresentationServerTick
      )
      nexusHordePresentationShowWarnings(state, presentationRemaining)
      nexusHordePresentationBossbarCountdown(state, presentationRemaining)
      return
    }

    nexusHordePresentationTremorPulse(state)
    state.alive.forEach((presentationEntity, presentationEntityId) => {
      try {
        if (!presentationEntity.isAlive()) state.alive.delete(presentationEntityId)
      } catch (ignored) {
        // Una referencia descargada no altera el ciclo funcional de The Hordes.
      }
    })
    if (state.waveClearPresented) return
    nexusHordePresentationBossbarWave(state)
  } catch (error) {
    nexusHordePresentationLogErrorOnce(
      `tick:${state.playerId}:${String(error)}`,
      `Nexus Realms Hordes: fallo al actualizar la presentacion de ${state.playerName}`,
      error
    )
  }
}

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeStartEvent', event => {
  var presentationStartPlayer = event.getPlayer()
  var presentationStartPlayerId = nexusHordePresentationPlayerId(presentationStartPlayer)
  var presentationPreviousState = nexusHordePresentationStates.get(presentationStartPlayerId)
  if (presentationPreviousState) {
    nexusHordePresentationCleanup(presentationPreviousState, presentationStartPlayer.getServer())
  }

  var presentationStartState = nexusHordePresentationCreateState(presentationStartPlayer)
  nexusHordePresentationStates.set(presentationStartPlayerId, presentationStartState)
  nexusHordePresentationBossbarCreate(presentationStartState)
  nexusHordePresentationShowWarnings(
    presentationStartState,
    NEXUS_HORDE_PRESENTATION_PREPARATION_TICKS
  )
  nexusHordePresentationRunSilent(
    presentationStartPlayer.getServer(),
    `playsound minecraft:event.raid.horn master ${presentationStartState.playerName} ~ ~ ~ 1 1`
  )
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeStartWaveEvent', event => {
  var presentationWavePlayer = event.getPlayer()
  var presentationWavePlayerId = nexusHordePresentationPlayerId(presentationWavePlayer)
  var presentationWaveState = nexusHordePresentationStates.get(presentationWavePlayerId)
  if (!presentationWaveState) {
    presentationWaveState = nexusHordePresentationCreateState(presentationWavePlayer)
    nexusHordePresentationStates.set(presentationWavePlayerId, presentationWaveState)
    nexusHordePresentationBossbarCreate(presentationWaveState)
  }

  presentationWaveState.preparing = false
  presentationWaveState.alive.clear()
  presentationWaveState.waveClearPresented = false
  presentationWaveState.currentWave = Math.min(
    presentationWaveState.totalWaves,
    presentationWaveState.currentWave + 1
  )
  presentationWaveState.expectedWaveSize = Math.max(1, Number(event.getCount()) || 1)
  if (presentationWaveState.currentWave === 1) {
    nexusHordePresentationShowStart(presentationWaveState)
  }
  nexusHordePresentationActionbar(
    presentationWavePlayer,
    presentationWaveState.currentWave >= presentationWaveState.totalWaves
      ? 'OLEADA FINAL'
      : `OLEADA ${presentationWaveState.currentWave}/${presentationWaveState.totalWaves}`,
    'red'
  )
  nexusHordePresentationBossbarWave(presentationWaveState)
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeSpawnEntityEvent', event => {
  var presentationSpawnPlayer = event.getPlayer()
  var presentationSpawnState = nexusHordePresentationStates.get(
    nexusHordePresentationPlayerId(presentationSpawnPlayer)
  )
  if (!presentationSpawnState) return

  var presentationSpawnEntity = event.getEntity()
  presentationSpawnState.alive.set(
    nexusHordePresentationEntityId(presentationSpawnEntity),
    presentationSpawnEntity
  )
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDeathEvent', event => {
  nexusHordePresentationRemoveEntity(event.getEntity())
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityLeaveLevelEvent', event => {
  var presentationLeavingEntity = event.getEntity()
  try {
    if (!presentationLeavingEntity.isAlive()) {
      nexusHordePresentationRemoveEntity(presentationLeavingEntity)
    }
  } catch (ignored) {
    // Descargar un chunk no equivale a terminar una oleada.
  }
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeEndEvent', event => {
  var presentationEndPlayer = event.getPlayer()
  var presentationEndState = nexusHordePresentationStates.get(
    nexusHordePresentationPlayerId(presentationEndPlayer)
  )
  if (presentationEndState) {
    nexusHordePresentationCleanup(presentationEndState, presentationEndPlayer.getServer())
  }
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedOutEvent', event => {
  var presentationLogoutPlayer = event.getEntity()
  var presentationLogoutState = nexusHordePresentationStates.get(
    nexusHordePresentationPlayerId(presentationLogoutPlayer)
  )
  if (presentationLogoutState) {
    nexusHordePresentationCleanup(presentationLogoutState, presentationLogoutPlayer.getServer())
  }
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent', event => {
  var presentationLoginPlayer = event.getEntity()
  var presentationStaleState = nexusHordePresentationCreateState(presentationLoginPlayer)
  nexusHordePresentationBossbarRemove(presentationStaleState, presentationLoginPlayer.getServer())
})

ForgeEvents.onEvent('net.minecraftforge.event.server.ServerStoppingEvent', event => {
  var presentationStoppingServer = event.getServer()
  var presentationStoppingStates = []
  nexusHordePresentationStates.forEach(presentationState => {
    presentationStoppingStates.push(presentationState)
  })
  presentationStoppingStates.forEach(presentationState => {
    nexusHordePresentationCleanup(presentationState, presentationStoppingServer)
  })
  nexusHordePresentationStates.clear()
})

ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ServerTickEvent', event => {
  if (String(event.phase) !== 'END') return
  nexusHordePresentationServerTick += 1
  if (
    nexusHordePresentationServerTick % NEXUS_HORDE_PRESENTATION_UPDATE_INTERVAL !== 0
  ) return

  nexusHordePresentationStates.forEach(presentationState => {
    nexusHordePresentationTickState(presentationState)
  })
})
