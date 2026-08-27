'use client';

// On-screen touch controls so the game runs great on phones/tablets.
// Each device renders a control cluster ONLY for the character(s) it controls,
// so in online mode each player uses their own phone.
import { useMemo } from 'react';

const CHAR_META = {
  sayed: { label: 'سيد', color: '#8ea9c8' },
  yasmin: { label: 'ياسمين', color: '#a8679d' },
};

// A single press/release button wired to pointer events (works for touch + mouse).
function Pad({ onPress, onRelease, className, children, label }) {
  return (
    <button
      type="button"
      className={`pad ${className || ''}`}
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); onPress(); }}
      onPointerUp={(e) => { e.preventDefault(); onRelease(); }}
      onPointerCancel={() => onRelease()}
      onPointerLeave={() => onRelease()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export default function MobileControls({ controlled, onControl }) {
  // Number of characters playing on THIS device: 2 = local split, 1 = online.
  const isSplit = controlled.length > 1;

  const clusters = useMemo(() => controlled.map((id) => ({ id, ...CHAR_META[id] })), [controlled]);

  return (
    <div className="touch-overlay">
      {clusters.map((c) => (
        <div key={c.id} className={`touch-cluster ${isSplit ? 'split' : 'solo'}`} style={{ ['--chr' ]: c.color }}>
          {/* movement d-pad (left side of the cluster) */}
          <div className="move-grp">
            <Pad label={`${c.label} يسار`} onPress={() => onControl(c.id, 'left', true)} onRelease={() => onControl(c.id, 'left', false)}>
              <span>◀</span>
            </Pad>
            <Pad label={`${c.label} يمين`} onPress={() => onControl(c.id, 'right', true)} onRelease={() => onControl(c.id, 'right', false)}>
              <span>▶</span>
            </Pad>
          </div>

          {/* action buttons (right side of the cluster) */}
          <div className="act-grp">
            <Pad className="act" label={`${c.label} تفاعل`} onPress={() => onControl(c.id, 'interact', true)} onRelease={() => onControl(c.id, 'interact', false)}>
              <span>✋</span>
            </Pad>
            {c.id === 'sayed' && (
              <Pad className="act" label="رمي" onPress={() => onControl(c.id, 'throw', true)} onRelease={() => onControl(c.id, 'throw', false)}>
                <span>🎯</span>
              </Pad>
            )}
            <Pad className="act jump" label={`${c.label} قفز`} onPress={() => onControl(c.id, 'jump', true)} onRelease={() => onControl(c.id, 'jump', false)}>
              <span>⬆</span>
            </Pad>
          </div>
        </div>
      ))}
    </div>
  );
}
