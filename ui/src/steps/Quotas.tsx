import { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import type { Feature, QuotaTarget } from '../api';

interface Props {
  features: Feature[];
  onDone: (panelSize: number, targets: QuotaTarget[]) => void;
  onBack: () => void;
}

interface TargetRow extends QuotaTarget {
  id: number;
}

// Bouricius body-type presets (panel size only — quotas depend on population)
const PRESETS: { label: string; panelSize: number }[] = [
  { label: 'Select a preset…', panelSize: 0 },
  { label: 'Policy Jury (~500)',       panelSize: 500 },
  { label: 'Review Panel (~30)',        panelSize: 30 },
  { label: 'Mini-Public (~100)',        panelSize: 100 },
  { label: 'Citizens\' Assembly (~150)', panelSize: 150 },
  { label: 'Sortition Commission (~25)', panelSize: 25 },
];

let nextId = 1;

export default function Quotas({ features, onDone, onBack }: Props) {
  const [panelSize, setPanelSize] = useState(30);
  const [rows, setRows]           = useState<TargetRow[]>([]);
  const [preset, setPreset]       = useState('0');

  function addRow() {
    const defaultFeature = features[0]?.name ?? '';
    const defaultValue   = features[0]?.values[0] ?? '';
    setRows(prev => [
      ...prev,
      { id: nextId++, feature: defaultFeature, value: defaultValue, min: 0, max: panelSize },
    ]);
  }

  function removeRow(id: number) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id: number, patch: Partial<QuotaTarget>) {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        // When feature changes, reset value to first option for that feature
        if (patch.feature) {
          const feat = features.find(f => f.name === patch.feature);
          updated.value = feat?.values[0] ?? '';
        }
        return updated;
      })
    );
  }

  function applyPreset(val: string) {
    setPreset(val);
    const p = PRESETS[parseInt(val, 10)];
    if (p && p.panelSize > 0) setPanelSize(p.panelSize);
  }

  const targets: QuotaTarget[] = rows.map(({ feature, value, min, max }) => ({
    feature, value, min, max,
  }));

  // A quota target is valid when 0 ≤ min ≤ max ≤ panelSize.
  function rowError(r: TargetRow): string | null {
    if (r.min < 0 || r.max < 0) return 'Min and max must be 0 or more.';
    if (r.min > r.max) return 'Min cannot be greater than max.';
    if (r.max > panelSize) return `Max cannot exceed the panel size (${panelSize}).`;
    return null;
  }
  const invalidRows = rows.filter(r => rowError(r) !== null).length;
  const canContinue = panelSize > 0 && invalidRows === 0;

  return (
    <div>
      <div className="step-eyebrow">Step 3 of 5</div>
      <h2 className="card-title">Panel size &amp; quotas</h2>
      <p className="card-desc">
        Set the panel size and add stratification targets. Each quota constrains
        how many panel members may have a given feature value.
      </p>

      {/* Panel size + preset */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="panelSize">Panel size</label>
          <input
            id="panelSize"
            type="number"
            min={1}
            value={panelSize}
            onChange={e => setPanelSize(parseInt(e.target.value, 10) || 0)}
          />
          <p className="hint">Total seats to fill.</p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="preset">
            <Sliders size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Bouricius preset
          </label>
          <select
            id="preset"
            value={preset}
            onChange={e => applyPreset(e.target.value)}
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={String(i)}>{p.label}</option>
            ))}
          </select>
          <p className="hint">Common body sizes from Bouricius's multi-body sortition design. Pre-fills the panel size; edit freely after.</p>
        </div>
      </div>

      <hr className="divider" />

      {/* Quota targets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Quota targets</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
          <Plus size={14} /> Add target
        </button>
      </div>

      {rows.length === 0 && (
        <div className="alert alert-info">
          No quota targets set. The draw will use unrestricted random sampling.
          Add targets to stratify by feature values.
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Header row labels */}
          <div className="quota-target-row" style={{ marginBottom: 4 }}>
            <span className="field-label">Feature</span>
            <span className="field-label">Value</span>
            <span className="field-label">Min</span>
            <span className="field-label">Max</span>
            <span />
          </div>

          {rows.map(row => {
            const err = rowError(row);
            return (
              <div key={row.id}>
                <div className="quota-target-row">
                  <select
                    value={row.feature}
                    onChange={e => updateRow(row.id, { feature: e.target.value })}
                    aria-label="Feature"
                  >
                    {features.map(f => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>

                  <select
                    value={row.value}
                    onChange={e => updateRow(row.id, { value: e.target.value })}
                    aria-label="Value"
                  >
                    {(features.find(f => f.name === row.feature)?.values ?? []).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={0}
                    max={panelSize}
                    value={row.min}
                    onChange={e => updateRow(row.id, { min: parseInt(e.target.value, 10) || 0 })}
                    aria-label="Min"
                    aria-invalid={err ? true : undefined}
                  />

                  <input
                    type="number"
                    min={0}
                    max={panelSize}
                    value={row.max}
                    onChange={e => updateRow(row.id, { max: parseInt(e.target.value, 10) || 0 })}
                    aria-label="Max"
                    aria-invalid={err ? true : undefined}
                  />

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove"
                    style={{ padding: '7px 8px', color: 'var(--danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {err && (
                  <p className="hint" role="alert" style={{ color: 'var(--danger)', marginTop: -2, marginBottom: 10 }}>
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </>
      )}

      <div className="nav-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!canContinue}
          onClick={() => onDone(panelSize, targets)}
        >
          Review draw <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
