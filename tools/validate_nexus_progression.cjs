// Offline regression checks against the actual KubeJS script with server doubles.
// This does not validate Forge players, Rhino interop, networking or Minecraft UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'kubejs/server_scripts/nexus_era_calendar.js'), 'utf8');
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
  return { data, events, server, config, context, logs, run };
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

test('administrative reset retains active-Horde veto and ordinary set is an explicit override', () => {
  const f = fixture({ nexusEra: 3, nexusHordeActive: true });
  assert.equal(f.run('nexusEraResetProduction(server).status'), 'horde_active');
  assert.equal(f.data.getInt('nexusEra'), 3);
  f.data.putBoolean('nexusHordeActive', false);
  assert.equal(f.run('nexusEraSet(server, 2)'), 'changed');
  assert.equal(f.data.getInt('nexusEra'), 2);
});

console.log(`${checks} offline progression checks passed. Not runtime-tested.`);
