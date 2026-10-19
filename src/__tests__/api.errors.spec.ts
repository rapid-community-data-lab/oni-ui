import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '@/services/api';

vi.mock('@/services/auth', () => ({
  getValidAccessToken: vi.fn(async () => undefined),
  forceRenewToken: vi.fn(async () => undefined),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ reset: vi.fn() }),
}));

const stubFetch = (response: Response) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
};

describe('ApiService error responses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the HTTP status when a gateway returns a non-JSON body', async () => {
    stubFetch(
      new Response('Bad Gateway', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'content-type': 'text/plain' },
      }),
    );

    await expect(new ApiService().getEntities({ memberOf: 'arcp://name,example' })).rejects.toThrow(
      'API request failed: 502 Bad Gateway',
    );
  });

  it('reports the HTTP status when a POST receives a non-JSON body', async () => {
    stubFetch(new Response('<html>Gateway Timeout</html>', { status: 504, statusText: 'Gateway Timeout' }));

    await expect(new ApiService().search({ query: 'x' } as never)).rejects.toThrow(
      'API request failed: 504 Gateway Timeout',
    );
  });

  it('keeps surfacing JSON error messages from the API', async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Database error' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(new ApiService().getEntities({})).rejects.toThrow('Database error');
  });

  it('returns parsed JSON for successful responses', async () => {
    stubFetch(
      new Response(JSON.stringify({ total: 1, entities: [{ id: 'arcp://name,example' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(new ApiService().getEntities({})).resolves.toEqual({
      total: 1,
      entities: [{ id: 'arcp://name,example' }],
    });
  });
});
