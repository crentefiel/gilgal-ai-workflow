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
state.json registra base STABLE + intenção opcional (hypothesis / strategyFamily / contractsClaimed)
  ↓
scope / check
  ↓
git diff contra STABLE + contracts.json
  ↓
contractsHit = contratos cujos paths[] intersectam o diff
  ↓
risk = maior risk dos contractsHit
  ↓
se contractsClaimed existe e não cobre todos os contractsHit → BLOCKED
  ↓
tests[] dos contractsHit geram evidence/<sha>.json
  ↓
se algum hit for L e human[] estiver pendente → BLOCKED / pending-human
  ↓
ok registra a observação humana para o mesmo SHA
  ↓
promote recusa enquanto qualquer pré-condição estiver pendente
```

O exemplo de `evidence/e4f5g6h.json` mostra o caso feliz: `contractsClaimed` e `contractsHit` são ambos `UI-PRESENTATION`, o risco calculado é `S` e o teste exigido passou.

Caso de expansão de escopo que deve ficar bloqueado:

```text
contractsClaimed: ["UI-PRESENTATION"]
changed path:     src/whatsapp/session.ts
contractsHit:     ["WHATSAPP-QR-CONNECT"]
result:           BLOCKED — o diff saiu do mapa declarado
```

`gilgal scope` pode mostrar contratos hit, risco máximo, `tests[]` e `human[]` pendentes usando apenas diff/staged paths + `contracts.json`; não precisa chamar LLM e não escreve STABLE.

A implementação real deve validar schemas, normalizar paths de forma segura e não executar comandos provenientes de conteúdo não confiável.
