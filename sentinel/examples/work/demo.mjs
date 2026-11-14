import { planWork } from '../../dist/src/work-coordinator.js';

const tasks = [
  { id: 'preview', goal: 'Corrigir a prévia do PDF grande',
    dependsOn: [], writes: ['src/pdf/preview.ts'], acceptance: ['Renderizar as sete folhas'],
    preserves: ['Exportação, impressão e WhatsApp'], surfaces: ['architecture', 'complexity'] },
  { id: 'permissions', goal: 'Revisar permissões da ponte Tauri',
    dependsOn: [], writes: [], acceptance: ['Registrar escopo de acesso e checagens efetuadas'],
    preserves: ['Limites de acesso ao sistema de arquivos'], surfaces: ['security'] },
  { id: 'export-test', goal: 'Verificar exportação depois da correção',
    dependsOn: ['preview'], writes: ['test/export.test.ts'], acceptance: ['Conferir ordem e conteúdo das sete folhas'],
    preserves: ['Texto e imagens'], surfaces: [] },
];
const results = new Map();
const initial = planWork(tasks, results);
results.set('preview', { state: 'failed', attempt: 1, evidence: 'Fixture sintética: faltou a folha 7' });
results.set('permissions', { state: 'passed', attempt: 1, evidence: 'Fixture sintética: análise concluída' });
const retry = planWork(tasks, results);
results.set('preview', { state: 'passed', attempt: 2, evidence: 'Fixture sintética: sete folhas na prévia' });
const verify = planWork(tasks, results);
results.set('export-test', { state: 'passed', attempt: 1, evidence: 'Fixture sintética: exportação conferida' });
console.log(JSON.stringify({ mode: 'SIMULATION', initial, retry, verify, review: planWork(tasks, results) }, null, 2));
