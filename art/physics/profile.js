// ======================================================================
//  The player's profile: coins, learning progress, owned creatures.
//  Learning belongs to the PLAYER, never to a creature: switching or trading
//  a creature changes physics in the experiments, not the progress or coins.
//  Saved on the phone (localStorage), versioned, with a coin ledger so the
//  same reward can never be paid twice.
// ======================================================================
const EggProfile = (() => {
  "use strict";
  const KEY = "egg.player";
  const VERSION = 2;
  let p = null;

  const rid = (prefix) => prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function blank() {
    return {
      schema_version: VERSION,
      player_id: rid("player"),
      created_at: new Date().toISOString(),
      wallet: { gold: 0, event_ids: [] },
      active_instance_id: null,
      owned: [],                       // [{ instance_id, species, obtained: "hatch"|"trade"|"dev", at }]
      physics: {
        completed_subtopic_ids: [],
        mastery: {},                   // subtopicId -> { correct, attempts }
        question_history: [],          // [{ id, correct, at }]
        achievements: [],
        path: null                     // "surprise" | "ordered"
      },
      settings: { sound_on: true }
    };
  }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }

  function load() {
    let raw = read(KEY), data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
    if (data && data.schema_version === VERSION) { p = data; return; }
    // first run, or an older save: keep a backup and carry over what existed
    if (raw) write(KEY + ".backup", raw);
    p = blank();
    const oldCreature = read("egg.creature");           // v1 of the egg game kept only this
    if (oldCreature) p.owned.push({ instance_id: rid("c"), species: oldCreature, obtained: "hatch", at: new Date().toISOString() });
    if (p.owned.length) p.active_instance_id = p.owned[0].instance_id;
    save();
  }
  function save() { return write(KEY, JSON.stringify(p)); }

  // ---- coins ----
  // pays once per eventId; returns the new balance, or null if already paid / not saved
  function award(eventId, amount) {
    if (p.wallet.event_ids.includes(eventId)) return null;
    p.wallet.event_ids.push(eventId);
    p.wallet.gold += amount;
    if (!save()) { p.wallet.event_ids.pop(); p.wallet.gold -= amount; return null; }
    return p.wallet.gold;
  }

  // ---- learning ----
  function completeSubtopic(id) {
    if (p.physics.completed_subtopic_ids.includes(id)) return false;
    p.physics.completed_subtopic_ids.push(id);
    save();
    return true;
  }
  function recordAnswer(qid, subtopic, correct) {
    p.physics.question_history.push({ id: qid, correct, at: new Date().toISOString() });
    const m = p.physics.mastery[subtopic] || (p.physics.mastery[subtopic] = { correct: 0, attempts: 0 });
    m.attempts++; if (correct) m.correct++;
    save();
  }
  function achieve(id) { if (p.physics.achievements.includes(id)) return false; p.physics.achievements.push(id); save(); return true; }

  // ---- creatures ----
  function addCreature(species, how) {
    const c = { instance_id: rid("c"), species, obtained: how, at: new Date().toISOString() };
    p.owned.push(c);
    if (!p.active_instance_id) p.active_instance_id = c.instance_id;
    save();
    return c;
  }
  function active() { return p.owned.find((c) => c.instance_id === p.active_instance_id) || null; }
  function setActive(instanceId) { if (p.owned.some((c) => c.instance_id === instanceId)) { p.active_instance_id = instanceId; save(); } }
  // a trade: the active creature leaves, the friend's one arrives and becomes active. Coins and progress stay.
  function tradeActive(newSpecies) {
    const gone = active();
    if (gone) p.owned = p.owned.filter((c) => c.instance_id !== gone.instance_id);
    const c = { instance_id: rid("c"), species: newSpecies, obtained: "trade", at: new Date().toISOString() };
    p.owned.push(c);
    p.active_instance_id = c.instance_id;
    save();
    return c;
  }
  function devOwnAll(speciesList) {
    for (const s of speciesList) if (!p.owned.some((c) => c.species === s)) p.owned.push({ instance_id: rid("c"), species: s, obtained: "dev", at: new Date().toISOString() });
    save();
  }
  // development: a fresh egg, keeping coins and learning
  function devNewEgg() { p.owned = []; p.active_instance_id = null; save(); }

  load();
  return {
    get data() { return p; },
    get gold() { return p.wallet.gold; },
    award, completeSubtopic, recordAnswer, achieve, save,
    addCreature, active, setActive, tradeActive, devOwnAll, devNewEgg,
    owned: () => p.owned.slice()
  };
})();
if (typeof module !== "undefined") module.exports = EggProfile;
