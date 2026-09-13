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
const NEXUS_ERA_RECOVERY_TIMEOUT_TICKS = 600
const NEXUS_ERA_CONFIG_PATH = 'config/nexuscore/eras.json'

const NEXUS_ERA_MAX_THREAT_DAY = 2147483647
const NEXUS_ERA_HORDE_WAVE_OFFSETS = [-2, 0, 1, 2]
const NEXUS_ERA_HORDE_WAVE_HARD_CAP = 24
const NEXUS_ERA_FINISHER_TABLES = {
  1: 'nexus:era1_finisher',
  2: 'nexus:era2_finisher',
  3: 'nexus:era3_finisher',
  4: 'nexus:era4_finisher'
}
const NEXUS_ERA_HORDE_THEMES = {
  1: [
    {
      id: 'podredumbre',
      name: 'Marea de podredumbre',
      table: 'nexus:era1_decay'
    },
    {
      id: 'legion_osea',
      name: 'Legion osea',
      table: 'nexus:era1_bones'
    },
    {
      id: 'carroneros',
      name: 'Carroneros del velo',
      table: 'nexus:era1_scavengers'
    }
  ],
  2: [
    {
      id: 'caceria',
      name: 'Caceria nocturna',
      table: 'nexus:era2_hunt'
    },
    {
      id: 'brote',
      name: 'Brote biohazard',
      table: 'nexus:era2_plague'
    },
    {
      id: 'incursion_imp',
      name: 'Incursion de los imps',
      table: 'nexus:era2_imps'
    }
  ],
  3: [
    {
      id: 'caos',
      name: 'Vanguardia del caos',
      table: 'nexus:era3_chaos'
    },
    {
      id: 'culto',
      name: 'Culto del umbral',
      table: 'nexus:era3_cult'
    },
    {
      id: 'brecha_demonica',
      name: 'Brecha demoniaca',
      table: 'nexus:era3_demons'
    }
  ],
  4: [
    {
      id: 'apocalipsis',
      name: 'Apocalipsis del Nexus',
      table: 'nexus:era4_apocalypse'
    },
    {
      id: 'infernal',
      name: 'Legion infernal',
      table: 'nexus:era4_infernal'
    },
    {
      id: 'arcano',
      name: 'Convergencia arcana',
      table: 'nexus:era4_arcane'
    }
  ]
}

const NEXUS_ERA_HORDE_REWARDS = {
  1: {
    silver: 2,
    gold: 0
  },
  2: {
    silver: 3,
    gold: 0
  },
  3: {
    silver: 5,
    gold: 0
  },
  4: {
    silver: 2,
    gold: 1
  }
}

const NEXUS_ERA_SILVER_COIN =
  'kubejs:nexus_silver_coin'

const NEXUS_ERA_GOLD_COIN =
  'kubejs:nexus_gold_coin'

const NEXUS_PROGRESSION_SCHEMA_VERSION = 1
const NEXUS_PROGRESSION_DEFAULT_QUORUM = 3
const NexusProgressionData = Java.loadClass(
  'dev.itscarlos.nexuscore.progression.KubeJsServerData'
)

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
let nexusEraRecoveryDeadlineTick = -1
let nexusEraAuthorizedCompletionSession = ''

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
    { short_name: 'Preparacion' },
    { short_name: 'Era I (config invalida)' },
    { short_name: 'Era II (config invalida)' },
    { short_name: 'Era III (config invalida)' },
    { short_name: 'Era IV (config invalida)' }
  ]
}

function nexusEraLoadDefinitions() {
  var nexusEraFallback = nexusEraFallbackDefinitions()
  var nexusEraRequired = NEXUS_PROGRESSION_DEFAULT_QUORUM
  try {
    var nexusEraRaw = JsonIO.read(NEXUS_ERA_CONFIG_PATH)
    var nexusEraConfiguredRequired =
      nexusEraRaw && nexusEraRaw.progression
        ? nexusEraRaw.progression.required_online_players
        : undefined

    var nexusEraConfiguredRequiredNumber =
      Number(nexusEraConfiguredRequired)

    if (
      typeof nexusEraConfiguredRequired === 'number' &&
      Number.isInteger(nexusEraConfiguredRequiredNumber) &&
      nexusEraConfiguredRequiredNumber >= 1 &&
      nexusEraConfiguredRequiredNumber <= 2147483647
    ) {
      nexusEraRequired =
        nexusEraConfiguredRequiredNumber
    } else {
      console.warn(
        '[Nexus Era] progression.required_online_players ausente o invalido; se usa 3.'
      )
    }

    NexusProgressionData.setRequiredOnlinePlayers(
      nexusEraRequired
    )

    if (!nexusEraRaw || !nexusEraRaw.eras) {
      throw new Error("Falta la propiedad 'eras'")
    }

    var nexusEraDefinitions = []
    var nexusEraValid = true

    for (
      var nexusEraDefinitionIndex = NEXUS_ERA_MIN;
      nexusEraDefinitionIndex <= NEXUS_ERA_MAX;
      nexusEraDefinitionIndex += 1
    ) {
      var nexusEraEntry =
        nexusEraRaw.eras[nexusEraDefinitionIndex]

      if (
        !nexusEraEntry ||
        Number(nexusEraEntry.id) !== nexusEraDefinitionIndex ||
        !nexusEraEntry.short_name ||
        !String(nexusEraEntry.short_name).trim()
      ) {
        nexusEraValid = false
        nexusEraDefinitions[nexusEraDefinitionIndex] =
          nexusEraFallback[nexusEraDefinitionIndex]

        console.error(
          `[Nexus Era] Definicion invalida para Era ${nexusEraDefinitionIndex}; avance automatico bloqueado.`
        )
      } else {
        nexusEraDefinitions[nexusEraDefinitionIndex] = {
          short_name:
            String(nexusEraEntry.short_name).trim()
        }
      }
    }

    console.info(
      `[Nexus Era] ${NEXUS_ERA_CONFIG_PATH}: valid=${nexusEraValid}, quorum=${nexusEraRequired}.`
    )

    return {
      valid: nexusEraValid,
      definitions: nexusEraDefinitions
    }
  } catch (nexusEraLoadError) {
    NexusProgressionData.setRequiredOnlinePlayers(
      nexusEraRequired
    )

    console.error(
      `[Nexus Era] No se pudo cargar ${NEXUS_ERA_CONFIG_PATH}; avance automatico bloqueado.`
    )
    console.error(nexusEraLoadError)

    return {
      valid: false,
      definitions: nexusEraFallback
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

  let nexusEraParsedDimension =
    value.substring(
      separator + 3
    )

  if (nexusEraParsedDimension.endsWith(']')) {
    nexusEraParsedDimension = nexusEraParsedDimension.substring(
      0,
      nexusEraParsedDimension.length - 1
    )
  }

  return nexusEraParsedDimension
}

function nexusEraDefinition(era) {
  return (
    era >= NEXUS_ERA_MIN &&
    era <= NEXUS_ERA_MAX
  )
    ? NEXUS_ERA_DEFINITIONS[era]
    : null
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

function nexusEraNormalizeThreatDay(value) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) return 0

  return Math.max(
    0,
    Math.min(
      NEXUS_ERA_MAX_THREAT_DAY,
      Math.floor(numeric)
    )
  )
}

function nexusEraThreatProfile(day) {
  const threatDay =
    nexusEraNormalizeThreatDay(day)

  if (threatDay < 30) {
    return { day: threatDay, tier: 1, label: 'I', base: 12 }
  }

  if (threatDay < 60) {
    return { day: threatDay, tier: 2, label: 'II', base: 14 }
  }

  if (threatDay < 90) {
    return { day: threatDay, tier: 3, label: 'III', base: 16 }
  }

  if (threatDay < 120) {
    return { day: threatDay, tier: 4, label: 'IV', base: 18 }
  }

  if (threatDay < 160) {
    return { day: threatDay, tier: 5, label: 'V', base: 20 }
  }

  if (threatDay < 220) {
    return { day: threatDay, tier: 6, label: 'VI', base: 21 }
  }

  return { day: threatDay, tier: 7, label: 'VII', base: 22 }
}

function nexusEraHordeWaveAmount(
  threatDay,
  participantCount,
  wave
) {
  const profile =
    nexusEraThreatProfile(threatDay)

  const participants = Math.max(
    0,
    Math.floor(Number(participantCount) || 0)
  )

  const participantBonus = Math.min(
    2,
    Math.max(0, participants - 1)
  )

  const waveIndex = Math.max(
    0,
    Math.min(
      NEXUS_ERA_HORDE_WAVE_OFFSETS.length - 1,
      Math.floor(Number(wave) || 1) - 1
    )
  )

  return Math.max(
    1,
    Math.min(
      NEXUS_ERA_HORDE_WAVE_HARD_CAP,
      profile.base +
        participantBonus +
        NEXUS_ERA_HORDE_WAVE_OFFSETS[waveIndex]
    )
  )
}

function nexusEraHordeWaveAmounts(
  threatDay,
  participantCount
) {
  return [1, 2, 3, 4].map(wave =>
    nexusEraHordeWaveAmount(
      threatDay,
      participantCount,
      wave
    )
  )
}
function nexusEraNormalizeProgression(data) {
  // Schema 1: conserva la Era y los hitos; el NBT temporal antiguo queda inerte.
  const era = data.getInt('nexusEra')
  if (era < NEXUS_ERA_MIN || era > NEXUS_ERA_MAX) {
    nexusEraLogErrorOnce('invalid_persisted_era',
      `[Nexus Era] Era persistida invalida (${era}); no se modifica ni se avanza.`)
    return false
  }
  const pending = data.getInt('nexusPendingEra')
  if (pending <= era) {
    if (pending !== -1) nexusEraClearPending(data)
  } else if (pending !== era + 1 || pending > NEXUS_ERA_MAX) {
    console.error(`[Nexus Era] Pending invalido ${pending} para Era ${era}; se descarta sin avanzar.`)
    nexusEraClearPending(data)
  }
  // Un pending legitimo prueba que el hito ya fue solicitado, incluso en mundos antiguos.
  const milestone = Math.max(era, data.getInt('nexusEraMilestoneCompleted'),
    data.getInt('nexusPendingEra'))
  if (data.getInt('nexusEraMilestoneCompleted') !== milestone) {
    data.putInt('nexusEraMilestoneCompleted', milestone)
  }
  if (data.getInt('nexusProgressionSchemaVersion') < NEXUS_PROGRESSION_SCHEMA_VERSION) {
    data.putInt('nexusProgressionSchemaVersion', NEXUS_PROGRESSION_SCHEMA_VERSION)
    console.info(`[Nexus Era] Migracion schema=1: era=${era}, pending=${data.getInt('nexusPendingEra')}, milestone=${milestone}.`)
  }
  return true
}

function nexusEraData(server) {
  const data =
    server.persistentData

  if (!data.contains('nexusEra')) {
    data.putInt('nexusEra', 0)
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

  if (!data.contains('nexusHordeTable')) {
    data.putString(
      'nexusHordeTable',
      ''
    )
  }

  if (!data.contains('nexusHordeTheme')) {
    data.putString(
      'nexusHordeTheme',
      ''
    )
  }

  if (!data.contains('nexusHordeEra')) {
    data.putInt(
      'nexusHordeEra',
      0
    )
  }

  if (!data.contains('nexusHordeThreatDay')) {
    data.putInt(
      'nexusHordeThreatDay',
      -1
    )
  }

  if (!data.contains('nexusMaxHordeThreatDay')) {
    data.putInt(
      'nexusMaxHordeThreatDay',
      -1
    )
  }

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    const storedThreatDay =
      data.getInt(
        'nexusHordeThreatDay'
      )

    const storedMaxThreatDay =
      data.getInt(
        'nexusMaxHordeThreatDay'
      )

    const recoveredThreatDay = Math.max(
      nexusEraNormalizeThreatDay(
        storedThreatDay >= 0
          ? storedThreatDay
          : data.getInt(
              'nexusHordeScheduledDay'
            )
      ),
      storedMaxThreatDay >= 0
        ? nexusEraNormalizeThreatDay(
            storedMaxThreatDay
          )
        : 0
    )

    if (storedThreatDay !== recoveredThreatDay) {
      data.putInt(
        'nexusHordeThreatDay',
        recoveredThreatDay
      )
    }

    if (storedMaxThreatDay !== recoveredThreatDay) {
      data.putInt(
        'nexusMaxHordeThreatDay',
        recoveredThreatDay
      )
    }
  }

  if (!data.contains('nexusLastHordeTable')) {
    data.putString(
      'nexusLastHordeTable',
      ''
    )
  }

  if (!data.contains('nexusPreviousHordeTable')) {
    data.putString(
      'nexusPreviousHordeTable',
      ''
    )
  }

  if (!data.contains('nexusLastHordeRewardedCount')) {
    data.putInt(
      'nexusLastHordeRewardedCount',
      0
    )
  }

  if (!data.contains('nexusLastHordeRewardSummary')) {
    data.putString(
      'nexusLastHordeRewardSummary',
      ''
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

  if (!data.contains('nexusEraMilestoneCompleted')) {
    data.putInt(
      'nexusEraMilestoneCompleted',
      0
    )
  }

  nexusEraNormalizeProgression(data)
  return data
}

function nexusEraClearGlobalHorde(data) {
  nexusEraAuthorizedCompletionSession = ''
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

  data.putString(
    'nexusHordeTable',
    ''
  )

  data.putString(
    'nexusHordeTheme',
    ''
  )

  data.putInt(
    'nexusHordeEra',
    0
  )

  data.putInt(
    'nexusHordeThreatDay',
    -1
  )
  data.putBoolean(
    'nexusHordeStartConfirmed',
    false
  )

  data.putString('nexusHordeSessionId', '')
  data.putString('nexusHordeBattleDimension', '')
  data.putString('nexusHordeBattleX', '')
  data.putString('nexusHordeBattleY', '')
  data.putString('nexusHordeBattleZ', '')
}

function nexusEraResetProduction(
  server
) {
  if (!server) {
    return {
      status: 'server_unavailable',
      history: null
    }
  }

  const data =
    nexusEraData(server)

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return {
      status: 'horde_active',
      history: null
    }
  }

  // Limpia cualquier estado temporal de una tentativa de Horda.
  nexusEraPendingStart = null
  nexusEraRecoveryPending = false
  nexusEraRecoveryAtTick = -1
  nexusEraRecoveryDeadlineTick = -1
  nexusEraAuthorizedCompletionSession = ''
  nexusEraLoggedStartFailureDay = -1
  nexusEraHistoryStagesLoadSyncAtTick = -1

  nexusEraObservedNativeHordes.clear()

  server.players.forEach(player => {
    nexusEraCleanupAuxiliaryState(
      player
    )
  })

  // Devuelve la progresion global a Preparacion.
  data.putInt(
    'nexusEra',
    0
  )

  data.putInt(
    'nexusEraMilestoneCompleted',
    0
  )

  nexusEraClearPending(
    data
  )

  // Elimina todo el historial y la programacion de Hordas de prueba.
  nexusEraClearGlobalHorde(
    data
  )

  data.putInt(
    'nexusLastHordeCompletedDay',
    -1
  )

  data.putInt(
    'nexusNextHordeDay',
    -1
  )

  data.putInt(
    'nexusLastHordeStartedDay',
    -1
  )

  data.putString(
    'nexusLastHordeTable',
    ''
  )

  data.putString(
    'nexusPreviousHordeTable',
    ''
  )

  data.putInt(
    'nexusLastHordeRewardedCount',
    0
  )

  data.putString(
    'nexusLastHordeRewardSummary',
    ''
  )

  data.putString(
    'nexusHordeLastFailureReason',
    ''
  )

  data.putString('nexusHordeRewardCommittedSession', '')
  data.putString('nexusHordeQuarantinedOwnerUUIDs', '[]')

  data.putInt(
    'nexusMaxHordeThreatDay',
    -1
  )
  const history =
    syncHistoryStages(
      server,
      0,
      'production_reset'
    )

  console.warn(
    '[Nexus Era] Reinicio integral de produccion ejecutado; ' +
    `historySync=${history.ok}.`
  )

  return {
    status: 'reset',
    history: history
  }
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

  const eligibleOnline =
    NexusProgressionData
      .countEligibleOnlinePlayers(server)

  const hordeActive =
    data.getBoolean(
      'nexusHordeActive'
    )

  const activeThreatDay =
    data.getInt(
      'nexusHordeThreatDay'
    )

  const maxThreatDay =
    data.getInt(
      'nexusMaxHordeThreatDay'
    )

  const diagnosticThreatDay =
    hordeActive && activeThreatDay >= 0
      ? activeThreatDay
      : Math.max(
          currentDay === null
            ? 0
            : nexusEraNormalizeThreatDay(
                currentDay
              ),
          nexusEraNormalizeThreatDay(
            maxThreatDay
          )
        )

  const diagnosticThreat =
    nexusEraThreatProfile(
      diagnosticThreatDay
    )

  const diagnosticParticipants =
    Math.max(
      1,
      hordeActive
        ? data.getInt(
            'nexusHordeParticipantCount'
          )
        : eligibleOnline
    )

  const diagnosticEra = Math.max(
    NEXUS_ERA_MIN,
    Math.min(
      NEXUS_ERA_MAX,
      hordeActive
        ? data.getInt('nexusHordeEra')
        : era
    )
  )

  const diagnosticWaveAmounts =
    nexusEraHordeWaveAmounts(
      diagnosticThreat.day,
      diagnosticParticipants
    )

  return [
    `Era global: ${era} (${nexusEraName(era)})`,

    `Configuracion de eras valida: ${NEXUS_ERA_CONFIG.valid}`,

    'Progresion global permanente',

    `Jugadores elegibles: ${eligibleOnline} / ${NexusProgressionData.requiredOnlinePlayers()}`,

    `Dia del mundo: ${
      currentDay === null
        ? 'no disponible'
        : currentDay
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

    `Horda global activa: ${hordeActive}`,

    `Tema activo: ${
      data.getString(
        'nexusHordeTheme'
      ) || 'ninguno'
    }`,

    `Tabla activa: ${
      data.getString(
        'nexusHordeTable'
      ) || 'ninguna'
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

    `Amenaza efectiva: nivel ${diagnosticThreat.label} (dia ${diagnosticThreat.day}, base ${diagnosticThreat.base})`,

    `Dia de amenaza activo: ${nexusEraDayLabel(activeThreatDay, 'ninguno')}`,

    `Maximo historico de amenaza: ${nexusEraDayLabel(maxThreatDay, 'ninguno')}`,

    `Oleadas previstas (${diagnosticParticipants} participante(s)): ${diagnosticWaveAmounts.join(', ')}`,

    `Manifestacion final: ${NEXUS_ERA_FINISHER_TABLES[diagnosticEra] || 'bloqueada hasta Era 1'}`,

    `Ultima recompensa: ${
      data.getString(
        'nexusLastHordeRewardSummary'
      ) || 'ninguna'
    } para ${
      data.getInt(
        'nexusLastHordeRewardedCount'
      )
    } jugador(es)`,

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

    `Siguiente era: ${nextEra < 0 ? 'completado' : nexusEraName(nextEra)}`
  ]
}
function nexusEraClearPending(data) {
  data.putInt(
    'nexusPendingEra',
    -1
  )

}

function syncHistoryStages(
  nexusHistoryServer,
  nexusHistoryEra,
  nexusHistoryMoment
) {
  var nexusHistoryResult = {
    ok: false,
    error: '',
    era: Number(nexusHistoryEra),
    ironResult: 0,
    diamondResult: 0,
    arcaneIndustrialResult: 0,
    nexusResult: 0
  }

  if (!nexusHistoryServer) {
    nexusHistoryResult.error =
      'server_unavailable'

    return nexusHistoryResult
  }

  if (
    !Platform.isLoaded(
      'historystages'
    )
  ) {
    nexusHistoryResult.error =
      'mod_unavailable'

    console.error(
      `[Nexus Era] History Stages no disponible; moment=${nexusHistoryMoment}.`
    )

    return nexusHistoryResult
  }

  try {
    var nexusHistoryEraNumber =
      Number(nexusHistoryEra)

    if (
      !Number.isInteger(nexusHistoryEraNumber) ||
      nexusHistoryEraNumber < NEXUS_ERA_MIN ||
      nexusHistoryEraNumber > NEXUS_ERA_MAX
    ) {
      throw new Error(
        `Era persistida invalida: ${nexusHistoryEra}; History Stages no se modifica.`
      )
    }

    var nexusHistoryStageManager =
      Java.loadClass(
        'net.bananemdnsa.historystages.data.StageManager'
      )

    var nexusHistoryStageData =
      Java.loadClass(
        'net.bananemdnsa.historystages.util.StageData'
      )

    var nexusHistoryStageIds = [
      NEXUS_HISTORY_IRON_STAGE,
      NEXUS_HISTORY_DIAMOND_STAGE,
      NEXUS_HISTORY_ARCANE_INDUSTRIAL_STAGE,
      NEXUS_HISTORY_NEXUS_STAGE
    ]

    var nexusHistoryRegistryIndex = 0

    for (
      nexusHistoryRegistryIndex = 0;
      nexusHistoryRegistryIndex < nexusHistoryStageIds.length;
      nexusHistoryRegistryIndex += 1
    ) {
      if (
        !nexusHistoryStageManager
          .getStages()
          .containsKey(
            nexusHistoryStageIds[nexusHistoryRegistryIndex]
          )
      ) {
        throw new Error(
          `Stage global no registrado: ${nexusHistoryStageIds[nexusHistoryRegistryIndex]}`
        )
      }
    }

    nexusHistoryEraNumber = Math.max(
      NEXUS_ERA_MIN,
      Math.min(
        NEXUS_ERA_MAX,
        nexusHistoryEraNumber
      )
    )

    nexusHistoryResult.era =
      nexusHistoryEraNumber

    nexusHistoryResult.ironResult =
      Number(
        nexusHistoryServer.runCommandSilent(
          `history global ${
            nexusHistoryEraNumber >= 1
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_IRON_STAGE}`
        )
      )

    nexusHistoryResult.diamondResult =
      Number(
        nexusHistoryServer.runCommandSilent(
          `history global ${
            nexusHistoryEraNumber >= 2
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_DIAMOND_STAGE}`
        )
      )

    nexusHistoryResult.arcaneIndustrialResult =
      Number(
        nexusHistoryServer.runCommandSilent(
          `history global ${
            nexusHistoryEraNumber >= 3
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_ARCANE_INDUSTRIAL_STAGE}`
        )
      )

    nexusHistoryResult.nexusResult =
      Number(
        nexusHistoryServer.runCommandSilent(
          `history global ${
            nexusHistoryEraNumber >= 4
              ? 'unlock'
              : 'lock'
          } ${NEXUS_HISTORY_NEXUS_STAGE}`
        )
      )

    var nexusHistoryUnlockedStages =
      nexusHistoryStageData
        .get(
          nexusEraOverworld(
            nexusHistoryServer
          )
        )
        .getUnlockedStages()

    var nexusHistoryVerifyIndex = 0

    for (
      nexusHistoryVerifyIndex = 0;
      nexusHistoryVerifyIndex < nexusHistoryStageIds.length;
      nexusHistoryVerifyIndex += 1
    ) {
      if (
        nexusHistoryUnlockedStages.contains(
          nexusHistoryStageIds[nexusHistoryVerifyIndex]
        ) !==
        (
          nexusHistoryEraNumber >=
          nexusHistoryVerifyIndex + 1
        )
      ) {
        throw new Error(
          `History Stages no reconcilio ${nexusHistoryStageIds[nexusHistoryVerifyIndex]} para Era ${nexusHistoryEraNumber}`
        )
      }
    }

    nexusHistoryResult.ok = true

    console.info(
      `[Nexus Era] History Stages ejecutado: ` +
      `moment=${nexusHistoryMoment}, era=${nexusHistoryEraNumber}, ` +
      `iron=${nexusHistoryResult.ironResult}, ` +
      `diamond=${nexusHistoryResult.diamondResult}, ` +
      `arcaneIndustrial=${nexusHistoryResult.arcaneIndustrialResult}, ` +
      `nexus=${nexusHistoryResult.nexusResult}.`
    )
  } catch (nexusHistorySyncError) {
    nexusHistoryResult.error =
      String(nexusHistorySyncError)

    console.error(
      'Nexus Realms: fallo al sincronizar History Stages'
    )

    console.error(
      nexusHistorySyncError
    )
  }

  return nexusHistoryResult
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

    return 'unchanged'
  }

  data.putInt(
    'nexusEra',
    newEra
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

function nexusEraRequestAdvance(server, targetEra) {
  const data = nexusEraData(server)
  const currentEra = data.getInt('nexusEra')
  if (!nexusEraNormalizeProgression(data)) return { status: 'invalid' }
  if (currentEra >= NEXUS_ERA_MAX) return { status: 'maximum', era: currentEra }
  if (targetEra <= currentEra) return { status: 'already', era: currentEra }
  if (!Number.isInteger(targetEra) || targetEra !== currentEra + 1) {
    return { status: 'invalid_target', expected: currentEra + 1 }
  }

  data.putInt('nexusEraMilestoneCompleted',
    Math.max(data.getInt('nexusEraMilestoneCompleted'), targetEra))
  data.putInt('nexusPendingEra', targetEra)

  const blocked = nexusEraAdvanceBlocker(server, data)
  if (blocked) return { status: blocked, era: targetEra,
    eligible: NexusProgressionData.countEligibleOnlinePlayers(server),
    required: NexusProgressionData.requiredOnlinePlayers() }
  const result = nexusEraSet(server, targetEra)
  return { status: result === 'changed' ? 'advanced' : result, era: targetEra }
}

function nexusEraAdvanceBlocker(server, data) {
  if (!NEXUS_ERA_CONFIG.valid) return 'invalid_config'
  if (data.getBoolean('nexusHordeActive')) return 'awaiting_horde_end'
  if (NexusProgressionData.countEligibleOnlinePlayers(server) <
      NexusProgressionData.requiredOnlinePlayers()) return 'awaiting_players'
  return null
}

function nexusEraTryAdvancePending(server) {
  const data = nexusEraData(server)
  if (!nexusEraNormalizeProgression(data)) return false
  const era = data.getInt('nexusEra')
  const pending = data.getInt('nexusPendingEra')
  if (pending !== era + 1 || pending > NEXUS_ERA_MAX ||
      data.getInt('nexusEraMilestoneCompleted') < pending) return false
  if (nexusEraAdvanceBlocker(server, data)) return false
  return nexusEraSet(server, pending) === 'changed'
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
    result.status === 'awaiting_players'
  ) {
    nexusEraReply(source,
      `Hito de Era ${result.era} registrado; esperando jugadores (${result.eligible}/${result.required}).`)
  } else if (
    result.status === 'invalid_config'
  ) {
    nexusEraReply(source,
      'Hito registrado; avance pendiente por configuracion de eras invalida. Revisa el log.')
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
      !player.isCreative() &&
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

function nexusEraHordeThemeHash(value) {
  const text =
    String(value)

  let hash = 0

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    hash = (
      (
        hash * 31
      ) +
      text.charCodeAt(index)
    ) | 0
  }

  return Math.abs(hash)
}

function nexusEraChooseHordeTheme(
  data,
  era,
  currentDay
) {
  const themes =
    NEXUS_ERA_HORDE_THEMES[era] ||
    NEXUS_ERA_HORDE_THEMES[1]

  const lastTable =
    data.getString(
      'nexusLastHordeTable'
    )

  const previousTable =
    data.getString(
      'nexusPreviousHordeTable'
    )

  let available =
    themes.filter(theme =>
      theme.table !== lastTable &&
      theme.table !== previousTable
    )

  if (available.length === 0) {
    available =
      themes.filter(theme =>
        theme.table !== lastTable
      )
  }

  if (available.length === 0) {
    available = themes.slice()
  }

  const seed =
    `${currentDay}:${era}:${lastTable}:${previousTable}`

  const index =
    nexusEraHordeThemeHash(seed) %
    available.length

  return available[index]
}

function nexusEraSameNativeHorde(left, right) {
  if (left === right) return true
  if (!left || !right) return false

  try {
    return left.equals(right)
  } catch (ignored) {
    return false
  }
}

function nexusEraParticipantIds(data) {
  try {
    var nexusEraParticipantJson =
      JSON.parse(
        data.getString(
          'nexusHordeParticipantUUIDs'
        ) || '[]'
      )

    if (!Array.isArray(nexusEraParticipantJson)) {
      return []
    }

    var nexusEraUniqueParticipantIds = []
    var nexusEraSeenParticipantIds = new Set()

    nexusEraParticipantJson.forEach(value => {
      var nexusEraCandidateParticipantId =
        String(value || '').trim().toLowerCase()

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          nexusEraCandidateParticipantId
        ) ||
        nexusEraSeenParticipantIds.has(
          nexusEraCandidateParticipantId
        )
      ) {
        return
      }

      nexusEraSeenParticipantIds.add(
        nexusEraCandidateParticipantId
      )

      nexusEraUniqueParticipantIds.push(
        nexusEraCandidateParticipantId
      )
    })

    return nexusEraUniqueParticipantIds
  } catch (error) {
    nexusEraLogErrorOnce(
      'participant-json',
      'Nexus Realms: no se pudo leer la lista de participantes de la Horda.',
      error
    )

    return []
  }
}

function nexusEraHordeReward(era) {
  return (
    NEXUS_ERA_HORDE_REWARDS[era] ||
    NEXUS_ERA_HORDE_REWARDS[1]
  )
}

function nexusEraHordeRewardText(reward) {
  const parts = []

  if (reward.gold > 0) {
    parts.push(
      `${reward.gold} moneda${reward.gold === 1 ? '' : 's'} de oro`
    )
  }

  if (reward.silver > 0) {
    parts.push(
      `${reward.silver} moneda${reward.silver === 1 ? '' : 's'} de plata`
    )
  }

  return parts.length > 0
    ? parts.join(' y ')
    : 'sin recompensa'
}

function nexusEraRewardHordeParticipants(
  server,
  data,
  anchor
) {
  const battleDimension = data.getString(
    'nexusHordeBattleDimension'
  )
  const battleX = Number(data.getString('nexusHordeBattleX'))
  const battleY = Number(data.getString('nexusHordeBattleY'))
  const battleZ = Number(data.getString('nexusHordeBattleZ'))
  const era =
    Math.max(
      1,
      Math.min(
        4,
        data.getInt(
          'nexusHordeEra'
        ) ||
        data.getInt(
          'nexusEra'
        ) ||
        1
      )
    )

  const reward =
    nexusEraHordeReward(era)

  const participantIds =
    nexusEraParticipantIds(data)

  const rewarded = []
  const skipped = []

  participantIds.forEach(
    participantId => {
      const participant =
        nexusEraFindOnlinePlayer(
          server,
          participantId
        )

      if (!participant) {
        skipped.push(
          `${participantId}:offline`
        )

        return
      }

      try {
        if (
          !nexusEraIsValidAnchor(
            participant
          )
        ) {
          skipped.push(
            `${participantId}:invalid_combat_state`
          )

          return
        }

        const dx = Number(participant.getX()) - battleX
        const dy = Number(participant.getY()) - battleY
        const dz = Number(participant.getZ()) - battleZ

        if (
          nexusEraDimensionId(participant.level) !== battleDimension ||
          dx * dx + dy * dy + dz * dz > NEXUS_ERA_PARTICIPANT_RADIUS_SQR
        ) {
          skipped.push(
            `${participantId}:far`
          )

          return
        }
      } catch (error) {
        skipped.push(
          `${participantId}:position_error`
        )

        return
      }

      const participantName =
        String(
          participant
            .getGameProfile()
            .getName()
        )

      if (reward.gold > 0) {
        server.runCommandSilent(
          `give ${participantName} ${NEXUS_ERA_GOLD_COIN} ${reward.gold}`
        )
      }

      if (reward.silver > 0) {
        server.runCommandSilent(
          `give ${participantName} ${NEXUS_ERA_SILVER_COIN} ${reward.silver}`
        )
      }

      participant.tell(
        `§6Recompensa de la Horda: §f${nexusEraHordeRewardText(reward)}.`
      )

      rewarded.push(
        participantId
      )
    }
  )

  data.putInt(
    'nexusLastHordeRewardedCount',
    rewarded.length
  )

  data.putString(
    'nexusLastHordeRewardSummary',
    nexusEraHordeRewardText(
      reward
    )
  )

  console.info(
    `[Nexus Horde] Recompensa de Era ${era}: ` +
    `${nexusEraHordeRewardText(reward)}; ` +
    `rewarded=${rewarded.length}; ` +
    `skipped=${skipped.length}.`
  )

  return {
    era: era,
    reward: reward,
    rewarded: rewarded,
    skipped: skipped
  }
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

function nexusEraHordeBossbarRemove(server, playerId) {
  if (!server || !playerId) return
  try {
    const safeId = String(playerId).replace(/-/g, '')
    server.runCommandSilent(`bossbar remove nexus:horde_${safeId}`)
  } catch (ignored) {
    // A missing bossbar is already clean.
  }
}

function nexusEraQuarantinedOwners(data) {
  try {
    const parsed = JSON.parse(data.getString('nexusHordeQuarantinedOwnerUUIDs') || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch (ignored) {
    return []
  }
}

function nexusEraQuarantineOwner(data, playerId) {
  const owners = nexusEraQuarantinedOwners(data)
  const id = String(playerId || '')
  if (id && !owners.includes(id)) owners.push(id)
  data.putString('nexusHordeQuarantinedOwnerUUIDs', JSON.stringify(owners))
}

function nexusEraReleaseQuarantinedOwner(data, playerId) {
  const id = String(playerId || '')
  data.putString(
    'nexusHordeQuarantinedOwnerUUIDs',
    JSON.stringify(nexusEraQuarantinedOwners(data).filter(ownerId => ownerId !== id))
  )
}

function nexusEraClaimGlobalHorde(
  data,
  anchor,
  currentDay,
  participants,
  theme
) {
  const sessionId =
    `${currentDay}-${nexusEraServerTicks}-${String(anchor.uuid)}`

  const effectiveThreatDay = Math.max(
    nexusEraNormalizeThreatDay(
      currentDay
    ),
    nexusEraNormalizeThreatDay(
      data.getInt(
        'nexusMaxHordeThreatDay'
      )
    )
  )

  data.putBoolean(
    'nexusHordeActive',
    true
  )

  data.putString('nexusHordeSessionId', sessionId)
  data.putString(
    'nexusHordeBattleDimension',
    nexusEraDimensionId(anchor.level)
  )
  data.putString('nexusHordeBattleX', String(Number(anchor.getX())))
  data.putString('nexusHordeBattleY', String(Number(anchor.getY())))
  data.putString('nexusHordeBattleZ', String(Number(anchor.getZ())))

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

  data.putString(
    'nexusHordeTable',
    String(
      theme.table
    )
  )

  data.putString(
    'nexusHordeTheme',
    String(
      theme.name
    )
  )

  data.putInt(
    'nexusHordeEra',
    data.getInt(
      'nexusEra'
    )
  )

  data.putInt(
    'nexusHordeThreatDay',
    effectiveThreatDay
  )

  data.putInt(
    'nexusMaxHordeThreatDay',
    effectiveThreatDay
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

  const confirmedTable =
    data.getString(
      'nexusHordeTable'
    )

  if (confirmedTable) {
    data.putString(
      'nexusPreviousHordeTable',
      data.getString(
        'nexusLastHordeTable'
      )
    )

    data.putString(
      'nexusLastHordeTable',
      confirmedTable
    )
  }

  nexusEraPendingStart = null
  nexusEraLoggedStartFailureDay = -1

  console.info(
    `[Nexus Horde] Inicio nativo confirmado para ${String(player.uuid)} ` +
    `en el dia ${currentDay}; ` +
    `theme=${data.getString('nexusHordeTheme')}; ` +
    `table=${data.getString('nexusHordeTable')}.`
  )
}

// Compatibilidad con The Hordes.
// 1.6.3f usa isActive(ServerPlayer).
// Versiones posteriores pueden usar isActive().
function nexusEraNativeHordeIsActive(
  horde,
  player
) {
  if (!horde || !player) {
    return false
  }

  try {
    return Boolean(
      horde.isActive()
    )
  } catch (noArgumentMethodUnavailable) {
    return Boolean(
      horde.isActive(player)
    )
  }
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
        nexusEraNativeHordeIsActive(
          pending.horde,
          player
        )
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

function nexusEraCompleteHorde(
  player,
  expectedAnchorId,
  expectedSessionId
) {
  if (!player) return false

  const server =
    player.getServer()

  const data =
    nexusEraData(server)

  const playerId = String(player.uuid)
  const anchorId = expectedAnchorId
    ? String(expectedAnchorId)
    : data.getString('nexusHordeAnchorUUID')
  const sessionId = expectedSessionId
    ? String(expectedSessionId)
    : nexusEraAuthorizedCompletionSession

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
    ) !== anchorId ||
    playerId !== anchorId
  ) {
    return false
  }

  if (
    !sessionId ||
    data.getString('nexusHordeSessionId') !== sessionId ||
    data.getString('nexusHordeRewardCommittedSession') === sessionId ||
    nexusEraAuthorizedCompletionSession !== sessionId
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
    anchorId
  )

  // Commit before issuing give commands: a repeated callback can never pay twice.
  data.putString('nexusHordeRewardCommittedSession', sessionId)
  nexusEraAuthorizedCompletionSession = ''

  const completedTheme =
    data.getString(
      'nexusHordeTheme'
    )

  let rewardResult = { rewarded: [], skipped: [] }
  try {
    rewardResult = nexusEraRewardHordeParticipants(
      server,
      data,
      player
    )
  } catch (error) {
    data.putString('nexusHordeLastFailureReason', 'reward_delivery_error')
    nexusEraLogErrorOnce(
      `reward:${sessionId}:${String(error)}`,
      `[Nexus Horde] La sesión ${sessionId.slice(0, 12)} cerró con un fallo no reintentable al entregar recompensas.`,
      error
    )
  } finally {
    // The session was already committed. Always release the global calendar
    // lock; retrying commands here could duplicate a partially paid reward.
    nexusEraClearGlobalHorde(data)
  }

  console.info(
    `[Nexus Horde] Evento completado en el dia ${completedDay}; ` +
    `theme=${completedTheme || 'unknown'}; ` +
    `rewarded=${rewardResult.rewarded.length}.`
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

  const hordeTheme =
    nexusEraChooseHordeTheme(
      data,
      data.getInt(
        'nexusEra'
      ),
      currentDay
    )

  nexusEraClaimGlobalHorde(
    data,
    anchor,
    currentDay,
    selection.participants,
    hordeTheme
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
          `hordes start ${anchorName} 0 ${hordeTheme.table}`
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
    nexusEraRecoveryDeadlineTick = -1
    return
  }

  const anchorId = data.getString('nexusHordeAnchorUUID')
  const player = nexusEraFindOnlinePlayer(server, anchorId)

  if (!player && nexusEraServerTicks < nexusEraRecoveryDeadlineTick) return

  let commandResult = 0

  if (player && data.getBoolean('nexusHordeStartConfirmed')) {
    try {
      commandResult =
        Number(
          server.runCommandSilent(
            `hordes stop ${String(player.getGameProfile().getName())}`
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

  if (!player && data.getBoolean('nexusHordeStartConfirmed')) {
    nexusEraQuarantineOwner(data, anchorId)
  }

  if (player) nexusEraCleanupAuxiliaryState(player)

  nexusEraReprogramNextMidnight(server, data)

  nexusEraHordeBossbarRemove(server, anchorId)

  nexusEraObservedNativeHordes.delete(
    anchorId
  )

  nexusEraPendingStart = null
  nexusEraRecoveryPending = false
  nexusEraRecoveryAtTick = -1
  nexusEraRecoveryDeadlineTick = -1
  nexusEraAuthorizedCompletionSession = ''

  console.warn(
    `[Nexus Horde] Horda persistida cancelada y reprogramada tras reinicio; ` +
    `ownerOnline=${Boolean(player)} commandResult=${commandResult}.`
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

  let nativeTable = ''
  try {
    nativeTable = String(horde.getSpawnTable().getName())
  } catch (error) {
    nexusEraLogErrorOnce(
      `start-table:${playerId}:${String(error)}`,
      '[Nexus Horde] No se pudo correlacionar la tabla del evento nativo.',
      error
    )
  }

  if (
    nexusEraPendingStart &&
    nexusEraPendingStart.playerId ===
    playerId &&
    nativeTable === nexusEraData(player.getServer()).getString('nexusHordeTable')
  ) {
    nexusEraObservedNativeHordes.set(
      playerId,
      horde
    )

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

  if (
    !data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return
  }

  const anchorId = data.getString(
    'nexusHordeAnchorUUID'
  )

  const observedHorde =
    nexusEraObservedNativeHordes.get(
      anchorId
    )

  if (
    anchorId !== playerId ||
    !nexusEraSameNativeHorde(observedHorde, event.getHorde())
  ) {
    return
  }

  nexusEraObservedNativeHordes.delete(
    anchorId
  )

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
    const sessionId = data.getString('nexusHordeSessionId')
    if (!nexusEraCompleteHorde(
      player,
      anchorId,
      sessionId
    )) {
      // Any native end that was not explicitly authorized by the Director is
      // an abort, never a victory, and must not leave the calendar deadlocked.
      nexusEraAbortSession(
        server,
        sessionId,
        anchorId,
        'unauthorized_native_end'
      )
    }
  }
}

function nexusEraOwnsHorde(horde, player) {
  if (!horde || !player) return false
  const observed = nexusEraObservedNativeHordes.get(String(player.uuid))
  return nexusEraSameNativeHorde(observed, horde)
}

function nexusEraAuthorizeCompletion(horde, player, sessionId) {
  if (!nexusEraOwnsHorde(horde, player)) return false
  const data = nexusEraData(player.getServer())
  const expected = data.getString('nexusHordeSessionId')
  if (!data.getBoolean('nexusHordeActive')
      || data.getString('nexusHordeAnchorUUID') !== String(player.uuid)
      || !expected
      || expected !== String(sessionId)
      || data.getString('nexusHordeRewardCommittedSession') === expected) return false
  nexusEraAuthorizedCompletionSession = expected
  return true
}

function nexusEraRevokeCompletion(sessionId) {
  if (nexusEraAuthorizedCompletionSession === String(sessionId)) {
    nexusEraAuthorizedCompletionSession = ''
  }
}

function nexusEraAbortSession(server, sessionId, ownerId, reason) {
  if (!server) return false
  const data = nexusEraData(server)
  if (!data.getBoolean('nexusHordeActive')
      || data.getString('nexusHordeSessionId') !== String(sessionId)
      || data.getString('nexusHordeAnchorUUID') !== String(ownerId)) return false
  nexusEraAuthorizedCompletionSession = ''
  nexusEraObservedNativeHordes.delete(String(ownerId))
  data.putString('nexusHordeLastFailureReason', String(reason || 'director_abort'))
  const owner = nexusEraFindOnlinePlayer(server, String(ownerId))
  if (owner) nexusEraCleanupAuxiliaryState(owner)
  else if (data.getBoolean('nexusHordeStartConfirmed')) {
    nexusEraQuarantineOwner(data, ownerId)
  }
  nexusEraHordeBossbarRemove(server, ownerId)
  nexusEraPendingStart = null
  nexusEraReprogramNextMidnight(server, data)
  console.warn(
    `[Nexus Horde] session=${String(sessionId).slice(0, 12)} abortada sin recompensa; reason=${reason}.`
  )
  return true
}

function nexusEraOnPlayerLogin(player) {
  if (!player) return false
  const data = nexusEraData(player.getServer())
  const playerId = String(player.uuid)
  if (!nexusEraQuarantinedOwners(data).includes(playerId)) return false
  try {
    const bridge = Java.loadClass('dev.itscarlos.nexuscore.horde.HordeNativeBridge')
    const stopped = Boolean(bridge.stopActiveEvent(player))
    nexusEraReleaseQuarantinedOwner(data, playerId)
    console.warn(`[Nexus Horde] owner en cuarentena saneado ${playerId}; nativeStopped=${stopped}.`)
    return true
  } catch (error) {
    nexusEraLogErrorOnce(
      `quarantine:${playerId}:${String(error)}`,
      `[Nexus Horde] No se pudo sanear el owner en cuarentena ${playerId}.`,
      error
    )
    return false
  }
}

function nexusEraHordeContext(server) {
  if (!server) return null

  const data = nexusEraData(server)

  if (
    !data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    return null
  }

  const participantIds =
    nexusEraParticipantIds(data)

  const participantCount = Math.max(
    1,
    participantIds.length
  )

  const era = Math.max(
    NEXUS_ERA_MIN,
    Math.min(
      NEXUS_ERA_MAX,
      data.getInt('nexusHordeEra')
    )
  )

  const threat =
    nexusEraThreatProfile(
      data.getInt(
        'nexusHordeThreatDay'
      )
    )

  return {
    sessionId: data.getString('nexusHordeSessionId'),
    anchorId: data.getString(
      'nexusHordeAnchorUUID'
    ),
    battleCenter: {
      dimensionId: data.getString('nexusHordeBattleDimension'),
      x: Number(data.getString('nexusHordeBattleX')),
      y: Number(data.getString('nexusHordeBattleY')),
      z: Number(data.getString('nexusHordeBattleZ'))
    },
    participantIds: participantIds,
    participantCount: participantCount,
    era: era,
    scheduledDay: data.getInt(
      'nexusHordeScheduledDay'
    ),
    threatDay: threat.day,
    maxThreatDay: nexusEraNormalizeThreatDay(
      data.getInt(
        'nexusMaxHordeThreatDay'
      )
    ),
    threatTier: threat.tier,
    threatLabel: threat.label,
    baseWaveAmount: threat.base,
    waveAmounts:
      nexusEraHordeWaveAmounts(
        threat.day,
        participantCount
      ),
    table: data.getString(
      'nexusHordeTable'
    ),
    theme: data.getString(
      'nexusHordeTheme'
    ),
    finisherTable:
      NEXUS_ERA_FINISHER_TABLES[era]
  }
}

function nexusEraHordeIsActive(server) {
  return Boolean(server && nexusEraData(server).getBoolean('nexusHordeActive'))
}
// API llamada desde:
// kubejs/startup_scripts/nexus_era_calendar_forge_bridge.js

global.NexusEraCalendar = {
  onHordeStart:
    nexusEraBridgeOnHordeStart,

  onHordeEnd:
    nexusEraBridgeOnHordeEnd,

  getHordeContext:
    nexusEraHordeContext,

  isHordeActive:
    nexusEraHordeIsActive,

  ownsHorde:
    nexusEraOwnsHorde,

  authorizeCompletion:
    nexusEraAuthorizeCompletion,

  revokeCompletion:
    nexusEraRevokeCompletion,

  abortSession:
    nexusEraAbortSession,

  onPlayerLogin:
    nexusEraOnPlayerLogin,

  getThreatProfile:
    nexusEraThreatProfile,

  getWaveAmount:
    nexusEraHordeWaveAmount
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
                'awaiting_players',
                'invalid_config',
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
                  'awaiting_players',
                  'invalid_config',
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
            'reset_production'
          )
            .requires(
              source =>
                source.hasPermission(4)
            )
            .executes(ctx => {
              nexusEraReply(
                ctx.source,
                'ATENCION: este comando borra la progresion global de pruebas. ' +
                'Usa /nexus_era reset_production confirm.'
              )

              return 0
            })
            .then(
              Commands.literal('confirm')
                .executes(ctx => {
                  const result =
                    nexusEraResetProduction(
                      ctx.source.server
                    )

                  if (
                    result.status ===
                    'horde_active'
                  ) {
                    nexusEraReply(
                      ctx.source,
                      'No se puede ejecutar el reinicio integral durante una Horda activa.'
                    )

                    return 0
                  }

                  if (
                    result.status ===
                    'server_unavailable'
                  ) {
                    nexusEraReply(
                      ctx.source,
                      'El servidor no esta disponible.'
                    )

                    return 0
                  }

                  nexusEraReply(
                    ctx.source,
                    'Reinicio integral completado: Era 0, ' +
                    'hitos, Hordas, recompensas y avances de prueba eliminados.'
                  )

                  if (
                    result.history &&
                    !result.history.ok
                  ) {
                    nexusEraReply(
                      ctx.source,
                      'Aviso: no se pudo sincronizar History Stages: ' +
                      `${result.history.error}. Usa /nexus_era sync tras corregirlo.`
                    )
                  } else {
                    nexusEraReply(
                      ctx.source,
                      'History Stages sincronizado y bloqueado para Era 0.'
                    )
                  }

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

  }
)

ServerEvents.loaded(event => {
  nexusEraHistoryStagesLoadSyncAtTick =
    nexusEraServerTicks + NEXUS_ERA_RECOVERY_DELAY_TICKS
  const data =
    nexusEraData(
      event.server
    )

  if (
    data.getBoolean(
      'nexusHordeActive'
    )
  ) {
    nexusEraRecoveryPending = true

    nexusEraRecoveryAtTick =
      nexusEraServerTicks +
      NEXUS_ERA_RECOVERY_DELAY_TICKS

    nexusEraRecoveryDeadlineTick =
      nexusEraServerTicks +
      NEXUS_ERA_RECOVERY_TIMEOUT_TICKS

    console.warn(
      '[Nexus Horde] Horda persistida detectada; ' +
      'se cancelara y reprogramara con recuperacion finita.'
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
