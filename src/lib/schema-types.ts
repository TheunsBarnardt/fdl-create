import { z } from 'zod';

export const FieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'email', 'number', 'boolean', 'date', 'select', 'textarea']),
  label: z.string().optional(),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  default: z.any().optional(),
  options: z.array(z.string()).optional()
});
export type Field = z.infer<typeof FieldSchema>;

export const CollectionSchemaJson = z.object({
  fields: z.array(FieldSchema).min(1)
});
export type CollectionSchemaJson = z.infer<typeof CollectionSchemaJson>;

export function parseCollectionSchema(raw: string): CollectionSchemaJson {
  return CollectionSchemaJson.parse(JSON.parse(raw));
}

export function buildRecordValidator(schema: CollectionSchemaJson) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of schema.fields) {
    let base: z.ZodTypeAny;
    switch (f.type) {
      case 'number': base = z.coerce.number(); break;
      case 'boolean': base = z.coerce.boolean(); break;
      case 'date': base = z.coerce.date(); break;
      case 'email': base = z.string().email(); break;
      case 'select': base = f.options ? z.enum(f.options as [string, ...string[]]) : z.string(); break;
      default: base = z.string();
    }
    if (!f.required) base = base.optional().nullable();
    shape[f.name] = base;
  }
  return z.object(shape);
}
