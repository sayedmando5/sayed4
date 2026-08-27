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
}) {
  const charOptions = [
    { id: 'sayed', label: 'سيد', desc: 'قوي — يرمي ويسحب ويكسر', sel: 'sel-sayed' },
    { id: 'yasmin', label: 'ياسمين', desc: 'رشيقة — قفزة مزدوجة واختراق', sel: 'sel-yasmin' },
  ];

  return (
    <div className="card" style={{ maxWidth: 520 }}>
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
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SYO-XXXXX"
              maxLength={9}
            />
          </div>
          <div className="btnrow" style={{ marginTop: 16 }}>
            <button className="btn green" onClick={onJoin} disabled={code.length < 6 || netStatus?.stage === 'connecting'}>
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
