# GILGAL Minimal Example

Este diretório mostra o modelo mínimo máquina-legível proposto pelo núcleo atual do GILGAL.

```text
.gilgal/
  state.json
  contracts.json
  memory.json
  evidence/
```

Os arquivos são exemplos de estrutura, não uma implementação completa do CLI.

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

A implementação real deve validar schemas, normalizar paths de forma segura e não executar comandos provenientes de conteúdo não confiável.
