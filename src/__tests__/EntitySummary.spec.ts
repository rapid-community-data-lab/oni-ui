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

  it('hides the In and ID rows for search results only', () => {
    expect(src).toMatch(/v-if="!searchResult && entity\.rootCollection/);
    expect(src).toMatch(/<el-row align="middle" v-if="!searchResult">\s*<p[^>]*>\s*ID:/);
  });

  it('renders Is Based On values as external links only for web URLs', () => {
    expect(src).toMatch(/v-if="entity\.isBasedOn\?\.length"/);
    expect(src).toMatch(/<a v-if="isWebUrl\(source\)" :href="source" target="_blank" rel="noopener noreferrer"/);
    expect(src).toMatch(/const isWebUrl = \(value: string\) => \/\^https\?:\\\/\\\/\/i\.test\(value\)/);
  });

  it('shows document text snippets with highlighted keywords above the relevance score', () => {
    expect(src).toMatch(/entity\.searchExtra\?\.highlight\?\._text \?\? \[\]/);
    expect(src).toMatch(/\[&_mark\]:bg-yellow-300 \[&_mark\]:font-bold/);
    expect(src.indexOf('v-for="snippet of snippets"')).toBeLessThan(src.indexOf("t('entity.relevanceScore')"));
  });
});
