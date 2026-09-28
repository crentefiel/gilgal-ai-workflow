# GILGAL Guardrail Scenarios

Três casos executáveis para demonstrar a proposta do GILGAL sem depender do Sentinel histórico ou de bibliotecas externas.

## Executar

Requer Node.js 20 ou superior.

```bash
node examples/guardrail-scenarios/run.mjs
```

Saída esperada:

```text
PASS simple-change -> PROMOTABLE
PASS regression -> REGRESSION_QUARANTINE
PASS reconciliation -> NO_WINNER
3/3 scenarios passed
```

## O que o runner prova

- a melhoria-alvo é derivada das capacidades, não aceita como booleano do chamador;
- toda capacidade usada na decisão precisa de evidência `VERIFIED`;
- a evidência precisa pertencer ao SHA exato do candidato;
- regressão conhecida entra em quarentena;
- uma exceção humana só é aceita com identidade, decisão, justificativa, autenticação, data e SHA;
- quando nenhum candidato preserva o baseline e melhora o alvo, o resultado é `NO_WINNER`.

## Limite intencional

Este runner é uma demonstração executável do contrato. Ele não faz merge, não promove código e não substitui o Gate normativo.

`READY != PROMOTED`
