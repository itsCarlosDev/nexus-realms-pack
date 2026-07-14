// Nexus Realms - era global y calendario persistente de hordas.
// The Hordes queda en command-only; este script abre una sola horda global.

const NEXUS_ERA_MIN = 0
const NEXUS_ERA_MAX = 4
const NEXUS_ERA_HORDE_UNLOCK = 1
const NEXUS_ERA_FIRST_HORDE_DAY = 15
const NEXUS_ERA_GRACE_DAYS = 2
const NEXUS_ERA_HORDE_COOLDOWN_DAYS = 10
const NEXUS_ERA_DAY_LENGTH = 24000
const NEXUS_ERA_HORDE_START_TIME = 18000
const NEXUS_ERA_HORDE_START_BUFFER = 1200
const NEXUS_ERA_CHECK_INTERVAL = 20
const NEXUS_ERA_PARTICIPANT_RADIUS_SQR = 128 * 128

const NEXUS_ERA_NAMES = [
  'preparacion',
  'hierro',
  'diamante',
  'industrial/arcana',
  'endgame'
]

let nexusEraServerTicks = 0
let nexusEraLoggedStartFailureDay = -1
const nexusEraLoggedTickErrors = new Set()

function nexusEraWorldDay(server) {
  return Math.floor(Number(server.overworld.getDayTime()) / NEXUS_ERA_DAY_LENGTH)
}

function nexusEraTimeOfDay(server) {
  const dayTime = Number(server.overworld.getDayTime())
  return ((dayTime % NEXUS_ERA_DAY_LENGTH) + NEXUS_ERA_DAY_LENGTH) % NEXUS_ERA_DAY_LENGTH
}

function nexusEraData(server) {
  const data = server.persistentData

  if (!data.contains('nexusEra')) data.putInt('nexusEra', 0)
  if (!data.contains('nexusEraUnlockDay')) data.putInt('nexusEraUnlockDay', -1)
  if (!data.contains('nexusLastHordeCompletedDay')) data.putInt('nexusLastHordeCompletedDay', -1)
  if (!data.contains('nexusNextHordeDay')) data.putInt('nexusNextHordeDay', -1)
  if (!data.contains('nexusLastHordeStartedDay')) data.putInt('nexusLastHordeStartedDay', -1)
  if (!data.contains('nexusHordeActive')) data.putBoolean('nexusHordeActive', false)
  if (!data.contains('nexusHordeAnchorUUID')) data.putString('nexusHordeAnchorUUID', '')
  if (!data.contains('nexusHordeScheduledDay')) data.putInt('nexusHordeScheduledDay', -1)
  if (!data.contains('nexusHordeParticipantCount')) data.putInt('nexusHordeParticipantCount', 0)
  if (!data.contains('nexusHordeStartConfirmed')) data.putBoolean('nexusHordeStartConfirmed', false)

  return data
}

function nexusEraClearGlobalHorde(data) {
  data.putBoolean('nexusHordeActive', false)
  data.putString('nexusHordeAnchorUUID', '')
  data.putInt('nexusHordeScheduledDay', -1)
  data.putInt('nexusHordeParticipantCount', 0)
  data.putBoolean('nexusHordeStartConfirmed', false)
}

function nexusEraReprogramNextMidnight(server, data) {
  nexusEraClearGlobalHorde(data)
  data.putInt(
    'nexusNextHordeDay',
    data.getInt('nexusEra') >= NEXUS_ERA_HORDE_UNLOCK
      ? Math.max(NEXUS_ERA_FIRST_HORDE_DAY, nexusEraWorldDay(server) + 1)
      : -1
  )
}

function nexusEraReply(source, message) {
  const player = source.player
  if (player) player.tell(message)
  else console.info(`Nexus Realms: ${message}`)
}

function nexusEraDescribe(server) {
  const data = nexusEraData(server)
  const era = data.getInt('nexusEra')
  const active = data.getBoolean('nexusHordeActive')
  return [
    `Era global: ${era} (${NEXUS_ERA_NAMES[era] || 'desconocida'})`,
    `Dia actual: ${nexusEraWorldDay(server)}`,
    `Dia de desbloqueo: ${data.getInt('nexusEraUnlockDay')}`,
    `Ultima horda completada: ${data.getInt('nexusLastHordeCompletedDay')}`,
    `Proxima horda valida: ${data.getInt('nexusNextHordeDay')}`,
    `Horda global activa: ${active}`,
    `Anchor: ${active ? data.getString('nexusHordeAnchorUUID') : 'ninguno'}`,
    `Participantes cercanos al inicio: ${data.getInt('nexusHordeParticipantCount')}`
  ]
}

function nexusEraSet(server, newEra) {
  const data = nexusEraData(server)
  const previousEra = data.getInt('nexusEra')
  const currentDay = nexusEraWorldDay(server)

  data.putInt('nexusEra', newEra)

  if (newEra === 0) {
    data.putInt('nexusEraUnlockDay', -1)
    data.putInt('nexusNextHordeDay', -1)
    return
  }

  if (previousEra < NEXUS_ERA_HORDE_UNLOCK && newEra >= NEXUS_ERA_HORDE_UNLOCK) {
    const lastCompleted = data.getInt('nexusLastHordeCompletedDay')
    let nextDay = Math.max(
      NEXUS_ERA_FIRST_HORDE_DAY,
      currentDay + NEXUS_ERA_GRACE_DAYS
    )

    if (lastCompleted >= 0) {
      nextDay = Math.max(nextDay, lastCompleted + NEXUS_ERA_HORDE_COOLDOWN_DAYS)
    }

    data.putInt('nexusEraUnlockDay', currentDay)
    data.putInt('nexusNextHordeDay', nextDay)
  }
}

function nexusEraIsValidAnchor(player) {
  try {
    if (!player.isAlive() || player.isSpectator()) return false
    return String(player.level.dimension().location()) === 'minecraft:overworld'
  } catch (ignored) {
    return false
  }
}

function nexusEraValidPlayers(server) {
  const players = []
  server.players.forEach(player => {
    if (nexusEraIsValidAnchor(player)) players.push(player)
  })
  players.sort((left, right) => String(left.uuid).localeCompare(String(right.uuid)))
  return players
}

function nexusEraParticipantCount(players, anchor) {
  let participants = 0
  players.forEach(player => {
    try {
      if (anchor.distanceToSqr(player) <= NEXUS_ERA_PARTICIPANT_RADIUS_SQR) participants += 1
    } catch (ignored) {
      // La lista se toma una sola vez; un logout simultaneo no invalida el inicio.
    }
  })
  return participants
}

function nexusEraClaimGlobalHorde(data, anchor, currentDay, participantCount) {
  data.putBoolean('nexusHordeActive', true)
  data.putString('nexusHordeAnchorUUID', String(anchor.uuid))
  data.putInt('nexusHordeScheduledDay', currentDay)
  data.putInt('nexusHordeParticipantCount', participantCount)
  data.putBoolean('nexusHordeStartConfirmed', false)
}

function nexusEraRescheduleMissedWindow(data, currentDay, timeOfDay) {
  const nextDay = timeOfDay <= NEXUS_ERA_HORDE_START_TIME + NEXUS_ERA_HORDE_START_BUFFER
    ? currentDay
    : currentDay + 1
  data.putInt('nexusNextHordeDay', nextDay)
  return nextDay
}

function nexusEraStartFailed(server, data, currentDay) {
  nexusEraReprogramNextMidnight(server, data)
  if (nexusEraLoggedStartFailureDay === currentDay) return

  nexusEraLoggedStartFailureDay = currentDay
  console.error(`Nexus Realms: no se pudo iniciar la horda global programada del dia ${currentDay}`)
}

function nexusEraTryStartScheduledHorde(server) {
  const data = nexusEraData(server)
  if (data.getBoolean('nexusHordeActive')) return
  if (data.getInt('nexusEra') < NEXUS_ERA_HORDE_UNLOCK) return

  const currentDay = nexusEraWorldDay(server)
  const timeOfDay = nexusEraTimeOfDay(server)
  let nextDay = data.getInt('nexusNextHordeDay')

  if (nextDay < NEXUS_ERA_FIRST_HORDE_DAY) return

  // Saltos de tiempo y dias sin jugadores no acumulan eventos atrasados.
  if (currentDay > nextDay) {
    nextDay = nexusEraRescheduleMissedWindow(data, currentDay, timeOfDay)
  }

  if (currentDay !== nextDay) return
  if (timeOfDay < NEXUS_ERA_HORDE_START_TIME) return

  if (timeOfDay > NEXUS_ERA_HORDE_START_TIME + NEXUS_ERA_HORDE_START_BUFFER) {
    data.putInt('nexusNextHordeDay', currentDay + 1)
    return
  }

  if (data.getInt('nexusLastHordeStartedDay') === currentDay) return

  const players = nexusEraValidPlayers(server)
  if (players.length === 0) return

  const anchor = players[0]
  const anchorName = String(anchor.getGameProfile().getName())
  const participantCount = nexusEraParticipantCount(players, anchor)
  nexusEraClaimGlobalHorde(data, anchor, currentDay, participantCount)

  const commandResult = server.runCommandSilent(`hordes start ${anchorName} ${currentDay}`)
  if (commandResult <= 0 || !data.getBoolean('nexusHordeStartConfirmed')) {
    nexusEraStartFailed(server, data, currentDay)
    return
  }

  data.putInt('nexusLastHordeStartedDay', currentDay)
  nexusEraLoggedStartFailureDay = -1
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  event.register(
    Commands.literal('nexus_era')
      .then(
        Commands.literal('get')
          .executes(ctx => {
            const server = ctx.source.server
            nexusEraDescribe(server).forEach(line => nexusEraReply(ctx.source, line))
            return 1
          })
      )
      .then(
        Commands.literal('set')
          .requires(source => source.hasPermission(2))
          .then(
            Commands.argument('era', Arguments.INTEGER.create(event))
              .executes(ctx => {
                const era = Number(Arguments.INTEGER.getResult(ctx, 'era'))
                if (era < NEXUS_ERA_MIN || era > NEXUS_ERA_MAX) {
                  nexusEraReply(ctx.source, 'La era debe estar entre 0 y 4.')
                  return 0
                }

                const server = ctx.source.server
                nexusEraSet(server, era)
                nexusEraDescribe(server).forEach(line => nexusEraReply(ctx.source, line))
                return 1
              })
          )
      )
  )
})

ServerEvents.loaded(event => {
  const data = nexusEraData(event.server)
  if (data.getBoolean('nexusHordeActive')) {
    // Una marca activa al cargar solo puede proceder de un cierre abrupto.
    nexusEraReprogramNextMidnight(event.server, data)
  }
})

ServerEvents.tick(event => {
  nexusEraServerTicks += 1
  if (nexusEraServerTicks % NEXUS_ERA_CHECK_INTERVAL !== 0) return

  try {
    nexusEraTryStartScheduledHorde(event.server)
  } catch (error) {
    const errorKey = String(error)
    if (nexusEraLoggedTickErrors.has(errorKey)) return
    nexusEraLoggedTickErrors.add(errorKey)
    console.error('Nexus Realms: fallo al actualizar el calendario global de hordas')
    console.error(error)
  }
})
