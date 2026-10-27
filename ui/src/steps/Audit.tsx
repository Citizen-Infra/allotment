import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { type DrawResult } from '../api';
import Disclosure from '../components/Disclosure';

interface Props {
  draw: DrawResult;
}

export default function Audit({ draw }: Props) {
  const { audit, selection } = draw;
  const [copied, setCopied] = useState(false);
  const hasQuotas = Object.keys(draw.quota_fill).length > 0;

  // Plain-text audit record an auditor can copy out and re-run the draw with.
  function copyRecord() {
    const lines = [
      'Allotment draw audit record',
      `Draw ID:     ${draw.draw_id}`,
      `Input hash:  ${audit.input_hash}`,
      `Published seed: ${audit.seed}`,
      `Panel size:  ${audit.panel_size}`,
      `Selected:    ${selection.candidate_ids.length} candidates`,
      ...(hasQuotas
        ? [
            `Accuracy index:  ${audit.accuracy_index}`,
            `Closeness index: ${audit.closeness_index}`,
          ]
        : []),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
        The draw is complete. The record below is its proof: anyone with the
        same inputs and seed can reproduce this exact selection.
      </p>

      <Disclosure
        variant="info"
        defaultOpen
        persistKey="allotment.verify"
        icon={<ShieldCheck size={16} />}
        summary="Is this draw fair? How to verify it"
      >
        <p>
          Every Allotment draw is reproducible. Two fingerprints in the record
          below let an outside observer confirm this panel really came from
          these inputs:
        </p>
        <ol>
          <li>
            <strong>Input hash</strong> — a fingerprint of the exact candidate
            pool and quotas used. Change a single row and this hash changes, so
            it pins down which inputs produced this panel.
          </li>
          <li>
            <strong>Published seed</strong> — the random value that drove the
            lottery, recorded alongside the result.
          </li>
        </ol>
        <p>
          <strong>To check it,</strong> re-run the draw on the open-source
          engine with the same pool and the same seed. Allotment is
          deterministic, so you will get a byte-for-byte identical panel. A
          different result means the inputs or seed differ from what is recorded
          here.
        </p>
        <p>
          This proves the draw is reproducible. A stronger guarantee, where the
          seed is drawn from a public randomness beacon so even the operator
          cannot steer it, is on the roadmap.
        </p>
      </Disclosure>

      {/* Audit block — mono, official-document feel */}
      <div className="audit-head">
        <h3>Reproducibility record</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copyRecord}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy record'}
        </button>
      </div>
      <div className="mono-block audit-record" style={{ marginBottom: 24 }}>
        <div className="audit-record-grid">
          <span className="audit-record-label">Draw ID</span>
          <span style={{ wordBreak: 'break-all' }}>{draw.draw_id}</span>

          <span className="audit-record-label">Input hash</span>
          <span style={{ wordBreak: 'break-all' }}>{audit.input_hash}</span>

          <span className="audit-record-label">Published seed</span>
          <span style={{ wordBreak: 'break-all' }}>{audit.seed}</span>

          <span className="audit-record-label">Panel size</span>
          <span>{audit.panel_size}</span>

          <span className="audit-record-label">Selected</span>
          <span>{selection.candidate_ids.length} candidates</span>
        </div>
      </div>

      {/* Representativeness — how closely the panel matches the quota targets */}
      {hasQuotas && (
        <>
          <h3 style={{ marginBottom: 4 }}>Representativeness</h3>
          <p className="hint" style={{ marginBottom: 14 }}>
            How closely the panel matches the centre of every quota band you set. 0 is a perfect match.
          </p>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Accuracy index</div>
              <div className="stat-value">{audit.accuracy_index}</div>
              <div className="stat-sub">total seats away from target</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Closeness index</div>
              <div className="stat-value">{audit.closeness_index}</div>
              <div className="stat-sub">large gaps weighted more heavily</div>
            </div>
          </div>
        </>
      )}

      {/* Realised probability histogram */}
      {probs.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Realised selection probability distribution</h3>
          <p className="hint" style={{ marginBottom: 14 }}>
            Each bucket spans 10 percentage points of individual selection probability.
          </p>
          <div className="probability-distribution" role="list" aria-label="Selection probability distribution">
            {buckets.map((count, i) => (
              <div
                className="probability-bucket"
                role="listitem"
                key={i}
                style={{ '--bucket-scale': count / maxBucket } as CSSProperties}
              >
                <span className="probability-label">{i * 10}–{(i + 1) * 10}%</span>
                <div className="probability-track" aria-hidden="true"><div className="probability-fill" /></div>
                <span className="probability-count">{count}<span className="sr-only"> candidates</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Additional audit fields */}
      {Object.keys(audit)
        .filter(k => !['input_hash', 'seed', 'panel_size', 'accuracy_index', 'closeness_index'].includes(k))
        .length > 0 && (
        <>
          <hr className="divider" />
          <h3 style={{ marginBottom: 12 }}>Additional audit data</h3>
          <div className="mono-block">
            {Object.entries(audit)
              .filter(([k]) => !['input_hash', 'seed', 'panel_size', 'accuracy_index', 'closeness_index'].includes(k))
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
