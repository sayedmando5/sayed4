// ============================================================================
//  SFX — tiny WebAudio synth (no asset files). Tones are generated on the fly.
//  The AudioContext is created lazily and resumed on the first user gesture so
//  browsers allow playback.
// ============================================================================
let ctx = null;

function ensure() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.18, when = 0, slide = 0) {
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const MAP = {
  jump: () => tone(320, 0.14, 'square', 0.12, 0, 160),
  jump2: () => tone(430, 0.16, 'square', 0.12, 0, 200),
  spring: () => tone(260, 0.28, 'sawtooth', 0.14, 0, 420),
  coin: () => { tone(1046, 0.08, 'square', 0.12); tone(1568, 0.12, 'square', 0.12, 0.06); },
  star: () => { tone(880, 0.08, 'triangle', 0.16); tone(1320, 0.08, 'triangle', 0.16, 0.08); tone(1760, 0.16, 'triangle', 0.16, 0.16); },
  hack: () => { tone(520, 0.06, 'square', 0.1); tone(760, 0.06, 'square', 0.1, 0.06); tone(1020, 0.1, 'square', 0.1, 0.12); },
  lever: () => tone(180, 0.22, 'sawtooth', 0.14, 0, -60),
  plate: () => tone(240, 0.12, 'square', 0.12, 0, 120),
  push: () => tone(160, 0.06, 'triangle', 0.1),
  throw: () => { tone(600, 0.1, 'square', 0.12, 0, 400); tone(900, 0.12, 'square', 0.1, 0.08, 400); },
  beam: () => { tone(440, 0.3, 'sine', 0.12); tone(660, 0.3, 'sine', 0.1, 0.05); },
  die: () => { tone(300, 0.5, 'sawtooth', 0.16, 0, -260); },
  checkpoint: () => { tone(660, 0.08, 'triangle', 0.14); tone(880, 0.1, 'triangle', 0.14, 0.08); },
  teleport: () => { tone(400, 0.2, 'sine', 0.12, 0, 500); tone(900, 0.2, 'sine', 0.1, 0.1, 300); },
  crumble: () => tone(140, 0.2, 'triangle', 0.14, 0, -60),
  bossHit: () => { tone(120, 0.3, 'sawtooth', 0.2, 0, -40); tone(60, 0.3, 'square', 0.12, 0.1, -20); },
  bossDie: () => { tone(200, 0.6, 'sawtooth', 0.2, 0, -160); tone(100, 0.6, 'square', 0.14, 0.2, -60); },
  shoot: () => tone(180, 0.12, 'sawtooth', 0.08, 0, -80),
  bossbarrier: () => tone(340, 0.2, 'sine', 0.12, 0, 240),
  bossdown: () => tone(500, 0.2, 'sine', 0.12, 0, -260),
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.12)); },
};

export function playSfx(name) {
  if (MAP[name]) MAP[name]();
}

// Call on a user gesture so audio can start.
export function ensureAudio() {
  ensure();
}
