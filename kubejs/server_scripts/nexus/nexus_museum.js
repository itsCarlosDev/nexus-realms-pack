// Nexus Realms - Museo del Nexus estilo Animal Crossing
// Minecraft 1.20.1 / Forge / KubeJS 2001.6.5
//
// La colección es GLOBAL para todo el servidor:
// - cada ID de objeto válido solo puede donarse una vez;
// - la primera donación consume 1 unidad;
// - los duplicados no se consumen;
// - se registra quién hizo la primera donación;
// - el progreso vive en server.persistentData.
//
// El catálogo de FTB Quests se mantiene aparte para trofeos únicos que no
// conviene consumir (armas, armaduras, élitras, etc.).

const NEXUS_MUSEUM_PREFIX = 'nexus_museum_v1_'
const NEXUS_MUSEUM_TOTAL_KEY = NEXUS_MUSEUM_PREFIX + 'total'
const NEXUS_MUSEUM_LAST_ID_KEY = NEXUS_MUSEUM_PREFIX + 'last_id'
const NEXUS_MUSEUM_LAST_NAME_KEY = NEXUS_MUSEUM_PREFIX + 'last_name'
const NEXUS_MUSEUM_LAST_DONOR_KEY = NEXUS_MUSEUM_PREFIX + 'last_donor'

const NEXUS_MUSEUM_CATEGORIES = {
  fossils: 'Fósiles',
  skeletons: 'Esqueletos fósiles',
  dna: 'ADN prehistórico',
  archaeology: 'Arqueología',
  amber: 'Ámbar',
  paleobotany: 'Paleobotánica',
  specimens: 'Muestras prehistóricas'
}

// Elementos estáticos verificados en Fossils and Archeology: Revival 9.3.4.0.
// No se incluyen armas/armaduras antiguas ni otros objetos de progresión
// que sería desagradable perder al donar.
const NEXUS_MUSEUM_EXACT = {
  'fossil:fossil_bio': { category: 'fossils', bronze: 2 },
  'fossil:fossil_plant': { category: 'fossils', bronze: 2 },
  'fossil:fossil_shale': { category: 'fossils', bronze: 2 },
  'fossil:fossil_tar': { category: 'fossils', bronze: 2 },

  'fossil:relic_scrap': { category: 'archaeology', bronze: 2 },
  'fossil:stone_tablet': { category: 'archaeology', bronze: 3 },
  'fossil:pottery_shard': { category: 'archaeology', bronze: 2 },
  'fossil:scarab_gem': { category: 'archaeology', bronze: 4 },
  'fossil:scarab_gem_aquatic': { category: 'archaeology', bronze: 4 },
  'fossil:ancient_key': { category: 'archaeology', bronze: 4 },
  'fossil:ancient_clock': { category: 'archaeology', bronze: 4 },

  'fossil:amber_chunk': { category: 'amber', bronze: 3 },
  'fossil:amber_chunk_dominican': { category: 'amber', bronze: 4 },
  'fossil:amber_chunk_mosquito': { category: 'amber', bronze: 5 },

  'fossil:fossil_seed_fern': { category: 'paleobotany', bronze: 2 },
  'fossil:fossil_sapling_calamites': { category: 'paleobotany', bronze: 2 },
  'fossil:fossil_sapling_cordaites': { category: 'paleobotany', bronze: 2 },
  'fossil:fossil_sapling_palm': { category: 'paleobotany', bronze: 2 },
  'fossil:fossil_sapling_sigillaria': { category: 'paleobotany', bronze: 2 },
  'fossil:fossil_sapling_tempskya': { category: 'paleobotany', bronze: 2 },

  'fossil:shell': { category: 'specimens', bronze: 2 },
  'fossil:frozen_meat': { category: 'specimens', bronze: 2 },
  'fossil:fur_elasmotherium': { category: 'specimens', bronze: 2 },
  'fossil:fur_mammoth': { category: 'specimens', bronze: 2 },
  'fossil:fur_therizinosaurus': { category: 'specimens', bronze: 2 },
  'fossil:magic_conch': { category: 'specimens', bronze: 3 }
}

function nexusMuseumSafeKey(itemId) {
  return String(itemId).replace(/[^a-zA-Z0-9_]/g, '_')
}

function nexusMuseumDonationKey(itemId) {
  return NEXUS_MUSEUM_PREFIX + 'donated_' + nexusMuseumSafeKey(itemId)
}

function nexusMuseumDonorKey(itemId) {
  return NEXUS_MUSEUM_PREFIX + 'donor_' + nexusMuseumSafeKey(itemId)
}

function nexusMuseumCategoryCountKey(category) {
  return NEXUS_MUSEUM_PREFIX + 'category_' + category
}

function nexusMuseumClassify(itemId) {
  const exact = NEXUS_MUSEUM_EXACT[itemId]
  if (exact) {
    return exact
  }

  if (!String(itemId).startsWith('fossil:')) {
    return null
  }

  const path = String(itemId).substring('fossil:'.length)

  // PrehistoricEntityInfo registra cada ADN como <especie>_dna.
  if (/^[a-z0-9_]+_dna$/.test(path)) {
    return { category: 'dna', bronze: 3 }
  }

  // DinoBoneItem registra:
  // bone_<pieza>_<especie>
  if (/^bone_(arm|foot|leg|ribcage|skull|tail|unique|vertebrae)_[a-z0-9_]+$/.test(path)) {
    return { category: 'skeletons', bronze: 2 }
  }

  return null
}

function nexusMuseumPlayer(source) {
  const player = source.player
  if (!player) {
    return null
  }
  return player
}

function nexusMuseumItemName(stack) {
  try {
    if (stack.displayName) {
      if (stack.displayName.string) {
        return String(stack.displayName.string)
      }
      return String(stack.displayName)
    }
  } catch (error) {
    // Fallback al ID si un wrapper/mod no expone displayName como esperamos.
  }
  return String(stack.id)
}

function nexusMuseumPlayerName(player) {
  try {
    return String(player.name.string)
  } catch (error) {
    return String(player.uuid)
  }
}

function nexusMuseumTell(player, message) {
  player.tell('§6[Museo del Nexus] §f' + message)
}

function nexusMuseumDonate(source) {
  const player = nexusMuseumPlayer(source)
  if (!player) {
    return 0
  }

  const held = player.mainHandItem
  if (!held || held.isEmpty()) {
    nexusMuseumTell(player, 'Sostén en la mano principal la pieza que quieres donar.')
    return 0
  }

  const itemId = String(held.id)
  const classification = nexusMuseumClassify(itemId)
  if (!classification) {
    nexusMuseumTell(
      player,
      'Esa pieza no forma parte de la colección de paleontología/arqueología. ' +
      'Usa "¿Qué acepta el museo?" con la Conservadora.'
    )
    return 0
  }

  const data = source.server.persistentData
  const donatedKey = nexusMuseumDonationKey(itemId)

  if (data.getBoolean(donatedKey)) {
    const donor = data.getString(nexusMuseumDonorKey(itemId))
    nexusMuseumTell(
      player,
      'El museo ya conserva una muestra de ' + nexusMuseumItemName(held) +
      (donor ? ' (donada por ' + donor + ').' : '.')
    )
    return 0
  }

  // La mutación del inventario se hace solo después de todas las validaciones.
  held.shrink(1)

  const displayName = nexusMuseumItemName(held)
  const donorName = nexusMuseumPlayerName(player)

  data.putBoolean(donatedKey, true)
  data.putString(nexusMuseumDonorKey(itemId), donorName)

  const total = data.getInt(NEXUS_MUSEUM_TOTAL_KEY) + 1
  data.putInt(NEXUS_MUSEUM_TOTAL_KEY, total)

  const categoryKey = nexusMuseumCategoryCountKey(classification.category)
  data.putInt(categoryKey, data.getInt(categoryKey) + 1)

  data.putString(NEXUS_MUSEUM_LAST_ID_KEY, itemId)
  data.putString(NEXUS_MUSEUM_LAST_NAME_KEY, displayName)
  data.putString(NEXUS_MUSEUM_LAST_DONOR_KEY, donorName)

  if (classification.bronze > 0) {
    player.give(classification.bronze + 'x kubejs:nexus_bronze_coin')
  }

  nexusMuseumTell(
    player,
    '¡Primera donación registrada! ' + displayName +
    ' pasa a la colección permanente. Recompensa: ' +
    classification.bronze + ' moneda(s) de bronce.'
  )

  source.server.tell(
    '§6[Museo del Nexus] §e' + donorName + ' §fha donado §b' +
    displayName + '§f. La colección global alcanza §a' + total + '§f piezas.'
  )

  return 1
}

function nexusMuseumStatus(source) {
  const player = nexusMuseumPlayer(source)
  if (!player) {
    return 0
  }

  const data = source.server.persistentData
  const total = data.getInt(NEXUS_MUSEUM_TOTAL_KEY)

  nexusMuseumTell(player, 'Colección global: §a' + total + '§f piezas únicas.')

  Object.keys(NEXUS_MUSEUM_CATEGORIES).forEach(category => {
    const count = data.getInt(nexusMuseumCategoryCountKey(category))
    nexusMuseumTell(
      player,
      '§7• §f' + NEXUS_MUSEUM_CATEGORIES[category] + ': §e' + count
    )
  })

  const lastName = data.getString(NEXUS_MUSEUM_LAST_NAME_KEY)
  const lastDonor = data.getString(NEXUS_MUSEUM_LAST_DONOR_KEY)
  if (lastName) {
    nexusMuseumTell(
      player,
      'Última incorporación: §b' + lastName +
      (lastDonor ? ' §7por §f' + lastDonor : '')
    )
  }

  nexusMuseumTell(
    player,
    'Los trofeos únicos de bosses/equipamiento siguen en "Catálogo de trofeos" y no se consumen.'
  )

  return 1
}

function nexusMuseumCheck(source) {
  const player = nexusMuseumPlayer(source)
  if (!player) {
    return 0
  }

  const held = player.mainHandItem
  if (!held || held.isEmpty()) {
    nexusMuseumTell(player, 'Sostén una pieza en la mano principal para comprobarla.')
    return 0
  }

  const itemId = String(held.id)
  const classification = nexusMuseumClassify(itemId)

  if (!classification) {
    nexusMuseumTell(player, nexusMuseumItemName(held) + ' no es una donación admitida.')
    return 0
  }

  const data = source.server.persistentData
  if (data.getBoolean(nexusMuseumDonationKey(itemId))) {
    const donor = data.getString(nexusMuseumDonorKey(itemId))
    nexusMuseumTell(
      player,
      nexusMuseumItemName(held) + ' ya está catalogado' +
      (donor ? ' gracias a ' + donor : '') + '.'
    )
    return 1
  }

  nexusMuseumTell(
    player,
    nexusMuseumItemName(held) + ' es una pieza válida de "' +
    NEXUS_MUSEUM_CATEGORIES[classification.category] +
    '". Todavía no ha sido donada.'
  )
  return 1
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('nexus_museum')
      .then(
        Commands.literal('donate')
          .executes(ctx => nexusMuseumDonate(ctx.source))
      )
      .then(
        Commands.literal('status')
          .executes(ctx => nexusMuseumStatus(ctx.source))
      )
      .then(
        Commands.literal('check')
          .executes(ctx => nexusMuseumCheck(ctx.source))
      )
  )
})
