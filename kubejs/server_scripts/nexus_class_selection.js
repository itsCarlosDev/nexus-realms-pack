const NEXUS_CLASS_DATA = {
  warrior: {
    displayName: 'Guerrero',
    tag: 'nexus_class_warrior',
    kit: [
      ['minecraft:iron_sword', 1],
      ['minecraft:shield', 1],
      ['minecraft:bread', 16]
    ]
  },
  mage: {
    displayName: 'Mago',
    tag: 'nexus_class_mage',
    kit: [
      ['minecraft:book', 1],
      ['minecraft:amethyst_shard', 8],
      ['minecraft:bread', 16]
    ]
  },
  gunslinger: {
    displayName: 'Pistolero',
    tag: 'nexus_class_gunslinger',
    kit: [
      ['minecraft:crossbow', 1],
      ['minecraft:arrow', 16],
      ['minecraft:bread', 16]
    ]
  }
}

const NEXUS_CLASS_TAGS = Object.values(NEXUS_CLASS_DATA).map(classData => classData.tag)

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

function nexusGiveStarterKit(player, classId) {
  NEXUS_CLASS_DATA[classId].kit.forEach(entry => {
    player.give(Item.of(entry[0], entry[1]))
  })
}

function nexusClearClassTags(player) {
  NEXUS_CLASS_TAGS.forEach(tag => player.removeTag(tag))
}

PlayerEvents.loggedIn(event => {
  const player = event.player

  if (!nexusHasClass(player)) {
    nexusShowClassSelector(player)
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

// TODO Pack 16.1+: connect this backend to FancyMenu buttons.
// TODO Replace placeholder kits after verifying stable item IDs:
// - Guerrero: Simply Swords.
// - Mago: Iron's Spells 'n Spellbooks.
// - Pistolero: TaCZ.
