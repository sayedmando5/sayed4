// ============================================================================
//  Level registry — the Modular Level System.
//  Add a new file to ./ (following helpers.js) and register it here to see it
//  in the game. New worlds drop right in without touching the engine.
// ============================================================================
import world1 from './world-1.js';
import world2 from './world-2.js';
import world3 from './world-3.js';
import world4 from './world-4.js';
import world5 from './world-5.js';
import world6 from './world-6.js';
import world7 from './world-7.js';
import world8 from './world-8.js';

export const LEVELS = [
  world1,
  world2,
  world3,
  world4,
  world5,
  world6,
  world7,
  world8,
];

export function getLevel(index) {
  return LEVELS[index] || LEVELS[0];
}

export function levelCount() {
  return LEVELS.length;
}
