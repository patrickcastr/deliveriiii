import { buildMetadataSchema, FormSchemaV1Z } from '../src/domain/forms';

test('buildMetadataSchema validates fields as expected', () => {
  const schema = FormSchemaV1Z.parse({
    version: 1,
    fields: [
      { id: 'priority', type: 'select', label: 'Priority', required: true, options: [
        { value: 'low', label: 'Low' },
        { value: 'high', label: 'High' },
      ]},
      { id: 'fragile', type: 'checkbox', label: 'Fragile' },
      { id: 'count', type: 'photo-count', label: 'Photos', min: 1, max: 3 },
    ],
  });
  const z = buildMetadataSchema(schema);
  const ok = z.parse({ priority: 'low', fragile: true, count: 2 });
  expect(ok.priority).toBe('low');
  expect(() => z.parse({ priority: 'urgent' })).toThrowError();
});
