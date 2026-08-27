// ============================================================================
//  ENGINE — Sayed & Yasmin: The Endless Odyssey
//  A custom, dependency-free 2D physics + game logic layer on top of Canvas 2D.
//  HOST-AUTHORITATIVE model: the host steps the simulation with a fixed
//  timestep and broadcasts a snapshot; guests interpolate. Guests send only
//  their input. This makes co-op deterministic and robust on WebRTC.
// ============================================================================
import { WORLD, PLAYERS, SOLID, ONEWAY, SENSOR, ENT } from './constants.js';
import { getLevel } from './levels/index.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

// ----------------------------------------------------------------------------
//  Input state
// ----------------------------------------------------------------------------
export function makeInput(id) {
  return {
    id,
    left: false,
    right: false,
    jump: false,        // held
    jumpPressed: false, // edge
    interact: false,    // edge
    throw: false,       // edge
  };
}

// ----------------------------------------------------------------------------
//  AABB helpers
// ----------------------------------------------------------------------------
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ----------------------------------------------------------------------------
//  THE GAME
// ----------------------------------------------------------------------------
export class Game {
  constructor(defs) {
    this.defs = defs;                       // { levelIndex, role, onEvent, ctx, canvas, mode }
    this.levelIndex = defs.levelIndex ?? 0;
    this.role = defs.role ?? 'host';        // 'host' | 'guest'
    this.mode = defs.mode ?? 'online';      // 'online' | 'local'
    this.onEvent = defs.onEvent || (() => {});
    this.ctx = defs.ctx;
    this.canvas = defs.canvas;
    this.zoom = defs.zoom || 1;
    this.avatars = defs.avatars || {};
    this.sprites = defs.sprites || {};
    this.animT = 0;

    this.reset();
  }

  reset() {
    const lvl = getLevel(this.levelIndex);
    this.level = lvl;
    this.WORLD_H = lvl.size.h;
    this.WORLD_W = lvl.size.w;

    this.time = 0;
    this.events = [];           // event queue drained each frame
    this.paused = this.mode === 'online' && this.role === 'guest' && !this.ready;

    // instantiate entities
    this.platforms = (lvl.platforms || []).map((p) => ({ ...p, base: p }));
    // Give every object a stable unique key so the host→guest snapshot can
    // match them one-to-one (coins, crates, plates, doors, lasers…).
    this.objects = (lvl.objects || []).map((o, i) => {
      const id = o.id || `obj-${i}`;
      return { ...o, _i: i, _key: `${o.type}:${id}`, id: (o.id || id), spawn: { ...o } };
    });
    // The level's goal lives at the top level, but the win scanner looks in
    // `objects` — inject it so the win condition can actually fire.
    if (lvl.goal) this.objects.push({ ...lvl.goal, _i: -1, _key: `goal`, id: 'goal', spawn: { ...lvl.goal } });
    this.coins = (lvl.coins || []).map((c, i) => ({ ...c, id: c.id || `coin-${i}` }));
    this.stars = (lvl.stars || []).map((s, i) => ({ ...s, id: s.id || `star-${i}` }));
    this.hints = (lvl.hints || []).map((h) => ({ ...h }));
    this.decor = (lvl.decorations || []).map((d) => ({ ...d }));

    // per-level derived spawn points
    this.spawn = {
      sayed: { x: lvl.spawn.sayed.x, y: lvl.spawn.sayed.y, vx: 0, vy: 0 },
      yasmin: { x: lvl.spawn.yasmin.x, y: lvl.spawn.yasmin.y, vx: 0, vy: 0 },
    };
    this.checkpoint = { x: 0, y: this.level.spawn.sayed.y };

    // players
    this.players = {};
    this.lives = { sayed: 3, yasmin: 3 };
    for (const id of ['sayed', 'yasmin']) {
      const cfg = PLAYERS[id];
      this.players[id] = {
        id,
        cfg,
        x: this.spawn[id].x,
        y: this.spawn[id].y,
        w: cfg.W,
        h: cfg.H,
        vx: 0,
        vy: 0,
        facing: 1,
        grounded: false,
        jumps: 0,
        state: 'idle',
        alive: true,
        respawnT: 0,
        beingThrown: 0,     // ticks remaining thrown
        thrower: null,
        carried: null,      // id of object being carried (none in v1)
        onMoving: null,
        lastPlate: null,
      };
    }

    // boss
    this.boss = lvl.boss ? this._makeBoss(lvl.boss) : null;
    this.bossMax = this.boss ? this.boss.hp : 3;

    // dynamic runtime flags
    this.bridgeBodies = {};   // id -> platform body for spawned bridges
    this.activeBridge = {};   // id -> reference to lighting state
    this.sensors = this._buildSensors();

    this.cam = { x: 0, y: 0 };
    this.dirty = true;
  }

  _makeBoss(b) {
    return {
      type: b.type || 'golem',
      x: b.x, y: b.y, w: b.w, h: b.h,
      hp: b.hp ?? 3,
      shield: true,
      shieldT: 0,
      shootT: 0,
      shieldCycle: b.shieldCycle ?? 2.6,
      shootEvery: b.shootEvery ?? 1.4,
      vx: 0, vy: 0,
      orbs: [],
      dead: false,
      hitFlash: 0,
    };
  }

  _buildSensors() {
    // converts behaviours that need proximity checks into a queryable list
    return {
      plates: this.objects.filter((o) => o.type === 'plate'),
      crates: this.objects.filter((o) => o.type === 'crate' || o.type === 'heavycrate'),
    };
  }

  // ---- public API ----------------------------------------------------------
  getSnapshot() {
    return {
      t: this.time,
      pS: this._playerSnap('sayed'),
      pY: this._playerSnap('yasmin'),
      lives: this.lives,
      objects: this._objectsSnap(),
      coins: this.coins.map((c) => ({ id: c.id, taken: c.taken })),
      stars: this.stars.map((s) => ({ id: s.id, taken: s.taken })),
      boss: this.boss ? {
        hp: this.boss.hp, dead: this.boss.dead, x: this.boss.x, y: this.boss.y,
        shield: this.boss.shield,
        orbs: this.boss.orbs.map((o) => ({ x: o.x, y: o.y })),
      } : null,
      checkpoint: this.checkpoint,
      level: this.levelIndex,
      worldW: this.WORLD_W,
      worldH: this.WORLD_H,
      platforms: this.platforms.map((p) => ({ x: p.x, y: p.y })),
    };
  }

  _playerSnap(id) {
    const p = this.players[id];
    return { id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing, state: p.state, grounded: p.grounded, alive: p.alive };
  }

  _objectsSnap() {
    return this.objects
      .filter((o) => o.type !== 'decor')
      .map((o) => ({
        key: o._key,
        type: o.type,
        x: o.x, y: o.y, w: o.w, h: o.h,
        open: o.open, active: o.active, pressed: o.pressed,
        hacked: o.hacked, pulled: o.pulled, taken: o.taken, dead: o._dead,
        fall: o._fall, crumbleT: o._crumbleT,
        _on: o._on,
        vy: o.vy, vx: o.vx,
      }));
  }

  applySnapshot(snap) {
    // cross-level transition: rebuild the guest world to match the host
    if (snap.level != null && snap.level !== this.levelIndex) {
      this.levelIndex = snap.level;
      this.reset();
    }
    this.time = snap.t;
    // sync moving platform positions
    if (Array.isArray(snap.platforms)) {
      for (let i = 0; i < this.platforms.length; i++) {
        const sp = snap.platforms[i];
        if (sp) { this.platforms[i].x = sp.x; this.platforms[i].y = sp.y; }
      }
    }
    for (const id of ['sayed', 'yasmin']) {
      const p = this.players[id];
      const s = snap[id === 'sayed' ? 'pS' : 'pY'];
      p.x = s.x; p.y = s.y; p.vx = s.vx; p.vy = s.vy; p.facing = s.facing;
      p.state = s.state; p.grounded = s.grounded; p.alive = s.alive;
    }
    this.lives = snap.lives;
    this.checkpoint = snap.checkpoint;
    const map = {};
    for (const o of snap.objects) map[o.key] = o;   // one snapshot per key
    for (const obj of this.objects) {
      const o = map[obj._key];
      if (o) {
        obj.open = o.open; obj.active = o.active; obj.pressed = o.pressed;
        obj.hacked = o.hacked; obj.pulled = o.pulled; obj._dead = o.dead;
        obj._fall = o.fall; obj._crumbleT = o.crumbleT; obj._on = o._on;
        obj.x = o.x; obj.y = o.y; obj.vx = o.vx; obj.vy = o.vy;
      }
    }
    for (const c of this.coins) {
      const s = snap.coins.find((x) => x.id === c.id);
      if (s) c.taken = s.taken;
    }
    for (const s of this.stars) {
      const g = snap.stars.find((x) => x.id === s.id);
      if (g) s.taken = g.taken;
    }
    if (this.boss && snap.boss) {
      this.boss.hp = snap.boss.hp; this.boss.dead = snap.boss.dead;
      this.boss.x = snap.boss.x; this.boss.y = snap.boss.y; this.boss.shield = snap.boss.shield;
      this.boss.orbs = (snap.boss.orbs || []).map((o) => ({ x: o.x, y: o.y, vx: 0, vy: 0, t: 0 }));
    }
    // Rebuild the guest-side light-bridge registry from the synced objects so
    // bridges (and their platforms) appear/disappear like on the host.
    this.activeBridge = {};
    for (const o of this.objects) {
      if (o.type === 'lightbeam' && o.active) {
        const bw = o.bridgeW || o.w;
        const bx = o.bridgeX != null ? o.bridgeX : o.x;
        const by = o.bridgeY != null ? o.bridgeY : o.y;
        o._bridge = { x: bx, y: by, w: bw, h: 16 };
        this.activeBridge[o.id || o._key] = { active: true, _bridge: o._bridge };
      } else if (o.type === 'lightbeam') {
        o._bridge = null;
      }
    }
  }

  setPeer() {
    this.ready = true;
  }

  setPaused(v) {
    this.paused = v;
  }

  // ---- per-player input application ---------------------------------------
  applyInput(id, input) {
    this.players[id]._input = input;
  }

  // ---- simulation step ----------------------------------------------------
  step(dt, inputs) {
    if (this.paused) return;
    this.time += dt;
    this._updatePlatforms(dt);
    this._updateBoss(dt);
    for (const id of ['sayed', 'yasmin']) {
      const p = this.players[id];
      if (!p._input) p._input = makeInput(id);
      if (p.respawnT > 0) { p.respawnT -= dt; if (p.respawnT <= 0) this._respawn(id); continue; }
      if (!p.alive) continue;
      this._updatePlayer(id, p, p._input, dt);
    }
    this._updateObjects(dt);
    this._checkWorld();
    if (this.boss && this.boss._respawnPlatform) this._recomputeBossPlates();
    this.dirty = true;
  }

  // ---- platforms ----------------------------------------------------------
  _updatePlatforms(dt) {
    for (const pl of this.platforms) {
      if (pl.type === 'moving') {
        const b = pl.base;
        this._movePlatform(pl, b, dt);
      }
    }
  }

  _movePlatform(pl, b, dt) {
    // store last pos for carry
    if (pl._x === undefined) { pl._x = pl.x; pl._y = pl.y; }
    if (b.axis === 'x') {
      const range = b.dx || 0;
      const t = (Math.sin(this.time * (b.speed / 60) ) + 1) / 2;
      const nx = b.x + t * range;
      pl.dx = nx - pl.x;
      pl.x = nx;
    } else {
      const range = b.dy || 0;
      const t = (Math.sin(this.time * (b.speed / 60)) + 1) / 2;
      const ny = b.y + t * range;
      pl.dy = ny - pl.y;
      pl.y = ny;
    }
  }

  // dynamic bodies = solid platforms + one-way + standable objects + walls +
  // crates + spawned light bridges
  _solidBodies() {
    const out = [];
    for (const p of this.platforms) {
      if (p.type === 'moving' || p.type === 'platform' || p.type === 'ice' || p.type === 'conveyor') {
        out.push({ x: p.x, y: p.y, w: p.w, h: p.h, kind: 'platform', ref: p });
      } else if (p.type === 'oneway') {
        out.push({ x: p.x, y: p.y, w: p.w, h: p.h, kind: 'oneway', ref: p });
      }
    }
    for (const o of this.objects) {
      // standable/interactive surfaces that live in the objects list
      if (o.type === 'spring' || o.type === 'crumble') {
        if (o.type === 'crumble' && o._fall) continue;
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: 'platform', ref: o });
      } else if (o.type === 'conveyor') {
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: 'platform', ref: o });
      } else if ((o.type === 'door' || o.type === 'gate') && !this._isOpen(o)) {
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: 'wall', ref: o });
      } else if (o.type === 'crate' || o.type === 'heavycrate') {
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: 'crate', ref: o });
      } else if (o.type === 'breakable' && !o._dead) {
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: 'wall', ref: o });
      }
    }
    // spawned light bridges (one-way)
    for (const id in this.activeBridge) {
      const a = this.activeBridge[id];
      if (a.active && a._bridge) {
        out.push({ x: a._bridge.x, y: a._bridge.y, w: a._bridge.w, h: a._bridge.h, kind: 'oneway', ref: a._bridge });
      }
    }
    return out;
  }

  _isOpen(o) {
    if (o.type === 'gate') return o.open;
    if (o.type === 'door') return o.open;
    return false;
  }

  // ---- player -------------------------------------------------------------
  _updatePlayer(id, p, input, dt) {
    const cfg = p.cfg;

    // throw-launched motion
    if (p.beingThrown > 0) {
      p.beingThrown -= dt;
      this._physics(p, input, dt, true);
      return;
    }

    // horizontal control
    const onIce = this._standingOnIce(p);
    let target = 0;
    if (input.left) { target -= cfg.moveSpeed * (cfg.strong ? 1 : 1); }
    if (input.right) { target += cfg.moveSpeed; }

    const accel = onIce ? cfg.accel * 0.15 : cfg.accel;
    const fric = onIce ? cfg.friction * 0.12 : cfg.friction;

    if (target !== 0) {
      p.vx = this._approach(p.vx, target, accel * dt);
      p.facing = target > 0 ? 1 : -1;
    } else {
      p.vx = this._approach(p.vx, 0, fric * dt);
    }

    // conveyor push
    const conv = this._platformUnder(p);
    if (conv && conv.kind === 'platform' && conv.ref.type === 'conveyor') {
      p.vx += conv.ref.dir * conv.ref.speed * dt * 6;
    }

    // fan boost zone (pushes upward when the player is inside the updraft)
    for (const o of this.objects) {
      if (o.type === 'fan') {
        const inZone = p.x + p.w > o.x && p.x < o.x + o.w && p.y < o.y && p.y > o.y - 240;
        if (inZone) { p.vy = Math.min(p.vy, -o.power * 0.4); p.grounded = false; }
      }
    }

    // jumping (with a small input buffer so a tap just before landing still
    // registers — feels responsive like a real platformer)
    if (input.jumpPressed) p._jumpBuffer = 0.12;
    if (p._jumpBuffer !== undefined) {
      p._jumpBuffer -= dt;
      if (p._jumpBuffer <= 0) p._jumpBuffer = undefined;
    }
    const wantJump = p._jumpBuffer !== undefined;
    if (wantJump) {
      if (p.grounded) {
        p.vy = -cfg.jumpVel;
        p.jumps = 1;
        p.grounded = false;
        p._jumpBuffer = undefined;
      } else if (cfg.doubleJump && p.jumps < cfg.jumpCount) {
        p.vy = -cfg.jumpVel * 0.92;
        p.jumps++;
        p._jumpBuffer = undefined;
        this._emit('sfx', 'jump2');
      }
    }

    // interact (lever/hack/target) & throw
    if (input.interact) this._tryInteract(id, p);
    if (input.throw) this._tryThrow(id, p);

    this._physics(p, input, dt, false);
    this._updateState(p);
  }

  _approach(v, target, step) {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return v;
  }

  _platformUnder(p) {
    // find a solid platform the player stands on (feet near its top)
    const feet = p.y + p.h;
    for (const b of this._solidBodies()) {
      if (b.kind !== 'oneway' && b.kind !== 'platform') continue;
      // not oneway bodies
      const on = p.x + p.w > b.x + 2 && p.x < b.x + b.w - 2;
      if (on && Math.abs(feet - b.y) < 10) return b;
    }
    return null;
  }

  _standingOnIce(p) {
    const feet = p.y + p.h;
    for (const pl of this.platforms) {
      if (pl.type !== 'ice') continue;
      if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && Math.abs(feet - pl.y) < 10) return true;
    }
    return false;
  }

  _physics(p, input, dt, thrown) {
    const cfg = p.cfg;
    p.vy += WORLD.GRAVITY * dt;
    if (p.vy > WORLD.TERMINAL) p.vy = WORLD.TERMINAL;

    const bodies = this._solidBodies();

    // --- X axis ---
    p.x += p.vx * dt;
    for (const b of bodies) {
      if (b.kind === 'oneway') continue;
      if (overlaps(p, b)) {
        if (p.vx > 0 && p.x + p.w - p.vx * dt <= b.x + 2) { p.x = b.x - p.w; p.vx = 0; this._pushCrates(p, b, 1, dt); }
        else if (p.vx < 0 && p.x - p.vx * dt >= b.x + b.w - 2) { p.x = b.x + b.w; p.vx = 0; this._pushCrates(p, b, -1, dt); }
      }
    }

    // --- Y axis ---
    p.y += p.vy * dt;
    p.grounded = false;
    for (const b of bodies) {
      if (overlaps(p, b)) {
        const oneway = b.kind === 'oneway';
        if (p.vy > 0 && p.y + p.h - p.vy * dt <= b.y + 6) {
          if (!oneway || (p.vy > 0)) {
            p.y = b.y - p.h;
            p.vy = 0;
            p.grounded = true;
            p.jumps = 0;
            if (b.kind === 'platform' && b.ref && (b.ref.type === 'moving' || b.ref.type === 'conveyor')) {
              this._carry(p, b.ref, dt);
            }
            if (b.kind === 'platform' && b.ref && b.ref.type === 'spring') {
              p.vy = -b.ref.power;
              this._emit('sfx', 'spring');
            }
            // crumble
            if (b.kind === 'platform' && b.ref && b.ref.type === 'crumble') {
              this._crumbleStart(b.ref, p);
            }
          }
        } else if (p.vy < 0 && p.y - p.vy * dt >= b.y + b.h - 6) {
          if (!oneway) { p.y = b.y + b.h; p.vy = 0; }
        }
      }
    }
    // walls (doors/gates) block horizontally fully
    for (const b of bodies) {
      if (b.kind !== 'wall') continue;
      if (overlaps(p, b)) {
        // resolve against its narrower dimension
        const cx = p.x + p.w / 2, bx = b.x + b.w / 2;
        if (cx < bx) p.x = b.x - p.w; else p.x = b.x + b.w;
      }
    }
  }

  _pushCrates(p, b, dir, dt) {
    if (b.kind !== 'crate') return;
    if (b.ref._heavy) { /* heavy crates only move by Sayed */ if (!p.cfg.strong) return; }
    const c = b.ref;
    if (c._locked) return;
    // push crate along dir
    const step = p.cfg.strong ? 6 : 3;
    const nx = c.x + dir * step;
    // check crate can move (no solid in the way)
    if (!this._crateBlocked(c, nx, dir)) {
      c.x = nx;
      c.vx = dir * 40;
      this._emit('sfx', 'push');
    }
  }

  _crateBlocked(c, nx, dir) {
    const test = { x: nx, y: c.y, w: c.w, h: c.h };
    for (const b of this._solidBodies()) {
      if (b.kind === 'crate' && b.ref === c) continue;
      if (b.kind === 'oneway' || b.kind === 'platform') continue;
      if (overlaps(test, b)) return true;
    }
    return false;
  }

  _carry(p, plat, dt) {
    // move player with the platform's delta
    if (plat.dx) p.x += plat.dx;
    if (plat.dy) p.y += plat.dy;
    if (plat.type === 'conveyor') p.x += plat.dir * plat.speed * dt;
  }

  _crumbleStart(cr, p) {
    if (cr._crumbleT === undefined) cr._crumbleT = cr.delay || 0.8;
  }

  _updateState(p) {
    const cfg = p.cfg;
    if (!p.alive) { p.state = 'death'; return; }
    if (p.beingThrown > 0) { p.state = 'throw'; return; }
    if (!p.grounded) { p.state = p.vy < 0 ? 'jump' : 'fall'; return; }
    if (Math.abs(p.vx) > 20) { p.state = 'run'; return; }
    p.state = 'idle';
  }

  // ---- interactions -------------------------------------------------------
  _tryInteract(id, p) {
    const reach = 78;
    for (const o of this.objects) {
      // levers (Sayed pulls)
      if (o.type === 'lever' && !o.pulled && this._near(o, p, reach)) {
        if (p.cfg.strong) {
          o.pulled = true;
          this._emit('sfx', 'lever');
          this._activateConnected(o);
        }
      }
      // hack terminals (Yasmin)
      if (o.type === 'hack' && !o.hacked && this._near(o, p, reach)) {
        if (o.who ? o.who === p.id : !p.cfg.strong) {
          o.hacked = true;
          this._emit('sfx', 'hack');
          this._activateConnected(o);
        }
      }
      // breakable crates (Sayed smashes them) → spawn a coin & clear the path
      if (o.type === 'breakable' && !o._dead && this._near(o, p, reach)) {
        if (p.cfg.strong) {
          o._dead = true;
          this._emit('sfx', 'break');
          this._emit('coop', 'sayed_broke_a_crate');
          // drop a coin where the crate was so smashing rewards you
          this.coins.push({ ...o, type: undefined, id: `coin-brk-${o._i}`, x: o.x + o.w / 2 - 10, y: o.y - 26, w: 20, h: 20, taken: false });
        }
      }
    }
  }

  _near(o, p, dist) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    return Math.hypot(cx - px, cy - py) < dist;
  }

  _tryThrow(id, p) {
    const otherId = id === 'sayed' ? 'yasmin' : 'sayed';
    const o = this.players[otherId];
    if (!p.cfg.strong || !o || !o.alive) return;
    // must be close and Sayed only
    if (this._near({ x: o.x, y: o.y, w: o.w, h: o.h }, p, 90)) {
      o.beingThrown = 0.7;
      o.thrower = p.id;
      o.vy = -p.cfg.throwPower;
      o.vx = p.facing * p.cfg.throwPower * 0.9;
      o.facing = p.facing;
      this._emit('sfx', 'throw');
      this._emit('coop', 'sayed_throws_yasmin');
    }
  }

  _activateConnected(o) {
    const conns = o.connected || [];
    for (const id of conns) {
      const target = this.objects.find((q) => q.id === id);
      if (target) {
        if (target.type === 'door' || target.type === 'gate') target.open = true;
        if (target.type === 'lightbeam' || target.type === 'lightbeam') this._refreshBeam(id);
      }
      this._emit('object', { id, method: 'activate' });
    }
    this.dirty = true;
  }

  // ---- objects ------------------------------------------------------------
  _updateObjects(dt) {
    for (const o of this.objects) {
      switch (o.type) {
        case 'plate': this._updatePlate(o, dt); break;
        case 'crate': case 'heavycrate': this._updateCrate(o, dt); break;
        case 'crumble': this._updateCrumble(o, dt); break;
        case 'laser': this._updateLaser(o, dt); break;
        case 'enemy': this._updateEnemy(o, dt); break;
        case 'lightbeam': this._refreshBeam(o.id); break;
      }
    }
  }

  _updateEnemy(o, dt) {
    if (o._t === undefined) o._t = 0;
    o._t += dt * (o.speed / 100);
    const base = o.spawn || o;
    if (o.kind === 'flyer') {
      o.y = base.y + Math.sin(o._t * 2) * ((o.range || 120) / 2);
      o.x = base.x;   // hover in place, bob vertically
    } else {
      o.x = base.x + Math.sin(o._t * 2) * ((o.range || 120) / 2);
      o.y = base.y;   // patrol horizontally on the ground
    }
  }

  _updatePlate(o, dt) {
    if (o._locked && o.active) { o.pressed = true; return; }
    let pressing = false;
    // players
    for (const id of ['sayed', 'yasmin']) {
      const p = this.players[id];
      if (!p.alive) continue;
      if (o.who && o.who !== id) continue;
      if (this._onPlate(p, o)) pressing = true;
    }
    // crates
    for (const c of this.sensors.crates) {
      if (this._onPlate(c, o)) pressing = true;
    }
    o.pressed = pressing;
    o.active = pressing;
    if (pressing && !o._wasPressed) {
      this._emit('sfx', 'plate');
      this._activateConnected(o);
      if (o.latch) o._locked = true;
    }
    o._wasPressed = pressing;
    // if connected to a beam, refresh now that plate may have changed
    const conns = o.connected || [];
    if (conns.some((c) => this.objects.find((q) => q.id === c && q.type === 'lightbeam'))) {
      for (const c of conns) this._refreshBeam(c);
    }
  }

  _onPlate(p, o) {
    // A plate is a thin pad that sits ON the ground. Entities stand on the
    // ground (feet = plate bottom), so accept feet anywhere within the plate's
    // vertical extent plus a small tolerance, and require the horizontal centre
    // to be over the plate.
    const cx = p.x + p.w / 2;
    const feet = p.y + p.h;
    return cx > o.x - 8 && cx < o.x + o.w + 8 && feet > o.y - 22 && feet < o.y + o.h + 22;
  }

  _updateCrate(o, dt) {
    if (o._onPlateOf) return;
    o.vy = (o.vy || 0) + WORLD.GRAVITY * dt;
    if (o.vy > WORLD.TERMINAL) o.vy = WORLD.TERMINAL;
    const prevY = o.y;
    o.y += o.vy * dt;
    // floor collision
    for (const b of this._solidBodies()) {
      if (b.kind === 'crate' && b.ref === o) continue;
      if (overlaps(o, b)) {
        if (o.vy > 0 && prevY + o.h <= b.y + 6) { o.y = b.y - o.h; o.vy = 0; }
      }
    }
  }

  _updateCrumble(o, dt) {
    if (o._crumbleT === undefined) return;
    o._crumbleT -= dt;
    o._shake = true;
    if (o._crumbleT <= 0) {
      o._fall = true;
      o._crumbleT = undefined;
      this._emit('sfx', 'crumble');
    }
  }

  _updateLaser(o, dt) {
    if (!o.cycles) return;
    const t = (this.time + (o.offset || 0)) % (o.period || 1);
    o._on = t < (o.period || 1) * 0.5;
  }

  _refreshBeam(id) {
    const beam = this.objects.find((q) => (q.id || q._i) === id && q.type === 'lightbeam');
    if (!beam) return;
    // a light beam lights up when ALL of its sources (objects whose `connected`
    // array includes this beam id) are satisfied simultaneously
    const sources = this.objects.filter(
      (o) => ['plate', 'hack', 'lever'].includes(o.type) && (o.connected || []).includes(id)
    );
    let satisfied = sources.length > 0;
    for (const s of sources) {
      if (s.type === 'plate' && !s._locked && !s.pressed) satisfied = false;
      if (s.type === 'hack' && !s.hacked) satisfied = false;
      if (s.type === 'lever' && !s.pulled) satisfied = false;
    }
    beam.active = satisfied;
    if (beam.active) {
      const bw = beam.bridgeW || beam.w;
      const bx = beam.bridgeX != null ? beam.bridgeX : beam.x;
      const by = beam.bridgeY != null ? beam.bridgeY : beam.y;
      beam._bridge = { x: bx, y: by, w: bw, h: 16 };
    } else {
      beam._bridge = null;
    }
    if (beam.active && !this.activeBridge[id]) this._emit('sfx', 'beam');
    this.activeBridge[id] = beam;
  }

  _checkWorld() {
    // player fell out of world / touched a hazard (unless they stomped)
    for (const id of ['sayed', 'yasmin']) {
      const p = this.players[id];
      if (!p.alive) continue;
      const below = p.y > this.WORLD_H + 60;
      if (below) { this._kill(id, 'fall'); continue; }
      // stomp (jump onto an enemy's head) → defeat it & bounce instead of dying
      for (const o of this.objects) {
        if (o.type === 'enemy' && !o._dead && overlaps(p, o)) {
          const pCenterY = p.y + p.h / 2;
          const eCenterY = o.y + o.h / 2;
          if (p.vy > 0 && pCenterY < eCenterY) {
            o._dead = true;
            p.vy = -680;
            this._emit('sfx', 'stomp');
            this._emit('coop', 'stomp');
            break;
          }
        }
      }
      const touch = this._touchHazard(p);
      if (touch) this._kill(id, touch);
    }
  }

  _touchHazard(p) {
    const body = p;
    for (const o of this.objects) {
      if (o.type === 'spike' && overlaps(body, o)) return 'spike';
      if (o.type === 'laser' && o._on !== false && overlaps(body, o)) return 'laser';
      if (o.type === 'enemy' && !o._dead && overlaps(body, o)) {
        // if the player is falling onto the top we already stomped (no wait);
        // otherwise it hurts
        return 'enemy';
      }
    }
    if (this.boss && !this.boss.dead && overlaps(body, this.boss)) return 'boss';
    return null;
  }

  _kill(id, why) {
    const p = this.players[id];
    p.alive = false;
    p.state = 'death';
    p.vx = 0; p.vy = 0;
    this.lives[id]--;
    this._emit('sfx', 'die');
    this._emit('toast', `${PLAYERS[id].name} سقط! ${this.lives[id]} محاولات متبقية`);
    if (this.lives[id] <= 0) {
      this._emit('gameover');
      return;
    }
    p.respawnT = 1.0;
  }

  _respawn(id) {
    const p = this.players[id];
    const spawn = this.checkpoint.y === 0 && this.levelIndex === this.level.index
      ? this.checkpoint
      : { x: this.checkpoint.x, y: this.checkpoint.y };
    p.x = this.checkpoint.x;
    p.y = this.checkpoint.y - 4;
    p.vx = 0; p.vy = 0;
    p.alive = true;
    p.state = 'idle';
    p.respawnT = 0;
  }

  // ---- boss ---------------------------------------------------------------
  _updateBoss(dt) {
    if (!this.boss || this.boss.dead) return;
    const b = this.boss;
    b.hitFlash = Math.max(0, b.hitFlash - dt);

    // shield cycle
    b.shieldT += dt;
    if (b.shieldT >= b.shieldCycle) {
      b.shield = !b.shield;
      b.shieldT = 0;
      this._emit('sfx', b.shield ? 'bossbarrier' : 'bossdown');
    }

    // projectiles
    b.shootT += dt;
    if (b.shootT >= b.shootEvery) {
      b.shootT = 0;
      b.orbs.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: rand(-120, 120), vy: rand(80, 200), t: 0 });
      this._emit('sfx', 'shoot');
    }

    // move orbs
    for (let i = b.orbs.length - 1; i >= 0; i--) {
      const o = b.orbs[i];
      o.x += o.vx * dt; o.y += o.vy * dt; o.t += dt;
      // hurt players
      for (const id of ['sayed', 'yasmin']) {
        const p = this.players[id];
        if (p.alive && overlaps(p, { x: o.x - 8, y: o.y - 8, w: 16, h: 16 })) {
          this._kill(id, 'orb');
          b.orbs.splice(i, 1);
          break;
        }
      }
      if (b.orbs[i] && (b.orbs[i].t > 3 || b.orbs[i].y > this.WORLD_H)) b.orbs.splice(i, 1);
    }

    // boss-hit plates (both must be pressed simultaneously while shield down)
    let leftP = false, rightP = false;
    for (const o of this.objects) {
      if (o.type === 'plate' && o.bossHit) {
        for (const id of ['sayed', 'yasmin']) {
          const p = this.players[id];
          if (p.alive && this._onPlate(p, o)) {
            if (o.x < b.x) leftP = true; else rightP = true;
          }
        }
      }
    }
    if (leftP && rightP && !b.shield && b.hitFlash <= 0) {
      b.hp--;
      b.hitFlash = 1.0;
      this._emit('sfx', 'bossHit');
      this._emit('toast', `الجوليم تأثر! ❤️ ${b.hp}`);
      if (b.hp <= 0) {
        b.dead = true;
        b.orbs = [];
        this._emit('sfx', 'bossDie');
        this._emit('toast', 'الجوليم سقط! البوابة السماوية فُتحت');
        const gate = this.objects.find((q) => q.id === 'gate-f5');
        if (gate) gate.open = true;
      }
    }
  }

  _recomputeBossPlates() {}

  // ---- collectibles, checkpoints, goal ------------------------------------
  _collectibles() {
    for (const c of this.coins) {
      if (!c.taken) {
        for (const id of ['sayed', 'yasmin']) {
          const p = this.players[id];
          if (p.alive && overlaps(p, c)) { c.taken = true; this._emit('sfx', 'coin'); this._emit('collect', 'coin', id); break; }
        }
      }
    }
    for (const s of this.stars) {
      if (!s.taken) {
        for (const id of ['sayed', 'yasmin']) {
          const p = this.players[id];
          if (p.alive && overlaps(p, s)) { s.taken = true; this._emit('sfx', 'star'); this._emit('collect', 'star', id); break; }
        }
      }
    }
    // checkpoints
    for (const o of this.objects) {
      if (o.type === 'checkpoint' && !o.activated) {
        for (const id of ['sayed', 'yasmin']) {
          const p = this.players[id];
          if (p.alive && overlaps(p, o)) {
            o.activated = true;
            this.checkpoint.x = o.x;
            this.checkpoint.y = o.y + 10;
            this._emit('sfx', 'checkpoint');
            this._emit('coop', 'checkpoint_reached');
            break;
          }
        }
      }
      // teleport
      if (o.type === 'teleport' && !o._cool) {
        for (const id of ['sayed', 'yasmin']) {
          const p = this.players[id];
          if (p.alive && overlaps(p, o)) {
            const pair = this.objects.find((q) => q.type === 'teleport' && q.pairId === o.pairId && q !== o);
            if (pair) {
              p.x = pair.x; p.y = pair.y; p.vx = 0; p.vx = 0;
              o._cool = 1; pair._cool = 1;
              this._emit('sfx', 'teleport');
            }
            break;
          }
        }
      }
      // goal
      if (o.type === 'goal') {
        let allIn = true;
        for (const id of ['sayed', 'yasmin']) {
          const p = this.players[id];
          if (!(p.alive && overlaps(p, o))) allIn = false;
        }
        const require = o.requireBoth !== false;
        if (require && allIn) this._emit('win');
        if (!require && allIn) this._emit('win');
      }
    }
    // hints
    this.activeHint = null;
    for (const h of this.hints) {
      const px = (this.players.sayed.x + this.players.yasmin.x) / 2;
      if (Math.hypot(h.x - px, h.y - this.players.sayed.y) < 130) { this.activeHint = h.text; }
    }
  }

  // ---- update loop wrapper called by renderer ------------------------------
  update(dt, inputs) {
    this.step(dt, inputs);
    this._collectibles();
    // Deliver any queued events to the UI callback (win, gameover, toasts,
    // sfx, collect, coop…) — this is what actually drives the overlays + sound.
    const evs = this.events;
    this.events = [];
    for (const ev of evs) this.onEvent(ev);
  }

  _emit(type, data, extra) {
    this.events.push({ type, data, extra, t: this.time });
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // =========================================================================
  //  RENDERING
  // =========================================================================
  render() {
    this.animT += 0.016;
    this._moveCamera();
    this._drawBackground();
    this._drawDecor();
    this._drawPlatforms();
    this._drawObjects();
    this._drawBoss();
    this._drawCoinsAndStars();
    this._drawPlayers();
  }

  _moveCamera() {
    const midX = (this.players.sayed.x + this.players.yasmin.x) / 2 + 40;
    const midY = (this.players.sayed.y + this.players.yasmin.y) / 2;
    const vw = this.canvas.width / this.zoom;
    const vh = this.canvas.height / this.zoom;
    let tx = midX - vw / 2;
    let ty = midY - vh / 2;
    tx = clamp(tx, 0, Math.max(0, this.WORLD_W - vw));
    ty = clamp(ty, -80, Math.max(0, this.WORLD_H - vh));
    const sm = 0.12;
    this.cam.x = lerp(this.cam.x, tx, sm);
    this.cam.y = lerp(this.cam.y, ty, sm);
  }

  _drawBackground() {
    const ctx = this.ctx;
    const theme = this.level.theme;
    ctx.save();
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // draw within a translate/scale for camera so we can parallax easily
    // We'll draw two parallax layers by manually offsetting.
    ctx.save();
    this._applyCam(0.35, 0);
    this._parallaxLayer(theme, 0.35);
    ctx.restore();

    ctx.save();
    this._applyCam(0.7, 0);
    this._parallaxLayer(theme, 0.7);
    ctx.restore();
  }

  _applyCam(fx, fy) {
    const ctx = this.ctx;
    ctx.translate(-this.cam.x * fx, -this.cam.y * fy);
  }

  _parallaxLayer(theme, layer) {
    const ctx = this.ctx;
    const vw = this.canvas.width / this.zoom;
    const step = 220;
    for (let x = 0; x < this.WORLD_W + vw; x += step) {
      const py = this.WORLD_H - 70 - layer * 40 - (x / step % 3) * 30;
      this._themeShape(theme, x + (layer * 100), py, layer);
    }
  }

  _topColor() {
    switch (this.level.theme) {
      case 'cave': return '#d48a4a';
      case 'temple': return '#e0b878';
      case 'ice': return '#e0f2ff';
      case 'volcano': return '#ff8a4a';
      case 'ruins': return '#b8a8d8';
      case 'sky': return '#9fc0ff';
      default: return '#4ca85a';
    }
  }

  _themeShape(theme, x, y, layer) {
    const ctx = this.ctx;
    const alpha = 0.16;
    ctx.globalAlpha = alpha;
    if (theme === 'forest') {
      ctx.fillStyle = '#2f5a3a';
      ctx.fillRect(x, y, 40, 200);
    } else if (theme === 'cave') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y - 90); ctx.lineTo(x + 40, y); ctx.fill();
    } else if (theme === 'temple') {
      ctx.fillStyle = '#caa06a';
      ctx.fillRect(x, y, 30, 200);
    } else if (theme === 'ice') {
      ctx.fillStyle = '#bfe4ff';
      ctx.fillRect(x, y, 26, 200);
    } else if (theme === 'volcano') {
      ctx.fillStyle = '#ff7a3a';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y - 110); ctx.lineTo(x + 40, y); ctx.fill();
    } else if (theme === 'ruins') {
      ctx.fillStyle = '#8a7aa0';
      ctx.fillRect(x, y, 20, 200);
    } else if (theme === 'sky') {
      ctx.fillStyle = '#9fc0ff';
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#9fc0ff';
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawDecor() {
    const ctx = this.ctx;
    ctx.save();
    this._applyCam(1, 1);
    for (const d of this.decor) {
      const y = this.WORLD_H - 40;
      if (d.kind === 'tree') {
        ctx.fillStyle = '#2c5036';
        ctx.fillRect(d.x - 8, d.y - 140 * d.s, 16, 140 * d.s);
        ctx.fillStyle = '#3d6b47';
        ctx.beginPath(); ctx.arc(d.x, d.y - 150 * d.s, 46 * d.s, 0, Math.PI * 2); ctx.fill();
      } else if (d.kind === 'rock') {
        ctx.fillStyle = '#5a6474';
        ctx.beginPath(); ctx.ellipse(d.x, d.y - 16 * d.s, 34 * d.s, 22 * d.s, 0, 0, Math.PI * 2); ctx.fill();
      } else if (d.kind === 'crystal') {
        ctx.fillStyle = 'rgba(180,120,255,0.85)';
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 14 * d.s, d.y - 50 * d.s); ctx.lineTo(d.x + 28 * d.s, d.y); ctx.fill();
      } else if (d.kind === 'pillar') {
        ctx.fillStyle = '#7a6a55';
        ctx.fillRect(d.x - 14 * d.s, d.y - 150 * d.s, 28 * d.s, 150 * d.s);
      } else if (d.kind === 'glow') {
        const g = ctx.createRadialGradient(d.x, d.y - 20, 0, d.x, d.y - 20, 120 * d.s);
        g.addColorStop(0, 'rgba(255,240,170,0.6)'); g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g; ctx.fillRect(d.x - 130 * d.s, d.y - 150 * d.s, 260 * d.s, 260 * d.s);
      }
    }
    ctx.restore();
  }

  _drawPlatforms() {
    const ctx = this.ctx;
    ctx.save();
    this._applyCam(1, 1);
    for (const pl of this.platforms) {
      let col = '#3a4a5e';
      if (pl.type === 'conveyor') col = '#4a6b8a';
      if (pl.type === 'ice') col = '#bfe6ff';
      if (pl.type === 'oneway') col = '#6a7a8a';
      ctx.fillStyle = col;
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      // themed top strip
      if (pl.type === 'platform') {
        ctx.fillStyle = this._topColor();
        ctx.fillRect(pl.x, pl.y, pl.w, 8);
      }
      // conveyor arrows
      if (pl.type === 'conveyor') {
        ctx.fillStyle = '#cfd8e6';
        for (let x = pl.x; x < pl.x + pl.w; x += 24) ctx.fillRect(x, pl.y + 7, 12, 4);
      }
    }
    // draw spawned bridges
    for (const id in this.activeBridge) {
      const a = this.activeBridge[id];
      if (a.active && a._bridge) {
        const b = a._bridge;
        ctx.fillStyle = 'rgba(255,220,130,0.35)';
        ctx.fillRect(b.x, b.y - 40, b.w, 60);
        ctx.fillStyle = 'rgba(255,225,150,0.95)';
        ctx.fillRect(b.x, b.y, b.w, 12);
        ctx.fillStyle = 'rgba(255,255,220,0.9)';
        ctx.fillRect(b.x, b.y, b.w, 3);
      }
    }
    ctx.restore();
  }

  _drawObjects() {
    const ctx = this.ctx;
    ctx.save();
    this._applyCam(1, 1);
    for (const o of this.objects) {
      this._drawObject(o);
    }
    ctx.restore();
  }

  _drawObject(o) {
    const ctx = this.ctx;
    switch (o.type) {
      case 'door':
        if (!o.open) {
          ctx.fillStyle = '#6a4a2a';
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = '#3a2816';
          ctx.fillRect(o.x + 2, o.y + 6, o.w - 4, o.h - 12);
          this._drawRunes(o);
        }
        break;
      case 'gate':
        if (!o.open) {
          ctx.fillStyle = '#8877cc';
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = '#5a4a99';
          ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
          this._drawRunes(o);
        }
        break;
      case 'plate':
        ctx.fillStyle = o.active ? '#6be07a' : '#5a6474';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(o.x, o.y, o.w, o.h * 0.4);
        break;
      case 'lever': {
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(o.x, o.y + 16, 10, 14);
        ctx.fillStyle = o.pulled ? '#ffce54' : '#c0392b';
        ctx.beginPath(); ctx.arc(o.x + 5, o.y + 8, 7, 0, Math.PI * 2);
        if (o.pulled) ctx.arc(o.x + 12, o.y + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'hack': {
        ctx.fillStyle = '#2b3346'; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = o.hacked ? '#6be07a' : '#ff5a5a'; ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
        ctx.fillStyle = o.hacked ? '#6be07a' : '#ff8a8a';
        ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⌁', o.x + o.w / 2, o.y + o.h / 2 + 4);
        break;
      }
      case 'crate': case 'heavycrate': {
        ctx.fillStyle = o.type === 'heavycrate' ? '#7a5230' : '#c9a86a';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 3;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.beginPath();
        ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.moveTo(o.x + o.w, o.y); ctx.lineTo(o.x, o.y + o.h);
        ctx.stroke();
        break;
      }
      case 'breakable': {
        if (o._dead) break;
        ctx.fillStyle = '#b98a4a';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        // cracks + crossbeam so it reads as "smashable"
        ctx.strokeStyle = '#7a4a20'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x + 8, o.y + 8); ctx.lineTo(o.x + o.w - 6, o.y + o.h - 4);
        ctx.moveTo(o.x + o.w - 8, o.y + 6); ctx.lineTo(o.x + 6, o.y + o.h - 8);
        ctx.stroke();
        // sparkle hint
        ctx.fillStyle = 'rgba(255,230,150,0.9)';
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✦', o.x + o.w / 2, o.y - 3);
        break;
      }
      case 'spike': {
        ctx.fillStyle = '#cfd8e6';
        for (let x = o.x; x < o.x + o.w; x += 16) {
          ctx.beginPath();
          if (o.dir === 'up') { ctx.moveTo(x, o.y + o.h); ctx.lineTo(x + 8, o.y); ctx.lineTo(x + 16, o.y + o.h); }
          else { ctx.moveTo(x, o.y); ctx.lineTo(x + 8, o.y + o.h); ctx.lineTo(x + 16, o.y); }
          ctx.fill();
        }
        break;
      }
      case 'laser': {
        const on = o.cycles ? o._on !== false : true;
        if (on) {
          ctx.fillStyle = '#ff3b3b';
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = 'rgba(255,80,80,0.2)';
          ctx.fillRect(o.x, o.y - 6, o.w, o.h + 12);
        }
        break;
      }
      case 'spring': {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#b9770e'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) ctx.fillRect(o.x + 6, o.y + 3 + i * 4, o.w - 12, 2);
        break;
      }
      case 'fan': {
        ctx.strokeStyle = '#9fc0ff'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, o.y);
          ctx.quadraticCurveTo(o.x + o.w / 2 + (i - 1) * 10, o.y - 24, o.x + o.w / 2 + (i - 1) * 8, o.y - 36);
          ctx.stroke();
        }
        break;
      }
      case 'crumble': {
        ctx.fillStyle = o._shake ? '#b04a3a' : '#8a6a4a';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let x = o.x; x < o.x + o.w; x += 10) ctx.fillRect(x, o.y + o.h - 4, 6, 4);
        break;
      }
      case 'checkpoint': {
        ctx.fillStyle = o.activated ? '#6be07a' : '#8a93a6';
        ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + 10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(o.x + o.w / 2 - 3, o.y + 18, 6, o.h);
        break;
      }
      case 'teleport': {
        ctx.fillStyle = 'rgba(120,80,255,0.3)';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = 'rgba(160,120,255,0.7)';
        ctx.fillRect(o.x + o.w / 2 - 2, o.y, 4, o.h);
        break;
      }
      case 'lightbeam': {
        const on = this.activeBridge[o.id || o._key]?.active;
        ctx.fillStyle = on ? '#ffd76b' : '#6a6a7a';
        ctx.beginPath();
        ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w, o.y);
        ctx.lineTo(o.x + o.w / 2, o.y + 46); ctx.closePath(); ctx.fill();
        break;
      }
      case 'enemy': {
        if (o._dead) break;
        const bob = Math.sin(this.animT * 5 + (o._t || 0)) * 3;
        if (o.kind === 'flyer') {
          ctx.fillStyle = '#8a5fff';
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + o.h);
          ctx.lineTo(o.x + o.w / 2, o.y + bob);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#c9b0ff';
          ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + 4 + bob, 7, 0, Math.PI * 2); ctx.fill();
        } else {
          // slime blob
          ctx.fillStyle = '#5ac86a';
          const sq = 8 + Math.sin(this.animT * 6 + (o._t || 0)) * 2;
          ctx.beginPath();
          ctx.ellipse(o.x + o.w / 2, o.y + o.h - 8, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.arc(o.x + o.w / 2 - 6, o.y + o.h - 14, 3, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'hint': break;
      default:
        break;
    }
  }

  _drawRunes(o) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffd76b';
    ctx.font = '10px serif'; ctx.textAlign = 'center';
    ctx.fillText('✦', o.x + o.w / 2, o.y + o.h / 2);
  }

  _drawCoinsAndStars() {
    const ctx = this.ctx;
    ctx.save(); this._applyCam(1, 1);
    for (const c of this.coins) {
      if (c.taken) continue;
      ctx.fillStyle = '#ffd23f';
      const wob = Math.sin(this.animT * 4 + c.x) * 2;
      ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2 + wob, c.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2 + wob, c.w / 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const s of this.stars) {
      if (s.taken) continue;
      this._star(ctx, s.x + s.w / 2, s.y + s.h / 2, 16, '#ffef9a');
    }
    ctx.restore();
  }

  _star(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.animT * 1.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _drawBoss() {
    if (!this.boss || this.boss.dead) return;
    const ctx = this.ctx;
    ctx.save(); this._applyCam(1, 1);
    const b = this.boss;
    // shield aura
    const pulse = 0.5 + Math.sin(this.animT * 4) * 0.15;
    if (b.shield) {
      ctx.fillStyle = 'rgba(100,80,255,' + (0.25 * pulse) + ')';
      ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(160,140,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = b.hitFlash > 0 ? '#ffd0a0' : '#4a5568';
    ctx.fillRect(b.x, b.y + 40, b.w, b.h - 60);
    // head
    ctx.fillStyle = b.shield ? '#6a7a8a' : '#3a4455';
    ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + 40, b.w * 0.36, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = b.shield ? '#ff5a5a' : '#ffef9a';
    ctx.beginPath(); ctx.arc(b.x + b.w / 2 - 18, b.y + 36, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x + b.w / 2 + 18, b.y + 36, 7, 0, Math.PI * 2); ctx.fill();
    // orbs
    for (const o of b.orbs) {
      ctx.fillStyle = '#ff7a3a';
      ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd0a0';
      ctx.beginPath(); ctx.arc(o.x, o.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // hp bar (dynamic max)
    const max = this.bossMax || 3;
    ctx.fillStyle = '#222'; ctx.fillRect(b.x - 20, b.y - 20, b.w + 40, 10);
    ctx.fillStyle = '#e05a5a'; ctx.fillRect(b.x - 20, b.y - 20, (b.w + 40) * (b.hp / max), 10);
    ctx.restore();
  }

  _drawPlayers() {
    const ctx = this.ctx;
    ctx.save(); this._applyCam(1, 1);
    for (const id of ['sayed', 'yasmin']) {
      const p = this.players[id];
      if (!p.alive) continue;
      this._drawPlayer(p);
    }
    ctx.restore();
  }

  _drawPlayer(p) {
    const ctx = this.ctx;
    const cfg = p.cfg;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h);
    ctx.scale(p.facing, 1);

    // walk/run bob + lean so the single sprite feels alive
    const run = p.state === 'run';
    const airborne = p.state === 'jump' || p.state === 'fall';
    const bob = run ? Math.sin(this.animT * 16) * 2 : 0;
    const lean = run ? 0.05 : 0;
    ctx.rotate(lean);
    ctx.translate(0, bob);

    const sprites = this.sprites || {};
    const spr = sprites[p.id];
    if (spr && spr.complete) {
      // draw the full-body sprite fit to the player's box, anchored at feet
      const targetH = 76;
      const aspect = spr.width / spr.height;
      const w = targetH * aspect;
      const h = targetH;
      ctx.drawImage(spr, -w / 2, -h, w, h);
    } else {
      // fallback stylized body (player collision box is ~30x56)
      // legs (run animation)
      const legA = run ? Math.sin(this.animT * 16) * 6 : 0;
      const legB = run ? -Math.sin(this.animT * 16) * 6 : 0;
      ctx.fillStyle = '#22262e';
      ctx.fillRect(-9, -18, 8, 18 + legA);
      ctx.fillRect(1, -18, 8, 18 + legB);
      // body
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(-12, -18); ctx.lineTo(12, -18); ctx.lineTo(10, -40); ctx.lineTo(-10, -40);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(-10, -40, 20, 7);
      // head
      ctx.fillStyle = cfg.skin;
      ctx.beginPath(); ctx.arc(0, -48, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -48, 15, 0, Math.PI * 2); ctx.stroke();
      if (p.id === 'yasmin') {
        ctx.fillStyle = cfg.hijab;
        ctx.beginPath(); ctx.arc(0, -50, 17, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
      }
    }

    // throw/beingThrown glow
    if (p.beingThrown > 0) {
      ctx.fillStyle = 'rgba(255,220,120,0.3)';
      ctx.beginPath(); ctx.arc(0, -30, 26, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }
}
