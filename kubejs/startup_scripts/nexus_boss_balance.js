// Nexus Realms - Proteccion del Nexo / Boss ballistic balance V8
// Minecraft 1.20.1 / Forge 47.4.10 / KubeJS 6 / Java 17
//
// V8 goals:
// - Keep the proven 24-boss runtime resolver from V7.
// - Resolve multipart/proxy chains recursively, not only one parent.
// - Preserve weapon identity: pistol != AR != shotgun != sniper != launcher.
// - Remove the V7 shared one-second "ordinary" budget that could produce 0 damage.
// - Use per boss + shooter + GunId soft sustained pressure for automatics.
// - Give shotguns a short close-range volley budget instead of a generic DPS nerf.
// - Give snipers / anti-materiel rifles generous per-impact/headshot ceilings.
// - Leave scarce launchers at native damage unless an extreme per-hit ceiling is exceeded.
// - Defer to bosses with proven native DPS management (Ender Guardian / Ignis).
// - Unknown/addon guns use adaptive fallback; never a blind x0.65 nerf.
// - Keep debug tracing off by default; aggregate telemetry remains available.
//
// IMPORTANT:
// - STARTUP script = configuration + temporary Forge diagnostics.
// - EntityEvents.spawned stays in server_scripts.
// - Do NOT Java.loadClass EntityKineticBullet here.

global.NexusBossBalance = {
  version: '2026-08-16-weapon-identity-v8.0.1',

  // Per-bullet trace is intentionally OFF. It produced huge logs in V7.
  // Turn on only for a specific unresolved case.
  trace: false,

  // Once-per-second aggregate balance lines by boss/gun/mode.
  telemetry: true,
  telemetryIntervalTicks: 20,

  // Empty = all protected bosses.
  damageValidationTargets: [],

  resolver: {
    // Void Worm and other multipart/proxy bosses can have deep parent chains.
    maxParentDepth: 32
  },

  entityClassAliases: {
    'org.merlin204.arachne.entity.ArachneEntity':
      'epicfight_arachne:arachne',

    'net.minecraft.world.entity.boss.enderdragon.EnderDragon':
      'minecraft:ender_dragon'
  },

  protectedBosses: {

    'minecraft:ender_dragon': {
      name: 'Ender Dragon',
      preset: 'major',
      family: 'ender_dragon'
    },

    'minecraft:wither': {
      name: 'Wither',
      preset: 'major',
      family: 'wither'
    },

    'minecraft:warden': {
      name: 'Warden',
      preset: 'major',
      family: 'warden'
    },

    'epicfight_arachne:arachne': {
      name: 'Arachne',
      preset: 'normal',
      family: 'arachne'
    },

    'epicfight_leonidas:leonidas': {
      name: 'Leonidas',
      preset: 'normal',
      family: 'leonidas'
    },

    'alexsmobs:void_worm': {
      name: 'Void Worm',
      preset: 'major',
      family: 'void_worm'
    },

    'born_in_chaos_v1:lord_pumpkinhead': {
      name: 'Lord Pumpkinhead',
      preset: 'normal',
      family: 'lord_pumpkinhead'
    },

    'born_in_chaos_v1:lord_pumpkinhead_withouta_horse': {
      name: 'Lord Pumpkinhead',
      preset: 'normal',
      family: 'lord_pumpkinhead'
    },

    'born_in_chaos_v1:lord_the_headless': {
      name: 'Lord Pumpkinhead',
      preset: 'normal',
      family: 'lord_pumpkinhead'
    },

    'born_in_chaos_v1:lord_pumpkinhead_head': {
      name: 'Lord Pumpkinhead',
      preset: 'normal',
      family: 'lord_pumpkinhead'
    },

    'born_in_chaos_v1:sir_pumpkinhead': {
      name: 'Sir Pumpkinhead',
      preset: 'light',
      family: 'sir_pumpkinhead'
    },

    'born_in_chaos_v1:sir_pumpkinhead_without_horse': {
      name: 'Sir Pumpkinhead',
      preset: 'light',
      family: 'sir_pumpkinhead'
    },

    'undead_revamp2:clogger': {
      name: 'The Clogger',
      preset: 'light',
      family: 'clogger'
    },

    'mowziesmobs:ferrous_wroughtnaut': {
      name: 'Ferrous Wroughtnaut',
      preset: 'normal',
      family: 'ferrous_wroughtnaut'
    },

    'block_factorys_bosses:yeti': {
      name: 'Yeti',
      preset: 'normal',
      family: 'yeti'
    },

    'bosses_of_mass_destruction:gauntlet': {
      name: 'Gauntlet',
      preset: 'normal',
      family: 'gauntlet'
    },

    'aquamirae:maze_mother': {
      name: 'Maze Mother',
      preset: 'normal',
      family: 'maze_mother'
    },

    'block_factorys_bosses:kraken': {
      name: 'Kraken',
      preset: 'major',
      family: 'kraken'
    },

    'bosses_of_mass_destruction:obsidilith': {
      name: 'Obsidilith',
      preset: 'major',
      family: 'obsidilith'
    },

    'cataclysm:ender_guardian': {
      name: 'Ender Guardian',
      preset: 'major',
      family: 'ender_guardian',
      nativeDamageManagement: true
    },

    'cataclysm:ignis': {
      name: 'Ignis',
      preset: 'major',
      family: 'ignis',
      nativeDamageManagement: true
    },

    'aether:slider': {
      name: 'Slider',
      preset: 'light',
      family: 'aether_slider'
    },

    'aether:valkyrie_queen': {
      name: 'Valkyrie Queen',
      preset: 'normal',
      family: 'aether_valkyrie_queen'
    },

    'aether:sun_spirit': {
      name: 'Sun Spirit',
      preset: 'normal',
      family: 'aether_sun_spirit'
    }
  },

  disabledBosses: [],

  excludedBosses: [
    'witherstormmod:wither_storm'
  ],

  // V8 automatic guardrails.
  //
  // These are NOT universal weapon DPS caps. Each automatic archetype
  // scales this base differently and has its own soft floor.
  //
  // Example with ~200 HP major boss:
  //   max(200 * 0.08, 18) = 18 base auto DPS
  //
  // That is deliberately much higher than V7's 5 DPS on the Dragon.
  presets: {
    major: {
      autoDpsFraction: 0.08,
      minAutoDps: 18,
      maxAutoDps: 80
    },

    normal: {
      autoDpsFraction: 0.10,
      minAutoDps: 22,
      maxAutoDps: 100
    },

    light: {
      autoDpsFraction: 0.12,
      minAutoDps: 26,
      maxAutoDps: 120
    }
  },

  multiplayer: {
    // Intended TOTAL scaling:
    // 1 shooter = 100%
    // 2 = 125%
    // 3 = 150%
    // 4+ = 175%
    //
    // Buckets are still independent per shooter+GunId; total allowance
    // is divided across currently active shooters so nobody inherits a
    // teammate's empty token bucket.
    extraShooterScale: 0.25,
    maxExtraShooters: 3,
    shooterMemoryTicks: 20
  },

  weaponBalance: {
    // Per-archetype policy.
    //
    // impact:
    //   Only an emergency per-hit/headshot ceiling. Native damage is
    //   otherwise preserved.
    //
    // soft_sustained:
    //   Per boss+shooter+GunId token bucket with STRICT accounting.
    //   V8.0.1 removes the free per-bullet floor that could exceed the
    //   configured DPS target at high RPM.
    //
    // shotgun:
    //   Short volley window so close-range pellets can hit hard.
    //
    // shotgun_sustained:
    //   Shotgun volley + automatic sustained guardrail.
    archetypes: {
      sidearm: {
        mode: 'impact',
        bodyFraction: 0.12,
        bodyMin: 12,
        bodyMax: 45,
        headFraction: 0.16,
        headMin: 16,
        headMax: 60
      },

      revolver: {
        mode: 'impact',
        bodyFraction: 0.16,
        bodyMin: 18,
        bodyMax: 65,
        headFraction: 0.22,
        headMin: 25,
        headMax: 90
      },

      smg: {
        mode: 'soft_sustained',
        dpsScale: 1.15,
        burstSeconds: 1.25,
        legacyFloorRatio: 0.20,
        bodyFraction: 0.10,
        bodyMin: 12,
        bodyMax: 42,
        headFraction: 0.14,
        headMin: 16,
        headMax: 55
      },

      assault_rifle: {
        mode: 'soft_sustained',
        dpsScale: 1.35,
        burstSeconds: 1.35,
        legacyFloorRatio: 0.22,
        bodyFraction: 0.12,
        bodyMin: 14,
        bodyMax: 48,
        headFraction: 0.17,
        headMin: 20,
        headMax: 65
      },

      battle_rifle: {
        mode: 'soft_sustained',
        dpsScale: 1.50,
        burstSeconds: 1.40,
        legacyFloorRatio: 0.28,
        bodyFraction: 0.16,
        bodyMin: 20,
        bodyMax: 70,
        headFraction: 0.22,
        headMin: 28,
        headMax: 95
      },

      lmg: {
        mode: 'soft_sustained',
        dpsScale: 1.20,
        burstSeconds: 1.30,
        legacyFloorRatio: 0.20,
        bodyFraction: 0.12,
        bodyMin: 14,
        bodyMax: 50,
        headFraction: 0.17,
        headMin: 20,
        headMax: 68
      },

      minigun: {
        mode: 'soft_sustained',
        dpsScale: 1.00,
        burstSeconds: 1.00,
        legacyFloorRatio: 0.12,
        bodyFraction: 0.10,
        bodyMin: 10,
        bodyMax: 35,
        headFraction: 0.14,
        headMin: 14,
        headMax: 48
      },

      dmr: {
        mode: 'impact',
        bodyFraction: 0.18,
        bodyMin: 24,
        bodyMax: 85,
        headFraction: 0.27,
        headMin: 36,
        headMax: 125
      },

      sniper: {
        mode: 'impact',
        bodyFraction: 0.24,
        bodyMin: 30,
        bodyMax: 120,
        headFraction: 0.35,
        headMin: 45,
        headMax: 175
      },

      anti_materiel: {
        mode: 'impact',
        bodyFraction: 0.32,
        bodyMin: 45,
        bodyMax: 180,
        headFraction: 0.48,
        headMin: 70,
        headMax: 260
      },

      shotgun_pump: {
        mode: 'shotgun',
        volleyTicks: 5,
        volleyFraction: 0.30,
        volleyMin: 35,
        volleyMax: 170,
        overflowFloorRatio: 0.12
      },

      shotgun_semi: {
        mode: 'shotgun',
        volleyTicks: 5,
        volleyFraction: 0.25,
        volleyMin: 32,
        volleyMax: 150,
        overflowFloorRatio: 0.12
      },

      shotgun_auto: {
        mode: 'shotgun_sustained',
        volleyTicks: 4,
        volleyFraction: 0.22,
        volleyMin: 30,
        volleyMax: 130,
        overflowFloorRatio: 0.12,
        dpsScale: 1.20,
        burstSeconds: 1.20,
        legacyFloorRatio: 0.24
      },

      explosive: {
        // Direct hit only. TaCZ explosion/LivingHurt stays native.
        // Our measured RPG-7 explosion (~28) was already reasonable.
        mode: 'impact',
        bodyFraction: 0.38,
        bodyMin: 45,
        bodyMax: 200,
        headFraction: 0.38,
        headMin: 45,
        headMax: 200
      },

      adaptive: {
        mode: 'adaptive',

        // Unknown high-impact guns are treated like precision weapons.
        precisionRawThreshold: 18,

        // Unknown low-damage multi-hit bursts in the same tick are treated
        // as shotgun pellets.
        shotgunRawThreshold: 6,

        // After 3 closely-spaced hits, unknown repeat-fire guns become
        // generic automatics instead of receiving a blind multiplier.
        automaticIntervalTicks: 4,
        automaticEvidenceHits: 3,

        fallbackImpact: {
          mode: 'impact',
          bodyFraction: 0.20,
          bodyMin: 25,
          bodyMax: 110,
          headFraction: 0.30,
          headMin: 38,
          headMax: 155
        },

        fallbackAutomatic: {
          mode: 'soft_sustained',
          dpsScale: 1.30,
          burstSeconds: 1.30,
          legacyFloorRatio: 0.22,
          bodyFraction: 0.14,
          bodyMin: 16,
          bodyMax: 55,
          headFraction: 0.20,
          headMin: 22,
          headMax: 75
        },

        fallbackShotgun: {
          mode: 'shotgun',
          volleyTicks: 5,
          volleyFraction: 0.28,
          volleyMin: 34,
          volleyMax: 160,
          overflowFloorRatio: 0.12
        },

        fallbackPrecision: {
          mode: 'impact',
          bodyFraction: 0.24,
          bodyMin: 30,
          bodyMax: 120,
          headFraction: 0.35,
          headMin: 45,
          headMax: 175
        }
      }
    },

    groups: {
      sidearm: [
        'tacz:glock_17',
        'tacz:m1911',
        'tacz:m9a4',
        'tacz:p320',
        'tacz:cz75',
        'tacz:hk_mk23',
        'tacz:timeless50',
        'tacz:lonetrail',

        'ronmc:509',
        'ronmc:57usg',
        'ronmc:b92x',
        'ronmc:glock_19',
        'ronmc:m11',
        'ronmc:m1911',
        'ronmc:m45a1',
        'ronmc:mkv',
        'ronmc:p99',
        'ronmc:raider',
        'ronmc:sti_2011',
        'ronmc:train_g19',
        'ronmc:trpl',
        'ronmc:usp45'
      ],

      revolver: [
        'tacz:taurus943',
        'tacz:rhino357',
        'tacz:taurus500',
        'tacz:deagle',
        'tacz:deagle_golden',
        'ronmc:357_magnum'
      ],

      smg: [
        'tacz:hk_mp5a5',
        'tacz:uzi',
        'tacz:ump45',
        'tacz:vector45',
        'tacz:p90',
        'tacz:b93r',

        'ronmc:glock_18c',
        'ronmc:mp5_10mm',
        'ronmc:mp5a2',
        'ronmc:mp5a3',
        'ronmc:mp5sd6',
        'ronmc:mp7',
        'ronmc:mp9',
        'ronmc:mpx',
        'ronmc:p90',
        'ronmc:ump45',
        'ronmc:ump9'
      ],

      assault_rifle: [
        'tacz:ak47',
        'tacz:m16a1',
        'tacz:m16a4',
        'tacz:m4a1',
        'tacz:hk416d',
        'tacz:g36k',
        'tacz:aug',
        'tacz:scar_l',
        'tacz:qbz_191',
        'tacz:qbz_95',
        'tacz:type_81',
        'tacz:spr15hb',

        'ronmc:f90',
        'ronmc:g36c',
        'ronmc:ga416',
        'ronmc:lvar',
        'ronmc:mcx',
        'ronmc:mk16',
        'ronmc:mk18',
        'ronmc:rtwc',
        'ronmc:train_mk18'
      ],

      battle_rifle: [
        'tacz:scar_h',
        'tacz:fn_fal',
        'tacz:hk_g3',

        'ronmc:g3a3',
        'ronmc:m14',
        'ronmc:mk17'
      ],

      lmg: [
        'tacz:rpk',
        'tacz:m249',
        'tacz:fn_evolys'
      ],

      minigun: [
        'tacz:minigun'
      ],

      dmr: [
        'tacz:mk14',
        'tacz:sks_tactical'
      ],

      sniper: [
        'tacz:kar98',
        'tacz:m700',
        'tacz:ai_awp',
        'tacz:springfield1873'
      ],

      anti_materiel: [
        'tacz:m107',
        'tacz:m95'
      ],

      shotgun_pump: [
        'tacz:m870',
        'tacz:db_long',
        'tacz:db_short',

        'ronmc:590m',
        'ronmc:870cqb',
        'ronmc:entryman',
        'ronmc:shorty',
        'ronmc:supernova'
      ],

      shotgun_semi: [
        'tacz:spas_12',
        'tacz:m1014',

        'ronmc:b1301',
        'ronmc:m1014',
        'ronmc:beanbag_shot'
      ],

      shotgun_auto: [
        'tacz:aa12'
      ],

      explosive: [
        'tacz:rpg7',
        'tacz:m320',
        'ronmc:m32a1'
      ]
    }
  }
}

console.info(
  '[Nexus Boss Balance] Startup V8 cargado; weapon identity + adaptive fallback.'
)


// ============================================================================
// TEMPORARY FORGE DIAGNOSTICS
// ============================================================================
// These listeners stay dormant while trace=false.
// They never modify damage.

var NexusBossTraceRegistries = Java.loadClass(
  'net.minecraft.core.registries.BuiltInRegistries'
)

function nexusBossStartupTraceEntityId(entity) {
  if (!entity) return 'null'

  try {
    return String(
      NexusBossTraceRegistries.ENTITY_TYPE.getKey(
        entity.getType()
      )
    )
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossStartupTraceClass(entity) {
  if (!entity) return 'null'

  try {
    return String(entity.getClass().getName())
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossStartupTraceUuid(entity) {
  if (!entity) return 'null'

  try {
    return String(entity.getUUID())
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossStartupTraceName(entity) {
  if (!entity) return 'null'

  try {
    return String(entity.getName().getString())
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossStartupTraceParent(entity) {
  if (!entity) return null

  try {
    return entity.getParent()
  } catch (ignored) {
    return null
  }
}

function nexusBossStartupTraceGunId(entity) {
  if (!entity) return 'unavailable'

  try {
    return String(entity.getGunId())
  } catch (ignored) {
    return 'unavailable'
  }
}

function nexusBossStartupTraceCanonicalId(entity) {
  if (!entity) return ''

  var config = global.NexusBossBalance
  if (!config) return ''

  var className = nexusBossStartupTraceClass(entity)
  var aliases = config.entityClassAliases || {}
  var alias = aliases[className]

  if (alias) return String(alias)

  return nexusBossStartupTraceEntityId(entity)
}

function nexusBossStartupTraceIsProtected(entity) {
  if (!entity) return false

  var config = global.NexusBossBalance
  if (!config || !config.protectedBosses) return false

  var current = entity
  var visited = new Set()
  var maxDepth = Number(
    (config.resolver || {}).maxParentDepth || 32
  )

  for (var depth = 0; depth <= maxDepth; depth++) {
    if (!current) return false

    var uuid = nexusBossStartupTraceUuid(current)
    if (uuid && uuid !== 'unknown' && uuid !== 'null') {
      if (visited.has(uuid)) return false
      visited.add(uuid)
    }

    var id = nexusBossStartupTraceCanonicalId(current)
    if (config.protectedBosses[id]) return true

    current = nexusBossStartupTraceParent(current)
  }

  return false
}

ForgeEvents.onEvent(
  'com.tacz.guns.api.event.common.EntityHurtByGunEvent$Pre',
  event => {
    var config = global.NexusBossBalance
    if (!config || !config.trace) return

    var target = null
    var attacker = null
    var gunId = 'unknown'
    var base = 'unknown'
    var headshot = 'unknown'
    var headshotMultiplier = 'unknown'

    try { target = event.getHurtEntity() } catch (ignored) {}
    try { attacker = event.getAttacker() } catch (ignored) {}
    try { gunId = String(event.getGunId()) } catch (ignored) {}
    try { base = String(event.getBaseAmount()) } catch (ignored) {}
    try { headshot = String(event.isHeadShot()) } catch (ignored) {}
    try {
      headshotMultiplier = String(
        event.getHeadshotMultiplier()
      )
    } catch (ignored) {}

    if (!nexusBossStartupTraceIsProtected(target)) return

    console.info(
      '[TACZ FORGE TRACE] ' +
      'targetId=' +
      nexusBossStartupTraceEntityId(target) +
      ' targetClass=' +
      nexusBossStartupTraceClass(target) +
      ' gunId=' +
      gunId +
      ' base=' +
      base +
      ' headshot=' +
      headshot +
      ' headshotMultiplier=' +
      headshotMultiplier +
      ' attacker=' +
      nexusBossStartupTraceName(attacker)
    )
  }
)

ForgeEvents.onEvent(
  'net.minecraftforge.event.entity.living.LivingHurtEvent',
  event => {
    var config = global.NexusBossBalance
    if (!config || !config.trace) return

    var target = null
    var source = null
    var attacker = null
    var directEntity = null
    var amount = 'unknown'
    var sourceMsgId = 'unknown'

    try { target = event.getEntity() } catch (ignored) {}
    try { source = event.getSource() } catch (ignored) {}
    try { amount = String(event.getAmount()) } catch (ignored) {}

    if (!nexusBossStartupTraceIsProtected(target)) return

    if (source) {
      try { attacker = source.getEntity() } catch (ignored) {}
      try { directEntity = source.getDirectEntity() } catch (ignored) {}
      try { sourceMsgId = String(source.getMsgId()) } catch (ignored) {}
    }

    console.info(
      '[NEXUS HURT TRACE] ' +
      'targetId=' +
      nexusBossStartupTraceEntityId(target) +
      ' amount=' +
      amount +
      ' sourceMsgId=' +
      sourceMsgId +
      ' directGunId=' +
      nexusBossStartupTraceGunId(directEntity) +
      ' attacker=' +
      nexusBossStartupTraceName(attacker)
    )
  }
)

console.info(
  '[Nexus Boss Balance] Forge diagnostics V8 registrados; activos solo si trace=true.'
)
