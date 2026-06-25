import { useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';
import { createAssembly } from '../api';
import Disclosure from '../components/Disclosure';

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

      <Disclosure
        variant="info"
        defaultOpen
        persistKey="allotment.intro"
        icon={<HelpCircle size={16} />}
        summary="New to sortition? How this draw works"
      >
        <p>
          Sortition fills a citizens' panel by fair lottery instead of by
          election or sign-up. It gives people who would never put themselves
          forward an equal chance to take part. You will move through five steps:
        </p>
        <ol>
          <li>Name the assembly and the question it will decide.</li>
          <li>Upload your pool of candidates.</li>
          <li>Set quotas so the panel mirrors the population (age, region, and so on).</li>
          <li>Run the draw.</li>
          <li>Hand the selected panel to a deliberation tool, or export it.</li>
        </ol>
        <p>
          The draw uses a fixed random <strong>seed</strong> and a method that
          gives every eligible candidate the fairest possible chance of
          selection. Because the seed and the inputs are recorded, anyone can
          re-run the same draw and check it afterwards. The whole thing takes
          about five minutes.
        </p>
      </Disclosure>

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
          placeholder="Paste your admin token"
          autoComplete="off"
          required
        />
        <p className="hint">
          The server's <code>ALLOTMENT_ADMIN_TOKEN</code>. Held in browser memory only, never stored.
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
