# GILGAL

**Guarded Iterative Layer for Generative Agent Logic**

GILGAL é um protocolo de confiança para mudanças de software feitas com ajuda de IA.

> **STABLE não é laboratório.**

> **WORK pode dizer “terminei”. Só o GILGAL pode dizer “passou”.**

**Criador do conceito:** David Ferreira ([@crentefiel](https://github.com/crentefiel))  
**Primeira formalização pública:** 2026-08-25

---

## O problema

Agentes de IA são rápidos para produzir mudanças, mas isso não significa que a nova versão preservou o que já funcionava.

Um build verde não prova que:

- o QR ainda conecta;
- o arquivo ainda chega uma única vez;
- o Word ainda abre o documento;
- a sessão ainda sobrevive ao restart;
- uma estratégia já rejeitada não está sendo repetida com outro nome.

GILGAL separa criação de confiança.

```text
STABLE
  ↓
WORK / CANDIDATE
  ↓
CHECK
  ↓
CONTRACTS + MEMORY + EVIDENCE
  ↓
PROMOTE
  ↓
NEW STABLE
```

A IA pode propor, implementar, testar e revisar. A promoção só acontece quando as pré-condições objetivas do protocolo foram satisfeitas.

---

## Núcleo atual

O GILGAL mínimo tem quatro responsabilidades:

```text
CONTRACTS
  o que não pode quebrar

MEMORY
  o que já aprendemos

CHECK
  o que o candidato realmente provou

PROMOTE
  recusa a promoção enquanto falta prova
```

O Gate não precisa ser um serviço. Ele pode ser simplesmente a lógica que faz `gilgal promote` recusar uma promoção incompleta.

O Sentinel continua compatível como motor de verificação/evidência, mas não precisa ser um processo permanente para o protocolo existir.

---

## Contratos de produto

Contratos devem usar a linguagem do produto, não o nome da biblioteca.

Exemplos:

```text
WHATSAPP-QR-CONNECT
FILE-ARRIVES-ONCE
WORD-OPENS-DEFAULT-APP
IMAGE-MONTAGE-AVAILABLE
PDF-OPEN-OR-MONTAGE
NO-AUTO-PRINT
```

Cada contrato em `contracts.json` deve mapear:

```text
id
→ risk S|M|L
→ paths[] de código
→ tests[] automáticos
→ human[]
```

Exemplo:

```json
{
  "id": "WHATSAPP-QR-CONNECT",
  "risk": "L",
  "paths": ["src/whatsapp/**"],
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

O agente pode declarar a intenção em `contractsClaimed`, mas não escolhe os contratos realmente afetados. `gilgal check` calcula `contractsHit` por `git diff` contra STABLE + `paths[]` de `contracts.json`.

Se existir `.gilgal/map.json`, ele é apenas índice humano. Quando divergir de `contracts.json`, o Gate usa `contracts.json`.

---

## Risco S / M / L

O risco é calculado pelos contratos atingidos pelo diff, não pelo número de linhas alteradas nem por declaração do agente.

```text
S — texto, CSS, ícone
M — SQLite, diretórios, lógica interna
L — WhatsApp, sessão, impressão, instalador, hardware
```

O risco efetivo é o maior risco entre `contractsHit`.

Uma mudança de três linhas pode ser L. Uma mudança grande de CSS pode continuar S.

Change Budget pode existir como alerta de expansão inesperada de escopo, mas não substitui risco por contrato.

---

## Failure Memory

GILGAL mantém memória simples e tipada:

```text
REJECTED
DEFERRED
EXHAUSTED
```

Uma entrada relevante deve registrar:

```text
family
status
reason
evidence
reopenWhen
```

`EXHAUSTED` significa:

> **não repita essa família sem nova evidência ou reabertura explícita.**

Renomear arquivo, classe, wrapper ou adapter não transforma automaticamente uma estratégia antiga em nova.

---

## Evidence sem teatro

Evidência precisa estar vinculada ao SHA exato do candidato.

Isso responde:

> “esta prova pertence ao código que estou promovendo?”

O SHA não prova que um humano realmente viu o QR ou recebeu o PDF. Ele apenas impede que uma prova de outro candidato seja reutilizada silenciosamente.

Quando houver `contractsClaimed`, a evidência também registra o `contractsHit` calculado. Se o diff atingir contrato fora da claim, o check fica `BLOCKED`.

Em risco L, o contrato inclui checks humanos objetivos. Se algum `human[]` do contrato hit continuar pendente, o Gate permanece bloqueado.

---

## Interface conceitual

Uma implementação prática deve caber em poucos comandos:

```text
gilgal start <hipótese>
gilgal scope
gilgal check
gilgal ok <contrato> [check]
gilgal promote
gilgal reject
gilgal status
```

`gilgal scope` lê o diff contra STABLE — ou paths staged explicitamente selecionados — mais `contracts.json` e imprime:

```text
contractsHit
risco máximo
tests[] exigidos
human[] pendentes
```

Ele não chama LLM para decidir contrato/risco e não escreve STABLE.

Fluxo:

```text
gilgal start
  ↓
WORK nasce da STABLE
  ↓
gilgal scope
  ↓
diff → contractsHit → risco → tests → human pendente
  ↓
gilgal check
  ↓
claimed cobre hit? não → BLOCKED
  ↓
se L e faltam humanos → BLOCKED / pending-human
  ↓
gilgal ok ...
  ↓
gilgal promote
  ↓
se tudo estiver válido: NEW STABLE
```

`promote` não pode passar por cima de mismatch `contractsClaimed`/`contractsHit`, evidência incompleta, human pendente em risco L ou relação inválida com a STABLE original.

Não existe “rebase silencioso e promove com a prova antiga”.

---

## Estrutura mínima

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
  STABLE, WORK, status e intenção opcional: hipótese, strategyFamily, contractsClaimed

contracts.json
  fonte oficial de id, risk, paths[], tests[], human[]

memory.json
  REJECTED / DEFERRED / EXHAUSTED + reopenWhen

evidence/<sha>.json
  contractsClaimed (se houver), contractsHit calculado, risco e o que foi verificado
```

`.gilgal/map.json` pode existir como índice humano opcional, mas não substitui `contracts.json` no Gate.

Um exemplo concreto está em [`examples/minimal/`](examples/minimal/).

---

## O que não é obrigatório no núcleo

O GILGAL pode usar mecanismos mais avançados, mas eles não precisam estar no caminho diário:

- Sentinel como serviço permanente;
- Hypothesis Ledger separado;
- Comparative Gate com vários candidatos simultâneos;
- Change Budget como gate universal;
- ritual de versões 0.x para o operador;
- assinaturas/tokens para cada checkbox humano.

Esses recursos continuam possíveis quando resolvem um problema real.

---

## Implementação de referência existente

O diretório [`sentinel/`](sentinel/) contém a implementação de referência histórica do GILGAL Sentinel.

Ela continua útil como motor local de checks e evidência. O núcleo atual apenas deixa claro que Sentinel é uma função de verificação, não uma autoridade de promoção e não um requisito para existir como processo separado.

Documentos históricos de versões 0.x permanecem no repositório para preservar a evolução do conceito.

A fonte normativa atual é [`SPECIFICATION.md`](SPECIFICATION.md).

A explicação operacional está em [`GILGAL.md`](GILGAL.md).

---

## Regra central

> **Ninguém declara que o produto funciona. Só o contrato declara — e no risco L o contrato inclui uma pessoa.**

Para um agente, duas regras preservam o protocolo:

> **Não edite STABLE.**

> **Não repita uma família EXHAUSTED sem evidência nova ou reabertura explícita.**

E, para escopo:

> **O agente pode declarar o que pretendia tocar; só o diff + contracts.json dizem o que realmente tocou.**

---

## English summary

GILGAL is a trust protocol for AI-assisted software changes.

Its minimal core is:

```text
Contracts → what must not break
Memory    → what the project already learned
Check     → what the exact candidate actually proved
Promote   → refuses promotion until evidence is complete and current
```

Scope and risk are derived from `contracts.json + git diff`, not from agent confidence. A candidate may record `contractsClaimed`; `check` computes `contractsHit`. If a hit falls outside the claim, the Gate is blocked. Risk-L hit contracts remain blocked while required human checks are pending. Evidence is bound to the candidate SHA, and STABLE remains protected while WORK is allowed to fail.

> **GILGAL does not govern how AI works. It governs what may be called trustworthy.**
