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

const NEXUS_RESTRICTION_WARNING_COOLDOWN_MS = 5000
const NEXUS_RESTRICTION_NO_CLASS_COOLDOWN_MS = 10000
const NEXUS_HAND_ENFORCEMENT_ACTIVE = true
const NEXUS_HAND_ENFORCEMENT_INTERVAL_TICKS = 1
const NEXUS_FORCE_EPICFIGHT_MINING_WITH_COMMAND = false
const NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE = true
const NEXUS_EPIC_FIGHT_MINING_MODE_INTERVAL_TICKS = 20
const NEXUS_EPIC_FIGHT_MINING_MODE_WARNING_COOLDOWN_MS = 10000
const NEXUS_EPIC_FIGHT_COMMAND_FAILURE_COOLDOWN_MS = 60000
const nexusRestrictionWarningTimes = {}
const nexusHandEnforcementTickCounters = {}
const nexusHandEnforcementResults = {}
const nexusEpicFightMiningModeTickCounters = {}
const nexusEpicFightCommandFailureTimes = {}

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

function nexusCanUseItem(player, stack) {
  const itemId = nexusGetItemId(stack)
  return !nexusIsRestrictedForPlayer(player, itemId)
}

function nexusRestrictedWarningKey(player, reason) {
  return `${player.uuid}:${reason}`
}

function nexusEscapeJsonText(message) {
  return String(message).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function nexusRestrictionRunCommand(player, command) {
  try {
    player.server.runCommandSilent(command)
    return true
  } catch (error) {
    console.warn(`Nexus Realms: restriction command failed: ${command}`)
    console.warn(error)
    return false
  }
}

function nexusActionbar(player, message, color) {
  const json = `{"text":"${nexusEscapeJsonText(message)}","color":"${color || 'red'}"}`
  return nexusRestrictionRunCommand(player, `title ${player.username} actionbar ${json}`)
}

function nexusPlayWarningSound(player) {
  return nexusRestrictionRunCommand(player, `execute at ${player.username} run playsound minecraft:block.note_block.bass master ${player.username} ~ ~ ~ 0.45 0.8`)
}

function nexusNotifyRestriction(player, message, sound, color) {
  const usedActionbar = nexusActionbar(player, message, color || 'red')

  if (sound) {
    nexusPlayWarningSound(player)
  }

  if (!usedActionbar) {
    player.tell(message)
  }
}

function nexusWarnRestricted(player, requiredClass) {
  const detectedClass = nexusGetPlayerClass(player)
  const isClassless = detectedClass === 'none'
  const classRule = NEXUS_RESTRICTED_CLASS_RULES[requiredClass]

  if (isClassless) {
    const nowNoClass = Date.now()
    const noClassKey = nexusRestrictedWarningKey(player, 'no_class')
    const lastNoClassWarningAt = nexusRestrictionWarningTimes[noClassKey] || 0

    if (nowNoClass - lastNoClassWarningAt < NEXUS_RESTRICTION_NO_CLASS_COOLDOWN_MS) {
      return false
    }

    nexusRestrictionWarningTimes[noClassKey] = nowNoClass
    nexusNotifyRestriction(player, 'Elige una clase para activar tu equipo.', true, 'gold')
    return true
  }

  if (!classRule) {
    return false
  }

  const now = Date.now()
  const key = nexusRestrictedWarningKey(player, requiredClass)
  const lastWarningAt = nexusRestrictionWarningTimes[key] || 0

  if (now - lastWarningAt < NEXUS_RESTRICTION_WARNING_COOLDOWN_MS) {
    return false
  }

  nexusRestrictionWarningTimes[key] = now
  nexusNotifyRestriction(player, classRule.message, true, 'red')
  return true
}

function nexusGetUnarmedCombatMessage(player) {
  const playerClass = nexusGetPlayerClass(player)

  if (playerClass === 'none') {
    return 'Elige una clase para combatir.'
  }

  return 'No puedes usar melee sin arma con esta clase.'
}

function nexusWarnUnarmedCombat(player) {
  const playerClass = nexusGetPlayerClass(player)
  const warningReason = `unarmed_${playerClass}`
  const now = Date.now()
  const key = nexusRestrictedWarningKey(player, warningReason)
  const lastWarningAt = nexusRestrictionWarningTimes[key] || 0

  if (now - lastWarningAt < NEXUS_RESTRICTION_WARNING_COOLDOWN_MS) {
    return false
  }

  nexusRestrictionWarningTimes[key] = now
  nexusNotifyRestriction(player, nexusGetUnarmedCombatMessage(player), true, playerClass === 'none' ? 'gold' : 'red')
  return true
}

function nexusGetEpicFightMiningModeMessage(player) {
  const playerClass = nexusGetPlayerClass(player)

  if (playerClass === 'mage') {
    return '✨ Mantengo la mente clara. No necesito modo batalla.'
  }

  if (playerClass === 'gunslinger') {
    return '🔫 Mantengo la distancia. Nada de combate cuerpo a cuerpo.'
  }

  return 'Elige una clase antes de combatir.'
}

function nexusWarnEpicFightMiningMode(player) {
  const now = Date.now()
  const key = nexusRestrictedWarningKey(player, `epicfight_mining_${nexusGetPlayerClass(player)}`)
  const lastWarningAt = nexusRestrictionWarningTimes[key] || 0

  if (now - lastWarningAt < NEXUS_EPIC_FIGHT_MINING_MODE_WARNING_COOLDOWN_MS) {
    return false
  }

  nexusRestrictionWarningTimes[key] = now
  nexusNotifyRestriction(player, nexusGetEpicFightMiningModeMessage(player), true, nexusGetPlayerClass(player) === 'none' ? 'gold' : 'red')
  return true
}

function nexusLogEpicFightCommandFailure(player, error) {
  const now = Date.now()
  const key = String(player.uuid)
  const lastFailureAt = nexusEpicFightCommandFailureTimes[key] || 0

  if (now - lastFailureAt < NEXUS_EPIC_FIGHT_COMMAND_FAILURE_COOLDOWN_MS) {
    return
  }

  nexusEpicFightCommandFailureTimes[key] = now
  console.warn(`Nexus Realms: Epic Fight mining mode command failed or is unavailable for ${player.username}.`)
  console.warn(error)
}

function nexusForceEpicFightMiningMode(player) {
  try {
    player.server.runCommandSilent(`epicfight mode mining ${player.username}`)
    return true
  } catch (error) {
    nexusLogEpicFightCommandFailure(player, error)
    return false
  }
}

function nexusShouldEnforceEpicFightMiningMode(player) {
  return NEXUS_FORCE_EPICFIGHT_MINING_WITH_COMMAND && !nexusRestrictionPlayerHasClass(player, 'warrior')
}

function nexusShouldRunEpicFightMiningModeTick(player) {
  const key = String(player.uuid)
  const currentCounter = (nexusEpicFightMiningModeTickCounters[key] || 0) + 1

  if (currentCounter >= NEXUS_EPIC_FIGHT_MINING_MODE_INTERVAL_TICKS) {
    nexusEpicFightMiningModeTickCounters[key] = 0
    return true
  }

  nexusEpicFightMiningModeTickCounters[key] = currentCounter
  return false
}

function nexusEnforceEpicFightMiningMode(player) {
  if (!nexusShouldEnforceEpicFightMiningMode(player) || !nexusShouldRunEpicFightMiningModeTick(player)) {
    return
  }

  const commandSucceeded = nexusForceEpicFightMiningMode(player)

  if (commandSucceeded && nexusIsEmptyStack(player.mainHandItem)) {
    nexusWarnEpicFightMiningMode(player)
  }
}

function nexusGetHandStack(player, handName) {
  return handName === 'off_hand' ? player.offHandItem : player.mainHandItem
}

function nexusGetEventHandName(event) {
  try {
    const handText = String(event.hand || '').toLowerCase()

    if (handText.indexOf('off') >= 0) {
      return 'off_hand'
    }

    if (handText.indexOf('main') >= 0) {
      return 'main_hand'
    }
  } catch (ignored) {
  }

  return 'main_hand'
}

function nexusCopyStack(stack) {
  try {
    if (stack && stack.copy) {
      return stack.copy()
    }
  } catch (ignored) {
  }

  try {
    const itemId = nexusGetItemId(stack)
    const count = stack.count || 1
    const nbt = stack.nbt
    return nbt ? Item.of(itemId, count, nbt) : Item.of(itemId, count)
  } catch (error) {
    console.warn('Nexus Realms: failed to copy restricted held item.')
    console.warn(error)
    return null
  }
}

function nexusGetSelectedHotbarSlot(player) {
  const candidates = [
    () => player.selectedSlot,
    () => player.selected,
    () => player.inventory.selected,
    () => player.inventory.selectedSlot
  ]

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    try {
      const selectedSlot = Number(candidates[candidateIndex]())

      if (selectedSlot >= 0 && selectedSlot <= 8) {
        return selectedSlot
      }
    } catch (ignored) {
    }
  }

  return -1
}

function nexusGetInventorySlot(player, slot) {
  const inventory = player.inventory
  const attempts = [
    () => inventory.getStackInSlot(slot),
    () => inventory.getItem(slot),
    () => inventory.get(slot)
  ]

  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
    try {
      const stack = attempts[attemptIndex]()

      if (stack !== undefined && stack !== null) {
        return stack
      }
    } catch (ignored) {
    }
  }

  return null
}

function nexusStacksMatchExpected(actualStack, expectedStack) {
  const actualItemId = nexusGetItemId(actualStack)
  const expectedItemId = nexusGetItemId(expectedStack)

  if (!expectedItemId) {
    return nexusIsEmptyStack(actualStack)
  }

  if (actualItemId !== expectedItemId) {
    return false
  }

  try {
    return Number(actualStack.count || 1) === Number(expectedStack.count || 1)
  } catch (ignored) {
  }

  return true
}

function nexusSetInventorySlot(player, slot, stack) {
  const inventory = player.inventory
  const attempts = [
    () => inventory.setStackInSlot(slot, stack),
    () => inventory.setItem(slot, stack),
    () => inventory.set(slot, stack)
  ]

  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
    try {
      attempts[attemptIndex]()

      if (nexusStacksMatchExpected(nexusGetInventorySlot(player, slot), stack)) {
        return true
      }
    } catch (ignored) {
    }
  }

  return false
}

function nexusFindSafeInventorySlot(player) {
  const selectedSlot = nexusGetSelectedHotbarSlot(player)
  const safeSlots = []

  for (let slot = 9; slot <= 35; slot++) {
    safeSlots.push(slot)
  }

  if (selectedSlot >= 0) {
    for (let hotbarSlot = 0; hotbarSlot <= 8; hotbarSlot++) {
      if (hotbarSlot !== selectedSlot) {
        safeSlots.push(hotbarSlot)
      }
    }
  }

  for (let safeSlotIndex = 0; safeSlotIndex < safeSlots.length; safeSlotIndex++) {
    const slot = safeSlots[safeSlotIndex]
    const currentStack = nexusGetInventorySlot(player, slot)

    if (currentStack === null || !nexusIsEmptyStack(currentStack)) {
      continue
    }

    return slot
  }

  return -1
}

function nexusMoveStackToSafeInventorySlot(player, stack, safeSlot) {
  if (safeSlot < 0) {
    return false
  }

  if (nexusSetInventorySlot(player, safeSlot, stack)) {
    return `moved_to_slot_${safeSlot}`
  }

  return false
}

function nexusSetHandEmpty(player, handName) {
  const emptyStack = Item.of('minecraft:air')

  if (handName === 'off_hand') {
    const attempts = []
    attempts.push(() => player.setOffHandItem(emptyStack))
    attempts.push(() => player.setHeldItem('off_hand', emptyStack))
    attempts.push(() => player.setHeldItem('OFF_HAND', emptyStack))
    attempts.push(() => { player.offHandItem = emptyStack })

    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
      try {
        attempts[attemptIndex]()

        if (nexusIsEmptyHand(nexusGetHandStack(player, handName))) {
          return true
        }
      } catch (ignored) {
      }
    }

    return nexusIsEmptyHand(nexusGetHandStack(player, handName))
  }

  const selectedSlot = nexusGetSelectedHotbarSlot(player)

  if (selectedSlot < 0) {
    return false
  }

  return nexusSetInventorySlot(player, selectedSlot, emptyStack) && nexusIsEmptyStack(nexusGetInventorySlot(player, selectedSlot))
}

function nexusRestoreHandStack(player, handName, stack) {
  if (handName === 'main_hand') {
    const selectedSlot = nexusGetSelectedHotbarSlot(player)

    if (selectedSlot < 0) {
      return false
    }

    return nexusSetInventorySlot(player, selectedSlot, stack)
  }

  const attempts = [
    () => player.setOffHandItem(stack),
    () => player.setHeldItem('off_hand', stack),
    () => player.setHeldItem('OFF_HAND', stack),
    () => { player.offHandItem = stack }
  ]

  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
    try {
      attempts[attemptIndex]()

      if (nexusStacksMatchExpected(nexusGetHandStack(player, handName), stack)) {
        return true
      }
    } catch (ignored) {
    }
  }

  return false
}

function nexusHandEnforcementResultKey(player, handName) {
  return `${player.uuid}:${handName}`
}

function nexusRecordHandEnforcementResult(player, handName, result) {
  nexusHandEnforcementResults[nexusHandEnforcementResultKey(player, handName)] = result
}

function nexusGetLastHandEnforcementResult(player, handName) {
  return nexusHandEnforcementResults[nexusHandEnforcementResultKey(player, handName)] || 'none'
}

function nexusMoveHeldItemAway(player, handName, reason) {
  if (!NEXUS_HAND_ENFORCEMENT_ACTIVE) {
    nexusRecordHandEnforcementResult(player, handName, 'kept_in_hand')
    return false
  }

  const stack = nexusGetHandStack(player, handName)
  const itemId = nexusGetItemId(stack)
  const requiredClass = nexusGetRequiredClassForItem(itemId)

  if (!itemId || !requiredClass || nexusCanUseItem(player, stack)) {
    nexusRecordHandEnforcementResult(player, handName, 'kept_in_hand')
    return false
  }

  if (handName === 'main_hand' && nexusGetSelectedHotbarSlot(player) < 0) {
    nexusWarnRestricted(player, requiredClass)
    nexusRecordHandEnforcementResult(player, handName, 'failed_selected_slot')
    console.warn(`Nexus Realms: could not determine selected hotbar slot for ${player.username}; restricted item ${itemId} was not moved to avoid duplication.`)
    return false
  }

  const safeSlot = nexusFindSafeInventorySlot(player)

  if (safeSlot < 0) {
    nexusWarnRestricted(player, requiredClass)
    nexusRecordHandEnforcementResult(player, handName, 'no_safe_slot')
    nexusNotifyRestriction(player, 'Inventario lleno: no puedes usar este item.', false, 'red')
    return false
  }

  const copiedStack = nexusCopyStack(stack)

  if (!copiedStack) {
    nexusWarnRestricted(player, requiredClass)
    nexusRecordHandEnforcementResult(player, handName, 'failed_copy')
    return false
  }

  if (!nexusSetHandEmpty(player, handName)) {
    nexusWarnRestricted(player, requiredClass)
    nexusRecordHandEnforcementResult(player, handName, 'failed_clear_hand')
    console.warn(`Nexus Realms: could not clear ${handName} restricted item ${itemId} for ${player.username}; item was not moved to avoid duplication.`)
    return false
  }

  const inventoryResult = nexusMoveStackToSafeInventorySlot(player, copiedStack, safeSlot)

  if (!inventoryResult) {
    const restored = nexusRestoreHandStack(player, handName, copiedStack)
    const failedResult = restored ? 'failed_move_to_slot_restored' : 'failed_move_to_slot'

    nexusWarnRestricted(player, requiredClass)
    nexusRecordHandEnforcementResult(player, handName, failedResult)
    console.warn(`Nexus Realms: failed to move restricted ${handName} item ${itemId} for ${player.username}; restore=${restored}.`)
    return false
  }

  const returnResult = inventoryResult

  nexusRecordHandEnforcementResult(player, handName, returnResult)
  nexusWarnRestricted(player, requiredClass)
  console.info(`Nexus Realms: moved restricted ${handName} item ${itemId} away from ${player.username}; required class: ${requiredClass}; reason: ${reason}; result: ${returnResult}.`)
  return true
}

function nexusEnforceRestrictedHands(player, reason) {
  const movedMainHand = nexusMoveHeldItemAway(player, 'main_hand', reason)
  const movedOffHand = nexusMoveHeldItemAway(player, 'off_hand', reason)
  return movedMainHand || movedOffHand
}

function nexusHandleRestrictedItemUse(event, player, stack, source, handName) {
  if (!player) {
    return false
  }

  const itemId = nexusGetItemId(stack)
  const requiredClass = nexusGetRequiredClassForItem(itemId)

  if (!requiredClass || !nexusIsRestrictedForPlayer(player, itemId)) {
    return false
  }

  const didNotify = nexusWarnRestricted(player, requiredClass)

  if (event && event.cancel) {
    event.cancel()
  }

  if (handName) {
    nexusMoveHeldItemAway(player, handName, source)
  } else {
    nexusEnforceRestrictedHands(player, source)
  }

  if (didNotify || (event && event.cancel)) {
    console.info(`Nexus Realms: blocked restricted ${source} item ${itemId} for ${player.username}; required class: ${requiredClass}.`)
  }

  return true
}

function nexusRestrictionIsPlayer(entity) {
  if (!entity) {
    return false
  }

  if (entity.username) {
    return true
  }

  return String(entity.type) === 'minecraft:player'
}

function nexusGetDamageSourceValue(source, key) {
  try {
    const value = source[key]

    if (value) {
      return value
    }
  } catch (ignored) {
  }

  return null
}

function nexusGetDamageSourceMethodValue(source, methodName) {
  try {
    const method = source[methodName]

    if (method) {
      return method()
    }
  } catch (ignored) {
  }

  return null
}

function nexusGetDamageAttacker(event) {
  const source = event.source

  if (!source) {
    return null
  }

  const candidates = [
    nexusGetDamageSourceValue(source, 'actual'),
    nexusGetDamageSourceValue(source, 'player'),
    nexusGetDamageSourceValue(source, 'entity'),
    nexusGetDamageSourceValue(source, 'attacker'),
    nexusGetDamageSourceMethodValue(source, 'getEntity'),
    nexusGetDamageSourceMethodValue(source, 'getActual')
  ]

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidate = candidates[candidateIndex]

    if (nexusRestrictionIsPlayer(candidate)) {
      return candidate
    }
  }

  return null
}

function nexusGetDamageDirectEntity(event) {
  const source = event.source

  if (!source) {
    return null
  }

  const candidates = [
    nexusGetDamageSourceValue(source, 'direct'),
    nexusGetDamageSourceValue(source, 'immediate'),
    nexusGetDamageSourceValue(source, 'sourceEntity'),
    nexusGetDamageSourceValue(source, 'entity'),
    nexusGetDamageSourceMethodValue(source, 'getDirectEntity')
  ]

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidate = candidates[candidateIndex]

    if (candidate) {
      return candidate
    }
  }

  return null
}

function nexusDamageSourceLooksDirectMelee(event, attacker) {
  const directEntity = nexusGetDamageDirectEntity(event)

  if (directEntity && directEntity !== attacker && !nexusRestrictionIsPlayer(directEntity)) {
    return false
  }

  try {
    const sourceType = String(event.source.type || event.source.msgId || event.source)

    if (sourceType.indexOf('arrow') >= 0 || sourceType.indexOf('projectile') >= 0 || sourceType.indexOf('magic') >= 0 || sourceType.indexOf('spell') >= 0 || sourceType.indexOf('gun') >= 0 || sourceType.indexOf('bullet') >= 0) {
      return false
    }
  } catch (ignored) {
  }

  return true
}

function nexusIsEmptyStack(stack) {
  const itemId = nexusGetItemId(stack)
  return !itemId || itemId === 'minecraft:air'
}

function nexusIsEmptyHand(stack) {
  return nexusIsEmptyStack(stack)
}

function nexusIsNonWarrior(player) {
  const playerClass = nexusGetPlayerClass(player)
  return playerClass !== 'none' && playerClass !== 'warrior'
}

function nexusIsUnarmedCombatAttempt(attacker) {
  return nexusIsEmptyHand(attacker.mainHandItem)
}

function nexusUnarmedMeleeAllowed(attacker) {
  return nexusRestrictionPlayerHasClass(attacker, 'warrior')
}

function nexusShouldBlockUnarmedMelee(player) {
  return NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE && nexusIsNonWarrior(player) && nexusIsEmptyHand(player.mainHandItem)
}

function nexusCancelDamageEvent(event) {
  try {
    if (event.cancel) {
      event.cancel()
      return 'cancelled'
    }
  } catch (ignored) {
  }

  try {
    event.damage = 0
    return 'zeroed'
  } catch (ignored) {
  }

  try {
    event.amount = 0
    return 'zeroed'
  } catch (ignored) {
  }

  return 'unmodified'
}

function nexusHandleRestrictedDamage(event) {
  const attacker = nexusGetDamageAttacker(event)

  if (!attacker || !nexusRestrictionIsPlayer(attacker)) {
    return
  }

  if (!nexusDamageSourceLooksDirectMelee(event, attacker)) {
    return
  }

  const heldItemId = nexusGetItemId(attacker.mainHandItem)
  const heldRequiredClass = nexusGetRequiredClassForItem(heldItemId)

  if (heldRequiredClass && nexusIsRestrictedForPlayer(attacker, heldItemId)) {
    nexusWarnRestricted(attacker, heldRequiredClass)
    nexusMoveHeldItemAway(attacker, 'main_hand', 'restricted_damage')
    nexusCancelDamageEvent(event)
    return
  }

  if (!nexusShouldBlockUnarmedMelee(attacker) || nexusUnarmedMeleeAllowed(attacker)) {
    return
  }

  nexusWarnUnarmedCombat(attacker)
  nexusCancelDamageEvent(event)
}

function nexusShouldRunHandEnforcement(player) {
  const key = String(player.uuid)
  const currentCounter = (nexusHandEnforcementTickCounters[key] || 0) + 1

  if (currentCounter >= NEXUS_HAND_ENFORCEMENT_INTERVAL_TICKS) {
    nexusHandEnforcementTickCounters[key] = 0
    return true
  }

  nexusHandEnforcementTickCounters[key] = currentCounter
  return false
}

function nexusCheckRestrictedHands(player) {
  if (!NEXUS_HAND_ENFORCEMENT_ACTIVE || !nexusShouldRunHandEnforcement(player)) {
    return
  }

  nexusEnforceRestrictedHands(player, 'hand_enforcement_tick')
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

ItemEvents.rightClicked(event => {
  nexusHandleRestrictedItemUse(event, event.player, event.item, 'right_click', nexusGetEventHandName(event))
})

if (typeof BlockEvents !== 'undefined' && BlockEvents.rightClicked) {
  BlockEvents.rightClicked(event => {
    nexusHandleRestrictedItemUse(event, event.player, event.item, 'block_right_click', nexusGetEventHandName(event))
  })
}

if (typeof ItemEvents !== 'undefined' && ItemEvents.entityInteracted) {
  ItemEvents.entityInteracted(event => {
    nexusHandleRestrictedItemUse(event, event.player, event.item, 'entity_interact', nexusGetEventHandName(event))
  })
}

EntityEvents.hurt(event => {
  nexusHandleRestrictedDamage(event)
})

PlayerEvents.tick(event => {
  const player = event.player

  if (!player) {
    return
  }

  nexusEnforceEpicFightMiningMode(player)
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
        const offHandItemId = nexusGetItemId(player.offHandItem)
        const selectedSlot = nexusGetSelectedHotbarSlot(player)
        const namespace = nexusGetNamespaceFromItemId(mainHandItemId)
        const offHandNamespace = nexusGetNamespaceFromItemId(offHandItemId)
        const requiredClass = nexusGetRequiredClassForItem(mainHandItemId) || 'none'
        const offHandRequiredClass = nexusGetRequiredClassForItem(offHandItemId) || 'none'
        const detectedClass = nexusGetPlayerClass(player)
        const isBlocked = nexusIsRestrictedForPlayer(player, mainHandItemId)
        const isOffHandBlocked = nexusIsRestrictedForPlayer(player, offHandItemId)
        const mainHandAllowed = nexusCanUseItem(player, player.mainHandItem)
        const offHandAllowed = nexusCanUseItem(player, player.offHandItem)
        const mainHandLastEnforcementResult = nexusGetLastHandEnforcementResult(player, 'main_hand')
        const offHandLastEnforcementResult = nexusGetLastHandEnforcementResult(player, 'off_hand')
        const isMainHandEmpty = nexusIsEmptyStack(player.mainHandItem)
        const unarmedAllowed = nexusUnarmedMeleeAllowed(player)
        const unarmedEntityMeleeBlocked = nexusShouldBlockUnarmedMelee(player)
        const miningModeEnforced = nexusShouldEnforceEpicFightMiningMode(player)
        const nbtSummary = nexusGetStackNbtSummary(player.mainHandItem)
        const persistentClass = nexusGetPersistentClassDebug(player)
        const classChosen = nexusGetClassChosenDebug(player)
        const gunId = namespace === 'tacz' ? nexusExtractGunIdFromNbtText(nbtSummary) : 'not_tacz'

        player.tell(`Clase persistentData: ${persistentClass}`)
        player.tell(`nexus_class_chosen: ${classChosen}`)
        player.tell(`Clase detectada: ${detectedClass}`)
        player.tell(`Tags: warrior=${nexusRestrictionHasTag(player, 'nexus_class_warrior')}, mage=${nexusRestrictionHasTag(player, 'nexus_class_mage')}, gunslinger=${nexusRestrictionHasTag(player, 'nexus_class_gunslinger')}`)
        player.tell(`Selected hotbar slot: ${selectedSlot >= 0 ? selectedSlot : 'unavailable'}`)
        player.tell(`Item mano principal: ${mainHandItemId || 'empty'}`)
        player.tell(`Main hand namespace: ${namespace || 'none'}`)
        player.tell(`Main hand required class: ${requiredClass}`)
        player.tell(`Main hand allowed: ${mainHandAllowed}`)
        player.tell(`Main hand action: ${isBlocked ? 'move away from hand' : 'keep in hand'}`)
        player.tell(`Main hand last enforcement result: ${mainHandLastEnforcementResult}`)
        player.tell(`Item mano secundaria: ${offHandItemId || 'empty'}`)
        player.tell(`Offhand namespace: ${offHandNamespace || 'none'}`)
        player.tell(`Offhand required class: ${offHandRequiredClass}`)
        player.tell(`Offhand allowed: ${offHandAllowed}`)
        player.tell(`Offhand action: ${isOffHandBlocked ? 'move away from hand' : 'keep in hand'}`)
        player.tell(`Offhand last enforcement result: ${offHandLastEnforcementResult}`)
        player.tell(`Mano principal vacia: ${isMainHandEmpty}`)
        player.tell(`NBT: ${nbtSummary}`)
        player.tell(`Resultado: ${isBlocked ? 'bloqueado' : 'permitido'}`)
        player.tell(`TaCZ GunId: ${gunId}`)
        player.tell(`Hand enforcement active: ${NEXUS_HAND_ENFORCEMENT_ACTIVE}`)
        player.tell(`Melee sin arma permitido: ${unarmedAllowed}`)
        player.tell(`Bloqueo melee sin arma no-Guerrero activo: ${NEXUS_BLOCK_NON_WARRIOR_UNARMED_MELEE}`)
        player.tell(`Main hand empty: ${isMainHandEmpty}`)
        player.tell(`Unarmed entity melee blocked: ${unarmedEntityMeleeBlocked}`)
        player.tell(`Epic Tweaks expected mode controller: true`)
        player.tell(`Epic Fight command enforcement active: ${miningModeEnforced}`)
        player.tell(`Mining Mode interval ticks: ${NEXUS_EPIC_FIGHT_MINING_MODE_INTERVAL_TICKS}`)
        player.tell(`Mining Mode command fallback enabled: ${NEXUS_FORCE_EPICFIGHT_MINING_WITH_COMMAND}`)
        player.tell('Epic Fight Air/minecraft:air: configure as Preferred Tool.')
        player.tell('Epic Fight Toggle Battle/Mining Mode: Not Bound via Default Options.')
        player.tell('Starter Pistolero: GunId tacz:glock_17')
        player.tell('Modo final: KubeJS bloquea items; Epic Tweaks aplica Battle/Mining Mode.')

        if (detectedClass === 'none') {
          player.tell('Sin clase: restricciones activas solo como aviso con cooldown, sin spam.')
        }

        return 1
      })
  )
})

// Battle Mode is client/keybind-driven in Epic Fight. No reliable KubeJS server_scripts API
// was found in this pack to force-disable it, so this layer restricts items and progression.
