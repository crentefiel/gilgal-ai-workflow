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
  o que já aprendemos que falhou, foi adiado, se esgotou ou regrediu

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

Cada contrato em `contracts.json` deve ter:

```text
id
risk: S | M | L
paths[]
tests[]
human[]
```

Exemplo conceitual:

```json
{
  "id": "WHATSAPP-QR-CONNECT",
  "risk": "L",
  "paths": [
    "src/whatsapp/**",
    "src/main/whatsapp/**"
  ],
  "tests": [
    { "run": "pnpm test -- tests/whatsapp-status.test.ts" }
  ],
  "human": [
    "QR aparece",
    "telefone conecta",
    "sessão sobrevive a restart"
  ]
}
```

Sem o mapa `contrato → paths`, risco por contrato vira opinião. Com o mapa, `git diff` + `contracts.json` determinam os contratos realmente atingidos.

O agente não escolhe o contrato efetivamente atingido nem o próprio risco. O diff escolhe `contractsHit`; o maior risco entre esses contratos vira o risco efetivo do candidato.

Opcionalmente pode existir `.gilgal/map.json` como índice humano de `módulo → paths → contract ids`. Esse índice não manda no Gate. Se `map.json` contradizer `contracts.json`, **ganha `contracts.json`**.

---

## 4. Risco S / M / L

O risco vem dos contratos atingidos pelo diff contra STABLE, não do número de linhas alteradas nem da declaração do agente.

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

A classificação efetiva de um candidato é o maior risco entre os contratos cujos `paths[]` intersectam o diff.

Três linhas numa fronteira crítica podem ser L. Centenas de linhas de CSS podem continuar S.

**Change Budget**, quando usado, é apenas alarme de expansão inesperada de escopo. Ele não substitui o risco calculado pelos contratos e não deve virar um gate cego para mudanças L legítimas.

---

## 5. Evidence: prova vinculada ao candidato

GILGAL não precisa de uma camada cerimonial de “Evidence Integrity”. Precisa apenas responder:

> Esta prova pertence exatamente ao código que estou tentando promover?

Por isso, checks automáticos e humanos devem ser vinculados ao SHA atual do candidato.

Um candidato pode declarar intenção:

```json
{
  "hypothesis": "a persistência atual perde credenciais no restart",
  "strategyFamily": "baileys-session-store",
  "contractsClaimed": ["WHATSAPP-QR-CONNECT"]
}
```

Mas `contractsClaimed` é só o mapa que o trabalho dizia que pretendia tocar. `gilgal check` calcula `contractsHit` a partir do diff e dos `paths[]` de `contracts.json`.

Exemplo de evidência:

```json
{
  "sha": "a1b2c3d",
  "contractsClaimed": ["UI-PRESENTATION"],
  "contractsHit": ["UI-PRESENTATION"],
  "risk": "S",
  "tests": [
    {
      "command": "pnpm typecheck",
      "exitCode": 0
    }
  ],
  "human": []
}
```

Se `contractsHit` contiver um contrato que não está em `contractsClaimed`, quando essa claim existir, o `check` deve ficar **BLOCKED**: o trabalho saiu do mapa declarado.

O SHA não prova que um comportamento físico aconteceu. Ele prova apenas que a evidência registrada pertence àquele candidato e não a outro código.

---

## 6. Failure Memory simples e tipada

Failure Memory usa três estados operacionais:

```text
REJECTED
estratégia ou hipótese rejeitada pela evidência disponível

DEFERRED
estratégia/capacidade adiada; pode voltar quando contexto ou prioridade mudar

EXHAUSTED
família de estratégia já testada o suficiente para não ser repetida sem evidência nova
```

Cada entrada de rejeição deve gravar `kind`:

- `strategy` — a abordagem falhou. Pode ir a `EXHAUSTED`.
- `hypothesis` — a premissa estava errada. Não pode ir a `EXHAUSTED`. Reabrir uma direção `hypothesis` exige nova premissa registada, não apenas nova evidência da mesma estratégia.

Cada entrada de estratégia deve guardar pelo menos:

```text
kind
family
status
reason
evidence
reopenWhen
```

Uma entrada de hipótese deve guardar pelo menos:

```text
kind
hypothesis
status
reason
evidence
reopenWhen
```

Exemplo de estratégia:

```json
{
  "kind": "strategy",
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

Exemplo de hipótese:

```json
{
  "kind": "hypothesis",
  "hypothesis": "o erro é causado exclusivamente por cache local",
  "status": "REJECTED",
  "reason": "o erro foi reproduzido com cache limpo",
  "evidence": ["candidate-024"],
  "reopenWhen": [
    "uma premissa materialmente diferente explicar o comportamento observado"
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
  "strategyFamily": "baileys-session-store",
  "contractsClaimed": ["WHATSAPP-QR-CONNECT"]
}
```

Se a hipótese falhar e for relevante para o futuro, a decisão vai para Failure Memory com `kind: "hypothesis"`.

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

Além do estado do candidato, implementações podem manter o estado de confiança de cada contrato. Quando uma regressão é reportada por `gilgal regress`, o contrato afetado fica `INCOMPLETE` até receber evidência nova suficiente.

Não usar `READY`, `VERIFIED` ou `PASS` escritos manualmente em Markdown como autoridade de promoção.

Uma tela/status útil deve caber em poucas linhas:

```text
STABLE   a1b2c3d   loja
WORK     e4f5g6h
CLAIMED  UI-PRESENTATION
HIT      UI-PRESENTATION
RISK     S
GATE     passed
```

---

## 9. Comandos conceituais

A interface operacional deve ser pequena:

```text
gilgal start <hipótese>
gilgal scope
gilgal check
gilgal ok <contrato> [check]
gilgal promote
gilgal reject
gilgal regress <contrato> "<frase do balcão>"
gilgal status
```

### `gilgal start`

Cria WORK/CANDIDATE a partir da STABLE atual, preferencialmente com Git worktree.

Não é necessário manter clones divergentes independentes.

### `gilgal scope`

Lê o diff contra STABLE — ou paths staged explicitamente selecionados — junto com `contracts.json` e imprime:

```text
contractsHit
risco máximo
tests[] exigidos
human[] pendentes
```

`gilgal scope` não chama LLM para decidir contrato ou risco e não escreve STABLE.

### `gilgal check`

1. calcula `diff STABLE..WORK`;
2. calcula `contractsHit` pelos `paths[]` de `contracts.json`;
3. calcula o maior risco S/M/L entre os contratos hit;
4. se existir `contractsClaimed` e algum `contractsHit` não estiver na claim, retorna `BLOCKED`;
5. consulta Failure Memory;
6. executa os `tests[]` dos contratos hit;
7. grava evidência ligada ao SHA com `contractsClaimed` (se houver) e `contractsHit` calculado;
8. se qualquer contrato hit for L e ainda houver `human[]` pendente, retorna `BLOCKED` / `pending-human`.

Exemplo de expansão de escopo:

```text
contractsClaimed: UI-PRESENTATION
contractsHit:     UI-PRESENTATION, WHATSAPP-QR-CONNECT
GATE:             BLOCKED — saiu do mapa
```

### `gilgal ok`

Registra um check humano exigido pelo contrato e o vincula ao SHA atual do candidato.

Se o SHA mudar depois da aprovação, a evidência correspondente deve ser reavaliada.

### `gilgal promote`

É o Gate.

Deve recusar promoção se:

- o candidato não estiver `passed`;
- faltar teste automático obrigatório;
- houver contrato hit de risco L com `human[]` pendente;
- existir `contractsClaimed` e `contractsHit` contiver contrato fora da claim;
- a evidência pertencer a outro SHA;
- a STABLE tiver avançado desde a criação do candidato sem reconciliação explícita;
- houver estratégia EXHAUSTED reutilizada sem reabertura/evidência nova quando essa política estiver habilitada;
- algum contrato coberto pela promoção estiver `INCOMPLETE` por regressão ainda não revalidada com novo `check` e/ou novo `gilgal ok`, conforme as exigências do contrato.

`promote` não pode passar por cima de `contractsHit`, mismatch claimed/hit ou human pendente em risco L.

Promoção deve ser explícita e não pode esconder rebase silencioso feito por agente.

### `gilgal reject`

Registra a decisão relevante em Memory e encerra/arquiva o candidato sem modificar STABLE.

Quando grava Memory, o reject deve guardar:

```text
kind: strategy | hypothesis
```

`strategy` significa que a abordagem falhou e pode contribuir para `EXHAUSTED`.

`hypothesis` significa que a premissa estava errada e não pode ir a `EXHAUSTED`. Reabrir essa direção exige uma nova premissa registada, não apenas nova evidência da mesma estratégia.

### `gilgal regress`

```text
gilgal regress <CONTRATO> "<frase do balcão>"
```

Usar quando um STABLE já promovido viola um contrato na vida real.

O comando deve:

1. identificar contrato, SHA que tinha sido promovido e frase humana;
2. pôr o contrato em `INCOMPLETE`;
3. gravar a regressão em `memory.json`;
4. bloquear `promote` desse contrato até existir `check` novo, `gilgal ok` novo, ou ambos conforme o contrato exigir.

`gilgal regress` **não move nem substitui STABLE sozinho** e **não faz rollback automático para o known-good anterior**.

Trocar o STABLE quebrado continua decisão humana explícita por `promote` / `restore`.

---

## 10. Promoção idempotente

Uma promoção confiável precisa saber de qual STABLE o candidato nasceu.

O estado deve guardar `baseStableSha`.

Antes de promover:

```text
baseStableSha == STABLE esperada
candidate evidence SHA == WORK atual
status == passed
contractsHit == resultado calculado por contracts.json + diff
contractsClaimed (quando existir) cobre todos os contractsHit
contratos afetados não estão INCOMPLETE sem revalidação nova
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
STABLE, WORK, status, hipótese, família ativa, contractsClaimed e estado de confiança de contratos

contracts.json
fonte oficial de id, risk, paths[], tests[] e human[]

memory.json
rejects tipados strategy/hypothesis, REJECTED / DEFERRED / EXHAUSTED e regressões observadas

evidence/<sha>.json
contractsClaimed (se houver), contractsHit calculado, risco efetivo e checks executados para aquele candidato
```

`.gilgal/map.json` pode existir como índice humano opcional, mas não participa da decisão oficial do Gate quando contradiz `contracts.json`.

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

A CLI Sentinel existente não implementa atualmente o fluxo operacional `reject`/`promote`; por isso esta emenda não adiciona `regress` ao Sentinel 0.2.0 nem lhe concede autoridade de promoção.

Documentos históricos de versões 0.x permanecem no repositório como registro da evolução do conceito. A fonte normativa atual é [`SPECIFICATION.md`](SPECIFICATION.md), e esta página é a explicação operacional do protocolo.

---

## Regra central

> **Ninguém declara que o produto funciona. Só o contrato declara — e no risco L o contrato inclui uma pessoa.**

Para o agente, duas regras bastam:

> **Não edite STABLE.**  
> **Não repita uma família EXHAUSTED sem evidência nova ou reabertura explícita.**

E uma regra operacional de escopo:

> **O agente pode declarar o que pretendia tocar; só o diff + contracts.json dizem o que realmente tocou.**

E a síntese:

> **GILGAL não governa como a IA trabalha. Governa o que pode ser chamado de confiável.**
