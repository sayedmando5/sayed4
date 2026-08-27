// ============================================================================
//  WORLD 1 — "The Whispering Woodlands"
//  A gentle, cinematic tutorial that teaches the core shared language:
//  moving, jumping, springs, crates-on-plates, and the very first true
//  co-op dependency (Sayed powers the generator + Yasmin hacks it to light
//  a bridge across the chasm).
//  Difficulty: 1 • Theme: forest
// ============================================================================
import {
  solid, ground, oneway, movingY, spring, crate, plate, door, hack, lightbeam,
  checkpoint, coin, star, hint, goal, tree, rock, crystal, glow,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-1',
  index: 0,
  name: 'The Whispering Woodlands',
  arabicName: 'الغابات الهامسة',
  theme: 'forest',
  difficulty: 1,
  size: { w: 3500, h: 800 },
  timeLimit: 0,
  spawn: { sayed: { x: 80, y: 560 }, yasmin: { x: 150, y: 560 } },
  goal: { type: 'goal', x: 3290, y: 520, w: 90, h: 130, requireBoth: true },

  platforms: [
    // continuous ground split by ONE deadly chasm (the co-op bridge zone)
    ground(0, 1900, 650),      // ground A  x 0 → 1900
    ground(2280, 1220, 650),   // ground B  x 2280 → 3500

    // early coins — floating one-way platforms over ground A
    oneway(300, 560, 110),
    oneway(480, 490, 110),
    oneway(660, 420, 110),
    oneway(870, 360, 110),

    // solid(1210,560,80,20),  // (reserved — see below)

    // — CHASM BRIDGE ZONE (x 1900 → 2280) —
    // Yasmin's double-jump staircase (floats over ground A / the chasm edge)
    oneway(1650, 520, 84),
    oneway(1770, 440, 84),
    oneway(1890, 360, 84),
    solid(2000, 300, 150, 20),   // floating generator pedestal over the chasm
    // the light bridge is spawned by the engine spanning x1900 → 2280 at y560

    // post-chasm variety — a rising lift to a high star
    ground(2280, 300, 650),
    movingY(2550, 560, 120, 20, -180, 72),
    solid(2740, 420, 130, 20),
    ground(2870, 630, 650),

    // goal plateau
    solid(3210, 520, 290, 280),
  ],

  objects: [
    // Sayed's strength showcase — a breakable crate guarding a coin nook
    { type: 'breakable', x: 700, y: 604, w: 48, h: 46, smasher: 'sayed' },

    // crate-on-plate door opener
    crate(1180, 606),
    plate(1340, 628, 90, 22, { weight: 1, latch: true, connected: ['door-a'] }),
    door(1480, 530, 20, 120, { id: 'door-a' }),

    // spring tutorial (on ground A)
    spring(1600, 632, 52),

    // — CO-OP GENERATOR: Sayed's weight + Yasmin's hack → light bridge —
    plate(1830, 628, 62, 22, { weight: 2, who: 'sayed', latch: true, connected: ['beam-a'] }),
    hack(2020, 250, { connected: ['beam-a'], who: 'yasmin' }),
    lightbeam(2000, 268, 150, 20, { id: 'beam-a', bridgeX: 1900, bridgeW: 380, bridgeY: 560 }),

    checkpoint(1750, 580),
  ],

  coins: [
    coin(355, 540), coin(540, 470), coin(725, 400), coin(870, 340),
    coin(2100, 280), coin(2600, 500), coin(2900, 600), coin(3160, 480), coin(3420, 610),
  ],
  stars: [{ ...star(2800, 390), id: 'star-1' }],

  hints: [
    hint(210, 540, 'تحرّك بـ A / D — والقفز بالمسافة'),
    hint(420, 540, 'ياسمين: X = قفزة مزدوجة'),
    hint(740, 540, 'سيد: اضغط قريباً من الصندوق لتكسيره'),
    hint(1230, 540, 'ادفع الصندوق فوق اللوحة لفتح الباب'),
    hint(1660, 540, 'قفز! استخدم النابض للانطلاق'),
    hint(2120, 300, 'سيد قف على اللوحة — ياسمين اخترق الجهاز ليضيء الجسر'),
    hint(3320, 480, 'قِفا معاً عند البوابة للفوز'),
  ],

  decorations: [
    tree(120, 650, 1.1), rock(300, 650, 0.8), tree(540, 650, 0.9),
    tree(1000, 650, 1.0), crystal(1080, 650, 0.7), tree(1600, 650, 1.1),
    tree(2450, 650, 0.9), rock(2500, 650, 0.9), tree(2950, 650, 1.0), glow(3330, 560, 1.2),
  ],
};
