// ============================================================================
//  WORLD 4 — "The Frozen Citadel"
//  Ice physics (low friction), crumbling bridges, teleport pairs, twin hacks,
//  and a timed ice laser maze. Difficulty: 4 • Theme: ice
// ============================================================================
import {
  solid, ground, oneway, movingX, movingY, spring, conveyor, ice, crumble,
  spike, door, lever, hack, plate, laserH, laserV, lightbeam, crate, heavycrate,
  key, gate, teleport, checkpoint, coin, star, hint, fan, slime, flyer,
  goal, pillar, glow, crystal,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-4',
  index: 3,
  name: 'The Frozen Citadel',
  arabicName: 'القلعة الجليدية',
  theme: 'ice',
  difficulty: 4,
  size: { w: 4600, h: 1000 },
  timeLimit: 200,
  spawn: { sayed: { x: 70, y: 620 }, yasmin: { x: 130, y: 620 } },
  goal: { type: 'goal', x: 4430, y: 630, w: 110, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1300, 760),       // x 0 → 1300
    // crumbling bridge over a spike chasm 1300 → 1750
    ground(1750, 400, 760),     // x 1750 → 2150
    ground(2150, 1100, 760),    // x 2150 → 3250
    // trampoline ice gap 3250 → 3550
    ground(3550, 1050, 760),    // x 3550 → 4600
  ],

  objects: [
    // --- ice physics intro ---
    ice(300, 760, 700, 20),
    slime(700, 736),
    { type: 'breakable', x: 1050, y: 714, w: 48, h: 46, smasher: 'sayed' },

    // --- crumbling bridge over spikes ---
    crumble(1340, 700, 80, 18),
    crumble(1440, 700, 80, 18),
    crumble(1540, 700, 80, 18),
    crumble(1640, 700, 80, 18),
    spike(1340, 760, 360, 20, 'up'),

    // --- twin hacks gate the corridor (both terminals needed) ---
    hack(2300, 720, { connected: ['gate-f1', 'gate-f2'], who: 'yasmin' }),
    hack(2500, 720, { connected: ['gate-f1', 'gate-f2'], who: 'yasmin' }),
    gate(2400, 600, 96, 160, { id: 'gate-f1', vertical: true }),
    gate(2520, 600, 96, 160, { id: 'gate-f2', vertical: true }),

    // --- teleport pairs across the wide crevasse ---
    teleport(2850, 690, 'tp-a'),
    teleport(3200, 690, 'tp-a'),

    // --- timed ice laser maze over the ground ---
    laserV(3450, 700, 60, { cycles: true, period: 1.2, offset: 0 }),
    laserV(3550, 700, 60, { cycles: true, period: 1.2, offset: 0.4 }),
    laserV(3650, 700, 60, { cycles: true, period: 1.2, offset: 0.8 }),
    spring(3560, 742, 60),

    // --- dual-plate elevator to the icy summit ---
    plate(3850, 738, 80, 22, { weight: 2, latch: false, connected: ['lift-f'] }),
    plate(3960, 738, 80, 22, { weight: 2, latch: false, connected: ['lift-f'] }),
    movingY(3900, 820, 130, 20, -360, 90, { lock: 'lift-f' }),
    oneway(4050, 480, 120),

    // --- summit boss-lite: spike serpent lane ---
    flyer(4100, 690, 160, 130),
    spike(4250, 760, 300, 20, 'up'),
    conveyor(4250, 714, 300, -1),

    checkpoint(2200, 680),
  ],

  coins: [
    coin(360, 720), coin(780, 720), coin(1900, 720), coin(2420, 720),
    coin(3000, 720), coin(3700, 720), coin(4100, 690), coin(4360, 720),
  ],
  stars: [
    { ...star(1620, 560), id: 'star-4' },
    { ...star(4080, 520), id: 'star-4b' },
  ],

  hints: [
    hint(300, 700, 'الأرض جليدية — لا تتوقف فجأة!'),
    hint(1360, 700, 'الجسر ينهار — اعبره بسرعة!'),
    hint(2400, 700, 'ياسمين: اخترق المحطتين معاً لفتح البوابة'),
    hint(2870, 700, 'مدخلان يتلاقيان — قفز فيهما للتنقل'),
    hint(3480, 700, 'وقّت المرور بين أعمدة الليزر'),
    hint(3900, 700, 'قِفا على اللوحتين لرفع المصعد للقمة'),
  ],

  decorations: [
    crystal(200, 760, 1.2), crystal(560, 760, 0.9), pillar(900, 760, 1.0),
    glow(2200, 600, 1.1), crystal(2900, 760, 1.1), crystal(3700, 760, 1.2),
    pillar(4000, 760, 1.0), glow(4500, 640, 1.3),
  ],
};
