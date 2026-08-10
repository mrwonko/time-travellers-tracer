import { describe, test, expect } from 'vitest';
import { SCHEMA_VERSIONS } from './versions';
import { hashSchema } from './hash';

// Every historical version's structural hash, once recorded here, must
// never change — each entry is a permanent record of what that
// schemaVersion looked like when real documents were written against it.
// If a test below fails, you edited a frozen schema/vN.ts; add a new
// version instead of changing this one. Never "fix" this test by just
// updating the hash to match a shape change.
const EXPECTED_HASHES: Record<number, string> = {
  1: '00f9d4297e24a2f0a14691709cd5d2285b3c3e5a07324b0449e0f1d160c77c50',
  2: '1c55470ae40efa8589cedfd6985b78dd5bfbfe03cecf7f4c39671ad8a2bfd95e',
};

describe('schema version history is frozen', () => {
  for (const [version, schema] of Object.entries(SCHEMA_VERSIONS)) {
    test(`schemaVersion ${version} shape is frozen`, async () => {
      expect(await hashSchema(schema)).toBe(EXPECTED_HASHES[Number(version)]);
    });
  }
});
