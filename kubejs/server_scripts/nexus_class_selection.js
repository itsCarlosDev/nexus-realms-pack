const NEXUS_CLASS_DATA = {
  warrior: {
    displayName: 'Guerrero',
    tag: 'nexus_class_warrior',
    kit: [
      { id: 'simplyswords:iron_glaive', count: 1 },
      { id: 'minecraft:shield', count: 1 },
      { id: 'minecraft:bread', count: 16 },
      {
        id: 'minecraft:potion',
        count: 1,
        nbt: '{Potion:"minecraft:water"}'
      },
      { id: 'minecraft:campfire', count: 1 }
    ]
  },
  mage: {
    displayName: 'Mago',
    tag: 'nexus_class_mage',
    kit: [
      { id: 'minecraft:amethyst_shard', count: 8 },
      { id: 'minecraft:bread', count: 16 },
      {
        id: 'minecraft:potion',
        count: 1,
        nbt: '{Potion:"minecraft:water"}'
      },
      { id: 'minecraft:campfire', count: 1 }
    ]
  },
  gunslinger: {
    displayName: 'Pistolero',
    tag: 'nexus_class_gunslinger',
    kit: [
      {
        id: 'tacz:modern_kinetic_gun',
        count: 1,
        special: 'gunslinger_starter_gun'
      },
      {
        id: 'tacz:ammo',
        count: 16,
        nbt: '{AmmoId:"tacz:9mm"}'
      },
      { id: 'minecraft:bread', count: 16 },
      {
        id: 'minecraft:potion',
        count: 1,
        nbt: '{Potion:"minecraft:water"}'
      },
      { id: 'minecraft:campfire', count: 1 }
    ]
  }
}

const NEXUS_CLASS_TAGS = Object.values(NEXUS_CLASS_DATA).map(classData => classData.tag)
const NEXUS_CLASS_GUI_ID = 'nexus_class_selection'
const NEXUS_MAGE_SPECIALIZATION_GUI_ID = 'nexus_mage_selection'
const NEXUS_CLASS_SELECTOR_RETRY_TICKS = [10, 40, 100]
const NEXUS_CLASS_CHANGE_PHASE_KEY = 'nexus_class_change_phase'
const nexusClassSelectorRetryStates = new Map()

const NEXUS_CLASS_STAGE_IDS = {
  warrior: 'nexus_class_warrior',
  mage: 'nexus_class_mage',
  gunslinger: 'nexus_class_gunslinger'
}

const NEXUS_CLASS_STAGE_LIST = Object.values(NEXUS_CLASS_STAGE_IDS)

const NEXUS_SPECIALIZATION_DATA = {
  arcanist: {
    displayName: 'Arcanista',
    stageId: 'nexus_specialization_arcanist',
    starterKit: [
      {
        id: 'irons_spellbooks:copper_spell_book',
        count: 1,
        nbt: '{"nexus_arcanist_starter":1b,"irons_spellbooks:spell_container":{data:[{id:"irons_spellbooks:acupuncture",index:0,level:1}],maxSpells:5,mustEquip:1b,spellWheel:1b}}'
      }
    ]
  },
  metallurgist: {
    displayName: 'Metalomante',
    stageId: 'nexus_specialization_metallurgist',
    starterKit: [],
    legacyOnly: true
  }
}

const NEXUS_SPECIALIZATION_STAGE_LIST = Object.values(NEXUS_SPECIALIZATION_DATA)
  .map(specialization => specialization.stageId)

const NEXUS_INDIVIDUAL_STAGE_LIST = NEXUS_CLASS_STAGE_LIST.concat(
  NEXUS_SPECIALIZATION_STAGE_LIST
)

const NEXUS_ALLOMANCY_BASE_POWERS = [
  'iron',
  'steel',
  'tin',
  'pewter',
  'zinc',
  'brass',
  'copper',
  'bronze'
]

const $NexusIndividualStageData = Java.loadClass(
  'net.bananemdnsa.historystages.util.IndividualStageData'
)

const $NexusStageManager = Java.loadClass(
  'net.bananemdnsa.historystages.data.StageManager'
)

const $NexusHistoryStagesCompat = Java.loadClass(
  'dev.itscarlos.nexuscore.HistoryStagesCompat'
)

let $NexusAllomancerCapability = null
let $NexusAllomancyNetwork = null
let $NexusAllomancyMetal = null

try {
  $NexusAllomancerCapability = Java.loadClass(
    'com.legobmw99.allomancy.modules.powers.data.AllomancerCapability'
  )
  $NexusAllomancyNetwork = Java.loadClass(
    'com.legobmw99.allomancy.network.Network'
  )
  $NexusAllomancyMetal = Java.loadClass(
    'com.legobmw99.allomancy.api.enums.Metal'
  )
} catch (allomancyLoadError) {
  console.warn(
    '[Nexus Realms] Allomancy public API unavailable: ' +
    allomancyLoadError
  )
}

let nexusClassStageWarningLogged = false
let nexusAllomancyWarningLogged = false
let nexusSpecializationWarningLogged = false
let nexusClassStageAvailabilityDetail = 'not_checked'
let nexusSpecializationSyncDetail = 'not_checked'

const NEXUS_CLASS_PATH_MESSAGES = {
  warrior: '⚔️ Guerrero elegido. Tu senda marcial comienza.',
  mage: '✨ Mago elegido. El poder arcano despierta.',
  gunslinger: '🔫 Pistolero elegido. Munición lista.'
}

const NEXUS_CLASS_STATUS_MESSAGES = {
  warrior: '⚔️ Senda marcial.',
  mage: '✨ Senda arcana.',
  gunslinger: '🔫 Senda balística.',
  none: 'Elige una clase con el selector.'
}

function nexusHasClass(player) {
  return player.persistentData.getBoolean('nexus_class_chosen') === true
}

function nexusGetPersistentClass(player) {
  const classId = String(
    player.persistentData.getString('nexus_class') || ''
  )

  if (NEXUS_CLASS_DATA[classId]) {
    return classId
  }

  return 'none'
}

function nexusClassStageDefinitionsAvailable() {
  var stageDefinitionCheck = {
    index: 0,
    stageId: '',
    missing: []
  }

  try {
    nexusClassStageAvailabilityDetail = 'checking'

    while (stageDefinitionCheck.index < NEXUS_INDIVIDUAL_STAGE_LIST.length) {
      stageDefinitionCheck.stageId =
        NEXUS_INDIVIDUAL_STAGE_LIST[stageDefinitionCheck.index]

      if (
        !nexusStageBoolean(
          $NexusStageManager.isIndividualStage(stageDefinitionCheck.stageId)
        )
      ) {
        stageDefinitionCheck.missing.push(stageDefinitionCheck.stageId)
      }

      stageDefinitionCheck.index++
    }

    if (stageDefinitionCheck.missing.length > 0) {
      nexusClassStageAvailabilityDetail =
        'missing=' + stageDefinitionCheck.missing.join(',')

      if (!nexusClassStageWarningLogged) {
        nexusClassStageWarningLogged = true

        console.warn(
          `[Nexus Realms] Missing History Stages class definitions: ` +
          `${stageDefinitionCheck.missing.join(', ')}`
        )
      }

      return false
    }

    nexusClassStageAvailabilityDetail = 'ok'
    return true
  } catch (error) {
    nexusClassStageAvailabilityDetail = 'definition_error=' + String(error)

    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true

      console.warn(
        `[Nexus Realms] History Stages class definitions unavailable: ${error}`
      )
    }

    return false
  }
}

function nexusGetRawSpecialization(player) {
  return String(
    player.persistentData.getString('nexus_specialization') || ''
  )
}

function nexusGetPersistentSpecialization(player) {
  const specialization = nexusGetRawSpecialization(player)

  return (
    specialization === 'arcanist' &&
    nexusGetPersistentClass(player) === 'mage'
  )
    ? specialization
    : 'none'
}

function nexusGetSpecializationStageState(player) {
  var nexusSpecializationStageReadContext = {
    result: {
      available: false,
      arcanist: false,
      metallurgist: false
    },
    stageData: null,
    ids: Object.keys(NEXUS_SPECIALIZATION_DATA),
    index: 0,
    currentId: null
  }

  try {
    if (!nexusClassStageDefinitionsAvailable()) {
      return nexusSpecializationStageReadContext.result
    }

    nexusSpecializationStageReadContext.stageData =
      $NexusIndividualStageData.get(player.level)

    nexusSpecializationStageReadContext.result.available = true

    while (
      nexusSpecializationStageReadContext.index <
      nexusSpecializationStageReadContext.ids.length
    ) {
      nexusSpecializationStageReadContext.currentId =
        nexusSpecializationStageReadContext.ids[
          nexusSpecializationStageReadContext.index
        ]

      nexusSpecializationStageReadContext.result[
        nexusSpecializationStageReadContext.currentId
      ] =
        nexusSpecializationStageReadContext.stageData.hasStage(
          player.uuid,
          NEXUS_SPECIALIZATION_DATA[
            nexusSpecializationStageReadContext.currentId
          ].stageId
        )

      nexusSpecializationStageReadContext.index++
    }
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true

      console.warn(
        `[Nexus Realms] Unable to read specialization stages: ${error}`
      )
    }
  }

  return nexusSpecializationStageReadContext.result
}

function nexusStageBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true'
}

function nexusSpecializationStagesCoherent(
  classId,
  specializationId,
  stageState
) {
  if (!nexusStageBoolean(stageState.available)) {
    return false
  }

  var expectedSpecializationStage =
    classId === 'mage' &&
    specializationId === 'arcanist'
      ? specializationId
      : null

  return Object.keys(NEXUS_SPECIALIZATION_DATA).every(
    candidate => {
      return (
        nexusStageBoolean(stageState[candidate]) ===
        (candidate === expectedSpecializationStage)
      )
    }
  )
}

function nexusSyncAllomancyPowers(
  player,
  classId,
  reason
) {
  var allomancySyncContext = {
    data: null,
    grantWarrior: false,
    expectedPowerCount: 0,
    powersVerified: false,
    index: 0,
    powerId: ''
  }

  if (
    !Platform.isLoaded('allomancy') ||
    !$NexusAllomancerCapability ||
    !$NexusAllomancyNetwork ||
    !$NexusAllomancyMetal
  ) {
    if (!nexusAllomancyWarningLogged) {
      nexusAllomancyWarningLogged = true

      console.warn(
        '[Nexus Realms] Allomancy is not loaded; ' +
        'Warrior powers could not be synchronized.'
      )
    }

    return false
  }

  try {
    allomancySyncContext.data = player.getCapability(
      $NexusAllomancerCapability.PLAYER_CAP
    ).orElse(null)

    if (!allomancySyncContext.data) {
      return false
    }

    allomancySyncContext.grantWarrior =
      classId === 'warrior'

    if (allomancySyncContext.grantWarrior) {
      while (
        allomancySyncContext.index <
          NEXUS_ALLOMANCY_BASE_POWERS.length
      ) {
        allomancySyncContext.powerId =
          NEXUS_ALLOMANCY_BASE_POWERS[allomancySyncContext.index]

        if (
          !nexusStageBoolean(
            allomancySyncContext.data.hasPower(
              $NexusAllomancyMetal.valueOf(
                String(allomancySyncContext.powerId).toUpperCase()
              )
            )
          )
        ) {
          allomancySyncContext.data.addPower(
            $NexusAllomancyMetal.valueOf(
              String(allomancySyncContext.powerId).toUpperCase()
            )
          )
        }
        allomancySyncContext.index++
      }
    } else {
      allomancySyncContext.data.setUninvested()
    }

    $NexusAllomancyNetwork.sync(
      allomancySyncContext.data,
      player
    )

    allomancySyncContext.expectedPowerCount =
      allomancySyncContext.grantWarrior
        ? NEXUS_ALLOMANCY_BASE_POWERS.length
        : 0

    allomancySyncContext.powersVerified =
      allomancySyncContext.grantWarrior
        ? Number(allomancySyncContext.data.getPowerCount()) >=
          allomancySyncContext.expectedPowerCount
        : Number(allomancySyncContext.data.getPowerCount()) === 0

    allomancySyncContext.index = 0
    while (
      allomancySyncContext.powersVerified &&
      allomancySyncContext.grantWarrior &&
      allomancySyncContext.index < NEXUS_ALLOMANCY_BASE_POWERS.length
    ) {
      allomancySyncContext.powerId =
        NEXUS_ALLOMANCY_BASE_POWERS[allomancySyncContext.index]

      allomancySyncContext.powersVerified = nexusStageBoolean(
        allomancySyncContext.data.hasPower(
          $NexusAllomancyMetal.valueOf(
            String(allomancySyncContext.powerId).toUpperCase()
          )
        )
      )
      allomancySyncContext.index++
    }

    if (!allomancySyncContext.powersVerified) {
      return false
    }

    if (
      reason === 'selection' ||
      reason === 'unlock'
    ) {
      console.info(
        '[Nexus Realms] Allomancy powers synchronized for ' +
          String(player.username) +
          ': ' +
          (
            allomancySyncContext.grantWarrior
              ? 'Warrior base powers reconciled'
              : 'powers revoked'
          )
      )
    }

    return true
  } catch (error) {
    if (!nexusAllomancyWarningLogged) {
      nexusAllomancyWarningLogged = true

      console.warn(
        '[Nexus Realms] Unable to synchronize ' +
          'Allomancy powers: ' +
          error
      )
    }

    return false
  }
}

function nexusGetAllomancyData(player) {
  if (
    !$NexusAllomancerCapability ||
    !$NexusAllomancyNetwork
  ) {
    return null
  }

  return player.getCapability(
    $NexusAllomancerCapability.PLAYER_CAP
  ).orElse(null)
}

function nexusRestoreAllomancyData(player, snapshot) {
  var allomancyRestoreData

  try {
    allomancyRestoreData = nexusGetAllomancyData(player)

    if (!allomancyRestoreData || !snapshot) {
      return false
    }

    allomancyRestoreData.load(snapshot.copy())
    $NexusAllomancyNetwork.sync(allomancyRestoreData, player)

    return allomancyRestoreData.save().equals(snapshot)
  } catch (error) {
    console.error(
      '[Nexus Realms] Unable to restore Allomancy snapshot: ' +
      error
    )

    return false
  }
}


function nexusSyncSpecialization(player, reason) {
  nexusSpecializationSyncDetail = 'started'

  try {
    if (!nexusClassStageDefinitionsAvailable()) {
      nexusSpecializationSyncDetail =
        'stage_definitions_unavailable:' +
        nexusClassStageAvailabilityDetail
      return false
    }

    var specializationSyncContext = {
      raw: nexusGetRawSpecialization(player),
      classId: nexusGetPersistentClass(player),
      expected: null,
      stageData: $NexusIndividualStageData.get(player.level),
      playerUuid: player.uuid,
      correctedPersistentData: false,
      stageChanged: false,
      ids: Object.keys(NEXUS_SPECIALIZATION_DATA),
      currentId: null,
      currentStageId: null,
      shouldHaveStage: false,
      hasStage: false,
      stagesSent: true,
      allomancySynced: false,
      verifiedStages: null,
      stagesCoherent: false,
      allomancyData: null,
      allomancyPowerCount: -1
    }

    specializationSyncContext.expected =
      specializationSyncContext.classId === 'mage' &&
      specializationSyncContext.raw === 'arcanist'
        ? 'arcanist'
        : null

    if (
      !specializationSyncContext.expected &&
      specializationSyncContext.raw
    ) {
      player.persistentData.remove(
        'nexus_specialization'
      )

      specializationSyncContext.correctedPersistentData = true
    }

    player.persistentData.remove(
      'nexus_specialization_metallurgist_unlocked'
    )

    for (
      var specializationIndex = 0;
      specializationIndex <
      specializationSyncContext.ids.length;
      specializationIndex++
    ) {
      specializationSyncContext.currentId =
        specializationSyncContext.ids[
          specializationIndex
        ]

      specializationSyncContext.currentStageId =
        NEXUS_SPECIALIZATION_DATA[
          specializationSyncContext.currentId
        ].stageId

      specializationSyncContext.shouldHaveStage =
        specializationSyncContext.currentId ===
        specializationSyncContext.expected

      specializationSyncContext.hasStage =
        nexusStageBoolean(
          specializationSyncContext.stageData.hasStage(
            specializationSyncContext.playerUuid,
            specializationSyncContext.currentStageId
          )
        )

      if (
        specializationSyncContext.shouldHaveStage &&
        !specializationSyncContext.hasStage
      ) {
        specializationSyncContext.stageData.addStage(
          specializationSyncContext.playerUuid,
          specializationSyncContext.currentStageId
        )

        specializationSyncContext.stageChanged = true
      } else if (
        !specializationSyncContext.shouldHaveStage &&
        specializationSyncContext.hasStage
      ) {
        specializationSyncContext.stageData.removeStage(
          specializationSyncContext.playerUuid,
          specializationSyncContext.currentStageId
        )

        specializationSyncContext.stageChanged = true
      }
    }

    if (specializationSyncContext.stageChanged) {
      specializationSyncContext.stageData.setDirty()
      specializationSyncContext.stageData.refreshCache()

      specializationSyncContext.stagesSent =
        $NexusHistoryStagesCompat.sendIndividualStages(
        player,
        specializationSyncContext.stageData.getUnlockedStages(
          specializationSyncContext.playerUuid
        )
      )

      if (!specializationSyncContext.stagesSent) {
        nexusSpecializationSyncDetail =
          'history_stages_send_failed'
        return false
      }
    }

    specializationSyncContext.allomancySynced =
      nexusSyncAllomancyPowers(
        player,
        specializationSyncContext.classId,
        reason
      )

    if (!specializationSyncContext.allomancySynced) {
      specializationSyncContext.allomancyData =
        nexusGetAllomancyData(player)

      if (specializationSyncContext.allomancyData) {
        specializationSyncContext.allomancyPowerCount = Number(
          specializationSyncContext.allomancyData.getPowerCount()
        )
      }

      nexusSpecializationSyncDetail =
        'allomancy_sync_failed:' +
        'class=' +
        specializationSyncContext.classId +
        ',power_count=' +
        specializationSyncContext.allomancyPowerCount
      return false
    }

    specializationSyncContext.verifiedStages =
      nexusGetSpecializationStageState(player)

    specializationSyncContext.stagesCoherent =
      nexusSpecializationStagesCoherent(
        specializationSyncContext.classId,
        specializationSyncContext.expected,
        specializationSyncContext.verifiedStages
      )

    if (!specializationSyncContext.stagesCoherent) {
      nexusSpecializationSyncDetail =
        'stage_verification_failed:' +
        'expected=' +
        (specializationSyncContext.expected || 'none') +
        ',arcanist=' +
        specializationSyncContext.verifiedStages.arcanist +
        ',metallurgist=' +
        specializationSyncContext.verifiedStages.metallurgist
      return false
    }

    if (
      (
        specializationSyncContext.stageChanged ||
        specializationSyncContext.correctedPersistentData
      ) &&
      reason === 'login'
    ) {
      console.info(
        '[Nexus Realms] Reconciled specialization for ' +
        nexusPlayerName(player) +
        ': class=' +
        specializationSyncContext.classId +
        ', specialization=' +
        (
          specializationSyncContext.expected ||
          'none'
        ) +
        ', stageChanged=' +
        specializationSyncContext.stageChanged
      )
    }

    nexusSpecializationSyncDetail = 'ok'
    return true
  } catch (error) {
    nexusSpecializationSyncDetail =
      'exception=' + String(error)

    if (!nexusSpecializationWarningLogged) {
      nexusSpecializationWarningLogged = true

      console.warn(
        '[Nexus Realms] Unable to synchronize ' +
        'Mage specialization: ' +
        error
      )
    }

    return false
  }
}

function nexusGetSpecializationSyncDetail() {
  return nexusSpecializationSyncDetail
}


function nexusCurrentGlobalEra(player) {
  const globalEraData = player.server.persistentData

  return globalEraData.contains('nexusEra')
    ? Number(globalEraData.getInt('nexusEra'))
    : 0
}

function nexusSpecializationFeedback(viewer, message) {
  if (viewer) {
    viewer.tell(message)
  } else {
    console.info(`[Nexus Realms] ${message}`)
  }
}

function nexusTellSpecializationStatus(viewer, target) {
  const classId =
    nexusGetPersistentClass(target)

  const specialization =
    nexusGetPersistentSpecialization(target)

  const stages =
    nexusGetSpecializationStageState(target)

  const coherent =
    nexusSpecializationStagesCoherent(
      classId,
      specialization,
      stages
    )

  nexusSpecializationFeedback(
    viewer,
    `Jugador: ${nexusPlayerName(target)}`
  )

  nexusSpecializationFeedback(
    viewer,
    `Clase principal: ${classId}`
  )

  nexusSpecializationFeedback(
    viewer,
    `Especializacion: ${specialization}`
  )

  nexusSpecializationFeedback(
    viewer,
    `Stage Arcanist: ${stages.arcanist ? 'si' : 'no'}`
  )

  nexusSpecializationFeedback(
    viewer,
    `Stage Metallurgist: ${stages.metallurgist ? 'si' : 'no'}`
  )

  nexusSpecializationFeedback(
    viewer,
    `Marca historica Metalomante: ` +
    `${target.persistentData.getBoolean(
      'nexus_specialization_metallurgist_unlocked'
    ) ? 'si' : 'no'}`
  )

  nexusSpecializationFeedback(
    viewer,
    `Estado coherente: ${coherent ? 'si' : 'no'}`
  )
}

function nexusSelectSpecialization(
  viewer,
  target,
  specializationId
) {
  const specializationData =
    NEXUS_SPECIALIZATION_DATA[specializationId]

  if (!specializationData) {
    nexusSpecializationFeedback(
      viewer,
      'Especializacion no valida. Usa: arcanist.'
    )

    return 0
  }

  if (specializationData.legacyOnly) {
    nexusSpecializationFeedback(
      viewer,
      'Metalomante ya no es seleccionable; Allomancy pertenece a Guerrero.'
    )

    return 0
  }

  if (
    nexusGetPersistentClass(target) !== 'mage'
  ) {
    nexusSpecializationFeedback(
      viewer,
      'Arcanista requiere la clase Mago.'
    )

    return 0
  }

  const stages =
    nexusGetSpecializationStageState(target)

  const currentSpecialization =
    nexusGetPersistentSpecialization(target)

  if (
    currentSpecialization !== 'none' &&
    currentSpecialization !== specializationId
  ) {
    nexusSpecializationFeedback(
      viewer,
      'Los cambios de senda deben realizarse mediante el altar de cambio de clase.'
    )

    return 0
  }

  if (
    currentSpecialization === specializationId &&
    nexusSpecializationStagesCoherent(
      'mage',
      specializationId,
      stages
    )
  ) {
    if (
      !nexusSyncAllomancyPowers(
        target,
        'mage',
        'selection'
      )
    ) {
      nexusSpecializationFeedback(
        viewer,
        'La especializacion existe, pero su estado no pudo verificarse.'
      )

      return 0
    }

    const existingStarterKitFailures =
      nexusGiveSpecializationStarterKit(
        target,
        specializationId
      )

    if (existingStarterKitFailures > 0) {
      nexusSpecializationFeedback(
        viewer,
        `${specializationData.displayName} sigue aplicado; ` +
        'su starter kit permanece KIT_PENDING.'
      )

      return 0
    }

    nexusSpecializationFeedback(
      viewer,
      `${nexusPlayerName(target)} ya sigue la senda ` +
      `${specializationData.displayName}.`
    )

    nexusRunServerCommand(
      target.server,
      `closeguiscreen ${target.username}`
    )

    return 1
  }

  if (
    currentSpecialization === 'arcanist' &&
    specializationId !== 'arcanist'
  ) {
    nexusClearArcanistStarterKit(target)
  }

  target.persistentData.putString(
    'nexus_specialization',
    specializationId
  )

  if (
    !nexusSyncSpecialization(
      target,
      'selection'
    )
  ) {
    if (currentSpecialization === 'none') {
      target.persistentData.remove(
        'nexus_specialization'
      )
    } else {
      target.persistentData.putString(
        'nexus_specialization',
        currentSpecialization
      )

      nexusSyncSpecialization(
        target,
        'rollback'
      )
    }

    nexusSpecializationFeedback(
      viewer,
      'No se pudo sincronizar el stage; ' +
      'la especializacion no se ha guardado.'
    )

    return 0
  }

  const starterKitFailures =
    nexusGiveSpecializationStarterKit(
      target,
      specializationId
    )

  if (starterKitFailures > 0) {
    nexusSpecializationFeedback(
      viewer,
      `La especializacion se guardo, pero fallaron ` +
      `${starterKitFailures} objetos del kit.`
    )
  }

  nexusTellActionbar(
    target,
    `${specializationData.displayName.toUpperCase()} ` +
    '- Senda magica seleccionada.',
    'aqua'
  )

  nexusSpecializationFeedback(
    viewer,
    `${specializationData.displayName} seleccionado para ` +
    `${nexusPlayerName(target)}.`
  )

  nexusRunServerCommand(
    target.server,
    `closeguiscreen ${target.username}`
  )

  return starterKitFailures > 0
    ? 0
    : 1
}

function nexusResetSpecialization(viewer, target) {
  const previousSpecialization =
    nexusGetPersistentSpecialization(target)

  if (
    previousSpecialization === 'arcanist'
  ) {
    nexusClearArcanistStarterKit(target)
  }

  target.persistentData.remove(
    'nexus_specialization'
  )

  const synchronized =
    nexusSyncSpecialization(
      target,
      'reset'
    )

  nexusSpecializationFeedback(
    viewer,
    synchronized
      ? `Especializacion reiniciada para ${nexusPlayerName(target)}.`
      : `Se limpio la especializacion de ${nexusPlayerName(target)}, ` +
        'pero History Stages no pudo sincronizarse.'
  )

  return synchronized
    ? 1
    : 0
}

function nexusGetClassStageState(player) {
  var classStageReadContext = {
    result: {
      available: false,
      detail: 'not_checked',
      warrior: false,
      mage: false,
      gunslinger: false
    },
    stageData: null,
    playerUuid: null
  }

  try {
    if (!nexusClassStageDefinitionsAvailable()) {
      classStageReadContext.result.detail =
        nexusClassStageAvailabilityDetail
      return classStageReadContext.result
    }

    classStageReadContext.stageData =
      $NexusIndividualStageData.get(player.level)

    classStageReadContext.playerUuid = player.uuid
    classStageReadContext.result.available = true
    classStageReadContext.result.detail = 'ok'

    classStageReadContext.result.warrior = nexusStageBoolean(
      classStageReadContext.stageData.hasStage(
        classStageReadContext.playerUuid,
        NEXUS_CLASS_STAGE_IDS.warrior
      )
    )

    classStageReadContext.result.mage = nexusStageBoolean(
      classStageReadContext.stageData.hasStage(
        classStageReadContext.playerUuid,
        NEXUS_CLASS_STAGE_IDS.mage
      )
    )

    classStageReadContext.result.gunslinger = nexusStageBoolean(
      classStageReadContext.stageData.hasStage(
        classStageReadContext.playerUuid,
        NEXUS_CLASS_STAGE_IDS.gunslinger
      )
    )
  } catch (error) {
    classStageReadContext.result.available = false
    classStageReadContext.result.detail = 'stage_data_error=' + String(error)

    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true

      console.warn(
        `[Nexus Realms] Unable to read individual class stages: ${error}`
      )
    }
  }

  return classStageReadContext.result
}

function nexusClassStagesCoherent(
  classId,
  stageState
) {
  if (!nexusStageBoolean(stageState.available)) {
    return false
  }

  var expectedClassStage =
    NEXUS_CLASS_STAGE_IDS[classId] || null

  return Object.keys(NEXUS_CLASS_STAGE_IDS).every(
    candidateClass => {
      return (
        nexusStageBoolean(stageState[candidateClass]) ===
        (
          candidateClass === classId &&
          expectedClassStage !== null
        )
      )
    }
  )
}

function nexusSyncClassStages(player, reason) {
  try {
    if (!nexusClassStageDefinitionsAvailable()) {
      return false
    }

    var stageSyncContext = {
      classId: nexusGetPersistentClass(player),
      stageData: $NexusIndividualStageData.get(player.level),
      playerUuid: player.uuid,
      expectedStage: null,
      changes: 0,
      stagesSent: false
    }

    stageSyncContext.expectedStage =
      NEXUS_CLASS_STAGE_IDS[stageSyncContext.classId] || null

    for (
      var stageIndex = 0;
      stageIndex < NEXUS_CLASS_STAGE_LIST.length;
      stageIndex++
    ) {
      var stageId =
        NEXUS_CLASS_STAGE_LIST[stageIndex]

      var shouldHaveStage =
        stageId === stageSyncContext.expectedStage

      var hasStage =
        stageSyncContext.stageData.hasStage(
          stageSyncContext.playerUuid,
          stageId
        )

      if (
        shouldHaveStage &&
        !hasStage
      ) {
        stageSyncContext.stageData.addStage(
          stageSyncContext.playerUuid,
          stageId
        )

        stageSyncContext.changes++
      } else if (
        !shouldHaveStage &&
        hasStage
      ) {
        stageSyncContext.stageData.removeStage(
          stageSyncContext.playerUuid,
          stageId
        )

        stageSyncContext.changes++
      }
    }

    if (stageSyncContext.changes === 0) {
      return nexusClassStagesCoherent(
        stageSyncContext.classId,
        nexusGetClassStageState(player)
      )
    }

    stageSyncContext.stageData.setDirty()
    stageSyncContext.stageData.refreshCache()

    stageSyncContext.stagesSent =
      $NexusHistoryStagesCompat.sendIndividualStages(
        player,
        stageSyncContext.stageData.getUnlockedStages(
          stageSyncContext.playerUuid
        )
      )

    if (!stageSyncContext.stagesSent) {
      return false
    }

    if (
      !nexusClassStagesCoherent(
        stageSyncContext.classId,
        nexusGetClassStageState(player)
      )
    ) {
      return false
    }

    if (reason === 'login') {
      console.info(
        '[Nexus Realms] Reconciled class stages for ' +
        nexusPlayerName(player) +
        ': class=' +
        stageSyncContext.classId +
        ', changes=' +
        stageSyncContext.changes
      )
    }

    return true
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true

      console.warn(
        '[Nexus Realms] Unable to synchronize ' +
        'individual class stages: ' +
        error
      )
    }

    return false
  }
}

function nexusShowClassSelector(player) {
  player.tell(
    '=== Nexus Realms: ayuda de clase ==='
  )

  player.tell(
    'El selector visual y estos comandos públicos ' +
    'usan la misma elección única:'
  )

  player.tell(
    '/nexus_select warrior - Guerrero'
  )

  player.tell(
    '/nexus_select arcanist - Arcanista'
  )

  player.tell(
    '/nexus_select gunslinger - Pistolero'
  )

  player.tell(
    '/nexus_class_menu - reabrir el selector visual'
  )
}

function nexusRunServerCommand(server, command) {
  try {
    var nexusServerCommandResult =
      Number(
        server.runCommandSilent(command)
      )

    return nexusServerCommandResult > 0
  } catch (error) {
    console.warn(
      `Nexus Realms: command failed: ${command}`
    )

    console.warn(error)

    return false
  }
}

function nexusNeedsClassSelector(player) {
  return (
    !nexusHasClass(player) &&
    nexusGetPersistentClass(player) === 'none'
  )
}

function nexusHasPendingClassChange(player) {
  var selectorJournalPhase =
    String(
      player.persistentData.getString(
        NEXUS_CLASS_CHANGE_PHASE_KEY
      ) || ''
    )

  return (
    selectorJournalPhase !== '' &&
    selectorJournalPhase !== 'IDLE'
  )
}

function nexusScheduleClassSelectorAttempt(
  selectorRetryState
) {
  var selectorAttemptIndex =
    selectorRetryState.attemptIndex

  var selectorPreviousTick =
    selectorAttemptIndex > 0
      ? NEXUS_CLASS_SELECTOR_RETRY_TICKS[
          selectorAttemptIndex - 1
        ]
      : 0

  var selectorAttemptDelay =
    NEXUS_CLASS_SELECTOR_RETRY_TICKS[
      selectorAttemptIndex
    ] - selectorPreviousTick

  selectorRetryState.server.scheduleInTicks(
    selectorAttemptDelay,
    selectorRetryCallback => {
      var activeSelectorRetry =
        nexusClassSelectorRetryStates.get(
          selectorRetryState.playerKey
        )

      var onlineSelectorPlayer
      var selectorOpened

      if (
        activeSelectorRetry !==
          selectorRetryState ||
        selectorRetryState.finished
      ) {
        return
      }

      try {
        onlineSelectorPlayer =
          selectorRetryState.server.getPlayer(
            selectorRetryState.playerKey
          )
      } catch (selectorPlayerLookupError) {
        onlineSelectorPlayer = null
      }

      if (!onlineSelectorPlayer) {
        nexusClassSelectorRetryStates.delete(
          selectorRetryState.playerKey
        )
        return
      }

      if (
        !nexusNeedsClassSelector(
          onlineSelectorPlayer
        )
      ) {
        selectorRetryState.finished = true
        return
      }

      if (
        nexusHasPendingClassChange(
          onlineSelectorPlayer
        )
      ) {
        selectorRetryState.attemptIndex++

        if (
          selectorRetryState.attemptIndex <
          NEXUS_CLASS_SELECTOR_RETRY_TICKS.length
        ) {
          nexusScheduleClassSelectorAttempt(
            selectorRetryState
          )
        } else {
          selectorRetryState.finished = true
        }

        return
      }

      if (!selectorRetryState.promptSent) {
        selectorRetryState.promptSent = true
        onlineSelectorPlayer.tell(
          'Elige tu camino para comenzar.'
        )
      }

      selectorOpened =
        nexusRunServerCommand(
          selectorRetryState.server,
          `openguiscreen ${NEXUS_CLASS_GUI_ID} ` +
          `${onlineSelectorPlayer.username}`
        )

      if (selectorOpened) {
        selectorRetryState.finished = true
        return
      }

      selectorRetryState.attemptIndex++

      if (
        selectorRetryState.attemptIndex <
        NEXUS_CLASS_SELECTOR_RETRY_TICKS.length
      ) {
        nexusScheduleClassSelectorAttempt(
          selectorRetryState
        )
        return
      }

      selectorRetryState.finished = true

      if (!selectorRetryState.fallbackSent) {
        selectorRetryState.fallbackSent = true

        console.warn(
          '[Nexus Realms] Class selector could not be opened ' +
          `after ${NEXUS_CLASS_SELECTOR_RETRY_TICKS.length} ` +
          `attempts for ${onlineSelectorPlayer.username}.`
        )

        nexusShowClassSelector(
          onlineSelectorPlayer
        )
      }
    }
  )
}

function nexusTellActionbar(
  player,
  message,
  color
) {
  const escapedMessage = String(message)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  const json =
    `{"text":"${escapedMessage}",` +
    `"color":"${color || 'gold'}"}`

  nexusRunServerCommand(
    player.server,
    `title ${player.username} actionbar ${json}`
  )
}

function nexusOpenClassSelector(
  player,
  restartExisting
) {
  var selectorPlayerKey
  var existingSelectorRetry
  var selectorRetryState

  if (!nexusNeedsClassSelector(player)) {
    return false
  }

  selectorPlayerKey = String(player.uuid)
  existingSelectorRetry =
    nexusClassSelectorRetryStates.get(
      selectorPlayerKey
    )

  if (
    existingSelectorRetry &&
    restartExisting !== true
  ) {
    return true
  }

  selectorRetryState = {
    playerKey: selectorPlayerKey,
    server: player.server,
    attemptIndex: 0,
    promptSent: false,
    fallbackSent: false,
    finished: false
  }

  nexusClassSelectorRetryStates.set(
    selectorPlayerKey,
    selectorRetryState
  )

  nexusScheduleClassSelectorAttempt(
    selectorRetryState
  )

  return true
}

function nexusCreateKitItem(entry) {
  const itemCount =
    entry.count || 1

  if (
    entry.special === 'gunslinger_starter_gun'
  ) {
    return nexusCreateGunslingerStarterGun()
  }

  if (entry.nbt) {
    try {
      return Item.of(
        entry.id,
        entry.nbt
      ).withCount(itemCount)
    } catch (errorA) {
      try {
        return Item.of(
          entry.id,
          itemCount,
          entry.nbt
        )
      } catch (errorB) {
        console.error(
          `Nexus Realms: failed to create NBT item ${entry.id}: ` +
          `${String(errorA)} / ${String(errorB)}`
        )

        throw errorB
      }
    }
  }

  return Item.of(
    entry.id,
    itemCount
  )
}

function nexusCreateGunslingerStarterGun() {
  return Item.of(
    'tacz:modern_kinetic_gun',
    '{GunCurrentAmmoCount:0,' +
    'GunFireMode:"SEMI",' +
    'GunId:"tacz:glock_17",' +
    'HasBulletInBarrel:1b}'
  )
}

function nexusPlayerName(player) {
  if (player.username) {
    return String(player.username)
  }

  return String(player.name)
}

function nexusGiveKitItem(player, entry) {
  const itemCount =
    entry.count || 1

  const stack =
    nexusCreateKitItem(entry)

  player.give(stack)

  console.info(
    `Nexus Realms: gave starter item ${entry.id} ` +
    `x${itemCount} to ${nexusPlayerName(player)}`
  )

  return true
}

function nexusGiveStarterKit(
  player,
  classId,
  suppressSuccessMessage
) {
  const classData =
    NEXUS_CLASS_DATA[classId]

  let failedItems = 0

  classData.kit.forEach(
    entry => {
      try {
        nexusGiveKitItem(
          player,
          entry
        )
      } catch (kitError) {
        failedItems++

        console.error(
          `Nexus Realms: failed to give starter item ` +
          `${entry.id} to ${nexusPlayerName(player)}: ` +
          `${kitError}`
        )

        player.tell(
          `No se pudo entregar un objeto del kit: ${entry.id}`
        )
      }
    }
  )

  if (failedItems > 0) {
    player.tell(
      'Algunos objetos del kit no pudieron entregarse. ' +
      'Revisa el log.'
    )
  } else if (!suppressSuccessMessage) {
    player.tell(
      'Kit inicial entregado.'
    )
  }

  return failedItems
}

function nexusGiveSpecializationStarterKit(
  player,
  specializationId
) {
  if (global.nexusDeliverSpecializationKit) {
    return global.nexusDeliverSpecializationKit(
      player,
      specializationId
    )
      ? 0
      : 1
  }

  return 1
}

function nexusClearArcanistStarterKit(target) {
  nexusRunServerCommand(
    target.server,
    `clear ${target.username} ` +
    'irons_spellbooks:copper_spell_book' +
    '{nexus_arcanist_starter:1b}'
  )

  target.persistentData.remove(
    'nexus_specialization_arcanist_starter_kit_given'
  )

  target.persistentData.remove(
    'nexus_specialization_arcanist_starter_kit_index'
  )

  if (global.nexusClearStarterKitLedger) {
    global.nexusClearStarterKitLedger(
      target,
      'specialization'
    )
  }
}

function nexusClearClassTags(player) {
  NEXUS_CLASS_TAGS.forEach(
    tag => player.removeTag(tag)
  )
}

function nexusTellClassStatus(viewer, target) {
  if (global.nexusTellClassChangeStatus) {
    global.nexusTellClassChangeStatus(viewer, target)
    return
  }

  const classChosen =
    target.persistentData.getBoolean(
      'nexus_class_chosen'
    ) === true

  const persistentClass =
    nexusGetPersistentClass(target)

  const statusMessage =
    NEXUS_CLASS_STATUS_MESSAGES[persistentClass] ||
    NEXUS_CLASS_STATUS_MESSAGES.none

  const classStages =
    nexusGetClassStageState(target)

  const stagesCoherent =
    nexusClassStagesCoherent(
      persistentClass,
      classStages
    )

  const specialization =
    nexusGetPersistentSpecialization(target)

  const specializationStages =
    nexusGetSpecializationStageState(target)

  const specializationCoherent =
    nexusSpecializationStagesCoherent(
      persistentClass,
      specialization,
      specializationStages
    )

  viewer.tell(
    `Jugador: ${nexusPlayerName(target)}`
  )

  viewer.tell(
    `Clase elegida: ${persistentClass}`
  )

  viewer.tell(
    `persistentData.nexus_class_chosen: ${classChosen}`
  )

  viewer.tell(
    `persistentData.nexus_class: ${persistentClass}`
  )

  viewer.tell(
    'Tags de clase: ' +
    `warrior=${target.tags.contains('nexus_class_warrior')}, ` +
    `mage=${target.tags.contains('nexus_class_mage')}, ` +
    `gunslinger=${target.tags.contains('nexus_class_gunslinger')}`
  )

  viewer.tell(
    `Stage Warrior: ${classStages.warrior ? 'si' : 'no'}`
  )

  viewer.tell(
    `Stage Mage: ${classStages.mage ? 'si' : 'no'}`
  )

  viewer.tell(
    `Stage Gunslinger: ${classStages.gunslinger ? 'si' : 'no'}`
  )

  viewer.tell(
    `Stages coherentes: ${stagesCoherent ? 'si' : 'no'}`
  )

  viewer.tell(
    `Especializacion: ${specialization}`
  )

  viewer.tell(
    `Stage Arcanist: ` +
    `${specializationStages.arcanist ? 'si' : 'no'}`
  )

  viewer.tell(
    `Stage Metallurgist: ` +
    `${specializationStages.metallurgist ? 'si' : 'no'}`
  )

  viewer.tell(
    `Especializacion coherente: ` +
    `${specializationCoherent ? 'si' : 'no'}`
  )

  viewer.tell(statusMessage)

  viewer.tell(
    'History Stages aplica las restricciones individuales ' +
    'de los objetos representativos del Pack 25.1.'
  )
}

function nexusResolveOptionalTarget(
  ctx,
  Arguments
) {
  try {
    return Arguments.PLAYER.getResult(
      ctx,
      'player'
    )
  } catch (ignored) {
    return ctx.source.player
  }
}

global.nexusClassSelectionApi = {
  classData: NEXUS_CLASS_DATA,
  classTags: NEXUS_CLASS_TAGS,
  classStageIds: NEXUS_CLASS_STAGE_IDS,
  classStageList: NEXUS_CLASS_STAGE_LIST,
  specializationData: NEXUS_SPECIALIZATION_DATA,
  specializationStageList: NEXUS_SPECIALIZATION_STAGE_LIST,
  classPathMessages: NEXUS_CLASS_PATH_MESSAGES,
  mageSpecializationGuiId: NEXUS_MAGE_SPECIALIZATION_GUI_ID,
  getPersistentClass: nexusGetPersistentClass,
  getRawSpecialization: nexusGetRawSpecialization,
  getPersistentSpecialization: nexusGetPersistentSpecialization,
  getClassStageState: nexusGetClassStageState,
  getSpecializationStageState: nexusGetSpecializationStageState,
  classStagesCoherent: nexusClassStagesCoherent,
  specializationStagesCoherent: nexusSpecializationStagesCoherent,
  syncClassStages: nexusSyncClassStages,
  syncSpecialization: nexusSyncSpecialization,
  getSpecializationSyncDetail: nexusGetSpecializationSyncDetail,
  syncAllomancyPowers: nexusSyncAllomancyPowers,
  getAllomancyData: nexusGetAllomancyData,
  restoreAllomancyData: nexusRestoreAllomancyData,
  currentGlobalEra: nexusCurrentGlobalEra,
  createKitItem: nexusCreateKitItem,
  clearClassTags: nexusClearClassTags,
  clearArcanistStarterKit: nexusClearArcanistStarterKit,
  openClassSelector: nexusOpenClassSelector,
  runServerCommand: nexusRunServerCommand,
  tellActionbar: nexusTellActionbar,
  playerName: nexusPlayerName
}

PlayerEvents.loggedIn(event => {
  const player = event.player

  if (global.nexusClassChangeLogin) {
    global.nexusClassChangeLogin(player)
    nexusOpenClassSelector(
      player,
      true
    )
    return
  }

  console.error(
    '[Nexus Realms] Class transaction authority unavailable at login; ' +
    'selection UI suppressed.'
  )
})

PlayerEvents.loggedOut(event => {
  nexusClassSelectorRetryStates.delete(
    String(event.player.uuid)
  )
})

ServerEvents.commandRegistry(event => {
  const {
    commands: Commands,
    arguments: Arguments
  } = event

  event.register(
    Commands.literal('nexus_select')
      .then(
        Commands.argument(
          'class',
          Arguments.STRING.create(event)
        )
          .executes(ctx => {
            const player =
              ctx.source.player

            const classId =
              Arguments.STRING
                .getResult(ctx, 'class')
                .toLowerCase()

            const initialTargetValid =
              [
                'warrior',
                'arcanist',
                'gunslinger'
              ].indexOf(classId) >= 0

            if (!player) {
              return 0
            }

            if (!initialTargetValid) {
              player.tell(
                'Clase no valida. Usa: warrior, arcanist o gunslinger.'
              )

              return 0
            }

            if (!global.nexusChangeClass) {
              player.tell(
                'La autoridad transaccional de clases no esta disponible.'
              )

              return 0
            }

            const classSelectionResult =
              Number(
                global.nexusChangeClass(
                  ctx.source,
                  player,
                  classId,
                  true
                )
              )

            if (classSelectionResult > 0) {
              nexusClassSelectorRetryStates.delete(
                String(player.uuid)
              )

              nexusRunServerCommand(
                player.server,
                `closeguiscreen ${player.username}`
              )
            }

            return classSelectionResult
          })
      )
  )

  event.register(
    Commands.literal('nexus_class_help')
      .executes(ctx => {
        const player =
          ctx.source.player

        if (!player) {
          console.info(
            'Nexus Realms class commands: ' +
            '/nexus_select warrior, ' +
            '/nexus_select arcanist, ' +
            '/nexus_select gunslinger'
          )

          return 0
        }

        nexusShowClassSelector(player)

        return 1
      })
  )

  event.register(
    Commands.literal('nexus_class_status')
      .executes(ctx => {
        const player =
          ctx.source.player

        if (!player) {
          console.info(
            'Nexus Realms: /nexus_class_status must be run ' +
            'by a player unless a player argument is provided.'
          )

          return 0
        }

        nexusTellClassStatus(
          player,
          player
        )

        return 1
      })
      .then(
        Commands.argument(
          'player',
          Arguments.PLAYER.create(event)
        )
          .requires(
            source => source.hasPermission(2)
          )
          .executes(ctx => {
            const target =
              Arguments.PLAYER.getResult(
                ctx,
                'player'
              )

            if (global.nexusTellClassChangeStatus) {
              global.nexusTellClassChangeStatus(
                ctx.source,
                target
              )
              return 1
            }

            const viewer = ctx.source.player
            if (!viewer) {
              console.info(
                'Nexus Realms: class change status API unavailable.'
              )
              return 0
            }

            nexusTellClassStatus(viewer, target)
            return 1
          })
      )
  )

  event.register(
    Commands.literal('nexus_specialization')
      .then(
        Commands.literal('status')
          .executes(ctx => {
            const target =
              ctx.source.player

            if (!target) {
              return 0
            }

            nexusTellSpecializationStatus(
              target,
              target
            )

            return 1
          })
          .then(
            Commands.argument(
              'player',
              Arguments.PLAYER.create(event)
            )
              .requires(
                source => source.hasPermission(2)
              )
              .executes(ctx => {
                const viewer =
                  ctx.source.player

                const target =
                  Arguments.PLAYER.getResult(
                    ctx,
                    'player'
                  )

                nexusTellSpecializationStatus(
                  viewer,
                  target
                )

                return 1
              })
          )
      )
      .then(
        Commands.literal('select')
          .then(
            Commands.literal('arcanist')
              .executes(ctx => {
                const target =
                  ctx.source.player

                return target
                  ? nexusSelectSpecialization(
                      target,
                      target,
                      'arcanist'
                    )
                  : 0
              })
          )
      )
      .then(
        Commands.literal('reset')
          .executes(ctx => {
            const target =
              ctx.source.player

            return target
              ? nexusResetSpecialization(
                  target,
                  target
                )
              : 0
          })
          .then(
            Commands.argument(
              'player',
              Arguments.PLAYER.create(event)
            )
              .requires(
                source => source.hasPermission(2)
              )
              .executes(ctx => {
                const viewer =
                  ctx.source.player

                const target =
                  Arguments.PLAYER.getResult(
                    ctx,
                    'player'
                  )

                return nexusResetSpecialization(
                  viewer,
                  target
                )
              })
          )
      )
  )

  event.register(
    Commands.literal('nexus_class_menu')
      .executes(ctx => {
        const player =
          ctx.source.player

        if (!player) {
          return 0
        }

        if (nexusHasClass(player)) {
          player.tell(
            'Ya elegiste una clase. ' +
            'Pide a un admin que reinicie tu camino ' +
            'si necesitas cambiarla.'
          )

          return 0
        }

        nexusOpenClassSelector(
          player,
          true
        )

        return 1
      })
  )

  event.register(
    Commands.literal('nexus_testkit')
      .requires(
        source => source.hasPermission(2)
      )
      .then(
        Commands.argument(
          'class',
          Arguments.STRING.create(event)
        )
          .executes(ctx => {
            const classId =
              Arguments.STRING
                .getResult(ctx, 'class')
                .toLowerCase()

            const classData =
              NEXUS_CLASS_DATA[classId]

            const target =
              ctx.source.player

            if (!classData) {
              if (target) {
                target.tell(
                  'Clase no valida para testkit. ' +
                  'Usa: warrior, mage o gunslinger.'
                )
              }

              return 0
            }

            if (!target) {
              return 0
            }

            const failedItems =
              nexusGiveStarterKit(
                target,
                classId
              )

            target.tell(
              `Test kit ${classData.displayName} entregado. ` +
              `Fallos: ${failedItems}.`
            )

            return failedItems > 0
              ? 0
              : 1
          })
          .then(
            Commands.argument(
              'player',
              Arguments.PLAYER.create(event)
            )
              .executes(ctx => {
                const classId =
                  Arguments.STRING
                    .getResult(ctx, 'class')
                    .toLowerCase()

                const classData =
                  NEXUS_CLASS_DATA[classId]

                const target =
                  Arguments.PLAYER.getResult(
                    ctx,
                    'player'
                  )

                const admin =
                  ctx.source.player

                if (!classData) {
                  if (admin) {
                    admin.tell(
                      'Clase no valida para testkit. ' +
                      'Usa: warrior, mage o gunslinger.'
                    )
                  } else {
                    console.info(
                      'Nexus Realms: invalid /nexus_testkit class. ' +
                      'Use warrior, mage or gunslinger.'
                    )
                  }

                  return 0
                }

                if (!target) {
                  return 0
                }

                const failedItems =
                  nexusGiveStarterKit(
                    target,
                    classId
                  )

                const message =
                  `Test kit ${classData.displayName} entregado a ` +
                  `${nexusPlayerName(target)}. ` +
                  `Fallos: ${failedItems}.`

                if (admin) {
                  admin.tell(message)
                } else {
                  console.info(
                    `Nexus Realms: ${message}`
                  )
                }

                return failedItems > 0
                  ? 0
                  : 1
              })
          )
      )
  )

  event.register(
    Commands.literal('nexus_givekit')
      .requires(
        source => source.hasPermission(2)
      )
      .then(
        Commands.argument(
          'class',
          Arguments.STRING.create(event)
        )
          .executes(ctx => {
            const classId =
              Arguments.STRING
                .getResult(ctx, 'class')
                .toLowerCase()

            const classData =
              NEXUS_CLASS_DATA[classId]

            const target =
              ctx.source.player

            if (!classData) {
              if (target) {
                target.tell(
                  'Clase no valida para givekit. ' +
                  'Usa: warrior, mage o gunslinger.'
                )
              }

              return 0
            }

            if (!target) {
              return 0
            }

            const failedItems =
              nexusGiveStarterKit(
                target,
                classId
              )

            target.tell(
              `Kit de prueba entregado: ${classData.displayName}. ` +
              `Fallos: ${failedItems}.`
            )

            return failedItems > 0
              ? 0
              : 1
          })
          .then(
            Commands.argument(
              'player',
              Arguments.PLAYER.create(event)
            )
              .executes(ctx => {
                const classId =
                  Arguments.STRING
                    .getResult(ctx, 'class')
                    .toLowerCase()

                const classData =
                  NEXUS_CLASS_DATA[classId]

                const target =
                  nexusResolveOptionalTarget(
                    ctx,
                    Arguments
                  )

                const admin =
                  ctx.source.player

                if (!classData) {
                  if (admin) {
                    admin.tell(
                      'Clase no valida para givekit. ' +
                      'Usa: warrior, mage o gunslinger.'
                    )
                  } else {
                    console.info(
                      'Nexus Realms: invalid /nexus_givekit class. ' +
                      'Use warrior, mage or gunslinger.'
                    )
                  }

                  return 0
                }

                if (!target) {
                  return 0
                }

                const failedItems =
                  nexusGiveStarterKit(
                    target,
                    classId
                  )

                if (admin) {
                  admin.tell(
                    `Kit de prueba ${classData.displayName} ` +
                    `entregado a ${nexusPlayerName(target)}. ` +
                    `Fallos: ${failedItems}.`
                  )
                } else {
                  console.info(
                    `Nexus Realms: debug kit ${classId} delivered to ` +
                    `${nexusPlayerName(target)}. ` +
                    `Failed items: ${failedItems}.`
                  )
                }

                return failedItems > 0
                  ? 0
                  : 1
              })
          )
      )
  )

  event.register(
    Commands.literal('nexus_resetclass')
      .requires(
        source => source.hasPermission(2)
      )
      .then(
        Commands.argument(
          'player',
          Arguments.PLAYER.create(event)
        )
          .executes(ctx => {
            const target =
              Arguments.PLAYER.getResult(
                ctx,
                'player'
              )

            const admin =
              ctx.source.player

            const resetMessage =
              '/nexus_resetclass esta deshabilitado. Usa ' +
              '/nexus_changeclass o /nexus_repairclass.'

            if (admin) {
              admin.tell(resetMessage)
            } else {
              console.info(`Nexus Realms: ${resetMessage}`)
            }

            return 0
          })
      )
  )

  event.register(
    Commands.literal('nexus_resetclass_clean')
      .requires(
        source => source.hasPermission(2)
      )
      .then(
        Commands.argument(
          'player',
          Arguments.PLAYER.create(event)
        )
          .executes(ctx => {
            const target =
              Arguments.PLAYER.getResult(
                ctx,
                'player'
              )

            const admin =
              ctx.source.player

            const cleanResetMessage =
              '/nexus_resetclass_clean esta deshabilitado. Usa ' +
              '/nexus_changeclass o /nexus_repairclass.'

            if (admin) {
              admin.tell(cleanResetMessage)
            } else {
              console.info(`Nexus Realms: ${cleanResetMessage}`)
            }

            return 0
          })
      )
  )
})

// TODO Pack 16.5+: add recipe/loot restrictions once class progression is stable.
