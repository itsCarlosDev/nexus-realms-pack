// Authoritative transactional class changes for Nexus Realms.

const NEXUS_CLASS_CHANGE_COST_LEVELS = 41
const NEXUS_CLASS_CHANGE_COOLDOWN_MS = 12 * 60 * 60 * 1000
const NEXUS_CLASS_CHANGE_CLOCK_TOLERANCE_MS = 60 * 1000
const NEXUS_CLASS_CHANGE_MAX_RECOVERY_ATTEMPTS = 3
const NEXUS_CLASS_CHANGE_JOURNAL_VERSION = 2
const NEXUS_STARTER_KIT_LEDGER_VERSION = 1
const NEXUS_STARTER_KIT_MANIFEST_VERSION = 1

const NEXUS_CLASS_CHANGE_KEYS = {
  journalVersion: 'nexus_class_change_journal_version',
  phase: 'nexus_class_change_phase',
  txId: 'nexus_class_change_tx_id',
  oldClass: 'nexus_class_change_old_class',
  newClass: 'nexus_class_change_new_class',
  newSpecialization: 'nexus_class_change_new_specialization',
  oldChosen: 'nexus_class_change_old_chosen',
  oldSpecialization: 'nexus_class_change_old_specialization',
  oldMetallurgistUnlock: 'nexus_class_change_old_metallurgist_unlocked',
  oldAllomancy: 'nexus_class_change_old_allomancy',
  startedAt: 'nexus_class_change_started_at',
  snapshot: 'nexus_class_change_snapshot',
  kitIndex: 'nexus_class_change_kit_index',
  attempts: 'nexus_class_change_recovery_attempts',
  initial: 'nexus_class_change_initial',
  recoveryMode: 'nexus_class_change_recovery_mode',
  lastError: 'nexus_class_change_last_error',
  lastAt: 'nexus_class_change_last_at',
  nextAt: 'nexus_class_change_next_at',
  lastTxId: 'nexus_class_change_last_tx_id',
  lastFrom: 'nexus_class_change_last_from',
  lastTo: 'nexus_class_change_last_to'
}

const NEXUS_STARTER_KIT_KEYS = {
  version: 'nexus_starter_kit_ledger_version',
  base: 'nexus_starter_kit_base',
  specialization: 'nexus_starter_kit_specialization'
}

const NEXUS_CLASS_CHANGE_JOURNAL_KEYS = [
  NEXUS_CLASS_CHANGE_KEYS.journalVersion,
  NEXUS_CLASS_CHANGE_KEYS.phase,
  NEXUS_CLASS_CHANGE_KEYS.txId,
  NEXUS_CLASS_CHANGE_KEYS.oldClass,
  NEXUS_CLASS_CHANGE_KEYS.newClass,
  NEXUS_CLASS_CHANGE_KEYS.newSpecialization,
  NEXUS_CLASS_CHANGE_KEYS.oldChosen,
  NEXUS_CLASS_CHANGE_KEYS.oldSpecialization,
  NEXUS_CLASS_CHANGE_KEYS.oldMetallurgistUnlock,
  NEXUS_CLASS_CHANGE_KEYS.oldAllomancy,
  NEXUS_CLASS_CHANGE_KEYS.startedAt,
  NEXUS_CLASS_CHANGE_KEYS.snapshot,
  NEXUS_CLASS_CHANGE_KEYS.kitIndex,
  NEXUS_CLASS_CHANGE_KEYS.attempts,
  NEXUS_CLASS_CHANGE_KEYS.initial,
  NEXUS_CLASS_CHANGE_KEYS.recoveryMode,
  NEXUS_CLASS_CHANGE_KEYS.lastError
]

const NEXUS_CLASS_CHANGE_FORWARD_PHASES = [
  'OLD_STATE_REVOKED',
  'NEW_STATE_APPLIED',
  'KIT_APPLIED',
  'VERIFYING',
  'COMMITTING',
  'COMPLETED'
]

const nexusClassChangeLocks = new Set()

function nexusLoadClassSafely(className) {
  try {
    return Java.loadClass(className)
  } catch (error) {
    console.error(
      `[Nexus Realms] Required class unavailable: ${className}: ${error}`
    )
    return null
  }
}

const $NexusInventoryHelper = nexusLoadClassSafely(
  'dev.itscarlos.nexuscore.ClassChangeInventoryHelper'
)
const $NexusClassChangePolicy = nexusLoadClassSafely(
  'dev.itscarlos.nexuscore.ClassChangePolicy'
)
const $NexusClassSyncEvents = nexusLoadClassSafely(
  'dev.itscarlos.nexuscore.ClassSyncEvents'
)
const $NexusComponent = nexusLoadClassSafely(
  'net.minecraft.network.chat.Component'
)
const $NexusTag = nexusLoadClassSafely(
  'net.minecraft.nbt.Tag'
)

const $NexusMagicData = nexusLoadClassSafely(
  'io.redspace.ironsspellbooks.api.magic.MagicData'
)

const $NexusGunOperator = nexusLoadClassSafely(
  'com.tacz.guns.api.entity.IGunOperator'
)

function nexusSelectionApi() {
  return global.nexusClassSelectionApi || null
}

function nexusNow() {
  return Date.now()
}

function nexusNewTransactionId() {
  return (
    String(nexusNow()) +
    '-' +
    Math.floor(Math.random() * 1000000000).toString(36) +
    '-' +
    Math.floor(Math.random() * 1000000000).toString(36)
  )
}

function nexusPlayerKey(player) {
  return String(player.uuid)
}

function nexusSourceFeedback(source, message, failure) {
  const text = String(message)

  try {
    if (source && $NexusComponent) {
      if (failure && source.sendFailure) {
        source.sendFailure($NexusComponent.literal(text))
      } else {
        source.sendSystemMessage($NexusComponent.literal(text))
      }
      return
    }
  } catch (ignored) {
  }

  console.info(`[Nexus Realms] ${text}`)
}

// Envía siempre el resultado al jugador afectado.
// Esto permite que los command blocks del altar den feedback en el chat.
function nexusPlayerFeedback(player, message) {
  const text = String(message)

  try {
    if (player && $NexusComponent) {
      player.sendSystemMessage($NexusComponent.literal(text))
      return true
    }
  } catch (ignored) {
  }

  try {
    if (player && player.tell) {
      player.tell(text)
      return true
    }
  } catch (ignored) {
  }

  return false
}

// Si el comando lo ejecuta el propio jugador, evita duplicar el mensaje.
// Si lo ejecuta consola/command block/otro admin, el jugador lo recibe
// y el source conserva también su feedback administrativo.
function nexusFeedback(source, player, message, failure) {
  const text = String(message)
  const playerSent = nexusPlayerFeedback(player, text)
  let sameSourcePlayer = false

  try {
    sameSourcePlayer = Boolean(
      source &&
      source.player &&
      player &&
      nexusPlayerKey(source.player) === nexusPlayerKey(player)
    )
  } catch (ignored) {
  }

  if (!sameSourcePlayer) {
    nexusSourceFeedback(source, text, failure)
  } else if (!playerSent) {
    nexusSourceFeedback(source, text, failure)
  }
}

function nexusAudit(eventName, player, fields) {
  const record = Object.assign({
    event: eventName,
    player: String(player.username),
    uuid: nexusPlayerKey(player),
    timestamp: nexusNow()
  }, fields || {})

  console.info('[NexusClassAudit] ' + JSON.stringify(record))
}

function nexusStrictClass(rawValue) {
  const raw = String(rawValue || '')
  return raw === 'warrior' || raw === 'mage' || raw === 'gunslinger'
    ? raw
    : 'none'
}

function nexusResolveClassTarget(rawValue) {
  var targetResolutionId = String(rawValue || '').toLowerCase()

  if (
    targetResolutionId === 'warrior' ||
    targetResolutionId === 'mage' ||
    targetResolutionId === 'gunslinger'
  ) {
    return {
      id: targetResolutionId,
      mainClass: targetResolutionId,
      specialization: ''
    }
  }

  if (targetResolutionId === 'arcanist') {
    return {
      id: targetResolutionId,
      mainClass: 'mage',
      specialization: targetResolutionId
    }
  }

  return null
}

function nexusDestinationId(mainClass, specialization) {
  var destinationMainClass = nexusStrictClass(mainClass)
  var destinationSpecialization = String(specialization || '')

  if (
    destinationMainClass === 'mage' &&
    destinationSpecialization === 'arcanist'
  ) {
    return destinationSpecialization
  }

  return destinationMainClass
}

function nexusJournalPhase(player) {
  return String(
    player.persistentData.getString(NEXUS_CLASS_CHANGE_KEYS.phase) || ''
  )
}

function nexusHasJournal(player) {
  const phase = nexusJournalPhase(player)
  return phase !== '' && phase !== 'IDLE'
}

function nexusSetPhase(player, phase) {
  player.persistentData.putString(
    NEXUS_CLASS_CHANGE_KEYS.phase,
    phase
  )
}

function nexusClearJournal(player) {
  NEXUS_CLASS_CHANGE_JOURNAL_KEYS.forEach(
    key => player.persistentData.remove(key)
  )
}

function nexusCooldownState(player, now) {
  const data = player.persistentData
  const lastKey = NEXUS_CLASS_CHANGE_KEYS.lastAt
  const nextKey = NEXUS_CLASS_CHANGE_KEYS.nextAt
  const existsLast = data.contains(lastKey)
  const existsNext = data.contains(nextKey)
  const hasLast = data.contains(lastKey, $NexusTag.TAG_LONG)
  const hasNext = data.contains(nextKey, $NexusTag.TAG_LONG)

  if (!existsLast && !existsNext) {
    return {
      valid: true,
      active: false,
      last: 0,
      next: 0,
      remaining: 0
    }
  }

  if (!hasLast || !hasNext) {
    return {
      valid: false,
      reason: 'cooldown_pair_incomplete'
    }
  }

  const last = Number(data.getLong(lastKey))
  const next = Number(data.getLong(nextKey))
  const corrupt =
    last < 0 ||
    next < last ||
    last > now + NEXUS_CLASS_CHANGE_CLOCK_TOLERANCE_MS ||
    next >
      last +
      NEXUS_CLASS_CHANGE_COOLDOWN_MS +
      NEXUS_CLASS_CHANGE_CLOCK_TOLERANCE_MS

  if (corrupt) {
    return {
      valid: false,
      reason: 'cooldown_timestamps_corrupt'
    }
  }

  return {
    valid: true,
    active: next > now,
    last: last,
    next: next,
    remaining: Math.max(0, next - now)
  }
}

function nexusFormatDuration(milliseconds) {
  const totalMinutes = Math.ceil(milliseconds / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function nexusAllomancyCoherent(player, classId) {
  var allomancyCoherenceApi = nexusSelectionApi()
  var allomancyCoherenceData = allomancyCoherenceApi
    ? allomancyCoherenceApi.getAllomancyData(player)
    : null
  var allomancyCoherenceCount

  if (!allomancyCoherenceData) {
    return false
  }

  allomancyCoherenceCount =
    Number(allomancyCoherenceData.getPowerCount())

  return classId === 'warrior'
    ? allomancyCoherenceCount >= 8
    : allomancyCoherenceCount === 0
}

function nexusTagsCoherent(player, classId) {
  var tagCoherenceApi = nexusSelectionApi()
  var tagCoherenceIndex = 0
  var tagCoherenceId = ''
  var tagCoherenceExpected = false
  var tagCoherenceActual = false

  while (tagCoherenceIndex < tagCoherenceApi.classTags.length) {
    tagCoherenceId =
      tagCoherenceApi.classTags[tagCoherenceIndex]

    tagCoherenceExpected =
      classId !== 'none' &&
      tagCoherenceApi.classData[classId].tag ===
        tagCoherenceId

    tagCoherenceActual =
      String(
        player.tags.contains(tagCoherenceId)
      ).toLowerCase() === 'true'

    if (tagCoherenceActual !== tagCoherenceExpected) {
      return false
    }

    tagCoherenceIndex++
  }

  return true
}

function nexusStateCoherent(player, classId) {
  var stateCoherenceApi = nexusSelectionApi()
  var stateCoherenceRaw
  var stateCoherenceChosen
  var stateCoherenceClassStages
  var stateCoherenceRawSpecialization
  var stateCoherenceSpecialization = 'none'

  if (!stateCoherenceApi) {
    return false
  }

  stateCoherenceRaw = String(
    player.persistentData.getString('nexus_class') || ''
  )

  stateCoherenceChosen =
    String(
      player.persistentData.getBoolean(
        'nexus_class_chosen'
      )
    ).toLowerCase() === 'true'

  stateCoherenceClassStages =
    stateCoherenceApi.getClassStageState(player)

  stateCoherenceRawSpecialization =
    stateCoherenceApi.getRawSpecialization(player)

  if (classId === 'none') {
    if (
      stateCoherenceRaw !== '' ||
      stateCoherenceChosen
    ) {
      return false
    }
  } else if (
    stateCoherenceRaw !== classId ||
    !stateCoherenceChosen
  ) {
    return false
  }

  if (
    !nexusTagsCoherent(player, classId) ||
    !stateCoherenceApi.classStagesCoherent(
      classId,
      stateCoherenceClassStages
    )
  ) {
    return false
  }

  if (
    classId === 'mage' &&
    stateCoherenceRawSpecialization === 'arcanist'
  ) {
    stateCoherenceSpecialization = 'arcanist'
  } else if (stateCoherenceRawSpecialization !== '') {
    return false
  }

  return (
    stateCoherenceApi.specializationStagesCoherent(
      classId,
      stateCoherenceSpecialization,
      stateCoherenceApi.getSpecializationStageState(player)
    ) &&
    nexusAllomancyCoherent(
      player,
      classId
    )
  )
}

function nexusMigrateLegacyMetallurgist(player, reason) {
  var migrationApi = nexusSelectionApi()
  var migrationData = player.persistentData
  var migrationRawClass = String(
    migrationData.getString('nexus_class') || ''
  )
  var migrationRawSpecialization = String(
    migrationData.getString('nexus_specialization') || ''
  )

  if (
    migrationRawClass !== 'mage' ||
    migrationRawSpecialization !== 'metallurgist'
  ) {
    return true
  }

  migrationApi.clearClassTags(player)

  migrationData.putString(
    'nexus_class',
    'warrior'
  )

  migrationData.putBoolean(
    'nexus_class_chosen',
    true
  )

  migrationData.remove(
    'nexus_specialization'
  )

  migrationData.remove(
    'nexus_specialization_metallurgist_unlocked'
  )

  player.addTag(
    migrationApi.classData.warrior.tag
  )

  if (
    !migrationApi.syncClassStages(
      player,
      'legacy_migration'
    ) ||
    !migrationApi.syncSpecialization(
      player,
      'legacy_migration'
    ) ||
    !nexusStateCoherent(
      player,
      'warrior'
    )
  ) {
    return false
  }

  $NexusClassSyncEvents.forceSync(player)

  nexusAudit(
    'legacy_metallurgist_migrated',
    player,
    {
      from: 'mage+metallurgist',
      to: 'warrior',
      reason: String(reason || 'unspecified'),
      kitDelivered: false,
      cooldownApplied: false
    }
  )

  return true
}

function nexusDestinationCoherent(
  player,
  targetClass,
  targetSpecialization
) {
  var destinationCoherenceApi = nexusSelectionApi()

  var destinationCoherenceExpected =
    targetClass === 'mage'
      ? String(targetSpecialization || '')
      : ''

  return (
    nexusStateCoherent(player, targetClass) &&
    String(
      destinationCoherenceApi.getRawSpecialization(player) || ''
    ) === destinationCoherenceExpected
  )
}

function nexusExternalState() {
  return Boolean(
    $NexusInventoryHelper &&
    $NexusClassChangePolicy &&
    $NexusClassSyncEvents &&
    $NexusTag &&
    nexusSelectionApi()
  )
}

function nexusPreflight(
  source,
  player,
  target,
  initial
) {
  const api = nexusSelectionApi()
  const now = nexusNow()
  const targetClass = target.mainClass
  const raw = String(
    player.persistentData.getString(
      'nexus_class'
    ) || ''
  )
  const currentClass =
    nexusStrictClass(raw)
  let needsMagicData = false
  let needsGunOperator = false

  if (!nexusExternalState()) {
    return {
      ok: false,
      error:
        'Faltan API criticas del cambio de clase.'
    }
  }

  needsMagicData = Boolean(
    $NexusClassChangePolicy.requiresMagicData(
      currentClass,
      targetClass
    )
  )
  needsGunOperator = Boolean(
    $NexusClassChangePolicy.requiresGunOperator(
      currentClass,
      targetClass
    )
  )

  if (!player.isAlive()) {
    return {
      ok: false,
      error: 'El jugador debe estar vivo.'
    }
  }

  if (
    player.isCreative() ||
    player.isSpectator()
  ) {
    return {
      ok: false,
      error:
        'Creative y spectator no pueden cambiar de clase.'
    }
  }

  if (
    player.isPassenger() ||
    player.isChangingDimension()
  ) {
    return {
      ok: false,
      error:
        'El jugador esta montado o cambiando de dimension.'
    }
  }

  if (nexusHasJournal(player)) {
    return {
      ok: false,
      error:
        'Existe una transicion pendiente; usa /nexus_repairclass.'
    }
  }

  if ($NexusInventoryHelper.hasExternalMenu(player)) {
    $NexusInventoryHelper.closeExternalMenu(player)

    nexusFeedback(
      source,
      player,
      'Interfaz cerrada; activa de nuevo el altar.',
      true
    )

    return {
      ok: false,
      feedbackSent: true
    }
  }

  if (needsMagicData && !$NexusMagicData) {
    return {
      ok: false,
      error:
        'MagicData no esta disponible para una transicion de Mago.'
    }
  }

  const magicData =
    needsMagicData
      ? $NexusMagicData.getPlayerMagicData(player)
      : null

  if (
    player.isUsingItem() &&
    (
      !needsMagicData ||
      !magicData ||
      !magicData.isCasting()
    )
  ) {
    return {
      ok: false,
      error:
        'Termina de usar el objeto antes de cambiar de clase.'
    }
  }

  const epicState = String(
    $NexusInventoryHelper
      .getEpicFightClassChangeState(player)
  )

  if (epicState === 'PATCH_UNAVAILABLE') {
    return {
      ok: false,
      error:
        'Epic Fight player patch no disponible.'
    }
  }

  if (epicState === 'BUSY') {
    return {
      ok: false,
      error:
        'Termina la accion de combate antes de cambiar de clase.'
    }
  }

  if (epicState !== 'OK') {
    return {
      ok: false,
      error:
        'Estado inesperado de Epic Fight: ' +
        epicState
    }
  }

  if (needsGunOperator && !$NexusGunOperator) {
    return {
      ok: false,
      error:
        'La API TaCZ no esta disponible para una transicion de Pistolero.'
    }
  }

  if (
    needsGunOperator &&
    !$NexusGunOperator.fromLivingEntity(player)
  ) {
    return {
      ok: false,
      error:
        'TaCZ gun operator no disponible.'
    }
  }

  if (initial) {
    if (
      raw !== '' ||
      !nexusStateCoherent(player, 'none')
    ) {
      return {
        ok: false,
        error:
          'La seleccion inicial requiere ausencia total y coherente de clase.'
      }
    }
  } else {
    if (
      currentClass === 'none' ||
      !nexusStateCoherent(
        player,
        currentClass
      )
    ) {
      return {
        ok: false,
        error:
          'El estado de clase actual es invalido; usa /nexus_repairclass.'
      }
    }

    const currentDestination =
      nexusDestinationId(
        currentClass,
        api.getRawSpecialization(player)
      )

    if (
      currentDestination === target.id ||
      (
        target.id === 'mage' &&
        currentClass === 'mage'
      )
    ) {
      return {
        ok: false,
        error:
          'El jugador ya pertenece a esa clase.'
      }
    }

    const cooldown =
      nexusCooldownState(player, now)

    if (!cooldown.valid) {
      return {
        ok: false,
        error:
          'Cooldown corrupto; usa /nexus_repairclass.'
      }
    }

    if (cooldown.active) {
      return {
        ok: false,
        error:
          `Cooldown activo: ` +
          `${nexusFormatDuration(cooldown.remaining)} ` +
          `restantes.`
      }
    }

    if (
      Number(player.experienceLevel) <
      NEXUS_CLASS_CHANGE_COST_LEVELS
    ) {
      return {
        ok: false,
        error:
          `Se requieren ${NEXUS_CLASS_CHANGE_COST_LEVELS} ` +
          `niveles de experiencia.`
      }
    }
  }

  const classStages =
    api.getClassStageState(player)

  const specializationStages =
    api.getSpecializationStageState(player)

  if (
    !classStages.available ||
    !specializationStages.available
  ) {
    return {
      ok: false,
      error:
        'History Stages no esta disponible.'
    }
  }

  if (!api.getAllomancyData(player)) {
    return {
      ok: false,
      error:
        'La capability publica de Allomancy no esta disponible.'
    }
  }

  if (!initial) {
    const equipmentCheck =
      $NexusInventoryHelper
        .checkUnequipCapacity(
          player,
          targetClass
        )

    if (!equipmentCheck.isOk()) {
      return {
        ok: false,
        error:
          String(
            equipmentCheck.getMessage()
          ) ===
          'insufficient_main_inventory_space'
            ? 'No hay espacio suficiente para conservar el equipo incompatible.'
            : `Preflight de equipo rechazado: ` +
              `${equipmentCheck.getMessage()}`
      }
    }
  }

  const captured =
    $NexusInventoryHelper.capture(player)

  if (!captured.isOk()) {
    return {
      ok: false,
      error:
        `Snapshot rechazado: ` +
        `${captured.getMessage()}`
    }
  }

  return {
    ok: true,
    now: now,
    currentClass: currentClass,
    needsMagicData: needsMagicData,
    needsGunOperator: needsGunOperator,
    snapshot: captured.getSnapshot(),
    snapshotBytes:
      Number(captured.getSerializedBytes())
  }
}

// Cobra niveles reales de Minecraft, no puntos.
// Ejemplo: nivel 50 -> nivel 9 con coste 41.
// El snapshot permite restaurar el XP exacto si luego hay rollback.
function nexusChargeExperienceLevels(
  player,
  snapshot,
  levels
) {
  var chargeOriginalLevel
  var chargeOriginalTotal
  var chargeOriginalProgress
  var chargeExpectedLevel

  if (
    !snapshot ||
    Number(levels) <= 0
  ) {
    return {
      ok: false,
      message:
        'experience_level_cost_invalid'
    }
  }

  chargeOriginalLevel =
    Number(snapshot.getInt('XpLevel'))

  chargeOriginalTotal =
    Number(snapshot.getInt('XpTotal'))

  chargeOriginalProgress =
    Number(snapshot.getFloat('XpProgress'))

  // Igual que el cobro anterior: el XP no puede
  // haber cambiado desde que se tomó el snapshot.
  if (
    Number(player.experienceLevel) !==
      chargeOriginalLevel ||
    Number(player.totalExperience) !==
      chargeOriginalTotal ||
    Number(player.experienceProgress) !==
      chargeOriginalProgress
  ) {
    return {
      ok: false,
      message:
        'experience_changed_after_snapshot'
    }
  }

  if (
    chargeOriginalLevel <
    Number(levels)
  ) {
    return {
      ok: false,
      message:
        'insufficient_experience_levels'
    }
  }

  chargeExpectedLevel =
    chargeOriginalLevel -
    Number(levels)

  player.giveExperienceLevels(
    -Number(levels)
  )

  if (
    Number(player.experienceLevel) !==
      chargeExpectedLevel ||
    Number(player.totalExperience) !==
      chargeOriginalTotal ||
    Number(player.experienceProgress) !==
      chargeOriginalProgress ||
    Number(player.experienceLevel) < 0 ||
    !Number.isFinite(
      Number(player.experienceProgress)
    ) ||
    Number(player.experienceProgress) < 0 ||
    Number(player.experienceProgress) >= 1
  ) {
    $NexusInventoryHelper.restoreExperience(
      player,
      snapshot
    )

    return {
      ok: false,
      message:
        'experience_level_charge_not_exact'
    }
  }

  return {
    ok: true,
    message: 'ok'
  }
}

function nexusPrepareJournal(
  player,
  target,
  initial,
  journalContext
) {
  const api = nexusSelectionApi()
  const data = player.persistentData
  const allomancy =
    api.getAllomancyData(player)

  nexusClearJournal(player)

  data.putInt(
    NEXUS_CLASS_CHANGE_KEYS.journalVersion,
    NEXUS_CLASS_CHANGE_JOURNAL_VERSION
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.txId,
    nexusNewTransactionId()
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.oldClass,
    journalContext.currentClass
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.newClass,
    target.mainClass
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.newSpecialization,
    target.specialization
  )

  data.putBoolean(
    NEXUS_CLASS_CHANGE_KEYS.oldChosen,
    data.getBoolean(
      'nexus_class_chosen'
    ) === true
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.oldSpecialization,
    String(
      data.getString(
        'nexus_specialization'
      ) || ''
    )
  )

  data.putBoolean(
    NEXUS_CLASS_CHANGE_KEYS.oldMetallurgistUnlock,
    data.getBoolean(
      'nexus_specialization_metallurgist_unlocked'
    ) === true
  )

  data.put(
    NEXUS_CLASS_CHANGE_KEYS.oldAllomancy,
    allomancy.save().copy()
  )

  data.putLong(
    NEXUS_CLASS_CHANGE_KEYS.startedAt,
    journalContext.now
  )

  data.put(
    NEXUS_CLASS_CHANGE_KEYS.snapshot,
    journalContext.snapshot.copy()
  )

  data.putInt(
    NEXUS_CLASS_CHANGE_KEYS.kitIndex,
    0
  )

  data.putInt(
    NEXUS_CLASS_CHANGE_KEYS.attempts,
    0
  )

  data.putBoolean(
    NEXUS_CLASS_CHANGE_KEYS.initial,
    initial
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.recoveryMode,
    'ROLLBACK'
  )

  nexusSetPhase(
    player,
    'PREPARED'
  )
}

function nexusSanitizeActions(
  player,
  diagnostic,
  requirements
) {
  if (requirements.needsMagicData) {
    if (diagnostic) {
      diagnostic.operation =
        'sanitize_magic_data'
    }

    const magicData =
      $NexusMagicData.getPlayerMagicData(
        player
      )

    if (!magicData) {
      return false
    }

    if (diagnostic) {
      diagnostic.operation =
        'sanitize_casting_state'
    }

    if (magicData.isCasting()) {
      magicData.resetCastingState()
    }

    if (magicData.isCasting()) {
      return false
    }
  }

  if (requirements.needsGunOperator) {
    if (diagnostic) {
      diagnostic.operation =
        'sanitize_tacz_state'
    }

    const gunOperator =
      $NexusGunOperator.fromLivingEntity(
        player
      )

    if (!gunOperator) {
      return false
    }

    gunOperator.aim(false)
    gunOperator.cancelReload()

    if (
      gunOperator.getSynIsAiming() ||
      gunOperator
        .getSynReloadState()
        .getStateType()
        .isReloading()
    ) {
      return false
    }
  }

  if (diagnostic) {
    diagnostic.operation =
      'sanitize_epic_fight_state'
  }

  return Boolean(
    $NexusInventoryHelper
      .sanitizeEpicFightState(player)
  )
}

function nexusWriteClassState(
  player,
  classId
) {
  const api = nexusSelectionApi()

  api.clearClassTags(player)

  if (classId === 'none') {
    player.persistentData.remove(
      'nexus_class'
    )

    player.persistentData.putBoolean(
      'nexus_class_chosen',
      false
    )
  } else {
    player.persistentData.putString(
      'nexus_class',
      classId
    )

    player.persistentData.putBoolean(
      'nexus_class_chosen',
      true
    )

    player.addTag(
      api.classData[classId].tag
    )
  }

  return api.syncClassStages(
    player,
    'class_change'
  )
}

function nexusClearSpecializationState(
  player
) {
  const api = nexusSelectionApi()

  player.persistentData.remove(
    'nexus_specialization'
  )

  return api.syncSpecialization(
    player,
    'class_change'
  )
}

function nexusRevokeOldState(
  player,
  diagnostic
) {
  if (diagnostic) {
    diagnostic.operation =
      'revoke_old_specialization'
  }

  if (
    !nexusClearSpecializationState(
      player
    )
  ) {
    return false
  }

  if (diagnostic) {
    diagnostic.operation =
      'revoke_old_class'
  }

  if (
    !nexusWriteClassState(
      player,
      'none'
    )
  ) {
    return false
  }

  if (diagnostic) {
    diagnostic.operation =
      'verify_revoked_state'
  }

  return nexusStateCoherent(
    player,
    'none'
  )
}

function nexusStarterKitRecordKey(kind) {
  return kind === 'base'
    ? NEXUS_STARTER_KIT_KEYS.base
    : NEXUS_STARTER_KIT_KEYS.specialization
}

function nexusStarterKitManifest(
  kind,
  targetId
) {
  const api = nexusSelectionApi()

  if (kind === 'base') {
    return api.classData[targetId]
      ? api.classData[targetId].kit
      : null
  }

  const specialization =
    api.specializationData[targetId]

  return specialization
    ? specialization.starterKit || []
    : null
}

function nexusStarterKitId(kind, targetId) {
  return `${kind}:${targetId}:v` +
    `${NEXUS_STARTER_KIT_MANIFEST_VERSION}`
}

function nexusSaveStarterKitRecord(
  player,
  kind,
  record
) {
  const data = player.persistentData

  data.putInt(
    NEXUS_STARTER_KIT_KEYS.version,
    NEXUS_STARTER_KIT_LEDGER_VERSION
  )

  record.putLong(
    'UpdatedAt',
    nexusNow()
  )

  data.put(
    nexusStarterKitRecordKey(kind),
    record
  )
}

function nexusStarterKitRecord(
  player,
  kind
) {
  const data = player.persistentData
  const key =
    nexusStarterKitRecordKey(kind)

  if (!data.contains(key, $NexusTag.TAG_COMPOUND)) {
    return null
  }

  return data.getCompound(key)
}

function nexusInitializeStarterKitRecord(
  player,
  kind,
  targetId,
  destination,
  txId,
  knownIndex,
  knownComplete
) {
  const manifest =
    nexusStarterKitManifest(
      kind,
      targetId
    )

  if (!manifest) {
    return null
  }

  const expectedKitId =
    nexusStarterKitId(
      kind,
      targetId
    )

  let record =
    nexusStarterKitRecord(
      player,
      kind
    )

  if (record) {
    if (
      Number(record.getInt('Version')) !==
        NEXUS_STARTER_KIT_LEDGER_VERSION ||
      String(record.getString('KitId')) !==
        expectedKitId
    ) {
      record.putString(
        'State',
        'UNRESOLVED'
      )

      record.putString(
        'LastReason',
        'ledger_record_conflict'
      )

      nexusSaveStarterKitRecord(
        player,
        kind,
        record
      )

      return record
    }

    return record
  }

  record = player.persistentData
    .getCompound(
      nexusStarterKitRecordKey(kind)
    )

  const initialIndex =
    Number(knownComplete) === 1
      ? manifest.length
      : Number(knownIndex || 0)

  record.putInt(
    'Version',
    NEXUS_STARTER_KIT_LEDGER_VERSION
  )

  record.putString(
    'KitId',
    expectedKitId
  )

  record.putString('Kind', kind)
  record.putString('Target', targetId)
  record.putString(
    'Destination',
    destination
  )
  record.putString('TxId', txId)
  record.putInt(
    'EntryCount',
    manifest.length
  )
  record.putInt(
    'EntryConfirmed',
    0
  )
  record.putInt(
    'InFlightIndex',
    -1
  )
  record.putInt(
    'InFlightBaseline',
    0
  )
  record.putInt(
    'InFlightRequested',
    0
  )

  if (
    initialIndex < 0 ||
    initialIndex > manifest.length
  ) {
    record.putInt('NextIndex', 0)
    record.putString('State', 'UNRESOLVED')
    record.putString(
      'LastReason',
      'legacy_progress_out_of_range'
    )
  } else {
    record.putInt(
      'NextIndex',
      initialIndex
    )
    record.putString(
      'State',
      initialIndex >= manifest.length
        ? 'COMPLETE'
        : 'PENDING'
    )
    record.putString(
      'LastReason',
      initialIndex >= manifest.length
        ? 'legacy_progress_complete'
        : 'delivery_pending'
    )
  }

  nexusSaveStarterKitRecord(
    player,
    kind,
    record
  )

  return record
}

function nexusStarterKitEntryAudit(
  player,
  record,
  index,
  entry,
  requested,
  inserted,
  remaining,
  result,
  reason
) {
  nexusAudit(
    'starter_kit_entry',
    player,
    {
      txId: String(
        record.getString('TxId') || ''
      ),
      kitId: String(
        record.getString('KitId')
      ),
      destination: String(
        record.getString('Destination')
      ),
      entryIndex: index,
      itemId: String(entry.id),
      requested: requested,
      inserted: inserted,
      remaining: remaining,
      result: result,
      reason: reason
    }
  )
}

function nexusCreateStarterKitStack(
  player,
  kind,
  record,
  index,
  entry
) {
  try {
    const stack =
      nexusSelectionApi().createKitItem(
        entry
      )

    if (!stack || stack.isEmpty()) {
      throw new Error('starter_stack_empty')
    }

    return stack
  } catch (creationError) {
    const requested =
      Number(entry.count || 1)
    const reason =
      'kit_item_creation_failed:' +
      String(creationError)

    record.putString('State', 'UNRESOLVED')
    record.putString('LastReason', reason)
    nexusSaveStarterKitRecord(player, kind, record)

    nexusStarterKitEntryAudit(
      player,
      record,
      index,
      entry,
      requested,
      0,
      requested,
      'UNRESOLVED',
      reason
    )

    return null
  }
}

function nexusReconcileInterruptedStarterEntry(
  player,
  kind,
  record,
  manifest
) {
  const index =
    Number(record.getInt('InFlightIndex'))

  if (index < 0) {
    return true
  }

  if (
    index !== Number(record.getInt('NextIndex')) ||
    index >= manifest.length
  ) {
    record.putString('State', 'UNRESOLVED')
    record.putString(
      'LastReason',
      'interrupted_entry_index_invalid'
    )
    nexusSaveStarterKitRecord(player, kind, record)
    return false
  }

  const desired =
    nexusCreateStarterKitStack(
      player,
      kind,
      record,
      index,
      manifest[index]
    )

  if (!desired) {
    return false
  }

  const baseline =
    Number(record.getInt('InFlightBaseline'))
  const requested =
    Number(record.getInt('InFlightRequested'))
  const present =
    Number(
      $NexusInventoryHelper
        .countMatchingStarterStack(
          player,
          desired
        )
    )

  if (
    requested <= 0 ||
    present < baseline + requested
  ) {
    record.putString('State', 'UNRESOLVED')
    record.putString(
      'LastReason',
      'interrupted_delivery_ambiguous'
    )
    nexusSaveStarterKitRecord(player, kind, record)

    nexusStarterKitEntryAudit(
      player,
      record,
      index,
      manifest[index],
      requested,
      0,
      Math.max(0, requested),
      'UNRESOLVED',
      'interrupted_delivery_ambiguous'
    )
    return false
  }

  record.putInt(
    'EntryConfirmed',
    Number(record.getInt('EntryConfirmed')) +
      requested
  )
  record.putInt('InFlightIndex', -1)
  record.putInt('InFlightBaseline', 0)
  record.putInt('InFlightRequested', 0)
  record.putString('LastReason', 'interrupted_delivery_confirmed')
  nexusSaveStarterKitRecord(player, kind, record)

  nexusStarterKitEntryAudit(
    player,
    record,
    index,
    manifest[index],
    requested,
    0,
    0,
    'CONFIRMED',
    'interrupted_delivery_confirmed'
  )

  return true
}

function nexusDeliverStarterKitRecord(
  player,
  kind
) {
  const record =
    nexusStarterKitRecord(
      player,
      kind
    )

  if (!record) {
    return true
  }

  if (
    Number(
      player.persistentData.getInt(
        NEXUS_STARTER_KIT_KEYS.version
      )
    ) !== NEXUS_STARTER_KIT_LEDGER_VERSION ||
    Number(record.getInt('Version')) !==
      NEXUS_STARTER_KIT_LEDGER_VERSION
  ) {
    record.putString('State', 'UNRESOLVED')
    record.putString('LastReason', 'ledger_version_unsupported')
    nexusSaveStarterKitRecord(player, kind, record)
    return false
  }

  const state =
    String(record.getString('State'))

  if (state === 'COMPLETE') {
    return true
  }

  if (state === 'UNRESOLVED') {
    return false
  }

  const targetId =
    String(record.getString('Target'))
  const manifest =
    nexusStarterKitManifest(
      kind,
      targetId
    )

  if (
    !manifest ||
    manifest.length !==
      Number(record.getInt('EntryCount'))
  ) {
    record.putString('State', 'UNRESOLVED')
    record.putString('LastReason', 'manifest_changed')
    nexusSaveStarterKitRecord(player, kind, record)
    return false
  }

  if (
    !nexusReconcileInterruptedStarterEntry(
      player,
      kind,
      record,
      manifest
    )
  ) {
    return false
  }

  while (
    Number(record.getInt('NextIndex')) <
      manifest.length
  ) {
    const index =
      Number(record.getInt('NextIndex'))
    const entry = manifest[index]
    const desired =
      nexusCreateStarterKitStack(
        player,
        kind,
        record,
        index,
        entry
      )

    if (!desired) {
      return false
    }
    const total =
      Number(desired.getCount())
    const confirmed =
      Number(record.getInt('EntryConfirmed'))
    const requested =
      Math.max(0, total - confirmed)

    if (requested === 0) {
      record.putInt('NextIndex', index + 1)
      record.putInt('EntryConfirmed', 0)
      nexusSaveStarterKitRecord(player, kind, record)
      continue
    }

    const baseline =
      Number(
        $NexusInventoryHelper
          .countMatchingStarterStack(
            player,
            desired
          )
      )

    if (baseline < 0) {
      record.putString('State', 'PENDING')
      record.putString('LastReason', 'native_inventory_count_unavailable')
      nexusSaveStarterKitRecord(player, kind, record)
      return false
    }

    record.putInt('InFlightIndex', index)
    record.putInt('InFlightBaseline', baseline)
    record.putInt('InFlightRequested', requested)
    record.putString('State', 'PENDING')
    record.putString('LastReason', 'delivery_in_flight')
    nexusSaveStarterKitRecord(player, kind, record)

    const requestStack = desired.copy()
    requestStack.setCount(requested)

    const insertion =
      $NexusInventoryHelper.insertStarterStack(
        player,
        requestStack
      )

    const inserted = Math.max(
      0,
      Math.min(
        requested,
        Number(insertion.getInsertedItems())
      )
    )
    const remaining = Math.max(
      0,
      Number(insertion.getRemainingItems())
    )
    const reason =
      String(insertion.getMessage())

    record.putInt('InFlightIndex', -1)
    record.putInt('InFlightBaseline', 0)
    record.putInt('InFlightRequested', 0)
    record.putInt(
      'EntryConfirmed',
      confirmed + inserted
    )
    record.putString('LastReason', reason)

    nexusStarterKitEntryAudit(
      player,
      record,
      index,
      entry,
      requested,
      inserted,
      remaining,
      remaining === 0
        ? 'CONFIRMED'
        : 'PENDING',
      reason
    )

    if (
      confirmed + inserted >= total &&
      remaining === 0
    ) {
      record.putInt('NextIndex', index + 1)
      record.putInt('EntryConfirmed', 0)
      nexusSaveStarterKitRecord(player, kind, record)
      continue
    }

    record.putString('State', 'PENDING')
    nexusSaveStarterKitRecord(player, kind, record)
    return false
  }

  record.putString('State', 'COMPLETE')
  record.putString('LastReason', 'complete')
  nexusSaveStarterKitRecord(player, kind, record)

  nexusAudit(
    'starter_kit_complete',
    player,
    {
      txId: String(record.getString('TxId')),
      kitId: String(record.getString('KitId')),
      destination: String(
        record.getString('Destination')
      ),
      entries: manifest.length
    }
  )

  return true
}

function nexusDeliverSpecializationKit(
  player,
  specializationId
) {
  const txId = String(
    player.persistentData.getString(
      NEXUS_CLASS_CHANGE_KEYS.lastTxId
    ) ||
    `specialization-${specializationId}`
  )

  const record =
    nexusInitializeStarterKitRecord(
      player,
      'specialization',
      specializationId,
      specializationId,
      txId,
      0,
      false
    )

  return Boolean(
    record &&
    nexusDeliverStarterKitRecord(
      player,
      'specialization'
    )
  )
}

function nexusRetryPendingStarterKits(player) {
  const baseComplete =
    nexusDeliverStarterKitRecord(
      player,
      'base'
    )

  const specializationComplete =
    nexusDeliverStarterKitRecord(
      player,
      'specialization'
    )

  return baseComplete && specializationComplete
}

function nexusClearStarterKitLedger(
  player,
  kind
) {
  player.persistentData.remove(
    nexusStarterKitRecordKey(kind)
  )
}

function nexusReconcileLegacyStarterKit(
  player,
  kind,
  targetId,
  destination,
  txId,
  knownIndex,
  knownComplete,
  inspectRemaining
) {
  const manifest =
    nexusStarterKitManifest(
      kind,
      targetId
    )

  const record =
    nexusInitializeStarterKitRecord(
      player,
      kind,
      targetId,
      destination,
      txId,
      knownIndex,
      knownComplete
    )

  if (!manifest || !record) {
    return false
  }

  if (
    String(record.getString('State')) ===
      'COMPLETE' ||
    !inspectRemaining
  ) {
    return true
  }

  while (
    Number(record.getInt('NextIndex')) <
      manifest.length
  ) {
    const index =
      Number(record.getInt('NextIndex'))
    const entry = manifest[index]
    const desired =
      nexusCreateStarterKitStack(
        player,
        kind,
        record,
        index,
        entry
      )

    if (!desired) {
      return false
    }
    const requested =
      Number(desired.getCount())
    const present =
      Number(
        $NexusInventoryHelper
          .countMatchingStarterStack(
            player,
            desired
          )
      )

    if (present < requested) {
      const reason = present < 0
        ? 'legacy_inventory_inspection_unavailable'
        : 'legacy_entry_delivery_ambiguous'

      record.putString('State', 'UNRESOLVED')
      record.putString('LastReason', reason)
      nexusSaveStarterKitRecord(player, kind, record)

      nexusStarterKitEntryAudit(
        player,
        record,
        index,
        entry,
        requested,
        0,
        Math.max(0, requested - Math.max(0, present)),
        'UNRESOLVED',
        reason
      )
      return false
    }

    record.putInt('NextIndex', index + 1)
    record.putInt('EntryConfirmed', 0)
    record.putString('State', 'PENDING')
    record.putString(
      'LastReason',
      'legacy_inventory_confirmed'
    )
    nexusSaveStarterKitRecord(player, kind, record)

    nexusStarterKitEntryAudit(
      player,
      record,
      index,
      entry,
      requested,
      0,
      0,
      'CONFIRMED',
      'legacy_inventory_confirmed'
    )
  }

  record.putString('State', 'COMPLETE')
  record.putString('LastReason', 'legacy_reconciliation_complete')
  nexusSaveStarterKitRecord(player, kind, record)
  return true
}

function nexusPrepareStarterKitsForCommit(
  player,
  targetClass,
  targetSpecialization,
  targetId
) {
  const data = player.persistentData

  if (
    !data.getBoolean(
      NEXUS_CLASS_CHANGE_KEYS.initial
    )
  ) {
    return
  }

  const txId = String(
    data.getString(
      NEXUS_CLASS_CHANGE_KEYS.txId
    )
  )
  const journalVersion = Number(
    data.getInt(
      NEXUS_CLASS_CHANGE_KEYS.journalVersion
    )
  )
  const legacy =
    journalVersion <
      NEXUS_CLASS_CHANGE_JOURNAL_VERSION

  if (!legacy) {
    nexusInitializeStarterKitRecord(
      player,
      'base',
      targetClass,
      targetId,
      txId,
      0,
      false
    )

    if (targetSpecialization !== '') {
      nexusInitializeStarterKitRecord(
        player,
        'specialization',
        targetSpecialization,
        targetId,
        txId,
        0,
        false
      )
    }

    return
  }

  const legacyKitIndex = Number(
    data.getInt(
      NEXUS_CLASS_CHANGE_KEYS.kitIndex
    )
  )
  const legacyError = String(
    data.getString(
      NEXUS_CLASS_CHANGE_KEYS.lastError
    ) || ''
  )
  const legacyKitFailure = Boolean(
    $NexusClassChangePolicy
      .isStarterKitFailure(legacyError)
  )

  nexusReconcileLegacyStarterKit(
    player,
    'base',
    targetClass,
    targetId,
    txId,
    legacyKitIndex,
    false,
    legacyKitFailure || legacyKitIndex > 0
  )

  if (targetSpecialization !== '') {
    const legacyIndexKey =
      `nexus_specialization_` +
      `${targetSpecialization}_starter_kit_index`
    const legacyCompleteKey =
      `nexus_specialization_` +
      `${targetSpecialization}_starter_kit_given`
    const legacySpecializationIndex =
      Number(data.getInt(legacyIndexKey))
    const legacySpecializationComplete =
      data.getBoolean(legacyCompleteKey) === true
    const specializationFailure =
      legacyError.indexOf(
        'specialization_kit_delivery_incomplete'
      ) >= 0

    nexusReconcileLegacyStarterKit(
      player,
      'specialization',
      targetSpecialization,
      targetId,
      txId,
      legacySpecializationIndex,
      legacySpecializationComplete,
      legacyKitFailure ||
        specializationFailure ||
        legacySpecializationComplete ||
        legacySpecializationIndex > 0
    )

    data.remove(legacyIndexKey)
    data.remove(legacyCompleteKey)
  }

  nexusAudit(
    'legacy_starter_kit_journal_migrated',
    player,
    {
      txId: txId,
      destination: targetId,
      kitIndex: legacyKitIndex,
      kitFailure: legacyKitFailure
    }
  )
}

function nexusMigrateLegacySpecializationStarterState(
  player
) {
  const data = player.persistentData
  const specializationId = 'arcanist'
  const indexKey =
    'nexus_specialization_arcanist_starter_kit_index'
  const completedKey =
    'nexus_specialization_arcanist_starter_kit_given'

  if (
    nexusStarterKitRecord(
      player,
      'specialization'
    ) ||
    (
      !data.contains(indexKey) &&
      !data.contains(completedKey)
    )
  ) {
    return true
  }

  if (
    nexusStrictClass(
      data.getString('nexus_class')
    ) !== 'mage' ||
    String(
      data.getString('nexus_specialization')
    ) !== specializationId
  ) {
    return true
  }

  const migrated =
    nexusReconcileLegacyStarterKit(
      player,
      'specialization',
      specializationId,
      specializationId,
      'legacy-specialization',
      Number(data.getInt(indexKey)),
      data.getBoolean(completedKey) === true,
      true
    )

  data.remove(indexKey)
  data.remove(completedKey)
  return migrated
}

function nexusApplySpecializationState(
  player,
  targetClass,
  targetSpecialization
) {
  var applySpecializationApi =
    nexusSelectionApi()

  var applySpecializationId =
    String(
      targetSpecialization || ''
    )

  if (
    (
      targetClass !== 'mage' ||
      applySpecializationId !== 'arcanist'
    ) &&
    applySpecializationId !== ''
  ) {
    return false
  }

  if (
    applySpecializationId !== '' &&
    !applySpecializationApi
      .specializationData[
        applySpecializationId
      ]
  ) {
    return false
  }

  player.persistentData.remove(
    'nexus_specialization'
  )

  if (
    applySpecializationId !== ''
  ) {
    player.persistentData.putString(
      'nexus_specialization',
      applySpecializationId
    )
  }

  return applySpecializationApi
    .syncSpecialization(
      player,
      'class_change'
    )
}

function nexusApplyNewState(
  player,
  targetClass,
  targetSpecialization
) {
  if (
    !nexusWriteClassState(
      player,
      targetClass
    )
  ) {
    return false
  }

  if (
    !nexusApplySpecializationState(
      player,
      targetClass,
      targetSpecialization
    )
  ) {
    return false
  }

  return nexusDestinationCoherent(
    player,
    targetClass,
    targetSpecialization
  )
}

function nexusApplyCooldown(player) {
  if (
    player.persistentData.getBoolean(
      NEXUS_CLASS_CHANGE_KEYS.initial
    )
  ) {
    return true
  }

  const started =
    Number(
      player.persistentData.getLong(
        NEXUS_CLASS_CHANGE_KEYS.startedAt
      )
    )

  player.persistentData.putLong(
    NEXUS_CLASS_CHANGE_KEYS.lastAt,
    started
  )

  player.persistentData.putLong(
    NEXUS_CLASS_CHANGE_KEYS.nextAt,
    started +
      NEXUS_CLASS_CHANGE_COOLDOWN_MS
  )

  return nexusCooldownState(
    player,
    nexusNow()
  ).valid
}

function nexusFinalizeForward(player) {
  const api = nexusSelectionApi()
  const data = player.persistentData

  let targetClass =
    String(
      data.getString(
        NEXUS_CLASS_CHANGE_KEYS.newClass
      )
    )

  let targetSpecialization =
    String(
      data.getString(
        NEXUS_CLASS_CHANGE_KEYS.newSpecialization
      ) || ''
    )

  if (
    targetClass === 'mage' &&
    targetSpecialization === 'metallurgist'
  ) {
    targetClass = 'warrior'
    targetSpecialization = ''

    data.putString(
      NEXUS_CLASS_CHANGE_KEYS.newClass,
      targetClass
    )

    data.putString(
      NEXUS_CLASS_CHANGE_KEYS.newSpecialization,
      targetSpecialization
    )

    nexusAudit(
      'legacy_journal_target_migrated',
      player,
      {
        from: 'mage+metallurgist',
        to: 'warrior'
      }
    )
  }

  const targetId =
    nexusDestinationId(
      targetClass,
      targetSpecialization
    )

  const resolvedTarget =
    nexusResolveClassTarget(
      targetId
    )

  if (
    !resolvedTarget ||
    resolvedTarget.mainClass !==
      targetClass ||
    resolvedTarget.specialization !==
      targetSpecialization
  ) {
    throw new Error(
      'journal_target_invalid'
    )
  }

  if (
    !nexusDestinationCoherent(
      player,
      targetClass,
      targetSpecialization
    ) &&
    !nexusApplyNewState(
      player,
      targetClass,
      targetSpecialization
    )
  ) {
    throw new Error(
      'new_state_verification_failed'
    )
  }

  nexusSetPhase(
    player,
    'NEW_STATE_APPLIED'
  )

  nexusSetPhase(
    player,
    'VERIFYING'
  )

  if (
    !nexusDestinationCoherent(
      player,
      targetClass,
      targetSpecialization
    )
  ) {
    throw new Error(
      'final_state_incoherent'
    )
  }

  nexusSetPhase(
    player,
    'COMMITTING'
  )

  if (
    !nexusApplyCooldown(player)
  ) {
    throw new Error(
      'cooldown_write_failed'
    )
  }

  $NexusClassSyncEvents.forceSync(
    player
  )

  nexusSetPhase(
    player,
    'COMPLETED'
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.lastTxId,
    String(
      data.getString(
        NEXUS_CLASS_CHANGE_KEYS.txId
      )
    )
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.lastFrom,
    String(
      data.getString(
        NEXUS_CLASS_CHANGE_KEYS.oldClass
      )
    )
  )

  data.putString(
    NEXUS_CLASS_CHANGE_KEYS.lastTo,
    targetId
  )

  nexusAudit(
    'commit',
    player,
    {
      txId: String(
        data.getString(
          NEXUS_CLASS_CHANGE_KEYS.txId
        )
      ),
      from: String(
        data.getString(
          NEXUS_CLASS_CHANGE_KEYS.oldClass
        )
      ),
      to: targetId,
      mainClass: targetClass,
      specialization:
        targetSpecialization || 'none',
      initial:
        data.getBoolean(
          NEXUS_CLASS_CHANGE_KEYS.initial
        )
    }
  )

  const initial =
    data.getBoolean(
      NEXUS_CLASS_CHANGE_KEYS.initial
    )

  const shouldOpenMage =
    targetId === 'mage' &&
    initial

  let kitPending = false

  if (initial) {
    try {
      nexusPrepareStarterKitsForCommit(
        player,
        targetClass,
        targetSpecialization,
        targetId
      )
    } catch (kitPreparationError) {
      kitPending = true

      nexusAudit(
        'starter_kit_prepare_failed',
        player,
        {
          txId: String(
            data.getString(
              NEXUS_CLASS_CHANGE_KEYS.txId
            )
          ),
          destination: targetId,
          error: String(kitPreparationError)
        }
      )
    }
  }

  nexusClearJournal(player)

  if (initial) {
    try {
      kitPending =
        !nexusRetryPendingStarterKits(
          player
        ) || kitPending
    } catch (kitDeliveryError) {
      kitPending = true

      nexusAudit(
        'starter_kit_retry_failed',
        player,
        {
          txId: String(
            data.getString(
              NEXUS_CLASS_CHANGE_KEYS.lastTxId
            )
          ),
          destination: targetId,
          error: String(kitDeliveryError)
        }
      )
    }

    if (kitPending) {
      nexusPlayerFeedback(
        player,
        'Tu clase esta aplicada y sincronizada; ' +
        'el starter kit queda KIT_PENDING para reintento.'
      )
    }
  }

  if (shouldOpenMage) {
    player.server.scheduleInTicks(
      5,
      callback => {
        api.runServerCommand(
          player.server,
          `openguiscreen ` +
          `${api.mageSpecializationGuiId} ` +
          `${player.username}`
        )
      }
    )
  }

  return true
}

function nexusRestoreOldState(player) {
  var rollbackContext = {
    api: nexusSelectionApi(),
    data: player.persistentData,
    oldClass: '',
    oldSpecialization: '',
    snapshot: null,
    allomancySnapshot: null,
    restoreResult: null
  }

  rollbackContext.oldClass =
    String(
      rollbackContext.data.getString(
        NEXUS_CLASS_CHANGE_KEYS.oldClass
      )
    )

  rollbackContext.oldSpecialization =
    String(
      rollbackContext.data.getString(
        NEXUS_CLASS_CHANGE_KEYS.oldSpecialization
      ) || ''
    )

  if (
    rollbackContext.oldClass === 'mage' &&
    rollbackContext.oldSpecialization === 'metallurgist'
  ) {
    rollbackContext.oldClass = 'warrior'
    rollbackContext.oldSpecialization = ''
  }

  rollbackContext.snapshot =
    rollbackContext.data.getCompound(
      NEXUS_CLASS_CHANGE_KEYS.snapshot
    )

  rollbackContext.allomancySnapshot =
    rollbackContext.data.getCompound(
      NEXUS_CLASS_CHANGE_KEYS.oldAllomancy
    )

  nexusSetPhase(
    player,
    'ROLLING_BACK'
  )

  rollbackContext.api.clearClassTags(
    player
  )

  if (
    rollbackContext.oldClass ===
    'none'
  ) {
    rollbackContext.data.remove(
      'nexus_class'
    )
  } else {
    rollbackContext.data.putString(
      'nexus_class',
      rollbackContext.oldClass
    )

    player.addTag(
      rollbackContext.api
        .classData[
          rollbackContext.oldClass
        ].tag
    )
  }

  rollbackContext.data.putBoolean(
    'nexus_class_chosen',
    rollbackContext.data.getBoolean(
      NEXUS_CLASS_CHANGE_KEYS.oldChosen
    )
  )

  rollbackContext.data.remove(
    'nexus_specialization_metallurgist_unlocked'
  )

  if (
    rollbackContext.oldSpecialization ===
    ''
  ) {
    rollbackContext.data.remove(
      'nexus_specialization'
    )
  } else {
    rollbackContext.data.putString(
      'nexus_specialization',
      rollbackContext.oldSpecialization
    )
  }

  if (
    !rollbackContext.api.syncClassStages(
      player,
      'rollback'
    )
  ) {
    throw new Error(
      'rollback_class_stage_sync_failed'
    )
  }

  if (
    !rollbackContext.api
      .syncSpecialization(
        player,
        'rollback'
      )
  ) {
    throw new Error(
      'rollback_specialization_sync_failed:' +
      rollbackContext.api
        .getSpecializationSyncDetail()
    )
  }

  if (
    !rollbackContext.api
      .restoreAllomancyData(
        player,
        rollbackContext.allomancySnapshot
      )
  ) {
    throw new Error(
      'rollback_allomancy_restore_failed'
    )
  }

  if (
    !rollbackContext.api
      .syncSpecialization(
        player,
        'rollback_post_restore'
      )
  ) {
    throw new Error(
      'rollback_allomancy_reconcile_failed:' +
      rollbackContext.api
        .getSpecializationSyncDetail()
    )
  }

  if (
    !nexusStateCoherent(
      player,
      rollbackContext.oldClass
    )
  ) {
    throw new Error(
      'rollback_state_incoherent'
    )
  }

  rollbackContext.restoreResult =
    $NexusInventoryHelper
      .restoreRollback(
        player,
        rollbackContext.snapshot
      )

  if (
    !rollbackContext.restoreResult.isOk()
  ) {
    throw new Error(
      'rollback_inventory_restore_failed:' +
      rollbackContext.restoreResult
        .getMessage()
    )
  }

  $NexusClassSyncEvents.forceSync(
    player
  )

  nexusAudit(
    'rollback',
    player,
    {
      txId: String(
        rollbackContext.data.getString(
          NEXUS_CLASS_CHANGE_KEYS.txId
        )
      ),
      restoredClass:
        rollbackContext.oldClass,
      preservedExtraStacks:
        Number(
          rollbackContext.restoreResult
            .getAffectedStacks()
        )
    }
  )

  nexusClearJournal(player)

  return true
}

function nexusMarkRecovery(
  player,
  mode,
  error
) {
  player.persistentData.putString(
    NEXUS_CLASS_CHANGE_KEYS.recoveryMode,
    mode
  )

  player.persistentData.putString(
    NEXUS_CLASS_CHANGE_KEYS.lastError,
    String(error)
  )

  nexusSetPhase(
    player,
    'RECOVERY_REQUIRED'
  )

  nexusAudit(
    'recovery_required',
    player,
    {
      mode: mode,
      error: String(error)
    }
  )
}

function nexusRecoverPendingLocked(
  player,
  source
) {
  var pendingRecoveryContext = {
    data: player.persistentData,
    phase: '',
    attempts: 0,
    requestedMode: '',
    forward: false,
    succeeded: false
  }

  if (!nexusHasJournal(player)) {
    return true
  }

  pendingRecoveryContext.phase =
    nexusJournalPhase(player)

  pendingRecoveryContext.attempts =
    Number(
      pendingRecoveryContext.data.getInt(
        NEXUS_CLASS_CHANGE_KEYS.attempts
      )
    ) + 1

  if (
    pendingRecoveryContext.attempts >
    NEXUS_CLASS_CHANGE_MAX_RECOVERY_ATTEMPTS
  ) {
    nexusFeedback(
      source,
      player,
      'Recovery agotado; se requiere procedimiento administrativo offline.',
      true
    )

    return false
  }

  pendingRecoveryContext.data.putInt(
    NEXUS_CLASS_CHANGE_KEYS.attempts,
    pendingRecoveryContext.attempts
  )

  pendingRecoveryContext.requestedMode =
    String(
      pendingRecoveryContext.data.getString(
        NEXUS_CLASS_CHANGE_KEYS
          .recoveryMode
      ) || ''
    )

  pendingRecoveryContext.forward =
    pendingRecoveryContext.requestedMode ===
      'FORWARD' ||
    NEXUS_CLASS_CHANGE_FORWARD_PHASES
      .indexOf(
        pendingRecoveryContext.phase
      ) >= 0

  try {
    pendingRecoveryContext.succeeded =
      pendingRecoveryContext.forward
        ? nexusFinalizeForward(player)
        : nexusRestoreOldState(player)

    if (
      !pendingRecoveryContext.succeeded
    ) {
      nexusMarkRecovery(
        player,
        pendingRecoveryContext.forward
          ? 'FORWARD'
          : 'ROLLBACK',
        'verification_failed'
      )
    }

    return pendingRecoveryContext.succeeded
  } catch (error) {
    nexusMarkRecovery(
      player,
      pendingRecoveryContext.forward
        ? 'FORWARD'
        : 'ROLLBACK',
      error
    )

    return false
  }
}

function nexusChangeClass(
  source,
  player,
  targetClass,
  initialRequested
) {
  var changeTarget =
    nexusResolveClassTarget(targetClass)

  var changePlayerKey
  var changeValidation
  var changeChargeResult
  var changeUnequipResult
  var changeFailurePhase
  var changeRequiresForwardRecovery

  var changeDiagnostic = {
    operation: 'validate_target'
  }

  var changeErrorStack = ''

  if (!changeTarget) {
    nexusFeedback(
      source,
      player,
      'Clase no valida. Usa warrior, mage, arcanist o gunslinger.',
      true
    )

    return 0
  }

  changePlayerKey =
    nexusPlayerKey(player)

  if (
    nexusClassChangeLocks.has(
      changePlayerKey
    )
  ) {
    nexusFeedback(
      source,
      player,
      'Ya hay una transicion de clase activa.',
      true
    )

    return 0
  }

  nexusClassChangeLocks.add(
    changePlayerKey
  )

  try {
    changeDiagnostic.operation =
      'preflight'

    changeValidation =
      nexusPreflight(
        source,
        player,
        changeTarget,
        initialRequested === true
      )

    if (!changeValidation.ok) {
      if (
        !changeValidation.feedbackSent
      ) {
        nexusFeedback(
          source,
          player,
          changeValidation.error,
          true
        )
      }

      return 0
    }

    changeDiagnostic.operation =
      'prepare_journal'

    nexusPrepareJournal(
      player,
      changeTarget,
      initialRequested === true,
      changeValidation
    )

    if (
      !nexusSanitizeActions(
        player,
        changeDiagnostic,
        changeValidation
      )
    ) {
      throw new Error(
        'active_state_sanitization_failed'
      )
    }

    if (!initialRequested) {
      changeDiagnostic.operation =
        'unequip_incompatible_equipment'

      changeUnequipResult =
        $NexusInventoryHelper
          .unequipIncompatibleForClass(
            player,
            changeTarget.mainClass
          )

      if (
        !changeUnequipResult.isOk()
      ) {
        throw new Error(
          'incompatible_equipment_unequip_failed:' +
          changeUnequipResult
            .getMessage()
        )
      }

      changeDiagnostic.operation =
        'charge_experience_levels'

      changeChargeResult =
        nexusChargeExperienceLevels(
          player,
          changeValidation.snapshot,
          NEXUS_CLASS_CHANGE_COST_LEVELS
        )

      if (!changeChargeResult.ok) {
        throw new Error(
          'experience_level_charge_failed:' +
          changeChargeResult.message
        )
      }

      nexusSetPhase(
        player,
        'COST_RESERVED'
      )

      nexusSetPhase(
        player,
        'SANITIZING'
      )
    } else {
      nexusSetPhase(
        player,
        'SANITIZING'
      )
    }

    if (
      !nexusRevokeOldState(
        player,
        changeDiagnostic
      )
    ) {
      throw new Error(
        'old_state_revocation_failed'
      )
    }

    // Mantiene autoridad de rollback hasta que
    // clase principal + especialización sean coherentes.
    changeDiagnostic.operation =
      'apply_atomic_target_state'

    if (
      !nexusApplyNewState(
        player,
        changeTarget.mainClass,
        changeTarget.specialization
      )
    ) {
      throw new Error(
        'atomic_target_state_application_failed'
      )
    }

    changeDiagnostic.operation =
      'mark_forward_boundary'

    nexusSetPhase(
      player,
      'OLD_STATE_REVOKED'
    )

    player.persistentData.putString(
      NEXUS_CLASS_CHANGE_KEYS.recoveryMode,
      'FORWARD'
    )

    changeDiagnostic.operation =
      'finalize_forward'

    if (
      !nexusFinalizeForward(player)
    ) {
      throw new Error(
        'forward_commit_failed'
      )
    }

    nexusFeedback(
      source,
      player,
      initialRequested
        ? `Clase inicial aplicada: ${changeTarget.id}.`
        : `Cambio de clase completado: ${changeTarget.id}.`
    )

    return 1
  } catch (error) {
    if (!nexusHasJournal(player)) {
      nexusFeedback(
        source,
        player,
        'No se pudo preparar la transaccion: ' +
        error,
        true
      )

      return 0
    }

    changeFailurePhase =
      nexusJournalPhase(player)

    try {
      if (
        error &&
        error.stack
      ) {
        changeErrorStack =
          String(error.stack)
      }
    } catch (changeStackReadError) {
      changeErrorStack =
        'stack_unavailable:' +
        String(changeStackReadError)
    }

    nexusAudit(
      'change_failed',
      player,
      {
        txId: String(
          player.persistentData.getString(
            NEXUS_CLASS_CHANGE_KEYS.txId
          )
        ),

        from: String(
          player.persistentData.getString(
            NEXUS_CLASS_CHANGE_KEYS.oldClass
          )
        ),

        to: nexusDestinationId(
          player.persistentData.getString(
            NEXUS_CLASS_CHANGE_KEYS.newClass
          ),
          player.persistentData.getString(
            NEXUS_CLASS_CHANGE_KEYS
              .newSpecialization
          )
        ),

        mainClass: String(
          player.persistentData.getString(
            NEXUS_CLASS_CHANGE_KEYS.newClass
          )
        ),

        specialization: String(
          player.persistentData.getString(
            NEXUS_CLASS_CHANGE_KEYS
              .newSpecialization
          ) || 'none'
        ),

        phase:
          changeFailurePhase ||
          'UNKNOWN',

        operation:
          String(
            changeDiagnostic.operation ||
            'unknown'
          ),

        error:
          String(error),

        stack:
          changeErrorStack
      }
    )

    changeRequiresForwardRecovery =
      NEXUS_CLASS_CHANGE_FORWARD_PHASES
        .indexOf(
          changeFailurePhase
        ) >= 0

    if (
      changeRequiresForwardRecovery
    ) {
      nexusMarkRecovery(
        player,
        'FORWARD',
        error
      )
    } else if (
      !nexusRestoreOldState(player)
    ) {
      nexusMarkRecovery(
        player,
        'ROLLBACK',
        error
      )
    }

    nexusFeedback(
      source,
      player,
      changeRequiresForwardRecovery
        ? 'Cambio incompleto: estado conservado para forward recovery.'
        : 'Cambio cancelado; se intento restaurar el estado anterior.',
      true
    )

    return 0
  } finally {
    nexusClassChangeLocks.delete(
      changePlayerKey
    )
  }
}

function nexusRepairClass(
  source,
  player
) {
  var repairPlayerKey =
    nexusPlayerKey(player)

  var repairPersistentData
  var repairApi
  var repairRawClass
  var repairAuthoritativeClass
  var repairRawSpecialization
  var repairSpecializationValid
  var repairClassStageState
  var repairSpecializationStageState
  var repairCooldown
  var repairUnequipResult
  var repairKitPending = false

  if (
    nexusClassChangeLocks.has(
      repairPlayerKey
    )
  ) {
    nexusFeedback(
      source,
      player,
      'El jugador tiene una operacion activa.',
      true
    )

    return 0
  }

  nexusClassChangeLocks.add(
    repairPlayerKey
  )

  try {
    repairPersistentData =
      player.persistentData

    if (
      $NexusInventoryHelper
        .hasExternalMenu(player)
    ) {
      $NexusInventoryHelper
        .closeExternalMenu(player)

      nexusFeedback(
        source,
        player,
        'Interfaz cerrada; activa de nuevo el altar.',
        true
      )

      return 0
    }

    if (
      nexusHasJournal(player) &&
      Number(
        repairPersistentData.getInt(
          NEXUS_CLASS_CHANGE_KEYS.attempts
        )
      ) >=
        NEXUS_CLASS_CHANGE_MAX_RECOVERY_ATTEMPTS
    ) {
      nexusAudit(
        'manual_recovery_retry',
        player,
        {
          previous_attempts:
            Number(
              repairPersistentData.getInt(
                NEXUS_CLASS_CHANGE_KEYS.attempts
              )
            )
        }
      )

      repairPersistentData.putInt(
        NEXUS_CLASS_CHANGE_KEYS.attempts,
        0
      )
    }

    if (
      nexusHasJournal(player) &&
      !nexusRecoverPendingLocked(
        player,
        source
      )
    ) {
      return 0
    }

    repairApi =
      nexusSelectionApi()

    if (
      !nexusMigrateLegacyMetallurgist(
        player,
        'repair'
      )
    ) {
      throw new Error(
        'legacy_metallurgist_migration_failed'
      )
    }

    repairRawClass =
      String(
        repairPersistentData.getString(
          'nexus_class'
        ) || ''
      )

    repairAuthoritativeClass =
      nexusStrictClass(
        repairRawClass
      )

    repairApi.clearClassTags(
      player
    )

    if (
      repairAuthoritativeClass ===
      'none'
    ) {
      repairPersistentData.remove(
        'nexus_class'
      )

      repairPersistentData.putBoolean(
        'nexus_class_chosen',
        false
      )
    } else {
      repairPersistentData.putString(
        'nexus_class',
        repairAuthoritativeClass
      )

      repairPersistentData.putBoolean(
        'nexus_class_chosen',
        true
      )

      player.addTag(
        repairApi.classData[
          repairAuthoritativeClass
        ].tag
      )
    }

    repairRawSpecialization =
      String(
        repairPersistentData.getString(
          'nexus_specialization'
        ) || ''
      )

    repairSpecializationValid =
      repairAuthoritativeClass === 'mage' &&
      repairRawSpecialization ===
        'arcanist'

    if (
      !repairSpecializationValid
    ) {
      repairPersistentData.remove(
        'nexus_specialization'
      )

      repairRawSpecialization = ''
    }

    if (
      !repairApi.syncClassStages(
        player,
        'repair'
      )
    ) {
      repairClassStageState =
        repairApi.getClassStageState(
          player
        )

      throw new Error(
        'class_stage_repair_failed:' +
        'detail=' +
        repairClassStageState.detail +
        ',' +
        'available=' +
        repairClassStageState.available +
        ',' +
        'warrior=' +
        repairClassStageState.warrior +
        ',' +
        'mage=' +
        repairClassStageState.mage +
        ',' +
        'gunslinger=' +
        repairClassStageState.gunslinger
      )
    }

    if (
      !repairApi.syncSpecialization(
        player,
        'repair'
      )
    ) {
      repairSpecializationStageState =
        repairApi
          .getSpecializationStageState(
            player
          )

      throw new Error(
        'specialization_repair_failed:' +
        'detail=' +
        repairApi
          .getSpecializationSyncDetail() +
        ',' +
        'raw=' +
        repairRawSpecialization +
        ',' +
        'arcanist=' +
        repairSpecializationStageState
          .arcanist +
        ',' +
        'metallurgist=' +
        repairSpecializationStageState
          .metallurgist
      )
    }

    repairCooldown =
      nexusCooldownState(
        player,
        nexusNow()
      )

    if (!repairCooldown.valid) {
      repairPersistentData.remove(
        NEXUS_CLASS_CHANGE_KEYS.lastAt
      )

      repairPersistentData.remove(
        NEXUS_CLASS_CHANGE_KEYS.nextAt
      )
    }

    repairUnequipResult =
      $NexusInventoryHelper
        .unequipIncompatible(player)

    if (
      !repairUnequipResult.isOk()
    ) {
      throw new Error(
        'incompatible_equipment_repair_failed:' +
        repairUnequipResult
          .getMessage()
      )
    }

    if (
      !nexusStateCoherent(
        player,
        repairAuthoritativeClass
      )
    ) {
      throw new Error(
        'repair_verification_failed'
      )
    }

    $NexusClassSyncEvents.forceSync(
      player
    )

    try {
      nexusMigrateLegacySpecializationStarterState(
        player
      )

      repairKitPending =
        !nexusRetryPendingStarterKits(
          player
        )
    } catch (repairKitError) {
      repairKitPending = true

      nexusAudit(
        'starter_kit_repair_retry_failed',
        player,
        {
          error: String(repairKitError)
        }
      )
    }

    nexusAudit(
      'repair',
      player,
      {
        authority:
          repairAuthoritativeClass,

        rawBefore:
          repairRawClass,

        specialization:
          repairRawSpecialization ||
          'none',

        unequipped:
          Number(
            repairUnequipResult
              .getAffectedStacks()
          ),

        cooldownRepaired:
          !repairCooldown.valid,

        kitPending:
          repairKitPending
      }
    )

    nexusFeedback(
      source,
      player,
      `Clase reparada: ` +
      `${repairAuthoritativeClass}; ` +
      `equipo retirado: ` +
      `${Number(
        repairUnequipResult.getAffectedStacks()
      )}.` +
      (
        repairKitPending
          ? ' Starter kit: KIT_PENDING; la identidad no requiere recovery.'
          : ' Starter kit: completo o no aplicable.'
      )
    )

    return 1
  } catch (error) {
    nexusAudit(
      'repair_failed',
      player,
      {
        error: String(error)
      }
    )

    nexusFeedback(
      source,
      player,
      'No se pudo verificar la reparacion: ' +
      error,
      true
    )

    return 0
  } finally {
    nexusClassChangeLocks.delete(
      repairPlayerKey
    )
  }
}

function nexusTellClassChangeStatus(
  source,
  target
) {
  const api =
    nexusSelectionApi()

  const data =
    target.persistentData

  const raw =
    String(
      data.getString(
        'nexus_class'
      ) || ''
    )

  const resolved =
    nexusStrictClass(raw)

  const stages =
    api.getClassStageState(
      target
    )

  const specializationStages =
    api.getSpecializationStageState(
      target
    )

  const allomancy =
    api.getAllomancyData(
      target
    )

  const cooldown =
    nexusCooldownState(
      target,
      nexusNow()
    )

  const baseKit =
    nexusStarterKitRecord(
      target,
      'base'
    )

  const specializationKit =
    nexusStarterKitRecord(
      target,
      'specialization'
    )

  const lines = [
    `Jugador: ${api.playerName(target)}`,

    `Clase persistente raw: ` +
    `${raw || '<ausente>'}`,

    `Clase autoritativa: ${resolved}`,

    `Chosen: ` +
    `${data.getBoolean(
      'nexus_class_chosen'
    ) === true}`,

    `Tags: ` +
    `warrior=${target.tags.contains(
      'nexus_class_warrior'
    )}, ` +
    `mage=${target.tags.contains(
      'nexus_class_mage'
    )}, ` +
    `gunslinger=${target.tags.contains(
      'nexus_class_gunslinger'
    )}`,

    `Stages: ` +
    `warrior=${stages.warrior}, ` +
    `mage=${stages.mage}, ` +
    `gunslinger=${stages.gunslinger}`,

    `Especializacion raw: ` +
    `${api.getRawSpecialization(target) ||
      '<ausente>'}`,

    `Stages spec: ` +
    `arcanist=${specializationStages.arcanist}, ` +
    `metallurgist=${specializationStages.metallurgist}`,

    `Poderes Allomancy: ` +
    `${allomancy
      ? Number(
        allomancy.getPowerCount()
      )
      : 'N/D'}`,

    `Journal: ` +
    `${nexusJournalPhase(target) ||
      'IDLE'}`,

    `Starter base: ` +
    `${baseKit
      ? (
        String(baseKit.getString('State')) +
        ' ' +
        Number(baseKit.getInt('NextIndex')) +
        '/' +
        Number(baseKit.getInt('EntryCount')) +
        ' reason=' +
        String(baseKit.getString('LastReason'))
      )
      : 'ABSENT'}`,

    `Starter specialization: ` +
    `${specializationKit
      ? (
        String(specializationKit.getString('State')) +
        ' ' +
        Number(specializationKit.getInt('NextIndex')) +
        '/' +
        Number(specializationKit.getInt('EntryCount')) +
        ' reason=' +
        String(specializationKit.getString('LastReason'))
      )
      : 'ABSENT'}`,

    `Lock memoria: ` +
    `${nexusClassChangeLocks.has(
      nexusPlayerKey(target)
    )}`,

    `Started at: ` +
    `${Number(
      data.getLong(
        NEXUS_CLASS_CHANGE_KEYS.startedAt
      )
    ) || 0}`,

    `Cooldown: ` +
    `${cooldown.valid
      ? (
        cooldown.active
          ? nexusFormatDuration(
            cooldown.remaining
          )
          : 'inactivo'
      )
      : 'CORRUPTO'}`,

    `Coherente: ` +
    `${nexusStateCoherent(
      target,
      resolved
    )}`
  ]

  lines.forEach(
    line =>
      nexusSourceFeedback(
        source,
        line
      )
  )
}

function nexusClearClassChangeCooldown(
  source,
  player
) {
  var clearCooldownContext = {
    playerKey:
      nexusPlayerKey(player),
    data: null,
    hadLast: false,
    hadNext: false,
    state: null
  }

  if (
    nexusClassChangeLocks.has(
      clearCooldownContext.playerKey
    )
  ) {
    nexusFeedback(
      source,
      player,
      'El jugador tiene una operacion de clase activa.',
      true
    )

    return 0
  }

  nexusClassChangeLocks.add(
    clearCooldownContext.playerKey
  )

  try {
    if (
      nexusHasJournal(player)
    ) {
      nexusFeedback(
        source,
        player,
        'El jugador tiene una transaccion pendiente; ' +
        'resuelvela con /nexus_repairclass antes de ' +
        'limpiar el cooldown.',
        true
      )

      return 0
    }

    clearCooldownContext.data =
      player.persistentData

    clearCooldownContext.hadLast =
      clearCooldownContext.data.contains(
        NEXUS_CLASS_CHANGE_KEYS.lastAt
      )

    clearCooldownContext.hadNext =
      clearCooldownContext.data.contains(
        NEXUS_CLASS_CHANGE_KEYS.nextAt
      )

    clearCooldownContext.data.remove(
      NEXUS_CLASS_CHANGE_KEYS.lastAt
    )

    clearCooldownContext.data.remove(
      NEXUS_CLASS_CHANGE_KEYS.nextAt
    )

    clearCooldownContext.state =
      nexusCooldownState(
        player,
        nexusNow()
      )

    if (
      clearCooldownContext.state.valid !==
        true ||
      clearCooldownContext.state.active !==
        false ||
      Number(
        clearCooldownContext.state.remaining
      ) !== 0
    ) {
      nexusFeedback(
        source,
        player,
        'No se pudo verificar la eliminacion del cooldown.',
        true
      )

      return 0
    }

    nexusAudit(
      'cooldown_cleared',
      player,
      {
        alreadyInactive:
          !clearCooldownContext.hadLast &&
          !clearCooldownContext.hadNext,

        normalizedPair:
          clearCooldownContext.hadLast !==
          clearCooldownContext.hadNext
      }
    )

    nexusFeedback(
      source,
      player,
      !clearCooldownContext.hadLast &&
      !clearCooldownContext.hadNext
        ? `El cooldown de cambio de clase de ` +
          `${player.username} ya estaba inactivo.`
        : `Cooldown de cambio de clase eliminado ` +
          `para ${player.username}.`
    )

    return 1
  } finally {
    nexusClassChangeLocks.delete(
      clearCooldownContext.playerKey
    )
  }
}

function nexusClassChangeLogin(player) {
  player.server.scheduleInTicks(
    40,
    callback => {
      const key =
        nexusPlayerKey(player)

      if (
        nexusClassChangeLocks.has(key)
      ) {
        return
      }

      nexusClassChangeLocks.add(key)

      try {
        if (
          nexusHasJournal(player) &&
          !nexusRecoverPendingLocked(
            player,
            null
          )
        ) {
          player.tell(
            'Tu cambio de clase necesita recuperacion administrativa.'
          )

          return
        }

        if (
          !nexusMigrateLegacyMetallurgist(
            player,
            'login'
          )
        ) {
          player.tell(
            'No se pudo migrar tu antigua Senda del Metal; solicita /nexus_repairclass.'
          )

          return
        }

        if (
          !nexusSelectionApi().syncClassStages(
            player,
            'login'
          ) ||
          !nexusSelectionApi().syncSpecialization(
            player,
            'login'
          )
        ) {
          player.tell(
            'No se pudo reconciliar tu clase; solicita /nexus_repairclass.'
          )

          return
        }

        const raw =
          String(
            player.persistentData.getString(
              'nexus_class'
            ) || ''
          )

        const resolved =
          nexusStrictClass(raw)

        if (
          !nexusStateCoherent(
            player,
            resolved
          )
        ) {
          player.tell(
            'Tu estado de clase necesita /nexus_repairclass antes de continuar.'
          )

          return
        }

        $NexusClassSyncEvents
          .forceSync(player)

        try {
          nexusMigrateLegacySpecializationStarterState(
            player
          )

          if (
            !nexusRetryPendingStarterKits(
              player
            )
          ) {
            player.tell(
              'Tu identidad de clase esta sincronizada; ' +
              'el starter kit sigue KIT_PENDING.'
            )
          }
        } catch (loginKitError) {
          nexusAudit(
            'starter_kit_login_retry_failed',
            player,
            {
              error: String(loginKitError)
            }
          )

          player.tell(
            'Tu identidad de clase esta sincronizada; ' +
            'el starter kit no pudo reintentarse y sigue pendiente.'
          )
        }

        if (resolved === 'none') {
          nexusSelectionApi()
            .openClassSelector(player)
        }
      } finally {
        nexusClassChangeLocks.delete(key)
      }
    }
  )
}

global.nexusChangeClass =
  nexusChangeClass

global.nexusRepairClass =
  nexusRepairClass

global.nexusTellClassChangeStatus =
  nexusTellClassChangeStatus

global.nexusClassChangeLogin =
  nexusClassChangeLogin

global.nexusDeliverSpecializationKit =
  nexusDeliverSpecializationKit

global.nexusClearStarterKitLedger =
  nexusClearStarterKitLedger

ServerEvents.commandRegistry(
  event => {
    const Commands =
      event.commands

    const Arguments =
      event.arguments

    event.register(
      Commands
        .literal(
          'nexus_changeclass'
        )
        .requires(
          source =>
            source.hasPermission(2)
        )
        .then(
          Commands
            .argument(
              'player',
              Arguments.PLAYER.create(event)
            )
            .then(
              Commands
                .argument(
                  'class',
                  Arguments.STRING.create(event)
                )
                .executes(
                  ctx => {
                    const target =
                      Arguments.PLAYER.getResult(
                        ctx,
                        'player'
                      )

                    const classId =
                      String(
                        Arguments.STRING.getResult(
                          ctx,
                          'class'
                        )
                      ).toLowerCase()

                    return nexusChangeClass(
                      ctx.source,
                      target,
                      classId,
                      false
                    )
                  }
                )
            )
        )
    )

    event.register(
      Commands
        .literal(
          'nexus_repairclass'
        )
        .requires(
          source =>
            source.hasPermission(2)
        )
        .then(
          Commands
            .argument(
              'player',
              Arguments.PLAYER.create(event)
            )
            .executes(
              ctx =>
                nexusRepairClass(
                  ctx.source,
                  Arguments.PLAYER.getResult(
                    ctx,
                    'player'
                  )
                )
            )
        )
    )

    event.register(
      Commands
        .literal(
          'nexus_changeclass_status'
        )
        .requires(
          source =>
            source.hasPermission(2)
        )
        .then(
          Commands
            .argument(
              'player',
              Arguments.PLAYER.create(event)
            )
            .executes(
              ctx => {
                nexusTellClassChangeStatus(
                  ctx.source,
                  Arguments.PLAYER.getResult(
                    ctx,
                    'player'
                  )
                )

                return 1
              }
            )
        )
    )

    event.register(
      Commands
        .literal(
          'nexus_changeclass_clearcooldown'
        )
        .requires(
          source =>
            source.hasPermission(2)
        )
        .then(
          Commands
            .argument(
              'player',
              Arguments.PLAYER.create(event)
            )
            .executes(
              ctx =>
                nexusClearClassChangeCooldown(
                  ctx.source,
                  Arguments.PLAYER.getResult(
                    ctx,
                    'player'
                  )
                )
            )
        )
    )
  }
)
