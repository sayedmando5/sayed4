'use client';

export default function Home({ onPlay, onLevelSelect, onLocal }) {
  return (
    <div className="card" style={{ maxWidth: 540 }}>
      <div className="hero">
        <div className="avatars">
          <img src="/avatars/sayed.png" alt="سيد" />
          <span className="plus">+</span>
          <img className="yasmin" src="/avatars/yasmin.png" alt="ياسمين" />
        </div>
        <h1 className="title">سيد & ياسمين</h1>
        <p className="sub">The Endless Odyssey — رحلة بلا نهاية</p>
      </div>

      <div className="btnrow">
        <button className="btn" onClick={onPlay}>
          🎮 العب أونلاين
        </button>
      </div>
      <div className="btnrow">
        <button className="btn ghost" onClick={onLocal}>
          🕹️ لعب محلي (شاشة واحدة)
        </button>
        <button className="btn green" onClick={onLevelSelect}>
          🗺️ اختيار المرحلة
        </button>
      </div>

      <p className="muted" style={{ marginTop: 22 }}>
        لعبة تعاونية بين لاعبَين عبر الإنترنت — اتصال مباشر Peer-to-Peer (WebRTC)
        بدون سيرفرات.
        <br />
        تحرّك، اقفز، ادفع، اخترق، وارمِ شريكك لتحلّوا الألغاز معاً.
      </p>
    </div>
  );
}
