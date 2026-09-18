'use client';

const BAT_PATH =
  'M-17,-2 L-12,2 L-9,-6 L-6,-1 L-3,-4 L-2,-9 L0,-4 L2,-9 L3,-4 L6,-1 L9,-6 L12,2 L17,-2 ' +
  'Q8,12 0,7 Q-8,12 -17,-2 Z';

export default function BatShapePreview() {
  return (
    <div style={{ background: '#17151a', minHeight: '100vh', display: 'flex', gap: 40, padding: 60, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="400" height="200" viewBox="-20 -12 40 24">
        <path d={BAT_PATH} fill="#0a0a0d" stroke="#c9d4f2" strokeWidth="0.4" />
      </svg>
      <svg width="80" height="40" viewBox="-20 -12 40 24">
        <path d={BAT_PATH} fill="#0a0a0d" stroke="#c9d4f2" strokeWidth="0.4" />
      </svg>
    </div>
  );
}
