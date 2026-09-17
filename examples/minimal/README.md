# GILGAL Minimal Example

Este diretório mostra o modelo mínimo máquina-legível proposto pelo núcleo atual do GILGAL.

```text
.gilgal/
  state.json
  contracts.json
  memory.json
  evidence/
  worktrees.json  # opcional
```

Os arquivos são exemplos de estrutura, não uma implementação completa do CLI.

Em repositórios com vários worktrees, o candidato ativo é sempre o `HEAD` do cwd atual. O `worktrees.json` deste exemplo é opcional e apenas torna explícito qual pasta/ref exerce o papel de `store/stable`, `work/candidate` e outros candidatos. `check`, aprovação humana e `promote` devem concordar sobre o mesmo HEAD; evidência de outro SHA deve produzir `STALE_EVIDENCE`.

Fluxo esperado:

```text
start
  ↓
state.json registra base STABLE + hipótese
  ↓
check
  ↓
diff encontra contratos afetados
  ↓
risk = maior risco dos contratos
  ↓
checks automáticos geram evidence/<sha>.json
  ↓
L com checks humanos pendentes → pending-human
  ↓
ok registra a observação humana para o mesmo SHA
  ↓
promote recusa enquanto qualquer pré-condição estiver pendente
```

Se o check abortar por working tree dirty ou porque typecheck/tests/replays/build não executaram de facto, ele não deve produzir um CHECK que `ok` / `approve-manual` possa aceitar. Um `ABORT-*.txt` ou log pode ser guardado como diagnóstico, mas não é evidência de aprovação.

Quando `worktrees.json` existir, `promote` deve anunciar `store.path` antes de mover `gilgal/stable`. Sem esse mapa, deve reportar apenas a ref que vai mover e o cwd que verificou, sem afirmar que uma pasta específica foi atualizada.

A implementação real deve validar schemas, normalizar paths de forma segura e não executar comandos provenientes de conteúdo não confiável.
