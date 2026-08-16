// Nexus Realms - Aviso de Proteccion del Nexo V8.0.1 (chat + campanita)
//
// Server script: detecta el spawn de bosses protegidos y deja UNICAMENTE
// un aviso discreto en el chat global + una campanita corta.
// No usa title, subtitle, actionbar ni particulas.
//
// La configuracion de bosses vive en:
// kubejs/startup_scripts/nexus_boss_balance.js
//
// El limiter TaCZ real vive en:
// kubejs/server_scripts/nexus_boss_damage.js
//
// Este archivo puede recargarse con /reload.

// Cooldown POR FAMILIA de boss.
// Evita que bosses multipartes, cambios de fase o respawns internos
// (por ejemplo Void Worm) llenen el chat con el mismo aviso.
// 10 minutos = 600000 ms.
const NEXUS_BOSS_ANNOUNCE_FAMILY_COOLDOWN_MS = 10 * 60 * 1000

const nexusBossAnnounceSeenEntities = new Set()
const nexusBossAnnounceLastFamily = new Map()

const NEXUS_BOSS_ANNOUNCE_PROFILES = {
  'minecraft:ender_dragon': {
    family: 'ender_dragon',
    displayName: 'Ender Dragon'
  },

  'minecraft:wither': {
    family: 'wither',
    displayName: 'Wither'
  },

  'minecraft:warden': {
    family: 'warden',
    displayName: 'Warden'
  },

  'epicfight_arachne:arachne': {
    family: 'arachne',
    displayName: 'Arachne'
  },

  'epicfight_leonidas:leonidas': {
    family: 'leonidas',
    displayName: 'Leonidas'
  },

  'alexsmobs:void_worm': {
    family: 'void_worm',
    displayName: 'Void Worm'
  },

  'born_in_chaos_v1:lord_pumpkinhead': {
    family: 'lord_pumpkinhead',
    displayName: 'Lord Pumpkinhead'
  },

  'born_in_chaos_v1:lord_pumpkinhead_withouta_horse': {
    family: 'lord_pumpkinhead',
    displayName: 'Lord Pumpkinhead'
  },

  'born_in_chaos_v1:lord_the_headless': {
    family: 'lord_pumpkinhead',
    displayName: 'Lord Pumpkinhead'
  },

  'born_in_chaos_v1:lord_pumpkinhead_head': {
    family: 'lord_pumpkinhead',
    displayName: 'Lord Pumpkinhead'
  },

  'born_in_chaos_v1:sir_pumpkinhead': {
    family: 'sir_pumpkinhead',
    displayName: 'Sir Pumpkinhead'
  },

  'born_in_chaos_v1:sir_pumpkinhead_without_horse': {
    family: 'sir_pumpkinhead',
    displayName: 'Sir Pumpkinhead'
  },

  'undead_revamp2:clogger': {
    family: 'clogger',
    displayName: 'The Clogger'
  },

  'mowziesmobs:ferrous_wroughtnaut': {
    family: 'ferrous_wroughtnaut',
    displayName: 'Ferrous Wroughtnaut'
  },

  'block_factorys_bosses:yeti': {
    family: 'yeti',
    displayName: 'Yeti'
  },

  'bosses_of_mass_destruction:gauntlet': {
    family: 'gauntlet',
    displayName: 'Gauntlet'
  },

  'aquamirae:maze_mother': {
    family: 'maze_mother',
    displayName: 'Maze Mother'
  },

  'block_factorys_bosses:kraken': {
    family: 'kraken',
    displayName: 'Kraken'
  },

  'bosses_of_mass_destruction:obsidilith': {
    family: 'obsidilith',
    displayName: 'Obsidilith'
  },

  'cataclysm:ender_guardian': {
    family: 'ender_guardian',
    displayName: 'Ender Guardian'
  },

  'cataclysm:ignis': {
    family: 'ignis',
    displayName: 'Ignis'
  },

  'aether:slider': {
    family: 'aether_slider',
    displayName: 'Slider'
  },

  'aether:valkyrie_queen': {
    family: 'aether_valkyrie_queen',
    displayName: 'Valkyrie Queen'
  },

  'aether:sun_spirit': {
    family: 'aether_sun_spirit',
    displayName: 'Sun Spirit'
  }
}

function nexusBossAnnouncementCommand(server, command) {
  try {
    server.runCommandSilent(command)
    return true
  } catch (error) {
    console.error(
      '[Nexus Boss Announcement] Error ejecutando comando: ' +
      command
    )
    console.error(error)
    return false
  }
}

function nexusBossAnnouncementPlayChime(server) {
  // One subtle bell/chime per real announcement.
  // Execute at each player so distance from the command source cannot mute it.
  nexusBossAnnouncementCommand(
    server,
    'execute as @a at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 0.45 1.30'
  )
}

function nexusBossAnnouncementShowChat(server, profile) {
  nexusBossAnnouncementCommand(
    server,
    'tellraw @a ' +
      JSON.stringify([
        {
          text: 'EL NEXO INTERVIENE ',
          color: 'dark_purple',
          bold: true,
          italic: false
        },
        {
          text:
            'Una magia ancestral debilita el armamento balístico contra ' +
            profile.displayName +
            '.',
          color: 'light_purple',
          bold: false,
          italic: false
        }
      ])
  )

  nexusBossAnnouncementPlayChime(server)

  console.info(
    '[Nexus Boss Announcement V8.0.1] ' +
      'Chat + campanita enviados para ' +
      profile.displayName +
      '.'
  )
}

function nexusBossAnnouncementEntityUuid(entity) {
  if (!entity) return ''

  try {
    return String(entity.getUUID())
  } catch (ignored) {
  }

  try {
    return String(entity.uuid)
  } catch (ignored) {
    return ''
  }
}

function nexusBossAnnouncementOnSpawn(event, entityId) {
  var profile = NEXUS_BOSS_ANNOUNCE_PROFILES[entityId]

  if (!profile) return

  var entity = event.entity

  if (!entity) return

  var uuid = nexusBossAnnouncementEntityUuid(entity)

  // La misma entidad nunca debe anunciarse dos veces durante la vida
  // de este script, aunque otro evento de spawn vuelva a verla.
  if (
    uuid &&
    nexusBossAnnounceSeenEntities.has(uuid)
  ) {
    return
  }

  if (uuid) {
    nexusBossAnnounceSeenEntities.add(uuid)
  }

  var server = null

  try {
    server = entity.getServer()
  } catch (error) {
    console.error(
      '[Nexus Boss Announcement] ' +
        'No se pudo obtener el servidor para ' +
        entityId +
        '.'
    )
    console.error(error)
    return
  }

  if (!server) return

  var now = Date.now()
  var previous = Number(
    nexusBossAnnounceLastFamily.get(profile.family) || 0
  )

  // Anti-spam por familia: multipartes, fases y respawns internos no
  // vuelven a llenar el chat durante diez minutos.
  if (
    previous > 0 &&
    now - previous <
      NEXUS_BOSS_ANNOUNCE_FAMILY_COOLDOWN_MS
  ) {
    console.info(
      '[Nexus Boss Announcement] ' +
        'Spawn/fase adicional de ' +
        profile.displayName +
        '; chat omitido por cooldown de familia.'
    )
    return
  }

  nexusBossAnnounceLastFamily.set(
    profile.family,
    now
  )

  console.info(
    '[Nexus Boss Announcement] ' +
      'Spawn protegido detectado: ' +
      entityId +
      ' (' +
      uuid +
      ').'
  )

  nexusBossAnnouncementShowChat(server, profile)
}

// IMPORTANTE: EntityEvents.spawned pertenece a SERVER scripts.
Object.keys(NEXUS_BOSS_ANNOUNCE_PROFILES).forEach(entityId => {
  EntityEvents.spawned(
    entityId,
    event => {
      nexusBossAnnouncementOnSpawn(
        event,
        entityId
      )
    }
  )
})

console.info(
  '[Nexus Boss Announcement V8.0.1] chat + campanita cargados; cooldown por familia=10 min.'
)
