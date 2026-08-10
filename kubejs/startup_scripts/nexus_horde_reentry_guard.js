// Nexus Realms - exclusion global de reentrada para el comando nativo de The Hordes.
// No controla el ciclo de la Horda: impide iniciar una segunda Horda mientras
// el unico evento global de Nexus Realms siga activo.
//
// Comandos nativos contemplados por The Hordes 1.20.1:
// - /hordes start <duracion> [tabla]
// - /hordes start <jugador|selector> <duracion> [tabla]
//
// Cualquier intento posterior se cancela por completo para evitar eventos
// paralelos o una ejecucion parcial mediante selectores.

var nexusHordeReentryActivePlayers = new Set()
var nexusHordeReentryEventOwners = new Map()
var nexusHordeReentryLoggedErrors = new Set()

function nexusHordeReentryLogErrorOnce(key, message, error) {
  if (nexusHordeReentryLoggedErrors.has(key)) return

  nexusHordeReentryLoggedErrors.add(key)
  console.error(message)

  if (error) {
    console.error(error)
  }
}

function nexusHordeReentryPlayerId(player) {
  return String(player.uuid)
}

function nexusHordeReentryPlayerName(player) {
  try {
    return String(
      player.getGameProfile().getName()
    )
  } catch (ignored) {
    return nexusHordeReentryPlayerId(player)
  }
}

function nexusHordeReentrySameHorde(left, right) {
  if (left === right) return true
  if (!left || !right) return false

  try {
    return left.equals(right)
  } catch (ignored) {
    return false
  }
}

function nexusHordeReentryOwnerForHorde(horde) {
  var ownerId =
    nexusHordeReentryEventOwners.get(horde)

  if (ownerId) return ownerId

  nexusHordeReentryEventOwners.forEach(
    (candidateOwnerId, candidateHorde) => {
      if (
        !ownerId &&
        nexusHordeReentrySameHorde(
          candidateHorde,
          horde
        )
      ) {
        ownerId = candidateOwnerId
      }
    }
  )

  return ownerId
}

function nexusHordeReentryCommandText(event) {
  try {
    return String(
      event
        .getParseResults()
        .getReader()
        .getString()
    )
      .trim()
      .replace(/^\/+/, '')
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `command-text:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo leer el comando ejecutado.',
      error
    )

    return ''
  }
}

function nexusHordeReentryIsStartCommand(command) {
  return /^(?:hordes:)?hordes\s+start(?:\s|$)/i.test(
    command
  )
}

function nexusHordeReentryCollectionToArray(
  collection
) {
  var result = []

  if (!collection) return result

  try {
    var iterator = collection.iterator()

    while (iterator.hasNext()) {
      result.push(iterator.next())
    }
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `collection:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo convertir la seleccion de jugadores.',
      error
    )
  }

  return result
}

function nexusHordeReentryCommandSource(event) {
  try {
    return event
      .getParseResults()
      .getContext()
      .getSource()
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `source:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo obtener el origen del comando.',
      error
    )

    return null
  }
}

function nexusHordeReentryParsedPlayerSelector(
  event
) {
  try {
    var context = event
      .getParseResults()
      .getContext()

    var argumentsMap = context.getArguments()

    if (!argumentsMap) return null

    var parsedPlayer =
      argumentsMap.get('player')

    if (!parsedPlayer) return null

    return parsedPlayer.getResult()
  } catch (error) {
    nexusHordeReentryLogErrorOnce(
      `selector:${String(error)}`,
      'Nexus Horde Reentry Guard: no se pudo leer el selector del comando.',
      error
    )

    return null
  }
}

function nexusHordeReentryResolveTargets(event) {
  var source =
    nexusHordeReentryCommandSource(event)

  if (!source) return []

  var selector =
    nexusHordeReentryParsedPlayerSelector(
      event
    )

  if (selector) {
    try {
      return nexusHordeReentryCollectionToArray(
        selector.findPlayers(source)
      )
    } catch (error) {
      nexusHordeReentryLogErrorOnce(
        `selector-resolve:${String(error)}`,
        'Nexus Horde Reentry Guard: no se pudo resolver el jugador o selector.',
        error
      )

      return []
    }
  }

  // La variante sin argumento "player" solo funciona
  // cuando el origen del comando es un jugador.
  try {
    return [source.getPlayerOrException()]
  } catch (ignored) {
    return []
  }
}

function nexusHordeReentryActiveTargets(
  players
) {
  var activePlayers = []

  players.forEach(player => {
    var playerId =
      nexusHordeReentryPlayerId(player)

    if (
      nexusHordeReentryActivePlayers.has(
        playerId
      )
    ) {
      activePlayers.push(player)
    }
  })

  return activePlayers
}

function nexusHordeReentryNotifyRejected(
  event,
  players
) {
  var names = players
    .map(player =>
      nexusHordeReentryPlayerName(player)
    )
    .join(', ')

  var message = players.length === 1
    ? `${names} ya tiene una Horda activa.`
    : `Estos jugadores ya tienen una Horda activa: ${names}.`

  console.warn(
    `[Nexus Horde] Inicio rechazado: ${message}`
  )

  // Intenta mostrar también el error al ejecutor.
  // Si Text no está disponible en este contexto,
  // el bloqueo sigue funcionando y queda el aviso en log.
  try {
    var source =
      nexusHordeReentryCommandSource(event)

    if (
      source &&
      typeof Text !== 'undefined' &&
      Text &&
      typeof Text.of === 'function'
    ) {
      source.sendFailure(
        Text.of(message)
      )
    }
  } catch (ignored) {
    // El fallo visual no afecta al bloqueo funcional.
  }
}

ForgeEvents.onEvent(
  'net.minecraftforge.event.CommandEvent',
  event => {
    var reentryCommand =
      nexusHordeReentryCommandText(event)

    if (
      !nexusHordeReentryIsStartCommand(
        reentryCommand
      )
    ) {
      return
    }

    if (
      nexusHordeReentryActivePlayers.size ===
      0
    ) {
      return
    }

    // Nexus solo admite una Horda nativa activa. El primer inicio
    // pasa con el conjunto vacio; cualquier reentrada posterior se bloquea.
    event.setCanceled(true)

    console.warn(
      '[Nexus Horde] Inicio rechazado: ya existe una Horda activa.'
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeStartEvent',
  event => {
    var reentryPlayer =
      event.getPlayer()
    var reentryPlayerId =
      nexusHordeReentryPlayerId(
        reentryPlayer
      )

    nexusHordeReentryActivePlayers.add(
      reentryPlayerId
    )

    nexusHordeReentryEventOwners.set(
      event.getHorde(),
      reentryPlayerId
    )
  }
)

ForgeEvents.onEvent(
  'net.smileycorp.hordes.common.event.HordeEndEvent',
  event => {
    var reentryHorde = event.getHorde()
    var reentryOwnerId =
      nexusHordeReentryOwnerForHorde(
        reentryHorde
      )

    if (!reentryOwnerId) {
      reentryOwnerId =
        nexusHordeReentryPlayerId(
          event.getPlayer()
        )
    }

    nexusHordeReentryActivePlayers.delete(
      reentryOwnerId
    )

    var reentryFinishedEvents = []

    nexusHordeReentryEventOwners.forEach(
      (ownerId, horde) => {
        if (
          ownerId === reentryOwnerId ||
          nexusHordeReentrySameHorde(
            horde,
            reentryHorde
          )
        ) {
          reentryFinishedEvents.push(horde)
        }
      }
    )

    reentryFinishedEvents.forEach(horde => {
      nexusHordeReentryEventOwners.delete(horde)
    })
  }
)

// No se elimina al jugador cuando se desconecta.
// nexus_horde_director.js pausa su Horda, por lo que
// debe seguir considerándose activa hasta HordeEndEvent.

ForgeEvents.onEvent(
  'net.minecraftforge.event.server.ServerStoppingEvent',
  event => {
    nexusHordeReentryActivePlayers.clear()
    nexusHordeReentryEventOwners.clear()
    nexusHordeReentryLoggedErrors.clear()
  }
)

if (typeof global !== 'undefined') {
  global.NexusHordeReentryGuard = {
    releasePlayer: player => {
      var reentryPlayerId =
        nexusHordeReentryPlayerId(player)

      nexusHordeReentryActivePlayers.delete(
        reentryPlayerId
      )

      var reentryReleasedEvents = []

      nexusHordeReentryEventOwners.forEach(
        (ownerId, horde) => {
          if (ownerId === reentryPlayerId) {
            reentryReleasedEvents.push(horde)
          }
        }
      )

      reentryReleasedEvents.forEach(horde => {
        nexusHordeReentryEventOwners.delete(horde)
      })
    }
  }
}
