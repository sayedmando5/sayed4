// ============================================================================
//  Sayed & Yasmin: The Endless Odyssey — Global Game Constants
//  Central place for tuning values so levels and the engine stay in sync.
// ============================================================================

export const WORLD = {
  TICK_RATE: 120,   // fixed simulation steps per second (host authoritative)
  MAX_DT: 1 / 20,   // clamp frame delta so tab-switch doesn't explode physics
  GRAVITY: 2400,    // px / s^2
  TERMINAL: 1600,   // max fall speed
};

export const PLAYERS = {
  sayed: {
    id: 'sayed',
    label: 'Sayed',
    name: 'سيد',
    color: '#8ea9c8',      // steel blue (his suit)
    accent: '#2f3f55',     // turtleneck
    skin: '#caa07a',
    hair: '#2b2118',
    W: 30,
    H: 56,
    moveSpeed: 300,
    accel: 2200,
    friction: 2400,
    jumpVel: 760,
    jumpCount: 1,          // single jump — he is grounded and strong
    doubleJump: false,
    weight: 2,             // heavy -> triggers heavy plates, can smash
    throwPower: 720,
    strong: true,
    carrySpeed: 190,
  },
  yasmin: {
    id: 'yasmin',
    label: 'Yasmin',
    name: 'ياسمين',
    color: '#a8679d',      // plum / lavender (her dress)
    accent: '#5a2749',     // hijab
    skin: '#e8c3a0',
    hijab: '#5a2749',
    W: 28,
    H: 54,
    moveSpeed: 320,
    accel: 2400,
    friction: 2500,
    jumpVel: 730,
    jumpCount: 2,          // double jump — she is agile
    doubleJump: true,
    weight: 1,             // light -> triggers light plates
    throwPower: 0,         // cannot throw; she is the one being thrown
    strong: false,
  },
};

// Collision layers
export const SOLID = 1;      // blocks movement (AABB)
export const ONEWAY = 2;     // only land from above
export const HAZARD = 4;     // kills on touch
export const SENSOR = 8;     // trigger volume (no physical collision)

// Player states
export const PS = {
  idle: 'idle',
  run: 'run',
  jump: 'jump',
  fall: 'fall',
  carry: 'carry',
  throww: 'throw',
  hack: 'hack',
  pull: 'pull',
  death: 'death',
  win: 'win',
};

// Broad entity type constants (keys used by level data + engine)
export const ENT = {
  PLATFORM: 'platform',
  MOVING: 'moving',
  ONEWAY: 'oneway',
  SPRING: 'spring',
  CONVEYOR: 'conveyor',
  CRUMBLE: 'crumble',
  ICE: 'ice',
  DOOR: 'door',
  LEVER: 'lever',
  HACK: 'hack',
  PLATE: 'plate',
  LASER: 'laser',
  LIGHTBEAM: 'lightbeam',
  CRATE: 'crate',
  HEAVYCRATE: 'heavycrate',
  KEY: 'key',
  GATE: 'gate',
  PORTAL: 'portal',
  TELEPORT: 'teleport',
  CHECKPOINT: 'checkpoint',
  COIN: 'coin',
  STAR: 'star',
  HINT: 'hint',
  SPRINGBOARD: 'spring',
  FAN: 'fan',
  SPIKE: 'spike',
  ENEMY: 'enemy',
  TARGET: 'target',
  BUTTON: 'button',
  TRIGGER: 'trigger',
  BOSS: 'boss',
};

export const COLORS = {
  bgTop: '#0a1220',
  bgBottom: '#1b2b46',
  deep: '#0d1524',
};

export const MOVE_HINT_DIST = 70; // px radius for interact proximity
