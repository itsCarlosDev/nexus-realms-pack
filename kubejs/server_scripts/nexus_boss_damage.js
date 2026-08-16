// Nexus Realms - TaCZ boss damage balance V8.0.1
// Minecraft 1.20.1 / Forge 47.4.10 / KubeJS 6 / TaCZ 1.1.8-hotfix
//
// DESIGN:
// - Boss resolver is runtime-safe and recursive.
// - Automatic pressure is soft, per boss+shooter+GunId.
// - No V7 shared "ordinary" one-second starvation budget.
// - Shotguns use short volley budgets.
// - Precision weapons use generous impact/headshot ceilings.
// - Explosives keep native explosion behaviour.
// - Ender Guardian / Ignis defer to their native damage-management logic.
// - Unknown/addon guns adapt from observed raw damage + cadence.
// - Normal mobs are untouched.

var nexusBossDamageTick = 0

var nexusBossRuntimeBossIdsByUuid = new Map()
var nexusBossSoftStates = new Map()
var nexusBossShotgunStates = new Map()
var nexusBossShooterGroups = new Map()
var nexusBossAdaptiveStates = new Map()
var nexusBossTelemetryStates = new Map()

var NEXUS_BOSS_LOCAL_CLASS_ALIASES = {
  'org.merlin204.arachne.entity.ArachneEntity':
    'epicfight_arachne:arachne',

  'net.minecraft.world.entity.boss.enderdragon.EnderDragon':
    'minecraft:ender_dragon'
}

var nexusBossRegistryClass = null
var nexusBossResourceLocationClass = null

try {
  nexusBossRegistryClass = Java.loadClass(
    'net.minecraft.core.registries.BuiltInRegistries'
  )

  nexusBossResourceLocationClass = Java.loadClass(
    'net.minecraft.resources.ResourceLocation'
  )
} catch (error) {
  console.error(
    '[Nexus Boss Damage V8.0.1] No se pudo cargar BuiltInRegistries/ResourceLocation.'
  )
  console.error(error)
}

function nexusBossDamageConfig() {
  if (
    typeof global === 'undefined' ||
    !global.NexusBossBalance
  ) {
    return null
  }

  return global.NexusBossBalance
}

function nexusBossTraceEnabled() {
  var config = nexusBossDamageConfig()
  return !!(config && config.trace)
}

function nexusBossTelemetryEnabled() {
  var config = nexusBossDamageConfig()
  return !!(config && config.telemetry)
}

function nexusBossClamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function nexusBossEntityRegistryId(entity) {
  if (!entity || !nexusBossRegistryClass) {
    return 'null'
  }

  try {
    return String(
      nexusBossRegistryClass.ENTITY_TYPE.getKey(
        entity.getType()
      )
    )
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossEntityClass(entity) {
  if (!entity) return 'null'

  try {
    return String(entity.getClass().getName())
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossEntityUuid(entity) {
  if (!entity) return 'null'

  try {
    return String(entity.getUUID())
  } catch (ignored) {
    try {
      return String(entity.uuid)
    } catch (ignoredAgain) {
      return 'unknown'
    }
  }
}

function nexusBossEntityName(entity) {
  if (!entity) return 'null'

  try {
    return String(entity.getName().getString())
  } catch (ignored) {
    return 'unknown'
  }
}

function nexusBossEntityParent(entity) {
  if (!entity) return null

  try {
    return entity.getParent()
  } catch (ignored) {
    return null
  }
}

function nexusBossRuntimeBossIdForEntity(entity) {
  if (!entity) return ''

  var uuid = nexusBossEntityUuid(entity)

  if (
    !uuid ||
    uuid === 'null' ||
    uuid === 'unknown'
  ) {
    return ''
  }

  var id = nexusBossRuntimeBossIdsByUuid.get(uuid)
  return id ? String(id) : ''
}

function nexusBossLocalClassAliasForEntity(entity) {
  if (!entity) return ''

  var className = nexusBossEntityClass(entity)
  var alias = NEXUS_BOSS_LOCAL_CLASS_ALIASES[className]

  return alias ? String(alias) : ''
}

function nexusBossConfigClassAliasForEntity(entity) {
  if (!entity) return ''

  var config = nexusBossDamageConfig()

  if (!config || !config.entityClassAliases) {
    return ''
  }

  var className = nexusBossEntityClass(entity)
  var alias = config.entityClassAliases[className]

  return alias ? String(alias) : ''
}

function nexusBossCanonicalIdForEntity(entity) {
  if (!entity) return ''

  var runtimeId = nexusBossRuntimeBossIdForEntity(entity)
  if (runtimeId) return runtimeId

  var localAlias = nexusBossLocalClassAliasForEntity(entity)
  if (localAlias) return localAlias

  var configAlias = nexusBossConfigClassAliasForEntity(entity)
  if (configAlias) return configAlias

  return nexusBossEntityRegistryId(entity)
}

function nexusBossResolutionSource(entity, canonicalId, registryId) {
  if (!entity) return 'none'

  var runtimeId = nexusBossRuntimeBossIdForEntity(entity)
  if (runtimeId && runtimeId === canonicalId) {
    return 'runtime-uuid'
  }

  var localAlias = nexusBossLocalClassAliasForEntity(entity)
  if (localAlias && localAlias === canonicalId) {
    return 'local-class'
  }

  var configAlias = nexusBossConfigClassAliasForEntity(entity)
  if (configAlias && configAlias === canonicalId) {
    return 'config-class'
  }

  if (canonicalId === registryId) {
    return 'registry'
  }

  return 'unknown'
}

function nexusBossProfileForId(entityId) {
  var config = nexusBossDamageConfig()

  if (
    !config ||
    !config.protectedBosses
  ) {
    return null
  }

  return config.protectedBosses[entityId] || null
}

function nexusBossResolveTarget(entity) {
  if (!entity) return null

  var config = nexusBossDamageConfig()
  var maxDepth = 32

  if (config && config.resolver) {
    maxDepth = Number(
      config.resolver.maxParentDepth || 32
    )
  }

  maxDepth = nexusBossClamp(maxDepth, 1, 64)

  var current = entity
  var visited = new Set()

  for (var depth = 0; depth <= maxDepth; depth++) {
    if (!current) break

    var currentUuid = nexusBossEntityUuid(current)

    if (
      currentUuid &&
      currentUuid !== 'null' &&
      currentUuid !== 'unknown'
    ) {
      if (visited.has(currentUuid)) {
        break
      }

      visited.add(currentUuid)
    }

    var registryId = nexusBossEntityRegistryId(current)
    var canonicalId = nexusBossCanonicalIdForEntity(current)
    var profile = nexusBossProfileForId(canonicalId)

    if (profile) {
      var source = nexusBossResolutionSource(
        current,
        canonicalId,
        registryId
      )

      return {
        entity: current,
        id: canonicalId,
        registryId: registryId,
        runtimeClass: nexusBossEntityClass(current),
        profile: profile,
        wasPart: depth > 0,
        parentDepth: depth,
        wasClassAlias:
          source === 'local-class' ||
          source === 'config-class',
        resolution:
          depth > 0
            ? 'parent[' + depth + ']-' + source
            : source,
        originalEntity: entity
      }
    }

    var parent = nexusBossEntityParent(current)

    if (!parent || parent === current) {
      break
    }

    current = parent
  }

  return null
}

function nexusBossDamageValidationEnabledFor(targetId) {
  var config = nexusBossDamageConfig()
  if (!config) return false

  var targets = config.damageValidationTargets

  if (!Array.isArray(targets) || targets.length === 0) {
    return true
  }

  return targets.includes(targetId)
}

function nexusBossPreset(profile) {
  var config = nexusBossDamageConfig()

  if (
    !config ||
    !config.presets ||
    !profile
  ) {
    return null
  }

  return config.presets[profile.preset] || null
}

function nexusBossMaxHealth(entity) {
  try {
    var value = Number(entity.getMaxHealth())

    if (Number.isFinite(value)) {
      return Math.max(1, value)
    }
  } catch (ignored) {
  }

  return 1
}

function nexusBossBaseAmount(event) {
  try {
    var amount = Number(event.getBaseAmount())

    if (!Number.isFinite(amount)) {
      return 0
    }

    return Math.max(0, amount)
  } catch (ignored) {
    return 0
  }
}

function nexusBossIsHeadshot(event) {
  try {
    return !!event.isHeadShot()
  } catch (ignored) {
    return false
  }
}

function nexusBossHeadshotMultiplier(event) {
  try {
    if (!event.isHeadShot()) return 1.0

    var multiplier = Number(
      event.getHeadshotMultiplier()
    )

    if (
      !Number.isFinite(multiplier) ||
      multiplier <= 0
    ) {
      return 1.0
    }

    return multiplier
  } catch (ignored) {
    return 1.0
  }
}

function nexusBossFinalAmountBeforeArmorSplit(event) {
  return (
    nexusBossBaseAmount(event) *
    nexusBossHeadshotMultiplier(event)
  )
}

function nexusBossSetFinalAmount(event, finalAmount) {
  var safeFinal = Math.max(
    0,
    Number(finalAmount) || 0
  )

  var headshotMultiplier =
    nexusBossHeadshotMultiplier(event)

  var newBase =
    safeFinal / headshotMultiplier

  event.setBaseAmount(newBase)
}

function nexusBossAttackerId(attacker) {
  if (!attacker) return 'unknown'
  return nexusBossEntityUuid(attacker)
}

function nexusBossBossKey(resolvedTarget) {
  return nexusBossEntityUuid(resolvedTarget.entity)
}

function nexusBossWeaponKey(resolvedTarget, attacker, gunId) {
  return (
    nexusBossBossKey(resolvedTarget) +
    '|' +
    nexusBossAttackerId(attacker) +
    '|' +
    gunId
  )
}

function nexusBossGroupKey(resolvedTarget) {
  return nexusBossBossKey(resolvedTarget)
}

function nexusBossArrayContains(array, value) {
  return Array.isArray(array) && array.includes(value)
}

function nexusBossWeaponConfig() {
  var config = nexusBossDamageConfig()

  if (!config || !config.weaponBalance) {
    return null
  }

  return config.weaponBalance
}

function nexusBossExplicitArchetype(gunId) {
  var weapon = nexusBossWeaponConfig()

  if (!weapon || !weapon.groups) {
    return ''
  }

  var names = Object.keys(weapon.groups)

  for (var i = 0; i < names.length; i++) {
    var name = names[i]

    if (
      nexusBossArrayContains(
        weapon.groups[name],
        gunId
      )
    ) {
      return name
    }
  }

  return ''
}

function nexusBossArchetypePolicy(name) {
  var weapon = nexusBossWeaponConfig()

  if (
    !weapon ||
    !weapon.archetypes
  ) {
    return null
  }

  return weapon.archetypes[name] || null
}

function nexusBossAdaptiveState(resolvedTarget, attacker, gunId) {
  var key = nexusBossWeaponKey(
    resolvedTarget,
    attacker,
    gunId
  )

  var state = nexusBossAdaptiveStates.get(key)

  if (!state) {
    state = {
      lastTick: -1000000,
      closeIntervalHits: 0,
      sameTickHits: 0,
      lastSeenTick: -1000000
    }

    nexusBossAdaptiveStates.set(key, state)
  }

  return state
}

function nexusBossAdaptivePolicy(
  resolvedTarget,
  attacker,
  gunId,
  rawFinal
) {
  var adaptive = nexusBossArchetypePolicy('adaptive')

  if (!adaptive) {
    return {
      name: 'adaptive-impact',
      policy: {
        mode: 'impact',
        bodyFraction: 0.20,
        bodyMin: 25,
        bodyMax: 110,
        headFraction: 0.30,
        headMin: 38,
        headMax: 155
      }
    }
  }

  var state = nexusBossAdaptiveState(
    resolvedTarget,
    attacker,
    gunId
  )

  var interval =
    nexusBossDamageTick -
    state.lastTick

  if (interval === 0) {
    state.sameTickHits += 1
  } else {
    state.sameTickHits = 1
  }

  if (
    interval > 0 &&
    interval <= Number(adaptive.automaticIntervalTicks)
  ) {
    state.closeIntervalHits += 1
  } else if (interval > 0) {
    state.closeIntervalHits = 1
  }

  state.lastTick = nexusBossDamageTick
  state.lastSeenTick = nexusBossDamageTick

  if (
    rawFinal >=
    Number(adaptive.precisionRawThreshold)
  ) {
    return {
      name: 'adaptive-precision',
      policy: adaptive.fallbackPrecision
    }
  }

  if (
    state.sameTickHits >= 2 &&
    rawFinal <=
      Number(adaptive.shotgunRawThreshold)
  ) {
    return {
      name: 'adaptive-shotgun',
      policy: adaptive.fallbackShotgun
    }
  }

  if (
    state.closeIntervalHits >=
      Number(adaptive.automaticEvidenceHits)
  ) {
    return {
      name: 'adaptive-automatic',
      policy: adaptive.fallbackAutomatic
    }
  }

  return {
    name: 'adaptive-impact',
    policy: adaptive.fallbackImpact
  }
}

function nexusBossWeaponPolicy(
  resolvedTarget,
  attacker,
  gunId,
  rawFinal
) {
  var explicit = nexusBossExplicitArchetype(gunId)

  if (explicit) {
    return {
      name: explicit,
      policy: nexusBossArchetypePolicy(explicit),
      adaptive: false
    }
  }

  var adaptive = nexusBossAdaptivePolicy(
    resolvedTarget,
    attacker,
    gunId,
    rawFinal
  )

  return {
    name: adaptive.name,
    policy: adaptive.policy,
    adaptive: true
  }
}

function nexusBossImpactCap(
  resolvedTarget,
  event,
  policy
) {
  var maxHealth =
    nexusBossMaxHealth(
      resolvedTarget.entity
    )

  var headshot =
    nexusBossIsHeadshot(event)

  var fraction =
    headshot
      ? Number(policy.headFraction)
      : Number(policy.bodyFraction)

  var minimum =
    headshot
      ? Number(policy.headMin)
      : Number(policy.bodyMin)

  var maximum =
    headshot
      ? Number(policy.headMax)
      : Number(policy.bodyMax)

  if (!Number.isFinite(fraction)) fraction = 1.0
  if (!Number.isFinite(minimum)) minimum = 0
  if (!Number.isFinite(maximum)) maximum = 999999

  return nexusBossClamp(
    maxHealth * fraction,
    minimum,
    maximum
  )
}

function nexusBossApplyImpact(
  event,
  resolvedTarget,
  policy
) {
  var rawFinal =
    nexusBossFinalAmountBeforeArmorSplit(event)

  var cap =
    nexusBossImpactCap(
      resolvedTarget,
      event,
      policy
    )

  var finalDamage =
    Math.min(rawFinal, cap)

  nexusBossSetFinalAmount(
    event,
    finalDamage
  )

  return {
    rawFinal: rawFinal,
    finalDamage: finalDamage,
    cap: cap
  }
}

function nexusBossPurgeOldShooters(shooters, memoryTicks) {
  var expired = []

  shooters.forEach((lastSeenTick, shooterId) => {
    if (
      nexusBossDamageTick -
      lastSeenTick >
      memoryTicks
    ) {
      expired.push(shooterId)
    }
  })

  expired.forEach(shooterId => {
    shooters.delete(shooterId)
  })
}

function nexusBossRegisterShooter(resolvedTarget, attacker) {
  var config = nexusBossDamageConfig()
  var multiplayer = config.multiplayer
  var key = nexusBossGroupKey(resolvedTarget)

  var shooters =
    nexusBossShooterGroups.get(key)

  if (!shooters) {
    shooters = new Map()
    nexusBossShooterGroups.set(key, shooters)
  }

  var shooterId =
    nexusBossAttackerId(attacker)

  shooters.set(
    shooterId,
    nexusBossDamageTick
  )

  nexusBossPurgeOldShooters(
    shooters,
    Number(multiplayer.shooterMemoryTicks)
  )

  return shooters.size
}

function nexusBossTotalShooterScale(shooterCount) {
  var config = nexusBossDamageConfig()
  var multiplayer = config.multiplayer

  var extraShooters = nexusBossClamp(
    Math.max(0, shooterCount - 1),
    0,
    Number(multiplayer.maxExtraShooters)
  )

  return (
    1 +
    extraShooters *
      Number(multiplayer.extraShooterScale)
  )
}

function nexusBossBaseAutoDps(resolvedTarget) {
  var preset =
    nexusBossPreset(
      resolvedTarget.profile
    )

  if (!preset) return 999999

  var maxHealth =
    nexusBossMaxHealth(
      resolvedTarget.entity
    )

  return nexusBossClamp(
    maxHealth *
      Number(preset.autoDpsFraction),
    Number(preset.minAutoDps),
    Number(preset.maxAutoDps)
  )
}

function nexusBossSoftState(
  resolvedTarget,
  attacker,
  gunId,
  capacity
) {
  var key = nexusBossWeaponKey(
    resolvedTarget,
    attacker,
    gunId
  )

  var state =
    nexusBossSoftStates.get(key)

  if (!state) {
    state = {
      tokens: capacity,
      lastTick: nexusBossDamageTick
    }

    nexusBossSoftStates.set(key, state)
  }

  return state
}

function nexusBossSoftCandidateCap(
  resolvedTarget,
  event,
  policy
) {
  // Automatic bullets still get an emergency per-hit cap so an addon
  // cannot label a huge one-shot cannon as "automatic".
  return nexusBossImpactCap(
    resolvedTarget,
    event,
    policy
  )
}

function nexusBossApplySoftSustained(
  event,
  resolvedTarget,
  attacker,
  gunId,
  policy
) {
  var rawFinal =
    nexusBossFinalAmountBeforeArmorSplit(
      event
    )

  var hitCap =
    nexusBossSoftCandidateCap(
      resolvedTarget,
      event,
      policy
    )

  var candidate =
    Math.min(rawFinal, hitCap)

  var shooterCount =
    nexusBossRegisterShooter(
      resolvedTarget,
      attacker
    )

  var totalScale =
    nexusBossTotalShooterScale(
      shooterCount
    )

  var baseDps =
    nexusBossBaseAutoDps(
      resolvedTarget
    )

  var totalArchetypeDps =
    baseDps *
    Number(policy.dpsScale || 1.0) *
    totalScale

  var perShooterDps =
    totalArchetypeDps /
    Math.max(1, shooterCount)

  var burstSeconds =
    Number(policy.burstSeconds || 1.0)

  var capacity =
    perShooterDps *
    burstSeconds

  var state =
    nexusBossSoftState(
      resolvedTarget,
      attacker,
      gunId,
      capacity
    )

  var elapsed =
    Math.max(
      0,
      nexusBossDamageTick -
        state.lastTick
    )

  if (elapsed > 0) {
    state.tokens =
      Math.min(
        capacity,
        state.tokens +
          perShooterDps *
          (elapsed / 20.0)
      )

    state.lastTick =
      nexusBossDamageTick
  } else {
    state.tokens =
      Math.min(
        capacity,
        state.tokens
      )
  }

  var tokenAllowance =
    Math.min(
      candidate,
      state.tokens
    )

  // V8.0.1 strict accounting:
  //
  // V8 used max(tokenAllowance, floorDamage). At high RPM that floor was
  // "free" damage outside the token budget, so a minigun could exceed the
  // configured sustained DPS even with an empty bucket.
  //
  // Now every point that passes Nexus is paid by the same token bucket.
  // Precision/shotgun/explosive policies are untouched.
  var finalDamage =
    Math.min(
      candidate,
      tokenAllowance
    )

  state.tokens =
    Math.max(
      0,
      state.tokens -
        finalDamage
    )

  nexusBossSetFinalAmount(
    event,
    finalDamage
  )

  return {
    rawFinal: rawFinal,
    finalDamage: finalDamage,
    cap: hitCap,
    tokens: state.tokens,
    capacity: capacity,
    perShooterDps: perShooterDps,
    shooterCount: shooterCount
  }
}

function nexusBossShotgunState(
  resolvedTarget,
  attacker,
  gunId,
  windowTicks
) {
  var key = nexusBossWeaponKey(
    resolvedTarget,
    attacker,
    gunId
  )

  var state =
    nexusBossShotgunStates.get(key)

  if (
    !state ||
    nexusBossDamageTick -
      state.windowStart >=
      windowTicks
  ) {
    state = {
      windowStart: nexusBossDamageTick,
      used: 0
    }

    nexusBossShotgunStates.set(key, state)
  }

  return state
}

function nexusBossShotgunVolleyCap(
  resolvedTarget,
  policy
) {
  var maxHealth =
    nexusBossMaxHealth(
      resolvedTarget.entity
    )

  return nexusBossClamp(
    maxHealth *
      Number(policy.volleyFraction),
    Number(policy.volleyMin),
    Number(policy.volleyMax)
  )
}

function nexusBossApplyShotgun(
  event,
  resolvedTarget,
  attacker,
  gunId,
  policy
) {
  var rawFinal =
    nexusBossFinalAmountBeforeArmorSplit(
      event
    )

  var windowTicks =
    Number(policy.volleyTicks || 5)

  var state =
    nexusBossShotgunState(
      resolvedTarget,
      attacker,
      gunId,
      windowTicks
    )

  var volleyCap =
    nexusBossShotgunVolleyCap(
      resolvedTarget,
      policy
    )

  var remaining =
    Math.max(
      0,
      volleyCap - state.used
    )

  var normalAllowance =
    Math.min(
      rawFinal,
      remaining
    )

  var overflowFloor =
    rawFinal *
    Number(
      policy.overflowFloorRatio || 0
    )

  var finalDamage =
    Math.min(
      rawFinal,
      Math.max(
        normalAllowance,
        overflowFloor
      )
    )

  state.used += normalAllowance

  nexusBossSetFinalAmount(
    event,
    finalDamage
  )

  return {
    rawFinal: rawFinal,
    finalDamage: finalDamage,
    cap: volleyCap,
    volleyUsed: state.used
  }
}

function nexusBossApplyShotgunSustained(
  event,
  resolvedTarget,
  attacker,
  gunId,
  policy
) {
  // First preserve shotgun identity within the short pellet volley.
  var shotgunResult =
    nexusBossApplyShotgun(
      event,
      resolvedTarget,
      attacker,
      gunId,
      policy
    )

  // Then feed that already-volley-balanced amount through the soft
  // sustained guardrail for fully automatic shotguns.
  var originalFinal =
    shotgunResult.finalDamage

  var headshotMultiplier =
    nexusBossHeadshotMultiplier(event)

  event.setBaseAmount(
    originalFinal /
    headshotMultiplier
  )

  var softResult =
    nexusBossApplySoftSustained(
      event,
      resolvedTarget,
      attacker,
      gunId + '#auto-shotgun',
      policy
    )

  softResult.volleyCap = shotgunResult.cap
  softResult.volleyUsed = shotgunResult.volleyUsed
  softResult.preSustained = originalFinal

  return softResult
}

function nexusBossNativeManaged(resolvedTarget) {
  return !!(
    resolvedTarget &&
    resolvedTarget.profile &&
    resolvedTarget.profile.nativeDamageManagement
  )
}

function nexusBossTelemetryKey(
  resolvedTarget,
  gunId,
  archetype
) {
  return (
    resolvedTarget.id +
    '|' +
    gunId +
    '|' +
    archetype
  )
}

function nexusBossTelemetryRecord(
  resolvedTarget,
  gunId,
  archetype,
  mode,
  result
) {
  if (!nexusBossTelemetryEnabled()) return

  var key =
    nexusBossTelemetryKey(
      resolvedTarget,
      gunId,
      archetype
    )

  var state =
    nexusBossTelemetryStates.get(key)

  if (!state) {
    state = {
      boss: resolvedTarget.profile.name,
      bossId: resolvedTarget.id,
      gunId: gunId,
      archetype: archetype,
      mode: mode,
      hits: 0,
      raw: 0,
      final: 0,
      minFinal: 999999,
      maxFinal: 0,
      windowStart: nexusBossDamageTick,
      lastUpdate: nexusBossDamageTick,
      nativeManaged: 0
    }

    nexusBossTelemetryStates.set(key, state)
  }

  var raw = Number(result.rawFinal || 0)
  var finalDamage = Number(result.finalDamage || 0)

  state.hits += 1
  state.raw += raw
  state.final += finalDamage
  state.minFinal = Math.min(
    state.minFinal,
    finalDamage
  )
  state.maxFinal = Math.max(
    state.maxFinal,
    finalDamage
  )
  state.lastUpdate = nexusBossDamageTick

  if (result.nativeManaged) {
    state.nativeManaged += 1
  }
}

function nexusBossTelemetryFlush(force) {
  if (!nexusBossTelemetryEnabled()) return

  var config = nexusBossDamageConfig()
  var interval = Number(
    config.telemetryIntervalTicks || 20
  )

  var remove = []

  nexusBossTelemetryStates.forEach((state, key) => {
    var windowAge =
      nexusBossDamageTick -
      state.windowStart

    if (
      !force &&
      windowAge < interval
    ) {
      return
    }

    if (state.hits > 0) {
      var ratio =
        state.raw > 0
          ? state.final / state.raw
          : 1.0

      console.info(
        '[Nexus Boss V8.0.1 Telemetry] ' +
        state.boss +
        ' <- ' +
        state.gunId +
        ' [' +
        state.archetype +
        '] mode=' +
        state.mode +
        ' hits=' +
        state.hits +
        ' raw=' +
        state.raw.toFixed(3) +
        ' nexus=' +
        state.final.toFixed(3) +
        ' ratio=' +
        ratio.toFixed(3) +
        ' minHit=' +
        (
          state.minFinal === 999999
            ? '0.000'
            : state.minFinal.toFixed(3)
        ) +
        ' maxHit=' +
        state.maxFinal.toFixed(3) +
        ' nativeManaged=' +
        state.nativeManaged +
        '.'
      )
    }

    remove.push(key)
  })

  remove.forEach(key => {
    nexusBossTelemetryStates.delete(key)
  })
}

function nexusBossTraceResolved(
  event,
  resolvedTarget,
  attacker,
  gunId,
  archetype
) {
  if (!nexusBossTraceEnabled()) return

  var originalTarget = null

  try {
    originalTarget =
      event.getHurtEntity()
  } catch (ignored) {
  }

  console.info(
    '[TACZ NATIVE TRACE V8.0.1] ' +
    'targetId=' +
    nexusBossEntityRegistryId(originalTarget) +
    ' targetClass=' +
    nexusBossEntityClass(originalTarget) +
    ' resolvedBossId=' +
    resolvedTarget.id +
    ' resolution=' +
    resolvedTarget.resolution +
    ' parentDepth=' +
    resolvedTarget.parentDepth +
    ' gunId=' +
    gunId +
    ' archetype=' +
    archetype +
    ' base=' +
    nexusBossBaseAmount(event) +
    ' headshot=' +
    String(nexusBossIsHeadshot(event)) +
    ' attacker=' +
    nexusBossEntityName(attacker)
  )
}

function nexusBossHandleNativeGunPre(event) {
  var config = nexusBossDamageConfig()

  if (!config) {
    console.error(
      '[Nexus Boss Damage V8.0.1] global.NexusBossBalance no esta disponible.'
    )
    return
  }

  var target = null
  var attacker = null
  var gunId = 'unknown'

  try {
    target = event.getHurtEntity()
    attacker = event.getAttacker()
    gunId = String(event.getGunId())
  } catch (error) {
    console.error(
      '[Nexus Boss Damage V8.0.1] Error leyendo EntityHurtByGunEvent.Pre.'
    )
    console.error(error)
    return
  }

  var resolvedTarget =
    nexusBossResolveTarget(target)

  // Normal mobs / unresolved targets are untouched.
  if (!resolvedTarget) {
    if (nexusBossTraceEnabled()) {
      console.info(
        '[TACZ NATIVE UNRESOLVED V8.0.1] ' +
        'targetId=' +
        nexusBossEntityRegistryId(target) +
        ' targetClass=' +
        nexusBossEntityClass(target) +
        ' gunId=' +
        gunId +
        ' attacker=' +
        nexusBossEntityName(attacker)
      )
    }

    return
  }

  if (
    !nexusBossDamageValidationEnabledFor(
      resolvedTarget.id
    )
  ) {
    return
  }

  var rawFinal =
    nexusBossFinalAmountBeforeArmorSplit(
      event
    )

  var selected =
    nexusBossWeaponPolicy(
      resolvedTarget,
      attacker,
      gunId,
      rawFinal
    )

  var archetype =
    selected.name

  var policy =
    selected.policy

  if (!policy) {
    console.error(
      '[Nexus Boss Damage V8.0.1] Sin policy para ' +
      gunId +
      ' archetype=' +
      archetype +
      '.'
    )
    return
  }

  nexusBossTraceResolved(
    event,
    resolvedTarget,
    attacker,
    gunId,
    archetype
  )

  // Known native DPS-management bosses:
  // Do not stack Nexus pre-damage throttling on top of their own cap,
  // armor, invulnerability and regeneration systems.
  if (nexusBossNativeManaged(resolvedTarget)) {
    nexusBossTelemetryRecord(
      resolvedTarget,
      gunId,
      archetype,
      'native-managed',
      {
        rawFinal: rawFinal,
        finalDamage: rawFinal,
        nativeManaged: true
      }
    )

    return
  }

  var result = null
  var mode = String(policy.mode || 'impact')

  if (mode === 'soft_sustained') {
    result =
      nexusBossApplySoftSustained(
        event,
        resolvedTarget,
        attacker,
        gunId,
        policy
      )
  } else if (mode === 'shotgun') {
    result =
      nexusBossApplyShotgun(
        event,
        resolvedTarget,
        attacker,
        gunId,
        policy
      )
  } else if (mode === 'shotgun_sustained') {
    result =
      nexusBossApplyShotgunSustained(
        event,
        resolvedTarget,
        attacker,
        gunId,
        policy
      )
  } else {
    result =
      nexusBossApplyImpact(
        event,
        resolvedTarget,
        policy
      )
  }

  nexusBossTelemetryRecord(
    resolvedTarget,
    gunId,
    archetype,
    mode,
    result
  )
}

function nexusBossEntityTypeRegistered(entityId) {
  if (
    !nexusBossRegistryClass ||
    !nexusBossResourceLocationClass
  ) {
    return null
  }

  try {
    var key =
      nexusBossResourceLocationClass.tryParse(
        String(entityId)
      )

    if (!key) return false

    return Boolean(
      nexusBossRegistryClass.ENTITY_TYPE.containsKey(
        key
      )
    )
  } catch (ignored) {
    return null
  }
}

function nexusBossAuditWeaponGroups() {
  var weapon = nexusBossWeaponConfig()

  if (!weapon || !weapon.groups) {
    console.error(
      '[Nexus Boss Audit V8.0.1] weaponBalance.groups no disponible.'
    )
    return
  }

  var seen = new Map()
  var duplicates = []
  var missingPolicies = []

  Object.keys(weapon.groups).forEach(groupName => {
    var policy = nexusBossArchetypePolicy(groupName)

    if (!policy) {
      missingPolicies.push(groupName)
    }

    var guns = weapon.groups[groupName] || []

    guns.forEach(gunId => {
      if (seen.has(gunId)) {
        duplicates.push(
          gunId +
          ':' +
          seen.get(gunId) +
          '|' +
          groupName
        )
      } else {
        seen.set(gunId, groupName)
      }
    })
  })

  console.info(
    '[Nexus Boss Audit V8.0.1] ' +
    'explicitGuns=' +
    seen.size +
    ' weaponGroups=' +
    Object.keys(weapon.groups).length +
    ' duplicateGunIds=' +
    duplicates.length +
    ' missingPolicies=' +
    missingPolicies.length +
    '.'
  )

  if (duplicates.length > 0) {
    console.error(
      '[Nexus Boss Audit V8.0.1] GunIds duplicados: ' +
      duplicates.join(', ')
    )
  }

  if (missingPolicies.length > 0) {
    console.error(
      '[Nexus Boss Audit V8.0.1] Groups sin policy: ' +
      missingPolicies.join(', ')
    )
  }
}

function nexusBossAuditProtectedRoster() {
  var config = nexusBossDamageConfig()

  if (
    !config ||
    !config.protectedBosses
  ) {
    console.error(
      '[Nexus Boss Audit V8.0.1] protectedBosses no disponible.'
    )
    return
  }

  var ids =
    Object.keys(config.protectedBosses)

  var registryOk = 0
  var registryBad = []
  var registryUnknown = 0
  var presetBad = []
  var excludedOverlap = []
  var nativeManaged = []

  ids.forEach(entityId => {
    var profile =
      config.protectedBosses[entityId]

    var registered =
      nexusBossEntityTypeRegistered(entityId)

    if (registered === true) {
      registryOk++
    } else if (registered === false) {
      registryBad.push(entityId)
    } else {
      registryUnknown++
    }

    if (
      !profile ||
      !profile.preset ||
      !config.presets ||
      !config.presets[profile.preset]
    ) {
      presetBad.push(entityId)
    }

    if (
      Array.isArray(config.excludedBosses) &&
      config.excludedBosses.includes(entityId)
    ) {
      excludedOverlap.push(entityId)
    }

    if (
      profile &&
      profile.nativeDamageManagement
    ) {
      nativeManaged.push(entityId)
    }
  })

  console.info(
    '[Nexus Boss Audit V8.0.1] ' +
    'protected=' +
    ids.length +
    ' registryOk=' +
    registryOk +
    ' registryBad=' +
    registryBad.length +
    ' registryUnknown=' +
    registryUnknown +
    ' presetBad=' +
    presetBad.length +
    ' excludedOverlap=' +
    excludedOverlap.length +
    ' nativeManaged=' +
    nativeManaged.length +
    '.'
  )

  if (registryBad.length > 0) {
    console.error(
      '[Nexus Boss Audit V8.0.1] IDs NO registrados: ' +
      registryBad.join(', ')
    )
  }

  if (presetBad.length > 0) {
    console.error(
      '[Nexus Boss Audit V8.0.1] Perfiles/presets invalidos: ' +
      presetBad.join(', ')
    )
  }

  if (excludedOverlap.length > 0) {
    console.error(
      '[Nexus Boss Audit V8.0.1] Boss protegido y excluido a la vez: ' +
      excludedOverlap.join(', ')
    )
  }

  console.info(
    '[Nexus Boss Audit V8.0.1] nativeDamageManagement: ' +
    (
      nativeManaged.length > 0
        ? nativeManaged.join(', ')
        : 'none'
    )
  )
}

function nexusBossRuntimeIndexSpawn(event, canonicalId) {
  var entity = event.entity
  if (!entity) return

  var uuid =
    nexusBossEntityUuid(entity)

  if (
    !uuid ||
    uuid === 'null' ||
    uuid === 'unknown'
  ) {
    console.error(
      '[Nexus Boss Runtime V8.0.1] Spawn sin UUID para ' +
      canonicalId +
      '.'
    )
    return
  }

  nexusBossRuntimeBossIdsByUuid.set(
    uuid,
    canonicalId
  )

  if (nexusBossTraceEnabled()) {
    console.info(
      '[Nexus Boss Runtime V8.0.1] indexed ' +
      'canonicalId=' +
      canonicalId +
      ' uuid=' +
      uuid +
      ' actualId=' +
      nexusBossEntityRegistryId(entity) +
      ' class=' +
      nexusBossEntityClass(entity) +
      '.'
    )
  }
}

function nexusBossArmRuntimeIndex() {
  var config = nexusBossDamageConfig()

  if (
    !config ||
    !config.protectedBosses
  ) {
    console.error(
      '[Nexus Boss Runtime V8.0.1] No se pudo armar el indice.'
    )
    return
  }

  var ids =
    Object.keys(config.protectedBosses)

  ids.forEach(canonicalId => {
    EntityEvents.spawned(
      canonicalId,
      event => {
        nexusBossRuntimeIndexSpawn(
          event,
          canonicalId
        )
      }
    )
  })

  console.info(
    '[Nexus Boss Runtime V8.0.1] Indice UUID armado para ' +
    ids.length +
    ' bosses protegidos.'
  )
}

nexusBossAuditProtectedRoster()
nexusBossAuditWeaponGroups()
nexusBossArmRuntimeIndex()

var nexusBossNativeRegistered = false

try {
  if (
    typeof TimelessGunEvents !== 'undefined' &&
    TimelessGunEvents &&
    typeof TimelessGunEvents.entityHurtByGunPre === 'function'
  ) {
    TimelessGunEvents.entityHurtByGunPre(
      event => {
        nexusBossHandleNativeGunPre(event)
      }
    )

    nexusBossNativeRegistered = true

    console.info(
      '[Nexus Boss Damage V8.0.1] Listener TaCZ registrado.'
    )
  } else {
    console.error(
      '[Nexus Boss Damage V8.0.1] TimelessGunEvents.entityHurtByGunPre no disponible.'
    )
  }
} catch (error) {
  console.error(
    '[Nexus Boss Damage V8.0.1] Fallo registrando listener TaCZ.'
  )
  console.error(error)
}

ServerEvents.tick(event => {
  nexusBossDamageTick += 1

  var config = nexusBossDamageConfig()

  if (
    config &&
    config.telemetry &&
    nexusBossDamageTick %
      Number(config.telemetryIntervalTicks || 20) === 0
  ) {
    nexusBossTelemetryFlush(false)
  }
})

console.info(
  '[Nexus Boss Damage V8.0.1] cargado. ' +
  'native=' +
  String(nexusBossNativeRegistered) +
  ' trace=' +
  String(nexusBossTraceEnabled()) +
  ' telemetry=' +
  String(nexusBossTelemetryEnabled()) +
  ' protectedBosses=' +
  String(
    Object.keys(
      (nexusBossDamageConfig() || {}).protectedBosses || {}
    ).length
  ) +
  '.'
)
