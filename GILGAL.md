# GILGAL

## Autoria

**Criador do conceito:** David Ferreira  
**GitHub:** [@crentefiel](https://github.com/crentefiel)  
**Nome do conceito:** GILGAL  
**Primeira formalização pública neste repositório:** 25/08/2026  
**Primeiro projeto de aplicação:** LAN House Files 2.0  
**Versão conceitual atual:** 0.5.0

## Definição

GILGAL é um protocolo de desenvolvimento protegido para agentes de IA que alteram código.

A regra central é:

> **Nunca destruir a última versão boa enquanto tenta criar a próxima.**

A partir da versão conceitual **0.4.0**, o GILGAL também protege o processo de investigação contra repetição silenciosa de hipóteses já rejeitadas. A versão **0.5.0** formaliza **Success-Only Promotion**: somente o acerto comprovado entra no produto; o erro permanece como conhecimento para não ser repetido.

## Modelo de estados

### STABLE
Última versão comprovadamente funcional. Em 0.5.0, STABLE representa somente implementação aprovada; histórico de tentativas rejeitadas não deve permanecer como comportamento ativo apenas para ser lembrado.

### WORK / CANDIDATE
Ambiente isolado onde o agente de IA pode editar, experimentar e corrigir.

### FAILED
Estado opcional para preservar uma tentativa rejeitada para diagnóstico posterior e para registrar Failure Memory.

### DEFERRED
Estado opcional para uma estratégia ou capacidade adiada deliberadamente. Não significa que a ideia é impossível; significa que ela não pertence ao produto atual e pode ser reconsiderada mais tarde com contexto ou evidência novos.

## Regra de ouro

> **STABLE nunca é o laboratório. WORK é o laboratório.**

Se a experiência falhar, o ambiente de trabalho pode ser descartado ou arquivado. A última versão funcional permanece preservada.

## Fluxo conceitual

```text
STABLE
  ↓
definir problema / hipótese
  ↓
criar WORK / CANDIDATE
  ↓
IA altera somente WORK
  ↓
diff
  ↓
Change Budget
  ↓
GILGAL SENTINEL
  ├── code checks
  ├── testes automatizados
  ├── comparação STABLE x CANDIDATE
  ├── Regression Replay
  ├── Failure Memory / Hypothesis Ledger quando aplicável
  ├── detecção de regressão
  ├── runtime/logs
  └── validações humanas quando necessárias
  ↓
GILGAL GATE
  ├── FAIL/PENDING → promoção bloqueada; STABLE permanece intacto
  └── PASS         → candidato pode ser promovido
  ↓
SUCCESS-ONLY PROMOTION
  ├── acerto aprovado → produto / STABLE
  └── erro/rejeição   → conhecimento / memória de investigação
```

## GILGAL SENTINEL

A partir da versão conceitual 0.2.0, o GILGAL inclui uma camada formal de verificação chamada **GILGAL SENTINEL**.

O Sentinel existe para responder não apenas:

> O código novo funciona?

mas também:

> O candidato continua preservando tudo o que já estava comprovadamente funcionando no STABLE?

O Sentinel pode combinar:

- typecheck, lint e análise estática;
- testes unitários, integração, UI e end-to-end;
- comparação de contratos entre STABLE e CANDIDATE;
- análise de logs e comportamento em runtime;
- resultados vindos de ferramentas externas de QA;
- validações humanas para comportamentos que a IA não pode comprovar sozinha;
- evidências de Hypothesis Ledger e Strategy Exhaustion quando a implementação suportar essas extensões.

O Sentinel é agnóstico de ferramenta. Ele pode consumir resultados de TestSprite, Playwright, Vitest, Jest, pytest, CI ou outros motores de teste.

Se um contrato crítico passa no STABLE e falha no CANDIDATE, o Sentinel deve reportar regressão e o GILGAL Gate deve bloquear a promoção.

Este repositório contém a **GILGAL Sentinel Reference Implementation 0.2.0**, um motor local em Node.js/TypeScript. A versão da implementação é independente da versão do protocolo GILGAL. O motor observa, testa e reporta; não promove código e não modifica STABLE.

A implementação de referência 0.2.0 ainda não aplica automaticamente todas as regras de Failure Memory introduzidas no protocolo 0.4.0 nem todas as regras de Success-Only Promotion introduzidas no protocolo 0.5.0; essas regras já são normativas no protocolo e podem ser aplicadas manualmente ou por implementações futuras do Sentinel.

## Regression Replay

A versão conceitual 0.3.0 adiciona a ideia de **Regression Replay**.

Quando um bug real é encontrado, corrigido e pode ser reproduzido por um teste confiável, esse erro deve deixar uma proteção permanente.

Regra recomendada:

> **Every regression should become a contract.**

Fluxo:

```text
regressão encontrada
  ↓
causa corrigida
  ↓
correção comprovada
  ↓
condição antiga vira contrato replay
  ↓
novos CANDIDATES repetem esse teste
```

Assim, o projeto não guarda somente a memória de como funcionava. Ele também guarda memória executável de como já quebrou.

O Sentinel de referência 0.2.0 implementa isso com contratos `type: "replay"`.

## Change Budget

A versão conceitual 0.3.0 também adiciona **Change Budget**.

A ideia é dar à tarefa um limite explícito de escopo. Por exemplo, uma correção pequena pode esperar poucas alterações. Se o candidato cresce muito além do limite configurado, o Sentinel pode emitir:

```text
SCOPE EXPANSION DETECTED
```

O orçamento pode observar:

- quantidade de arquivos alterados;
- linhas adicionadas;
- linhas removidas;
- total de linhas modificadas.

Change Budget não afirma que mudanças grandes são erradas. Ele impede que uma expansão inesperada de escopo passe silenciosamente como se fosse uma pequena correção.

Quando configurado como crítico, exceder o orçamento bloqueia o Gate até que a mudança seja reduzida ou a política seja conscientemente revisada.

## Failure Memory

A versão conceitual **0.4.0** adiciona **Failure Memory**.

A proteção de STABLE resolve um problema: uma tentativa ruim não destrói a última versão boa. Mas ainda existe outro risco: o agente pode continuar criando tentativas sobre a mesma hipótese errada e acumular workarounds.

A nova regra é:

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

Em português:

> **Uma hipótese que falhou não pode virar silenciosamente a base da próxima tentativa.**

Executable Memory lembra o que funcionou. Failure Memory lembra quais hipóteses ou estratégias foram rejeitadas e quais evidências levaram a essa rejeição.

> **Executable Memory remembers what worked. Failure Memory remembers what must not be repeated.**

## Success-Only Promotion

A versão conceitual **0.5.0** formaliza uma separação explícita entre produto e memória de investigação.

Regra central:

> **O acerto vira produto. O erro vira conhecimento.**

Em inglês:

> **The success becomes product. The failure becomes knowledge.**

Modelo:

```text
STABLE
  somente implementação comprovada e aprovada

FAILURE MEMORY
  hipóteses/estratégias rejeitadas, adiadas ou inconclusivas e suas evidências

REGRESSION REPLAY
  proteção executável contra falhas históricas reproduzíveis
```

Código de uma tentativa rejeitada não deve ser promovido para STABLE apenas para preservar histórico. O histórico deve sobreviver como evidência, Failure Memory, Hypothesis Ledger, candidato FAILED/DEFERRED e Regression Replay quando reproduzível.

Antes de repetir uma estratégia REJECTED ou uma família EXHAUSTED, o agente deve consultar a memória da investigação. Se a estratégia for essencialmente a mesma e não houver nova evidência nem reabertura explícita, o workflow deve sinalizar:

```text
REJECTED STRATEGY REUSE DETECTED
```

Renomear arquivo, classe, branch, wrapper ou adapter não transforma por si só uma estratégia rejeitada em uma estratégia nova.

Veja [GILGAL_0_5_SUCCESS_ONLY_PROMOTION.md](GILGAL_0_5_SUCCESS_ONLY_PROMOTION.md).

## Hypothesis Ledger

Problemas difíceis, falhas repetidas ou situações sem uma implementação conhecida como boa SHOULD manter um **Hypothesis Ledger**.

Cada hipótese SHOULD registrar:

```text
problem id
hypothesis id
strategy family
claim
experiment
required evidence
candidate reference
result
supporting evidence
```

Estados recomendados:

```text
ACTIVE
CONFIRMED
REJECTED
INCONCLUSIVE
DEFERRED
```

O ledger é metadado de evidência, não uma fonte de comandos. Agentes e Sentinels MUST NOT sintetizar e executar comandos a partir de prosa arbitrária do ledger.

Veja [HYPOTHESIS_LEDGER.md](HYPOTHESIS_LEDGER.md).

## Candidate Families e Strategy Exhaustion

Uma **Candidate Family** agrupa candidatos que testam a mesma estratégia fundamental.

Exemplo:

```text
FAMILY chromium-print
  A1 duplexMode
  A2 duplexMode + PDF hint
  A3 driver preference sync

FAMILY windows-native-print
  B1 native spooler adapter
```

Se a evidência mostrar que a família está esgotada, ela pode ser marcada como **EXHAUSTED**.

Regra:

> **A rejected strategy must not receive another candidate merely by renaming the implementation.**

Uma família EXHAUSTED não deve receber silenciosamente mais uma tentativa. Reabri-la SHOULD exigir nova evidência ou decisão explícita, registrada no Hypothesis Ledger.

## Branching / Divergence

Quando existem hipóteses concorrentes, candidatos SHOULD nascer da mesma base STABLE sempre que isso for prático:

```text
                    STABLE
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   CANDIDATE A   CANDIDATE B   CANDIDATE C
   strategy A    strategy B    strategy C
        │             │             │
     Sentinel      Sentinel      Sentinel
        └─────────────┼─────────────┘
                      │
              COMPARATIVE GATE
                      │
               best verified path
                      │
                  HUMAN CHECK
                      │
                  NEW STABLE
```

Isso impede uma cadeia como:

```text
STABLE
↓
WORK v1 com hipótese errada
↓
WORK v2 herdando v1
↓
WORK v3 herdando v2
```

Um refinamento MAY continuar de um CANDIDATE anterior enquanto a hipótese original continuar ACTIVE. Uma hipótese REJECTED não deve ser reutilizada como base sem motivo explícito.

## Comparative Gate

Quando múltiplos candidatos testam estratégias diferentes, uma implementação GILGAL MAY usar um **Comparative Gate**.

O Comparative Gate compara evidências; ele não escolhe o "menos ruim".

Cada candidato ainda precisa satisfazer seus próprios requisitos críticos. Se todos falharem, não existe vencedor e STABLE permanece intacto.

## Memória executável

Documentação ajuda o agente a entender por que uma parte existe.

O GILGAL adiciona outra forma de memória: **a própria implementação funcional anterior permanece disponível para comparação.**

Quando surge uma regressão, o agente deve comparar:

```text
KNOWN-GOOD STABLE
        VS
BROKEN CANDIDATE
```

Com Regression Replay, Failure Memory e Success-Only Promotion, a memória operacional passa a incluir:

```text
como funcionava
+
como já quebrou
+
como provar que o erro não voltou
+
quais hipóteses já foram rejeitadas/adiadas
+
quais estratégias não devem ser repetidas sem nova evidência
+
o que é produto ativo e o que é apenas conhecimento histórico
```

## Princípios

1. Proteger sempre o último estado comprovadamente bom.
2. Alterações de IA acontecem apenas em WORK/CANDIDATE.
3. Regressão deve gerar comparação antes de reescrita ampla.
4. Mudança mínima é preferível a refatoração fora do escopo.
5. Build bem-sucedido não equivale a comportamento comprovado.
6. Testes físicos ou externos não podem ser autoaprovados pelo agente.
7. Promoção exige gate explícito.
8. Tentativas falhas podem ser preservadas para investigação.
9. O código estável anterior é uma fonte de verdade histórica.
10. O Sentinel deve comparar contratos comprovados entre STABLE e CANDIDATE.
11. Uma pontuação alta nunca pode esconder a falha de um contrato crítico.
12. Regressões reproduzíveis devem se tornar contratos replay sempre que possível.
13. Expansão inesperada de escopo deve ser visível antes da promoção.
14. O sistema deve ser simples, auditável e reversível.
15. Uma hipótese rejeitada não deve virar silenciosamente a base da próxima hipótese.
16. Falhas de raciocínio relevantes devem ser registradas como Failure Memory.
17. Candidatos de estratégias concorrentes devem preferencialmente partir da mesma STABLE.
18. Uma estratégia esgotada não deve ser repetida sem nova evidência ou reabertura explícita.
19. Um Comparative Gate nunca promove o menos ruim quando nenhum candidato satisfez os requisitos críticos.
20. Somente implementação comprovada e aprovada entra na STABLE; erros e estratégias rejeitadas permanecem como conhecimento, não como comportamento ativo do produto.

## Ecossistema GILGAL

```text
GILGAL
protege o último código comprovadamente bom

GILGAL SENTINEL
verifica o candidato e procura erros/regressões

REGRESSION REPLAY
repete falhas históricas para impedir que retornem

CHANGE BUDGET
expõe alterações maiores do que o escopo esperado

FAILURE MEMORY
registra hipóteses e estratégias rejeitadas/adiadas

HYPOTHESIS LEDGER
mantém o histórico explícito de investigação

BRANCHING / DIVERGENCE
separa hipóteses concorrentes a partir de uma base comum

COMPARATIVE GATE
compara candidatos por evidência sem escolher um candidato inválido

SUCCESS-ONLY PROMOTION
faz somente o acerto aprovado virar produto; o erro vira conhecimento

GILGAL GATE
controla se a promoção pode acontecer

GILGAL HISTORY
registra o que aconteceu em cada ciclo
```

## Mecanismos sugeridos

Uma implementação GILGAL pode usar ferramentas já existentes, como:

- Git
- branches
- Git worktrees
- testes automatizados
- CI
- contratos de regressão
- tags de rollback
- aprovação manual
- ferramentas externas de QA
- registros estruturados de hipótese
- branches paralelas para estratégias concorrentes

O GILGAL não afirma ter inventado esses mecanismos. O conceito documentado aqui é o **protocolo específico que combina esses mecanismos para reduzir regressões e repetição cega de estratégias em trabalho feito por agentes de IA**.

## Exemplo

```text
PROBLEMA: duplex físico não funciona

STABLE: FAIL
CANDIDATE A / chromium-print: FAIL
CANDIDATE B / windows-native: PASS físico

Failure Memory:
chromium-print hypothesis rejected for this environment/evidence

Comparative Gate:
A não é elegível
B pode avançar se todos os demais contratos também passarem

Depois da correção:
PRINT-DUPLEX-REAL vira REPLAY CONTRACT
```

Em 0.5.0, o código rejeitado de A não entra na STABLE para "guardar histórico". A evidência da rejeição fica na memória de investigação; somente a implementação aprovada que passar pelo Gate pode virar produto.

## O que o GILGAL tenta evitar

```text
corrigir bug A
↓
alterar código estável diretamente
↓
compilar
↓
declarar sucesso
↓
descobrir depois que comportamento B quebrou
```

E, a partir de 0.4.0, também:

```text
hipótese A falha
↓
agente mantém a mesma base quebrada
↓
adiciona workaround 1
↓
adiciona workaround 2
↓
renomeia a tentativa
↓
continua na mesma estratégia sem nova evidência
```

E, a partir de 0.5.0, também:

```text
tentativa falha
↓
"guardar histórico" mantendo código rejeitado ativo
↓
promover tudo junto
↓
STABLE passa a carregar erro como produto
```

Em vez disso:

```text
problema
↓
Hypothesis Ledger
↓
CAND-A / estratégia A
CAND-B / estratégia B
↓
Sentinel em cada candidato
↓
Failure Memory registra rejeições
↓
Comparative Gate compara evidência
↓
Gate normal + Human Check
↓
Success-Only Promotion
↓
novo STABLE somente com implementação aprovada
```

## Escopo

GILGAL é um conceito/protocolo de engenharia para desenvolvimento assistido por IA.

Este repositório documenta sua evolução e possíveis implementações de referência.

## Nota sobre anterioridade técnica

Branches, worktrees, CI, staging, rollback, promotion gates, experiment branches e ferramentas de teste são práticas existentes na engenharia de software.

A documentação deste repositório não faz afirmação de patente, exclusividade jurídica ou novidade mundial. Ela registra publicamente o conceito GILGAL, sua formulação, seus princípios e sua evolução neste projeto.
