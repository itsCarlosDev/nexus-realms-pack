// Nexus Realms - director kill-gated sobre el evento base de The Hordes.
// The Hordes conserva el spawning (spawnWave), el HordeEndEvent y sus comandos finales.
// El director decide cuando lanzar las cuatro oleadas, genera una manifestacion
// final por el pipeline nativo y solo finaliza tras confirmar su muerte.

const NEXUS_HORDE_DIRECTOR_TOTAL_WAVES = 4
const NEXUS_HORDE_DIRECTOR_PREPARATION_TICKS = 200
const NEXUS_HORDE_DIRECTOR_SPAWN_SETTLE_TICKS = 20
const NEXUS_HORDE_DIRECTOR_ZERO_CONFIRM_TICKS = 10
const NEXUS_HORDE_DIRECTOR_INTERMISSION_TICKS = 60
const NEXUS_HORDE_DIRECTOR_UPDATE_INTERVAL = 5
const NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS = 2400
const NEXUS_HORDE_DIRECTOR_EMPTY_WAVE_WARNING_TICKS = 200
const NEXUS_HORDE_DIRECTOR_MAX_LAUNCH_FAILURES = 3
const NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS = 3
const NEXUS_HORDE_DIRECTOR_FINISHER_RETRY_TICKS = 200

const nexusHordeDirectorStates = new Map()
const nexusHordeDirectorEntityOwners = new Map()
const nexusHordeDirectorLoggedErrors = new Set()
let nexusHordeDirectorServerTick = 0
var nexusHordeDirectorTargetingClass = null
var nexusHordeDirectorNativeBridgeClass = null

try {
  nexusHordeDirectorTargetingClass = Java.loadClass(
    'dev.itscarlos.nexuscore.horde.HordeTargeting'
  )
} catch (error) {
  console.error(
    'Nexus Horde Director: Nexus Core no expone HordeTargeting.'
  )
  console.error(error)
}

function nexusHordeDirectorLogErrorOnce(key, message, error) {
  if (nexusHordeDirectorLoggedErrors.has(key)) return

  nexusHordeDirectorLoggedErrors.add(key)
  console.error(message)

  if (error) {
    console.error(error)
  }
}

function nexusHordeDirectorLoadNativeBridge() {
  try {
    var directorBridgeClass =
      Java.loadClass(
        'dev.itscarlos.nexuscore.horde.HordeNativeBridge'
      )

    if (!directorBridgeClass.isAvailable()) {
      throw new Error(
        'HordeNativeBridge no disponible: ' +
        String(
          directorBridgeClass
            .getInitializationError()
        )
      )
    }

    nexusHordeDirectorNativeBridgeClass =
      directorBridgeClass
  } catch (error) {
    nexusHordeDirectorNativeBridgeClass = null

    nexusHordeDirectorLogErrorOnce(
      `native-bridge:${String(error)}`,
      'Nexus Horde Director: Nexus Core no expone un HordeNativeBridge valido.',
      error
    )
  }
}

nexusHordeDirectorLoadNativeBridge()

function nexusHordeDirectorPlayerId(player) {
  return String(player.uuid)
}

function nexusHordeDirectorEntityId(entity) {
  return String(entity.uuid)
}

function nexusHordeDirectorSafeId(value) {
  return String(value).replace(/-/g, '')
}

function nexusHordeDirectorPresentationApi() {
  if (typeof global === 'undefined') return null

  return global.NexusHordePresentation || null
}

function nexusHordeDirectorContext(server) {
  try {
    if (
      global.NexusEraCalendar &&
      typeof global.NexusEraCalendar.getHordeContext ===
        'function'
    ) {
      return global.NexusEraCalendar.getHordeContext(
        server
      )
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `context:${String(error)}`,
      'Nexus Horde Director: no se pudo leer el contexto global.',
      error
    )
  }

  return null
}

function nexusHordeDirectorSameHorde(left, right) {
  if (left === right) return true
  if (!left || !right) return false

  try {
    return left.equals(right)
  } catch (ignored) {
    return false
  }
}

function nexusHordeDirectorFindStateByHorde(horde) {
  var directorFoundState = null

  nexusHordeDirectorStates.forEach(directorState => {
    if (
      !directorFoundState &&
      nexusHordeDirectorSameHorde(
        directorState.horde,
        horde
      )
    ) {
      directorFoundState = directorState
    }
  })

  return directorFoundState
}

function nexusHordeDirectorIsValidParticipant(
  state,
  player
) {
  if (!player) return false

  var directorPlayerId =
    nexusHordeDirectorPlayerId(player)

  if (
    !state.participantIds.includes(
      directorPlayerId
    )
  ) {
    return false
  }

  try {
    return (
      player.isAlive() &&
      !player.isSpectator() &&
      String(player.level.dimension) ===
        state.dimensionId
    )
  } catch (ignored) {
    return false
  }
}

function nexusHordeDirectorEnsureTechnicalPlayer(state) {
  var directorPreferredPlayer = null

  state.server.players.forEach(player => {
    if (
      nexusHordeDirectorPlayerId(player) ===
        state.playerId &&
      nexusHordeDirectorIsValidParticipant(
        state,
        player
      )
    ) {
      directorPreferredPlayer = player
    }
  })

  if (directorPreferredPlayer) {
    state.player = directorPreferredPlayer
    state.paused = false
    return true
  }

  if (
    nexusHordeDirectorIsValidParticipant(
      state,
      state.player
    )
  ) {
    state.paused = false
    return true
  }

  var directorReplacement = null

  state.server.players.forEach(player => {
    if (
      !directorReplacement &&
      nexusHordeDirectorIsValidParticipant(
        state,
        player
      )
    ) {
      directorReplacement = player
    }
  })

  if (!directorReplacement) {
    state.paused = true
    return false
  }

  state.player = directorReplacement
  state.paused = false
  return true
}

function nexusHordeDirectorCreateState(player, horde) {
  var directorPlayerId = nexusHordeDirectorPlayerId(player)
  var directorServer = player.getServer()
  var directorContext =
    nexusHordeDirectorContext(directorServer)
  var directorHasCalendarContext =
    directorContext &&
    String(directorContext.anchorId) ===
      directorPlayerId

  var directorParticipantIds =
    directorHasCalendarContext &&
    Array.isArray(directorContext.participantIds)
      ? directorContext.participantIds.slice()
      : [directorPlayerId]

  var directorWaveAmounts =
    directorHasCalendarContext &&
    Array.isArray(directorContext.waveAmounts) &&
    directorContext.waveAmounts.length ===
      NEXUS_HORDE_DIRECTOR_TOTAL_WAVES
      ? directorContext.waveAmounts.map(amount =>
          Math.max(
            1,
            Math.min(
              24,
              Math.floor(Number(amount) || 1)
            )
          )
        )
      : null

  return {
    player: player,
    playerId: directorPlayerId,
    server: directorServer,
    participantIds: directorParticipantIds,
    participantCsv: directorParticipantIds.join(','),
    dimensionId: String(player.level.dimension),
    horde: horde,
    useThreatOverride: Boolean(
      directorHasCalendarContext
    ),
    threatDay: directorHasCalendarContext
      ? Math.max(
          0,
          Math.min(
            2147483647,
            Math.floor(
              Number(directorContext.threatDay) || 0
            )
          )
        )
      : 0,
    threatTier: directorHasCalendarContext
      ? Number(directorContext.threatTier) || 1
      : 1,
    waveAmounts: directorWaveAmounts,
    finisherTable:
      directorHasCalendarContext &&
      directorContext.finisherTable
        ? String(directorContext.finisherTable)
        : '',
    tag: `nexus_horde_${nexusHordeDirectorSafeId(directorPlayerId)}`,

    currentWave: 0,
    alive: new Map(),

    firstWaveAt:
      nexusHordeDirectorServerTick +
      NEXUS_HORDE_DIRECTOR_PREPARATION_TICKS,

    settleAt: -1,
    zeroSince: -1,
    nextWaveAt: -1,

    phase: 'preparing',
    launchingWave: false,
    waveHadMob: false,
    waveClearCommitted: false,
    waveLaunchFailures: 0,
    finisherStarted: false,
    launchingFinisher: false,
    finisherAttempts: 0,
    aborting: false,
    blockedReason: '',
    completing: false,
    victoryPresented: false,
    paused: false
  }
}

function nexusHordeDirectorForgetEntity(
  state,
  entityId,
  removeFromNativeTracking
) {
  var directorRecord = state.alive.get(entityId)

  if (!directorRecord) return false

  state.alive.delete(entityId)
  nexusHordeDirectorEntityOwners.delete(entityId)

  try {
    directorRecord.entity.removeTag(state.tag)
  } catch (ignored) {
    // Una entidad eliminada o descargada puede no aceptar ya cambios de tag.
  }

  try {
    if (nexusHordeDirectorTargetingClass) {
      nexusHordeDirectorTargetingClass.clear(
        directorRecord.entity
      )
    }
  } catch (ignored) {
    // La entidad puede haberse descargado o eliminado.
  }

  if (removeFromNativeTracking) {
    try {
      state.horde.removeEntity(directorRecord.entity)
    } catch (error) {
      nexusHordeDirectorLogErrorOnce(
        `native-remove:${entityId}:${String(error)}`,
        `Nexus Horde Director: no se pudo liberar el tracking nativo de ${entityId}`,
        error
      )
    }

  }

  return true
}

function nexusHordeDirectorRemoveTrackedEntity(entity) {
  var directorEntityId = nexusHordeDirectorEntityId(entity)

  var directorOwnerId =
    nexusHordeDirectorEntityOwners.get(directorEntityId)

  if (!directorOwnerId) return

  var directorState =
    nexusHordeDirectorStates.get(directorOwnerId)

  if (!directorState) {
    nexusHordeDirectorEntityOwners.delete(directorEntityId)
    return
  }

  nexusHordeDirectorForgetEntity(
    directorState,
    directorEntityId,
    false
  )
}

function nexusHordeDirectorCleanupState(state) {
  var directorEntityIds = []

  state.alive.forEach((directorRecord, directorEntityId) => {
    directorEntityIds.push(directorEntityId)
  })

  directorEntityIds.forEach(directorEntityId => {
    nexusHordeDirectorForgetEntity(
      state,
      directorEntityId,
      false
    )
  })

  state.alive.clear()
  nexusHordeDirectorStates.delete(state.playerId)
}

function nexusHordeDirectorCancelForPlayer(player) {
  if (!player) return false

  var directorState =
    nexusHordeDirectorStates.get(
      nexusHordeDirectorPlayerId(
        player
      )
    )

  if (!directorState) return false

  nexusHordeDirectorCleanupState(
    directorState
  )

  return true
}

function nexusHordeDirectorWaveAmount(state) {
  if (
    state.waveAmounts &&
    state.currentWave >= 1 &&
    state.currentWave <= state.waveAmounts.length
  ) {
    return state.waveAmounts[
      state.currentWave - 1
    ]
  }

  try {
    var directorSpawnData = state.horde.getSpawnData()

    if (directorSpawnData) {
      return Math.max(
        1,
        Math.min(
          24,
          Math.floor(
            Number(directorSpawnData.getSpawnAmount()) || 1
          )
        )
      )
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `wave-amount:${state.playerId}:${String(error)}`,
      'Nexus Horde Director: no se pudo leer spawnAmount de The Hordes',
      error
    )
  }

  return 15
}

function nexusHordeDirectorSpawnWaveNative(
  state,
  amount
) {
  if (!state.useThreatOverride) {
    state.horde.spawnWave(
      state.player,
      amount
    )

    return
  }

  if (!nexusHordeDirectorNativeBridgeClass) {
    throw new Error(
      'HordeNativeBridge no disponible para aplicar threatDay.'
    )
  }

  nexusHordeDirectorNativeBridgeClass.spawnWave(
    state.horde,
    state.player,
    amount,
    state.threatDay,
    true
  )
}

function nexusHordeDirectorAbort(
  state,
  reason
) {
  if (
    state.completing ||
    state.aborting ||
    !nexusHordeDirectorStates.has(
      state.playerId
    )
  ) {
    return
  }

  state.aborting = true
  state.phase = 'aborting'
  state.blockedReason = String(reason)

  console.error(
    `[Nexus Horde Director] Horda de ${state.playerId} cancelada sin victoria: ${state.blockedReason}`
  )

  try {
    // true mantiene la semantica de parada por comando: el calendario
    // reprograma y no concede victoria ni recompensas.
    state.horde.stopEvent(
      state.player,
      true
    )
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `abort:${state.playerId}:${String(error)}`,
      `Nexus Horde Director: no se pudo cancelar de forma segura la Horda de ${state.playerId}`,
      error
    )

    if (
      nexusHordeDirectorStates.has(
        state.playerId
      )
    ) {
      state.phase = 'blocked'
    }
  } finally {
    state.aborting = false
  }
}

function nexusHordeDirectorLaunchWave(state) {
  if (
    state.completing ||
    state.launchingWave ||
    state.currentWave >= NEXUS_HORDE_DIRECTOR_TOTAL_WAVES
  ) {
    return
  }

  state.currentWave += 1
  state.phase = 'wave'
  state.launchingWave = true
  state.waveHadMob = false
  state.waveClearCommitted = false
  state.zeroSince = -1
  state.nextWaveAt = -1

  state.settleAt =
    nexusHordeDirectorServerTick +
    NEXUS_HORDE_DIRECTOR_SPAWN_SETTLE_TICKS

  try {
    nexusHordeDirectorSpawnWaveNative(
      state,
      nexusHordeDirectorWaveAmount(state)
    )
    state.waveLaunchFailures = 0
  } catch (error) {
    state.currentWave -= 1
    state.waveLaunchFailures += 1

    if (
      state.waveLaunchFailures >=
      NEXUS_HORDE_DIRECTOR_MAX_LAUNCH_FAILURES
    ) {
      nexusHordeDirectorAbort(
        state,
        'fallo repetido al aplicar threatDay o lanzar una oleada'
      )
    } else {
      state.phase = 'transition'

      state.nextWaveAt =
        nexusHordeDirectorServerTick +
        NEXUS_HORDE_DIRECTOR_INTERMISSION_TICKS
    }

    nexusHordeDirectorLogErrorOnce(
      `spawn-wave:${state.playerId}:${state.waveLaunchFailures}:${String(error)}`,
      `Nexus Horde Director: fallo al lanzar la oleada para ${state.playerId}`,
      error
    )
  } finally {
    state.launchingWave = false
  }
}

function nexusHordeDirectorPrepareFinisherPresentation(
  state
) {
  try {
    var directorPresentationApi =
      nexusHordeDirectorPresentationApi()

    if (
      directorPresentationApi &&
      typeof directorPresentationApi.prepareFinisher ===
        'function'
    ) {
      directorPresentationApi.prepareFinisher(
        state.player
      )
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `presentation-finisher:${state.playerId}:${String(error)}`,
      'Nexus Horde Director: fallo al preparar la manifestacion final.',
      error
    )
  }
}

function nexusHordeDirectorPruneUnjoinedFinisher(
  state
) {
  var directorUnjoinedIds = []

  state.alive.forEach(
    (directorRecord, directorEntityId) => {
      if (!directorRecord.joined) {
        directorUnjoinedIds.push(
          directorEntityId
        )
      }
    }
  )

  directorUnjoinedIds.forEach(
    directorEntityId => {
      nexusHordeDirectorForgetEntity(
        state,
        directorEntityId,
        false
      )
    }
  )
}

function nexusHordeDirectorLaunchFinisher(state) {
  if (
    state.completing ||
    state.launchingFinisher ||
    state.finisherStarted
  ) {
    return
  }

  if (!state.finisherTable) {
    nexusHordeDirectorAbort(
      state,
      'contexto Nexus sin tabla de manifestacion final'
    )
    return
  }

  state.phase = 'finisher'
  state.launchingFinisher = true
  state.finisherStarted = true
  state.finisherAttempts += 1
  state.waveHadMob = false
  state.waveClearCommitted = false
  state.zeroSince = -1
  state.nextWaveAt = -1
  state.settleAt =
    nexusHordeDirectorServerTick +
    NEXUS_HORDE_DIRECTOR_SPAWN_SETTLE_TICKS

  try {
    if (!nexusHordeDirectorNativeBridgeClass) {
      throw new Error(
        'HordeNativeBridge no disponible para lanzar la manifestacion final.'
      )
    }

    nexusHordeDirectorPrepareFinisherPresentation(
      state
    )

    nexusHordeDirectorNativeBridgeClass.spawnFinisher(
      state.horde,
      state.player,
      state.finisherTable,
      state.threatDay,
      Boolean(state.useThreatOverride)
    )

    // HordeSpawnEntityEvent se publica antes de insertar la entidad en el
    // nivel. EntityJoinLevelEvent confirma de forma sincrona las inserciones
    // reales; cualquier candidato rechazado no puede bloquear la fase.
    nexusHordeDirectorPruneUnjoinedFinisher(
      state
    )
  } catch (error) {
    state.finisherStarted = false

    if (
      state.finisherAttempts >=
      NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS
    ) {
      nexusHordeDirectorAbort(
        state,
        'fallo repetido al lanzar la manifestacion final'
      )
    } else {
      state.phase = 'transition'
      state.nextWaveAt =
        nexusHordeDirectorServerTick +
        NEXUS_HORDE_DIRECTOR_FINISHER_RETRY_TICKS
    }

    nexusHordeDirectorLogErrorOnce(
      `spawn-finisher:${state.playerId}:${state.finisherAttempts}:${String(error)}`,
      `Nexus Horde Director: fallo al lanzar la manifestacion final para ${state.playerId}`,
      error
    )
  } finally {
    state.launchingFinisher = false
  }
}

function nexusHordeDirectorPresentWaveCleared(state) {
  try {
    var directorPresentationApi =
      nexusHordeDirectorPresentationApi()

    if (
      directorPresentationApi &&
      typeof directorPresentationApi.markWaveCleared === 'function'
    ) {
      directorPresentationApi.markWaveCleared(state.player)
      return
    }

    // Compatibilidad con una version anterior de presentation.js.
    if (
      typeof nexusHordePresentationMarkWaveCleared === 'function'
    ) {
      nexusHordePresentationMarkWaveCleared(state.player)
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `presentation-wave-clear:${state.playerId}:${String(error)}`,
      'Nexus Horde Director: fallo al notificar la superacion de una oleada',
      error
    )
  }
}

function nexusHordeDirectorPresentVictory(state) {
  try {
    var directorPresentationApi =
      nexusHordeDirectorPresentationApi()

    if (
      directorPresentationApi &&
      typeof directorPresentationApi.showVictory === 'function'
    ) {
      directorPresentationApi.showVictory(state.player)
      return
    }

    // Compatibilidad con una version anterior de presentation.js.
    if (
      typeof nexusHordePresentationShowVictory === 'function'
    ) {
      nexusHordePresentationShowVictory(state.player)
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `presentation-victory:${state.playerId}:${String(error)}`,
      `Nexus Horde Director: fallo al presentar la victoria de ${state.playerId}`,
      error
    )
  }
}

function nexusHordeDirectorComplete(state) {
  if (state.completing) return

  state.completing = true
  state.phase = 'completing'

  // La presentacion nunca debe bloquear la finalizacion funcional.
  if (!state.victoryPresented) {
    state.victoryPresented = true
    nexusHordeDirectorPresentVictory(state)
  }

  try {
    // false conserva la finalizacion funcional nativa y ejecuta
    // una sola vez HordeEndEvent, comandos y recompensas.
    state.horde.stopEvent(state.player, false)
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `complete:${state.playerId}:${String(error)}`,
      `Nexus Horde Director: fallo al completar la Horda de ${state.playerId}`,
      error
    )

    // Permite reintentar la finalizacion si HordeEndEvent no limpio
    // ya el estado de este jugador.
    if (nexusHordeDirectorStates.has(state.playerId)) {
      state.completing = false
      state.phase = state.finisherStarted
        ? 'finisher'
        : 'transition'
      state.zeroSince =
        nexusHordeDirectorServerTick
    }
  }
}

function nexusHordeDirectorRefreshTrackedState(state) {
  var directorExpiredIds = []
  var directorAbortReason = ''

  state.alive.forEach((directorRecord, directorEntityId) => {
    if (directorRecord.unloadedAt >= 0) {
      if (state.phase === 'finisher') {
        if (
          nexusHordeDirectorServerTick -
            directorRecord.unloadedAt >=
          NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS
        ) {
          directorAbortReason =
            `manifestacion ${directorEntityId} descargada durante ` +
            `${NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS} ticks`
        }

        return
      }

      if (
        nexusHordeDirectorServerTick -
          directorRecord.unloadedAt >=
        NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS
      ) {
        directorExpiredIds.push(directorEntityId)
      }

      return
    }

    try {
      if (!directorRecord.entity.isAlive()) {
        if (state.phase === 'finisher') {
          directorRecord.unloadedAt =
            nexusHordeDirectorServerTick
        } else {
          directorExpiredIds.push(directorEntityId)
        }
      }
    } catch (ignored) {
      directorRecord.unloadedAt =
        nexusHordeDirectorServerTick
    }
  })

  directorExpiredIds.forEach(directorEntityId => {
    var directorRecord =
      state.alive.get(directorEntityId)

    var directorWasUnloaded =
      directorRecord &&
      directorRecord.unloadedAt >= 0

    nexusHordeDirectorForgetEntity(
      state,
      directorEntityId,
      directorWasUnloaded
    )

    if (directorWasUnloaded) {
      console.warn(
        `[Nexus Horde Director] Entidad ${directorEntityId} liberada tras ` +
        `${NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS} ticks descargada.`
      )
    }
  })

  if (directorAbortReason) {
    nexusHordeDirectorAbort(
      state,
      directorAbortReason
    )
    return false
  }

  return true
}

function nexusHordeDirectorTickState(state) {
  if (
    state.completing ||
    state.phase === 'aborting' ||
    state.phase === 'blocked'
  ) return

  if (
    !nexusHordeDirectorEnsureTechnicalPlayer(
      state
    )
  ) {
    return
  }

  if (state.phase === 'preparing') {
    if (
      nexusHordeDirectorServerTick >=
      state.firstWaveAt
    ) {
      nexusHordeDirectorLaunchWave(state)
    }

    return
  }

  if (state.phase === 'transition') {
    if (
      nexusHordeDirectorServerTick <
      state.nextWaveAt
    ) {
      return
    }

    if (
      state.currentWave >=
      NEXUS_HORDE_DIRECTOR_TOTAL_WAVES
    ) {
      nexusHordeDirectorLaunchFinisher(state)
    } else {
      nexusHordeDirectorLaunchWave(state)
    }

    return
  }

  if (
    state.phase !== 'wave' &&
    state.phase !== 'finisher'
  ) {
    return
  }

  if (
    !nexusHordeDirectorRefreshTrackedState(
      state
    )
  ) {
    return
  }

  // Una oleada que no ha generado ninguna entidad no puede contarse
  // como superada. Esto evita avanzar silenciosamente por tablas vacias
  // o por un fallo de spawning que no lance excepcion.
  if (!state.waveHadMob) {
    state.zeroSince = -1

    if (
      nexusHordeDirectorServerTick >=
      state.settleAt +
        NEXUS_HORDE_DIRECTOR_EMPTY_WAVE_WARNING_TICKS
    ) {
      if (state.phase === 'finisher') {
        if (
          state.finisherAttempts <
          NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS
        ) {
          console.warn(
            `[Nexus Horde Director] Manifestacion final sin entidad para ${state.playerId}; ` +
            `reintento ${state.finisherAttempts + 1}/${NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS} en ` +
            `${NEXUS_HORDE_DIRECTOR_FINISHER_RETRY_TICKS} ticks.`
          )

          state.phase = 'transition'
          state.finisherStarted = false
          state.nextWaveAt =
            nexusHordeDirectorServerTick +
            NEXUS_HORDE_DIRECTOR_FINISHER_RETRY_TICKS
        } else {
          nexusHordeDirectorAbort(
            state,
            'la manifestacion final no genero ninguna entidad tras tres intentos'
          )
        }
      } else {
        nexusHordeDirectorLogErrorOnce(
          `empty-wave:${state.playerId}:${state.currentWave}`,
          `Nexus Horde Director: la oleada ${state.currentWave} de ${state.playerId} no ha generado ninguna entidad.`,
          null
        )
      }
    }

    return
  }

  if (
    nexusHordeDirectorServerTick <
      state.settleAt ||
    state.alive.size > 0
  ) {
    state.zeroSince = -1
    return
  }

  if (state.zeroSince < 0) {
    state.zeroSince =
      nexusHordeDirectorServerTick

    return
  }

  if (
    nexusHordeDirectorServerTick -
      state.zeroSince <
    NEXUS_HORDE_DIRECTOR_ZERO_CONFIRM_TICKS
  ) {
    return
  }

  if (state.phase === 'finisher') {
    nexusHordeDirectorComplete(state)
    return
  }

  if (!state.waveClearCommitted) {
    state.waveClearCommitted = true
    nexusHordeDirectorPresentWaveCleared(state)
  }

  state.phase = 'transition'

  state.nextWaveAt =
    nexusHordeDirectorServerTick +
    NEXUS_HORDE_DIRECTOR_INTERMISSION_TICKS
}

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeStartEvent',
  event => {
    var directorStartPlayer =
      event.getPlayer()

    var directorStartPlayerId =
      nexusHordeDirectorPlayerId(
        directorStartPlayer
      )

    var directorPreviousState =
      nexusHordeDirectorStates.get(
        directorStartPlayerId
      )

    if (directorPreviousState) {
      nexusHordeDirectorCleanupState(
        directorPreviousState
      )
    }

    nexusHordeDirectorStates.set(
      directorStartPlayerId,
      nexusHordeDirectorCreateState(
        directorStartPlayer,
        event.getHorde()
      )
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeSpawnEntityEvent',
  event => {
    var directorSpawnState =
      nexusHordeDirectorFindStateByHorde(
        event.getHorde()
      )

    if (
      !directorSpawnState ||
      (
        directorSpawnState.phase !== 'wave' &&
        directorSpawnState.phase !== 'finisher'
      )
    ) {
      return
    }

    var directorSpawnEntity =
      event.getEntity()

    var directorSpawnEntityId =
      nexusHordeDirectorEntityId(
        directorSpawnEntity
      )

    try {
      directorSpawnEntity.addTag(
        directorSpawnState.tag
      )
    } catch (error) {
      nexusHordeDirectorLogErrorOnce(
        `tag:${directorSpawnEntityId}:${String(error)}`,
        `Nexus Horde Director: no se pudo etiquetar ${directorSpawnEntityId}`,
        error
      )
    }

    try {
      if (nexusHordeDirectorTargetingClass) {
        nexusHordeDirectorTargetingClass.configure(
          directorSpawnEntity,
          directorSpawnState.participantCsv
        )
      }
    } catch (error) {
      nexusHordeDirectorLogErrorOnce(
        `targeting:${directorSpawnEntityId}:${String(error)}`,
        `Nexus Horde Director: no se pudo distribuir el tracking de ${directorSpawnEntityId}`,
        error
      )
    }

    directorSpawnState.alive.set(
      directorSpawnEntityId,
      {
        entity: directorSpawnEntity,
        unloadedAt: -1,
        joined:
          directorSpawnState.phase !==
          'finisher'
      }
    )

    nexusHordeDirectorEntityOwners.set(
      directorSpawnEntityId,
      directorSpawnState.playerId
    )

    if (
      directorSpawnState.phase !==
      'finisher'
    ) {
      directorSpawnState.waveHadMob = true
    }
    directorSpawnState.zeroSince = -1
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.living.LivingDeathEvent',
  event => {
    nexusHordeDirectorRemoveTrackedEntity(
      event.getEntity()
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.EntityLeaveLevelEvent',
  event => {
    var directorLeavingEntity =
      event.getEntity()

    var directorLeavingEntityId =
      nexusHordeDirectorEntityId(
        directorLeavingEntity
      )

    var directorOwnerId =
      nexusHordeDirectorEntityOwners.get(
        directorLeavingEntityId
      )

    if (!directorOwnerId) return

    var directorLeavingState =
      nexusHordeDirectorStates.get(
        directorOwnerId
      )

    if (!directorLeavingState) {
      nexusHordeDirectorEntityOwners.delete(
        directorLeavingEntityId
      )

      return
    }

    var directorLeavingRecord =
      directorLeavingState.alive.get(
        directorLeavingEntityId
      )

    if (!directorLeavingRecord) return

    try {
      if (!directorLeavingEntity.isAlive()) {
        if (
          directorLeavingState.phase ===
          'finisher'
        ) {
          directorLeavingRecord.unloadedAt =
            nexusHordeDirectorServerTick
        } else {
          nexusHordeDirectorForgetEntity(
            directorLeavingState,
            directorLeavingEntityId,
            false
          )
        }

        return
      }
    } catch (ignored) {
      // Si no puede consultarse, se trata como descarga
      // hasta que expire el fallback.
    }

    directorLeavingRecord.unloadedAt =
      nexusHordeDirectorServerTick
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.EntityJoinLevelEvent',
  event => {
    var directorJoiningEntity =
      event.getEntity()

    var directorJoiningEntityId =
      nexusHordeDirectorEntityId(
        directorJoiningEntity
      )

    var directorOwnerId =
      nexusHordeDirectorEntityOwners.get(
        directorJoiningEntityId
      )

    if (!directorOwnerId) return

    var directorJoiningState =
      nexusHordeDirectorStates.get(
        directorOwnerId
      )

    if (!directorJoiningState) {
      nexusHordeDirectorEntityOwners.delete(
        directorJoiningEntityId
      )

      return
    }

    var directorJoiningRecord =
      directorJoiningState.alive.get(
        directorJoiningEntityId
      )

    if (!directorJoiningRecord) return

    directorJoiningRecord.entity =
      directorJoiningEntity

    directorJoiningRecord.joined = true
    directorJoiningRecord.unloadedAt = -1
    directorJoiningState.waveHadMob = true
    directorJoiningState.zeroSince = -1
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeEndEvent',
  event => {
    var directorEndState =
      nexusHordeDirectorFindStateByHorde(
        event.getHorde()
      )

    if (directorEndState) {
      nexusHordeDirectorCleanupState(
        directorEndState
      )
    }
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedOutEvent',
  event => {
    var directorLogoutId =
      nexusHordeDirectorPlayerId(
        event.getEntity()
      )

    nexusHordeDirectorStates.forEach(
      directorLogoutState => {
        if (
          nexusHordeDirectorPlayerId(
            directorLogoutState.player
          ) === directorLogoutId
        ) {
          directorLogoutState.paused = true
        }
      }
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent',
  event => {
    var directorLoginPlayer =
      event.getEntity()

    var directorLoginId =
      nexusHordeDirectorPlayerId(
        directorLoginPlayer
      )

    nexusHordeDirectorStates.forEach(
      directorLoginState => {
        if (
          directorLoginState.participantIds.includes(
            directorLoginId
          )
        ) {
          nexusHordeDirectorEnsureTechnicalPlayer(
            directorLoginState
          )
        }
      }
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.server.ServerStoppingEvent',
  event => {
    var directorStoppingStates = []

    nexusHordeDirectorStates.forEach(
      directorState => {
        directorStoppingStates.push(
          directorState
        )
      }
    )

    directorStoppingStates.forEach(
      directorState => {
        nexusHordeDirectorCleanupState(
          directorState
        )
      }
    )

    nexusHordeDirectorStates.clear()
    nexusHordeDirectorEntityOwners.clear()
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.TickEvent$ServerTickEvent',
  event => {
    if (String(event.phase) !== 'END') return

    nexusHordeDirectorServerTick += 1

    if (
      nexusHordeDirectorServerTick %
        NEXUS_HORDE_DIRECTOR_UPDATE_INTERVAL !==
      0
    ) {
      return
    }

    nexusHordeDirectorStates.forEach(
      directorState => {
        try {
          nexusHordeDirectorTickState(
            directorState
          )
        } catch (error) {
          nexusHordeDirectorLogErrorOnce(
            `tick:${directorState.playerId}:${String(error)}`,
            `Nexus Horde Director: fallo al actualizar ${directorState.playerId}`,
            error
          )
        }
      }
    )
  }
)

if (typeof global !== 'undefined') {
  global.NexusHordeDirector = {
    cancelForPlayer:
      nexusHordeDirectorCancelForPlayer
  }
}
