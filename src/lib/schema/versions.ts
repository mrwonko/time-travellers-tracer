// Single source of truth for which schemaVersions exist — both
// persistence.ts (parsing/migration) and schemaHistory.test.ts (the
// hash-lock) read from this instead of keeping their own lists that could
// drift apart.
import { storedDocumentV1Schema } from './v1';
import { storedDocumentV2Schema } from './v2';

export const SCHEMA_VERSIONS = {
  1: storedDocumentV1Schema,
  2: storedDocumentV2Schema,
} as const;
