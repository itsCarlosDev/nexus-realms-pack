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
        nbt: '{GunCurrentAmmoCount:0,GunFireMode:"SEMI",GunId:"tacz:taurus9",HasBulletInBarrel:1b}'
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
  player.tell('=== Nexus Realms: seleccion de clase ===')
  player.tell('Elige una sola clase. Esta eleccion queda guardada.')
  player.tell('/nexus_select warrior - Guerrero')
  player.tell('/nexus_select mage - Mago')
  player.tell('/nexus_select gunslinger - Pistolero')
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
  nexusShowClassSelector(player)

  player.server.scheduleInTicks(40, callback => {
    if (nexusHasClass(player)) {
      return
    }

    nexusRunServerCommand(player.server, `openguiscreen ${NEXUS_CLASS_GUI_ID} ${player.username}`)
  })
}

function nexusGiveStarterKit(player, classId) {
  NEXUS_CLASS_DATA[classId].kit.forEach(entry => {
    try {
      const stack = entry.nbt ? Item.of(entry.id, entry.count, entry.nbt) : Item.of(entry.id, entry.count)
      player.give(stack)
    } catch (error) {
      console.error(`Nexus Realms: failed to give starter kit item ${entry.id} to ${player.username}`)
      console.error(error)
    }
  })
}

function nexusClearClassTags(player) {
  NEXUS_CLASS_TAGS.forEach(tag => player.removeTag(tag))
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
            nexusGiveStarterKit(player, classId)
            nexusRunServerCommand(player.server, `closeguiscreen ${player.username}`)

            player.tell(`Clase elegida: ${classData.displayName}. Tu kit inicial ha sido entregado.`)
            return 1
          })
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
