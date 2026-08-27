// ============================================================================
//  Level Builder helpers — make hand-authoring big levels quick & consistent.
//  All coordinate/physics values are tuned against constants.js (gravity 2400,
//  jump ~120px, double-jump ~240px, flat gap ~180px). Keep geometry inside
//  those budgets and every level stays completable by design.
// ============================================================================

export function solid(x, y, w, h, extra = {}) {
  return { type: 'platform', x, y, w, h, ...extra };
}

export function ground(x, w, y = 650, extra = {}) {
  return solid(x, y, w, 140, extra);
}

export function oneway(x, y, w, extra = {}) {
  return { type: 'oneway', x, y, w, h: 16, ...extra };
}

export function movingX(x, y, w, h, dx, speed = 60, extra = {}) {
  return { type: 'moving', x, y, w, h, axis: 'x', dx, speed, ...extra };
}

export function movingY(x, y, w, h, dy, speed = 60, extra = {}) {
  return { type: 'moving', x, y, w, h, axis: 'y', dy, speed, ...extra };
}

export function spring(x, y, w = 48, extra = {}) {
  return { type: 'spring', x, y, w, h: 18, power: 1250, ...extra };
}

export function conveyor(x, y, w, dir = 1, extra = {}) {
  return { type: 'conveyor', x, y, w, h: 18, dir, speed: 150, ...extra };
}

export function crumble(x, y, w, h = 20, extra = {}) {
  return { type: 'crumble', x, y, w, h, delay: 0.8, ...extra };
}

export function ice(x, y, w, h, extra = {}) {
  return { type: 'ice', x, y, w, h, ...extra };
}

export function spike(x, y, w = 32, h = 24, dir = 'up', extra = {}) {
  return { type: 'spike', x, y, w, h, dir, ...extra };
}

export function door(x, y, w = 22, h = 120, extra = {}) {
  return { type: 'door', x, y, w, h, open: false, ...extra };
}

export function lever(x, y, extra = {}) {
  return { type: 'lever', x, y, w: 28, h: 30, pulled: false, ...extra };
}

export function hack(x, y, extra = {}) {
  return { type: 'hack', x, y, w: 30, h: 40, hacked: false, ...extra };
}

export function plate(x, y, w = 70, h = 22, extra = {}) {
  return { type: 'plate', x, y, w, h, active: false, ...extra };
}

export function laserH(x, y, len, extra = {}) {
  return { type: 'laser', x, y, w: len, h: 6, dir: 'h', ...extra };
}

export function laserV(x, y, len, extra = {}) {
  return { type: 'laser', x, y, w: 6, h: len, dir: 'v', ...extra };
}

export function lightbeam(x, y, bridgeW, bridgeY, extra = {}) {
  return { type: 'lightbeam', x, y, w: 34, h: 44, bridgeW, bridgeY, active: false, ...extra };
}

export function crate(x, y, extra = {}) {
  return { type: 'crate', x, y, w: 44, h: 44, ...extra };
}

export function heavycrate(x, y, extra = {}) {
  return { type: 'heavycrate', x, y, w: 54, h: 54, ...extra };
}

export function key(x, y) {
  return { type: 'key', x, y, w: 26, h: 20, collected: false };
}

export function gate(x, y, w = 84, h = 130, extra = {}) {
  return { type: 'gate', x, y, w, h, open: false, ...extra };
}

export function teleport(x, y, pairId, extra = {}) {
  return { type: 'teleport', x, y, w: 40, h: 70, pairId, ...extra };
}

export function checkpoint(x, y) {
  return { type: 'checkpoint', x, y, w: 36, h: 70, activated: false };
}

export function coin(x, y) {
  return { type: 'coin', x, y, w: 20, h: 20, taken: false };
}

export function star(x, y) {
  return { type: 'star', x, y, w: 26, h: 26, taken: false };
}

export function hint(x, y, text) {
  return { type: 'hint', x, y, w: 20, h: 20, text };
}

export function fan(x, y, w = 60, extra = {}) {
  return { type: 'fan', x, y, w, h: 22, power: 900, ...extra };
}

export function button(x, y, id, connected, extra = {}) {
  return { type: 'button', x, y, w: 52, h: 22, id, connected, pressed: false, ...extra };
}

export function slime(x, y, range = 120, speed = 70, extra = {}) {
  return { type: 'enemy', kind: 'slime', x, y, range, speed, w: 30, h: 24, ...extra };
}

export function flyer(x, y, range = 140, speed = 90, extra = {}) {
  return { type: 'enemy', kind: 'flyer', x, y, range, speed, w: 34, h: 26, ...extra };
}

export function goal(x, y, extra = {}) {
  return { type: 'goal', x, y, w: 80, h: 130, ...extra };
}

export function tree(x, y, s = 1) { return { kind: 'tree', x, y, s }; }
export function rock(x, y, s = 1) { return { kind: 'rock', x, y, s }; }
export function crystal(x, y, s = 1) { return { kind: 'crystal', x, y, s }; }
export function pillar(x, y, s = 1) { return { kind: 'pillar', x, y, s }; }
export function glow(x, y, s = 1) { return { kind: 'glow', x, y, s }; }
