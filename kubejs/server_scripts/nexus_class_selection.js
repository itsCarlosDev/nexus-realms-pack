const NEXUS_CLASS_DATA = {
  warrior: {
    displayName: 'Guerrero',
    tag: 'nexus_class_warrior',
    kit: [
      { id: 'simplyswords:iron_glaive', count: 1 },
      { id: 'minecraft:shield', count: 1 },
      { id: 'minecraft:bread', count: 16 }
    ]
  },
  mage: {
    displayName: 'Mago',
    tag: 'nexus_class_mage',
    kit: [
      {
        id: 'irons_spellbooks:copper_spell_book',
        count: 1,
        nbt: '{"irons_spellbooks:spell_container":{data:[{id:"irons_spellbooks:acupuncture",index:0,level:1}],maxSpells:5,mustEquip:1b,spellWheel:1b}}'
      },
      { id: 'minecraft:amethyst_shard', count: 8 },
      { id: 'minecraft:bread', count: 16 }
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
      { id: 'minecraft:bread', count: 16 }
    ]
  }
}

const NEXUS_CLASS_TAGS = Object.values(NEXUS_CLASS_DATA).map(classData => classData.tag)
const NEXUS_CLASS_GUI_ID = 'nexus_class_selection'
const NEXUS_CLASS_STAGE_IDS = {
  warrior: 'nexus_class_warrior',
  mage: 'nexus_class_mage',
  gunslinger: 'nexus_class_gunslinger'
}
const NEXUS_CLASS_STAGE_LIST = Object.values(NEXUS_CLASS_STAGE_IDS)
const NEXUS_METALLURGIST_STAGE_ID = 'nexus_specialization_metallurgist'
const NEXUS_INDIVIDUAL_STAGE_LIST = NEXUS_CLASS_STAGE_LIST.concat([NEXUS_METALLURGIST_STAGE_ID])

const $NexusIndividualStageData = Java.loadClass('net.bananemdnsa.historystages.util.IndividualStageData')
const $NexusStageManager = Java.loadClass('net.bananemdnsa.historystages.data.StageManager')
const $NexusSyncIndividualStagesPacket = Java.loadClass('net.bananemdnsa.historystages.network.SyncIndividualStagesPacket')
const $NexusHistoryPacketHandler = Java.loadClass('net.bananemdnsa.historystages.network.PacketHandler')

let nexusClassStageWarningLogged = false

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
  const classId = String(player.persistentData.getString('nexus_class') || '')

  if (NEXUS_CLASS_DATA[classId]) {
    return classId
  }

  return 'none'
}

function nexusClassStageDefinitionsAvailable() {
  try {
    const definitions = $NexusStageManager.getIndividualStages()
    const missingStages = NEXUS_INDIVIDUAL_STAGE_LIST.filter(stageId => !definitions.containsKey(stageId))

    if (missingStages.length > 0) {
      if (!nexusClassStageWarningLogged) {
        nexusClassStageWarningLogged = true
        console.warn(`[Nexus Realms] Missing History Stages class definitions: ${missingStages.join(', ')}`)
      }
      return false
    }

    return true
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true
      console.warn(`[Nexus Realms] History Stages class definitions unavailable: ${error}`)
    }
    return false
  }
}

function nexusGetRawSpecialization(player) {
  return String(player.persistentData.getString('nexus_specialization') || '')
}

function nexusGetPersistentSpecialization(player) {
  const specialization = nexusGetRawSpecialization(player)
  return specialization === 'metallurgist' && nexusGetPersistentClass(player) === 'mage'
    ? specialization
    : 'none'
}

function nexusGetMetallurgistStageState(player) {
  try {
    if (!nexusClassStageDefinitionsAvailable()) return false
    const data = $NexusIndividualStageData.get(player.level)
    return data.hasStage(player.uuid, NEXUS_METALLURGIST_STAGE_ID)
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true
      console.warn(`[Nexus Realms] Unable to read Metallurgist stage: ${error}`)
    }
    return false
  }
}

function nexusSyncSpecialization(player, reason) {
  try {
    if (!nexusClassStageDefinitionsAvailable()) return false

    const rawSpecialization = nexusGetRawSpecialization(player)
    const shouldBeMetallurgist = nexusGetPersistentClass(player) === 'mage' && rawSpecialization === 'metallurgist'
    const data = $NexusIndividualStageData.get(player.level)
    const playerUuid = player.uuid
    const hasStage = data.hasStage(playerUuid, NEXUS_METALLURGIST_STAGE_ID)
    let correctedPersistentData = false
    let stageChanged = false

    if (!shouldBeMetallurgist && rawSpecialization) {
      player.persistentData.remove('nexus_specialization')
      correctedPersistentData = true
    }

    if (shouldBeMetallurgist && !hasStage) {
      data.addStage(playerUuid, NEXUS_METALLURGIST_STAGE_ID)
      stageChanged = true
    } else if (!shouldBeMetallurgist && hasStage) {
      data.removeStage(playerUuid, NEXUS_METALLURGIST_STAGE_ID)
      stageChanged = true
    }

    if (stageChanged) {
      data.setDirty()
      data.refreshCache()
      $NexusHistoryPacketHandler.sendIndividualStagesToPlayer(
        new $NexusSyncIndividualStagesPacket(data.getUnlockedStages(playerUuid)),
        player
      )
    }

    if ((stageChanged || correctedPersistentData) && reason === 'login') {
      console.info(
        `[Nexus Realms] Reconciled specialization for ${nexusPlayerName(player)}: ` +
        `class=${nexusGetPersistentClass(player)}, metallurgist=${shouldBeMetallurgist}, ` +
        `stageChanged=${stageChanged}`
      )
    }

    return true
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true
      console.warn(`[Nexus Realms] Unable to synchronize Metallurgist specialization: ${error}`)
    }
    return false
  }
}

function nexusCurrentGlobalEra(player) {
  const data = player.server.persistentData
  return data.contains('nexusEra') ? Number(data.getInt('nexusEra')) : 0
}

function nexusSpecializationFeedback(viewer, message) {
  if (viewer) {
    viewer.tell(message)
  } else {
    console.info(`[Nexus Realms] ${message}`)
  }
}

function nexusTellSpecializationStatus(viewer, target) {
  const classId = nexusGetPersistentClass(target)
  const specialization = nexusGetPersistentSpecialization(target)
  const hasStage = nexusGetMetallurgistStageState(target)
  const coherent = (specialization === 'metallurgist') === hasStage &&
    (specialization !== 'metallurgist' || classId === 'mage')

  nexusSpecializationFeedback(viewer, `Jugador: ${nexusPlayerName(target)}`)
  nexusSpecializationFeedback(viewer, `Clase principal: ${classId}`)
  nexusSpecializationFeedback(viewer, `Especializacion: ${specialization}`)
  nexusSpecializationFeedback(viewer, `Stage Metallurgist: ${hasStage ? 'si' : 'no'}`)
  nexusSpecializationFeedback(viewer, `Estado coherente: ${coherent ? 'si' : 'no'}`)
}

function nexusUnlockMetallurgist(viewer, target) {
  if (nexusGetPersistentClass(target) !== 'mage') {
    nexusSpecializationFeedback(viewer, 'Metalurgista solo puede desbloquearse para un Mago.')
    return 0
  }

  if (nexusCurrentGlobalEra(target) < 3) {
    nexusSpecializationFeedback(viewer, 'Metalurgista requiere Era III - Era Arcano-Industrial.')
    return 0
  }

  if (nexusGetPersistentSpecialization(target) === 'metallurgist' && nexusGetMetallurgistStageState(target)) {
    nexusSpecializationFeedback(viewer, `${nexusPlayerName(target)} ya es Metalurgista.`)
    return 1
  }

  target.persistentData.putString('nexus_specialization', 'metallurgist')
  if (!nexusSyncSpecialization(target, 'unlock')) {
    target.persistentData.remove('nexus_specialization')
    nexusSpecializationFeedback(viewer, 'No se pudo sincronizar el stage de Metalurgista; no se guardo el desbloqueo.')
    return 0
  }

  nexusTellActionbar(target, 'METALURGISTA - El Nexus responde tambien a los metales.', 'aqua')
  target.tell('METALURGISTA')
  target.tell('El Nexus responde tambien a los metales. Has aprendido a canalizar su poder.')
  nexusSpecializationFeedback(viewer, `Metalurgista desbloqueado para ${nexusPlayerName(target)}.`)
  return 1
}

function nexusResetSpecialization(viewer, target) {
  target.persistentData.remove('nexus_specialization')
  const synchronized = nexusSyncSpecialization(target, 'reset')
  nexusSpecializationFeedback(
    viewer,
    synchronized
      ? `Especializacion reiniciada para ${nexusPlayerName(target)}.`
      : `Se limpio la especializacion de ${nexusPlayerName(target)}, pero History Stages no pudo sincronizarse.`
  )
  return synchronized ? 1 : 0
}

function nexusGetClassStageState(player) {
  const result = {
    available: false,
    warrior: false,
    mage: false,
    gunslinger: false
  }

  try {
    if (!nexusClassStageDefinitionsAvailable()) return result

    const data = $NexusIndividualStageData.get(player.level)
    const playerUuid = player.uuid
    result.available = true
    result.warrior = data.hasStage(playerUuid, NEXUS_CLASS_STAGE_IDS.warrior)
    result.mage = data.hasStage(playerUuid, NEXUS_CLASS_STAGE_IDS.mage)
    result.gunslinger = data.hasStage(playerUuid, NEXUS_CLASS_STAGE_IDS.gunslinger)
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true
      console.warn(`[Nexus Realms] Unable to read individual class stages: ${error}`)
    }
  }

  return result
}

function nexusClassStagesCoherent(classId, stageState) {
  if (!stageState.available) return false

  const expectedStage = NEXUS_CLASS_STAGE_IDS[classId] || null
  return Object.keys(NEXUS_CLASS_STAGE_IDS).every(candidateClass => {
    return stageState[candidateClass] === (candidateClass === classId && expectedStage !== null)
  })
}

function nexusSyncClassStages(player, reason) {
  try {
    if (!nexusClassStageDefinitionsAvailable()) return false

    const classId = nexusGetPersistentClass(player)
    const expectedStage = NEXUS_CLASS_STAGE_IDS[classId] || null
    const data = $NexusIndividualStageData.get(player.level)
    const playerUuid = player.uuid
    let changes = 0

    NEXUS_CLASS_STAGE_LIST.forEach(stageId => {
      const shouldHaveStage = stageId === expectedStage
      const hasStage = data.hasStage(playerUuid, stageId)

      if (shouldHaveStage && !hasStage) {
        data.addStage(playerUuid, stageId)
        changes++
      } else if (!shouldHaveStage && hasStage) {
        data.removeStage(playerUuid, stageId)
        changes++
      }
    })

    if (changes === 0) return true

    data.setDirty()
    data.refreshCache()
    $NexusHistoryPacketHandler.sendIndividualStagesToPlayer(
      new $NexusSyncIndividualStagesPacket(data.getUnlockedStages(playerUuid)),
      player
    )

    if (reason === 'login') {
      console.info(
        `[Nexus Realms] Reconciled class stages for ${nexusPlayerName(player)}: ` +
        `class=${classId}, changes=${changes}`
      )
    }

    return true
  } catch (error) {
    if (!nexusClassStageWarningLogged) {
      nexusClassStageWarningLogged = true
      console.warn(`[Nexus Realms] Unable to synchronize individual class stages: ${error}`)
    }
    return false
  }
}

function nexusShowClassSelector(player) {
  player.tell('=== Nexus Realms: ayuda de clase ===')
  player.tell('FancyMenu es el selector principal. Si necesitas elegir manualmente, usa uno de estos comandos:')
  player.tell('/nexus_select warrior - Guerrero')
  player.tell('/nexus_select mage - Mago')
  player.tell('/nexus_select gunslinger - Pistolero')
  player.tell('/nexus_class_menu - reabrir el selector visual')
}

function nexusRunServerCommand(server, command) {
  try {
    server.runCommandSilent(command)
    return true
  } catch (error) {
    console.warn(`Nexus Realms: command failed: ${command}`)
    console.warn(error)
    return false
  }
}

function nexusTellActionbar(player, message, color) {
  const json = `{"text":"${String(message).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}","color":"${color || 'gold'}"}`
  nexusRunServerCommand(player.server, `title ${player.username} actionbar ${json}`)
}

function nexusOpenClassSelector(player) {
  player.tell('Elige tu camino para comenzar.')

  player.server.scheduleInTicks(40, callback => {
    if (nexusHasClass(player)) {
      return
    }

    nexusRunServerCommand(player.server, `openguiscreen ${NEXUS_CLASS_GUI_ID} ${player.username}`)
  })
}

function nexusCreateKitItem(entry) {
  const itemCount = entry.count || 1

  if (entry.special === 'gunslinger_starter_gun') {
    return nexusCreateGunslingerStarterGun()
  }

  if (entry.nbt) {
    try {
      return Item.of(entry.id, entry.nbt).withCount(itemCount)
    } catch (errorA) {
      try {
        return Item.of(entry.id, itemCount, entry.nbt)
      } catch (errorB) {
        console.error(`Nexus Realms: failed to create NBT item ${entry.id}: ${String(errorA)} / ${String(errorB)}`)
        throw errorB
      }
    }
  }

  return Item.of(entry.id, itemCount)
}

function nexusCreateGunslingerStarterGun() {
  return Item.of('tacz:modern_kinetic_gun', '{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:glock_17",HasBulletInBarrel:1b}')
}

function nexusPlayerName(player) {
  if (player.username) {
    return String(player.username)
  }

  return String(player.name)
}

function nexusGiveKitItem(player, entry) {
  const itemCount = entry.count || 1
  const stack = nexusCreateKitItem(entry)

  player.give(stack)
  console.info(`Nexus Realms: gave starter item ${entry.id} x${itemCount} to ${nexusPlayerName(player)}`)
  return true
}

function nexusGiveStarterKit(player, classId, suppressSuccessMessage) {
  const classData = NEXUS_CLASS_DATA[classId]
  let failedItems = 0

  classData.kit.forEach(entry => {
    try {
      nexusGiveKitItem(player, entry)
    } catch (kitError) {
      failedItems++
      console.error(`Nexus Realms: failed to give starter item ${entry.id} to ${nexusPlayerName(player)}: ${kitError}`)
      player.tell(`No se pudo entregar un objeto del kit: ${entry.id}`)
    }
  })

  if (failedItems > 0) {
    player.tell('Algunos objetos del kit no pudieron entregarse. Revisa el log.')
  } else if (!suppressSuccessMessage) {
    player.tell('Kit inicial entregado.')
  }

  return failedItems
}

function nexusClearClassTags(player) {
  NEXUS_CLASS_TAGS.forEach(tag => player.removeTag(tag))
}

function nexusResetClassState(target) {
  nexusClearClassTags(target)
  target.persistentData.putBoolean('nexus_class_chosen', false)
  target.persistentData.remove('nexus_class')
  target.persistentData.remove('nexus_specialization')
  nexusSyncClassStages(target, 'reset')
  nexusSyncSpecialization(target, 'reset')
}

function nexusTellClassStatus(viewer, target) {
  const classChosen = target.persistentData.getBoolean('nexus_class_chosen') === true
  const persistentClass = nexusGetPersistentClass(target)
  const statusMessage = NEXUS_CLASS_STATUS_MESSAGES[persistentClass] || NEXUS_CLASS_STATUS_MESSAGES.none
  const classStages = nexusGetClassStageState(target)
  const stagesCoherent = nexusClassStagesCoherent(persistentClass, classStages)
  const specialization = nexusGetPersistentSpecialization(target)
  const metallurgistStage = nexusGetMetallurgistStageState(target)
  const specializationCoherent = (specialization === 'metallurgist') === metallurgistStage &&
    (specialization !== 'metallurgist' || persistentClass === 'mage')

  viewer.tell(`Jugador: ${nexusPlayerName(target)}`)
  viewer.tell(`Clase elegida: ${persistentClass}`)
  viewer.tell(`persistentData.nexus_class_chosen: ${classChosen}`)
  viewer.tell(`persistentData.nexus_class: ${persistentClass}`)
  viewer.tell(`Tags de clase: warrior=${target.tags.contains('nexus_class_warrior')}, mage=${target.tags.contains('nexus_class_mage')}, gunslinger=${target.tags.contains('nexus_class_gunslinger')}`)
  viewer.tell(`Stage Warrior: ${classStages.warrior ? 'si' : 'no'}`)
  viewer.tell(`Stage Mage: ${classStages.mage ? 'si' : 'no'}`)
  viewer.tell(`Stage Gunslinger: ${classStages.gunslinger ? 'si' : 'no'}`)
  viewer.tell(`Stages coherentes: ${stagesCoherent ? 'si' : 'no'}`)
  viewer.tell(`Especializacion: ${specialization}`)
  viewer.tell(`Stage Metallurgist: ${metallurgistStage ? 'si' : 'no'}`)
  viewer.tell(`Especializacion coherente: ${specializationCoherent ? 'si' : 'no'}`)
  viewer.tell(statusMessage)
  viewer.tell('History Stages aplica las restricciones individuales de los objetos representativos del Pack 25.1.')
}

function nexusResolveOptionalTarget(ctx, Arguments) {
  try {
    return Arguments.PLAYER.getResult(ctx, 'player')
  } catch (ignored) {
    return ctx.source.player
  }
}

PlayerEvents.loggedIn(event => {
  const player = event.player

  nexusSyncClassStages(player, 'login')
  nexusSyncSpecialization(player, 'login')

  if (!nexusHasClass(player)) {
    nexusOpenClassSelector(player)
  }
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  event.register(
    Commands.literal('nexus_select')
      .then(
        Commands.argument('class', Arguments.STRING.create(event))
          .executes(ctx => {
            const player = ctx.source.player
            const classId = Arguments.STRING.getResult(ctx, 'class').toLowerCase()
            const classData = NEXUS_CLASS_DATA[classId]

            if (!player) {
              return 0
            }

            if (!classData) {
              player.tell('Clase no valida. Usa: warrior, mage o gunslinger.')
              return 0
            }

            if (nexusHasClass(player)) {
              player.tell('Ya elegiste una clase. Pide a un admin que reinicie tu camino si necesitas cambiarla.')
              return 0
            }

            // Mark the class as chosen before giving items to avoid starter kit duplication.
            player.persistentData.putBoolean('nexus_class_chosen', true)
            player.persistentData.putString('nexus_class', classId)
            player.persistentData.remove('nexus_specialization')
            nexusClearClassTags(player)
            player.addTag(classData.tag)
            nexusSyncClassStages(player, 'selection')
            nexusSyncSpecialization(player, 'selection')
            const failedItems = nexusGiveStarterKit(player, classId, true)
            nexusRunServerCommand(player.server, `closeguiscreen ${player.username}`)

            if (failedItems > 0) {
              player.tell(NEXUS_CLASS_PATH_MESSAGES[classId] || `Clase elegida: ${classData.displayName}.`)
              player.tell('Algunos objetos del kit no pudieron entregarse. Revisa latest.log.')
            } else {
              nexusTellActionbar(player, NEXUS_CLASS_PATH_MESSAGES[classId] || `Clase elegida: ${classData.displayName}.`, 'gold')
              player.tell(NEXUS_CLASS_PATH_MESSAGES[classId] || `Clase elegida: ${classData.displayName}.`)
              player.tell('Kit inicial entregado.')
            }

            return 1
          })
      )
  )

  event.register(
    Commands.literal('nexus_class_help')
      .executes(ctx => {
        const player = ctx.source.player

        if (!player) {
          console.info('Nexus Realms class commands: /nexus_select warrior, /nexus_select mage, /nexus_select gunslinger')
          return 0
        }

        nexusShowClassSelector(player)
        return 1
      })
	  )

	  event.register(
	    Commands.literal('nexus_class_status')
	      .executes(ctx => {
	        const player = ctx.source.player
	
	        if (!player) {
	          console.info('Nexus Realms: /nexus_class_status must be run by a player unless a player argument is provided.')
	          return 0
	        }
	
	        nexusTellClassStatus(player, player)
	        return 1
	      })
	      .then(
	        Commands.argument('player', Arguments.PLAYER.create(event))
	          .requires(source => source.hasPermission(2))
	          .executes(ctx => {
	            const viewer = ctx.source.player
	            const target = Arguments.PLAYER.getResult(ctx, 'player')
	
	            if (viewer) {
	              nexusTellClassStatus(viewer, target)
	            } else {
	              const targetClass = nexusGetPersistentClass(target)
	              const classStages = nexusGetClassStageState(target)
	              console.info(
	                `Nexus Realms: ${nexusPlayerName(target)} class=${targetClass} ` +
	                `chosen=${target.persistentData.getBoolean('nexus_class_chosen') === true} ` +
	                `warrior=${classStages.warrior} mage=${classStages.mage} ` +
	                `gunslinger=${classStages.gunslinger} coherent=${nexusClassStagesCoherent(targetClass, classStages)}`
	              )
	            }
	
	            return 1
	          })
	      )
	  )

  event.register(
    Commands.literal('nexus_specialization')
      .requires(source => source.hasPermission(2))
      .then(
        Commands.literal('get')
          .executes(ctx => {
            const target = ctx.source.player
            if (!target) return 0
            nexusTellSpecializationStatus(target, target)
            return 1
          })
          .then(
            Commands.argument('player', Arguments.PLAYER.create(event))
              .executes(ctx => {
                const viewer = ctx.source.player
                const target = Arguments.PLAYER.getResult(ctx, 'player')
                nexusTellSpecializationStatus(viewer, target)
                return 1
              })
          )
      )
      .then(
        Commands.literal('unlock')
          .then(
            Commands.literal('metallurgist')
              .executes(ctx => {
                const target = ctx.source.player
                return target ? nexusUnlockMetallurgist(target, target) : 0
              })
              .then(
                Commands.argument('player', Arguments.PLAYER.create(event))
                  .executes(ctx => {
                    const viewer = ctx.source.player
                    const target = Arguments.PLAYER.getResult(ctx, 'player')
                    return nexusUnlockMetallurgist(viewer, target)
                  })
              )
          )
      )
      .then(
        Commands.literal('reset')
          .executes(ctx => {
            const target = ctx.source.player
            return target ? nexusResetSpecialization(target, target) : 0
          })
          .then(
            Commands.argument('player', Arguments.PLAYER.create(event))
              .executes(ctx => {
                const viewer = ctx.source.player
                const target = Arguments.PLAYER.getResult(ctx, 'player')
                return nexusResetSpecialization(viewer, target)
              })
          )
      )
  )
	
	  event.register(
	    Commands.literal('nexus_class_menu')
      .executes(ctx => {
        const player = ctx.source.player

        if (!player) {
          return 0
        }

        if (nexusHasClass(player)) {
          player.tell('Ya elegiste una clase. Pide a un admin que reinicie tu camino si necesitas cambiarla.')
          return 0
        }

        nexusOpenClassSelector(player)
        return 1
      })
	  )

	  event.register(
	    Commands.literal('nexus_testkit')
	      .requires(source => source.hasPermission(2))
	      .then(
	        Commands.argument('class', Arguments.STRING.create(event))
	          .executes(ctx => {
	            const classId = Arguments.STRING.getResult(ctx, 'class').toLowerCase()
	            const classData = NEXUS_CLASS_DATA[classId]
	            const target = ctx.source.player
	
	            if (!classData) {
	              if (target) {
	                target.tell('Clase no valida para testkit. Usa: warrior, mage o gunslinger.')
	              }
	              return 0
	            }
	
	            if (!target) {
	              return 0
	            }
	
	            const failedItems = nexusGiveStarterKit(target, classId)
	            target.tell(`Test kit ${classData.displayName} entregado. Fallos: ${failedItems}.`)
	            return failedItems > 0 ? 0 : 1
	          })
	          .then(
	            Commands.argument('player', Arguments.PLAYER.create(event))
	              .executes(ctx => {
	                const classId = Arguments.STRING.getResult(ctx, 'class').toLowerCase()
	                const classData = NEXUS_CLASS_DATA[classId]
	                const target = Arguments.PLAYER.getResult(ctx, 'player')
	                const admin = ctx.source.player
	
	                if (!classData) {
	                  if (admin) {
	                    admin.tell('Clase no valida para testkit. Usa: warrior, mage o gunslinger.')
	                  } else {
	                    console.info('Nexus Realms: invalid /nexus_testkit class. Use warrior, mage or gunslinger.')
	                  }
	                  return 0
	                }
	
	                if (!target) {
	                  return 0
	                }
	
	                const failedItems = nexusGiveStarterKit(target, classId)
	                const message = `Test kit ${classData.displayName} entregado a ${nexusPlayerName(target)}. Fallos: ${failedItems}.`
	
	                if (admin) {
	                  admin.tell(message)
	                } else {
	                  console.info(`Nexus Realms: ${message}`)
	                }
	
	                return failedItems > 0 ? 0 : 1
	              })
	          )
	      )
	  )
	
	  event.register(
	    Commands.literal('nexus_givekit')
      .requires(source => source.hasPermission(2))
      .then(
        Commands.argument('class', Arguments.STRING.create(event))
          .executes(ctx => {
            const classId = Arguments.STRING.getResult(ctx, 'class').toLowerCase()
	            const classData = NEXUS_CLASS_DATA[classId]
	            const target = ctx.source.player
	
	            if (!classData) {
	              if (target) {
	                target.tell('Clase no valida para givekit. Usa: warrior, mage o gunslinger.')
	              }
	              return 0
	            }
	
	            if (!target) {
	              return 0
	            }

            const failedItems = nexusGiveStarterKit(target, classId)
            target.tell(`Kit de prueba entregado: ${classData.displayName}. Fallos: ${failedItems}.`)
            return failedItems > 0 ? 0 : 1
          })
          .then(
            Commands.argument('player', Arguments.PLAYER.create(event))
              .executes(ctx => {
                const classId = Arguments.STRING.getResult(ctx, 'class').toLowerCase()
                const classData = NEXUS_CLASS_DATA[classId]
	                const target = nexusResolveOptionalTarget(ctx, Arguments)
	                const admin = ctx.source.player
	
	                if (!classData) {
	                  if (admin) {
	                    admin.tell('Clase no valida para givekit. Usa: warrior, mage o gunslinger.')
	                  } else {
	                    console.info('Nexus Realms: invalid /nexus_givekit class. Use warrior, mage or gunslinger.')
	                  }
	                  return 0
	                }
	
	                if (!target) {
	                  return 0
	                }

                const failedItems = nexusGiveStarterKit(target, classId)

                if (admin) {
                  admin.tell(`Kit de prueba ${classData.displayName} entregado a ${nexusPlayerName(target)}. Fallos: ${failedItems}.`)
                } else {
                  console.info(`Nexus Realms: debug kit ${classId} delivered to ${nexusPlayerName(target)}. Failed items: ${failedItems}.`)
                }

                return failedItems > 0 ? 0 : 1
              })
          )
      )
  )

	  event.register(
	    Commands.literal('nexus_resetclass')
      .requires(source => source.hasPermission(2))
      .then(
        Commands.argument('player', Arguments.PLAYER.create(event))
          .executes(ctx => {
            const target = Arguments.PLAYER.getResult(ctx, 'player')
            const admin = ctx.source.player

	            nexusResetClassState(target)

            target.tell('Tu clase fue reiniciada. Abre el selector para elegir un nuevo camino.')
            nexusOpenClassSelector(target)

            if (admin) {
              admin.tell(`Clase reiniciada para ${target.username}.`)
            } else {
              console.info(`Nexus Realms: class reset for ${target.username}.`)
            }

            return 1
          })
      )
	  )
	
	  event.register(
	    Commands.literal('nexus_resetclass_clean')
	      .requires(source => source.hasPermission(2))
	      .then(
	        Commands.argument('player', Arguments.PLAYER.create(event))
	          .executes(ctx => {
	            const target = Arguments.PLAYER.getResult(ctx, 'player')
	            const admin = ctx.source.player
	
	            nexusResetClassState(target)
	            nexusRunServerCommand(target.server, `clear ${target.username}`)
	            target.tell('Tu clase e inventario de prueba fueron reiniciados. Abre el selector para elegir un nuevo camino.')
	            nexusOpenClassSelector(target)
	
	            if (admin) {
	              admin.tell(`Clase e inventario de prueba reiniciados para ${target.username}.`)
	            } else {
	              console.info(`Nexus Realms: clean class reset for ${target.username}.`)
	            }
	
	            return 1
	          })
	      )
	  )
	})

// TODO Pack 16.5+: add recipe/loot restrictions once class progression is stable.
