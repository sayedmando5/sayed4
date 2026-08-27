// ============================================================================
//  WORLD 8 — "The Void Nexus"  (difficulty 8 • theme sky)
//  The true finale. Winds through a conveyor-laser maze, a teleport web, a
//  throw-chain over the void, and then the NEXUS GOLEM (5 HP, faster) — the
//  ultimate test that every ability, both players' strengths, and perfect
//  timing must combine to break its shield three times and finish the odyssey.
// ============================================================================
import {
  solid, ground, oneway, movingX, movingY, spring, conveyor, spike,
  door, lever, hack, plate, laserH, laserV, lightbeam, crate, heavycrate,
  key, gate, teleport, checkpoint, coin, star, hint, fan, slime, flyer,
  goal, pillar, glow, crystal,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-8',
  index: 7,
  name: 'The Void Nexus',
  arabicName: 'نواة الفراغ',
  theme: 'sky',
  difficulty: 8,
  size: { w: 5600, h: 1200 },
  timeLimit: 300,
  spawn: { sayed: { x: 70, y: 650 }, yasmin: { x: 130, y: 650 } },
  boss: {
    type: 'golem',
    x: 4900, y: 640, w: 170, h: 210,
    hp: 5, shieldCycle: 1.9, shootEvery: 1.1,
  },
  goal: { type: 'goal', x: 5400, y: 660, w: 130, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1200, 780),        // x 0 → 1200
    solid(1500, 640, 160, 16),   // island A
    solid(1700, 560, 160, 16),   // island B
    solid(1900, 640, 160, 16),   // island C
    ground(2150, 600, 780),      // x 2150 → 2750
    ground(2850, 300, 780),      // x 2850 → 3150
    ground(3250, 2450, 780),     // x 3250 → 5700  (boss arena floor)
  ],

  objects: [
    // --- teleport web ---
    teleport(900, 690, 'n1'),
    teleport(1550, 590, 'n1'),

    // --- conveyor + rotating laser maze ---
    conveyor(2150, 714, 320, 1),
    laserH(2260, 690, 500, { cycles: true, period: 0.9, offset: 0 }),
    laserH(2260, 730, 500, { cycles: true, period: 0.9, offset: 0.45 }),
    flyer(2550, 690, 180, 150),
    flyer(2680, 690, 180, 150),

    // --- throw-chain over the void (two throws) ---
    oneway(2950, 680, 90),
    solid(3150, 640, 130, 16),
    hack(3160, 600, { connected: ['beam-n'], who: 'yasmin' }),
    lightbeam(3150, 600, 100, 20, { id: 'beam-n', bridgeX: 2940, bridgeW: 250, bridgeY: 700 }),
    plate(2950, 756, 90, 22, { weight: 2, who: 'sayed', latch: true, connected: ['beam-n'] }),

    // === NEXUS GOLEM ARENA ===
    plate(3900, 756, 90, 22, { weight: 1, bossHit: true }),
    plate(5000, 756, 90, 22, { weight: 1, bossHit: true }),
    gate(4600, 638, 96, 160, { id: 'gate-n', vertical: true, locked: true }),

    checkpoint(2200, 700),
    checkpoint(3300, 700),
    checkpoint(3900, 700),
  ],

  coins: [
    coin(400, 740), coin(900, 740), coin(1640, 620), coin(1980, 640),
    coin(2450, 740), coin(3000, 700), coin(3600, 740), coin(4300, 740),
    coin(5100, 740),
  ],
  stars: [
    { ...star(1780, 520), id: 'star-8' },
    { ...star(3700, 560), id: 'star-8b' },
  ],

  hints: [
    hint(1000, 700, 'مدخلان يتلاقيان — قفز فيهما'),
    hint(2300, 700, 'ممر ليزر دوّار سريع — دقّة تامة'),
    hint(2960, 700, 'سيد: ارمِ ياسمين عبر الفراغ!'),
    hint(3900, 700, 'النكس! قِفا على اللوحتين معاً عند فتح الدرع'),
    hint(5000, 700, 'اضرب النكس ٥ مرّات — ثم ادخلا البوابة معاً'),
    hint(5400, 660, 'البوابة النهائية — النهاية الحقيقية'),
  ],

  decorations: [
    pillar(200, 760, 1.0), glow(700, 760, 1.2), crystal(1650, 560, 0.8),
    glow(2300, 600, 1.2), crystal(3900, 760, 1.2), glow(4500, 560, 1.4),
    glow(4900, 560, 1.5), glow(5500, 680, 1.5),
  ],
};
