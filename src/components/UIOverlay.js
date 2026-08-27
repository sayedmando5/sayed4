'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL_LEVELS = 8;

export default function UIOverlay({ data, status, onRetry, onContinue, onHome, onPause, paused, roomCode, role, joinedCode }) {
  const { lives, levelIndex, time, hint, boss, worldName, arabicName, toast } = data || {};
  const num = (levelIndex ?? 0) + 1;
  const [copied, setCopied] = useState(false);

  // Toasts are one-shot messages — show them, then auto-dismiss so they never
  // pile up and block the screen.
  const idRef = useRef(0);
  const [visToast, setVisToast] = useState({ text: '', id: 0 });
  const [visCoop, setVisCoop] = useState({ text: '', id: 0 });

  useEffect(() => {
    if (!toast) { setVisToast((s) => (s.text ? { text: '', id: s.id } : s)); return; }
    const id = ++idRef.current;
    setVisToast({ text: toast, id });
    const t = setTimeout(() => setVisToast((s) => (s.id === id ? { ...s, text: '' } : s)), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!data?.coop) { setVisCoop((s) => (s.text ? { text: '', id: s.id } : s)); return; }
    const id = ++idRef.current;
    setVisCoop({ text: data.coop, id });
    const t = setTimeout(() => setVisCoop((s) => (s.id === id ? { ...s, text: '' } : s)), 3600);
    return () => clearTimeout(t);
  }, [data?.coop]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* ignore */ }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch (e) { /* ignore */ }
  };

  const souls = (id) => {
    const n = lives?.[id] ?? 0;
    return Array.from({ length: 3 }, (_, i) => <span key={i} className={i < n ? '' : 'off'}>❤️</span>);
  };

  return (
    <div className="hud">
      {/* floating utility buttons (fullscreen + pause) — always interactive */}
      <div className="hud-tools">
        <button className="tool-btn" aria-label="ملء الشاشة" onClick={toggleFullscreen} title="ملء الشاشة">⛶</button>
        <button className="tool-btn" aria-label="إيقاف مؤقت" onClick={onPause} title="إيقاف مؤقت">⏸</button>
      </div>

      {/* top left: players + lives */}
      <div className="hud-top">
        <div className="hud-panel">
          <div className="hud-lives">
            <div className="player-hud">
              <img src="/avatars/sayed.png" alt="سيد" />
              <div>
                <div className="lbl">سيد</div>
                <div className="hud-hearts">{souls('sayed')}</div>
              </div>
            </div>
            <div className="player-hud">
              <img className="yasmin" src="/avatars/yasmin.png" alt="ياسمين" />
              <div>
                <div className="lbl">ياسمين</div>
                <div className="hud-hearts">{souls('yasmin')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* center: level name */}
        <div className="hud-panel" style={{ textAlign: 'center' }}>
          <div className="lbl">العالم {num} / {TOTAL_LEVELS}</div>
          <div style={{ fontWeight: 800, color: '#ffd76b', fontSize: 16 }}>{arabicName}</div>
          <div style={{ fontSize: 12, color: '#9fb0cf' }}>{worldName}</div>
        </div>

        {/* right: timer + boss */}
        <div className="hud-panel" style={{ textAlign: 'center' }}>
          <div className="lbl">الوقت</div>
          <div className="timer">{(time ?? 0).toFixed(0)}s</div>
          {boss && (
            <div style={{ marginTop: 6 }}>
              <div className="lbl">الجوليم</div>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${(boss.hp / (boss.max || 5)) * 100}%` }} />
              </div>
              <div style={{ fontSize: 11, color: boss.shield ? '#ff6b6b' : '#6be07a' }}>
                {boss.shield ? '🛡 درع' : '⚔ عرّي'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* center toasts / coop (auto-dismiss) */}
      <div className="hud-mid">
        {visCoop.text && <div className="toast">🤝 {visCoop.text}</div>}
        {visToast.text && <div className="toast">{visToast.text}</div>}
      </div>

      {/* bottom hint */}
      {hint && <div className="hint">💡 {hint}</div>}

      {/* ---------- PAUSE (toggled by ⏸) ---------- */}
      {paused && status === 'play' && (
        <Overlay>
          <div className="big-emoji">⏸️</div>
          <h2>إيقاف مؤقت</h2>
          <p>اللعب متوقف. خذ نفساً، وتابعوا عندما تكونان جاهزَين.</p>
          <div className="btnrow" style={{ flexDirection: 'column', alignItems: 'center' }}>
            <button className="btn green" onClick={onPause}>▶️ متابعة اللعب</button>
            <button className="btn ghost" onClick={onRetry}>🔄 إعادة المحاولة</button>
            <button className="btn ghost" onClick={onHome}>🏠 الخروج للقائمة</button>
          </div>
        </Overlay>
      )}

      {/* ---------- OVERLAYS ---------- */}
      {role === 'guest' && status === 'waiting' && (
        <Overlay>
          <div className="big-emoji">📡</div>
          <h2>جارٍ الاتصال بالشريك…</h2>
          <p>نحاول الوصول إلى الغرفة <b style={{ color: '#ffd76b' }}>{joinedCode}</b>.</p>
          <p className="muted">تأكد من أن شريكك أنشأ الغرفة وأنّ الكود صحيح.</p>
        </Overlay>
      )}

      {role === 'host' && status === 'waiting' && (
        <Overlay>
          <div className="big-emoji">🤝</div>
          <h2>في انتظار شريكك…</h2>
          <p>شارك هذا الرمز مع شريكك ليبدأ الجزء الثاني من الرحلة:</p>
          <div className="code big">{roomCode || '…'}</div>
          <button className="btn" onClick={copyCode} style={{ marginTop: 10 }}>
            {copied ? '✅ تم النسخ' : '📋 نسخ الرمز'}
          </button>
        </Overlay>
      )}

      {status === 'complete' && (
        <Overlay>
          <div className="big-emoji">🏆</div>
          <h2>أحسنتما!</h2>
          <p>لقد اجتزتما هذه المرحلة معاً. استعدّا للتحدي التالي…</p>
          {role === 'host' || role === undefined ? (
            <button className="btn" onClick={onContinue}>متابعة ▶️</button>
          ) : (
            <p className="muted">⏳ في انتظار المضيف ليأخذكما للعالم التالي…</p>
          )}
        </Overlay>
      )}

      {status === 'gameover' && (
        <Overlay>
          <div className="big-emoji">💔</div>
          <h2>السقوط!</h2>
          <p>نفدت المحاولات. لا بأس، المحاولة مرّة أخرى أقوى.</p>
          <div className="btnrow">
            <button className="btn" onClick={onRetry}>🔄 إعادة المحاولة</button>
            <button className="btn ghost" onClick={onHome}>🏠 القائمة</button>
          </div>
        </Overlay>
      )}

      {status === 'victory' && (
        <Overlay>
          <div className="big-emoji">🎉💍🎉</div>
          <h2>اكتملت الرحلة!</h2>
          <p>سيد وياسمين، لقد حللتما كل الألغاز وفتحتما البوابة السماوية. <br /> هذه البداية فقط…</p>
          <div className="btnrow">
            <button className="btn green" onClick={onHome}>🏠 العودة للقائمة</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div className="overlay">
      <div className="panel">{children}</div>
    </div>
  );
}
