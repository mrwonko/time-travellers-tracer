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
import { storedDocumentV2Schema, upgradeV1ToV2 } from './v2';

export const SCHEMA_VERSIONS = [storedDocumentV1Schema, storedDocumentV2Schema] as const;

// UPGRADES[i] upgrades a schemaVersion-(i+1) document to schemaVersion-
// (i+2) — one entry shorter than SCHEMA_VERSIONS, since the current/last
// version has nothing left to upgrade to. A new version adds one schema
// above and one upgrade fn here; persistence.ts's migrate() walks this
// generically, with no new code there per version.
//
// Each function here is more specific than `(doc: never) => unknown` —
// `never` as the declared parameter type is what lets every step's own
// (narrower, precise) signature slot into one array without widening any
// of them to a shared "accepts anything" type. The `never` is deliberate,
// not a mistake: it means this array can't be *called* generically
// without persistence.ts re-proving what step it actually got via zod
// (see migrate()) — TypeScript has no sound way to index a heterogeneous
// array by a runtime value and know which element it got, so the
// alternative would be an `as` cast with no such check backing it up.
export const UPGRADES: ReadonlyArray<(doc: never) => unknown> = [upgradeV1ToV2];
