const NEXUS_RESTRICTED_CLASS_RULES = {
  warrior: {
    tag: 'nexus_class_warrior',
    displayName: 'Guerrero',
    message: 'Solo el Guerrero puede usar equipo marcial avanzado.'
  },
  mage: {
    tag: 'nexus_class_mage',
    displayName: 'Mago',
    message: 'Solo el Mago puede canalizar magia.'
  },
  gunslinger: {
    
    tag: 'nexus_class_gunslinger',
    displayName: 'Pistolero',
    message: 'Solo el Pistolero puede usar armas de fuego.'
  }
}

const NEXUS_RESTRICTED_ITEM_NAMESPACES = {
  simplyswords: 'warrior',
  epicfight: 'warrior',
  epicfight_nightfall: 'warrior',
  efn: 'warrior',
  nightfall: 'warrior',
  epicskills: 'warrior',
  epic_fight_avalon: 'warrior',
  invincible: 'warrior',
  irons_spellbooks: 'mage',
  traveloptics: 'mage',
  tacz: 'gunslinger'
}

const NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE = true
const NEXUS_FORCE_EPICFIGHT_MINING_WITH_COMMAND = false
const NEXUS_ENFORCEMENT_OWNER = 'nexuscore'
const NEXUS_HAND_ENFORCEMENT_STRATEGY = 'forge_event_enforcer_no_inventory_movement'

function nexusRestrictionHasTag(player, tag) {
  return player && player.tags && player.tags.contains(tag)
}

function nexusGetPlayerClass(player) {
  try {
    const persistentClass = String(player.persistentData.getString('nexus_class') || '')

    if (NEXUS_RESTRICTED_CLASS_RULES[persistentClass]) {
      return persistentClass
    }
  } catch (ignored) {
  }

  if (nexusRestrictionHasTag(player, 'nexus_class_warrior')) {
    return 'warrior'
  }

  if (nexusRestrictionHasTag(player, 'nexus_class_mage')) {
    return 'mage'
  }

  if (nexusRestrictionHasTag(player, 'nexus_class_gunslinger')) {
    return 'gunslinger'
  }

  return 'none'
}

function nexusRestrictionPlayerHasClass(player, classId) {
  const classRule = NEXUS_RESTRICTED_CLASS_RULES[classId]

  if (!classRule) {
    return false
  }

  return nexusGetPlayerClass(player) === classId || nexusRestrictionHasTag(player, classRule.tag)
}

function nexusNormalizeItemId(value) {
  const text = String(value || '')

  if (!text || text === 'undefined' || text === 'null' || text === '[object Object]') {
    return ''
  }

  return text
}

function nexusLooksLikeItemId(value) {
  const text = nexusNormalizeItemId(value)
  return text.indexOf(':') > 0
}

function nexusGetItemId(stack) {
  if (!stack) {
    return ''
  }

  const candidates = []

  try {
    candidates.push(stack.id)
  } catch (ignored) {
  }

  try {
    candidates.push(stack.item && stack.item.id)
  } catch (ignored) {
  }

  try {
    if (stack.getId) {
      candidates.push(stack.getId())
    }
  } catch (ignored) {
  }

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const itemId = nexusNormalizeItemId(candidates[candidateIndex])

    if (nexusLooksLikeItemId(itemId)) {
      return itemId
    }
  }

  try {
    const stackText = String(stack)
    const match = stackText.match(/[a-z0-9_.-]+:[a-z0-9_./-]+/i)

    if (match && match[0]) {
      return match[0]
    }
  } catch (ignored) {
  }

  return ''
}

function nexusIsEmptyStack(stack) {
  if (!stack) {
    return true
  }

  const itemId = nexusGetItemId(stack)

  if (!itemId || itemId === 'minecraft:air') {
    return true
  }

  try {
    if (stack.isEmpty && stack.isEmpty()) {
      return true
    }
  } catch (ignored) {
  }

  try {
    if (Number(stack.count) <= 0) {
      return true
    }
  } catch (ignored) {
  }

  return false
}

function nexusGetNamespaceFromItemId(itemId) {
  const separatorIndex = String(itemId || '').indexOf(':')

  if (separatorIndex < 0) {
    return ''
  }

  return String(itemId).substring(0, separatorIndex)
}

function nexusGetRequiredClassForItem(itemId) {
  const namespace = nexusGetNamespaceFromItemId(itemId)

  if (!namespace) {
    return null
  }

  return NEXUS_RESTRICTED_ITEM_NAMESPACES[namespace] || null
}

function nexusIsRestrictedForPlayer(player, itemId) {
  const requiredClass = nexusGetRequiredClassForItem(itemId)

  if (!requiredClass) {
    return false
  }

  return !nexusRestrictionPlayerHasClass(player, requiredClass)
}

function nexusCanUseItem(player, stack) {
  const itemId = nexusGetItemId(stack)
  return !nexusIsRestrictedForPlayer(player, itemId)
}

function nexusGetStackNbtSummary(stack) {
  try {
    const nbtText = String(stack.nbt || '')

    if (!nbtText || nbtText === 'null' || nbtText === 'undefined') {
      return 'none'
    }

    if (nbtText.length > 160) {
      return `${nbtText.substring(0, 160)}...`
    }

    return nbtText
  } catch (error) {
    return 'unavailable'
  }
}

function nexusGetPersistentClassDebug(player) {
  try {
    const persistentClass = String(player.persistentData.getString('nexus_class') || '')
    return persistentClass || 'none'
  } catch (error) {
    return 'unavailable'
  }
}

function nexusGetClassChosenDebug(player) {
  try {
    return player.persistentData.getBoolean('nexus_class_chosen') === true
  } catch (error) {
    return false
  }
}

function nexusExtractGunIdFromNbtText(nbtText) {
  const match = String(nbtText || '').match(/GunId:"([^"]+)"/)

  if (match && match[1]) {
    return match[1]
  }

  return 'none'
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('nexus_inventory_debug')
      .executes(ctx => {
        const player = ctx.source.player

        if (!player) {
          console.info('Nexus Realms: /nexus_inventory_debug must be run by a player.')
          return 0
        }

        player.tell('Diagnostico solamente: NexusCore y TaCZ JS bloquean uso/dano; KubeJS no lee ni mueve inventario.')
        player.tell(`Clase detectada: ${nexusGetPlayerClass(player)}`)
        player.tell(`Main hand item: ${nexusGetItemId(player.mainHandItem) || 'empty'}`)
        player.tell(`Offhand item: ${nexusGetItemId(player.offHandItem) || 'empty'}`)
        player.tell('Slot reads disabled: inventory movement/read APIs are intentionally unused.')

        return 1
      })
  )

  event.register(
    Commands.literal('nexus_class_debug')
      .executes(ctx => {
        const player = ctx.source.player

        if (!player) {
          console.info('Nexus Realms: /nexus_class_debug must be run by a player.')
          return 0
        }

        const mainHandItemId = nexusGetItemId(player.mainHandItem)
        const offHandItemId = nexusGetItemId(player.offHandItem)
        const namespace = nexusGetNamespaceFromItemId(mainHandItemId)
        const offHandNamespace = nexusGetNamespaceFromItemId(offHandItemId)
        const requiredClass = nexusGetRequiredClassForItem(mainHandItemId) || 'none'
        const offHandRequiredClass = nexusGetRequiredClassForItem(offHandItemId) || 'none'
        const detectedClass = nexusGetPlayerClass(player)
        const isBlocked = nexusIsRestrictedForPlayer(player, mainHandItemId)
        const isOffHandBlocked = nexusIsRestrictedForPlayer(player, offHandItemId)
        const mainHandAllowed = nexusCanUseItem(player, player.mainHandItem)
        const offHandAllowed = nexusCanUseItem(player, player.offHandItem)
        const isMainHandEmpty = nexusIsEmptyStack(player.mainHandItem)
        const nbtSummary = nexusGetStackNbtSummary(player.mainHandItem)
        const persistentClass = nexusGetPersistentClassDebug(player)
        const classChosen = nexusGetClassChosenDebug(player)
        const gunId = namespace === 'tacz' ? nexusExtractGunIdFromNbtText(nbtSummary) : 'not_tacz'

        player.tell(`Clase persistentData: ${persistentClass}`)
        player.tell(`nexus_class_chosen: ${classChosen}`)
        player.tell(`Clase detectada: ${detectedClass}`)
        player.tell(`Tags: warrior=${nexusRestrictionHasTag(player, 'nexus_class_warrior')}, mage=${nexusRestrictionHasTag(player, 'nexus_class_mage')}, gunslinger=${nexusRestrictionHasTag(player, 'nexus_class_gunslinger')}`)
        player.tell('Selected hotbar slot: unavailable')
        player.tell('Inventory read API diagnostic: disabled')
        player.tell(`Item mano principal: ${mainHandItemId || 'empty'}`)
        player.tell(`Main hand namespace: ${namespace || 'none'}`)
        player.tell(`Main hand required class: ${requiredClass}`)
        player.tell(`Main hand allowed: ${mainHandAllowed}`)
        player.tell(`Main hand action: ${isBlocked ? 'NexusCore blocks use/damage' : 'allowed'}`)
        player.tell(`Item mano secundaria: ${offHandItemId || 'empty'}`)
        player.tell(`Offhand namespace: ${offHandNamespace || 'none'}`)
        player.tell(`Offhand required class: ${offHandRequiredClass}`)
        player.tell(`Offhand allowed: ${offHandAllowed}`)
        player.tell(`Offhand action: ${isOffHandBlocked ? 'NexusCore blocks use/damage' : 'allowed'}`)
        player.tell(`Mano principal vacia: ${isMainHandEmpty}`)
        player.tell(`NBT: ${nbtSummary}`)
        player.tell(`Resultado: ${isBlocked ? 'bloqueado por NexusCore' : 'permitido'}`)
        player.tell(`TaCZ GunId: ${gunId}`)
        player.tell(`Enforcement owner: ${NEXUS_ENFORCEMENT_OWNER}`)
        player.tell(`Strategy: ${NEXUS_HAND_ENFORCEMENT_STRATEGY}`)
        player.tell(`Bloqueo melee sin arma no-Guerrero activo: ${NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE}`)
        player.tell(`Mining Mode command fallback enabled: ${NEXUS_FORCE_EPICFIGHT_MINING_WITH_COMMAND}`)
        player.tell('Epic Tweaks expected mode controller: true')
        player.tell('Modo final: KubeJS gestiona clase/debug; NexusCore bloquea uso y dano.')

        return 1
      })
  )
})
