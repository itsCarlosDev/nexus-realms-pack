// Nexus Realms - era global y calendario persistente de hordas.
// The Hordes queda en command-only; este script abre una sola horda global.
// Los eventos nativos de Forge se reciben mediante
// startup_scripts/nexus_era_calendar_forge_bridge.js.

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
const NEXUS_ERA_HORDE_CONFIRM_TIMEOUT_TICKS = 100
const NEXUS_ERA_RECOVERY_DELAY_TICKS = 100
const NEXUS_ERA_SAFE_LOCK_DAY = 2147483647
const NEXUS_ERA_CONFIG_PATH = 'config/nexuscore/eras.json'

const NEXUS_CAMPAIGN_LENGTH_DAYS = 30
const NEXUS_CAMPAIGN_DAY_MILLIS = 24 * 60 * 60 * 1000

const NEXUS_HISTORY_IRON_STAGE = 'nexus_era_1_iron'
const NEXUS_HISTORY_DIAMOND_STAGE = 'nexus_era_2_diamond'
const NEXUS_HISTORY_ARCANE_INDUSTRIAL_STAGE =
  'nexus_era_3_arcane_industrial'
const NEXUS_HISTORY_NEXUS_STAGE = 'nexus_era_4_nexus'

let nexusEraServerTicks = 0
let nexusEraHistoryStagesLoadSyncAtTick = -1
let nexusEraLoggedStartFailureDay = -1
let nexusEraPendingStart = null
let nexusEraRecoveryPending = false
let nexusEraRecoveryAtTick = -1

const nexusEraObservedNativeHordes = new Map()
const nexusEraLoggedErrors = new Set()

function nexusEraLogErrorOnce(key, message, error) {
  if (nexusEraLoggedErrors.has(key)) return

  nexusEraLoggedErrors.add(key)
  console.error(message)

  if (error) {
    console.error(error)
  }
}

function nexusEraFallbackDefinitions() {
  return [
    {
      short_name: 'Preparacion',
      minimum_day: 0
    },
    {
      short_name: 'Era I (config invalida)',
      minimum_day: NEXUS_ERA_SAFE_LOCK_DAY
    },
    {
      short_name: 'Era II (config invalida)',
      minimum_day: NEXUS_ERA_SAFE_LOCK_DAY
    },
    {
      short_name: 'Era III (config invalida)',
      minimum_day: NEXUS_ERA_SAFE_LOCK_DAY
    },
    {
      short_name: 'Era IV (config invalida)',
      minimum_day: NEXUS_ERA_SAFE_LOCK_DAY
    }
  ]
}

function nexusEraLoadDefinitions() {
  var nexusEraFallbackDefinitionList =
    nexusEraFallbackDefinitions()

  try {
    var nexusEraRawDefinitionFile =
      JsonIO.read(
        NEXUS_ERA_CONFIG_PATH
      )

    if (
      !nexusEraRawDefinitionFile ||
      !nexusEraRawDefinitionFile.eras
    ) {
      throw new Error(
        "Falta la propiedad 'eras'"
      )
    }

    var nexusEraLoadedDefinitionList = []
    var nexusEraDefinitionConfigValid = true

    for (
      var nexusEraDefinitionIndex =
        NEXUS_ERA_MIN;
      nexusEraDefinitionIndex <=
        NEXUS_ERA_MAX;
      nexusEraDefinitionIndex += 1
    ) {
      var nexusEraRawDefinitionEntry =
        nexusEraRawDefinitionFile
          .eras[nexusEraDefinitionIndex]

      if (
        nexusEraRawDefinitionEntry ===
          undefined ||
        nexusEraRawDefinitionEntry ===
          null
      ) {
        nexusEraRawDefinitionEntry =
          nexusEraRawDefinitionFile.eras[
            String(
              nexusEraDefinitionIndex
            )
          ]
      }

      var nexusEraDefinitionShortName = ''

      if (
        nexusEraRawDefinitionEntry &&
        nexusEraRawDefinitionEntry
          .short_name !== undefined &&
        nexusEraRawDefinitionEntry
          .short_name !== null
      ) {
        nexusEraDefinitionShortName =
          String(
            nexusEraRawDefinitionEntry
              .short_name
          ).trim()
      }

      var nexusEraDefinitionMinimumDay =
        nexusEraRawDefinitionEntry
          ? Number(
              nexusEraRawDefinitionEntry
                .minimum_day
            )
          : NaN

      var nexusEraDefinitionMinimumValid =
        Number.isInteger(
          nexusEraDefinitionMinimumDay
        ) &&
        (
          nexusEraDefinitionIndex === 0
            ? nexusEraDefinitionMinimumDay >= 0
            : (
                nexusEraDefinitionMinimumDay >= 1 &&
                nexusEraDefinitionMinimumDay <=
                  NEXUS_CAMPAIGN_LENGTH_DAYS
              )
        )

      if (
        !nexusEraRawDefinitionEntry ||
        !nexusEraDefinitionShortName ||
        !nexusEraDefinitionMinimumValid
      ) {
        nexusEraDefinitionConfigValid = false

        nexusEraLoadedDefinitionList[
          nexusEraDefinitionIndex
        ] =
          nexusEraFallbackDefinitionList[
            nexusEraDefinitionIndex
          ]

        console.error(
          `[Nexus Era] Definicion invalida para la era ${nexusEraDefinitionIndex}; ` +
          'queda bloqueada de forma segura.'
        )
      } else {
        nexusEraLoadedDefinitionList[
          nexusEraDefinitionIndex
        ] = {
          short_name:
            nexusEraDefinitionShortName,

          minimum_day:
            nexusEraDefinitionMinimumDay
        }
      }
    }

    console.info(
      `[Nexus Era] ${NEXUS_ERA_CONFIG_PATH} cargado correctamente; ` +
      `valid=${nexusEraDefinitionConfigValid}.`
    )

    return {
      valid:
        nexusEraDefinitionConfigValid,

      definitions:
        nexusEraLoadedDefinitionList
    }
  } catch (error) {
    console.error(
      `[Nexus Era] No se pudo cargar ${NEXUS_ERA_CONFIG_PATH}; ` +
      'las eras I-IV quedan bloqueadas.'
    )

    console.error(error)

    return {
      valid: false,

      definitions:
        nexusEraFallbackDefinitionList
    }
  }
}

const NEXUS_ERA_CONFIG =
  nexusEraLoadDefinitions()

const NEXUS_ERA_DEFINITIONS =
  NEXUS_ERA_CONFIG.definitions

function nexusEraDimensionId(level) {
  if (!level) return ''

  try {
    const dimension =
      typeof level.dimension ===
      'function'
        ? level.dimension()
        : level.dimension

    if (
      dimension &&
      typeof dimension.location ===
      'function'
    ) {
      return String(
        dimension.location()
      )
    }
  } catch (ignored) {
    // Se usa el parser de texto inferior.
  }

  const value =
    String(level.dimension)

  const separator =
    value.lastIndexOf(' / ')

  if (separator < 0) {
    return value
  }

  let parsed =
    value.substring(
      separator + 3
    )

  if (parsed.endsWith(']')) {
    parsed = parsed.substring(
      0,
      parsed.length - 1
    )
  }

  return parsed
}

function nexusEraDefinition(era) {
  return (
    era >= NEXUS_ERA_MIN &&
    era <= NEXUS_ERA_MAX
  )
    ? NEXUS_ERA_DEFINITIONS[era]
    : null
}

function nexusEraMinimumDay(era) {
  const definition =
    nexusEraDefinition(era)

  return definition
    ? Number(
        definition.minimum_day
      )
    : NEXUS_ERA_SAFE_LOCK_DAY
}

function nexusEraName(era) {
  const definition =
    nexusEraDefinition(era)

  return definition
    ? String(
        definition.short_name
      )
    : 'desconocida'
}

function nexusEraOverworld(server) {
  if (!server) return null

  try {
    var nexusEraLoadedLevelIterator =
      server
        .getAllLevels()
        .iterator()

    while (
      nexusEraLoadedLevelIterator
        .hasNext()
    ) {
      var nexusEraLoadedLevel =
        nexusEraLoadedLevelIterator
          .next()

      var nexusEraLoadedDimensionId =
        nexusEraDimensionId(
          nexusEraLoadedLevel
        )

      if (
        nexusEraLoadedDimensionId ===
        'minecraft:overworld'
      ) {
        return nexusEraLoadedLevel
      }
    }
  } catch (error) {
    nexusEraLogErrorOnce(
      'overworld',
      'Nexus Realms: no se pudo localizar el Overworld.',
      error
    )
  }

  return null
}

function nexusEraDayTime(server) {
  const level =
    nexusEraOverworld(server)

  if (!level) return null

  const value =
    Number(
      level.getDayTime()
    )

  return Number.isFinite(value)
    ? value
    : null
}

function nexusEraWorldDay(server) {
  const dayTime =
    nexusEraDayTime(server)

  return dayTime === null
    ? null
    : Math.floor(
        dayTime /
        NEXUS_ERA_DAY_LENGTH
      )
}

function nexusEraTimeOfDay(server) {
  const dayTime =
    nexusEraDayTime(server)

  if (dayTime === null) {
    return null
  }

  return (
    (
      dayTime %
      NEXUS_ERA_DAY_LENGTH
    ) +
    NEXUS_ERA_DAY_LENGTH
  ) % NEXUS_ERA_DAY_LENGTH
}

function nexusCampaignNow() {
  return Date.now()
}

function nexusCampaignInitialize(data) {
  if (
    !data.contains(
      'nexusCampaignStarted'
    )
  ) {
    const legacy =
      data.contains(
        'nexusCampaignEpochMillis'
      ) &&
      Number(
        data.getLong(
          'nexusCampaignEpochMillis'
        )
      ) > 0

    data.putBoolean(
      'nexusCampaignStarted',
      legacy
    )
  }

  if (
    !data.contains(
      'nexusCampaignEpochMillis'
    )
  ) {
    data.putLong(
      'nexusCampaignEpochMillis',
      -1
    )
  }

  if (
    !data.contains(
      'nexusCampaignPaused'
    )
  ) {
    data.putBoolean(
      'nexusCampaignPaused',
      false
    )
  }

  if (
    !data.contains(
      'nexusCampaignPausedAtMillis'
    )
  ) {
    data.putLong(
      'nexusCampaignPausedAtMillis',
      -1
    )
  }

  if (
    !data.contains(
      'nexusCampaignPausedTotalMillis'
    )
  ) {
    data.putLong(
      'nexusCampaignPausedTotalMillis',
      0
    )
  }
}

function nexusCampaignDayFromData(data) {
  nexusCampaignInitialize(data)

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return -1
  }

  const epoch = Number(
    data.getLong(
      'nexusCampaignEpochMillis'
    )
  )

  if (
    !Number.isFinite(epoch) ||
    epoch <= 0
  ) {
    return -1
  }

  const effectiveNow =
    data.getBoolean(
      'nexusCampaignPaused'
    )
      ? Number(
          data.getLong(
            'nexusCampaignPausedAtMillis'
          )
        )
      : nexusCampaignNow()

  const pausedTotal =
    Math.max(
      0,
      Number(
        data.getLong(
          'nexusCampaignPausedTotalMillis'
        )
      ) || 0
    )

  const elapsed =
    Math.max(
      0,
      effectiveNow -
      epoch -
      pausedTotal
    )

  return Math.max(
    1,
    Math.min(
      NEXUS_CAMPAIGN_LENGTH_DAYS,
      Math.floor(
        elapsed /
        NEXUS_CAMPAIGN_DAY_MILLIS
      ) + 1
    )
  )
}

function nexusCampaignStart(data) {
  nexusCampaignInitialize(data)

  if (
    data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return false
  }

  const now =
    nexusCampaignNow()

  data.putBoolean(
    'nexusCampaignStarted',
    true
  )

  data.putLong(
    'nexusCampaignEpochMillis',
    now
  )

  data.putBoolean(
    'nexusCampaignPaused',
    false
  )

  data.putLong(
    'nexusCampaignPausedAtMillis',
    -1
  )

  data.putLong(
    'nexusCampaignPausedTotalMillis',
    0
  )

  return true
}

function nexusCampaignPause(data) {
  nexusCampaignInitialize(data)

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return 'not_started'
  }

  if (
    data.getBoolean(
      'nexusCampaignPaused'
    )
  ) {
    return 'already_paused'
  }

  data.putBoolean(
    'nexusCampaignPaused',
    true
  )

  data.putLong(
    'nexusCampaignPausedAtMillis',
    nexusCampaignNow()
  )

  return 'paused'
}

function nexusCampaignResume(data) {
  nexusCampaignInitialize(data)

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return 'not_started'
  }

  if (
    !data.getBoolean(
      'nexusCampaignPaused'
    )
  ) {
    return 'already_running'
  }

  const now =
    nexusCampaignNow()

  const pausedAt =
    Number(
      data.getLong(
        'nexusCampaignPausedAtMillis'
      )
    )

  const pausedTotal =
    Number(
      data.getLong(
        'nexusCampaignPausedTotalMillis'
      )
    ) || 0

  data.putLong(
    'nexusCampaignPausedTotalMillis',
    pausedTotal +
    Math.max(
      0,
      now - pausedAt
    )
  )

  data.putLong(
    'nexusCampaignPausedAtMillis',
    -1
  )

  data.putBoolean(
    'nexusCampaignPaused',
    false
  )

  return 'resumed'
}

function nexusCampaignRestart(data) {
  const now =
    nexusCampaignNow()

  data.putBoolean(
    'nexusCampaignStarted',
    true
  )

  data.putLong(
    'nexusCampaignEpochMillis',
    now
  )

  data.putBoolean(
    'nexusCampaignPaused',
    false
  )

  data.putLong(
    'nexusCampaignPausedAtMillis',
    -1
  )

  data.putLong(
    'nexusCampaignPausedTotalMillis',
    0
  )
}

function nexusCampaignSetDay(
  data,
  day
) {
  nexusCampaignInitialize(data)

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return false
  }

  const now =
    nexusCampaignNow()

  data.putLong(
    'nexusCampaignEpochMillis',
    now -
    (
      day - 1
    ) *
    NEXUS_CAMPAIGN_DAY_MILLIS
  )

  data.putLong(
    'nexusCampaignPausedTotalMillis',
    0
  )

  if (
    data.getBoolean(
      'nexusCampaignPaused'
    )
  ) {
    data.putLong(
      'nexusCampaignPausedAtMillis',
      now
    )
  }

  return true
}

function nexusEraData(server) {
  const data =
    server.persistentData

  nexusCampaignInitialize(data)

  if (!data.contains('nexusEra')) {
    data.putInt('nexusEra', 0)
  }

  if (!data.contains('nexusEraUnlockDay')) {
    data.putInt(
      'nexusEraUnlockDay',
      -1
    )
  }

  if (!data.contains('nexusLastHordeCompletedDay')) {
    data.putInt(
      'nexusLastHordeCompletedDay',
      -1
    )
  }

  if (!data.contains('nexusNextHordeDay')) {
    data.putInt(
      'nexusNextHordeDay',
      -1
    )
  }

  if (!data.contains('nexusLastHordeStartedDay')) {
    data.putInt(
      'nexusLastHordeStartedDay',
      -1
    )
  }

  if (!data.contains('nexusHordeActive')) {
    data.putBoolean(
      'nexusHordeActive',
      false
    )
  }

  if (!data.contains('nexusHordeAnchorUUID')) {
    data.putString(
      'nexusHordeAnchorUUID',
      ''
    )
  }

  if (!data.contains('nexusHordeAnchorName')) {
    data.putString(
      'nexusHordeAnchorName',
      ''
    )
  }

  if (!data.contains('nexusHordeScheduledDay')) {
    data.putInt(
      'nexusHordeScheduledDay',
      -1
    )
  }

  if (!data.contains('nexusHordeParticipantCount')) {
    data.putInt(
      'nexusHordeParticipantCount',
      0
    )
  }

  if (!data.contains('nexusHordeParticipantUUIDs')) {
    data.putString(
      'nexusHordeParticipantUUIDs',
      '[]'
    )
  }

  if (!data.contains('nexusHordeStartConfirmed')) {
    data.putBoolean(
      'nexusHordeStartConfirmed',
      false
    )
  }

  if (!data.contains('nexusHordeLastFailureReason')) {
    data.putString(
      'nexusHordeLastFailureReason',
      ''
    )
  }

  if (!data.contains('nexusPendingEra')) {
    data.putInt(
      'nexusPendingEra',
      -1
    )
  }

  if (!data.contains('nexusPendingEraRequestedDay')) {
    data.putInt(
      'nexusPendingEraRequestedDay',
      -1
    )
  }

  if (!data.contains('nexusEraMilestoneCompleted')) {
    data.putInt(
      'nexusEraMilestoneCompleted',
      0
    )
  }

  return data
}

function nexusEraClearGlobalHorde(data) {
  data.putBoolean(
    'nexusHordeActive',
    false
  )

  data.putString(
    'nexusHordeAnchorUUID',
    ''
  )

  data.putString(
    'nexusHordeAnchorName',
    ''
  )

  data.putInt(
    'nexusHordeScheduledDay',
    -1
  )

  data.putInt(
    'nexusHordeParticipantCount',
    0
  )

  data.putString(
    'nexusHordeParticipantUUIDs',
    '[]'
  )

  data.putBoolean(
    'nexusHordeStartConfirmed',
    false
  )
}

function nexusEraEnsureHordeSchedule(
  server,
  data
) {
  if (
    data.getInt('nexusEra') <
    NEXUS_ERA_HORDE_UNLOCK
  ) {
    return false
  }

  if (
    data.getInt(
      'nexusNextHordeDay'
    ) >=
    NEXUS_ERA_FIRST_HORDE_DAY
  ) {
    return true
  }

  const currentDay =
    nexusEraWorldDay(server)

  if (currentDay === null) {
    return false
  }

  const lastCompleted =
    data.getInt(
      'nexusLastHordeCompletedDay'
    )

  let nextDay =
    Math.max(
      NEXUS_ERA_FIRST_HORDE_DAY,
      currentDay +
      NEXUS_ERA_GRACE_DAYS
    )

  if (lastCompleted >= 0) {
    nextDay = Math.max(
      nextDay,
      lastCompleted +
      NEXUS_ERA_HORDE_COOLDOWN_DAYS
    )
  }

  data.putInt(
    'nexusNextHordeDay',
    nextDay
  )

  return true
}

function nexusEraReprogramNextMidnight(
  server,
  data
) {
  const currentDay =
    nexusEraWorldDay(server)

  nexusEraClearGlobalHorde(data)

  if (currentDay === null) {
    data.putInt(
      'nexusNextHordeDay',
      -1
    )

    return false
  }

  data.putInt(
    'nexusNextHordeDay',
    data.getInt('nexusEra') >=
    NEXUS_ERA_HORDE_UNLOCK
      ? Math.max(
          NEXUS_ERA_FIRST_HORDE_DAY,
          currentDay + 1
        )
      : -1
  )

  return true
}

function nexusEraReply(
  source,
  message
) {
  if (source.player) {
    source.player.tell(message)
  } else {
    console.info(
      `Nexus Realms: ${message}`
    )
  }
}

function nexusEraDayLabel(
  day,
  emptyLabel
) {
  return day < 0
    ? emptyLabel
    : String(day)
}

function nexusEraDescribe(server) {
  const data =
    nexusEraData(server)

  const era =
    data.getInt('nexusEra')

  const campaignDay =
    nexusCampaignDayFromData(data)

  const currentDay =
    nexusEraWorldDay(server)

  const pendingEra =
    data.getInt(
      'nexusPendingEra'
    )

  const nextEra =
    era < NEXUS_ERA_MAX
      ? era + 1
      : -1

  return [
    `Era global: ${era} (${nexusEraName(era)})`,

    `Configuracion de eras valida: ${NEXUS_ERA_CONFIG.valid}`,

    data.getBoolean(
      'nexusCampaignStarted'
    )
      ? `Dia de campana: ${campaignDay}/${NEXUS_CAMPAIGN_LENGTH_DAYS}` +
        `${data.getBoolean('nexusCampaignPaused') ? ' (pausada)' : ''}`
      : 'Campana no iniciada',

    `Dia del mundo: ${
      currentDay === null
        ? 'no disponible'
        : currentDay
    }`,

    `Dia de desbloqueo: ${
      nexusEraDayLabel(
        data.getInt(
          'nexusEraUnlockDay'
        ),
        'sin desbloquear'
      )
    }`,

    `Ultima horda completada: ${
      nexusEraDayLabel(
        data.getInt(
          'nexusLastHordeCompletedDay'
        ),
        'ninguna'
      )
    }`,

    `Proxima horda valida: ${
      nexusEraDayLabel(
        data.getInt(
          'nexusNextHordeDay'
        ),
        'no programada'
      )
    }`,

    `Horda global activa: ${
      data.getBoolean(
        'nexusHordeActive'
      )
    }`,

    `Inicio nativo confirmado: ${
      data.getBoolean(
        'nexusHordeStartConfirmed'
      )
    }`,

    `Anchor: ${
      data.getString(
        'nexusHordeAnchorUUID'
      ) || 'ninguno'
    }`,

    `Participantes al inicio: ${
      data.getInt(
        'nexusHordeParticipantCount'
      )
    }`,

    `Ultimo fallo: ${
      data.getString(
        'nexusHordeLastFailureReason'
      ) || 'ninguno'
    }`,

    `Hito completado hasta era: ${
      data.getInt(
        'nexusEraMilestoneCompleted'
      )
    }`,

    `Avance pendiente: ${
      pendingEra < 0
        ? 'ninguno'
        : `${pendingEra} (${nexusEraName(pendingEra)})`
    }`,

    `Dia minimo de la siguiente era: ${
      nextEra < 0
        ? 'completado'
        : nexusEraMinimumDay(nextEra)
    }`
  ]
}

function nexusEraClearPending(data) {
  data.putInt(
    'nexusPendingEra',
    -1
  )

  data.putInt(
    'nexusPendingEraRequestedDay',
    -1
  )
}

function syncHistoryStages(
  server,
  era,
  moment
) {
  const result = {
    ok: false,
    error: '',
    era: Number(era),
    ironResult: 0,
    diamondResult: 0,
    arcaneIndustrialResult: 0,
    nexusResult: 0
  }

  if (!server) {
    result.error =
      'server_unavailable'

    return result
  }

  if (
    !Platform.isLoaded(
      'historystages'
    )
  ) {
    result.error =
      'mod_unavailable'

    return result
  }

  try {
    era = Math.max(
      NEXUS_ERA_MIN,
      Math.min(
        NEXUS_ERA_MAX,
        Number(era)
      )
    )

    result.era = era

    result.ironResult =
      Number(
        server.runCommandSilent(
          `history global ${
            era >= 1
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_IRON_STAGE}`
        )
      )

    result.diamondResult =
      Number(
        server.runCommandSilent(
          `history global ${
            era >= 2
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_DIAMOND_STAGE}`
        )
      )

    result.arcaneIndustrialResult =
      Number(
        server.runCommandSilent(
          `history global ${
            era >= 3
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_ARCANE_INDUSTRIAL_STAGE}`
        )
      )

    result.nexusResult =
      Number(
        server.runCommandSilent(
          `history global ${
            era >= 4
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_NEXUS_STAGE}`
        )
      )

    result.ok = true

    console.info(
      `[Nexus Era] History Stages ejecutado: ` +
      `moment=${moment}, era=${era}, ` +
      `iron=${result.ironResult}, ` +
      `diamond=${result.diamondResult}, ` +
      `arcaneIndustrial=${result.arcaneIndustrialResult}, ` +
      `nexus=${result.nexusResult}.`
    )
  } catch (error) {
    result.error =
      String(error)

    console.error(
      'Nexus Realms: fallo al sincronizar History Stages'
    )

    console.error(error)
  }

  return result
}

function nexusEraSet(
  server,
  newEra
) {
  if (
    !Number.isInteger(newEra) ||
    newEra < NEXUS_ERA_MIN ||
    newEra > NEXUS_ERA_MAX
  ) {
    return 'invalid'
  }

  const currentWorldDay =
    nexusEraWorldDay(server)

  if (currentWorldDay === null) {
    return 'world_unavailable'
  }

  const data =
    nexusEraData(server)

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return 'horde_active'
  }

  const previousEra =
    data.getInt('nexusEra')

  if (previousEra === newEra) {
    if (
      data.getInt(
        'nexusPendingEra'
      ) <= newEra
    ) {
      nexusEraClearPending(data)
    }

    syncHistoryStages(
      server,
      newEra,
      'era_unchanged'
    )

    return 'unchanged'
  }

  data.putInt(
    'nexusEra',
    newEra
  )

  data.putInt(
    'nexusEraUnlockDay',
    newEra === 0
      ? -1
      : nexusCampaignDayFromData(
          data
        )
  )

  if (
    data.getInt(
      'nexusEraMilestoneCompleted'
    ) < newEra
  ) {
    data.putInt(
      'nexusEraMilestoneCompleted',
      newEra
    )
  }

  nexusEraClearPending(data)

  if (newEra === 0) {
    data.putInt(
      'nexusNextHordeDay',
      -1
    )
  } else if (
    previousEra <
      NEXUS_ERA_HORDE_UNLOCK &&
    newEra >=
      NEXUS_ERA_HORDE_UNLOCK
  ) {
    nexusEraEnsureHordeSchedule(
      server,
      data
    )
  }

  syncHistoryStages(
    server,
    newEra,
    'era_changed'
  )

  return 'changed'
}

function nexusEraRequestAdvance(
  server,
  targetEra
) {
  const data =
    nexusEraData(server)

  const currentEra =
    data.getInt('nexusEra')

  const currentDay =
    nexusCampaignDayFromData(
      data
    )

  if (
    currentEra >=
    NEXUS_ERA_MAX
  ) {
    return {
      status: 'maximum',
      era: currentEra
    }
  }

  if (targetEra <= currentEra) {
    return {
      status: 'already',
      era: currentEra
    }
  }

  if (
    targetEra !==
    currentEra + 1
  ) {
    return {
      status: 'invalid_target',
      expected: currentEra + 1
    }
  }

  if (
    data.getInt(
      'nexusEraMilestoneCompleted'
    ) < targetEra
  ) {
    data.putInt(
      'nexusEraMilestoneCompleted',
      targetEra
    )
  }

  data.putInt(
    'nexusPendingEra',
    targetEra
  )

  data.putInt(
    'nexusPendingEraRequestedDay',
    currentDay
  )

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return {
      status: 'awaiting_campaign',
      era: targetEra
    }
  }

  if (
    data.getBoolean(
      'nexusCampaignPaused'
    )
  ) {
    return {
      status: 'campaign_paused',
      era: targetEra
    }
  }

  const minimumDay =
    nexusEraMinimumDay(targetEra)

  if (currentDay < minimumDay) {
    return {
      status: 'pending',
      era: targetEra,
      minimumDay: minimumDay,
      currentDay: currentDay
    }
  }

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return {
      status: 'awaiting_horde_end',
      era: targetEra
    }
  }

  const setResult =
    nexusEraSet(
      server,
      targetEra
    )

  if (
    setResult === 'changed' ||
    setResult === 'unchanged'
  ) {
    return {
      status: 'advanced',
      era: targetEra,
      currentDay: currentDay
    }
  }

  return {
    status: setResult
  }
}

function nexusEraTryAdvancePending(
  server
) {
  const data =
    nexusEraData(server)

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return false
  }

  if (
    data.getBoolean(
      'nexusCampaignPaused'
    )
  ) {
    return false
  }

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return false
  }

  const currentEra =
    data.getInt('nexusEra')

  const pendingEra =
    data.getInt(
      'nexusPendingEra'
    )

  const currentDay =
    nexusCampaignDayFromData(
      data
    )

  if (pendingEra < 0) {
    return false
  }

  if (pendingEra <= currentEra) {
    nexusEraClearPending(data)
    return false
  }

  if (
    pendingEra !==
    currentEra + 1
  ) {
    return false
  }

  if (
    data.getInt(
      'nexusEraMilestoneCompleted'
    ) < pendingEra
  ) {
    return false
  }

  if (
    currentDay <
    nexusEraMinimumDay(
      pendingEra
    )
  ) {
    return false
  }

  const result =
    nexusEraSet(
      server,
      pendingEra
    )

  return (
    result === 'changed' ||
    result === 'unchanged'
  )
}

function nexusEraReplyAdvanceResult(
  source,
  result
) {
  if (
    result.status === 'advanced'
  ) {
    nexusEraReply(
      source,
      `Era ${result.era} desbloqueada globalmente.`
    )
  } else if (
    result.status === 'pending'
  ) {
    nexusEraReply(
      source,
      `Hito de Era ${result.era} completado; ` +
      `pendiente hasta el dia ${result.minimumDay}.`
    )
  } else if (
    result.status ===
    'awaiting_campaign'
  ) {
    nexusEraReply(
      source,
      `Hito de Era ${result.era} registrado; ` +
      'pendiente hasta iniciar la campana.'
    )
  } else if (
    result.status ===
    'campaign_paused'
  ) {
    nexusEraReply(
      source,
      `Hito de Era ${result.era} registrado; ` +
      'pendiente hasta reanudar la campana.'
    )
  } else if (
    result.status ===
    'awaiting_horde_end'
  ) {
    nexusEraReply(
      source,
      `Hito de Era ${result.era} registrado; ` +
      'pendiente hasta terminar la Horda activa.'
    )
  } else if (
    result.status === 'already'
  ) {
    nexusEraReply(
      source,
      `La Era ${result.era} ya esta desbloqueada.`
    )
  } else if (
    result.status === 'maximum'
  ) {
    nexusEraReply(
      source,
      'La progresion global ya esta en la Era IV.'
    )
  } else if (
    result.status ===
    'invalid_target'
  ) {
    nexusEraReply(
      source,
      `Solicitud rechazada: la siguiente era valida es ${result.expected}.`
    )
  } else if (
    result.status ===
    'horde_active'
  ) {
    nexusEraReply(
      source,
      'No se puede cambiar la era durante una Horda activa.'
    )
  } else if (
    result.status === 'invalid'
  ) {
    nexusEraReply(
      source,
      'La era solicitada no es valida.'
    )
  } else {
    nexusEraReply(
      source,
      'El Overworld aun no esta disponible.'
    )
  }
}

function nexusEraIsValidAnchor(
  player
) {
  try {
    return (
      player.isAlive() &&
      !player.isSpectator() &&
      nexusEraDimensionId(
        player.level
      ) === 'minecraft:overworld'
    )
  } catch (ignored) {
    return false
  }
}

function nexusEraValidPlayers(server) {
  const players = []

  server.players.forEach(
    player => {
      if (
        nexusEraIsValidAnchor(
          player
        )
      ) {
        players.push(player)
      }
    }
  )

  players.sort(
    (left, right) =>
      String(left.uuid)
        .localeCompare(
          String(right.uuid)
        )
  )

  return players
}

function nexusEraParticipantsNear(
  players,
  anchor
) {
  const participants = []

  players.forEach(player => {
    try {
      if (
        anchor.distanceToSqr(
          player
        ) <=
        NEXUS_ERA_PARTICIPANT_RADIUS_SQR
      ) {
        participants.push(
          player
        )
      }
    } catch (ignored) {
      // Un logout simultaneo no invalida el inicio.
    }
  })

  return participants
}

function nexusEraSelectAnchor(players) {
  let selected = null

  players.forEach(anchor => {
    const participants =
      nexusEraParticipantsNear(
        players,
        anchor
      )

    if (
      !selected ||
      participants.length >
        selected.participants.length ||
      (
        participants.length ===
          selected.participants.length &&
        String(anchor.uuid)
          .localeCompare(
            String(
              selected.anchor.uuid
            )
          ) < 0
      )
    ) {
      selected = {
        anchor: anchor,
        participants: participants
      }
    }
  })

  return selected
}

function nexusEraFindOnlinePlayer(
  server,
  playerId
) {
  let found = null

  server.players.forEach(player => {
    if (
      !found &&
      String(player.uuid) ===
      String(playerId)
    ) {
      found = player
    }
  })

  return found
}

function nexusEraCleanupAuxiliaryState(
  player
) {
  if (!player) return

  try {
    if (
      global.NexusHordeDirector &&
      typeof global
        .NexusHordeDirector
        .cancelForPlayer ===
        'function'
    ) {
      global.NexusHordeDirector
        .cancelForPlayer(player)
    }
  } catch (error) {
    nexusEraLogErrorOnce(
      `director-cleanup:${String(player.uuid)}`,
      'Nexus Realms: fallo al limpiar el Director de hordas.',
      error
    )
  }

  try {
    if (
      global.NexusHordePresentation &&
      typeof global
        .NexusHordePresentation
        .cancel ===
        'function'
    ) {
      global.NexusHordePresentation
        .cancel(player)
    }
  } catch (error) {
    nexusEraLogErrorOnce(
      `presentation-cleanup:${String(player.uuid)}`,
      'Nexus Realms: fallo al limpiar la presentacion de hordas.',
      error
    )
  }

  try {
    if (
      global.NexusHordeReentryGuard &&
      typeof global
        .NexusHordeReentryGuard
        .releasePlayer ===
        'function'
    ) {
      global.NexusHordeReentryGuard
        .releasePlayer(player)
    }
  } catch (error) {
    nexusEraLogErrorOnce(
      `reentry-cleanup:${String(player.uuid)}`,
      'Nexus Realms: fallo al liberar el bloqueo de reentrada.',
      error
    )
  }

  try {
    const safeId =
      String(player.uuid)
        .replace(/-/g, '')

    player
      .getServer()
      .runCommandSilent(
        `bossbar remove nexus:horde_${safeId}`
      )
  } catch (ignored) {
    // La bossbar puede no existir.
  }
}

function nexusEraClaimGlobalHorde(
  data,
  anchor,
  currentDay,
  participants
) {
  data.putBoolean(
    'nexusHordeActive',
    true
  )

  data.putString(
    'nexusHordeAnchorUUID',
    String(anchor.uuid)
  )

  data.putString(
    'nexusHordeAnchorName',
    String(
      anchor
        .getGameProfile()
        .getName()
    )
  )

  data.putInt(
    'nexusHordeScheduledDay',
    currentDay
  )

  data.putInt(
    'nexusHordeParticipantCount',
    participants.length
  )

  data.putString(
    'nexusHordeParticipantUUIDs',
    JSON.stringify(
      participants.map(
        player =>
          String(player.uuid)
      )
    )
  )

  data.putBoolean(
    'nexusHordeStartConfirmed',
    false
  )

  data.putString(
    'nexusHordeLastFailureReason',
    ''
  )
}

function nexusEraStartFailed(
  server,
  data,
  currentDay,
  reason,
  player
) {
  if (player) {
    nexusEraCleanupAuxiliaryState(
      player
    )
  }

  nexusEraPendingStart = null

  data.putString(
    'nexusHordeLastFailureReason',
    String(
      reason || 'unknown'
    )
  )

  nexusEraReprogramNextMidnight(
    server,
    data
  )

  if (
    nexusEraLoggedStartFailureDay !==
    currentDay
  ) {
    nexusEraLoggedStartFailureDay =
      currentDay

    console.error(
      `[Nexus Horde] Inicio fallido en el dia ${currentDay}; ` +
      `reason=${reason}.`
    )
  }
}

function nexusEraConfirmStartedHorde(
  data,
  currentDay,
  player
) {
  data.putBoolean(
    'nexusHordeStartConfirmed',
    true
  )

  data.putInt(
    'nexusLastHordeStartedDay',
    currentDay
  )

  data.putString(
    'nexusHordeLastFailureReason',
    ''
  )

  nexusEraPendingStart = null
  nexusEraLoggedStartFailureDay = -1

  console.info(
    `[Nexus Horde] Inicio nativo confirmado para ${String(player.uuid)} ` +
    `en el dia ${currentDay}.`
  )
}

function nexusEraValidatePendingStart(
  server
) {
  if (!nexusEraPendingStart) {
    return
  }

  const pending =
    nexusEraPendingStart

  const data =
    nexusEraData(server)

  if (
    !data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    nexusEraPendingStart = null
    return
  }

  const player =
    nexusEraFindOnlinePlayer(
      server,
      pending.playerId
    )

  if (!player) {
    if (
      nexusEraServerTicks >=
      pending.deadlineAtTick
    ) {
      nexusEraStartFailed(
        server,
        data,
        pending.currentDay,
        'anchor_offline',
        pending.player
      )
    }

    return
  }

  if (
    pending.eventObserved &&
    pending.horde
  ) {
    try {
      if (
        pending.horde.isActive()
      ) {
        nexusEraConfirmStartedHorde(
          data,
          pending.currentDay,
          player
        )
      } else {
        nexusEraStartFailed(
          server,
          data,
          pending.currentDay,
          'native_event_inactive',
          player
        )
      }

      return
    } catch (error) {
      nexusEraLogErrorOnce(
        `confirm:${pending.playerId}`,
        'Nexus Realms: fallo al confirmar el estado nativo de The Hordes.',
        error
      )
    }
  }

  if (
    nexusEraServerTicks >=
    pending.deadlineAtTick
  ) {
    nexusEraStartFailed(
      server,
      data,
      pending.currentDay,
      'native_event_not_observed',
      player
    )
  }
}

function nexusEraCompleteHorde(player) {
  if (!player) return false

  const server =
    player.getServer()

  const data =
    nexusEraData(server)

  const playerId =
    String(player.uuid)

  if (
    !data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return false
  }

  if (
    data.getString(
      'nexusHordeAnchorUUID'
    ) !== playerId
  ) {
    return false
  }

  const completedDay =
    nexusEraWorldDay(server)

  if (completedDay === null) {
    return false
  }

  data.putInt(
    'nexusLastHordeCompletedDay',
    completedDay
  )

  data.putInt(
    'nexusNextHordeDay',
    completedDay +
    NEXUS_ERA_HORDE_COOLDOWN_DAYS
  )

  nexusEraPendingStart = null

  nexusEraObservedNativeHordes.delete(
    playerId
  )

  nexusEraClearGlobalHorde(
    data
  )

  console.info(
    `[Nexus Horde] Evento completado en el dia ${completedDay}.`
  )

  return true
}

function nexusEraTryStartScheduledHorde(
  server
) {
  const currentDay =
    nexusEraWorldDay(server)

  const timeOfDay =
    nexusEraTimeOfDay(server)

  if (
    currentDay === null ||
    timeOfDay === null
  ) {
    return
  }

  const data =
    nexusEraData(server)

  if (
    !data.getBoolean(
      'nexusCampaignStarted'
    )
  ) {
    return
  }

  if (
    data.getBoolean(
      'nexusCampaignPaused'
    )
  ) {
    return
  }

  if (nexusEraRecoveryPending) {
    return
  }

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return
  }

  if (
    data.getInt('nexusEra') <
    NEXUS_ERA_HORDE_UNLOCK
  ) {
    return
  }

  nexusEraEnsureHordeSchedule(
    server,
    data
  )

  let nextDay =
    data.getInt(
      'nexusNextHordeDay'
    )

  if (
    nextDay <
    NEXUS_ERA_FIRST_HORDE_DAY
  ) {
    return
  }

  if (currentDay > nextDay) {
    nextDay =
      timeOfDay <=
      NEXUS_ERA_HORDE_START_TIME +
      NEXUS_ERA_HORDE_START_BUFFER
        ? currentDay
        : currentDay + 1

    data.putInt(
      'nexusNextHordeDay',
      nextDay
    )
  }

  if (currentDay !== nextDay) {
    return
  }

  if (
    timeOfDay <
    NEXUS_ERA_HORDE_START_TIME
  ) {
    return
  }

  if (
    timeOfDay >
    NEXUS_ERA_HORDE_START_TIME +
    NEXUS_ERA_HORDE_START_BUFFER
  ) {
    data.putInt(
      'nexusNextHordeDay',
      currentDay + 1
    )

    return
  }

  if (
    data.getInt(
      'nexusLastHordeStartedDay'
    ) === currentDay
  ) {
    return
  }

  const selection =
    nexusEraSelectAnchor(
      nexusEraValidPlayers(
        server
      )
    )

  if (!selection) return

  const anchor =
    selection.anchor

  const anchorName =
    String(
      anchor
        .getGameProfile()
        .getName()
    )

  nexusEraClaimGlobalHorde(
    data,
    anchor,
    currentDay,
    selection.participants
  )

  nexusEraPendingStart = {
    playerId: String(
      anchor.uuid
    ),
    player: anchor,
    horde: null,
    eventObserved: false,
    currentDay: currentDay,
    deadlineAtTick:
      nexusEraServerTicks +
      NEXUS_ERA_HORDE_CONFIRM_TIMEOUT_TICKS
  }

  let commandResult = 0

  try {
    commandResult =
      Number(
        server.runCommandSilent(
          `hordes start ${anchorName} 0`
        )
      )
  } catch (error) {
    nexusEraStartFailed(
      server,
      data,
      currentDay,
      `command_exception:${String(error)}`,
      anchor
    )

    return
  }

  if (commandResult <= 0) {
    nexusEraStartFailed(
      server,
      data,
      currentDay,
      `command_result_${commandResult}`,
      anchor
    )

    return
  }

  nexusEraValidatePendingStart(
    server
  )
}

function nexusEraReconcilePersistedHorde(
  server
) {
  if (
    !nexusEraRecoveryPending ||
    nexusEraServerTicks <
    nexusEraRecoveryAtTick
  ) {
    return
  }

  const data =
    nexusEraData(server)

  if (
    !data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    nexusEraRecoveryPending = false
    nexusEraRecoveryAtTick = -1
    return
  }

  const player =
    nexusEraFindOnlinePlayer(
      server,
      data.getString(
        'nexusHordeAnchorUUID'
      )
    )

  if (!player) {
    return
  }

  const playerName =
    String(
      player
        .getGameProfile()
        .getName()
    )

  let commandResult = 0

  if (
    data.getBoolean(
      'nexusHordeStartConfirmed'
    )
  ) {
    try {
      commandResult =
        Number(
          server.runCommandSilent(
            `hordes stop ${playerName}`
          )
        )
    } catch (error) {
      nexusEraLogErrorOnce(
        'recovery-stop',
        'Nexus Realms: fallo al detener la Horda persistida.',
        error
      )
    }
  }

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    nexusEraCleanupAuxiliaryState(
      player
    )

    nexusEraReprogramNextMidnight(
      server,
      data
    )
  }

  nexusEraObservedNativeHordes.delete(
    String(player.uuid)
  )

  nexusEraPendingStart = null
  nexusEraRecoveryPending = false
  nexusEraRecoveryAtTick = -1

  console.warn(
    `[Nexus Horde] Horda persistida cancelada y reprogramada tras reinicio; ` +
    `commandResult=${commandResult}.`
  )
}

function nexusEraBridgeOnHordeStart(
  event
) {
  const player =
    event.getPlayer()

  const playerId =
    String(player.uuid)

  const horde =
    event.getHorde()

  nexusEraObservedNativeHordes.set(
    playerId,
    horde
  )

  if (
    nexusEraPendingStart &&
    nexusEraPendingStart.playerId ===
    playerId
  ) {
    nexusEraPendingStart.eventObserved =
      true

    nexusEraPendingStart.horde =
      horde
  }
}

function nexusEraBridgeOnHordeEnd(
  event
) {
  const player =
    event.getPlayer()

  const playerId =
    String(player.uuid)

  const server =
    player.getServer()

  const data =
    nexusEraData(server)

  nexusEraObservedNativeHordes.delete(
    playerId
  )

  if (
    !data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return
  }

  if (
    data.getString(
      'nexusHordeAnchorUUID'
    ) !== playerId
  ) {
    return
  }

  if (event.wasCommand()) {
    nexusEraPendingStart = null

    nexusEraCleanupAuxiliaryState(
      player
    )

    nexusEraReprogramNextMidnight(
      server,
      data
    )

    console.warn(
      `[Nexus Horde] Horda de ${playerId} detenida por comando; ` +
      'no cuenta como completada.'
    )
  } else {
    nexusEraCompleteHorde(
      player
    )
  }
}

// API llamada desde:
// kubejs/startup_scripts/nexus_era_calendar_forge_bridge.js

global.NexusEraCalendar = {
  onHordeStart:
    nexusEraBridgeOnHordeStart,

  onHordeEnd:
    nexusEraBridgeOnHordeEnd
}

ServerEvents.commandRegistry(
  event => {
    const {
      commands: Commands,
      arguments: Arguments
    } = event

    event.register(
      Commands.literal('nexus_era')
        .then(
          Commands.literal('get')
            .executes(ctx => {
              nexusEraDescribe(
                ctx.source.server
              ).forEach(line => {
                nexusEraReply(
                  ctx.source,
                  line
                )
              })

              return 1
            })
        )
        .then(
          Commands.literal('set')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .then(
              Commands.argument(
                'era',
                Arguments.INTEGER.create(
                  event
                )
              ).executes(ctx => {
                const era =
                  Number(
                    Arguments.INTEGER.getResult(
                      ctx,
                      'era'
                    )
                  )

                const result =
                  nexusEraSet(
                    ctx.source.server,
                    era
                  )

                if (
                  result ===
                  'horde_active'
                ) {
                  nexusEraReply(
                    ctx.source,
                    'No se puede cambiar la era durante una Horda activa.'
                  )
                } else if (
                  result ===
                  'world_unavailable'
                ) {
                  nexusEraReply(
                    ctx.source,
                    'El Overworld aun no esta disponible.'
                  )
                } else if (
                  result === 'invalid'
                ) {
                  nexusEraReply(
                    ctx.source,
                    'La era debe estar entre 0 y 4.'
                  )
                } else {
                  nexusEraDescribe(
                    ctx.source.server
                  ).forEach(line => {
                    nexusEraReply(
                      ctx.source,
                      line
                    )
                  })
                }

                return (
                  result === 'changed' ||
                  result === 'unchanged'
                )
                  ? 1
                  : 0
              })
            )
        )
        .then(
          Commands.literal('advance')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              const data =
                nexusEraData(
                  ctx.source.server
                )

              const result =
                nexusEraRequestAdvance(
                  ctx.source.server,
                  data.getInt(
                    'nexusEra'
                  ) + 1
                )

              nexusEraReplyAdvanceResult(
                ctx.source,
                result
              )

              return [
                'advanced',
                'pending',
                'awaiting_campaign',
                'campaign_paused',
                'awaiting_horde_end',
                'already'
              ].includes(
                result.status
              )
                ? 1
                : 0
            })
        )
        .then(
          Commands.literal('request')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .then(
              Commands.argument(
                'eraObjetivo',
                Arguments.INTEGER.create(
                  event
                )
              ).executes(ctx => {
                const target =
                  Number(
                    Arguments.INTEGER.getResult(
                      ctx,
                      'eraObjetivo'
                    )
                  )

                const result =
                  nexusEraRequestAdvance(
                    ctx.source.server,
                    target
                  )

                nexusEraReplyAdvanceResult(
                  ctx.source,
                  result
                )

                return [
                  'advanced',
                  'pending',
                  'awaiting_campaign',
                  'campaign_paused',
                  'awaiting_horde_end',
                  'already'
                ].includes(
                  result.status
                )
                  ? 1
                  : 0
              })
            )
        )
        .then(
          Commands.literal('sync')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              const era =
                nexusEraData(
                  ctx.source.server
                ).getInt(
                  'nexusEra'
                )

              const result =
                syncHistoryStages(
                  ctx.source.server,
                  era,
                  'manual_command'
                )

              nexusEraReply(
                ctx.source,
                result.ok
                  ? `Comandos ejecutados para Era ${result.era}: ` +
                    `iron=${result.ironResult}, ` +
                    `diamond=${result.diamondResult}, ` +
                    `arcaneIndustrial=${result.arcaneIndustrialResult}, ` +
                    `nexus=${result.nexusResult}.`
                  : `No se pudo sincronizar History Stages: ${result.error}.`
              )

              return result.ok
                ? 1
                : 0
            })
        )
        .then(
          Commands.literal(
            '_horde_complete'
          )
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              return nexusEraCompleteHorde(
                ctx.source.player
              )
                ? 1
                : 0
            })
        )
    )

    event.register(
      Commands.literal(
        'nexus_campaign'
      )
        .then(
          Commands.literal('get')
            .executes(ctx => {
              const data =
                nexusEraData(
                  ctx.source.server
                )

              nexusEraReply(
                ctx.source,
                data.getBoolean(
                  'nexusCampaignStarted'
                )
                  ? `Campana: dia ${nexusCampaignDayFromData(data)}/${NEXUS_CAMPAIGN_LENGTH_DAYS} ` +
                    `(${data.getBoolean('nexusCampaignPaused') ? 'pausada' : 'activa'}).`
                  : 'Campana no iniciada.'
              )

              return 1
            })
        )
        .then(
          Commands.literal('start')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              const data =
                nexusEraData(
                  ctx.source.server
                )

              const started =
                nexusCampaignStart(
                  data
                )

              if (started) {
                nexusEraEnsureHordeSchedule(
                  ctx.source.server,
                  data
                )
              }

              nexusEraReply(
                ctx.source,
                started
                  ? 'Campana iniciada en el dia 1/30.'
                  : 'La campana ya estaba iniciada.'
              )

              return started
                ? 1
                : 0
            })
        )
        .then(
          Commands.literal('pause')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              const data =
                nexusEraData(
                  ctx.source.server
                )

              if (
                data.getBoolean(
                  'nexusHordeActive'
                )
              ) {
                nexusEraReply(
                  ctx.source,
                  'No se puede pausar durante una Horda activa.'
                )

                return 0
              }

              const result =
                nexusCampaignPause(
                  data
                )

              nexusEraReply(
                ctx.source,
                result === 'paused'
                  ? 'Campana pausada.'
                  : result ===
                    'not_started'
                    ? 'La campana no esta iniciada.'
                    : 'La campana ya estaba pausada.'
              )

              return result === 'paused'
                ? 1
                : 0
            })
        )
        .then(
          Commands.literal('resume')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              const result =
                nexusCampaignResume(
                  nexusEraData(
                    ctx.source.server
                  )
                )

              nexusEraReply(
                ctx.source,
                result === 'resumed'
                  ? 'Campana reanudada.'
                  : result ===
                    'not_started'
                    ? 'La campana no esta iniciada.'
                    : 'La campana ya estaba activa.'
              )

              return result === 'resumed'
                ? 1
                : 0
            })
        )
        .then(
          Commands.literal('restart')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .executes(ctx => {
              nexusEraReply(
                ctx.source,
                'Usa /nexus_campaign restart confirm.'
              )

              return 0
            })
            .then(
              Commands.literal('confirm')
                .executes(ctx => {
                  const data =
                    nexusEraData(
                      ctx.source.server
                    )

                  if (
                    data.getBoolean(
                      'nexusHordeActive'
                    )
                  ) {
                    nexusEraReply(
                      ctx.source,
                      'No se puede reiniciar durante una Horda activa.'
                    )

                    return 0
                  }

                  nexusCampaignRestart(
                    data
                  )

                  nexusEraEnsureHordeSchedule(
                    ctx.source.server,
                    data
                  )

                  nexusEraReply(
                    ctx.source,
                    'Calendario reiniciado al dia 1/30; era e hitos conservados.'
                  )

                  return 1
                })
            )
        )
        .then(
          Commands.literal('set_day')
            .requires(
              source =>
                source.hasPermission(2)
            )
            .then(
              Commands.argument(
                'dia',
                Arguments.INTEGER.create(
                  event
                )
              ).executes(ctx => {
                const day =
                  Number(
                    Arguments.INTEGER.getResult(
                      ctx,
                      'dia'
                    )
                  )

                if (
                  day < 1 ||
                  day >
                  NEXUS_CAMPAIGN_LENGTH_DAYS
                ) {
                  nexusEraReply(
                    ctx.source,
                    `El dia debe estar entre 1 y ${NEXUS_CAMPAIGN_LENGTH_DAYS}.`
                  )

                  return 0
                }

                const changed =
                  nexusCampaignSetDay(
                    nexusEraData(
                      ctx.source.server
                    ),
                    day
                  )

                nexusEraReply(
                  ctx.source,
                  changed
                    ? `Campana ajustada al dia ${day}.`
                    : 'La campana no esta iniciada.'
                )

                return changed
                  ? 1
                  : 0
              })
            )
        )
    )
  }
)

ServerEvents.loaded(event => {
  const data =
    nexusEraData(
      event.server
    )

  nexusEraHistoryStagesLoadSyncAtTick =
    nexusEraServerTicks + 100

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    nexusEraRecoveryPending = true

    nexusEraRecoveryAtTick =
      nexusEraServerTicks +
      NEXUS_ERA_RECOVERY_DELAY_TICKS

    console.warn(
      '[Nexus Horde] Horda persistida detectada; ' +
      'se cancelara y reprogramara cuando el anchor este conectado.'
    )
  }
})

ServerEvents.tick(event => {
  nexusEraServerTicks += 1

  if (
    nexusEraServerTicks %
    NEXUS_ERA_CHECK_INTERVAL !==
    0
  ) {
    return
  }

  try {
    if (
      nexusEraHistoryStagesLoadSyncAtTick >= 0 &&
      nexusEraServerTicks >=
      nexusEraHistoryStagesLoadSyncAtTick
    ) {
      nexusEraHistoryStagesLoadSyncAtTick =
        -1

      syncHistoryStages(
        event.server,
        nexusEraData(
          event.server
        ).getInt(
          'nexusEra'
        ),
        'delayed_load'
      )
    }

    nexusEraReconcilePersistedHorde(
      event.server
    )

    nexusEraValidatePendingStart(
      event.server
    )

    nexusEraTryAdvancePending(
      event.server
    )

    nexusEraTryStartScheduledHorde(
      event.server
    )
  } catch (error) {
    nexusEraLogErrorOnce(
      `tick:${String(error)}`,
      'Nexus Realms: fallo al actualizar el calendario.',
      error
    )
  }
})