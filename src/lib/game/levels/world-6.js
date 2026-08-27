// ============================================================================
//  WORLD 6 — "The Ember Forge"  (difficulty 6 • theme volcano)
//  A brutal gauntlet of speed and timing: a long conveyor+lava runway, a
//  twin-hack door, a spinning laser corridor, a crumble bridge over a lava
//  chasm, and a double-throw co-op section. Everything is tighter and faster.
// ============================================================================
import {
  solid, ground, oneway, movingX, movingY, spring, conveyor, spike,
  door, lever, hack, plate, laserH, laserV, lightbeam, crate, heavycrate, crumble,
  key, gate, teleport, checkpoint, coin, star, hint, fan, slime, flyer,
  goal, pillar, glow, crystal,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-6',
  index: 5,
  name: 'The Ember Forge',
  arabicName: 'حداد الجمر',
  theme: 'volcano',
  difficulty: 6,
  size: { w: 5000, h: 1000 },
  timeLimit: 240,
  spawn: { sayed: { x: 70, y: 650 }, yasmin: { x: 130, y: 650 } },
  goal: { type: 'goal', x: 4820, y: 660, w: 110, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1400, 780),        // x 0 → 1400
    ground(1500, 500, 780),      // x 1500 → 2000
    ground(2100, 500, 780),      // x 2100 → 2600
    ground(2700, 1150, 780),     // x 2700 → 3850
    ground(3950, 1150, 780),     // x 3950 → 5100
  ],

  objects: [
    slime(500, 756),
    slime(800, 756),
    { type: 'breakable', x: 1050, y: 734, w: 48, h: 46, smasher: 'sayed' },

    // --- conveyor lava runway onto the first island ---
    conveyor(1420, 744, 160, 1),
    spike(1420, 762, 200, 18, 'up'),
    movingX(1440, 660, 110, 20, 300, 110),   // fast shuttle over lava

    // --- twin hack door (both terminals) ---
    hack(2150, 744, { connected: ['door-f6'], who: 'yasmin' }),
    hack(2320, 744, { connected: ['door-f6'], who: 'yasmin' }),
    door(2230, 660, 20, 120, { id: 'door-f6' }),

    // --- spinning laser corridor (3 offsets, fast) ---
    laserH(2760, 780, 500, { cycles: true, period: 1.0, offset: 0 }),
    laserH(2760, 760, 500, { cycles: true, period: 1.0, offset: 0.33 }),
    laserH(2760, 800, 500, { cycles: true, period: 1.0, offset: 0.66 }),
    flyer(3000, 720, 160, 140),
    flyer(3200, 720, 160, 140),

    // --- crumble bridge over lava + heavy crate co-op press ---
    crumble(3400, 736, 90, 18),
    crumble(3530, 736, 90, 18),
    crumble(3660, 736, 90, 18),
    heavycrate(4050, 724),
    plate(4140, 756, 90, 22, { weight: 2, who: 'sayed', latch: true, connected: ['gate-f6'] }),
    gate(4120, 638, 96, 160, { id: 'gate-f6', vertical: true }),

    // --- double-throw co-op: Sayed throws Yasmin twice across two chasms ---
    oneway(4520, 700, 90),
    solid(4770, 620, 120, 16),
    hack(4790, 582, { connected: ['beam-f6'], who: 'yasmin' }),
    lightbeam(4780, 582, 100, 20, { id: 'beam-f6', bridgeX: 4520, bridgeW: 250, bridgeY: 720 }),
    plate(4520, 756, 90, 22, { weight: 2, who: 'sayed', latch: true, connected: ['beam-f6'] }),

    checkpoint(2680, 700),
    checkpoint(4040, 700),
  ],

  coins: [
    coin(300, 740), coin(700, 740), coin(1100, 740), coin(1760, 720),
    coin(2200, 720), coin(2900, 760), coin(3500, 720), coin(4300, 720),
    coin(4700, 700), coin(4900, 660),
  ],
  stars: [
    { ...star(1500, 560), id: 'star-6' },
    { ...star(3300, 560), id: 'star-6b' },
  ],

  hints: [
    hint(300, 700, 'الجمر يغلي — لا تتعثر!'),
    hint(1450, 700, 'اركب السفينة السريعة فوق الحمم'),
    hint(2230, 700, 'ياسمين: اخترق المحطتين معاً لفتح الباب'),
    hint(2760, 780, 'ممر الليزر الدوّار — توقيت دقيق!'),
    hint(3400, 700, 'الجسر ينهار فوق الحمم — اعبر بسرعة'),
    hint(4140, 700, 'سيد: ادفع الصندوق الثقيل على اللوحة'),
    hint(4520, 700, 'سيد: ارمِ ياسمين مرّتين لتتجاوز الهاوية'),
  ],

  decorations: [
    crystal(200, 780, 1.2), glow(500, 780, 1.1), pillar(1000, 780, 1.0),
    glow(1700, 780, 1.3), crystal(2200, 780, 1.0), glow(2900, 780, 1.4),
    crystal(3600, 780, 1.2), pillar(4300, 780, 1.0), glow(4900, 660, 1.4),
  ],
};
