'use client';

import { useCallback, useRef, useState } from 'react';
import Home from '@/components/Home';
import Lobby from '@/components/Lobby';
import GameCanvas from '@/components/GameCanvas';
import UIOverlay from '@/components/UIOverlay';
import { Network } from '@/lib/game/network.js';
import { LEVELS } from '@/lib/game/levels/index.js';

const other = (id) => (id === 'sayed' ? 'yasmin' : 'sayed');

export default function Page() {
  const [screen, setScreen] = useState('home');       // home | lobby | levelselect | game
  const [lobbyMode, setLobbyMode] = useState('create');
  const [myChar, setMyChar] = useState('sayed');
  const [code, setCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [netStatus, setNetStatus] = useState({});
  const [live, setLive] = useState({});
  const [status, setStatus] = useState('play');        // play | waiting | complete | gameover | victory

  const netRef = useRef(null);
  const sessionRef = useRef({
    mode: 'local', role: 'host', character: 'sayed', network: null, roomCode: '',
    levelIndex: 0, running: false,
  });

  const setHud = useCallback((patch) => {
    setLive((prev) => ({ ...prev, ...patch }));
  }, []);

  // capture the imperative API (retry) that GameCanvas exposes
  sessionRef.current._setApi = (api) => { sessionRef.current._api = api; };

  const cleanupNet = () => {
    if (netRef.current) { netRef.current.close(); netRef.current = null; }
    sessionRef.current.network = null;
    setNetStatus({});
  };

  const goHome = () => {
    cleanupNet();
    setScreen('home');
    setStatus('play');
  };

  // ---------- ONLINE HOST ----------
  const onCreate = () => {
    const net = new Network({
      role: 'host',
      character: myChar,
      onState: (s) => {
        setNetStatus(s);
        if (s.stage === 'connected') {
          sessionRef.current.running = true;
          setStatus('play');
        }
      },
      onError: (e) => setNetStatus({ stage: 'error' }),
    });
    const rc = net.createRoom();
    netRef.current = net;
    setRoomCode(rc);
    sessionRef.current.network = net;
    sessionRef.current.mode = 'online';
    sessionRef.current.role = 'host';
    sessionRef.current.character = myChar;
    sessionRef.current.roomCode = rc;
    sessionRef.current.running = false;
    sessionRef.current.levelIndex = 0;
    setStatus('waiting');
    setScreen('game');
  };

  // ---------- ONLINE GUEST ----------
  const onJoin = () => {
    const net = new Network({
      role: 'guest',
      character: myChar,
      onState: (s) => {
        setNetStatus(s);
        if (s.stage === 'connected') { sessionRef.current.running = true; setStatus('play'); }
      },
      onError: () => setNetStatus({ stage: 'error' }),
    });
    net.joinRoom(code);
    netRef.current = net;
    sessionRef.current.network = net;
    sessionRef.current.mode = 'online';
    sessionRef.current.role = 'guest';
    sessionRef.current.character = myChar;
    sessionRef.current.roomCode = code;
    sessionRef.current.running = false;
    sessionRef.current.levelIndex = 0;
    setStatus('waiting');
    setScreen('game');
  };

  // ---------- LOCAL ----------
  const startLocal = () => {
    cleanupNet();
    sessionRef.current.mode = 'local';
    sessionRef.current.role = 'host';
    sessionRef.current.character = 'sayed';
    sessionRef.current.network = null;
    sessionRef.current.levelIndex = 0;
    sessionRef.current.running = true;
    setStatus('play');
    setScreen('game');
  };

  const startLocalLevel = (i) => {
    cleanupNet();
    sessionRef.current.mode = 'local';
    sessionRef.current.role = 'host';
    sessionRef.current.character = 'sayed';
    sessionRef.current.network = null;
    sessionRef.current.levelIndex = i;
    sessionRef.current.running = true;
    setStatus('play');
    setScreen('game');
  };

  const onRetry = () => {
    // GameCanvas exposes retry via session._setApi
    if (sessionRef.current._api && sessionRef.current._api.retry) sessionRef.current._api.retry();
    setStatus('play');
  };

  const onContinue = () => {
    // the host already advances after the delay; just clear the overlay
    setStatus('play');
  };

  return (
    <>
      {screen === 'home' && (
        <div className="wrap">
          <Home
            onPlay={() => { setLobbyMode('create'); setMyChar('sayed'); setScreen('lobby'); }}
            onLocal={startLocal}
            onLevelSelect={() => setScreen('levelselect')}
          />
        </div>
      )}

      {screen === 'lobby' && (
        <div className="wrap">
          <Lobby
            mode={lobbyMode}
            setMode={setLobbyMode}
            myChar={myChar}
            setMyChar={setMyChar}
            code={code}
            setCode={setCode}
            roomCode={roomCode}
            netStatus={netStatus}
            onCreate={onCreate}
            onJoin={onJoin}
            onBack={() => { setScreen('home'); setLobbyMode('create'); }}
          />
        </div>
      )}

      {screen === 'levelselect' && (
        <div className="wrap">
          <div className="card">
            <h2 className="title">اختيار المرحلة</h2>
            <p className="sub">العب محلياً (لاعبان على نفس الشاشة) من أي عالم</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {LEVELS.map((l, i) => (
                <button key={l.id} className="btn ghost" onClick={() => startLocalLevel(i)}>
                  🌍 العالم {i + 1} — {l.arabicName} <span style={{ opacity: 0.6 }}>
                    (صعوبة {l.difficulty})</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span className="backlink" onClick={() => setScreen('home')}>← رجوع</span>
            </div>
          </div>
        </div>
      )}

      {screen === 'game' && (
        <div className="game-shell">
          <GameCanvas
            session={sessionRef.current}
            onHud={setHud}
            onWin={() => setStatus('complete')}
            onVictory={() => setStatus('victory')}
            onGameOver={() => setStatus('gameover')}
            onStatus={(s) => setStatus(s)}
          />
          <UIOverlay
            data={live}
            status={netStatus?.stage === 'connected' ? status : (sessionRef.current.mode === 'local' ? status : 'waiting')}
            onRetry={onRetry}
            onContinue={onContinue}
            onHome={goHome}
          />
        </div>
      )}
    </>
  );
}
