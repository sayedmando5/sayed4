// ============================================================================
//  WORLD 7 — "The Skybound Ruins"  (difficulty 7 • theme ruins)
//  Pure precision platforming through ancient sky-ruins: tiny one-way shards,
//  timed gates, teleport networks, a crumbling void bridge, and a swarm of
//  flying sentries. The co-op pressure plates are placed just hard enough.
// ============================================================================
import {
  solid, ground, oneway, movingX, movingY, spring, conveyor, spike,
  door, lever, hack, plate, laserH, laserV, lightbeam, crate, heavycrate, crumble,
  key, gate, teleport, checkpoint, coin, star, hint, fan, slime, flyer,
  goal, pillar, glow, crystal,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-7',
  index: 6,
  name: 'The Skybound Ruins',
  arabicName: 'أطلال السماء',
  theme: 'ruins',
  difficulty: 7,
  size: { w: 5200, h: 1100 },
  timeLimit: 260,
  spawn: { sayed: { x: 70, y: 650 }, yasmin: { x: 130, y: 650 } },
  goal: { type: 'goal', x: 5000, y: 660, w: 120, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1400, 780),        // x 0 → 1400
    // floating shard run (no ground — precise jumps)
    oneway(1500, 620, 90),
    oneway(1640, 540, 90),
    oneway(1780, 620, 90),
    oneway(1920, 540, 90),
    oneway(2060, 470, 90),
    oneway(2200, 540, 90),
    ground(2350, 300, 780),      // x 2350 → 2650
    ground(2700, 1000, 780),     // x 2700 → 3700
    ground(3800, 1400, 780),     // x 3800 → 5200
  ],

  objects: [
    slime(700, 756, 180, 90),
    slime(950, 756, 180, 90),

    // --- teleport shuttle to skip the run's hard part (or shortcut) ---
    teleport(1200, 690, 'sky-7'),
    teleport(1500, 560, 'sky-7'),

    // --- timed precision gate: plate + timer door ---
    hack(2500, 720, { connected: ['door-7'], who: 'yasmin' }),
    door(2650, 590, 20, 140, { id: 'door-7' }),

    // --- crumbling void bridge with flying sentries ---
    crumble(2740, 700, 70, 16),
    crumble(2860, 700, 70, 16),
    crumble(2980, 700, 70, 16),
    crumble(3100, 700, 70, 16),
    crumble(3220, 700, 70, 16),
    flyer(2900, 680, 200, 150),
    flyer(3100, 680, 200, 150),
    flyer(3300, 680, 200, 150),

    // --- spinning vertical laser gauntlet + fan boost ---
    laserV(3500, 700, 80, { cycles: true, period: 1.0, offset: 0 }),
    laserV(3560, 700, 80, { cycles: true, period: 1.0, offset: 0.4 }),
    laserV(3620, 700, 80, { cycles: true, period: 1.0, offset: 0.8 }),
    spring(3520, 768, 60),

    // --- double-plate + heavy co-op press to final gate ---
    plate(4100, 756, 80, 22, { weight: 1, latch: true, connected: ['gate-7a'] }),
    plate(4250, 756, 80, 22, { weight: 1, latch: true, connected: ['gate-7a'] }),
    gate(4180, 638, 96, 160, { id: 'gate-7a', vertical: true }),
    heavycrate(4700, 724),
    plate(4800, 756, 90, 22, { weight: 2, who: 'sayed', latch: true, connected: ['gate-7b'] }),
    gate(4800, 638, 96, 160, { id: 'gate-7b', vertical: true }),

    checkpoint(2400, 700),
    checkpoint(3880, 700),
  ],

  coins: [
    coin(300, 740), coin(700, 740), coin(980, 740),
    coin(1560, 600), coin(1700, 600), coin(1840, 600), coin(1980, 520), coin(2140, 520),
    coin(2900, 690), coin(3300, 690), coin(4200, 740), coin(4550, 740),
  ],
  stars: [
    { ...star(2060, 430), id: 'star-7' },
    { ...star(3660, 500), id: 'star-7b' },
  ],

  hints: [
    hint(400, 700, 'الأطلال تتحطّم — دقّة في القفز'),
    hint(1250, 700, 'مدخلان يتلاقيان — قفز فيهما للتنقّل'),
    hint(2500, 700, 'ياسمين: اخترق المحطة لفتح الباب'),
    hint(2740, 700, 'الجسر يتفتّت في الفراغ — اعبر بسرعة!'),
    hint(3500, 780, 'ممر ليزر دوّار + نابض للانطلاق'),
    hint(4180, 700, 'قِفا معاً على اللوحتين لفتح البوابة'),
    hint(4800, 700, 'سيد: ادفع الصندوق الثقيل لفتح البوابة الأخيرة'),
  ],

  decorations: [
    pillar(200, 780, 1.1), glow(600, 780, 1.2), crystal(1000, 780, 0.9),
    glow(1500, 560, 1.1), crystal(2200, 620, 0.9), glow(2750, 700, 1.2),
    crystal(3400, 780, 1.1), pillar(4000, 780, 1.0), glow(5000, 660, 1.5),
  ],
};
