// Nexus Realms - presentacion y control kill-gated para The Hordes.
// Se carga en startup_scripts porque ForgeEvents registra listeners nativos al arrancar.

const NEXUS_HORDE_TOTAL_WAVES = 4
const NEXUS_HORDE_INITIAL_WAVE_AMOUNT = 15
const NEXUS_HORDE_PREPARATION_TICKS = 200
const NEXUS_HORDE_SETTLE_TICKS = 20
const NEXUS_HORDE_ZERO_CONFIRM_TICKS = 10
const NEXUS_HORDE_NEXT_WAVE_DELAY = 200
const NEXUS_HORDE_UPDATE_INTERVAL = 10
const NEXUS_HORDE_FINAL_DISPLAY_TICKS = 80

const nexusHordeStates = new Map()
const nexusHordeLoggedCommandErrors = new Set()
let nexusHordeServerTick = 0

function nexusHordeLogCommandErrorOnce(key, message, error) {
  if (nexusHordeLoggedCommandErrors.has(key)) return
  nexusHordeLoggedCommandErrors.add(key)
  console.error(message)
  if (error) console.error(error)
}

function nexusHordeRunSilent(server, command) {
  if (!server) return false

  try {
    return server.getCommands().performPrefixedCommand(
      server.createCommandSourceStack().withSuppressedOutput(),
      command
    ) > 0
  } catch (error) {
    const commandType = String(command).split(' ').slice(0, 2).join(' ')
    nexusHordeLogCommandErrorOnce(
      `command:${commandType}:${String(error)}`,
      `Nexus Realms Hordes: fallo al ejecutar '${commandType}'`,
      error
    )
    return false
  }
}

function nexusHordePlayerId(player) {
  // En esta version local, player.uuid es la identificacion estable expuesta a KubeJS.
  return String(player.uuid)
}

function nexusHordePlayerName(player) {
  return String(player.getGameProfile().getName())
}

function nexusHordeIsDay(player) {
  try {
    return !!player.level.isDay()
  } catch (error) {
    nexusHordeLogCommandErrorOnce(
      `day-check:${String(error)}`,
      'Nexus Realms Hordes: fallo al comprobar el amanecer',
      error
    )
    return false
  }
}

function nexusHordeSafeId(uuid) {
  return String(uuid).replace(/-/g, '')
}

function nexusHordeComponent(text, color, bold) {
  return JSON.stringify({
    text: String(text),
    color: color || 'white',
    italic: false,
    bold: Boolean(bold)
  })
}

function nexusHordeEntityId(entity) {
  return String(entity.uuid)
}

function nexusHordeCreateState(player) {
  const playerId = nexusHordePlayerId(player)
  return {
    player: player,
    playerId: playerId,
    playerName: nexusHordePlayerName(player),
    currentWave: 0,
    totalWaves: NEXUS_HORDE_TOTAL_WAVES,
    expectedWaveSize: NEXUS_HORDE_INITIAL_WAVE_AMOUNT,
    savedActualWaveSize: NEXUS_HORDE_INITIAL_WAVE_AMOUNT,
    alive: new Map(),
    waveEntities: new Map(),
    trackedEntities: new Map(),
    waveStarted: false,
    waveHadMob: false,
    spawnSettled: false,
    settleAt: -1,
    zeroSince: -1,
    nextWaveAt: -1,
    preparing: true,
    preparationStartedAt: nexusHordeServerTick,
    firstWaveAt: nexusHordeServerTick + NEXUS_HORDE_PREPARATION_TICKS,
    spawnFailed: false,
    completed: false,
    endedByDawn: false,
    ending: false,
    cleanupAt: -1,
    modStopped: false,
    waveClearPresented: false,
    finalPresented: false,
    seenNight: false,
    manuallySpawning: false,
    bossbarAvailable: false,
    tag: `nexus_horde_${nexusHordeSafeId(playerId)}`,
    bossbarId: `nexus:horde_${nexusHordeSafeId(playerId)}`
  }
}

function nexusHordeBossbarRemove(state, server) {
  nexusHordeRunSilent(server || state.player.getServer(), `bossbar remove ${state.bossbarId}`)
}

function nexusHordeBossbarCreate(state) {
  const server = state.player.getServer()
  nexusHordeBossbarRemove(state, server)
  const created = nexusHordeRunSilent(
    server,
    `bossbar add ${state.bossbarId} ${nexusHordeComponent('\u2620 LA HORDA LLEGA EN 10 s', 'yellow', false)}`
  )
  state.bossbarAvailable = created
  if (!created) {
    nexusHordeLogCommandErrorOnce(
      `bossbar-create:${state.playerId}`,
      `Nexus Realms Hordes: no se pudo crear la bossbar de ${state.playerName}`
    )
    return
  }
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} players ${state.playerName}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} color yellow`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} style progress`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} max ${NEXUS_HORDE_PREPARATION_TICKS}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} value ${NEXUS_HORDE_PREPARATION_TICKS}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} visible true`)
}

function nexusHordeBossbarUpdate(state) {
  if (!state.bossbarAvailable) return
  const server = state.player.getServer()
  if (!server) return

  const alive = state.alive.size
  const max = Math.max(1, state.expectedWaveSize, alive)
  const wave = Math.max(1, state.currentWave)
  const name = state.currentWave >= state.totalWaves
    ? `\u2620 OLEADA FINAL \u00B7 ${alive} RESTANTES`
    : `\u2620 OLEADA ${wave}/${state.totalWaves} \u00B7 ${alive} RESTANTES`

  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} name ${nexusHordeComponent(name, 'red', false)}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} color red`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} style progress`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} max ${max}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} value ${Math.min(max, alive)}`)
}

function nexusHordeBossbarCountdown(state, text, ticksRemaining, maxTicks) {
  if (!state.bossbarAvailable) return
  const server = state.player.getServer()
  if (!server) return

  const nexusTicksLeft = Math.max(0, Number(ticksRemaining) || 0)
  const nexusBarMaximum = Math.max(1, Number(maxTicks) || 1)
  const nexusSecondsLeft = Math.max(1, Math.ceil(nexusTicksLeft / 20))
  const nexusBarColor = nexusTicksLeft <= 60 ? 'red' : 'yellow'
  const nexusBarName = String(text).replace('{seconds}', String(nexusSecondsLeft))

  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} name ${nexusHordeComponent(nexusBarName, nexusBarColor, false)}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} color ${nexusBarColor}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} style progress`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} max ${nexusBarMaximum}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} value ${Math.min(nexusBarMaximum, nexusTicksLeft)}`)
}

function nexusHordeActionbar(player, text, color) {
  const server = player.getServer()
  const name = nexusHordePlayerName(player)
  nexusHordeRunSilent(server, `title ${name} actionbar ${nexusHordeComponent(text, color, false)}`)
}

function nexusHordePresentFinal(state, text, color, sound) {
  if (state.finalPresented) return
  state.finalPresented = true

  if (state.bossbarAvailable) {
    const server = state.player.getServer()
    nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} name ${nexusHordeComponent(text, color, false)}`)
    nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} color ${color === 'gold' ? 'yellow' : color}`)
    nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} style progress`)
    nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} max 1`)
    nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} value 1`)
    nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} visible true`)
  }

  if (sound) {
    nexusHordeRunSilent(
      state.player.getServer(),
      `playsound ${sound} master ${state.playerName} ~ ~ ~ 1 1`
    )
  }
  nexusHordeActionbar(state.player, text, color)
}

function nexusHordeBossbarSpawnError(state) {
  if (!state.bossbarAvailable) return
  const server = state.player.getServer()
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} name ${nexusHordeComponent('\u2620 ERROR AL INICIAR LA OLEADA', 'red', false)}`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} color red`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} max 1`)
  nexusHordeRunSilent(server, `bossbar set ${state.bossbarId} value 1`)
}

function nexusHordeRemoveEntityFromState(state, entity) {
  const id = nexusHordeEntityId(entity)
  state.alive.delete(id)
}

function nexusHordeRemoveTrackedEntity(entity) {
  nexusHordeStates.forEach(state => {
    const id = nexusHordeEntityId(entity)
    if (state.alive.has(id)) state.alive.delete(id)
  })
}

function nexusHordeCleanTags(state) {
  state.trackedEntities.forEach(entity => {
    try {
      entity.removeTag(state.tag)
    } catch (ignored) {
      // La entidad puede haber sido descargada o eliminada definitivamente.
    }
  })
  state.trackedEntities.clear()
}

function nexusHordeCleanupState(state, server) {
  nexusHordeBossbarRemove(state, server)
  nexusHordeCleanTags(state)
  state.alive.clear()
  state.waveEntities.clear()
  nexusHordeStates.delete(state.playerId)
}

function nexusHordeBeginWave(state, count) {
  state.waveStarted = true
  state.waveHadMob = false
  state.waveClearPresented = false
  state.spawnSettled = false
  state.expectedWaveSize = Math.max(1, Number(count) || 1)
  state.alive.clear()
  state.waveEntities.clear()
  state.settleAt = nexusHordeServerTick + NEXUS_HORDE_SETTLE_TICKS
  state.zeroSince = -1
  state.nextWaveAt = -1
}

function nexusHordeSpawnNextWave(state, amount) {
  if (
    state.manuallySpawning ||
    state.alive.size > 0 ||
    state.completed ||
    state.currentWave >= state.totalWaves ||
    state.endedByDawn
  ) return

  if (nexusHordeIsDay(state.player)) return

  const waveAmount = Math.max(1, Number(amount) || state.savedActualWaveSize)
  state.manuallySpawning = true
  state.preparing = false
  state.waveStarted = false
  state.spawnSettled = false
  state.zeroSince = -1
  state.nextWaveAt = -1

  if (!nexusHordeRunSilent(state.player.getServer(), `hordes spawnWave ${state.playerName} ${waveAmount}`)) {
    state.manuallySpawning = false
    state.spawnFailed = true
    nexusHordeBossbarSpawnError(state)
  }
}

function nexusHordeComplete(state) {
  if (state.completed) return
  state.completed = true
  state.ending = true
  state.nextWaveAt = -1
  state.preparing = false
  state.manuallySpawning = false
  state.cleanupAt = nexusHordeServerTick + NEXUS_HORDE_FINAL_DISPLAY_TICKS
  nexusHordePresentFinal(
    state,
    '\u2620 HAS SOBREVIVIDO A LA HORDA',
    'green',
    'minecraft:ui.toast.challenge_complete'
  )
  nexusHordeRunSilent(state.player.getServer(), `hordes stop ${state.playerName}`)
}

function nexusHordeScheduleNextWave(state) {
  if (
    state.completed ||
    state.endedByDawn ||
    state.currentWave >= state.totalWaves
  ) return false

  if (
    state.nextWaveAt < 0 &&
    nexusHordeServerTick - state.zeroSince >= NEXUS_HORDE_ZERO_CONFIRM_TICKS
  ) {
    state.nextWaveAt = nexusHordeServerTick + NEXUS_HORDE_NEXT_WAVE_DELAY
    return true
  }

  return false
}

function nexusHordeTickStateUnsafe(state) {
  const isDay = nexusHordeIsDay(state.player)

  if (!isDay) state.seenNight = true
  else if (state.seenNight && !state.endedByDawn && !state.completed) {
    state.endedByDawn = true
    state.ending = true
    state.preparing = false
    state.firstWaveAt = -1
    state.nextWaveAt = -1
    state.manuallySpawning = false
    state.cleanupAt = nexusHordeServerTick + NEXUS_HORDE_FINAL_DISPLAY_TICKS
    nexusHordePresentFinal(
      state,
      '\u2600 EL AMANECER ROMPE EL ASEDIO',
      'gold',
      'minecraft:block.beacon.activate'
    )
    nexusHordeRunSilent(state.player.getServer(), `hordes stop ${state.playerName}`)
    return
  }

  if (state.preparing) {
    nexusHordeBossbarCountdown(
      state,
      '\u2620 LA HORDA LLEGA EN {seconds} s',
      Math.max(0, state.firstWaveAt - nexusHordeServerTick),
      NEXUS_HORDE_PREPARATION_TICKS
    )

    if (nexusHordeServerTick >= state.firstWaveAt && !state.manuallySpawning && !state.spawnFailed) {
      state.preparing = false
      state.firstWaveAt = -1
      nexusHordeSpawnNextWave(state, NEXUS_HORDE_INITIAL_WAVE_AMOUNT)
    }
    return
  }

  state.alive.forEach((entity, id) => {
    try {
      if (!entity.isAlive()) state.alive.delete(id)
    } catch (ignored) {
      // Una entidad descargada sigue contando hasta morir o volver a cargarse.
    }
  })

  if (state.waveStarted && !state.spawnSettled && nexusHordeServerTick >= state.settleAt) {
    state.spawnSettled = true
    state.expectedWaveSize = Math.max(1, state.waveEntities.size)
    state.savedActualWaveSize = state.expectedWaveSize
  }

  if (state.waveStarted) nexusHordeBossbarUpdate(state)

  if (!state.waveStarted || !state.spawnSettled || !state.waveHadMob) return

  if (state.alive.size > 0) {
    state.zeroSince = -1
    state.nextWaveAt = -1
    return
  }

  if (state.currentWave >= state.totalWaves) {
    nexusHordeComplete(state)
    return
  }

  if (!state.waveClearPresented) {
    state.waveClearPresented = true
    nexusHordeRunSilent(
      state.player.getServer(),
      `playsound minecraft:entity.experience_orb.pickup master ${state.playerName} ~ ~ ~ 1 1`
    )
    nexusHordeActionbar(state.player, '\u2620 OLEADA SUPERADA', 'green')
  }

  if (state.zeroSince < 0) state.zeroSince = nexusHordeServerTick

  nexusHordeScheduleNextWave(state)

  if (state.nextWaveAt >= 0 && nexusHordeServerTick >= state.nextWaveAt) {
    nexusHordeSpawnNextWave(state, state.savedActualWaveSize)
  } else if (state.nextWaveAt >= 0) {
    nexusHordeBossbarCountdown(
      state,
      '\u2620 SIGUIENTE OLEADA EN {seconds} s',
      state.nextWaveAt - nexusHordeServerTick,
      NEXUS_HORDE_NEXT_WAVE_DELAY
    )
  }
}

function nexusHordeTickState(state) {
  try {
    if (state.ending) {
      if (
        state.cleanupAt >= 0 &&
        nexusHordeServerTick >= state.cleanupAt
      ) {
        nexusHordeCleanupState(state, state.player.getServer())
      }
      return
    }

    nexusHordeTickStateUnsafe(state)
  } catch (error) {
    nexusHordeLogCommandErrorOnce(
      `tick:${state.playerId}:${String(error)}`,
      `Nexus Realms Hordes: fallo al actualizar la horda de ${state.playerName}`,
      error
    )
  }
}

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeStartEvent', event => {
  const player = event.getPlayer()
  const playerId = nexusHordePlayerId(player)
  const oldState = nexusHordeStates.get(playerId)
  if (oldState) nexusHordeCleanupState(oldState, player.getServer())

  const state = nexusHordeCreateState(player)
  nexusHordeStates.set(playerId, state)
  nexusHordeBossbarCreate(state)
  nexusHordeRunSilent(player.getServer(), `playsound minecraft:event.raid.horn master ${state.playerName} ~ ~ ~ 1 1`)
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeStartWaveEvent', event => {
  const player = event.getPlayer()
  const playerId = nexusHordePlayerId(player)
  let state = nexusHordeStates.get(playerId)

  if (!state) {
    state = nexusHordeCreateState(player)
    nexusHordeStates.set(playerId, state)
    nexusHordeBossbarCreate(state)
  }

  state.currentWave = Math.min(state.totalWaves, state.currentWave + 1)
  state.manuallySpawning = false
  state.preparing = false
  state.spawnFailed = false
  nexusHordeBeginWave(state, event.getCount())
  const waveActionbar = state.currentWave >= state.totalWaves
    ? '\u2620 OLEADA FINAL'
    : `\u2620 OLEADA ${state.currentWave}/${state.totalWaves}`
  nexusHordeActionbar(player, waveActionbar, 'red')
  nexusHordeRunSilent(player.getServer(), `playsound minecraft:block.note_block.bell master ${state.playerName} ~ ~ ~ 0.8 1.2`)
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeSpawnEntityEvent', event => {
  const player = event.getPlayer()
  const state = nexusHordeStates.get(nexusHordePlayerId(player))
  if (!state || !state.waveStarted) return

  const entity = event.getEntity()
  const entityId = nexusHordeEntityId(entity)
  entity.addTag(state.tag)
  state.alive.set(entityId, entity)
  state.waveEntities.set(entityId, entity)
  state.trackedEntities.set(entityId, entity)
  state.waveHadMob = true
  state.spawnSettled = false
  state.settleAt = nexusHordeServerTick + NEXUS_HORDE_SETTLE_TICKS
  state.zeroSince = -1
  state.nextWaveAt = -1
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDeathEvent', event => {
  nexusHordeRemoveTrackedEntity(event.getEntity())
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityLeaveLevelEvent', event => {
  const entity = event.getEntity()
  try {
    if (!entity.isAlive()) nexusHordeRemoveTrackedEntity(entity)
  } catch (ignored) {
    // Descargar un chunk no equivale a matar un enemigo de la oleada.
  }
})

ForgeEvents.onEvent('net.smileycorp.hordes.common.event.HordeEndEvent', event => {
  const player = event.getPlayer()
  const state = nexusHordeStates.get(nexusHordePlayerId(player))
  if (!state) return

  if (state.completed) {
    state.modStopped = true
    return
  } else if (state.endedByDawn) {
    state.modStopped = true
    return
  } else if (event.wasCommand()) {
    nexusHordePresentFinal(state, '\u2620 HORDA DETENIDA', 'yellow', null)
  } else {
    nexusHordePresentFinal(state, '\u2620 LA HORDA SE HA DISIPADO', 'yellow', null)
  }

  nexusHordeCleanupState(state, player.getServer())
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedOutEvent', event => {
  const player = event.getEntity()
  const state = nexusHordeStates.get(nexusHordePlayerId(player))
  if (state) nexusHordeCleanupState(state, player.getServer())
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent', event => {
  const player = event.getEntity()
  const stale = nexusHordeCreateState(player)
  nexusHordeBossbarRemove(stale, player.getServer())
})

ForgeEvents.onEvent('net.minecraftforge.event.server.ServerStoppingEvent', event => {
  const server = event.getServer()
  const states = []
  nexusHordeStates.forEach(state => states.push(state))
  states.forEach(state => nexusHordeCleanupState(state, server))
  nexusHordeStates.clear()
})

ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ServerTickEvent', event => {
  if (String(event.phase) !== 'END') return
  nexusHordeServerTick += 1
  if (nexusHordeServerTick % NEXUS_HORDE_UPDATE_INTERVAL !== 0) {
    nexusHordeStates.forEach(state => {
      if (state.preparing && nexusHordeServerTick >= state.firstWaveAt) {
        nexusHordeTickState(state)
      }
    })
    return
  }
  nexusHordeStates.forEach(state => nexusHordeTickState(state))
})
