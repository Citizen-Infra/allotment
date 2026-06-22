import { useState } from 'react';
import { Download, ExternalLink, RefreshCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { handoff, type DrawResult, type HandoffResult } from '../api';

interface Props {
  token: string;
  draw: DrawResult;
  onReset: () => void;
}

export default function Handoff({ token, draw, onReset }: Props) {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [exportResult, setExport]   = useState<HandoffResult | null>(null);
  const [harmonicaResult, setHarm]  = useState<HandoffResult | null>(null);

  async function doExport(fmt: 'csv' | 'json') {
    setLoading(true); setError(null);
    try {
      const r = await handoff(token, draw.draw_id, { target: 'export', fmt });
      setExport(r);
      // Trigger download if an export blob is returned
      if (r.export) {
        const mime = fmt === 'csv' ? 'text/csv' : 'application/json';
        const blob = new Blob([r.export], { type: mime });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `allotment-draw-${draw.draw_id.slice(0, 8)}.${fmt}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function doHarmonica() {
    setLoading(true); setError(null);
    try {
      const r = await handoff(token, draw.draw_id, {
        target: 'harmonica',
        session_config: { panel_size: draw.audit.panel_size },
      });
      setHarm(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="step-eyebrow">Step 5 of 5 · Handoff</div>
      <h2 className="card-title">Handoff</h2>
      <p className="card-desc">
        The draw is complete and auditable. Export the selected cohort or invite
        them directly into a Harmonica deliberation session.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Export section */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius)',
          padding: '20px 24px',
          marginBottom: 16,
        }}
      >
        <h3 style={{ marginBottom: 6 }}>
          <Download size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Export cohort
        </h3>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 16 }}>
          Download the selected candidate list with their IDs and realised probabilities.
        </p>

        {exportResult && exportResult.export === undefined && (
          <div className="alert alert-success" style={{ marginBottom: 12 }}>
            <CheckCircle2 size={16} />
            <span>Export initiated. If a download did not start, the server returned no blob — check your API version.</span>
          </div>
        )}
        {exportResult && exportResult.export !== undefined && (
          <div className="alert alert-success" style={{ marginBottom: 12 }}>
            <CheckCircle2 size={16} />
            <span>Download started.</span>
          </div>
        )}

        <div className="download-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => doExport('csv')}
            disabled={loading}
          >
            {loading ? <span className="spinner spinner-dark" /> : <Download size={15} />}
            Download CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => doExport('json')}
            disabled={loading}
          >
            {loading ? <span className="spinner spinner-dark" /> : <Download size={15} />}
            Download JSON
          </button>
        </div>
      </div>

      {/* Harmonica section */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius)',
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginBottom: 6 }}>
          <ExternalLink size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Create Harmonica session
        </h3>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 16 }}>
          Invite the selected panel into a Harmonica deliberation session. Returns
          a join link to share with participants.
        </p>

        {harmonicaResult && (
          <div className="join-link-box" style={{ marginBottom: 16 }}>
            {harmonicaResult.session_id && (
              <p style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 6 }}>
                Session ID: <span className="mono-val">{harmonicaResult.session_id}</span>
              </p>
            )}
            {harmonicaResult.join_links && harmonicaResult.join_links.length > 0 ? (
              harmonicaResult.join_links.map((link, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    {link}
                  </a>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
                Session created — no join link returned. Check the Harmonica dashboard.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn btn-success"
          onClick={doHarmonica}
          disabled={loading || !!harmonicaResult}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Creating session…
            </>
          ) : harmonicaResult ? (
            <>
              <CheckCircle2 size={15} />
              Session created
            </>
          ) : (
            <>
              <ExternalLink size={15} />
              Create Harmonica session
            </>
          )}
        </button>
      </div>

      {/* Start over */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <RefreshCcw size={15} /> Run another draw
        </button>
      </div>
    </div>
  );
}
