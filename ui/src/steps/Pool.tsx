import { useState, useRef } from 'react';
import { Upload, AlertCircle, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { uploadPool, type PoolResult } from '../api';

interface Props {
  token: string;
  assemblyId: string;
  onDone: (pool: PoolResult) => void;
  onBack: () => void;
}

/**
 * Parse the header row of a CSV string. Tolerates \r\n line endings and
 * RFC-4180-style quoted fields: a field wrapped in double quotes may contain
 * commas, and a doubled quote ("") inside such a field is a literal quote.
 */
function parseCSVHeader(csv: string): string[] {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? '';
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (inQuotes) {
      if (ch === '"') {
        if (firstLine[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map(c => c.trim());
}

export default function Pool({ token, assemblyId, onDone, onBack }: Props) {
  const [csv, setCsv]                         = useState('');
  const [columns, setColumns]                 = useState<string[]>([]);
  const [featureCols, setFeatureCols]         = useState<Set<string>>(new Set());
  const [idColumn, setIdColumn]               = useState('id');
  const [contactColumn, setContactColumn]     = useState('contact');
  const [dragging, setDragging]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [preview, setPreview]                 = useState<PoolResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadCSV(text: string) {
    setCsv(text);
    const cols = parseCSVHeader(text);
    setColumns(cols);
    // Default feature cols = everything except id/contact
    const defaultFeatures = new Set(
      cols.filter(c => c !== 'id' && c !== 'contact' && c !== 'email')
    );
    setFeatureCols(defaultFeatures);
    setPreview(null);
    setError(null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => loadCSV((e.target?.result as string) ?? '');
    reader.readAsText(file);
  }

  function toggleFeature(col: string) {
    setFeatureCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  async function handleUpload() {
    if (!csv.trim() || featureCols.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uploadPool(
        token,
        assemblyId,
        csv,
        Array.from(featureCols),
        idColumn || undefined,
        contactColumn || undefined,
      );
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave()                   { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div className="step-eyebrow">Step 2 of 5</div>
      <h2 className="card-title">Upload candidate pool</h2>
      <p className="card-desc">
        Paste or upload a CSV where each row is a candidate. One column must
        identify the candidate; one (optional) holds contact details.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload zone */}
      {!csv && (
        <div
          className={`upload-zone${dragging ? ' dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="upload-icon">
            <Upload size={32} />
          </div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop a CSV here or click to browse</p>
          <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
            First row must be column headers.
          </p>
        </div>
      )}

      {/* Paste area — shown only when no file loaded */}
      {!csv && (
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="csvPaste">Or paste CSV text</label>
          <textarea
            id="csvPaste"
            style={{ minHeight: 120, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
            placeholder="id,age_band,gender,region&#10;C001,25-34,F,North&#10;C002,35-44,M,South"
            onChange={e => e.target.value && loadCSV(e.target.value)}
          />
        </div>
      )}

      {/* Column selection — shown once CSV is loaded */}
      {csv && columns.length > 0 && (
        <>
          <div className="alert alert-success">
            <Check size={16} />
            <span>CSV loaded — {csv.split('\n').filter(Boolean).length - 1} rows detected.</span>
          </div>

          <div className="field">
            <label>Stratification features</label>
            <p className="hint" style={{ marginBottom: 8 }}>
              Stratifying makes the panel mirror the population on the traits you choose. Pick those columns; they become the quota dimensions.
            </p>
            <div className="tag-list">
              {columns.map(col => (
                <button
                  key={col}
                  type="button"
                  className={`tag${featureCols.has(col) ? ' selected' : ''}`}
                  onClick={() => toggleFeature(col)}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="idCol">ID column</label>
              <select
                id="idCol"
                value={idColumn}
                onChange={e => setIdColumn(e.target.value)}
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="hint">Unique identifier for each candidate.</p>
            </div>
            <div className="field">
              <label htmlFor="contactCol">Contact column</label>
              <select
                id="contactCol"
                value={contactColumn}
                onChange={e => setContactColumn(e.target.value)}
              >
                <option value="">(none)</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="hint">Email or phone for invitation.</p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setCsv(''); setColumns([]); setFeatureCols(new Set()); setPreview(null); }}
            style={{ marginBottom: 16 }}
          >
            Clear &amp; reload
          </button>
        </>
      )}

      {/* Preview result */}
      {preview && (
        <div className="alert alert-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <strong>{preview.candidate_count} candidates accepted</strong>
          <span>
            Features: {preview.features.map(f => `${f.name} (${f.values.length} values)`).join(' · ')}
          </span>
        </div>
      )}

      <div className="nav-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="nav-row-right">
          {!preview && csv && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleUpload}
              disabled={loading || featureCols.size === 0}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-dark" aria-hidden="true" />
                  Uploading…
                </>
              ) : (
                'Upload pool'
              )}
            </button>
          )}
          {preview && (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => onDone(preview)}
            >
              Set quotas <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
