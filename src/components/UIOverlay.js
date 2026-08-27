'use client';

const TOTAL_LEVELS = 5;

export default function UIOverlay({ data, status, onRetry, onContinue, onHome }) {
  const { lives, levelIndex, time, hint, boss, worldName, arabicName, toast } = data || {};
  const num = (levelIndex ?? 0) + 1;

  const souls = (id) => {
    const n = lives?.[id] ?? 0;
    return Array.from({ length: 3 }, (_, i) => <span key={i} className={i < n ? '' : 'off'}>❤️</span>);
  };

  return (
    <div className="hud">
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
                <div className="bar-fill" style={{ width: `${(boss.hp / 3) * 100}%` }} />
              </div>
              <div style={{ fontSize: 11, color: boss.shield ? '#ff6b6b' : '#6be07a' }}>
                {boss.shield ? '🛡 درع' : '⚔ عرّي'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* center toasts / coop */}
      <div className="hud-mid">
        {data?.coop && <div className="toast">🤝 {data.coop}</div>}
        {toast && <div className="toast">{toast}</div>}
      </div>

      {/* bottom hint */}
      {hint && <div className="hint">💡 {hint}</div>}

      {/* ---------- OVERLAYS ---------- */}
      {status === 'waiting' && (
        <Overlay>
          <div className="big-emoji">🤝</div>
          <h2>في انتظار شريكك…</h2>
          <p>شارك الرمز أعلاه ليبدأ الجزء الثاني من الرحلة.</p>
        </Overlay>
      )}

      {status === 'complete' && (
        <Overlay>
          <div className="big-emoji">🏆</div>
          <h2>أحسنتما!</h2>
          <p>لقد اجتزتما هذه المرحلة معاً. استعدّا للتحدي التالي…</p>
          <button className="btn" onClick={onContinue}>متابعة ▶️</button>
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
