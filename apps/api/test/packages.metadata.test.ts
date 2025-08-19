import { describe, it, expect } from 'vitest';
import { buildMetadataSchema, FormSchemaV1Z } from '../src/domain/forms';

describe('metadata validation builder', () => {
  const schema = FormSchemaV1Z.parse({
    version: 1,
    fields: [
      { id: 'notes', type: 'text', label: 'Notes', required: true, maxLength: 10 },
      { id: 'weight', type: 'number', label: 'Weight', min: 0, max: 50 },
      { id: 'priority', type: 'select', label: 'Priority', required: true, options: [
        { value: 'low', label: 'Low' },
        { value: 'high', label: 'High' },
      ]},
      { id: 'fragile', type: 'checkbox', label: 'Fragile' },
      { id: 'email', type: 'email', label: 'Email' },
    ],
  });

  it('accepts valid metadata', () => {
    const z = buildMetadataSchema(schema);
    const data = z.parse({ notes: 'short', weight: 10, priority: 'high', fragile: true, email: 'a@b.com' });
    expect(data).toMatchObject({ notes: 'short', weight: 10, priority: 'high', fragile: true, email: 'a@b.com' });
  });

  it('rejects invalid select', () => {
    const z = buildMetadataSchema(schema);
    expect(() => z.parse({ notes: 'abc', priority: 'urgent' })).toThrowError();
  });

  it('enforces required text and maxLength', () => {
    const z = buildMetadataSchema(schema);
    expect(() => z.parse({ notes: '', priority: 'low' })).toThrowError();
    expect(() => z.parse({ notes: 'this is too long', priority: 'low' })).toThrowError();
  });
});
