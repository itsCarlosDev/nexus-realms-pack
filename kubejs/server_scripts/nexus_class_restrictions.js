const NEXUS_RESTRICTED_ITEM_NAMESPACES = {
  simplyswords: {
    tag: 'nexus_class_warrior',
    message: 'Solo el Guerrero puede usar este equipo marcial.'
  },
  epicfight: {
    tag: 'nexus_class_warrior',
    message: 'Solo el Guerrero puede usar este equipo marcial.'
  },
  epicfight_nightfall: {
    tag: 'nexus_class_warrior',
    message: 'Solo el Guerrero puede usar este equipo marcial.'
  },
  efn: {
    tag: 'nexus_class_warrior',
    message: 'Solo el Guerrero puede usar este equipo marcial.'
  },
  nightfall: {
    tag: 'nexus_class_warrior',
    message: 'Solo el Guerrero puede usar este equipo marcial.'
  },
  irons_spellbooks: {
    tag: 'nexus_class_mage',
    message: 'Solo el Mago puede canalizar magia.'
  },
  traveloptics: {
    tag: 'nexus_class_mage',
    message: 'Solo el Mago puede canalizar magia.'
  },
  tacz: {
    tag: 'nexus_class_gunslinger',
    message: 'Solo el Pistolero puede usar armas de fuego.'
  }
}

const NEXUS_RESTRICTION_MESSAGE_COOLDOWN_MS = 2500
const nexusRestrictionMessageTimes = {}

function nexusHasTag(player, tag) {
  return player && player.tags && player.tags.contains(tag)
}

function nexusGetItemId(item) {
  if (!item || item.empty) {
    return ''
  }

  return String(item.id)
}

function nexusGetNamespace(item) {
  const itemId = nexusGetItemId(item)
  const separatorIndex = itemId.indexOf(':')

  if (separatorIndex < 0) {
    return ''
  }

  return itemId.substring(0, separatorIndex)
}

function nexusRequiredClassForItem(itemId) {
  const separatorIndex = itemId.indexOf(':')

  if (separatorIndex < 0) {
    return null
  }

  const namespace = itemId.substring(0, separatorIndex)
  return NEXUS_RESTRICTED_ITEM_NAMESPACES[namespace] || null
}

function nexusCanUseItem(player, itemId) {
  const restriction = nexusRequiredClassForItem(itemId)

  if (!restriction) {
    return true
  }

  return nexusHasTag(player, restriction.tag)
}

function nexusRestrictionCooldownKey(player, itemId) {
  return `${player.uuid}:${itemId}`
}

function nexusTellRestrictedItemMessage(player, itemId, message) {
  const now = Date.now()
  const key = nexusRestrictionCooldownKey(player, itemId)
  const lastMessageAt = nexusRestrictionMessageTimes[key] || 0

  if (now - lastMessageAt < NEXUS_RESTRICTION_MESSAGE_COOLDOWN_MS) {
    return
  }

  nexusRestrictionMessageTimes[key] = now
  player.tell(message)
}

function nexusDenyRestrictedItem(event, player, itemId) {
  const restriction = nexusRequiredClassForItem(itemId)

  if (!restriction || nexusCanUseItem(player, itemId)) {
    return false
  }

  nexusTellRestrictedItemMessage(player, itemId, restriction.message)
  event.cancel()
  return true
}

function nexusCheckRestrictedItemEvent(event) {
  const player = event.player

  if (!player) {
    return
  }

  const itemId = nexusGetItemId(event.item)

  if (!itemId) {
    return
  }

  nexusDenyRestrictedItem(event, player, itemId)
}

ItemEvents.rightClicked(event => {
  nexusCheckRestrictedItemEvent(event)
})

// KubeJS right-click events do not cover every left-click/basic attack path from combat mods.
// If Epic Fight, TaCZ, or spellcasting expose additional reliable events later, add them here.
