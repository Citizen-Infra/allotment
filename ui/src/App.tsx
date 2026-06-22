import { useState } from 'react';
import { Shuffle, Check } from 'lucide-react';
import Assembly from './steps/Assembly';
import Pool from './steps/Pool';
import Quotas from './steps/Quotas';
import Draw from './steps/Draw';
import Audit from './steps/Audit';
import Handoff from './steps/Handoff';
import type { PoolResult, DrawResult, QuotaTarget } from './api';

// ── Wizard steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Assembly' },
  { label: 'Pool' },
  { label: 'Quotas' },
  { label: 'Draw' },
  { label: 'Handoff' },
] as const;

type Step = 0 | 1 | 2 | 3 | 4;

// ── App state ─────────────────────────────────────────────────────────────────
interface WizardState {
  token: string;
  assemblyId: string;
  pool: PoolResult | null;
  panelSize: number;
  targets: QuotaTarget[];
  draw: DrawResult | null;
}

const INITIAL: WizardState = {
  token: '',
  assemblyId: '',
  pool: null,
  panelSize: 30,
  targets: [],
  draw: null,
};

export default function App() {
  const [step, setStep]   = useState<Step>(0);
  const [state, setState] = useState<WizardState>(INITIAL);

  function reset() {
    setState(INITIAL);
    setStep(0);
  }

  // ── Progress track ─────────────────────────────────────────────────────────
  function stepClass(i: number) {
    if (i < step) return 'ballot-step done';
    if (i === step) return 'ballot-step active';
    return 'ballot-step upcoming';
  }

  return (
    <div className="layout">
      {/* Wordmark */}
      <header className="wordmark">
        <div className="wordmark-icon" aria-hidden="true">
          <Shuffle size={17} strokeWidth={2.5} />
        </div>
        <div>
          <div className="wordmark-text">Allotment</div>
          <div className="wordmark-sub">Sortition engine</div>
        </div>
      </header>

      {/* Ballot-strip progress track */}
      <nav className="ballot-track" aria-label="Wizard progress">
        {STEPS.map((s, i) => (
          <div key={s.label} className={stepClass(i)} aria-current={i === step ? 'step' : undefined}>
            <div className="bs-num" aria-hidden="true">
              {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
            </div>
            <span className="bs-label">{s.label}</span>
          </div>
        ))}
      </nav>

      {/* Step card */}
      <main className="card">
        {step === 0 && (
          <Assembly
            onDone={(assemblyId, token) => {
              setState(s => ({ ...s, assemblyId, token }));
              setStep(1);
            }}
          />
        )}

        {step === 1 && (
          <Pool
            token={state.token}
            assemblyId={state.assemblyId}
            onDone={pool => {
              setState(s => ({ ...s, pool }));
              setStep(2);
            }}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && state.pool && (
          <Quotas
            features={state.pool.features}
            onDone={(panelSize, targets) => {
              setState(s => ({ ...s, panelSize, targets }));
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Draw
            token={state.token}
            assemblyId={state.assemblyId}
            panelSize={state.panelSize}
            targets={state.targets}
            onDone={draw => {
              setState(s => ({ ...s, draw }));
              setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && state.draw && (
          <>
            <Audit draw={state.draw} />
            <hr className="divider" />
            <Handoff
              token={state.token}
              draw={state.draw}
              onReset={reset}
            />
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', marginTop: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>
          Allotment · open-source sortition engine
        </p>
      </footer>
    </div>
  );
}
