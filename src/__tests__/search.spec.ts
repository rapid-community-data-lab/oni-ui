import { describe, expect, it } from 'vitest';
import { type AdvancedSearchLine, blankAdvancedSearchLine, generateQueryString } from '@/composables/search';
import { ui } from '@/configuration';

const line = (overrides: Partial<AdvancedSearchLine>): AdvancedSearchLine => ({
  ...blankAdvancedSearchLine,
  ...overrides,
});

describe('generateQueryString', () => {
  it('groups the whole input under every configured field for all-fields searches', () => {
    const query = generateQueryString([line({ searchInput: 'Neville Bonner' })]);
    const groups = Object.keys(ui.searchFields).map((field) => `${field}: (Neville Bonner)`);
    expect(query.replace(/\s+/g, ' ').trim()).toBe(`( ${groups.join(' OR ')} )`);
  });

  it('keeps single-field lines grouped and joins lines with their operation', () => {
    const query = generateQueryString([
      line({ field: '_text', searchInput: '"Neville Bonner"', operation: 'NOT' }),
      line({ field: 'name', searchInput: 'receipt' }),
    ]);
    expect(query.replace(/\s+/g, ' ').trim()).toBe('( _text: ("Neville Bonner") ) NOT ( name: (receipt) )');
  });

  it('searches the indexed document text field', () => {
    expect(ui.searchFields).toHaveProperty('_text');
    expect(ui.searchFields).not.toHaveProperty('text');
  });
});
