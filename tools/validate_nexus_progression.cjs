// Offline regression checks against the actual KubeJS script with server doubles.
// This does not validate Forge players, Rhino interop, networking or Minecraft UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'kubejs/server_scripts/nexus_era_calendar.js'), 'utf8');
const directorScript = fs.readFileSync(path.join(root, 'kubejs/startup_scripts/nexus_horde_director.js'), 'utf8');
const presentationScript = fs.readFileSync(path.join(root, 'kubejs/startup_scripts/nexus_horde_presentation.js'), 'utf8');
const calendarBridgeScript = fs.readFileSync(path.join(root,
  'kubejs/startup_scripts/nexus_era_calendar_forge_bridge.js'), 'utf8');
const reentryScript = fs.readFileSync(path.join(root, 'kubejs/startup_scripts/nexus_horde_reentry_guard.js'), 'utf8');
const hordesConfig = fs.readFileSync(path.join(root, 'config/hordes-common.toml'), 'utf8');
const hordeNativeBridgeSource = fs.readFileSync(path.join(root,
  'nexus-core/src/main/java/dev/itscarlos/nexuscore/horde/HordeNativeBridge.java'), 'utf8');
const hordeTargetingSource = fs.readFileSync(path.join(root,
  'nexus-core/src/main/java/dev/itscarlos/nexuscore/horde/HordeTargeting.java'), 'utf8');
const sunBurnMixinSource = fs.readFileSync(path.join(root,
  'nexus-core/src/main/java/dev/itscarlos/nexuscore/mixin/MobSunBurnMixin.java'), 'utf8');
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'config/nexuscore/eras.json'), 'utf8'));

class Data {
  constructor(values = {}) { this.values = { ...values }; }
  check(key) { assert.ok(!/nexusCampaign|nexusEraUnlockDay|nexusPendingEraRequestedDay/.test(key), `legacy read: ${key}`); }
  contains(key) { this.check(key); return key in this.values; }
  getInt(key) { this.check(key); return this.values[key] ?? 0; }
  getBoolean(key) { this.check(key); return this.values[key] ?? false; }
  getString(key) { this.check(key); return this.values[key] ?? ''; }
  putInt(key, value) { this.values[key] = value; }
  putBoolean(key, value) { this.values[key] = value; }
  putString(key, value) { this.values[key] = value; }
}

function fixture(values = {}, required, configure = () => {}) {
  if (arguments.length < 2) required = 3;
  const config = structuredClone(canonical);
  config.progression = { required_online_players: required };
  configure(config);
  const data = new Data(values);
  const events = {};
  const logs = [];
  const unlocked = new Set();
  let quorum = 3;
  const bridge = {
    setRequiredOnlinePlayers: value => { quorum = value; },
    requiredOnlinePlayers: () => quorum,
    countEligibleOnlinePlayers: server => server.eligible,
  };
  const level = { dimension: 'minecraft:overworld', getDayTime: () => 24000 * 100 + 6000 };
  const server = {
    persistentData: data, eligible: 1, players: [], commands: [],
    getAllLevels: () => ({ iterator: () => {
      let available = true;
      return { hasNext: () => available, next: () => { available = false; return level; } };
    } }),
    runCommandSilent(command) {
      this.commands.push(command);
      const parts = command.split(' ');
      if (parts[2] === 'unlock') unlocked.add(parts[3]);
      if (parts[2] === 'lock') unlocked.delete(parts[3]);
      return 1;
    },
  };
  const context = vm.createContext({
    JsonIO: { read: () => config },
    Java: { loadClass: name => {
      if (name === 'net.bananemdnsa.historystages.data.StageManager') {
        return { getStages: () => ({ containsKey: () => true }) };
      }
      if (name === 'net.bananemdnsa.historystages.util.StageData') {
        return { get: () => ({ getUnlockedStages: () => ({ contains: id => unlocked.has(id) }) }) };
      }
      assert.equal(name, 'dev.itscarlos.nexuscore.progression.KubeJsServerData');
      return bridge;
    } },
    Platform: { isLoaded: () => true },
    ServerEvents: {
      loaded: callback => { events.loaded = callback; },
      tick: callback => { events.tick = callback; },
      commandRegistry: callback => { events.commands = callback; },
    },
    global: {}, server, data,
    Date: { now: () => { throw new Error('Real clock used by progression'); } },
    console: Object.fromEntries(['info', 'warn', 'error'].map(kind => [kind, (...args) => logs.push([kind, ...args])])),
  });
  vm.runInContext(script, context);
  const run = expression => vm.runInContext(expression, context);
  return { data, events, server, level, config, context, logs, run };
}

let checks = 0;
function test(name, body) { body(); checks++; console.log(`PASS ${name}`); }

test('Era III migration preserves world data, legitimate pending and legacy residue; idempotent', () => {
  const f = fixture({ nexusEra: 3, nexusPendingEra: 4, nexusEraMilestoneCompleted: 1,
    nexusCampaignStarted: false, nexusCampaignPaused: true, nexusCampaignEpochMillis: 1,
    nexusNextHordeDay: 125, nexusLastHordeCompletedDay: 115, unrelated: 'keep' });
  f.events.loaded({ server: f.server });
  assert.equal(f.data.getInt('nexusEra'), 3);
  assert.equal(f.data.getInt('nexusPendingEra'), 4);
  assert.equal(f.data.getInt('nexusEraMilestoneCompleted'), 4);
  assert.equal(f.data.getInt('nexusProgressionSchemaVersion'), 1);
  const once = JSON.stringify(f.data.values);
  f.run('nexusEraData(server)');
  assert.equal(JSON.stringify(f.data.values), once);
  assert.equal(f.data.values.nexusCampaignPaused, true);
  assert.equal(f.data.getInt('nexusNextHordeDay'), 125);
  assert.equal(f.data.values.unrelated, 'keep');
});

test('request IV persists at 1/3 and 2/3; tick advances at 3/3 without repeating quest', () => {
  const f = fixture({ nexusEra: 3 });
  assert.equal(f.run('nexusEraRequestAdvance(server, 4).status'), 'awaiting_players');
  assert.equal(f.data.getInt('nexusPendingEra'), 4);
  assert.equal(f.data.getInt('nexusEraMilestoneCompleted'), 4);
  f.server.eligible = 2;
  for (let i = 0; i < 20; i++) f.events.tick({ server: f.server });
  assert.equal(f.data.getInt('nexusEra'), 3);
  f.server.eligible = 3;
  for (let i = 0; i < 20; i++) f.events.tick({ server: f.server });
  assert.equal(f.data.getInt('nexusEra'), 4);
  assert.equal(f.data.getInt('nexusPendingEra'), -1);
  assert.ok(f.server.commands.includes('history global unlock nexus_era_4_nexus'));
});

test('saved pending resumes in a fresh script/server instance', () => {
  const first = fixture({ nexusEra: 3 });
  first.run('nexusEraRequestAdvance(server, 4)');
  const restart = fixture(JSON.parse(JSON.stringify(first.data.values)));
  restart.events.loaded({ server: restart.server });
  assert.equal(restart.data.getInt('nexusEra'), 3);
  restart.server.eligible = 3;
  assert.equal(restart.run('nexusEraTryAdvancePending(server)'), true);
  assert.equal(restart.data.getInt('nexusEra'), 4);
});

test('Horde blocks request and pending; ending it releases pending', () => {
  const f = fixture({ nexusEra: 3, nexusHordeActive: true });
  f.server.eligible = 3;
  assert.equal(f.run('nexusEraRequestAdvance(server, 4).status'), 'awaiting_horde_end');
  assert.equal(f.run('nexusEraTryAdvancePending(server)'), false);
  assert.equal(f.data.getInt('nexusEra'), 3);
  f.data.putBoolean('nexusHordeActive', false);
  assert.equal(f.run('nexusEraTryAdvancePending(server)'), true);
});

test('no skip, automatic regression or unrequested advancement', () => {
  const f = fixture({ nexusEra: 3 });
  f.server.eligible = 50;
  assert.equal(f.run('nexusEraRequestAdvance(server, 2).status'), 'already');
  assert.equal(f.run('nexusEraRequestAdvance(server, 5).status'), 'invalid_target');
  assert.equal(f.run('nexusEraTryAdvancePending(server)'), false);
  assert.equal(f.data.getInt('nexusEra'), 3);
  for (const pending of [-1, 1, 2, 3, 5, 100]) {
    f.data.putInt('nexusPendingEra', pending);
    assert.equal(f.run('nexusEraTryAdvancePending(server)'), false);
    assert.equal(f.data.getInt('nexusEra'), 3);
    assert.equal(f.data.getInt('nexusPendingEra'), -1);
  }
  assert.ok(f.logs.some(line => line[0] === 'error' && String(line[1]).includes('Pending invalido')));
});

test('all four transitions require their own request', () => {
  const f = fixture();
  f.server.eligible = 3;
  for (let era = 1; era <= 4; era++) {
    assert.equal(f.run('nexusEraTryAdvancePending(server)'), false);
    assert.equal(f.run(`nexusEraRequestAdvance(server, ${era}).status`), 'advanced');
    assert.equal(f.data.getInt('nexusEra'), era);
  }
  assert.equal(f.run('nexusEraRequestAdvance(server, 5).status'), 'maximum');
});

test('configurable quorum and invalid-value fallback', () => {
  for (const invalid of [undefined, null, 0, -1, 1.5, '1', true, NaN, Infinity, 2147483648]) {
    const f = fixture({ nexusEra: 3 }, invalid);
    assert.equal(f.run('NexusProgressionData.requiredOnlinePlayers()'), 3);
  }
  for (const required of [1, 5, 2147483647]) {
    const f = fixture({ nexusEra: 3 }, required);
    assert.equal(f.run('NexusProgressionData.requiredOnlinePlayers()'), required);
    f.server.eligible = required;
    assert.equal(f.run('nexusEraRequestAdvance(server, 4).status'), 'advanced');
  }
});

test('invalid era definitions retain milestone and block automatic advancement', () => {
  const f = fixture({ nexusEra: 3 }, 3, config => { delete config.eras[4]; });
  f.server.eligible = 3;
  assert.equal(f.run('nexusEraRequestAdvance(server, 4).status'), 'invalid_config');
  assert.equal(f.data.getInt('nexusPendingEra'), 4);
  assert.equal(f.run('nexusEraTryAdvancePending(server)'), false);
});

test('command tree preserves permissions, confirmation and normal advance rules', () => {
  const f = fixture({ nexusEra: 3 });
  class Command {
    constructor(name) { this.name = name; this.children = []; }
    then(child) { this.children.push(child); return this; }
    requires(predicate) { this.permission = predicate; return this; }
    executes(callback) { this.execute = callback; return this; }
    child(name) { return this.children.find(child => child.name === name); }
  }
  const roots = [];
  f.events.commands({
    commands: { literal: name => new Command(name), argument: name => new Command(name) },
    arguments: { INTEGER: { create: () => null, getResult: (ctx, name) => ctx.arguments[name] } },
    register: command => roots.push(command),
  });
  assert.deepEqual(roots.map(command => command.name), ['nexus_era']);
  const era = roots[0];
  assert.deepEqual(era.children.map(command => command.name).sort(),
    ['_horde_complete', 'advance', 'get', 'request', 'reset_production', 'set', 'sync']);
  const source = permission => ({ server: f.server, hasPermission: level => permission >= level });
  const reset = era.child('reset_production');
  assert.equal(reset.permission(source(3)), false);
  assert.equal(reset.permission(source(4)), true);
  assert.equal(reset.execute({ source: source(4) }), 0);
  assert.equal(f.data.getInt('nexusEra'), 3);
  assert.equal(era.child('advance').permission(source(1)), false);
  assert.equal(era.child('advance').execute({ source: source(2) }), 1);
  assert.equal(f.data.getInt('nexusEra'), 3);
  assert.equal(f.data.getInt('nexusPendingEra'), 4);
  f.data.putBoolean('nexusHordeActive', true);
  assert.equal(reset.child('confirm').execute({ source: source(4) }), 0);
  assert.equal(f.data.getInt('nexusEra'), 3);
  f.data.putBoolean('nexusHordeActive', false);
  assert.equal(reset.child('confirm').execute({ source: source(4) }), 1);
  assert.equal(f.data.getInt('nexusEra'), 0);
  assert.equal(f.data.getInt('nexusPendingEra'), -1);
  assert.equal(f.data.getInt('nexusEraMilestoneCompleted'), 0);
});

test('one delayed startup reconciliation uses persisted III: unlock I/II/III, lock IV', () => {
  const f = fixture({ nexusEra: 3 });
  f.events.loaded({ server: f.server });
  for (let i = 0; i < 99; i++) f.events.tick({ server: f.server });
  assert.equal(f.server.commands.length, 0);
  f.events.tick({ server: f.server });
  assert.deepEqual(f.server.commands, [
    'history global unlock nexus_era_1_iron', 'history global unlock nexus_era_2_diamond',
    'history global unlock nexus_era_3_arcane_industrial', 'history global lock nexus_era_4_nexus',
  ]);
  for (let i = 0; i < 120; i++) f.events.tick({ server: f.server });
  assert.equal(f.server.commands.length, 4);
});

test('History Stages exception is logged without killing the tick loop', () => {
  const f = fixture({ nexusEra: 3 });
  f.server.runCommandSilent = () => { throw new Error('simulated History Stages failure'); };
  f.events.loaded({ server: f.server });
  for (let i = 0; i < 120; i++) f.events.tick({ server: f.server });
  assert.ok(f.logs.some(line => line[0] === 'error'));
  assert.equal(f.data.getInt('nexusEra'), 3);
});

test('silent History Stages failure is detected; already locked is accepted', () => {
  const f = fixture({ nexusEra: 3 });
  f.server.runCommandSilent = () => 0;
  assert.equal(f.run('syncHistoryStages(server, 3, "test").ok'), false);
  assert.ok(f.logs.some(line => line[0] === 'error'));
  const initial = fixture({ nexusEra: 0 });
  initial.server.runCommandSilent = () => 0;
  assert.equal(initial.run('syncHistoryStages(server, 0, "test").ok'), true);
});

test('Horde calendar uses world ticks and still schedules with inert campaign flags', () => {
  const f = fixture({ nexusEra: 3, nexusCampaignStarted: false, nexusCampaignPaused: true });
  assert.equal(f.run('nexusEraWorldDay(server)'), 100);
  assert.equal(f.run('nexusEraTimeOfDay(server)'), 6000);
  f.run('nexusEraTryStartScheduledHorde(server)');
  assert.equal(f.data.getInt('nexusNextHordeDay'), 102);
  assert.equal(f.server.commands.length, 0); // Outside the existing midnight window.
});

test('Horde combat eligibility accepts survival/adventure and rejects creative/spectator', () => {
  const f = fixture();
  let creative = false;
  let spectator = false;
  const player = {
    level: f.level,
    isAlive: () => true,
    isCreative: () => creative,
    isSpectator: () => spectator,
  };
  f.context.testCombatPlayer = player;
  assert.equal(f.run('nexusEraIsValidAnchor(testCombatPlayer)'), true);
  creative = true;
  assert.equal(f.run('nexusEraIsValidAnchor(testCombatPlayer)'), false);
  creative = false;
  spectator = true;
  assert.equal(f.run('nexusEraIsValidAnchor(testCombatPlayer)'), false);
});

test('threat formula matches the specification and remains bounded through day 2000', () => {
  const f = fixture();
  const days = [0, 15, 29, 30, 59, 60, 89, 90, 119, 120, 159, 160, 219, 220, 500, 1000, 2000];
  const participants = [1, 2, 3, 10];
  let previousByParticipants = new Map();

  for (const day of days) {
    for (const participantCount of participants) {
      const amounts = JSON.parse(f.run(
        `JSON.stringify(nexusEraHordeWaveAmounts(${day}, ${participantCount}))`
      ));
      assert.equal(amounts.length, 4);
      assert.ok(amounts.every(amount => amount > 0 && amount <= 24));
      assert.ok(amounts[3] >= amounts[0]);
      const previous = previousByParticipants.get(participantCount);
      if (previous) {
        assert.ok(amounts.every((amount, index) => amount >= previous[index]));
      }
      previousByParticipants.set(participantCount, amounts);
    }
    const three = f.run(`nexusEraHordeWaveAmounts(${day}, 3).join(',')`);
    const ten = f.run(`nexusEraHordeWaveAmounts(${day}, 10).join(',')`);
    assert.equal(ten, three, `participant bonus exceeded its cap on day ${day}`);
  }

  const expected = new Map([
    [15, [10, 12, 13, 14]], [30, [12, 14, 15, 16]],
    [60, [14, 16, 17, 18]], [90, [16, 18, 19, 20]],
    [120, [18, 20, 21, 22]], [160, [19, 21, 22, 23]],
    [220, [20, 22, 23, 24]],
  ]);
  for (const [day, amounts] of expected) {
    assert.deepEqual(JSON.parse(f.run(
      `JSON.stringify(nexusEraHordeWaveAmounts(${day}, 1))`
    )), amounts);
  }
  assert.deepEqual(JSON.parse(f.run(
    'JSON.stringify(nexusEraHordeWaveAmounts(220, 3))'
  )), [22, 24, 24, 24]);
  assert.deepEqual(JSON.parse(f.run(
    'JSON.stringify(nexusEraHordeWaveAmounts(2000, 10))'
  )), [22, 24, 24, 24]);
});

test('threat day is frozen, survives time rollback and resets only in production reset', () => {
  const f = fixture({ nexusEra: 3 });
  f.run('nexusEraData(server)');
  assert.equal(f.data.getInt('nexusHordeThreatDay'), -1);
  assert.equal(f.data.getInt('nexusMaxHordeThreatDay'), -1);

  const anchor = {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    level: f.level,
    getX: () => 0, getY: () => 64, getZ: () => 0,
    getGameProfile: () => ({ getName: () => 'Anchor' }),
  };
  const second = { uuid: '123e4567-e89b-12d3-a456-426614174001' };
  f.context.anchor = anchor;
  f.context.second = second;
  f.run(`nexusEraClaimGlobalHorde(data, anchor, 137, [anchor, second],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  assert.equal(f.data.getInt('nexusHordeThreatDay'), 137);
  assert.equal(f.data.getInt('nexusMaxHordeThreatDay'), 137);
  assert.deepEqual(JSON.parse(f.run(
    'JSON.stringify(nexusEraHordeContext(server).waveAmounts)'
  )), [19, 21, 22, 23]);
  assert.equal(f.run('nexusEraHordeContext(server).participantCount'), 2);
  assert.equal(f.run('nexusEraHordeContext(server).maxThreatDay'), 137);
  assert.equal(f.run('nexusEraHordeContext(server).finisherTable'), 'nexus:era3_finisher');

  const restart = fixture(JSON.parse(JSON.stringify(f.data.values)));
  assert.equal(restart.run('nexusEraHordeContext(server).threatDay'), 137);
  assert.equal(restart.run('nexusEraHordeContext(server).maxThreatDay'), 137);

  f.run('nexusEraClearGlobalHorde(data)');
  assert.equal(f.data.getInt('nexusHordeThreatDay'), -1);
  assert.equal(f.data.getInt('nexusMaxHordeThreatDay'), 137);
  f.run(`nexusEraClaimGlobalHorde(data, anchor, 20, [anchor],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  assert.equal(f.data.getInt('nexusHordeThreatDay'), 137);
  assert.equal(f.data.getInt('nexusMaxHordeThreatDay'), 137);
  f.run('nexusEraClearGlobalHorde(data)');
  assert.equal(f.run('nexusEraResetProduction(server).status'), 'reset');
  assert.equal(f.data.getInt('nexusMaxHordeThreatDay'), -1);
});

test('completion requires exact owner, exact Horde and an authorized session', () => {
  const completed = fixture({ nexusEra: 3 });
  const makePlayer = (uuid, name) => ({
    uuid,
    level: completed.level,
    getServer: () => completed.server,
    getGameProfile: () => ({ getName: () => name }),
    isAlive: () => true,
    isCreative: () => false,
    isSpectator: () => false,
    getX: () => 0, getY: () => 64, getZ: () => 0,
    distanceToSqr: () => 0,
    tell: () => {},
  });
  const anchor = makePlayer('123e4567-e89b-12d3-a456-426614174010', 'Anchor');
  const replacement = makePlayer('123e4567-e89b-12d3-a456-426614174011', 'Replacement');
  const horde = {
    equals: other => other === horde,
    getSpawnTable: () => ({ getName: () => 'nexus:era3_chaos' }),
  };
  completed.server.players = [anchor, replacement];
  Object.assign(completed.context, { anchor, replacement, horde });
  completed.run(`nexusEraClaimGlobalHorde(data, anchor, 100, [anchor, replacement],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  completed.run(`nexusEraPendingStart = {
    playerId: String(anchor.uuid), player: anchor, horde: null,
    eventObserved: false, currentDay: 100, deadlineAtTick: 100
  }`);
  completed.run(`nexusEraBridgeOnHordeStart({
    getPlayer: () => anchor, getHorde: () => horde
  })`);
  completed.run(`nexusEraBridgeOnHordeEnd({
    getPlayer: () => replacement, getHorde: () => horde, wasCommand: () => false
  })`);
  assert.equal(completed.data.getBoolean('nexusHordeActive'), true,
    'replacement player completed the native owner session');
  assert.equal(completed.run('nexusEraCompleteHorde(anchor)'), false,
    'unguarded completion command bypassed Director victory');
  assert.equal(completed.run(`nexusEraAuthorizeCompletion(
    horde, anchor, data.getString('nexusHordeSessionId'))`), true);
  assert.equal(completed.run(`nexusEraCompleteHorde(
    replacement, String(anchor.uuid), data.getString('nexusHordeSessionId'))`), false,
  'non-owner consumed an authorized completion session');
  completed.run(`nexusEraBridgeOnHordeEnd({
    getPlayer: () => anchor, getHorde: () => horde, wasCommand: () => false
  })`);
  assert.equal(completed.data.getBoolean('nexusHordeActive'), false);
  assert.equal(completed.data.getInt('nexusHordeThreatDay'), -1);
  assert.equal(completed.data.getInt('nexusMaxHordeThreatDay'), 100);
  assert.equal(completed.data.getInt('nexusLastHordeRewardedCount'), 2);
  const rewardCommands = completed.server.commands.filter(command => command.startsWith('give '));
  assert.equal(rewardCommands.length, 2);
  completed.run(`nexusEraBridgeOnHordeEnd({
    getPlayer: () => replacement, getHorde: () => horde, wasCommand: () => false
  })`);
  assert.equal(completed.server.commands.filter(command => command.startsWith('give ')).length,
    rewardCommands.length, 'duplicate HordeEnd rewarded twice');

  const unauthorized = fixture({ nexusEra: 3 });
  const unauthorizedAnchor = {
    uuid: '123e4567-e89b-12d3-a456-426614174019',
    level: unauthorized.level,
    getServer: () => unauthorized.server,
    getGameProfile: () => ({ getName: () => 'Unauthorized' }),
    getX: () => 0, getY: () => 64, getZ: () => 0,
    distanceToSqr: () => 0,
    tell: () => {},
  };
  const unauthorizedHorde = {
    equals: other => other === unauthorizedHorde,
    getSpawnTable: () => ({ getName: () => 'nexus:era3_chaos' }),
  };
  unauthorized.server.players = [unauthorizedAnchor];
  Object.assign(unauthorized.context, { unauthorizedAnchor, unauthorizedHorde });
  unauthorized.run(`nexusEraClaimGlobalHorde(data, unauthorizedAnchor, 100, [unauthorizedAnchor],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  unauthorized.run(`nexusEraPendingStart = {
    playerId: String(unauthorizedAnchor.uuid), player: unauthorizedAnchor, horde: null,
    eventObserved: false, currentDay: 100, deadlineAtTick: 100
  }`);
  unauthorized.run(`nexusEraBridgeOnHordeStart({
    getPlayer: () => unauthorizedAnchor, getHorde: () => unauthorizedHorde
  })`);
  unauthorized.run(`nexusEraBridgeOnHordeEnd({
    getPlayer: () => unauthorizedAnchor, getHorde: () => unauthorizedHorde,
    wasCommand: () => false
  })`);
  assert.equal(unauthorized.data.getBoolean('nexusHordeActive'), false,
    'unauthorized native end left the calendar active');
  assert.equal(unauthorized.data.getInt('nexusLastHordeRewardedCount'), 0);
  assert.equal(unauthorized.server.commands.some(command => command.startsWith('give ')), false);

  const rewardFailure = fixture({ nexusEra: 3 });
  const rewardFailureAnchor = {
    uuid: '123e4567-e89b-12d3-a456-426614174018',
    level: rewardFailure.level,
    getServer: () => rewardFailure.server,
    getGameProfile: () => ({ getName: () => 'RewardFailure' }),
    getX: () => 0, getY: () => 64, getZ: () => 0,
    distanceToSqr: () => 0,
    tell: () => {},
  };
  const rewardFailureHorde = {
    equals: other => other === rewardFailureHorde,
    getSpawnTable: () => ({ getName: () => 'nexus:era3_chaos' }),
  };
  rewardFailure.server.players = [rewardFailureAnchor];
  Object.assign(rewardFailure.context, { rewardFailureAnchor, rewardFailureHorde });
  rewardFailure.run(`nexusEraClaimGlobalHorde(data, rewardFailureAnchor, 100, [rewardFailureAnchor],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  rewardFailure.run(`nexusEraPendingStart = {
    playerId: String(rewardFailureAnchor.uuid), player: rewardFailureAnchor, horde: null,
    eventObserved: false, currentDay: 100, deadlineAtTick: 100
  }`);
  rewardFailure.run(`nexusEraBridgeOnHordeStart({
    getPlayer: () => rewardFailureAnchor, getHorde: () => rewardFailureHorde
  })`);
  rewardFailure.run(`nexusEraAuthorizeCompletion(
    rewardFailureHorde, rewardFailureAnchor, data.getString('nexusHordeSessionId'))`);
  rewardFailure.server.runCommandSilent = command => {
    if (command.startsWith('give ')) throw new Error('simulated reward failure');
    return 1;
  };
  assert.equal(rewardFailure.run(`nexusEraCompleteHorde(
    rewardFailureAnchor, String(rewardFailureAnchor.uuid), data.getString('nexusHordeSessionId'))`), true);
  assert.equal(rewardFailure.data.getBoolean('nexusHordeActive'), false,
    'reward delivery exception left the calendar active');
  assert.notEqual(rewardFailure.data.getString('nexusHordeRewardCommittedSession'), '');

  const cancelled = fixture({ nexusEra: 3 });
  const cancelledAnchor = {
    uuid: '123e4567-e89b-12d3-a456-426614174020',
    level: cancelled.level,
    getServer: () => cancelled.server,
    getGameProfile: () => ({ getName: () => 'Cancelled' }),
    getX: () => 0, getY: () => 64, getZ: () => 0,
    distanceToSqr: () => 0,
    tell: () => {},
  };
  const cancelledHorde = {
    equals: other => other === cancelledHorde,
    getSpawnTable: () => ({ getName: () => 'nexus:era3_chaos' }),
  };
  cancelled.server.players = [cancelledAnchor];
  Object.assign(cancelled.context, { cancelledAnchor, cancelledHorde });
  cancelled.run(`nexusEraClaimGlobalHorde(data, cancelledAnchor, 100, [cancelledAnchor],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  cancelled.run(`nexusEraPendingStart = {
    playerId: String(cancelledAnchor.uuid), player: cancelledAnchor, horde: null,
    eventObserved: false, currentDay: 100, deadlineAtTick: 100
  }`);
  cancelled.run(`nexusEraBridgeOnHordeStart({
    getPlayer: () => cancelledAnchor, getHorde: () => cancelledHorde
  })`);
  cancelled.run(`nexusEraBridgeOnHordeEnd({
    getPlayer: () => cancelledAnchor, getHorde: () => cancelledHorde, wasCommand: () => true
  })`);
  assert.equal(cancelled.data.getBoolean('nexusHordeActive'), false);
  assert.equal(cancelled.data.getInt('nexusHordeThreatDay'), -1);
  assert.equal(cancelled.data.getInt('nexusMaxHordeThreatDay'), 100);
  assert.equal(cancelled.data.getInt('nexusLastHordeRewardedCount'), 0);
  assert.equal(cancelled.server.commands.some(command => command.startsWith('give ')), false);
});

test('manual native Horde is never correlated as a Nexus session', () => {
  const f = fixture({ nexusEra: 3 });
  const player = {
    uuid: '123e4567-e89b-12d3-a456-426614174030',
    level: f.level,
    getServer: () => f.server,
    getGameProfile: () => ({ getName: () => 'Manual' }),
    getX: () => 0, getY: () => 64, getZ: () => 0,
  };
  const manual = {
    equals: other => other === manual,
    getSpawnTable: () => ({ getName: () => 'hordes:default' }),
  };
  Object.assign(f.context, { player, manual });
  f.run(`nexusEraBridgeOnHordeStart({
    getPlayer: () => player, getHorde: () => manual
  })`);
  assert.equal(f.run('nexusEraOwnsHorde(manual, player)'), false);
  assert.equal(f.data.getBoolean('nexusHordeActive'), false);

  f.run(`nexusEraClaimGlobalHorde(data, player, 100, [player],
    { table: 'nexus:era3_chaos', name: 'Caos' })`);
  f.run(`nexusEraPendingStart = {
    playerId: String(player.uuid), player: player, horde: null,
    eventObserved: false, currentDay: 100, deadlineAtTick: 100
  }`);
  f.run(`nexusEraBridgeOnHordeStart({
    getPlayer: () => player, getHorde: () => manual
  })`);
  assert.equal(f.run('nexusEraOwnsHorde(manual, player)'), false,
    'wrong native table was appropriated during a Nexus pending window');
});

test('scheduler and diagnosis remain valid at an arbitrary high world day', () => {
  const f = fixture({ nexusEra: 3 });
  f.level.getDayTime = () => 24000 * 2000 + 6000;
  assert.equal(f.run('nexusEraWorldDay(server)'), 2000);
  f.run('nexusEraTryStartScheduledHorde(server)');
  assert.equal(f.data.getInt('nexusNextHordeDay'), 2002);
  const diagnosis = JSON.parse(f.run('JSON.stringify(nexusEraDescribe(server))'));
  assert.ok(diagnosis.some(line => line.includes('dia 2000, base 22')));
  assert.ok(diagnosis.some(line => line.includes('20, 22, 23, 24')));
});

test('all Nexus Horde tables are cumulative, nonempty and day-zero safe', () => {
  const tableDir = path.join(root, 'config/hordes/data/nexus/horde_data/tables');
  const files = fs.readdirSync(tableDir).filter(file => file.endsWith('.json')).sort();
  const targetDays = [0, 15, 29, 30, 59, 60, 89, 90, 119, 120, 159, 160, 219, 220, 500, 2000];
  const parsed = new Map();
  for (const file of files) {
    const entries = JSON.parse(fs.readFileSync(path.join(tableDir, file), 'utf8'));
    parsed.set(file, entries);
    assert.ok(Array.isArray(entries) && entries.length > 0, `${file} is empty`);
    assert.ok(entries.some(entry => entry.first_day === 0), `${file} lacks day-zero fallback`);
    for (const entry of entries) {
      assert.equal(typeof entry.entity, 'string', `${file} entity`);
      assert.ok(entry.entity.includes(':'), `${file} entity id`);
      assert.ok(Number.isFinite(entry.weight) && entry.weight > 0, `${file} weight`);
      assert.ok(Number.isInteger(entry.first_day) && entry.first_day >= 0, `${file} first_day`);
      assert.equal(entry.last_day, 0, `${file} last_day`);
      assert.ok(!Object.hasOwn(entry, 'min_spawns') && !Object.hasOwn(entry, 'max_spawns'),
        `${file} can expand the Director count beyond its cap`);
    }
    for (const day of targetDays) {
      assert.ok(entries.some(entry => entry.first_day <= day), `${file} empty on day ${day}`);
    }
  }

  const calendarTables = JSON.parse(fixture().run(
    'JSON.stringify(Object.values(NEXUS_ERA_HORDE_THEMES).flat().map(theme => theme.table))'
  ));
  for (const id of calendarTables) {
    assert.ok(parsed.has(`${id.split(':')[1]}.json`), `missing calendar table ${id}`);
  }
  for (let era = 1; era <= 4; era++) {
    const finisher = parsed.get(`era${era}_finisher.json`);
    assert.ok(finisher && finisher.some(entry => entry.first_day === 0));
    assert.ok(finisher.every(entry =>
      !Object.hasOwn(entry, 'min_spawns') &&
      !Object.hasOwn(entry, 'max_spawns')
    ), `era${era} finisher can expand a count=1 spawn`);
    const eraEntities = new Set(
      [...parsed.entries()]
        .filter(([file]) => file.startsWith(`era${era}_`) && !file.endsWith('_finisher.json'))
        .flatMap(([, entries]) => entries.map(entry => entry.entity))
    );
    assert.ok(finisher.every(entry => eraEntities.has(entry.entity)),
      `era${era} finisher introduced an unverified or cross-era entity`);
  }
});

test('Director uses explicit kill quota, bounded recovery and owner-safe completion', () => {
  assert.match(directorScript, /NEXUS_HORDE_DIRECTOR_TOTAL_WAVES = 4/);
  assert.match(directorScript, /state\.waveAmounts/);
  assert.match(directorScript, /Math\.min\(\s*24,/);
  assert.match(directorScript, /state\.phase === 'finisher'/);
  assert.match(directorScript, /nexusHordeDirectorNativeBridgeClass\.spawnFinisher\(/);
  assert.match(directorScript, /requiredKills: 0/);
  assert.match(directorScript, /confirmedKills: 0/);
  assert.match(directorScript, /state\.confirmedKills = Math\.min\(state\.requiredKills/);
  assert.equal([...directorScript.matchAll(/state\.confirmedKills = Math\.min/g)].length, 1,
    'confirmedKills has more than one credit path');
  assert.match(directorScript, /state\.creditedDeaths\.has\(entityId\)/);
  assert.match(directorScript, /state\.confirmedKills < state\.requiredKills/);
  assert.match(directorScript, /death_without_credit/);
  assert.match(directorScript, /state\.paused \|\| nexusHordeDirectorValidParticipants/);
  assert.doesNotMatch(directorScript, /alive\.size/);
  assert.match(directorScript, /NEXUS_HORDE_DIRECTOR_MAX_RECOVERY_ATTEMPTS = 12/);
  assert.match(directorScript, /replacement_attempts_exhausted/);
  assert.match(directorScript, /spawn_not_added/);
  assert.match(directorScript, /removed_non_kill/);
  assert.match(directorScript, /unloaded_timeout/);
  assert.match(directorScript, /state\.horde\.stopEvent\(owner, false\)/);
  assert.match(directorScript, /state\.horde\.stopEvent\(owner, true\)/);
  assert.match(directorScript, /authorizeCompletion\(state\.horde, owner, state\.sessionId\)/);
  assert.match(hordeNativeBridgeSource,
    /finally \{\s*invoke\(\s*setSpawnTableMethod,\s*horde,\s*previousTable/);
  assert.match(hordeNativeBridgeSource,
    /finally \{\s*try \{\s*dayField\.setInt\(\s*horde,\s*previousDay/);
  assert.match(directorScript, /NEXUS_HORDE_DIRECTOR_MAX_FINISHER_ATTEMPTS = 3/);
  assert.match(hordesConfig, /hordeSpawnMultiplier = 1\.0\r?$/m);
  assert.match(hordesConfig, /spawnAmount = 15/);
  assert.match(hordesConfig, /hordeSpawnMax = 80/);
  assert.doesNotMatch(presentationScript, /La Horda ha sido derrotada\./);
  assert.match(presentationScript, /'EL NEXUS RESISTE'/);
  assert.match(presentationScript, /snapshot\.remaining/);
  assert.doesNotMatch(presentationScript, /HordeSpawnEntityEvent|LivingDeathEvent|EntityLeaveLevelEvent/);
  assert.doesNotMatch(presentationScript, /\.alive/);
  assert.match(presentationScript, /OLEADA \$\{snapshot\.currentWave\}/);
  assert.match(presentationScript, /ULTIMO PULSO/);
  assert.match(presentationScript, /EN PAUSA · ESPERANDO PARTICIPANTES/);
});

test('Horde guard, global presentation, targeting and solar marker stay scoped', () => {
  assert.doesNotMatch(reentryScript, /\.entrySet\(\)\s*\.iterator\(\)/);
  assert.match(reentryScript, /nexusHordeReentryEventOwners\.get\(horde\)/);
  assert.match(reentryScript, /HordeEndEvent'[\s\S]*?try \{[\s\S]*?catch \(error\)/);

  assert.match(presentationScript,
    /function nexusHordePresentationForEachAudience[\s\S]*?state\.server\.players\.forEach/);
  assert.match(presentationScript, /'MANIFESTACION'/);
  assert.match(presentationScript, /'La grieta se cierra'/);

  assert.match(hordeTargetingSource, /HORDE_MOB_KEY = "nexusHordeMob"/);
  assert.match(hordeTargetingSource,
    /LivingChangeTargetEvent[\s\S]*?event\.setNewTarget\(assigned\)/);
  assert.doesNotMatch(hordeTargetingSource,
    /event\.getNewTarget\(\) instanceof ServerPlayer/);
  assert.match(hordeTargetingSource, /LivingTargetType\.MOB_TARGET/);
  assert.match(hordeTargetingSource, /event\.setCanceled\(true\)/);
  assert.match(hordeTargetingSource, /public static boolean reconcileTarget/);
  assert.match(hordeTargetingSource, /mob\.getTarget\(\) == null/);
  assert.match(hordeTargetingSource, /player\.isCreative\(\)/);
  assert.match(hordeTargetingSource, /player\.isSpectator\(\)/);
  assert.match(hordeTargetingSource, /isPlayerReviveDowned\(player\)/);
  assert.match(hordeTargetingSource, /CENTER_DIMENSION_KEY/);
  assert.match(hordeTargetingSource, /RADIUS_SQR_KEY/);
  assert.match(hordeTargetingSource, /ACTIVE_SESSIONS/);
  assert.match(hordeTargetingSource, /onEntityJoin\(EntityJoinLevelEvent event\)/);
  assert.match(hordeTargetingSource, /HordeNativeBridge\.cleanupNativeMob\(mob, session\)/);
  assert.match(hordeNativeBridgeSource, /session\.equals\([\s\S]*?HordeTargeting\.SESSION_KEY/);
  assert.match(hordeNativeBridgeSource, /HORDE_TRACK_GOAL_CLASS\.equals/);
  assert.match(hordeNativeBridgeSource, /removeModifier\(FOLLOW_RANGE_MODIFIER\)/);
  assert.match(hordeTargetingSource, /public static void setLocatorGlowing/);
  assert.match(hordeTargetingSource, /!mob\.hasGlowingTag\(\)/);
  assert.match(hordeTargetingSource, /setLocatorGlowing\(mob, false\)/);
  assert.ok(hordeTargetingSource.indexOf('if (assigned != null)')
    < hordeTargetingSource.indexOf('new ArrayList<>()'));
  assert.match(directorScript,
    /NEXUS_HORDE_DIRECTOR_TARGET_RECONCILE_TICKS = 20/);
  assert.match(directorScript, /state\.records\.forEach[\s\S]*?reconcileTarget/);
  assert.match(directorScript, /nexusHordeDirectorRemaining\(state\) >= 1[\s\S]*?<= 3/);
  assert.match(directorScript, /NEXUS_HORDE_DIRECTOR_BATTLE_RADIUS_SQR = 16384/);
  assert.match(directorScript, /NEXUS_HORDE_DIRECTOR_ABANDON_TICKS = 6000/);
  assert.match(directorScript, /calendar\.ownsHorde\(event\.getHorde\(\), player\)/);
  assert.match(directorScript, /\[Nexus Horde Lifecycle\]/);
  assert.match(directorScript, /'spawn_requested'/);
  assert.match(directorScript, /'level_added'/);
  assert.match(directorScript, /'death'/);
  assert.match(directorScript, /'level_leave'/);
  assert.match(directorScript, /'level_rejoined'/);
  assert.match(directorScript, /'replacement_requested'/);
  assert.match(script, /nexusHordeSessionId/);
  assert.match(script, /nexusHordeBattleDimension/);
  assert.match(script, /nexusEraAuthorizedCompletionSession/);
  assert.match(script, /NEXUS_ERA_RECOVERY_TIMEOUT_TICKS = 600/);
  assert.match(calendarBridgeScript, /PlayerSleepInBedEvent/);
  assert.match(calendarBridgeScript, /OTHER_PROBLEM/);
  assert.match(calendarBridgeScript, /isHordeActive/);
  assert.match(script, /!player\.isCreative\(\)/);
  assert.match(script, /!player\.isSpectator\(\)/);
  assert.match(sunBurnMixinSource, /method = "isSunBurnTick"/);
  assert.match(sunBurnMixinSource, /HordeTargeting\.isNexusHordeMob\(mob\)/);
  assert.doesNotMatch(sunBurnMixinSource,
    /FireResistance|setInvulnerable|ON_FIRE/);
});

test('administrative reset retains active-Horde veto and ordinary set is an explicit override', () => {
  const f = fixture({ nexusEra: 3, nexusHordeActive: true });
  assert.equal(f.run('nexusEraResetProduction(server).status'), 'horde_active');
  assert.equal(f.data.getInt('nexusEra'), 3);
  f.data.putBoolean('nexusHordeActive', false);
  assert.equal(f.run('nexusEraSet(server, 2)'), 'changed');
  assert.equal(f.data.getInt('nexusEra'), 2);
});

console.log(`${checks} offline progression checks passed. Not runtime-tested.`);
