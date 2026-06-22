import { useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { createAssembly } from '../api';

interface Props {
  onDone: (assemblyId: string, token: string) => void;
}

export default function Assembly({ onDone }: Props) {
  const [token, setToken]       = useState('');
  const [name, setName]         = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token.trim() || !name.trim() || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createAssembly(token.trim(), name.trim(), question.trim());
      onDone(result.assembly_id, token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="step-eyebrow">Step 1 of 5</div>
      <h2 className="card-title">Connect &amp; create assembly</h2>
      <p className="card-desc">
        Enter your operator bearer token and describe the assembly. The token
        is held in browser memory only and never stored.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="token">Bearer token</label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="allotment-secret-…"
          autoComplete="off"
          required
        />
        <p className="hint">
          Set via <code>ALLOTMENT_SECRET</code> on the server. Kept in memory only.
        </p>
      </div>

      <div className="field">
        <label htmlFor="asmName">Assembly name</label>
        <input
          id="asmName"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Climate Citizens' Assembly 2025"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="question">Deliberation question</label>
        <textarea
          id="question"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="What policies should our city adopt to reach net zero by 2035?"
          required
        />
        <p className="hint">The central question this panel will deliberate on.</p>
      </div>

      <div className="nav-row">
        <span />
        <div className="nav-row-right">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !token.trim() || !name.trim() || !question.trim()}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Creating…
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Create assembly
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
