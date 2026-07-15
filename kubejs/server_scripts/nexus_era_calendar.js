// Nexus Realms - era global y calendario persistente de hordas.
// The Hordes queda en command-only; este script abre una sola horda global.

const NEXUS_ERA_MIN = 0
const NEXUS_ERA_MAX = 4
const NEXUS_ERA_HORDE_UNLOCK = 1
const NEXUS_ERA_FIRST_HORDE_DAY = 15
const NEXUS_ERA_GRACE_DAYS = 2
const NEXUS_ERA_HORDE_COOLDOWN_DAYS = 10
const NEXUS_ERA_DAY_LENGTH = 24000
const NEXUS_ERA_HORDE_START_TIME = 18000
const NEXUS_ERA_HORDE_START_BUFFER = 1200
const NEXUS_ERA_CHECK_INTERVAL = 20
const NEXUS_ERA_PARTICIPANT_RADIUS_SQR = 128 * 128
const NEXUS_CAMPAIGN_LENGTH_DAYS = 30
const NEXUS_CAMPAIGN_DAY_MILLIS = 24 * 60 * 60 * 1000
const NEXUS_ERA_DEFINITIONS = JsonIO.read('config/nexuscore/eras.json').eras
const NEXUS_HISTORY_IRON_STAGE = 'nexus_era_1_iron'
const NEXUS_HISTORY_DIAMOND_STAGE = 'nexus_era_2_diamond'
const NEXUS_HISTORY_ARCANE_INDUSTRIAL_STAGE = 'nexus_era_3_arcane_industrial'
const NEXUS_HISTORY_NEXUS_STAGE = 'nexus_era_4_nexus'

let nexusEraServerTicks = 0
let nexusEraLoggedStartFailureDay = -1
let nexusEraOverworldUnavailableLogged = false
let nexusEraLoadedLevelsLogged = false
let nexusEraOverworldSelectedLogged = false
let nexusEraDayTimeLogged = false
let nexusEraHistoryStagesMissingLogged = false
let nexusEraHistoryStagesSyncFailureLogged = false
let nexusEraHistoryStagesLoadSyncAtTick = -1
const nexusEraHistorySyncDiagnostics = {
  ok: false,
  error: 'not_run',
  era: -1,
  ironCommand: '',
  ironResult: 0,
  diamondCommand: '',
  diamondResult: 0,
  arcaneIndustrialCommand: '',
  arcaneIndustrialResult: 0,
  nexusCommand: '',
  nexusResult: 0
}
const nexusEraLoggedTickErrors = new Set()

function nexusEraDimensionId(level) {
  if (!level) return ''

  const nexusEraDimensionKey = String(level.dimension)
  const nexusEraDimensionSeparator = nexusEraDimensionKey.lastIndexOf(' / ')
  if (nexusEraDimensionSeparator < 0) return nexusEraDimensionKey

  let nexusEraParsedDimensionId = nexusEraDimensionKey.substring(nexusEraDimensionSeparator + 3)
  if (nexusEraParsedDimensionId.charAt(nexusEraParsedDimensionId.length - 1) === ']') {
    nexusEraParsedDimensionId = nexusEraParsedDimensionId.substring(0, nexusEraParsedDimensionId.length - 1)
  }
  return nexusEraParsedDimensionId
}

function nexusEraDefinition(era) {
  return era >= NEXUS_ERA_MIN && era <= NEXUS_ERA_MAX
    ? NEXUS_ERA_DEFINITIONS[era]
    : null
}

function nexusEraMinimumDay(era) {
  const nexusEraDefinitionEntry = nexusEraDefinition(era)
  return nexusEraDefinitionEntry ? Number(nexusEraDefinitionEntry.minimum_day) : -1
}

function nexusEraName(era) {
  const nexusEraDefinitionEntry = nexusEraDefinition(era)
  return nexusEraDefinitionEntry ? String(nexusEraDefinitionEntry.short_name) : 'desconocida'
}

function nexusEraFindOverworld(server) {
  const nexusEraLevelIterator = server.getAllLevels().iterator()
  let nexusEraLocatedOverworldLevel = null

  while (nexusEraLevelIterator.hasNext()) {
    const nexusEraCandidateLevel = nexusEraLevelIterator.next()
    const nexusEraCandidateDimensionId = nexusEraDimensionId(nexusEraCandidateLevel)

    if (!nexusEraLoadedLevelsLogged) {
      console.info(
        `Nexus Realms: ServerLevel cargado class=${String(nexusEraCandidateLevel.getClass().getName())} dimension=${nexusEraCandidateDimensionId}`
      )
    }

    if (nexusEraCandidateDimensionId === 'minecraft:overworld') {
      nexusEraLocatedOverworldLevel = nexusEraCandidateLevel
    }
  }

  nexusEraLoadedLevelsLogged = true
  if (nexusEraLocatedOverworldLevel) {
    if (!nexusEraOverworldSelectedLogged) {
      console.info(
        `Nexus Realms: ServerLevel seleccionado class=${String(nexusEraLocatedOverworldLevel.getClass().getName())} dimension=minecraft:overworld`
      )
      nexusEraOverworldSelectedLogged = true
    }
    return nexusEraLocatedOverworldLevel
  }

  if (!nexusEraOverworldUnavailableLogged) {
    console.warn('Nexus Realms: Overworld no disponible; se pospone el calendario de eras')
    nexusEraOverworldUnavailableLogged = true
  }
  return null
}

function nexusEraOverworld(server) {
  if (!server) return null

  try {
    return nexusEraFindOverworld(server)
  } catch (error) {
    if (!nexusEraOverworldUnavailableLogged) {
      console.error('Nexus Realms: fallo al recorrer los ServerLevel cargados')
      console.error(error)
      nexusEraOverworldUnavailableLogged = true
    }
    return null
  }
}

function nexusEraDayTime(server) {
  const nexusEraServerLevel = nexusEraOverworld(server)
  if (!nexusEraServerLevel) return null

  const nexusEraCurrentDayTime = Number(nexusEraServerLevel.getDayTime())
  if (!Number.isFinite(nexusEraCurrentDayTime)) return null

  if (!nexusEraDayTimeLogged) {
    console.info(`Nexus Realms: minecraft:overworld dayTime=${nexusEraCurrentDayTime}`)
    nexusEraDayTimeLogged = true
  }
  return nexusEraCurrentDayTime
}

function nexusEraWorldDay(server) {
  const dayTime = nexusEraDayTime(server)
  return dayTime === null ? null : Math.floor(dayTime / NEXUS_ERA_DAY_LENGTH)
}

function nexusEraTimeOfDay(server) {
  const dayTime = nexusEraDayTime(server)
  if (dayTime === null) return null
  return ((dayTime % NEXUS_ERA_DAY_LENGTH) + NEXUS_ERA_DAY_LENGTH) % NEXUS_ERA_DAY_LENGTH
}

function nexusCampaignNow() {
  return Date.now()
}

function nexusCampaignInitialize(data) {
  if (!data.contains('nexusCampaignStarted')) {
    const hasLegacyEpoch = data.contains('nexusCampaignEpochMillis') && Number(data.getLong('nexusCampaignEpochMillis')) > 0
    data.putBoolean('nexusCampaignStarted', hasLegacyEpoch)
  }
  if (!data.contains('nexusCampaignEpochMillis')) data.putLong('nexusCampaignEpochMillis', -1)
  if (!data.contains('nexusCampaignPaused')) data.putBoolean('nexusCampaignPaused', false)
  if (!data.contains('nexusCampaignPausedAtMillis')) data.putLong('nexusCampaignPausedAtMillis', -1)
  if (!data.contains('nexusCampaignPausedTotalMillis')) data.putLong('nexusCampaignPausedTotalMillis', 0)
}

function nexusCampaignDayFromData(data) {
  nexusCampaignInitialize(data)
  if (!data.getBoolean('nexusCampaignStarted')) return -1
  const now = nexusCampaignNow()
  const effectiveNow = data.getBoolean('nexusCampaignPaused')
    ? Number(data.getLong('nexusCampaignPausedAtMillis'))
    : now
  const epoch = Number(data.getLong('nexusCampaignEpochMillis'))
  const pausedTotal = Number(data.getLong('nexusCampaignPausedTotalMillis'))
  const elapsed = Math.max(0, effectiveNow - epoch - pausedTotal)
  return Math.max(1, Math.min(NEXUS_CAMPAIGN_LENGTH_DAYS, Math.floor(elapsed / NEXUS_CAMPAIGN_DAY_MILLIS) + 1))
}

function nexusCampaignPause(data) {
  nexusCampaignInitialize(data)
  if (!data.getBoolean('nexusCampaignStarted')) return 'not_started'
  if (data.getBoolean('nexusCampaignPaused')) return 'already_paused'
  data.putBoolean('nexusCampaignPaused', true)
  data.putLong('nexusCampaignPausedAtMillis', nexusCampaignNow())
  return 'paused'
}

function nexusCampaignResume(data) {
  nexusCampaignInitialize(data)
  if (!data.getBoolean('nexusCampaignStarted')) return 'not_started'
  if (!data.getBoolean('nexusCampaignPaused')) return 'already_running'
  const now = nexusCampaignNow()
  const pausedAt = Number(data.getLong('nexusCampaignPausedAtMillis'))
  const pausedTotal = Number(data.getLong('nexusCampaignPausedTotalMillis'))
  data.putLong('nexusCampaignPausedTotalMillis', pausedTotal + Math.max(0, now - pausedAt))
  data.putLong('nexusCampaignPausedAtMillis', -1)
  data.putBoolean('nexusCampaignPaused', false)
  return 'resumed'
}

function nexusCampaignSetDay(data, day) {
  nexusCampaignInitialize(data)
  if (!data.getBoolean('nexusCampaignStarted')) return false
  const now = nexusCampaignNow()
  data.putLong('nexusCampaignEpochMillis', now - (day - 1) * NEXUS_CAMPAIGN_DAY_MILLIS)
  data.putLong('nexusCampaignPausedTotalMillis', 0)
  if (data.getBoolean('nexusCampaignPaused')) data.putLong('nexusCampaignPausedAtMillis', now)
  return true
}

function nexusCampaignStart(data) {
  nexusCampaignInitialize(data)
  if (data.getBoolean('nexusCampaignStarted')) return false
  const now = nexusCampaignNow()
  data.putBoolean('nexusCampaignStarted', true)
  data.putLong('nexusCampaignEpochMillis', now)
  data.putBoolean('nexusCampaignPaused', false)
  data.putLong('nexusCampaignPausedAtMillis', -1)
  data.putLong('nexusCampaignPausedTotalMillis', 0)
  return true
}

function nexusCampaignRestart(data) {
  nexusCampaignInitialize(data)
  const now = nexusCampaignNow()
  data.putBoolean('nexusCampaignStarted', true)
  data.putLong('nexusCampaignEpochMillis', now)
  data.putBoolean('nexusCampaignPaused', false)
  data.putLong('nexusCampaignPausedAtMillis', -1)
  data.putLong('nexusCampaignPausedTotalMillis', 0)
}

function nexusEraData(server) {
  const data = server.persistentData

  nexusCampaignInitialize(data)

  if (!data.contains('nexusEra')) data.putInt('nexusEra', 0)
  if (!data.contains('nexusEraUnlockDay')) data.putInt('nexusEraUnlockDay', -1)
  if (!data.contains('nexusLastHordeCompletedDay')) data.putInt('nexusLastHordeCompletedDay', -1)
  if (!data.contains('nexusNextHordeDay')) data.putInt('nexusNextHordeDay', -1)
  if (!data.contains('nexusLastHordeStartedDay')) data.putInt('nexusLastHordeStartedDay', -1)
  if (!data.contains('nexusHordeActive')) data.putBoolean('nexusHordeActive', false)
  if (!data.contains('nexusHordeAnchorUUID')) data.putString('nexusHordeAnchorUUID', '')
  if (!data.contains('nexusHordeScheduledDay')) data.putInt('nexusHordeScheduledDay', -1)
  if (!data.contains('nexusHordeParticipantCount')) data.putInt('nexusHordeParticipantCount', 0)
  if (!data.contains('nexusHordeStartConfirmed')) data.putBoolean('nexusHordeStartConfirmed', false)
  if (!data.contains('nexusPendingEra')) data.putInt('nexusPendingEra', -1)
  if (!data.contains('nexusPendingEraRequestedDay')) data.putInt('nexusPendingEraRequestedDay', -1)
  if (!data.contains('nexusEraMilestoneCompleted')) data.putInt('nexusEraMilestoneCompleted', 0)

  return data
}

function nexusEraClearGlobalHorde(data) {
  data.putBoolean('nexusHordeActive', false)
  data.putString('nexusHordeAnchorUUID', '')
  data.putInt('nexusHordeScheduledDay', -1)
  data.putInt('nexusHordeParticipantCount', 0)
  data.putBoolean('nexusHordeStartConfirmed', false)
}

function nexusEraReprogramNextMidnight(server, data) {
  const currentDay = nexusEraWorldDay(server)
  if (currentDay === null) return false

  nexusEraClearGlobalHorde(data)
  data.putInt(
    'nexusNextHordeDay',
    data.getInt('nexusEra') >= NEXUS_ERA_HORDE_UNLOCK
      ? Math.max(NEXUS_ERA_FIRST_HORDE_DAY, currentDay + 1)
      : -1
  )
  return true
}

function nexusEraReply(source, message) {
  const player = source.player
  if (player) player.tell(message)
  else console.info(`Nexus Realms: ${message}`)
}

function nexusEraDayLabel(day, emptyLabel) {
  return day < 0 ? emptyLabel : String(day)
}

function nexusEraDescribe(server) {
  const data = nexusEraData(server)
  const era = data.getInt('nexusEra')
  const active = data.getBoolean('nexusHordeActive')
  const currentDay = nexusEraWorldDay(server)
  const campaignDay = nexusCampaignDayFromData(data)
  const pendingEra = data.getInt('nexusPendingEra')
  const nextEra = era < NEXUS_ERA_MAX ? era + 1 : -1
  return [
    `Era global: ${era} (${nexusEraName(era)})`,
    data.getBoolean('nexusCampaignStarted')
      ? `Dia de campana: ${campaignDay}/${NEXUS_CAMPAIGN_LENGTH_DAYS}${data.getBoolean('nexusCampaignPaused') ? ' (pausada)' : ''}`
      : 'Campana no iniciada',
    `Dia del mundo: ${currentDay === null ? 'no disponible' : currentDay}`,
    `Dia de desbloqueo: ${nexusEraDayLabel(data.getInt('nexusEraUnlockDay'), 'sin desbloquear')}`,
    `Ultima horda completada: ${nexusEraDayLabel(data.getInt('nexusLastHordeCompletedDay'), 'ninguna')}`,
    `Proxima horda valida: ${nexusEraDayLabel(data.getInt('nexusNextHordeDay'), 'no programada')}`,
    `Horda global activa: ${active}`,
    `Anchor: ${active ? data.getString('nexusHordeAnchorUUID') : 'ninguno'}`,
    `Participantes cercanos al inicio: ${data.getInt('nexusHordeParticipantCount')}`,
    `Hito global completado hasta era: ${data.getInt('nexusEraMilestoneCompleted')}`,
    `Avance pendiente: ${pendingEra < 0 ? 'ninguno' : `${pendingEra} (${nexusEraName(pendingEra)})`}`,
    `Dia minimo de la siguiente era: ${nextEra < 0 ? 'completado' : nexusEraMinimumDay(nextEra)}`
  ]
}

function nexusEraClearPending(data) {
  data.putInt('nexusPendingEra', -1)
  data.putInt('nexusPendingEraRequestedDay', -1)
}

function syncHistoryStages(server, era, moment) {
  if (!server) {
    nexusEraHistorySyncDiagnostics.ok = false
    nexusEraHistorySyncDiagnostics.error = 'server_unavailable'
    return nexusEraHistorySyncDiagnostics
  }

  try {
    if (!Platform.isLoaded('historystages')) {
      if (!nexusEraHistoryStagesMissingLogged) {
        console.warn('Nexus Realms: History Stages no esta cargado; se omite la sincronizacion de restricciones')
        nexusEraHistoryStagesMissingLogged = true
      }
      nexusEraHistorySyncDiagnostics.ok = false
      nexusEraHistorySyncDiagnostics.error = 'mod_unavailable'
      return nexusEraHistorySyncDiagnostics
    }

    era = Math.max(NEXUS_ERA_MIN, Math.min(NEXUS_ERA_MAX, Number(era)))
    nexusEraHistorySyncDiagnostics.era = era
    nexusEraHistorySyncDiagnostics.ironCommand =
      `history global ${era >= 1 ? 'unlock' : 'lock'} ${NEXUS_HISTORY_IRON_STAGE}`
    nexusEraHistorySyncDiagnostics.diamondCommand =
      `history global ${era >= 2 ? 'unlock' : 'lock'} ${NEXUS_HISTORY_DIAMOND_STAGE}`
    nexusEraHistorySyncDiagnostics.arcaneIndustrialCommand =
      `history global ${era >= 3 ? 'unlock' : 'lock'} ${NEXUS_HISTORY_ARCANE_INDUSTRIAL_STAGE}`
    nexusEraHistorySyncDiagnostics.nexusCommand =
      `history global ${era >= 4 ? 'unlock' : 'lock'} ${NEXUS_HISTORY_NEXUS_STAGE}`
    nexusEraHistorySyncDiagnostics.ironResult = Number(
      server.runCommandSilent(nexusEraHistorySyncDiagnostics.ironCommand)
    )
    nexusEraHistorySyncDiagnostics.diamondResult = Number(
      server.runCommandSilent(nexusEraHistorySyncDiagnostics.diamondCommand)
    )
    nexusEraHistorySyncDiagnostics.arcaneIndustrialResult = Number(
      server.runCommandSilent(nexusEraHistorySyncDiagnostics.arcaneIndustrialCommand)
    )
    nexusEraHistorySyncDiagnostics.nexusResult = Number(
      server.runCommandSilent(nexusEraHistorySyncDiagnostics.nexusCommand)
    )
    nexusEraHistorySyncDiagnostics.ok = true
    nexusEraHistorySyncDiagnostics.error = ''

    console.info(
      `[Nexus Era] History Stages sync: moment=${moment}, era=${era}, ` +
      `ironCommand="${nexusEraHistorySyncDiagnostics.ironCommand}", ` +
      `ironResult=${nexusEraHistorySyncDiagnostics.ironResult}, ` +
      `diamondCommand="${nexusEraHistorySyncDiagnostics.diamondCommand}", ` +
      `diamondResult=${nexusEraHistorySyncDiagnostics.diamondResult}, ` +
      `arcaneIndustrialCommand="${nexusEraHistorySyncDiagnostics.arcaneIndustrialCommand}", ` +
      `arcaneIndustrialResult=${nexusEraHistorySyncDiagnostics.arcaneIndustrialResult}, ` +
      `nexusCommand="${nexusEraHistorySyncDiagnostics.nexusCommand}", ` +
      `nexusResult=${nexusEraHistorySyncDiagnostics.nexusResult}`
    )
    return nexusEraHistorySyncDiagnostics
  } catch (error) {
    if (!nexusEraHistoryStagesSyncFailureLogged) {
      console.error('Nexus Realms: fallo al sincronizar la era global con History Stages')
      console.error(error)
      nexusEraHistoryStagesSyncFailureLogged = true
    }
    nexusEraHistorySyncDiagnostics.ok = false
    nexusEraHistorySyncDiagnostics.error = String(error)
    return nexusEraHistorySyncDiagnostics
  }
}

function nexusEraSet(server, newEra) {
  const currentWorldDay = nexusEraWorldDay(server)
  if (currentWorldDay === null) return false

  const data = nexusEraData(server)
  const campaignDay = nexusCampaignDayFromData(data)
  const previousEra = data.getInt('nexusEra')

  data.putInt('nexusEra', newEra)
  data.putInt('nexusEraUnlockDay', newEra === 0 ? -1 : campaignDay)
  if (data.getInt('nexusEraMilestoneCompleted') < newEra) {
    data.putInt('nexusEraMilestoneCompleted', newEra)
  }
  nexusEraClearPending(data)

  if (newEra === 0) {
    data.putInt('nexusNextHordeDay', -1)
  } else if (previousEra < NEXUS_ERA_HORDE_UNLOCK && newEra >= NEXUS_ERA_HORDE_UNLOCK) {
    const lastCompleted = data.getInt('nexusLastHordeCompletedDay')
    let nextDay = Math.max(
      NEXUS_ERA_FIRST_HORDE_DAY,
      currentWorldDay + NEXUS_ERA_GRACE_DAYS
    )

    if (lastCompleted >= 0) {
      nextDay = Math.max(nextDay, lastCompleted + NEXUS_ERA_HORDE_COOLDOWN_DAYS)
    }

    data.putInt('nexusNextHordeDay', nextDay)
  }

  syncHistoryStages(server, newEra, 'era_changed')
  return true
}

function nexusEraRequestAdvance(server, targetEra) {
  const data = nexusEraData(server)
  const currentDay = nexusCampaignDayFromData(data)
  const currentEra = data.getInt('nexusEra')
  if (currentEra >= NEXUS_ERA_MAX) return { status: 'maximum', era: currentEra }
  if (targetEra <= currentEra) return { status: 'already', era: currentEra }
  if (targetEra !== currentEra + 1) return { status: 'invalid_target', expected: currentEra + 1 }

  if (data.getInt('nexusEraMilestoneCompleted') < targetEra) {
    data.putInt('nexusEraMilestoneCompleted', targetEra)
  }

  if (data.getInt('nexusPendingEra') !== targetEra) {
    data.putInt('nexusPendingEra', targetEra)
    data.putInt('nexusPendingEraRequestedDay', currentDay)
  }

  if (!data.getBoolean('nexusCampaignStarted')) {
    return { status: 'awaiting_campaign', era: targetEra }
  }

  const minimumDay = nexusEraMinimumDay(targetEra)
  if (currentDay < minimumDay) {
    return { status: 'pending', era: targetEra, minimumDay: minimumDay, currentDay: currentDay }
  }

  return nexusEraSet(server, targetEra)
    ? { status: 'advanced', era: targetEra, currentDay: currentDay }
    : { status: 'world_unavailable' }
}

function nexusEraTryAdvancePending(server) {
  const data = nexusEraData(server)
  if (!data.getBoolean('nexusCampaignStarted')) return false
  const currentDay = nexusCampaignDayFromData(data)
  const currentEra = data.getInt('nexusEra')
  const pendingEra = data.getInt('nexusPendingEra')
  if (pendingEra < 0) return false

  if (pendingEra <= currentEra) {
    nexusEraClearPending(data)
    return false
  }
  if (pendingEra !== currentEra + 1) return false
  if (data.getInt('nexusEraMilestoneCompleted') < pendingEra) return false
  if (currentDay < nexusEraMinimumDay(pendingEra)) return false

  return nexusEraSet(server, pendingEra)
}

function nexusEraReplyAdvanceResult(source, result) {
  if (result.status === 'advanced') {
    nexusEraReply(source, `Era ${result.era} desbloqueada globalmente.`)
  } else if (result.status === 'pending') {
    nexusEraReply(source, `Hito de Era ${result.era} completado; avance pendiente hasta el dia ${result.minimumDay}.`)
  } else if (result.status === 'awaiting_campaign') {
    nexusEraReply(source, `Hito de Era ${result.era} registrado; avance pendiente hasta iniciar la campana.`)
  } else if (result.status === 'already') {
    nexusEraReply(source, `La Era ${result.era} ya esta desbloqueada.`)
  } else if (result.status === 'maximum') {
    nexusEraReply(source, 'La progresion global ya esta en la Era IV.')
  } else if (result.status === 'invalid_target') {
    nexusEraReply(source, `Solicitud rechazada: la siguiente era valida es ${result.expected}.`)
  } else {
    nexusEraReply(source, 'El Overworld aun no esta disponible; no se ha modificado la progresion.')
  }
}

function nexusEraIsValidAnchor(player) {
  try {
    if (!player.isAlive() || player.isSpectator()) return false
    return nexusEraDimensionId(player.level) === 'minecraft:overworld'
  } catch (ignored) {
    return false
  }
}

function nexusEraValidPlayers(server) {
  const players = []
  server.players.forEach(player => {
    if (nexusEraIsValidAnchor(player)) players.push(player)
  })
  players.sort((left, right) => String(left.uuid).localeCompare(String(right.uuid)))
  return players
}

function nexusEraParticipantCount(players, anchor) {
  let participants = 0
  players.forEach(player => {
    try {
      if (anchor.distanceToSqr(player) <= NEXUS_ERA_PARTICIPANT_RADIUS_SQR) participants += 1
    } catch (ignored) {
      // La lista se toma una sola vez; un logout simultaneo no invalida el inicio.
    }
  })
  return participants
}

function nexusEraClaimGlobalHorde(data, anchor, currentDay, participantCount) {
  data.putBoolean('nexusHordeActive', true)
  data.putString('nexusHordeAnchorUUID', String(anchor.uuid))
  data.putInt('nexusHordeScheduledDay', currentDay)
  data.putInt('nexusHordeParticipantCount', participantCount)
  data.putBoolean('nexusHordeStartConfirmed', false)
}

function nexusEraRescheduleMissedWindow(data, currentDay, timeOfDay) {
  const nextDay = timeOfDay <= NEXUS_ERA_HORDE_START_TIME + NEXUS_ERA_HORDE_START_BUFFER
    ? currentDay
    : currentDay + 1
  data.putInt('nexusNextHordeDay', nextDay)
  return nextDay
}

function nexusEraStartFailed(server, data, currentDay) {
  nexusEraReprogramNextMidnight(server, data)
  if (nexusEraLoggedStartFailureDay === currentDay) return

  nexusEraLoggedStartFailureDay = currentDay
  console.error(`Nexus Realms: no se pudo iniciar la horda global programada del dia ${currentDay}`)
}

function nexusEraTryStartScheduledHorde(server) {
  const currentDay = nexusEraWorldDay(server)
  const timeOfDay = nexusEraTimeOfDay(server)
  if (currentDay === null || timeOfDay === null) return

  const data = nexusEraData(server)
  if (data.getBoolean('nexusHordeActive')) return
  if (data.getInt('nexusEra') < NEXUS_ERA_HORDE_UNLOCK) return

  let nextDay = data.getInt('nexusNextHordeDay')

  if (nextDay < NEXUS_ERA_FIRST_HORDE_DAY) return

  // Saltos de tiempo y dias sin jugadores no acumulan eventos atrasados.
  if (currentDay > nextDay) {
    nextDay = nexusEraRescheduleMissedWindow(data, currentDay, timeOfDay)
  }

  if (currentDay !== nextDay) return
  if (timeOfDay < NEXUS_ERA_HORDE_START_TIME) return

  if (timeOfDay > NEXUS_ERA_HORDE_START_TIME + NEXUS_ERA_HORDE_START_BUFFER) {
    data.putInt('nexusNextHordeDay', currentDay + 1)
    return
  }

  if (data.getInt('nexusLastHordeStartedDay') === currentDay) return

  const players = nexusEraValidPlayers(server)
  if (players.length === 0) return

  const anchor = players[0]
  const anchorName = String(anchor.getGameProfile().getName())
  const participantCount = nexusEraParticipantCount(players, anchor)
  nexusEraClaimGlobalHorde(data, anchor, currentDay, participantCount)

  const commandResult = server.runCommandSilent(`hordes start ${anchorName} ${currentDay}`)
  if (commandResult <= 0 || !data.getBoolean('nexusHordeStartConfirmed')) {
    nexusEraStartFailed(server, data, currentDay)
    return
  }

  data.putInt('nexusLastHordeStartedDay', currentDay)
  nexusEraLoggedStartFailureDay = -1
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  event.register(
    Commands.literal('nexus_era')
      .then(
        Commands.literal('get')
          .executes(ctx => {
            const server = ctx.source.server
            nexusEraDescribe(server).forEach(line => nexusEraReply(ctx.source, line))
            return 1
          })
      )
      .then(
        Commands.literal('set')
          .requires(source => source.hasPermission(2))
          .then(
            Commands.argument('era', Arguments.INTEGER.create(event))
              .executes(ctx => {
                const era = Number(Arguments.INTEGER.getResult(ctx, 'era'))
                if (era < NEXUS_ERA_MIN || era > NEXUS_ERA_MAX) {
                  nexusEraReply(ctx.source, 'La era debe estar entre 0 y 4.')
                  return 0
                }

                const server = ctx.source.server
                if (!nexusEraSet(server, era)) {
                  nexusEraReply(ctx.source, 'El Overworld aun no esta disponible; la era no se ha modificado.')
                  return 0
                }
                nexusEraDescribe(server).forEach(line => nexusEraReply(ctx.source, line))
                return 1
              })
          )
      )
      .then(
        Commands.literal('advance')
          .requires(source => source.hasPermission(2))
          .executes(ctx => {
            const server = ctx.source.server
            const data = nexusEraData(server)
            const targetEra = data.getInt('nexusEra') + 1
            const result = nexusEraRequestAdvance(server, targetEra)
            nexusEraReplyAdvanceResult(ctx.source, result)
            return result.status === 'advanced' || result.status === 'pending' || result.status === 'awaiting_campaign' || result.status === 'already' ? 1 : 0
          })
      )
      .then(
        Commands.literal('request')
          .requires(source => source.hasPermission(2))
          .then(
            Commands.argument('eraObjetivo', Arguments.INTEGER.create(event))
              .executes(ctx => {
                const targetEra = Number(Arguments.INTEGER.getResult(ctx, 'eraObjetivo'))
                if (targetEra < 1 || targetEra > NEXUS_ERA_MAX) {
                  nexusEraReply(ctx.source, 'La era objetivo debe estar entre 1 y 4.')
                  return 0
                }

                const result = nexusEraRequestAdvance(ctx.source.server, targetEra)
                nexusEraReplyAdvanceResult(ctx.source, result)
                return result.status === 'advanced' || result.status === 'pending' || result.status === 'awaiting_campaign' || result.status === 'already' ? 1 : 0
              })
          )
      )
      .then(
        Commands.literal('sync')
          .requires(source => source.hasPermission(2))
          .executes(ctx => {
            const server = ctx.source.server
            const era = nexusEraData(server).getInt('nexusEra')
            const result = syncHistoryStages(server, era, 'manual_command')

            if (!result.ok) {
              nexusEraReply(ctx.source, `No se pudo sincronizar History Stages: ${result.error}.`)
              return 0
            }

            nexusEraReply(
              ctx.source,
              `History Stages sincronizado para Era ${result.era}: ` +
              `ironResult=${result.ironResult}, diamondResult=${result.diamondResult}, ` +
              `arcaneIndustrialResult=${result.arcaneIndustrialResult}, nexusResult=${result.nexusResult}.`
            )
            return 1
          })
      )
  )

  event.register(
    Commands.literal('nexus_campaign')
      .then(
        Commands.literal('get')
          .executes(ctx => {
            const data = nexusEraData(ctx.source.server)
            if (!data.getBoolean('nexusCampaignStarted')) {
              nexusEraReply(ctx.source, 'Campana no iniciada.')
              return 1
            }
            nexusEraReply(
              ctx.source,
              `Campana: dia ${nexusCampaignDayFromData(data)}/${NEXUS_CAMPAIGN_LENGTH_DAYS} ` +
              `(${data.getBoolean('nexusCampaignPaused') ? 'pausada' : 'activa'}).`
            )
            return 1
          })
      )
      .then(
        Commands.literal('start')
          .requires(source => source.hasPermission(2))
          .executes(ctx => {
            const started = nexusCampaignStart(nexusEraData(ctx.source.server))
            nexusEraReply(
              ctx.source,
              started
                ? 'Campana iniciada oficialmente en el dia 1/30.'
                : 'La campana ya estaba iniciada; el epoch no se ha modificado.'
            )
            return started ? 1 : 0
          })
      )
      .then(
        Commands.literal('pause')
          .requires(source => source.hasPermission(2))
          .executes(ctx => {
            const result = nexusCampaignPause(nexusEraData(ctx.source.server))
            if (result === 'not_started') {
              nexusEraReply(ctx.source, 'La campana no esta iniciada; usa /nexus_campaign start.')
              return 0
            }
            nexusEraReply(ctx.source, result === 'paused' ? 'Campana pausada.' : 'La campana ya estaba pausada.')
            return result === 'paused' ? 1 : 0
          })
      )
      .then(
        Commands.literal('resume')
          .requires(source => source.hasPermission(2))
          .executes(ctx => {
            const result = nexusCampaignResume(nexusEraData(ctx.source.server))
            if (result === 'not_started') {
              nexusEraReply(ctx.source, 'La campana no esta iniciada; usa /nexus_campaign start.')
              return 0
            }
            nexusEraReply(ctx.source, result === 'resumed' ? 'Campana reanudada.' : 'La campana ya estaba activa.')
            return result === 'resumed' ? 1 : 0
          })
      )
      .then(
        Commands.literal('restart')
          .requires(source => source.hasPermission(2))
          .executes(ctx => {
            nexusEraReply(ctx.source, 'Reinicio rechazado: usa /nexus_campaign restart confirm.')
            return 0
          })
          .then(
            Commands.literal('confirm')
              .executes(ctx => {
                nexusCampaignRestart(nexusEraData(ctx.source.server))
                nexusEraReply(
                  ctx.source,
                  'Calendario reiniciado al dia 1/30. La era global, hitos y History Stages se conservan.'
                )
                return 1
              })
          )
      )
      .then(
        Commands.literal('set_day')
          .requires(source => source.hasPermission(2))
          .then(
            Commands.argument('dia', Arguments.INTEGER.create(event))
              .executes(ctx => {
                const day = Number(Arguments.INTEGER.getResult(ctx, 'dia'))
                if (day < 1 || day > NEXUS_CAMPAIGN_LENGTH_DAYS) {
                  nexusEraReply(ctx.source, `El dia de campana debe estar entre 1 y ${NEXUS_CAMPAIGN_LENGTH_DAYS}.`)
                  return 0
                }
                const data = nexusEraData(ctx.source.server)
                if (!nexusCampaignSetDay(data, day)) {
                  nexusEraReply(ctx.source, 'La campana no esta iniciada; usa /nexus_campaign start.')
                  return 0
                }
                nexusEraReply(ctx.source, `Campana ajustada al dia ${day}/${NEXUS_CAMPAIGN_LENGTH_DAYS}.`)
                return 1
              })
          )
      )
  )
})

ServerEvents.loaded(event => {
  const data = nexusEraData(event.server)
  nexusEraHistoryStagesLoadSyncAtTick = nexusEraServerTicks + 100
  if (data.getBoolean('nexusHordeActive')) {
    // Una marca activa al cargar solo puede proceder de un cierre abrupto.
    nexusEraReprogramNextMidnight(event.server, data)
  }
})

ServerEvents.tick(event => {
  nexusEraServerTicks += 1
  if (nexusEraServerTicks % NEXUS_ERA_CHECK_INTERVAL !== 0) return

  try {
    if (
      nexusEraHistoryStagesLoadSyncAtTick >= 0 &&
      nexusEraServerTicks >= nexusEraHistoryStagesLoadSyncAtTick
    ) {
      nexusEraHistoryStagesLoadSyncAtTick = -1
      const era = nexusEraData(event.server).getInt('nexusEra')
      syncHistoryStages(event.server, era, 'delayed_load')
    }

    nexusEraTryAdvancePending(event.server)
    nexusEraTryStartScheduledHorde(event.server)
  } catch (error) {
    const errorKey = String(error)
    if (nexusEraLoggedTickErrors.has(errorKey)) return
    nexusEraLoggedTickErrors.add(errorKey)
    console.error('Nexus Realms: fallo al actualizar el calendario global de hordas')
    console.error(error)
  }
})
