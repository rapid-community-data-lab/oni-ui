/**
 * Integration test: verifies oni-ui can fetch data from a live rapid-community-data-lab-api instance.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const API_BASE = process.env.RAPID_COMMUNITY_DATA_LAB_API_URL ?? 'http://localhost:8080';
const TEST_CRATE_ID = 'arcp://name,bundled';

let live = false;

async function apiGet(path: string, params?: Record<string, string>): Promise<Response> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  return fetch(`${API_BASE}${path}${qs}`);
}

async function apiPost(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  try {
    const res = await fetch(`${API_BASE}/version`);
    live = res.ok;
  } catch {
    live = false;
  }
  if (!live) {
    console.warn(`[api.integration] rapid-community-data-lab-api not reachable at ${API_BASE} — tests will be skipped.`);
  }
});

afterAll(() => {
});

describe.runIf(true)('rapid-community-data-lab-api <-> oni-ui integration', () => {
  it('skips when API is unreachable', () => {
    if (!live) {
      console.warn('Skipping integration assertions: API not reachable.');
    }
    expect(true).toBe(true);
  });

  it('GET /version returns a JSON version string', async () => {
    if (!live) return;
    const res = await fetch(`${API_BASE}/version`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string };
    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
  });

  it('GET /entities returns a non-empty list with the bundled collection', async () => {
    if (!live) return;
    const res = await apiGet('/entities', { limit: '10' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      total: number;
      entities: { id: string; name: string; entityType: string }[];
    };
    expect(body.total).toBeGreaterThan(0);
    expect(Array.isArray(body.entities)).toBe(true);
    const collection = body.entities.find((e) => e.id === TEST_CRATE_ID);
    expect(collection, 'bundled crate should be present in /entities').toBeDefined();
    expect(collection?.name).toBe('Corpus of Oni');
  });

  it('GET /entity/:id returns the bundled collection details', async () => {
    if (!live) return;
    const res = await apiGet(`/entity/${encodeURIComponent(TEST_CRATE_ID)}`);
    expect(res.status).toBe(200);
    const entity = (await res.json()) as {
      id: string;
      name: string;
      description: string;
      entityType: string;
      access: { metadata: boolean; content: boolean };
    };
    expect(entity.id).toBe(TEST_CRATE_ID);
    expect(entity.name).toBe('Corpus of Oni');
    expect(entity.description).toMatch(/test data/i);
    expect(entity.access.metadata).toBe(true);
  });

  it('GET /entity/:id/rocrate returns RO-Crate JSON-LD', async () => {
    if (!live) return;
    const res = await apiGet(`/entity/${encodeURIComponent(TEST_CRATE_ID)}/rocrate`);
    expect(res.status).toBe(200);
    const crate = (await res.json()) as { '@graph': Array<Record<string, unknown>> };
    expect(Array.isArray(crate['@graph'])).toBe(true);
    expect(crate['@graph'].length).toBeGreaterThan(1);
    const root = crate['@graph'].find(
      (n) => (n['@id'] as string | string[] | undefined) === TEST_CRATE_ID,
    );
    expect(root, 'rocrate must contain the root dataset node').toBeDefined();
    const name = root?.name as string | string[] | undefined;
    const flat = Array.isArray(name) ? name[0] : name;
    expect(flat).toBe('Corpus of Oni');
  });

  it('POST /search returns search results with facets', async () => {
    if (!live) return;
    const res = await apiPost('/search', { searchType: 'basic', query: 'Ldaca' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      total: number;
      entities: Array<{ id: string; name: string }>;
      facets: Record<string, Array<{ name: string; count: number }>>;
    };
    expect(typeof body.total).toBe('number');
    expect(body.total).toBeGreaterThan(0);
    expect(Array.isArray(body.entities)).toBe(true);
    expect(body.entities.length).toBeGreaterThan(0);
    expect(body.entities.some((e) => e.name === 'Ldaca')).toBe(true);
    expect(body.facets).toBeTypeOf('object');
    expect(Object.keys(body.facets).length).toBeGreaterThan(0);
  });

  it('POST /search with geohashPrecision returns geo aggregation without fielddata error (Map View)', async () => {
    if (!live) return;
    const res = await apiPost('/search', {
      searchType: 'basic',
      query: '',
      filters: {},
      limit: 10,
      offset: 0,
      geohashPrecision: 3,
      boundingBox: { topRight: { lat: 85, lng: 180 }, bottomLeft: { lat: -85, lng: -180 } },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; entities: unknown[]; error?: string };
    expect(body).not.toHaveProperty('error');
    expect(typeof body.total).toBe('number');
  });

  it('GET /entities accepts the sort fields used by oni-ui list view', async () => {
    if (!live) return;
    for (const sort of ['id', 'name', 'createdAt', 'updatedAt'] as const) {
      const res = await apiGet('/entities', { sort, order: 'asc', limit: '1' });
      expect(res.status, `sort=${sort} should be accepted`).toBe(200);
    }
    const bad = await apiGet('/entities', { sort: 'identifier', order: 'asc' });
    expect(bad.status).toBe(400);
  });

  it('oni-ui configuration.json sorting values are valid API sort fields', async () => {
    type SortingCfg = { ui?: { search?: { sorting?: Array<{ value: string; label: string }> } } };
    let uiAlive = false;
    let cfg: SortingCfg | null = null;
    try {
      const res = await fetch('http://localhost:5173/configuration.json');
      uiAlive = res.ok;
      if (uiAlive) cfg = (await res.json()) as SortingCfg;
    } catch {
      uiAlive = false;
    }
    if (!uiAlive || !cfg) {
      console.warn('oni-ui dev server not reachable — skipping sorting-config check.');
      return;
    }
    const sortValues = (cfg.ui?.search?.sorting ?? []).map((s) => s.value);
    expect(sortValues.length).toBeGreaterThan(0);
    const allowed = new Set(['relevance', 'id', 'name', 'createdAt', 'updatedAt']);
    for (const v of sortValues) {
      expect(allowed.has(v), `sort value "${v}" is not accepted by the API`).toBe(true);
    }
  });

  it('oni-ui topNavItems entityType filters match real stored entityType values', async () => {
    if (!live) return;
    type NavCfg = { ui?: { topNavItems?: Array<{ route: string; display: string }> } };
    let uiAlive = false;
    let cfg: NavCfg | null = null;
    try {
      const res = await fetch('http://localhost:5173/configuration.json');
      uiAlive = res.ok;
      if (uiAlive) cfg = (await res.json()) as NavCfg;
    } catch {
      uiAlive = false;
    }
    if (!uiAlive || !cfg) {
      console.warn('oni-ui dev server not reachable — skipping topNavItems check.');
      return;
    }
    const items = cfg.ui?.topNavItems ?? [];
    const navWithFilter = items.filter((i) => i.route.includes('entityType='));
    expect(navWithFilter.length).toBeGreaterThan(0);
    let totalAcrossNav = 0;
    for (const item of navWithFilter) {
      const qs = item.route.split('?')[1] ?? '';
      const params = new URLSearchParams(qs);
      const entityType = params.get('entityType');
      if (!entityType) continue;
      const res = await apiGet('/entities', { entityType, limit: '1' });
      expect(res.status, `topNav "${item.display}" filter must be accepted`).toBe(200);
      const body = (await res.json()) as { total: number };
      totalAcrossNav += body.total;
    }
    expect(
      totalAcrossNav,
      'no topNav entityType filter matches any real entity — UI nav would be empty',
    ).toBeGreaterThan(0);
  });

  it('oni-ui dev server (if running) serves /configuration.json that points at the API', async () => {
    type ApiCfg = { api?: { rocrate?: { endpoint?: string } } };
    let uiAlive = false;
    let cfg: ApiCfg | null = null;
    try {
      const res = await fetch('http://localhost:5173/configuration.json');
      uiAlive = res.ok;
      if (uiAlive) cfg = (await res.json()) as ApiCfg;
    } catch {
      uiAlive = false;
    }
    if (!uiAlive || !cfg) {
      console.warn('oni-ui dev server not reachable — skipping configuration check.');
      return;
    }
    expect(cfg.api?.rocrate?.endpoint).toBeDefined();
    // configuration.json should point to the live rapid-community-data-lab-api we just exercised.
    const configured = (cfg.api?.rocrate?.endpoint ?? '').replace(/\/$/, '');
    const expected = API_BASE.replace(/\/$/, '');
    expect(configured).toBe(expected);
  });
});
