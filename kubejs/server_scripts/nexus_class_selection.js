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

function nexusHasClass(player) {
  return player.persistentData.getBoolean('nexus_class_chosen') === true
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
  return Item.of('tacz:modern_kinetic_gun', '{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:taurus9",HasBulletInBarrel:1b}')
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

function nexusGiveStarterKit(player, classId) {
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
  } else {
    player.tell('Kit inicial entregado.')
  }

  return failedItems
}

function nexusClearClassTags(player) {
  NEXUS_CLASS_TAGS.forEach(tag => player.removeTag(tag))
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
              player.tell('Ya elegiste una clase. Pide a un admin que use /nexus_resetclass <player> si necesitas cambiarla.')
              return 0
            }

            // Mark the class as chosen before giving items to avoid starter kit duplication.
            player.persistentData.putBoolean('nexus_class_chosen', true)
            player.persistentData.putString('nexus_class', classId)
            nexusClearClassTags(player)
            player.addTag(classData.tag)
            const failedItems = nexusGiveStarterKit(player, classId)
            nexusRunServerCommand(player.server, `closeguiscreen ${player.username}`)

            if (failedItems > 0) {
              player.tell(`Clase elegida: ${classData.displayName}. Algunos objetos del kit no pudieron entregarse. Revisa el log.`)
            } else {
              player.tell(`Clase elegida: ${classData.displayName}. Kit inicial entregado.`)
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
    Commands.literal('nexus_class_menu')
      .executes(ctx => {
        const player = ctx.source.player

        if (!player) {
          return 0
        }

        if (nexusHasClass(player)) {
          player.tell('Ya elegiste una clase. Pide a un admin que use /nexus_resetclass <player> si necesitas cambiarla.')
          return 0
        }

        nexusOpenClassSelector(player)
        return 1
      })
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

            if (!classData || !target) {
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

                if (!classData || !target) {
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

            nexusClearClassTags(target)
            target.persistentData.putBoolean('nexus_class_chosen', false)
            target.persistentData.remove('nexus_class')

            target.tell('Tu clase de Nexus Realms fue reiniciada por un admin. Vuelve a elegir con /nexus_select <class>.')

            if (admin) {
              admin.tell(`Clase reiniciada para ${target.username}.`)
            } else {
              console.info(`Nexus Realms: class reset for ${target.username}.`)
            }

            return 1
          })
      )
  )
})

// TODO Pack 16.5+: add recipe/loot restrictions once class progression is stable.
