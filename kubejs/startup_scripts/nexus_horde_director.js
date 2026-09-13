// Nexus owns progression; The Hordes remains the native spawning/pathfinding engine.
const NEXUS_HORDE_DIRECTOR_TOTAL_WAVES = 4
const NEXUS_HORDE_DIRECTOR_PREPARATION_TICKS = 200
const NEXUS_HORDE_DIRECTOR_INTERMISSION_TICKS = 60
const NEXUS_HORDE_DIRECTOR_UPDATE_INTERVAL = 5
const NEXUS_HORDE_DIRECTOR_TARGET_RECONCILE_TICKS = 20
const NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS = 2400
const NEXUS_HORDE_DIRECTOR_ABANDON_TICKS = 6000
const NEXUS_HORDE_DIRECTOR_JOIN_GRACE_TICKS = 5
const NEXUS_HORDE_DIRECTOR_REMOVAL_GRACE_TICKS = 10
const NEXUS_HORDE_DIRECTOR_MAX_RECOVERY_ATTEMPTS = 12
const NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS = 3
const NEXUS_HORDE_DIRECTOR_RECOVERY_RETRY_TICKS = 100
const NEXUS_HORDE_DIRECTOR_BATTLE_RADIUS_SQR = 16384

const nexusHordeDirectorStates = new Map()
const nexusHordeDirectorEntityOwners = new Map()
const nexusHordeDirectorLoggedErrors = new Set()
let nexusHordeDirectorServerTick = 0
var nexusHordeDirectorTargetingClass = null
var nexusHordeDirectorNativeBridgeClass = null
var nexusHordeDirectorBlockPosClass = null

function nexusHordeDirectorLogErrorOnce(key, message, error) {
  if (nexusHordeDirectorLoggedErrors.has(key)) return
  nexusHordeDirectorLoggedErrors.add(key)
  console.error(message)
  if (error) console.error(error)
}

try {
  nexusHordeDirectorTargetingClass = Java.loadClass(
    'dev.itscarlos.nexuscore.horde.HordeTargeting'
  )
  nexusHordeDirectorNativeBridgeClass = Java.loadClass(
    'dev.itscarlos.nexuscore.horde.HordeNativeBridge'
  )
  nexusHordeDirectorBlockPosClass = Java.loadClass(
    'net.minecraft.core.BlockPos'
  )
  if (!nexusHordeDirectorNativeBridgeClass.isAvailable()) {
    throw new Error(String(nexusHordeDirectorNativeBridgeClass.getInitializationError()))
  }
} catch (error) {
  nexusHordeDirectorTargetingClass = null
  nexusHordeDirectorNativeBridgeClass = null
  nexusHordeDirectorLogErrorOnce(
    `bootstrap:${String(error)}`,
    'Nexus Horde Director: helpers de Nexus Core no disponibles.',
    error
  )
}

function nexusHordeDirectorPlayerId(player) {
  return String(player.uuid)
}

function nexusHordeDirectorEntityId(entity) {
  return String(entity.uuid)
}

function nexusHordeDirectorDimensionId(level) {
  if (!level) return ''
  var value = ''
  try {
    var dimension = typeof level.dimension === 'function'
      ? level.dimension()
      : level.dimension
    if (dimension && typeof dimension.location === 'function') {
      return String(dimension.location())
    }
    value = String(dimension)
  } catch (ignored) {
    try { value = String(level.dimension) } catch (ignoredAgain) { return '' }
  }
  var separator = value.lastIndexOf(' / ')
  if (separator < 0) return value
  var parsed = value.substring(separator + 3)
  return parsed.endsWith(']') ? parsed.substring(0, parsed.length - 1) : parsed
}

function nexusHordeDirectorSameHorde(left, right) {
  if (left === right) return true
  if (!left || !right) return false
  try { return Boolean(left.equals(right)) } catch (ignored) { return false }
}

function nexusHordeDirectorCalendar() {
  return typeof global !== 'undefined' ? global.NexusEraCalendar || null : null
}

function nexusHordeDirectorPresentation() {
  return typeof global !== 'undefined' ? global.NexusHordePresentation || null : null
}

function nexusHordeDirectorContextFor(event) {
  var player = event.getPlayer()
  var calendar = nexusHordeDirectorCalendar()
  if (!calendar || typeof calendar.getHordeContext !== 'function'
      || typeof calendar.ownsHorde !== 'function') return null
  // Make correlation independent of Forge listener registration order.
  if (typeof calendar.onHordeStart === 'function') calendar.onHordeStart(event)
  var context = calendar.getHordeContext(player.getServer())
  if (!context || !calendar.ownsHorde(event.getHorde(), player)) return null
  if (String(context.anchorId) !== nexusHordeDirectorPlayerId(player)) return null
  if (!context.sessionId || !context.battleCenter) return null
  return context
}

function nexusHordeDirectorFindStateByHorde(horde) {
  var found = null
  nexusHordeDirectorStates.forEach(state => {
    if (!found && nexusHordeDirectorSameHorde(state.horde, horde)) found = state
  })
  return found
}

function nexusHordeDirectorFindOwner(server, ownerId) {
  var result = null
  server.players.forEach(player => {
    if (nexusHordeDirectorPlayerId(player) === ownerId) result = player
  })
  return result
}

function nexusHordeDirectorValidParticipants(state) {
  var valid = []
  state.server.players.forEach(player => {
    if (!state.participantIds.includes(nexusHordeDirectorPlayerId(player))) return
    try {
      if (!player.isAlive() || player.isCreative() || player.isSpectator()) return
      if (nexusHordeDirectorTargetingClass
          && nexusHordeDirectorTargetingClass.isPlayerReviveDowned(player)) return
      if (nexusHordeDirectorDimensionId(player.level) !== state.battleCenter.dimensionId) return
      var dx = Number(player.getX()) - state.battleCenter.x
      var dy = Number(player.getY()) - state.battleCenter.y
      var dz = Number(player.getZ()) - state.battleCenter.z
      if (dx * dx + dy * dy + dz * dz > NEXUS_HORDE_DIRECTOR_BATTLE_RADIUS_SQR) return
      valid.push(player)
    } catch (ignored) {
      // Concurrent logout is simply not a valid participant this pass.
    }
  })
  return valid
}

function nexusHordeDirectorRemaining(state) {
  return Math.max(0, state.requiredKills - state.confirmedKills)
}

function nexusHordeDirectorSnapshot(state) {
  return {
    sessionId: state.sessionId,
    nativeOwnerId: state.nativeOwnerId,
    participantIds: state.participantIds.slice(),
    phase: state.phase,
    currentWave: state.currentWave,
    totalWaves: NEXUS_HORDE_DIRECTOR_TOTAL_WAVES,
    requiredKills: state.requiredKills,
    confirmedKills: state.confirmedKills,
    remaining: nexusHordeDirectorRemaining(state),
    activeLoaded: nexusHordeDirectorCountRecords(state, 'loaded'),
    activeUnloaded: nexusHordeDirectorCountRecords(state, 'unloaded'),
    pendingSpawns: nexusHordeDirectorCountRecords(state, 'pending'),
    replacementsPending: state.replacementsPending,
    paused: state.paused,
    pauseReason: state.pauseReason,
    battleCenter: state.battleCenter,
    threatDay: state.threatDay,
    threatTier: state.threatTier
  }
}

function nexusHordeDirectorPublish(state, moment) {
  var presentation = nexusHordeDirectorPresentation()
  if (!presentation) return
  try {
    if (moment === 'start' && typeof presentation.start === 'function') {
      presentation.start(state.nativeOwner, state.horde, state.context, nexusHordeDirectorSnapshot(state))
    } else if (typeof presentation.update === 'function') {
      presentation.update(state.nativeOwnerId, nexusHordeDirectorSnapshot(state), moment)
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `presentation:${state.sessionId}:${moment}:${String(error)}`,
      `[Nexus Horde Director] session=${state.shortSession} presentation failure moment=${moment}.`,
      error
    )
  }
}

function nexusHordeDirectorCountRecords(state, kind) {
  var count = 0
  state.records.forEach(record => {
    if (kind === 'pending' && !record.joined) count += 1
    if (kind === 'loaded' && record.joined && record.unloadedAt < 0 && record.removalAt < 0) count += 1
    if (kind === 'unloaded' && record.joined && record.unloadedAt >= 0) count += 1
  })
  return count
}

function nexusHordeDirectorEntityType(entity) {
  try {
    return nexusHordeDirectorTargetingClass
      ? String(nexusHordeDirectorTargetingClass.entityTypeId(entity))
      : 'unknown'
  } catch (ignored) { return 'unknown' }
}

function nexusHordeDirectorDamageDetails(source) {
  try {
    return nexusHordeDirectorTargetingClass
      ? String(nexusHordeDirectorTargetingClass.damageDetails(source))
      : 'damage=unknown'
  } catch (ignored) { return 'damage=unknown' }
}

function nexusHordeDirectorLifecycle(state, record, eventName, details) {
  if (!state) return
  console.info(
    `[Nexus Horde Lifecycle] session=${state.shortSession} event=${eventName} ` +
    `phase=${record ? record.phase : state.phase} wave=${record ? record.wave : state.currentWave} ` +
    `type=${record ? record.entityType : '-'} uuid=${record ? record.entityId : '-'} ` +
    `kills=${state.confirmedKills}/${state.requiredKills}` + (details ? ` ${details}` : '')
  )
}

function nexusHordeDirectorCreateState(player, horde, context) {
  var amounts = context.waveAmounts.map(amount =>
    Math.max(1, Math.min(24, Math.floor(Number(amount) || 1)))
  )
  var center = context.battleCenter
  var state = {
    context: context,
    sessionId: String(context.sessionId),
    shortSession: String(context.sessionId).slice(0, 12),
    nativeOwner: player,
    nativeOwnerId: nexusHordeDirectorPlayerId(player),
    server: player.getServer(),
    horde: horde,
    participantIds: context.participantIds.slice(),
    participantCsv: context.participantIds.join(','),
    battleCenter: {
      dimensionId: String(center.dimensionId),
      x: Number(center.x), y: Number(center.y), z: Number(center.z)
    },
    waveAmounts: amounts,
    threatDay: Math.max(0, Math.min(2147483647, Math.floor(Number(context.threatDay) || 0))),
    threatTier: Number(context.threatTier) || 1,
    finisherTable: String(context.finisherTable || ''),
    tag: `nexus_horde_${String(context.sessionId).replace(/[^a-zA-Z0-9_]/g, '')}`,
    phase: 'preparing',
    currentWave: 0,
    requiredKills: 0,
    confirmedKills: 0,
    creditedDeaths: new Set(),
    records: new Map(),
    assignmentCounter: 0,
    replacementsPending: 0,
    recoveryAttempts: 0,
    nextRecoveryAt: -1,
    firstWaveAt: nexusHordeDirectorServerTick + NEXUS_HORDE_DIRECTOR_PREPARATION_TICKS,
    nextPhaseAt: -1,
    paused: false,
    pauseSince: -1,
    pauseReason: '',
    launching: false,
    completing: false,
    aborting: false
  }
  nexusHordeDirectorTargetingClass.registerSession(state.sessionId)
  return state
}

function nexusHordeDirectorForgetRecord(state, record, cleanupNative) {
  if (!record || !state.records.has(record.entityId)) return
  state.records.delete(record.entityId)
  nexusHordeDirectorEntityOwners.delete(record.entityId)
  try { record.entity.removeTag(state.tag) } catch (ignored) {}
  try {
    if (cleanupNative && nexusHordeDirectorNativeBridgeClass) {
      nexusHordeDirectorNativeBridgeClass.cleanupNativeMob(record.entity, state.sessionId)
    }
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `native-clean:${record.entityId}:${String(error)}`,
      `[Nexus Horde Director] session=${state.shortSession} native cleanup failed ${record.entityId}.`, error
    )
  }
  try { nexusHordeDirectorTargetingClass.clear(record.entity) } catch (ignored) {}
  try { state.horde.removeEntity(record.entity) } catch (ignored) {}
}

function nexusHordeDirectorCleanupState(state, reason) {
  if (!state || !nexusHordeDirectorStates.has(state.nativeOwnerId)) return
  var records = []
  state.records.forEach(record => records.push(record))
  records.forEach(record => {
    nexusHordeDirectorLifecycle(state, record, 'tracking_cleanup', `reason=${reason}`)
    nexusHordeDirectorForgetRecord(state, record, true)
  })
  try {
    if (nexusHordeDirectorTargetingClass) {
      nexusHordeDirectorTargetingClass.unregisterSession(state.sessionId)
    }
  } catch (ignored) {}
  nexusHordeDirectorStates.delete(state.nativeOwnerId)
  var presentation = nexusHordeDirectorPresentation()
  try {
    if (presentation && typeof presentation.finish === 'function') {
      presentation.finish(state.nativeOwnerId, reason)
    }
  } catch (ignored) {}
}

function nexusHordeDirectorCancelForPlayer(player) {
  if (!player) return false
  var state = nexusHordeDirectorStates.get(nexusHordeDirectorPlayerId(player))
  if (!state) return false
  nexusHordeDirectorCleanupState(state, 'calendar_cleanup')
  return true
}

function nexusHordeDirectorOwnerForNativeOperation(state) {
  var owner = nexusHordeDirectorFindOwner(state.server, state.nativeOwnerId)
  if (owner) state.nativeOwner = owner
  return owner
}

function nexusHordeDirectorSpawnNative(state, count, finisher) {
  var owner = nexusHordeDirectorOwnerForNativeOperation(state)
  if (!owner) return false
  state.launching = true
  try {
    if (finisher) {
      nexusHordeDirectorNativeBridgeClass.spawnFinisher(
        state.horde, owner, state.finisherTable, state.threatDay, true
      )
    } else {
      nexusHordeDirectorNativeBridgeClass.spawnWave(
        state.horde, owner, count, state.threatDay, true
      )
    }
  } finally {
    state.launching = false
  }
  nexusHordeDirectorFinalizeUnjoined(state)
  return true
}

function nexusHordeDirectorFinalizeUnjoined(state) {
  var stale = []
  state.records.forEach(record => {
    if (!record.joined
        && nexusHordeDirectorServerTick - record.requestedAt >= 0) stale.push(record)
  })
  stale.forEach(record => {
    nexusHordeDirectorLifecycle(state, record, 'spawn_not_added', 'reason=not_added_to_level')
    nexusHordeDirectorForgetRecord(state, record, false)
  })
  nexusHordeDirectorRecalculateReplacementNeed(state)
}

function nexusHordeDirectorRecalculateReplacementNeed(state) {
  if (state.phase !== 'wave' && state.phase !== 'finisher') return
  var slotsRepresented = state.confirmedKills
    + nexusHordeDirectorCountRecords(state, 'loaded')
    + nexusHordeDirectorCountRecords(state, 'unloaded')
    + nexusHordeDirectorCountRecords(state, 'pending')
  state.replacementsPending = Math.max(0, state.requiredKills - slotsRepresented)
}

function nexusHordeDirectorStartWave(state) {
  if (state.launching || state.currentWave >= NEXUS_HORDE_DIRECTOR_TOTAL_WAVES) return
  state.currentWave += 1
  state.phase = 'wave'
  state.requiredKills = state.waveAmounts[state.currentWave - 1]
  state.confirmedKills = 0
  state.creditedDeaths.clear()
  state.recoveryAttempts = 0
  state.replacementsPending = state.requiredKills
  state.nextRecoveryAt = nexusHordeDirectorServerTick
  nexusHordeDirectorPublish(state, 'wave_start')
  nexusHordeDirectorRecoverMissing(state, true)
}

function nexusHordeDirectorStartFinisher(state) {
  state.phase = 'finisher'
  state.requiredKills = 1
  state.confirmedKills = 0
  state.creditedDeaths.clear()
  state.recoveryAttempts = 0
  state.replacementsPending = 1
  state.nextRecoveryAt = nexusHordeDirectorServerTick
  nexusHordeDirectorPublish(state, 'finisher_start')
  nexusHordeDirectorRecoverMissing(state, true)
}

function nexusHordeDirectorRecoverMissing(state, initial) {
  nexusHordeDirectorRecalculateReplacementNeed(state)
  if (state.replacementsPending <= 0) return
  if (nexusHordeDirectorServerTick < state.nextRecoveryAt) return
  var maxAttempts = state.phase === 'finisher'
    ? NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS
    : NEXUS_HORDE_DIRECTOR_MAX_RECOVERY_ATTEMPTS
  if (state.recoveryAttempts >= maxAttempts) {
    nexusHordeDirectorAbort(state, 'replacement_attempts_exhausted')
    return
  }
  var owner = nexusHordeDirectorOwnerForNativeOperation(state)
  if (!owner) {
    nexusHordeDirectorSetPaused(state, 'native_owner_offline')
    return
  }
  var requestCount = state.phase === 'finisher' ? 1 : state.replacementsPending
  state.recoveryAttempts += 1
  nexusHordeDirectorLifecycle(
    state, null, initial ? 'spawn_requested' : 'replacement_requested',
    `count=${requestCount} attempt=${state.recoveryAttempts}/${maxAttempts}`
  )
  try {
    nexusHordeDirectorSpawnNative(state, requestCount, state.phase === 'finisher')
  } catch (error) {
    nexusHordeDirectorLogErrorOnce(
      `spawn:${state.sessionId}:${state.phase}:${state.recoveryAttempts}:${String(error)}`,
      `[Nexus Horde Director] session=${state.shortSession} native spawn failure.`, error
    )
  }
  nexusHordeDirectorRecalculateReplacementNeed(state)
  if (state.replacementsPending > 0) {
    nexusHordeDirectorLifecycle(
      state, null, 'replacement_failed', `missing=${state.replacementsPending}`
    )
    state.nextRecoveryAt = nexusHordeDirectorServerTick + NEXUS_HORDE_DIRECTOR_RECOVERY_RETRY_TICKS
  }
}

function nexusHordeDirectorSetPaused(state, reason) {
  if (!state.paused) {
    state.paused = true
    state.pauseSince = nexusHordeDirectorServerTick
    state.pauseReason = reason
    nexusHordeDirectorLifecycle(state, null, 'pause', `reason=${reason}`)
    nexusHordeDirectorPublish(state, 'pause')
  } else if (state.pauseReason !== reason) {
    state.pauseReason = reason
    nexusHordeDirectorPublish(state, 'pause')
  }
}

function nexusHordeDirectorResume(state) {
  if (!state.paused) return
  var duration = nexusHordeDirectorServerTick - state.pauseSince
  state.paused = false
  state.pauseSince = -1
  state.pauseReason = ''
  nexusHordeDirectorLifecycle(state, null, 'resume', `pausedTicks=${duration}`)
  nexusHordeDirectorPublish(state, 'resume')
}

function nexusHordeDirectorAbort(state, reason) {
  if (state.aborting || state.completing || !nexusHordeDirectorStates.has(state.nativeOwnerId)) return
  state.aborting = true
  state.phase = 'aborting'
  nexusHordeDirectorLifecycle(state, null, 'abort', `reason=${reason}`)
  var owner = nexusHordeDirectorOwnerForNativeOperation(state)
  if (owner) {
    try {
      state.horde.stopEvent(owner, true)
      var stoppedCalendar = nexusHordeDirectorCalendar()
      if (stoppedCalendar && typeof stoppedCalendar.abortSession === 'function') {
        stoppedCalendar.abortSession(state.server, state.sessionId, state.nativeOwnerId, reason)
      }
      if (nexusHordeDirectorStates.has(state.nativeOwnerId)) {
        nexusHordeDirectorCleanupState(state, 'abort')
      }
      return
    } catch (error) {
      nexusHordeDirectorLogErrorOnce(
        `abort:${state.sessionId}:${String(error)}`,
        `[Nexus Horde Director] session=${state.shortSession} native abort failed.`, error
      )
    }
  }
  var calendar = nexusHordeDirectorCalendar()
  try {
    if (calendar && typeof calendar.abortSession === 'function') {
      calendar.abortSession(state.server, state.sessionId, state.nativeOwnerId, reason)
    }
  } finally {
    nexusHordeDirectorCleanupState(state, 'abort_without_owner')
  }
}

function nexusHordeDirectorComplete(state) {
  if (state.completing || state.confirmedKills < state.requiredKills) return
  var owner = nexusHordeDirectorOwnerForNativeOperation(state)
  if (!owner) {
    nexusHordeDirectorSetPaused(state, 'native_owner_offline_for_completion')
    return
  }
  state.completing = true
  state.phase = 'completing'
  try {
    var calendar = nexusHordeDirectorCalendar()
    if (!calendar || typeof calendar.authorizeCompletion !== 'function'
        || !calendar.authorizeCompletion(state.horde, owner, state.sessionId)) {
      throw new Error('calendar_completion_not_authorized')
    }
    nexusHordeDirectorPublish(state, 'victory')
    state.horde.stopEvent(owner, false)
    if (nexusHordeDirectorStates.has(state.nativeOwnerId)) {
      if (typeof calendar.isHordeActive === 'function'
          && !calendar.isHordeActive(state.server)) {
        nexusHordeDirectorCleanupState(state, 'complete')
      } else {
        throw new Error('native_completion_did_not_close_session')
      }
    }
  } catch (error) {
    var failedCalendar = null
    try {
      failedCalendar = nexusHordeDirectorCalendar()
      if (failedCalendar && typeof failedCalendar.revokeCompletion === 'function') {
        failedCalendar.revokeCompletion(state.sessionId)
      }
    } catch (ignored) {}
    // stopEvent can complete its command/end callbacks and only then throw.
    // If Calendar already consumed this exact session, do not reopen the finisher.
    try {
      if (failedCalendar && typeof failedCalendar.isHordeActive === 'function'
          && !failedCalendar.isHordeActive(state.server)) {
        nexusHordeDirectorCleanupState(state, 'complete')
        return
      }
    } catch (ignored) {}
    state.completing = false
    state.phase = 'finisher'
    nexusHordeDirectorPublish(state, 'completion_failed')
    nexusHordeDirectorLogErrorOnce(
      `complete:${state.sessionId}:${String(error)}`,
      `[Nexus Horde Director] session=${state.shortSession} completion failed.`, error
    )
  }
}

function nexusHordeDirectorHandleConfirmedDeath(entity, source) {
  var entityId = nexusHordeDirectorEntityId(entity)
  var ownerId = nexusHordeDirectorEntityOwners.get(entityId)
  if (!ownerId) return
  var state = nexusHordeDirectorStates.get(ownerId)
  var record = state ? state.records.get(entityId) : null
  if (!state || !record || !record.joined || state.creditedDeaths.has(entityId)) return
  if (record.phase !== state.phase || record.wave !== state.currentWave) return
  if (state.paused || nexusHordeDirectorValidParticipants(state).length === 0) {
    nexusHordeDirectorLifecycle(
      state, record, 'death_without_credit',
      `reason=no_valid_participants ${nexusHordeDirectorDamageDetails(source)}`
    )
    nexusHordeDirectorForgetRecord(state, record, true)
    nexusHordeDirectorRecalculateReplacementNeed(state)
    nexusHordeDirectorPublish(state, 'anomaly')
    return
  }
  state.creditedDeaths.add(entityId)
  state.confirmedKills = Math.min(state.requiredKills, state.confirmedKills + 1)
  nexusHordeDirectorLifecycle(state, record, 'death', nexusHordeDirectorDamageDetails(source))
  nexusHordeDirectorForgetRecord(state, record, false)
  nexusHordeDirectorRecalculateReplacementNeed(state)
  nexusHordeDirectorPublish(state, 'death')
  if (state.confirmedKills < state.requiredKills) return
  if (state.phase === 'finisher') {
    nexusHordeDirectorComplete(state)
  } else {
    nexusHordeDirectorPublish(state, 'wave_clear')
    state.phase = 'transition'
    state.nextPhaseAt = nexusHordeDirectorServerTick + NEXUS_HORDE_DIRECTOR_INTERMISSION_TICKS
  }
}

function nexusHordeDirectorUnexpectedRemoval(state, record, reason) {
  if (!state.records.has(record.entityId)) return
  nexusHordeDirectorLifecycle(state, record, 'removed_non_kill', `removal=${reason}`)
  nexusHordeDirectorForgetRecord(state, record, true)
  nexusHordeDirectorRecalculateReplacementNeed(state)
  state.nextRecoveryAt = Math.min(
    state.nextRecoveryAt < 0 ? nexusHordeDirectorServerTick : state.nextRecoveryAt,
    nexusHordeDirectorServerTick + NEXUS_HORDE_DIRECTOR_RECOVERY_RETRY_TICKS
  )
  nexusHordeDirectorPublish(state, 'anomaly')
}

function nexusHordeDirectorRefreshRecords(state) {
  var expired = []
  state.records.forEach(record => {
    if (record.removalAt >= 0
        && nexusHordeDirectorServerTick >= record.removalAt + NEXUS_HORDE_DIRECTOR_REMOVAL_GRACE_TICKS) {
      expired.push({ record: record, reason: record.removalReason })
    } else if (record.unloadedAt >= 0
        && nexusHordeDirectorServerTick >= record.unloadedAt + NEXUS_HORDE_DIRECTOR_UNLOADED_TIMEOUT_TICKS) {
      expired.push({ record: record, reason: 'unloaded_timeout' })
    } else if (!record.joined
        && nexusHordeDirectorServerTick >= record.requestedAt + NEXUS_HORDE_DIRECTOR_JOIN_GRACE_TICKS) {
      expired.push({ record: record, reason: 'join_timeout' })
    }
  })
  expired.forEach(entry => nexusHordeDirectorUnexpectedRemoval(state, entry.record, entry.reason))
}

function nexusHordeDirectorMaintainMobs(state) {
  var visible = nexusHordeDirectorRemaining(state) >= 1
    && nexusHordeDirectorRemaining(state) <= 3
  state.records.forEach(record => {
    if (!record.joined || record.unloadedAt >= 0 || record.removalAt >= 0) return
    try {
      nexusHordeDirectorTargetingClass.reconcileTarget(record.entity)
      nexusHordeDirectorTargetingClass.setLocatorGlowing(record.entity, visible)
    } catch (ignored) {}
  })
}

function nexusHordeDirectorTickState(state) {
  if (!nexusHordeDirectorStates.has(state.nativeOwnerId) || state.aborting) return
  if (state.phase === 'completing') return
  var validParticipants = nexusHordeDirectorValidParticipants(state)
  if (validParticipants.length === 0) {
    nexusHordeDirectorSetPaused(state, 'no_valid_participants')
  } else if (state.paused) {
    if (!state.pauseReason.startsWith('native_owner_')
        || nexusHordeDirectorOwnerForNativeOperation(state)) {
      nexusHordeDirectorResume(state)
    }
  }
  if (state.paused) {
    if (nexusHordeDirectorServerTick - state.pauseSince >= NEXUS_HORDE_DIRECTOR_ABANDON_TICKS) {
      nexusHordeDirectorAbort(state, `abandoned_${state.pauseReason}`)
    }
    return
  }
  if (nexusHordeDirectorServerTick % NEXUS_HORDE_DIRECTOR_TARGET_RECONCILE_TICKS === 0) {
    nexusHordeDirectorMaintainMobs(state)
  }
  if (state.phase === 'preparing') {
    if (nexusHordeDirectorServerTick >= state.firstWaveAt) nexusHordeDirectorStartWave(state)
    return
  }
  if (state.phase === 'transition') {
    if (nexusHordeDirectorServerTick < state.nextPhaseAt) return
    if (!nexusHordeDirectorOwnerForNativeOperation(state)) {
      nexusHordeDirectorSetPaused(state, 'native_owner_offline_for_spawn')
      return
    }
    if (state.currentWave >= NEXUS_HORDE_DIRECTOR_TOTAL_WAVES) nexusHordeDirectorStartFinisher(state)
    else nexusHordeDirectorStartWave(state)
    return
  }
  if (state.phase !== 'wave' && state.phase !== 'finisher') return
  nexusHordeDirectorRefreshRecords(state)
  if (!nexusHordeDirectorStates.has(state.nativeOwnerId)) return
  if (state.confirmedKills >= state.requiredKills) {
    if (state.phase === 'finisher') nexusHordeDirectorComplete(state)
    return
  }
  nexusHordeDirectorRecoverMissing(state, false)
}

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeStartEvent', event => {
  var context = nexusHordeDirectorContextFor(event)
  if (!context) return // A manual native Horde is not a Nexus incursion.
  var player = event.getPlayer()
  var playerId = nexusHordeDirectorPlayerId(player)
  if (!nexusHordeDirectorTargetingClass || !nexusHordeDirectorNativeBridgeClass) {
    var calendar = nexusHordeDirectorCalendar()
    if (calendar && typeof calendar.abortSession === 'function') {
      calendar.abortSession(player.getServer(), context.sessionId, playerId, 'director_helpers_unavailable')
    }
    try { event.getHorde().stopEvent(player, true) } catch (error) {
      nexusHordeDirectorLogErrorOnce(
        `bootstrap-abort:${context.sessionId}:${String(error)}`,
        `[Nexus Horde Director] session=${String(context.sessionId).slice(0, 12)} native bootstrap abort failed.`,
        error
      )
    }
    return
  }
  var previous = nexusHordeDirectorStates.get(playerId)
  if (previous
      && previous.sessionId === String(context.sessionId)
      && nexusHordeDirectorSameHorde(previous.horde, event.getHorde())) return
  if (previous) nexusHordeDirectorCleanupState(previous, 'replaced_session')
  try {
    var state = nexusHordeDirectorCreateState(player, event.getHorde(), context)
    nexusHordeDirectorStates.set(playerId, state)
    nexusHordeDirectorPublish(state, 'start')
  } catch (error) {
    var failedCalendar = nexusHordeDirectorCalendar()
    if (failedCalendar && typeof failedCalendar.abortSession === 'function') {
      failedCalendar.abortSession(player.getServer(), context.sessionId, playerId, 'director_state_init_failed')
    }
    try { event.getHorde().stopEvent(player, true) } catch (ignored) {}
    nexusHordeDirectorLogErrorOnce(
      `state-init:${context.sessionId}:${String(error)}`,
      `[Nexus Horde Director] session=${String(context.sessionId).slice(0, 12)} state initialization failed.`,
      error
    )
  }
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeFindSpawnPosEvent', event => {
  var state = nexusHordeDirectorFindStateByHorde(event.getHorde())
  if (!state || !nexusHordeDirectorBlockPosClass) return
  event.setPos(nexusHordeDirectorBlockPosClass.containing(
    state.battleCenter.x, state.battleCenter.y, state.battleCenter.z
  ))
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeSpawnEntityEvent', event => {
  var state = nexusHordeDirectorFindStateByHorde(event.getHorde())
  if (!state || (state.phase !== 'wave' && state.phase !== 'finisher')) return
  var entity = event.getEntity()
  var entityId = nexusHordeDirectorEntityId(entity)
  var record = {
    entity: entity, entityId: entityId, entityType: nexusHordeDirectorEntityType(entity),
    phase: state.phase, wave: state.currentWave, requestedAt: nexusHordeDirectorServerTick,
    joined: false, unloadedAt: -1, removalAt: -1, removalReason: 'none'
  }
  state.records.set(entityId, record)
  nexusHordeDirectorEntityOwners.set(entityId, state.nativeOwnerId)
  try { entity.addTag(state.tag) } catch (ignored) {}
  nexusHordeDirectorTargetingClass.configure(
    entity, state.sessionId, state.participantCsv, state.battleCenter.dimensionId,
    state.battleCenter.x, state.battleCenter.y, state.battleCenter.z,
    NEXUS_HORDE_DIRECTOR_BATTLE_RADIUS_SQR, state.assignmentCounter++
  )
  nexusHordeDirectorLifecycle(state, record, 'spawn_requested', '')
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityJoinLevelEvent', event => {
  var entity = event.getEntity()
  var entityId = nexusHordeDirectorEntityId(entity)
  var ownerId = nexusHordeDirectorEntityOwners.get(entityId)
  if (ownerId) {
    var state = nexusHordeDirectorStates.get(ownerId)
    var record = state ? state.records.get(entityId) : null
    if (state && record) {
      record.entity = entity
      var rejoin = record.joined
      record.joined = true
      record.unloadedAt = -1
      record.removalAt = -1
      nexusHordeDirectorLifecycle(state, record, rejoin ? 'level_rejoined' : 'level_added', '')
      nexusHordeDirectorRecalculateReplacementNeed(state)
      nexusHordeDirectorPublish(state, rejoin ? 'rejoin' : 'spawn_added')
      return
    }
    nexusHordeDirectorEntityOwners.delete(entityId)
  }
  // An entity from an already replaced slot may rejoin while the session is active.
  nexusHordeDirectorStates.forEach(state => {
    try {
      var data = entity.getPersistentData()
      if (String(data.getString('nexusHordeSession')) === state.sessionId) {
        try { entity.removeTag(state.tag) } catch (ignored) {}
        nexusHordeDirectorNativeBridgeClass.cleanupNativeMob(entity, state.sessionId)
        nexusHordeDirectorTargetingClass.clear(entity)
        nexusHordeDirectorLifecycle(state, null, 'tracking_cleanup', `reason=orphan_rejoin uuid=${entityId}`)
      }
    } catch (ignored) {}
  })
  try {
    var staleSession = String(entity.getPersistentData().getString('nexusHordeSession'))
    if (staleSession && !nexusHordeDirectorTargetingClass.isSessionActive(staleSession)) {
      nexusHordeDirectorNativeBridgeClass.cleanupNativeMob(entity, staleSession)
      nexusHordeDirectorTargetingClass.clear(entity)
    }
  } catch (ignored) {}
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDeathEvent', event => {
  nexusHordeDirectorHandleConfirmedDeath(event.getEntity(), event.getSource())
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityLeaveLevelEvent', event => {
  var entity = event.getEntity()
  var entityId = nexusHordeDirectorEntityId(entity)
  var ownerId = nexusHordeDirectorEntityOwners.get(entityId)
  var state = ownerId ? nexusHordeDirectorStates.get(ownerId) : null
  var record = state ? state.records.get(entityId) : null
  if (!record) return
  var alive = true
  var reason = 'unknown'
  try { alive = Boolean(entity.isAlive()) } catch (ignored) {}
  try { reason = entity.getRemovalReason() ? String(entity.getRemovalReason()) : 'none' } catch (ignored) {}
  nexusHordeDirectorLifecycle(state, record, 'level_leave', `alive=${alive} removal=${reason}`)
  try { nexusHordeDirectorTargetingClass.setLocatorGlowing(entity, false) } catch (ignored) {}
  if (alive && reason === 'none') {
    record.unloadedAt = nexusHordeDirectorServerTick
  } else if (reason === 'KILLED') {
    record.removalAt = nexusHordeDirectorServerTick
    record.removalReason = reason
  } else {
    nexusHordeDirectorUnexpectedRemoval(state, record, reason)
  }
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeEndEvent', event => {
  var state = nexusHordeDirectorFindStateByHorde(event.getHorde())
  if (state) {
    var validCompletion = !event.wasCommand()
      && state.completing
      && state.confirmedKills >= state.requiredKills
    nexusHordeDirectorCleanupState(state, validCompletion ? 'complete' : 'native_end')
  }
})

ForgeEvents.onEvent('net.minecraftforge.event.server.ServerStoppingEvent', event => {
  var states = []
  nexusHordeDirectorStates.forEach(state => states.push(state))
  states.forEach(state => nexusHordeDirectorCleanupState(state, 'server_stopping'))
  nexusHordeDirectorEntityOwners.clear()
})

ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ServerTickEvent', event => {
  if (String(event.phase) !== 'END') return
  nexusHordeDirectorServerTick += 1
  if (nexusHordeDirectorServerTick % NEXUS_HORDE_DIRECTOR_UPDATE_INTERVAL !== 0) return
  var states = []
  nexusHordeDirectorStates.forEach(state => states.push(state))
  states.forEach(state => {
    try { nexusHordeDirectorTickState(state) }
    catch (error) {
      nexusHordeDirectorLogErrorOnce(
        `tick:${state.sessionId}:${String(error)}`,
        `[Nexus Horde Director] session=${state.shortSession} tick failure.`, error
      )
      nexusHordeDirectorAbort(state, 'director_tick_failure')
    }
  })
})

if (typeof global !== 'undefined') {
  global.NexusHordeDirector = {
    cancelForPlayer: nexusHordeDirectorCancelForPlayer,
    snapshotForPlayer: player => {
      var state = player ? nexusHordeDirectorStates.get(nexusHordeDirectorPlayerId(player)) : null
      return state ? nexusHordeDirectorSnapshot(state) : null
    }
  }
}
