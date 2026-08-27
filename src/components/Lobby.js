'use client';

export default function Lobby({
  mode,               // 'create' | 'join'
  setMode,
  myChar,
  setMyChar,
  code,
  setCode,
  roomCode,
  netStatus,          // {stage, ...}
  onCreate,
  onJoin,
  onBack,
  startLevel,
  setStartLevel,
  levels,
}) {
  const charOptions = [
    { id: 'sayed', label: 'سيد', desc: 'قوي — يعلّق يكسّر ويسحب', sel: 'sel-sayed' },
    { id: 'yasmin', label: 'ياسمين', desc: 'رشيقة — قفزة مزدوجة واختراق', sel: 'sel-yasmin' },
  ];

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      {/* mode toggle */}
      <div className="mode-toggle">
        <button
          className={`mtab ${mode === 'create' ? 'active' : ''}`}
          onClick={() => setMode('create')}
        >
          ✨ إنشاء غرفة
        </button>
        <button
          className={`mtab ${mode === 'join' ? 'active' : ''}`}
          onClick={() => setMode('join')}
        >
          🔗 انضمام لغرفة
        </button>
      </div>

      <h2 className="title">{mode === 'create' ? 'إنشاء غرفة' : 'الانضمام لغرفة'}</h2>
      <p className="sub">اختر شخصيتك، ثم ادعُ شريكك ليلعب معك</p>

      <div className="charPick">
        {charOptions.map((c) => (
          <button
            key={c.id}
            className={`char ${myChar === c.id ? c.sel : ''}`}
            onClick={() => setMyChar(c.id)}
          >
            <img src={`/avatars/${c.id}.png`} alt={c.label} />
            <div className="nm">{c.label}</div>
            <div className="role">{c.desc}</div>
          </button>
        ))}
      </div>

      {mode === 'create' ? (
        <>
          {/* starting world (host decides where the adventure begins) */}
          <div className="levelpick">
            <div className="lbl">🌍 نبدأ من العالم:</div>
            <div className="level-scroll">
              {(levels || []).map((l, i) => (
                <button
                  key={l.id}
                  className={`levelchip ${startLevel === i ? 'active' : ''}`}
                  onClick={() => setStartLevel(i)}
                >
                  {i + 1}
                  <span>{l.arabicName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="btnrow" style={{ marginTop: 20 }}>
            <button className="btn green" onClick={onCreate} disabled={netStatus?.stage === 'waiting'}>
              {netStatus?.stage === 'waiting' ? '⏳ في انتظار الشريك…' : '✨ إنشاء الغرفة'}
            </button>
          </div>
          {netStatus?.stage === 'waiting' && (
            <>
              <p className="muted" style={{ marginTop: 14 }}>شارك الكود مع شريكك:</p>
              <div className="code">{roomCode}</div>
              <div className="status">
                <span className="dot" /> في انتظار انضمام الشريك — أرسل له الكود
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="field">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="مثال: 4179"
              maxLength={4}
            />
          </div>
          <div className="btnrow" style={{ marginTop: 16 }}>
            <button className="btn green" onClick={onJoin} disabled={code.length < 4 || netStatus?.stage === 'connecting'}>
              {netStatus?.stage === 'connecting' ? '⏳ جارٍ الاتصال…' : '🔗 انضمام'}
            </button>
          </div>
          {netStatus?.stage === 'error' && (
            <div className="status" style={{ color: '#ff8a8a' }}>تعذّر الاتصال — تأكد من صحة الكود.</div>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span className="backlink" onClick={onBack}>← رجوع</span>
      </div>
    </div>
  );
}
