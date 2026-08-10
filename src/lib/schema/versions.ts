// Single source of truth for which schemaVersions exist — both
// persistence.ts (parsing/migration) and schemaHistory.test.ts (the
// hash-lock) read from this instead of keeping their own lists that could
// drift apart.
//
// Ordered by version, and that order *is* the version number — index 0 is
// schemaVersion 1, index 1 is schemaVersion 2, etc. schemaVersions are
// always sequential integers starting at 1 (persistence.ts's
// CURRENT_SCHEMA_VERSION/migrate() assume this too), so a separate
// version field on each entry would just duplicate the array position.
// Stored as the literal tuple z.discriminatedUnion() needs, so
// persistence.ts can use it directly instead of re-enumerating versions.
import { storedDocumentV1Schema } from './v1';
import { storedDocumentV2Schema } from './v2';

export const SCHEMA_VERSIONS = [storedDocumentV1Schema, storedDocumentV2Schema] as const;
