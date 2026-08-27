// ============================================================================
//  WORLD 5 — "The Celestial Gateway"
//  The grand finale. A gauntlet of sky-islands, a conveyor-laser maze, and the
//  multi-stage GOLEM BOSS: both players must stand on the twin soul-plates
//  while the golem's shield recharges, striking it three times. Only then does
//  the Celestial Gate open and the odyssey ends.
//  Difficulty: 5 • Theme: sky
// ============================================================================
import {
  solid, ground, oneway, movingX, movingY, spring, conveyor, spike,
  door, lever, hack, plate, laserH, laserV, lightbeam, crate, heavycrate, crumble,
  key, gate, teleport, checkpoint, coin, star, hint, fan, slime, flyer,
  goal, pillar, glow, crystal,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-5',
  index: 4,
  name: 'The Celestial Gateway',
  arabicName: 'البوابة السماوية',
  theme: 'sky',
  difficulty: 5,
  size: { w: 4800, h: 1100 },
  timeLimit: 240,
  spawn: { sayed: { x: 70, y: 620 }, yasmin: { x: 130, y: 620 } },
  boss: {
    type: 'golem',
    x: 4050, y: 610, w: 150, h: 190,
    hp: 3, shieldCycle: 2.6, shootEvery: 1.4,
  },
  goal: { type: 'goal', x: 4620, y: 630, w: 120, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1200, 760),       // x 0 → 1200
    // sky-island hop 1200 → 1500 (small gaps)
    solid(1500, 600, 160, 16),   // island A
    solid(1700, 520, 160, 16),   // island B
    solid(1900, 600, 160, 16),   // island C
    ground(2100, 600, 760),      // x 2100 → 2700
    // boss arena floor 2700 → 4800
    ground(2700, 2100, 760),
  ],

  objects: [
    // --- intro teleport up to the islands ---
    teleport(900, 690, 'sky-a'),
    teleport(1550, 560, 'sky-a'),

    // --- conveyor + laser maze ---
    conveyor(2100, 714, 320, 1),
    laserH(2200, 690, 480, { cycles: true, period: 1.2, offset: 0 }),
    laserH(2360, 690, 240, { cycles: true, period: 1.2, offset: 0.6 }),
    // airborne sentries
    flyer(2500, 690, 150, 120),
    flyer(2620, 690, 150, 120),

    // --- crumble shard-bridge over the void ---
    crumble(3000, 700, 90, 18),
    crumble(3120, 700, 90, 18),
    crumble(3240, 700, 90, 18),
    crumble(3360, 700, 90, 18),
    movingY(3500, 820, 120, 20, -300, 80),

    // === GOLEM BOSS ARENA ===
    // twin soul-plates flanking the golem (both must be pressed when shield
    // is DOWN). Engine drives the shield cycles and the 3-hit whittle.
    plate(3720, 738, 90, 22, { weight: 1, bossHit: true }),
    plate(4320, 738, 90, 22, { weight: 1, bossHit: true }),
    gate(4500, 600, 96, 160, { id: 'gate-f5', vertical: true, locked: true }),

    checkpoint(2850, 680),
    checkpoint(3680, 680),
  ],

  coins: [
    coin(400, 720), coin(900, 720), coin(1580, 560), coin(1950, 620),
    coin(2450, 720), coin(2940, 700), coin(3400, 700), coin(3900, 720),
    coin(4400, 720),
  ],
  stars: [
    { ...star(1780, 480), id: 'star-5' },
    { ...star(3540, 420), id: 'star-5b' },
  ],

  hints: [
    hint(1000, 680, 'مدخلان يقفزان بك إلى الجزر'),
    hint(2250, 680, 'ممر ليزر على حزام متحرك — وقّت خطواتك'),
    hint(3100, 680, 'الجسر ينهار — اعبر سريعاً!'),
    hint(3720, 680, 'الجوليم! قِفا على اللوحتين معاً أثناء فتح الدرع'),
    hint(4320, 680, 'اضرب الجوليم ٣ مرّات حتى يسقط'),
    hint(4620, 600, 'البوابة السماوية فُتحت — ادخلا معاً!'),
  ],

  decorations: [
    pillar(300, 760, 1.0), glow(700, 760, 1.2), crystal(1600, 560, 0.8),
    glow(2600, 600, 1.2), crystal(3600, 760, 1.1), glow(4050, 540, 1.4),
    crystal(4500, 760, 1.2), glow(4700, 640, 1.5),
  ],
};
