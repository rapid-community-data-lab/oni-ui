import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_PATH = resolve(process.cwd(), 'configuration.json');
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url === '/configuration.json' || url.endsWith('/configuration.json')) {
    try {
      const body = readFileSync(CONFIG_PATH, 'utf-8');
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
    }
  }
  return realFetch(input as never, init);
}) as typeof fetch;
