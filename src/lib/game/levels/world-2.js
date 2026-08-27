// ============================================================================
//  WORLD 2 — "The Crystal Caverns"
//  Movement & timing: moving platforms over spike pits, a conveyor, a cycling
//  laser corridor, a two-plate co-op gate, and a hack-to-open door guarded by
//  a sentry. Difficulty: 2 • Theme: cave
//
//  GROUND PLANE RULE: required progression stays on the ground (top y=760).
//  Vertical steps only ever appear as optional collectible pickups, so a
//  slightly-high star can never soft-lock the level.
// ============================================================================
import {
  solid, ground, oneway, movingX, spring, conveyor, spike,
  door, hack, gate, plate, laserH, laserV, crate, heavycrate,
  checkpoint, coin, star, hint, fan, slime, flyer, goal, crystal, pillar, glow,
} from './helpers.js';

export default {
  version: 1,
  id: 'world-2',
  index: 1,
  name: 'The Crystal Caverns',
  arabicName: 'الكهوف الكريستالية',
  theme: 'cave',
  difficulty: 2,
  size: { w: 4200, h: 1000 },
  timeLimit: 150,
  spawn: { sayed: { x: 70, y: 620 }, yasmin: { x: 130, y: 620 } },
  goal: { type: 'goal', x: 4020, y: 630, w: 110, h: 130, requireBoth: true },

  platforms: [
    ground(0, 1400, 760),       // ground A  x 0 → 1400
    // pit 1 (x 1400 → 1900) crossed by a shuttle platform
    ground(1900, 300, 760),     // ground B  x 1900 → 2200
    ground(2200, 400, 760),     // ground B2 x 2200 → 2600
    // pit 2 (x 2600 → 3000) crossed by a shuttle platform
    ground(3000, 300, 760),     // ground C  x 3000 → 3300
    ground(3300, 900, 760),     // ground D  x 3300 → 4200
  ],

  objects: [
    // --- sentry + breakable on ground A ---
    slime(400, 736),
    { type: 'breakable', x: 900, y: 714, w: 48, h: 46, smasher: 'sayed' },

    // --- pit 1 shuttle ---
    movingX(1400, 690, 120, 20, 470, 95),
    // --- pit 2 shuttle ---
    movingX(2600, 690, 120, 20, 390, 90),

    // --- TWO-PLATE CO-OP GATE (both stand → locks open) ---
    plate(1960, 738, 74, 22, { weight: 1, latch: true, connected: ['gate-a'] }),
    plate(2110, 738, 74, 22, { weight: 1, latch: true, connected: ['gate-a'] }),
    gate(2030, 590, 92, 170, { id: 'gate-a', vertical: true }),

    // --- conveyor over a spike strip ---
    conveyor(2200, 714, 320, 1),
    spike(2200, 738, 320, 22, 'up'),

    // --- hack terminal (Yasmin) splits laser corridor + opens door ---
    hack(3050, 720, { connected: ['door-b'], who: 'yasmin' }),
    door(3300, 610, 20, 150, { id: 'door-b' }),

    // --- cycling laser corridor over ground D entrance ---
    laserH(3360, 700, 360, { cycles: true, period: 1.6, offset: 0 }),
    laserH(3360, 742, 360, { cycles: true, period: 1.6, offset: 0.8 }),

    flyer(3700, 700, 140, 110),
    slime(3720, 736),

    // --- optional co-op press for a star (Sayed's heavy crate) ---
    heavycrate(3830, 706),
    plate(3920, 738, 84, 22, { weight: 2, who: 'sayed', latch: true, connected: ['gate-star'] }),
    gate(3910, 620, 92, 140, { id: 'gate-star', vertical: true }),

    checkpoint(2380, 680),
  ],

  coins: [
    coin(240, 720), coin(560, 720), coin(1020, 720),
    coin(1500, 660), coin(2700, 660),
    coin(3150, 720), coin(3480, 720), coin(3600, 720),
  ],
  stars: [
    { ...star(1180, 380), id: 'star-2' },   // optional: above ground A
    { ...star(3180, 560), id: 'star-2b' },
  ],

  hints: [
    hint(220, 680, 'تحرّك وقفز — انتبه للوحش!'),
    hint(1500, 690, 'اركب المنصة المتحركة لتعبر الهاوية'),
    hint(2030, 680, 'قِفا معاً على اللوحتين ليُفتح البوابة'),
    hint(2200, 690, 'الحزام الناقل ينقلك — انتبه للأشواك'),
    hint(3050, 680, 'ياسمين: اخترق المحطة لكسر باب الليزر'),
    hint(3380, 790, 'وقّت العبور بين دورات الليزر'),
    hint(3920, 700, 'سيد: ادفع الصندوق الثقيل على اللوحة'),
  ],

  decorations: [
    crystal(200, 760, 1.1), crystal(360, 760, 0.8), pillar(880, 760, 1.0),
    crystal(1750, 760, 1.2), pillar(2450, 760, 1.0), glow(3450, 760, 1.2),
    crystal(3900, 760, 1.1), pillar(4100, 640, 1.0),
  ],
};
