import { type DrawResult } from '../api';

interface Props {
  draw: DrawResult;
}

// Simple ASCII histogram for a probability distribution (not UI-rendered, just data)
// We render a visual bar chart for realized probabilities instead.

export default function Audit({ draw }: Props) {
  const { audit, selection } = draw;

  // Build a histogram of realised probabilities (10 buckets 0–100%)
  const probs = Object.values(selection.realised_probabilities);
  const buckets: number[] = new Array(10).fill(0);
  for (const p of probs) {
    const bucket = Math.min(9, Math.floor(p * 10));
    buckets[bucket]++;
  }
  const maxBucket = Math.max(...buckets, 1);

  return (
    <div>
      <div className="step-eyebrow">Step 5 of 5 · Audit</div>
      <h2 className="card-title">Audit record</h2>
      <p className="card-desc">
        This record can be independently verified. The input hash commits to
        the candidate pool; the seed commits to the random draw. Anyone with
        the same inputs and seed can reproduce this selection exactly.
      </p>

      {/* Audit block — mono, official-document feel */}
      <div className="mono-block" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px', alignItems: 'start' }}>
          <span style={{ color: 'var(--slate-500)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>Draw ID</span>
          <span style={{ wordBreak: 'break-all' }}>{draw.draw_id}</span>

          <span style={{ color: 'var(--slate-500)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>Input hash</span>
          <span style={{ wordBreak: 'break-all' }}>{audit.input_hash}</span>

          <span style={{ color: 'var(--slate-500)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>Published seed</span>
          <span style={{ wordBreak: 'break-all' }}>{audit.seed}</span>

          <span style={{ color: 'var(--slate-500)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>Panel size</span>
          <span>{audit.panel_size}</span>

          <span style={{ color: 'var(--slate-500)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>Selected</span>
          <span>{selection.candidate_ids.length} candidates</span>
        </div>
      </div>

      {/* Realised probability histogram */}
      {probs.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Realised selection probability distribution</h3>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>
            Each bucket spans 10 percentage points of individual selection probability.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 4,
              height: 80,
              marginBottom: 6,
            }}
          >
            {buckets.map((count, i) => (
              <div
                key={i}
                title={`${i * 10}–${(i + 1) * 10}%: ${count} candidates`}
                style={{
                  flex: 1,
                  background: count > 0 ? 'var(--accent)' : 'var(--slate-200)',
                  height: `${(count / maxBucket) * 100}%`,
                  minHeight: count > 0 ? 4 : 2,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease',
                  opacity: count > 0 ? 1 : 0.4,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex', gap: 4, fontSize: 11,
              color: 'var(--slate-500)', fontFamily: 'ui-monospace, monospace',
            }}
          >
            {buckets.map((_, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                {i * 10}%
              </div>
            ))}
          </div>
        </>
      )}

      {/* Additional audit fields */}
      {Object.keys(audit)
        .filter(k => !['input_hash', 'seed', 'panel_size'].includes(k))
        .length > 0 && (
        <>
          <hr className="divider" />
          <h3 style={{ marginBottom: 12 }}>Additional audit data</h3>
          <div className="mono-block">
            {Object.entries(audit)
              .filter(([k]) => !['input_hash', 'seed', 'panel_size'].includes(k))
              .map(([k, v]) => (
                <div key={k} style={{ marginBottom: 4 }}>
                  <span style={{ color: 'var(--slate-500)' }}>{k}: </span>
                  <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
