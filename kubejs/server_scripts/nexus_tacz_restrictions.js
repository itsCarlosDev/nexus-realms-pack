const NEXUS_TACZ_WARNING_COOLDOWN_MS = 3000
const NEXUS_TACZ_LOG_COOLDOWN_MS = 3000
const nexusTaczWarningTimes = {}
const nexusTaczLogTimes = {}

function nexusTaczHasTag(player, tag) {
  return player && player.tags && player.tags.contains(tag)
}

function nexusTaczGetPlayerClass(player) {
  if (!player) {
    return 'none'
  }

  try {
    const persistentClass = String(player.persistentData.getString('nexus_class') || '')

    if (persistentClass === 'warrior' || persistentClass === 'mage' || persistentClass === 'gunslinger') {
      return persistentClass
    }
  } catch (ignored) {
  }

  if (nexusTaczHasTag(player, 'nexus_class_warrior')) {
    return 'warrior'
  }

  if (nexusTaczHasTag(player, 'nexus_class_mage')) {
    return 'mage'
  }

  if (nexusTaczHasTag(player, 'nexus_class_gunslinger')) {
    return 'gunslinger'
  }

  return 'none'
}

function nexusTaczIsGunslinger(player) {
  return nexusTaczGetPlayerClass(player) === 'gunslinger'
}

function nexusTaczPlayerName(player) {
  try {
    return String(player.username || player.name || player.getName().getString())
  } catch (ignored) {
  }

  return 'unknown'
}

function nexusTaczPlayerKey(player, reason) {
  try {
    return `${player.uuid}:${reason}`
  } catch (ignored) {
  }

  try {
    return `${player.getUUID()}:${reason}`
  } catch (ignored) {
  }

  return `${nexusTaczPlayerName(player)}:${reason}`
}

function nexusTaczWarnNotGunslinger(player) {
  const key = nexusTaczPlayerKey(player, 'not_gunslinger')
  const now = Date.now()
  const lastWarningAt = nexusTaczWarningTimes[key] || 0

  if (now - lastWarningAt < NEXUS_TACZ_WARNING_COOLDOWN_MS) {
    return
  }

  nexusTaczWarningTimes[key] = now

  try {
    player.tell('Solo el Pistolero puede usar armas de fuego.')
  } catch (ignored) {
  }
}

function nexusTaczLogBlocked(eventName, player, playerClass) {
  const key = nexusTaczPlayerKey(player, `log_${eventName}`)
  const now = Date.now()
  const lastLogAt = nexusTaczLogTimes[key] || 0

  if (now - lastLogAt < NEXUS_TACZ_LOG_COOLDOWN_MS) {
    return
  }

  nexusTaczLogTimes[key] = now
  console.info(`[Nexus Realms] Blocked TaCZ event ${eventName} for ${nexusTaczPlayerName(player)} class=${playerClass}`)
}

function nexusTaczCallGetter(target, methodName) {
  try {
    const method = target && target[methodName]

    if (method) {
      return method()
    }
  } catch (ignored) {
  }

  return null
}

function nexusTaczGetEventPlayer(event) {
  const candidates = [
    event && event.player,
    event && event.shooter,
    event && event.attacker,
    event && event.entity,
    nexusTaczCallGetter(event, 'getPlayer'),
    nexusTaczCallGetter(event, 'getShooter'),
    nexusTaczCallGetter(event, 'getAttacker'),
    nexusTaczCallGetter(event, 'getEntity')
  ]

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidate = candidates[candidateIndex]

    if (candidate && (candidate.username || String(candidate.type || '') === 'minecraft:player')) {
      return candidate
    }
  }

  return null
}

function nexusTaczCancelEvent(event) {
  try {
    const forgeEvent = event.getForgeEvent && event.getForgeEvent()

    if (forgeEvent && forgeEvent.setCanceled) {
      forgeEvent.setCanceled(true)
    }
  } catch (ignored) {
  }

  try {
    if (event.cancel) {
      event.cancel()
    }
  } catch (ignored) {
  }
}

function nexusTaczBlockIfNotGunslinger(event, eventName) {
  const player = nexusTaczGetEventPlayer(event)

  if (!player) {
    return
  }

  const playerClass = nexusTaczGetPlayerClass(player)

  if (playerClass === 'gunslinger') {
    return
  }

  nexusTaczWarnNotGunslinger(player)
  nexusTaczLogBlocked(eventName, player, playerClass)
  nexusTaczCancelEvent(event)
}

function nexusTaczRegisterEvent(eventName) {
  try {
    if (typeof TimelessGunEvents === 'undefined' || !TimelessGunEvents[eventName]) {
      console.warn(`[Nexus Realms] TaCZ KubeJS event unavailable: TimelessGunEvents.${eventName}`)
      return
    }

    TimelessGunEvents[eventName](event => {
      nexusTaczBlockIfNotGunslinger(event, eventName)
    })
  } catch (error) {
    console.warn(`[Nexus Realms] Failed to register TaCZ KubeJS event: ${eventName}`)
    console.warn(error)
  }
}

nexusTaczRegisterEvent('gunShoot')
nexusTaczRegisterEvent('gunFire')
nexusTaczRegisterEvent('gunReload')
nexusTaczRegisterEvent('gunMelee')
nexusTaczRegisterEvent('gunFireSelect')
nexusTaczRegisterEvent('gunFinishReload')
nexusTaczRegisterEvent('entityHurtByGunPre')
