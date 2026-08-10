// Structural fingerprint for a zod schema, used to lock each historical
// schema version's *shape* (see schemaHistory.test.ts) without comparing
// verbatim source text — comments/formatting/identifier renames don't
// affect z.toJSONSchema()'s output, only real field/type changes do.
//
// Web Crypto (not node:crypto) deliberately: this file lives under
// src/lib, which svelte-check type-checks against tsconfig.app.json's
// browser-only lib set (no Node types) — crypto.subtle is available and
// typed there via the DOM lib, and identically available in the Node
// test runner that actually calls this, so it works in both without
// pulling Node-only types into app code.
import { z } from 'zod';

export async function hashSchema(schema: z.ZodType): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(z.toJSONSchema(schema)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
