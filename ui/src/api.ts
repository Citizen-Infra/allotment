// api.ts — typed fetch wrappers for the Allotment sortition API
// All requests include `Authorization: Bearer <token>` header.
// Base path is relative `/api` so it works in both dev (proxy) and prod (same origin).

const BASE = '/api';

async function request<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) {
        const d = json.detail;
        // The API returns a string detail for most errors, but an object
        // ({ error, warnings }) for an infeasible draw. Surface the message.
        if (typeof d === 'string') detail = d;
        else if (d && typeof d === 'object' && typeof (d as { error?: unknown }).error === 'string') {
          detail = (d as { error: string }).error;
        } else {
          detail = JSON.stringify(d);
        }
      }
    } catch {
      // ignore parse errors; use the status text instead
      detail = res.statusText || detail;
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface Assembly {
  assembly_id: string;
}

export interface Feature {
  name: string;
  values: string[];
}

export interface PoolResult {
  candidate_count: number;
  features: Feature[];
}

export interface QuotaTarget {
  feature: string;
  value: string;
  min: number;
  max: number;
}

export interface DrawSelection {
  candidate_ids: string[];
  realised_probabilities: Record<string, number>;
}

export interface DrawAudit {
  input_hash: string;
  seed: string;
  panel_size: number;
  accuracy_index: number;
  closeness_index: number;
  [key: string]: unknown;
}

export interface DrawResult {
  draw_id: string;
  selection: DrawSelection;
  quota_fill: Record<string, number>;
  audit: DrawAudit;
  warnings: string[];
}

export interface DrawFull {
  selection: DrawSelection;
  audit: DrawAudit;
  config: Record<string, unknown>;
}

export type HandoffTarget = 'export' | 'harmonica';

export interface HandoffRequest {
  target: HandoffTarget;
  fmt?: 'csv' | 'json';
  session_config?: Record<string, unknown>;
}

export interface HandoffResult {
  kind: string;
  session_id?: string;
  join_links?: string[];
  export?: string;
}

// ── API functions ───────────────────────────────────────────────────────────

/** POST /api/assemblies — create a new assembly */
export function createAssembly(
  token: string,
  name: string,
  question: string,
): Promise<Assembly> {
  return request<Assembly>('POST', '/assemblies', token, { name, question });
}

/** POST /api/assemblies/{id}/pool — upload the candidate pool CSV */
export function uploadPool(
  token: string,
  assemblyId: string,
  csv: string,
  featureColumns: string[],
  idColumn?: string,
  contactColumn?: string,
): Promise<PoolResult> {
  return request<PoolResult>('POST', `/assemblies/${assemblyId}/pool`, token, {
    csv,
    feature_columns: featureColumns,
    ...(idColumn ? { id_column: idColumn } : {}),
    ...(contactColumn ? { contact_column: contactColumn } : {}),
  });
}

/** POST /api/assemblies/{id}/draw — run the sortition draw */
export function runDraw(
  token: string,
  assemblyId: string,
  panelSize: number,
  targets: QuotaTarget[],
  panelCount?: number,
  seed?: string,
): Promise<DrawResult> {
  return request<DrawResult>('POST', `/assemblies/${assemblyId}/draw`, token, {
    panel_size: panelSize,
    targets,
    ...(panelCount !== undefined ? { panel_count: panelCount } : {}),
    ...(seed ? { seed } : {}),
  });
}

/** GET /api/draws/{draw_id} — retrieve a completed draw */
export function getDraw(token: string, drawId: string): Promise<DrawFull> {
  return request<DrawFull>('GET', `/draws/${drawId}`, token);
}

/** POST /api/draws/{draw_id}/handoff — export or send to Harmonica */
export function handoff(
  token: string,
  drawId: string,
  body: HandoffRequest,
): Promise<HandoffResult> {
  return request<HandoffResult>('POST', `/draws/${drawId}/handoff`, token, body);
}
