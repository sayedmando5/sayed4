// ============================================================================
//  WORLD 3 — "The Sundered Temple"
//  The first true "It Takes Two" verticality: Sayed throws Yasmin across a
//  chasm too wide to jump, she hacks a rune-rift to raise a light bridge back
//  for him, then Sayed pulls a heavy lever to open the inner sanctum.
//  Difficulty: 3 • Theme: temple
// ============================================================================
import {
  solid, ground, oneway, movingX, movingY, spring, conveyor, spike,
  door, lever, hack, plate, laserH, laserV, lightbeam, crate, heavycrate,
  key, gate, teleport, checkpoint, coin, star, hint, fan, slime, flyer,
  goal, pillar, glow, crystal,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-3',
  index: 2,
  name: 'The Sundered Temple',
  arabicName: 'المعبد المنقسم',
  theme: 'temple',
  difficulty: 3,
  size: { w: 4400, h: 1000 },
  timeLimit: 200,
  spawn: { sayed: { x: 70, y: 620 }, yasmin: { x: 130, y: 620 } },
  goal: { type: 'goal', x: 4230, y: 630, w: 110, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1500, 760),       // ground A x 0 → 1500
    // wide chasm x 1500 → 1900 (400px, too far to jump — THROW here)
    ground(1900, 600, 760),     // ground B x 1900 → 2500
    ground(2500, 1200, 760),    // ground C x 2500 → 3700
    ground(3700, 700, 760),     // ground D x 3700 → 4400
  ],

  objects: [
    slime(500, 736),
    { type: 'breakable', x: 900, y: 714, w: 48, h: 46, smasher: 'sayed' },

    // --- THROW CHASM: Sayed launches Yasmin; she hacks the rift ---
    oneway(1540, 690, 90),          // launch ledge
    // Yasmin lands on a floating rune-disc on far side from the throw
    solid(1870, 600, 120, 16),
    hack(1900, 560, { connected: ['beam-t1'], who: 'yasmin', requireThrown: false }),
    // the light bridge she wakes spans the chasm for Sayed
    lightbeam(1880, 560, 100, 20, { id: 'beam-t1', bridgeX: 1520, bridgeW: 380, bridgeY: 700 }),
    plate(1540, 738, 90, 22, { weight: 2, who: 'sayed', latch: true, connected: ['beam-t1'] }),

    // --- Sayed's heavy lever opens the temple gate ---
    lever(2720, 730, { connected: ['gate-t1'] }),
    gate(2800, 600, 96, 160, { id: 'gate-t1', vertical: true }),
    spike(2800, 760, 96, 20, 'up'),

    // --- moving platforms up a vertical shaft (checkpoint zone) ---
    movingY(3000, 760, 120, 20, -300, 74),
    oneway(3180, 600, 100),
    oneway(3300, 500, 100),
    solid(3420, 440, 120, 16),
    fan(3420, 430, 60),            // fan boosts to the high ledge

    // --- upper sanctum hazards ---
    laserH(3560, 720, 260, { cycles: true, period: 1.4, offset: 0 }),
    laserV(3900, 700, 120, { cycles: true, period: 2.0, offset: 0.5 }),
    flyer(3980, 700, 140, 120),

    // --- final co-op plates to the goal ---
    plate(4080, 738, 80, 22, { weight: 1, latch: true, connected: ['gate-goal'] }),
    plate(4180, 738, 80, 22, { weight: 1, latch: true, connected: ['gate-goal'] }),
    gate(4140, 600, 92, 160, { id: 'gate-goal', vertical: true }),

    checkpoint(2600, 680),
  ],

  coins: [
    coin(300, 720), coin(600, 720), coin(1100, 720),
    coin(1950, 680), coin(3050, 640), coin(3450, 440),
    coin(3780, 720), coin(4100, 720),
  ],
  stars: [
    { ...star(1750, 470), id: 'star-3' },
    { ...star(3450, 400), id: 'star-3b' },
  ],

  hints: [
    hint(300, 680, 'المعبد مهجور — انتبه للحراس'),
    hint(1560, 680, 'سيد: اضغط قرب ياسمين (F) لتقذفها عبر الهاوية'),
    hint(1980, 680, 'ياسمين: اخترق الشقّ لتنير جسراً لسيد'),
    hint(2740, 680, 'سيد: اسحب الرافعة الثقيلة لفتح البوابة'),
    hint(3440, 680, 'استخدم المروحة للصعود للأعلى'),
    hint(4140, 680, 'قِفا معاً على اللوحتين لفتح بوابة النصر'),
  ],

  decorations: [
    pillar(200, 760, 1.1), pillar(700, 760, 0.9), glow(1200, 760, 1.2),
    crystal(2200, 760, 0.9), pillar(2300, 760, 1.0), glow(3600, 600, 1.3),
    pillar(4300, 640, 1.0),
  ],
};
