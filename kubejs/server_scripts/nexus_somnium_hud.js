let $NexusAbyssVariables = null

try {
  $NexusAbyssVariables = Java.loadClass(
    'net.yezon.theabyss.network.TheabyssModVariables'
  )
} catch (error) {
  console.warn(
    '[Nexus Realms] No se pudo cargar la API de The Abyss: ' + error
  )
}

function nexusEnableDynamicSomniumHud(player) {
  if (!$NexusAbyssVariables) {
    return
  }

  try {
    const abyssData = player
      .getCapability(
        $NexusAbyssVariables.PLAYER_VARIABLES_CAPABILITY
      )
      .orElse(null)

    if (!abyssData) {
      console.warn(
        '[Nexus Realms] No se pudo obtener la capability de The Abyss para ' +
        player.username
      )
      return
    }

    // Hace que The Abyss oculte automáticamente la barra
    // cuando no hay Somnium y la muestre cuando sí lo hay.
    abyssData.EmptySomnium = true

    abyssData.syncPlayerVariables(player)

    console.info(
      '[Nexus Realms] HUD dinámico de Somnium activado para ' +
      player.username
    )
  } catch (error) {
    console.warn(
      '[Nexus Realms] Error configurando HUD de Somnium: ' + error
    )
  }
}

PlayerEvents.loggedIn(event => {
  nexusEnableDynamicSomniumHud(event.player)
})