import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronRight, RotateCcw } from 'lucide-react';
import { runDraw, type DrawResult, type QuotaTarget } from '../api';

interface Props {
  token: string;
  assemblyId: string;
  panelSize: number;
  targets: QuotaTarget[];
  onDone: (draw: DrawResult) => void;
  onBack: () => void;
}

export default function Draw({ token, assemblyId, panelSize, targets, onDone, onBack }: Props) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<DrawResult | null>(null);
  const [ran, setRan]           = useState(false);

  useEffect(() => {
    if (!ran) { setRan(true); triggerDraw(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function triggerDraw() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await runDraw(token, assemblyId, panelSize, targets);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Build quota fill display: for each target, show realised vs min–max
  function fillStatus(feature: string, value: string, min: number, max: number, fill: number) {
    const key = `${feature}=${value}`;
    const actual = result?.quota_fill[key] ?? fill;
    const pct = max > 0 ? Math.min(100, (actual / max) * 100) : 0;
    let cls = 'ok';
    if (actual < min) cls = 'warn';
    if (actual > max) cls = 'over';
    return { actual, pct, cls };
  }

  return (
    <div>
      <div className="step-eyebrow">Step 4 of 5</div>
      <h2 className="card-title">Draw results</h2>
      <p className="card-desc">
        Stratified random selection has been run. Review the selected cohort,
        quota fill rates, and the published seed before proceeding.
      </p>

      {loading && (
        <div className="alert alert-info" style={{ justifyContent: 'center', gap: 12 }}>
          <span className="spinner spinner-dark" aria-hidden="true" />
          <span>Running stratified draw…</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <>
          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Selected</div>
              <div className="stat-value">{result.selection.candidate_ids.length}</div>
              <div className="stat-sub">of {panelSize} requested</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Draw ID</div>
              <div className="stat-value" style={{ fontSize: 14, letterSpacing: 0, marginTop: 4 }}>
                <span className="mono-val">{result.draw_id.slice(0, 12)}…</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Published seed</div>
              <div className="stat-value" style={{ fontSize: 13, letterSpacing: 0, marginTop: 4 }}>
                <span className="mono-val" title={result.audit.seed}>
                  {result.audit.seed.slice(0, 14)}…
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="alert alert-warn" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} /> {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
              </strong>
              <ul className="warnings-list" style={{ paddingLeft: 0 }}>
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Quota fill */}
          {targets.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Quota fill</h3>
              {targets.map((t, i) => {
                const { actual, pct, cls } = fillStatus(t.feature, t.value, t.min, t.max, 0);
                return (
                  <div key={i} className="quota-row">
                    <div className="quota-header">
                      <span className="quota-label">{t.feature} = {t.value}</span>
                      <span className="quota-nums">
                        {actual} / {t.min}–{t.max}
                        {cls === 'warn' && <span style={{ color: 'var(--warn)', marginLeft: 6 }}>below min</span>}
                        {cls === 'over' && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>above max</span>}
                      </span>
                    </div>
                    <div className="quota-bar">
                      <div
                        className={`quota-fill ${cls}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={actual}
                        aria-valuemin={t.min}
                        aria-valuemax={t.max}
                      />
                    </div>
                  </div>
                );
              })}
              <hr className="divider" />
            </>
          )}

          {/* Selected cohort table */}
          <h3 style={{ marginBottom: 4 }}>Selected cohort</h3>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 8 }}>
            {result.selection.candidate_ids.length} candidates selected (showing first 50)
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate ID</th>
                  <th>Selection probability</th>
                </tr>
              </thead>
              <tbody>
                {result.selection.candidate_ids.slice(0, 50).map((id, idx) => (
                  <tr key={id}>
                    <td style={{ color: 'var(--slate-400)', width: 48 }}>{idx + 1}</td>
                    <td><span className="mono-val">{id}</span></td>
                    <td>
                      {result.selection.realised_probabilities[id] !== undefined
                        ? (result.selection.realised_probabilities[id] * 100).toFixed(2) + '%'
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.selection.candidate_ids.length > 50 && (
            <p className="hint" style={{ marginTop: 8 }}>
              +{result.selection.candidate_ids.length - 50} more candidates — download the full export in the next step.
            </p>
          )}
        </>
      )}

      <div className="nav-row">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={loading}>
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back
        </button>
        <div className="nav-row-right">
          {error && (
            <button type="button" className="btn btn-secondary" onClick={triggerDraw}>
              <RotateCcw size={15} /> Retry
            </button>
          )}
          {result && (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => onDone(result)}
            >
              Audit &amp; handoff <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
