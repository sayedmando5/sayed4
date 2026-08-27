'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, makeInput } from '@/lib/game/engine.js';
import { levelCount } from '@/lib/game/levels/index.js';
import { playSfx, ensureAudio } from '@/lib/game/sfx.js';
import MobileControls from '@/components/MobileControls';

const VIEW_W = 1280;
const VIEW_H = 720;

// Per-character key bindings (same across devices; no conflict because each
// device controls exactly one character in online mode).
const KEYMAP = {
  sayed: { left: ['a'], right: ['d'], jump: ['w', ' '], interact: ['f'], throw: ['q'] },
  yasmin: { left: ['arrowleft'], right: ['arrowright'], jump: ['arrowup'], interact: ['e'], throw: [] },
};

const other = (id) => (id === 'sayed' ? 'yasmin' : 'sayed');

function neutralInput(id) {
  const i = makeInput(id);
  return i;
}

export default function GameCanvas({ session, onHud, onWin, onVictory, onGameOver, onStatus }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const gameRef = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // touch input state (mobile) — merged with keyboard in buildInput
  const touchRef = useRef({
    sayed: { left: false, right: false, jump: false, jumpAt: 0, interactAt: 0, throwAt: 0 },
    yasmin: { left: false, right: false, jump: false, jumpAt: 0, interactAt: 0, throwAt: 0 },
  });
  const [isTouch] = useState(() =>
    typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0)
  );

  // callbacks kept in refs so the rAF loop always sees the latest
  const cbRef = useRef({ onHud, onWin, onVictory, onGameOver, onStatus });
  cbRef.current = { onHud, onWin, onVictory, onGameOver, onStatus };

  useEffect(() => {
    const session = sessionRef.current;
    const canvas = canvasRef.current;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    // 1. load sprites + avatars (prefetched so the game renders them instantly)
    const sprites = {};
    const avatars = {};
    let imagesLoaded = 0;
    const NEED = 4;   // 2 sprites + 2 avatars
    const imageReady = () => {
      imagesLoaded++;
      if (gameRef.current && imagesLoaded >= NEED) {
        gameRef.current.sprites = sprites;
        gameRef.current.avatars = avatars;
      }
    };
    for (const id of ['sayed', 'yasmin']) {
      const s = new Image();
      s.onload = () => { sprites[id] = s; imageReady(); };
      s.src = `/sprites/${id}.png`;
      const a = new Image();
      a.onload = () => { avatars[id] = a; imageReady(); };
      a.src = `/avatars/${id}.png`;
    }

    // 2. create the game
    const game = new Game({
      levelIndex: session.levelIndex,
      role: session.role,
      mode: session.mode,
      ctx,
      canvas,
      zoom: 1,
      avatars,
      sprites,
      onEvent: (ev) => handleEvent(ev),
    });
    gameRef.current = game;
    let lastLevel = session.levelIndex;

    // 3. keyboard
    const down = new Set();
    const edges = new Set();
    const norm = (e) => e.key.toLowerCase();
    const onDown = (e) => {
      const k = norm(e);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      ensureAudio();               // unlock audio on first gesture
      down.add(k);
      edges.add(k);
    };
    const onUp = (e) => down.delete(norm(e));
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    // 4. network integration
    const net = session.network;
    let netInput = { sayed: neutralInput('sayed'), yasmin: neutralInput('yasmin') };
    let lastSnap = null;
    let lastSnapTime = 0;
    let firstSnapApplied = false;
    let snapshotTimer = 0;

    if (net) {
      net._onData = (data) => {
        if (data.type === 'snap') {
          lastSnap = data.snapshot;
          lastSnapTime = performance.now();
          if (!firstSnapApplied) { firstSnapApplied = true; game.setPaused(false); onStatus('play'); }
        } else if (data.type === 'input' && session.role === 'host') {
          netInput[data.character] = data.keys;
        } else if (data.type === 'event') {
          applyRemoteEvent(data.event);
        } else if (data.type === 'retry' && sessionRef.current.role === 'host') {
          rebuild(sessionRef.current.levelIndex);
        } else if (data.type === 'hello' && sessionRef.current.role === 'guest') {
          // self-correct the guest's character if it collides with the host's
          if (data.hostChar === sessionRef.current.character) {
            sessionRef.current.character = other(data.hostChar);
          }
        }
      };
      if (session.role === 'guest') game.setPaused(true);
    }

    function applyRemoteEvent(ev) {
      if (!ev) return;
      if (ev.type === 'win') { if (cbRef.current.onWin) cbRef.current.onWin('remote'); }
      if (ev.type === 'victory') { if (cbRef.current.onVictory) cbRef.current.onVictory(); }
      if (ev.type === 'gameover') { if (cbRef.current.onGameOver) cbRef.current.onGameOver(); }
    }

    // rebuild the level (used by retry on the authority side)
    function rebuild(levelIndex) {
      const session = sessionRef.current;
      const g = new Game({
        levelIndex, role: session.role, mode: session.mode,
        ctx, canvas, zoom: 1, avatars: game.avatars, sprites: game.sprites, onEvent: (e2) => handleEvent(e2),
      });
      gameRef.current = g;
      g.setPaused(!session.running ? true : false);
      if (cbRef.current.onStatus) cbRef.current.onStatus('play');
    }

    // 5. event handling from the engine
    function handleEvent(ev) {
      if (ev.type === 'win') {
        playSfx('win');
        handleWin();
      } else if (ev.type === 'sfx') {
        playSfx(ev.data);
      } else if (ev.type === 'gameover') {
        if (cbRef.current.onGameOver) cbRef.current.onGameOver();
        if (net && sessionRef.current.role === 'host') net.broadcastEvent({ type: 'gameover' });
      } else if (ev.type === 'toast') {
        if (cbRef.current.onHud) cbRef.current.onHud({ toast: ev.data, toastAt: performance.now() });
      } else if (ev.type === 'collect') {
        if (cbRef.current.onHud) cbRef.current.onHud({ collect: ev.data, by: ev.extra });
      } else if (ev.type === 'coop') {
        if (cbRef.current.onHud) cbRef.current.onHud({ coop: ev.data });
      }
    }

    let winPending = false;
    function handleWin() {
      if (winPending) return;
      winPending = true;
      const total = levelCount();
      const final = session.levelIndex >= total - 1;
      if (final) {
        game.setPaused(true);
        if (cbRef.current.onVictory) cbRef.current.onVictory();
        if (net) net.broadcastEvent({ type: 'victory' });
        winPending = false;
        return;
      }
      game.setPaused(true);
      if (cbRef.current.onWin) cbRef.current.onWin(session.levelIndex);
      if (net) net.broadcastEvent({ type: 'win' });
      setTimeout(() => {
        const next = sessionRef.current.levelIndex + 1;
        gameRef.current = game;
        sessionRef.current.levelIndex = next;
        // rebuild with the next world
        const g2 = new Game({
          levelIndex: next, role: session.role, mode: session.mode,
          ctx, canvas, zoom: 1, avatars: game.avatars, sprites: game.sprites, onEvent: (e2) => handleEvent(e2),
        });
        gameRef.current = g2;
        g2.setPaused(false);
        winPending = false;
        if (cbRef.current.onStatus) cbRef.current.onStatus('play');
      }, 2600);
    }

    // expose retry for parent UI
    const api = {
      retry() {
        if (sessionRef.current.role === 'guest' && net) {
          net.sendRetry('retry');
          cbRef.current.onStatus('play');
        } else {
          rebuild(sessionRef.current.levelIndex);
        }
      },
      getLevel() { return sessionRef.current.levelIndex; },
    };
    if (session._setApi) session._setApi(api);

    // 6. build input for a character from a key device.
    //    Edge actions (jump/interact/throw) linger ~60ms so they survive
    //    network latency and don't get dropped for the remote player.
    const edgeState = {
      sayed: { jump: 0, interact: 0, throw: 0 },
      yasmin: { jump: 0, interact: 0, throw: 0 },
    };
    function buildInput(id) {
      const map = KEYMAP[id];
      const es = edgeState[id];
      const t = touchRef.current[id];
      const now = performance.now();
      const held = (arr) => arr.some((k) => down.has(k));
      const edge = (arr) => arr.some((k) => edges.has(k));
      if (edge(map.jump)) es.jump = now;
      if (edge(map.interact)) es.interact = now;
      if (edge(map.throw)) es.throw = now;
      const inp = makeInput(id);
      inp.left = held(map.left) || t.left;
      inp.right = held(map.right) || t.right;
      inp.jump = held(map.jump) || t.jump;
      inp.jumpPressed = (now - es.jump < 60) || (now - t.jumpAt < 60);
      inp.interact = (now - es.interact < 60) || (now - t.interactAt < 60);
      inp.throw = (now - es.throw < 60) || (now - t.throwAt < 60);
      return inp;
    }

    // 7. main loop
    let raf = 0;
    let last = performance.now();
    let running = true;

    function loop(now) {
      if (!running) return;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      // hold the simulation until both players are ready (online co-op)
      gameRef.current.setPaused(!sessionRef.current.running);

      // determine which characters are controlled locally
      let localInputs = {};
      if (session.mode === 'local') {
        localInputs.sayed = buildInput('sayed');
        localInputs.yasmin = buildInput('yasmin');
        for (const id of ['sayed', 'yasmin']) { gameRef.current.applyInput(id, localInputs[id]); }
        stepHost(gameRef.current, localInputs, net, false, dt);
      } else if (session.role === 'host') {
        const my = session.character;
        const guest = other(my);
        localInputs[my] = buildInput(my);
        // apply own + network guest input
        gameRef.current.applyInput(my, localInputs[my]);
        gameRef.current.applyInput(guest, netInput[guest] || neutralInput(guest));
        // send our input to the (inverse) — host doesn't send input; it receives
        stepHost(gameRef.current, { [my]: localInputs[my], [guest]: netInput[guest] || neutralInput(guest) }, net, true, dt);
      } else {
        // guest
        const my = session.character;
        localInputs[my] = buildInput(my);
        if (net) net.sendInput(my, localInputs[my]);   // every frame for reliability
        // apply latest snapshot (interpolate remote players)
        if (lastSnap) {
          gameRef.current.applySnapshot(lastSnap);
          firstSnapApplied = true;
          gameRef.current.setPaused(false);   // guest always renders host state
          // host advanced to a new world → clear the "complete" overlay
          if (gameRef.current.levelIndex !== lastLevel) {
            lastLevel = gameRef.current.levelIndex;
            if (cbRef.current.onStatus) cbRef.current.onStatus('play');
          }
        }
      }

      // push HUD live data ~ every 100ms
      pushHud();

      // rendering
      gameRef.current.render();
      edges.clear();

      // HOST: broadcast snapshot at 20Hz
      if (net && (session.role === 'host' || session.mode === 'local')) {
        // only host broadcasts in online; in local there's no net
      }

      raf = requestAnimationFrame(loop);
    }

    function stepHost(game, inputs, net, isOnline, dt) {
      game.update(dt, inputs);
      if (net && isOnline) {
        snapshotTimer += dt;
        if (snapshotTimer >= 0.05) {
          snapshotTimer = 0;
          net.sendSnapshot(game.getSnapshot());
        }
      }
    }

    function pushHud() {
      const g = gameRef.current;
      if (!g) return;
      const t = performance.now();
      if (cbRef.current._hudAt && t - cbRef.current._hudAt < 100) return;
      cbRef.current._hudAt = t;
      const hintKey = g.activeHint;
      if (cbRef.current.onHud) {
        cbRef.current.onHud({
          lives: { ...g.lives },
          levelIndex: g.levelIndex,
          time: g.time,
          hint: hintKey,
          boss: g.boss && !g.boss.dead ? { hp: g.boss.hp, shield: g.boss.shield } : null,
          worldName: g.level.name,
          arabicName: g.level.arabicName,
        });
      }
    }

    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // which characters are driven on THIS device
  const myChar = sessionRef.current.character;
  const controlled = sessionRef.current.mode === 'local'
    ? ['sayed', 'yasmin']
    : [myChar];

  // touch press/release handler → writes into touchRef (merged in buildInput)
  const setControl = (id, field, val) => {
    const t = touchRef.current[id];
    if (!t) return;
    if (field === 'left' || field === 'right') { t[field] = val; }
    else if (field === 'jump') { t.jump = val; if (val) t.jumpAt = performance.now(); }
    else if (field === 'interact') { if (val) t.interactAt = performance.now(); }
    else if (field === 'throw') { if (val) t.throwAt = performance.now(); }
    ensureAudio();
  };

  return (
    <>
      <canvas ref={canvasRef} className="game-canvas" />
      {isTouch && <MobileControls controlled={controlled} onControl={setControl} />}
    </>
  );
}
