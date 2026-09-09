# GILGAL

## Autoria

**Criador do conceito:** David Ferreira  
**GitHub:** [@crentefiel](https://github.com/crentefiel)  
**Nome do conceito:** GILGAL  
**Primeira formalização pública neste repositório:** 25/08/2026  
**Primeiro projeto de aplicação:** LAN House Files 2.0

## Definição atual

GILGAL é um protocolo de confiança para mudanças de software feitas com ajuda de IA.

A IA pode propor, editar, testar e revisar. Ela não recebe autoridade para declarar sozinha que uma mudança está pronta para substituir a última versão comprovadamente boa.

> **WORK pode dizer “terminei”. Só o GILGAL pode dizer “passou”.**

A formulação operacional do protocolo é:

> **Ninguém declara que o produto funciona. Só o contrato declara — e, no risco L, o contrato inclui uma pessoa.**

GILGAL não substitui Git, testes, CI, worktrees ou revisão humana. Ele define as pré-condições para uma mudança ser considerada confiável.

---

## 1. Dois estados que importam

### STABLE

A versão comprovadamente boa e aprovada para uso real.

STABLE:

- não é laboratório;
- não recebe experimentos normais de agentes;
- deve ser identificável por referência versionada, preferencialmente SHA/tag;
- contém somente implementação aprovada.

### WORK / CANDIDATE

O ambiente isolado onde a mudança é criada e testada.

WORK pode falhar. STABLE permanece intacto.

```text
STABLE
  ↓
gilgal start
  ↓
WORK / CANDIDATE
  ↓
gilgal check
  ↓
checks automáticos + checks humanos exigidos
  ↓
gilgal promote
  ↓
NEW STABLE
```

---

## 2. Núcleo mínimo do GILGAL

O protocolo atual reduz o núcleo a quatro responsabilidades:

```text
CONTRACTS
  o que não pode quebrar

MEMORY
  o que já aprendemos que falhou, foi adiado ou se esgotou

CHECK
  o que o candidato realmente provou

PROMOTE
  recusa a promoção enquanto as pré-condições não forem satisfeitas
```

O **Gate** não precisa ser um serviço separado. O Gate é a recusa determinística do comando de promoção quando falta evidência.

O **Sentinel** continua útil como função de verificação, mas não precisa ser um processo permanente. Uma implementação pode executar essa função dentro de `gilgal check`.

---

## 3. Contratos no idioma do produto

Contratos devem descrever comportamento que alguém reconhece no produto.

Exemplos:

```text
WHATSAPP-QR-CONNECT
FILE-ARRIVES-ONCE
WORD-OPENS-DEFAULT-APP
IMAGE-MONTAGE-AVAILABLE
PDF-OPEN-OR-MONTAGE
NO-AUTO-PRINT
```

Um contrato deve mapear comportamento para superfície de código e evidência necessária.

Exemplo conceitual:

```json
{
  "id": "WHATSAPP-QR-CONNECT",
  "risk": "L",
  "paths": [
    "src/whatsapp/**",
    "src/main/whatsapp/**"
  ],
  "checks": [
    "pnpm test -- tests/whatsapp-status.test.ts"
  ],
  "human": [
    "QR aparece",
    "telefone conecta",
    "sessão sobrevive a restart"
  ]
}
```

Sem o mapa `contrato → paths`, risco por contrato vira opinião. Com o mapa, a implementação pode calcular o risco a partir do diff.

---

## 4. Risco S / M / L

O risco vem dos contratos atingidos, não do número de linhas alteradas.

```text
S — baixo risco
ex.: texto, CSS, ícone
check típico: diff + typecheck

M — risco médio
ex.: SQLite, diretórios, lógica interna
check típico: S + testes/replays relevantes

L — alto risco
ex.: sessão, WhatsApp, impressão, instalador, hardware
check típico: M + checks humanos definidos no contrato
```

A classificação efetiva de um candidato é o maior risco entre os contratos tocados pelo diff.

Três linhas numa fronteira crítica podem ser L. Centenas de linhas de CSS podem continuar S.

**Change Budget**, quando usado, é apenas alarme de expansão inesperada de escopo. Ele não substitui o risco calculado pelos contratos e não deve virar um gate cego para mudanças L legítimas.

---

## 5. Evidence: prova vinculada ao candidato

GILGAL não precisa de uma camada cerimonial de “Evidence Integrity”. Precisa apenas responder:

> Esta prova pertence exatamente ao código que estou tentando promover?

Por isso, checks automáticos e humanos devem ser vinculados ao SHA atual do candidato.

Exemplo:

```json
{
  "sha": "a1b2c3d",
  "risk": "L",
  "contracts": ["WHATSAPP-QR-CONNECT"],
  "checks": [
    {
      "command": "pnpm test",
      "exitCode": 0
    }
  ],
  "human": [
    {
      "check": "QR aparece",
      "result": "pass",
      "user": "operador",
      "timestamp": "2026-09-09T12:00:00Z"
    }
  ]
}
```

O SHA não prova que um comportamento físico aconteceu. Ele prova apenas que a evidência registrada pertence àquele candidato e não a outro código.

---

## 6. Failure Memory simples e tipada

Failure Memory usa três estados operacionais:

```text
REJECTED
estratégia rejeitada pela evidência disponível

DEFERRED
estratégia/capacidade adiada; pode voltar quando contexto ou prioridade mudar

EXHAUSTED
família de estratégia já testada o suficiente para não ser repetida sem evidência nova
```

Cada entrada deve guardar pelo menos:

```text
family
status
reason
evidence
reopenWhen
```

Exemplo:

```json
{
  "family": "wppconnect-puppeteer",
  "status": "EXHAUSTED",
  "reason": "instabilidade recorrente na restauração de sessão",
  "evidence": ["candidate-017", "candidate-021"],
  "reopenWhen": [
    "nova arquitetura elimina a causa anterior",
    "nova evidência demonstra estabilidade após restart"
  ]
}
```

`EXHAUSTED` não significa “proibido para sempre”. Significa:

> **Não repita a mesma família sem trazer algo novo.**

Renomear arquivo, adapter, branch ou wrapper não cria uma estratégia nova.

---

## 7. Hipótese atual fica no candidato

O Hypothesis Ledger não faz parte do núcleo mínimo como sistema paralelo.

A hipótese ativa pode viver no próprio estado do candidato:

```json
{
  "hypothesis": "a persistência atual perde credenciais no restart",
  "strategyFamily": "baileys-session-store"
}
```

Se a hipótese falhar e for relevante para o futuro, a decisão vai para Failure Memory.

Implementações podem manter um ledger mais rico para pesquisa complexa, mas ele é extensão opcional, não requisito do uso diário.

---

## 8. Estados do candidato

O estado operacional deve ser máquina-legível e único.

```text
draft
checking
pending-human
passed
failed
rejected
```

Não usar `READY`, `VERIFIED` ou `PASS` escritos manualmente em Markdown como autoridade de promoção.

Uma tela/status útil deve caber em poucas linhas:

```text
STABLE   a1b2c3d   loja
WORK     e4f5g6h   L
CONTRACTS WHATSAPP-QR-CONNECT, FILE-ARRIVES-ONCE
GATE     pending-human   faltam: QR, PDF
```

---

## 9. Comandos conceituais

A interface operacional deve ser pequena:

```text
gilgal start <hipótese>
gilgal check
gilgal ok <contrato> [check]
gilgal promote
gilgal reject
gilgal status
```

### `gilgal start`

Cria WORK/CANDIDATE a partir da STABLE atual, preferencialmente com Git worktree.

Não é necessário manter clones divergentes independentes.

### `gilgal check`

1. calcula `diff STABLE..WORK`;
2. resolve contratos cujos `paths` intersectam o diff;
3. calcula o maior risco S/M/L;
4. consulta Failure Memory;
5. executa checks automáticos relevantes;
6. grava evidência ligada ao SHA;
7. deixa risco L em `pending-human` enquanto faltarem checks humanos.

### `gilgal ok`

Registra um check humano exigido pelo contrato e o vincula ao SHA atual do candidato.

Se o SHA mudar depois da aprovação, a evidência correspondente deve ser reavaliada.

### `gilgal promote`

É o Gate.

Deve recusar promoção se:

- o candidato não estiver `passed`;
- faltar check automático obrigatório;
- faltar check humano obrigatório;
- a evidência pertencer a outro SHA;
- a STABLE tiver avançado desde a criação do candidato sem reconciliação explícita;
- houver estratégia EXHAUSTED reutilizada sem reabertura/evidência nova quando essa política estiver habilitada.

Promoção deve ser explícita e não pode esconder rebase silencioso feito por agente.

### `gilgal reject`

Registra a decisão relevante em Memory e encerra/arquiva o candidato sem modificar STABLE.

---

## 10. Promoção idempotente

Uma promoção confiável precisa saber de qual STABLE o candidato nasceu.

O estado deve guardar `baseStableSha`.

Antes de promover:

```text
baseStableSha == STABLE esperada
candidate evidence SHA == WORK atual
status == passed
```

Se STABLE avançou, a promoção é bloqueada até reconciliação explícita e novos checks quando necessários.

Não existe “rebase silencioso e promove”.

---

## 11. Checks humanos em risco L

Risco L deve usar poucos checks físicos/externos e escritos no próprio contrato.

O objetivo é ser executável no mundo real, não criar uma auditoria infinita.

Regra prática recomendada:

> Um contrato L deve tentar caber em poucos checks humanos objetivos e rápidos.

Exemplo LAN House:

```text
✓ QR aparece
✓ telefone conecta
✓ PDF chega
✓ DOCX abre no Word
```

A IA pode preparar o teste e registrar o resultado fornecido pelo operador. Ela não fabrica aprovação humana.

---

## 12. Estrutura mínima de dados

Uma implementação mínima pode usar:

```text
repo/
  .gilgal/
    state.json
    contracts.json
    memory.json
    evidence/
  scripts/gilgal/
```

Responsabilidades:

```text
state.json
STABLE, WORK, status, hipótese e família ativa

contracts.json
contrato, risco, paths, checks automáticos e humanos

memory.json
REJECTED / DEFERRED / EXHAUSTED + motivo + critério de reabertura

evidence/<sha>.json
checks realmente executados para aquele candidato
```

Veja [`examples/minimal/`](examples/minimal/) para um exemplo concreto.

---

## 13. O que saiu do núcleo

Os mecanismos abaixo continuam possíveis, mas não são requisitos do GILGAL mínimo:

- Sentinel como processo/serviço permanente;
- Hypothesis Ledger separado;
- Comparative Gate com vários candidatos simultâneos;
- Change Budget como gate universal;
- versões 0.x expostas no fluxo diário;
- tokens/assinaturas criptográficas para cada checkbox humano;
- múltiplos manuais como fontes normativas concorrentes.

Esses recursos podem existir quando resolvem um problema real. Não devem ser necessários para entender ou operar o protocolo básico.

---

## 14. Reference implementation existente

Este repositório contém uma implementação de referência do GILGAL Sentinel em `sentinel/`.

Ela permanece útil como motor de verificação e evidência, mas o **núcleo conceitual atual não exige que Sentinel seja um serviço separado**. Uma implementação futura pode reutilizar esse motor internamente em `gilgal check`.

Documentos históricos de versões 0.x permanecem no repositório como registro da evolução do conceito. A fonte normativa atual é [`SPECIFICATION.md`](SPECIFICATION.md), e esta página é a explicação operacional do protocolo.

---

## Regra central

> **Ninguém declara que o produto funciona. Só o contrato declara — e no risco L o contrato inclui uma pessoa.**

Para o agente, duas regras bastam:

> **Não edite STABLE.**  
> **Não repita uma família EXHAUSTED sem evidência nova ou reabertura explícita.**

E a síntese:

> **GILGAL não governa como a IA trabalha. Governa o que pode ser chamado de confiável.**
