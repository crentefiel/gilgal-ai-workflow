import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sha256,
  validateFindings,
  createCompletedRecord,
  markStale,
  type ReviewSnapshot,
} from '../src/independent-review.js';

describe('independent review prototype', () => {
  it('computes stable sha256', () => {
    assert.equal(sha256('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('validates well-formed findings with source', () => {
    const findings = validateFindings([
      {
        id: 'F1',
        category: 'missing-evidence',
        severity: 'high',
        summary: 'PDF export proven; physical print and WhatsApp not demonstrated',
        source: 'evidence.pdfExport',
        contractId: 'PHYSICAL-PRINT',
        isHypothesis: false,
      },
    ]);
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.severity, 'high');
    assert.equal(findings[0]?.source, 'evidence.pdfExport');
  });

  it('rejects non-hypothesis findings without source', () => {
    assert.throws(
      () =>
        validateFindings([
          {
            id: 'F2',
            category: 'missing-evidence',
            severity: 'high',
            summary: 'claim without source',
            isHypothesis: false,
          },
        ]),
      /requires a source/,
    );
  });

  it('rejects malformed findings', () => {
    assert.throws(() => validateFindings([{ category: 'x' }]), /missing id/);
    assert.throws(
      () =>
        validateFindings([
          { id: '1', category: 'x', severity: 'critical', summary: 's', source: 's' },
        ]),
      /invalid severity/,
    );
  });

  it('creates completed record without defaulting isolation proof', () => {
    const snapshot: ReviewSnapshot = {
      candidateSha: 'abc123',
      stableSha: 'def456',
      materials: [{ path: 'contracts.json', sha256: 'deadbeef' }],
      promptSchemaVersion: 'experimental-1',
      createdAt: new Date().toISOString(),
    };
    const record = createCompletedRecord(snapshot, [], { limitations: ['synthetic'] });
    assert.equal(record.state, 'completed');
    assert.equal(record.isolationProven, false);
    assert.equal(record.isolationMechanism, undefined);

    const proven = createCompletedRecord(snapshot, [], {
      isolationMechanism: 'fresh-subagent',
      isolationProven: true,
    });
    assert.equal(proven.isolationProven, true);
    assert.equal(proven.isolationMechanism, 'fresh-subagent');

    const stale = markStale(record, 'candidate SHA changed');
    assert.equal(stale.state, 'stale');
  });
});
