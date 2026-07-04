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

const NEXUS_RESTRICTION_WARNING_COOLDOWN_MS = 2000
const NEXUS_RESTRICTION_HAND_CHECK_INTERVAL_MS = 1000
const nexusRestrictionWarningTimes = {}
const nexusRestrictionHandCheckTicks = {}

function nexusRestrictionHasTag(player, tag) {
  return player && player.tags && player.tags.contains(tag)
}

function nexusGetPlayerClass(player) {
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

  return nexusRestrictionHasTag(player, classRule.tag)
}

function nexusGetItemId(stack) {
  if (!stack || stack.empty) {
    return ''
  }

  return String(stack.id)
}

function nexusGetNamespaceFromItemId(itemId) {
  const separatorIndex = itemId.indexOf(':')

  if (separatorIndex < 0) {
    return ''
  }

  return itemId.substring(0, separatorIndex)
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

function nexusRestrictedWarningKey(player) {
  return String(player.uuid)
}

function nexusWarnRestricted(player, requiredClass) {
  const classRule = NEXUS_RESTRICTED_CLASS_RULES[requiredClass]

  if (!classRule) {
    return
  }

  const now = Date.now()
  const key = nexusRestrictedWarningKey(player)
  const lastWarningAt = nexusRestrictionWarningTimes[key] || 0

  if (now - lastWarningAt < NEXUS_RESTRICTION_WARNING_COOLDOWN_MS) {
    return
  }

  nexusRestrictionWarningTimes[key] = now
  player.tell(classRule.message)
}

function nexusHandleRestrictedItemUse(event, player, stack, source) {
  const itemId = nexusGetItemId(stack)
  const requiredClass = nexusGetRequiredClassForItem(itemId)

  if (!requiredClass || !nexusIsRestrictedForPlayer(player, itemId)) {
    return false
  }

  nexusWarnRestricted(player, requiredClass)

  if (event && event.cancel) {
    event.cancel()
  }

  console.info(`Nexus Realms: blocked restricted ${source} item ${itemId} for ${player.username}; required class: ${requiredClass}.`)
  return true
}

function nexusCheckRestrictedHands(player) {
  const key = String(player.uuid)
  const now = Date.now()
  const lastCheckAt = nexusRestrictionHandCheckTicks[key] || 0

  if (now - lastCheckAt < NEXUS_RESTRICTION_HAND_CHECK_INTERVAL_MS) {
    return
  }

  nexusRestrictionHandCheckTicks[key] = now
  nexusHandleRestrictedItemUse(null, player, player.mainHandItem, 'main_hand_guard')
  nexusHandleRestrictedItemUse(null, player, player.offHandItem, 'off_hand_guard')
}

ItemEvents.rightClicked(event => {
  nexusHandleRestrictedItemUse(event, event.player, event.item, 'right_click')
})

PlayerEvents.tick(event => {
  const player = event.player

  if (!player) {
    return
  }

  nexusCheckRestrictedHands(player)
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('nexus_class_debug')
      .executes(ctx => {
        const player = ctx.source.player

        if (!player) {
          console.info('Nexus Realms: /nexus_class_debug must be run by a player.')
          return 0
        }

        const mainHandItemId = nexusGetItemId(player.mainHandItem)
        const namespace = nexusGetNamespaceFromItemId(mainHandItemId)
        const requiredClass = nexusGetRequiredClassForItem(mainHandItemId) || 'none'
        const detectedClass = nexusGetPlayerClass(player)
        const isBlocked = nexusIsRestrictedForPlayer(player, mainHandItemId)

        player.tell(`Clase detectada: ${detectedClass}`)
        player.tell(`Tags: warrior=${nexusRestrictionHasTag(player, 'nexus_class_warrior')}, mage=${nexusRestrictionHasTag(player, 'nexus_class_mage')}, gunslinger=${nexusRestrictionHasTag(player, 'nexus_class_gunslinger')}`)
        player.tell(`Item mano principal: ${mainHandItemId || 'empty'}`)
        player.tell(`Namespace: ${namespace || 'none'}`)
        player.tell(`Clase requerida: ${requiredClass}`)
        player.tell(`Resultado: ${isBlocked ? 'bloqueado' : 'permitido'}`)
        return 1
      })
  )
})

// Battle Mode is client/keybind-driven in Epic Fight. No reliable KubeJS server_scripts API
// was found in this pack to force-disable it, so this layer restricts items and progression.
