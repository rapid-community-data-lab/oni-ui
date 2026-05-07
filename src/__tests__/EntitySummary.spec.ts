import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(process.cwd(), 'src/components/EntitySummary.vue'), 'utf-8');

describe('EntitySummary template (regression)', () => {
  it('uses optional chaining on entity.counts so OS-only entities do not crash render', () => {
    expect(src).not.toMatch(/v-if="entity\.counts\.(collections|objects|files)"/);
    expect(src).toMatch(/v-if="entity\.counts\?\.collections"/);
    expect(src).toMatch(/v-if="entity\.counts\?\.objects"/);
    expect(src).toMatch(/v-if="entity\.counts\?\.files"/);
  });
});

