// Offline demonstration of record handling, not an AI review or product verification.
import { fileURLToPath } from 'node:url';
import { captureReviewInput, prepareReviewMaterials, createCompletedRecord, isSnapshotCurrent } from '../../dist/src/independent-review.js';
const evidencePath = fileURLToPath(new URL('./fixture-evidence-package.json', import.meta.url));
const candidateSha = 'a'.repeat(40), stableSha = 'b'.repeat(40);
const input = await captureReviewInput({ candidateSha, stableSha, materialPaths: [evidencePath],
  contractIds: ['PDF-EXPORT', 'PHYSICAL-PRINT', 'WHATSAPP-PRESERVED'] });
const transmitted = prepareReviewMaterials(input);
// A real adapter must transmit these bytes, not reopen evidencePath.
JSON.parse(transmitted[0].bytes.toString('utf8'));
const simulatedFindings = ['PHYSICAL-PRINT', 'WHATSAPP-PRESERVED'].map((contractId, i) => ({
  id: `F${i + 1}`, contractId, category: 'missing-evidence', severity: 'high',
  summary: `${contractId}: PDF export does not demonstrate this behavior.`, source: evidencePath,
  confirmationHint: 'Collect the human observation required by the contract.', isHypothesis: false,
}));
const record = createCompletedRecord(input.snapshot, simulatedFindings, {
  limitations: ['Synthetic findings supplied by this script. No AI session, no human observation.'],
});
if (!await isSnapshotCurrent(input.snapshot, candidateSha, stableSha)) throw new Error('Snapshot stale');
console.log(JSON.stringify({ mode: 'SIMULATION', record }, null, 2));
