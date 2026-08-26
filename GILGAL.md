# GILGAL

## Autoria

**Criador do conceito:** David Ferreira  
**GitHub:** [@crentefiel](https://github.com/crentefiel)  
**Nome do conceito:** GILGAL  
**Primeira formalização pública neste repositório:** 25/08/2026  
**Primeiro projeto de aplicação:** LAN House Files 2.0

## Definição

GILGAL é um protocolo de desenvolvimento protegido para agentes de IA que alteram código.

A regra central é:

> **Nunca destruir a última versão boa enquanto tenta criar a próxima.**

## Modelo de estados

### STABLE
Última versão comprovadamente funcional.

### WORK / CANDIDATE
Ambiente isolado onde o agente de IA pode editar, experimentar e corrigir.

### FAILED
Estado opcional para preservar uma tentativa rejeitada para diagnóstico posterior.

## Regra de ouro

> **STABLE nunca é o laboratório. WORK é o laboratório.**

Se a experiência falhar, o ambiente de trabalho pode ser descartado ou arquivado. A última versão funcional permanece preservada.

## Fluxo conceitual

```text
STABLE
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
  ├── detecção de regressão
  ├── runtime/logs
  └── validações humanas quando necessárias
  ↓
GILGAL GATE
  ├── FAIL/PENDING → promoção bloqueada; STABLE permanece intacto
  └── PASS         → candidato pode ser promovido
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
- validações humanas para comportamentos que a IA não pode comprovar sozinha.

O Sentinel é agnóstico de ferramenta. Ele pode consumir resultados de TestSprite, Playwright, Vitest, Jest, pytest, CI ou outros motores de teste.

Se um contrato crítico passa no STABLE e falha no CANDIDATE, o Sentinel deve reportar regressão e o GILGAL Gate deve bloquear a promoção.

Este repositório contém a **GILGAL Sentinel Reference Implementation 0.2.0**, um motor local em Node.js/TypeScript. A versão da implementação é independente da versão do protocolo GILGAL. O motor observa, testa e reporta; não promove código e não modifica STABLE.

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

## Memória executável

Documentação ajuda o agente a entender por que uma parte existe.

O GILGAL adiciona outra forma de memória: **a própria implementação funcional anterior permanece disponível para comparação.**

Quando surge uma regressão, o agente deve comparar:

```text
KNOWN-GOOD STABLE
        VS
BROKEN CANDIDATE
```

Assim, a versão funcional anterior passa a fazer parte da memória operacional do agente.

Com Regression Replay, a memória operacional ganha uma segunda camada:

```text
como funcionava
+
como já quebrou
+
como provar que o erro não voltou
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

O GILGAL não afirma ter inventado esses mecanismos. O conceito documentado aqui é o **protocolo específico que combina esses mecanismos para reduzir regressões em trabalho feito por agentes de IA**.

## Exemplo

```text
STABLE: beta.12
recebimento automático de arquivo = PASS

CANDIDATE: beta.13
recebimento automático de arquivo = FAIL

GILGAL SENTINEL:
REGRESSION DETECTED

Depois da correção:
regressão vira REPLAY CONTRACT

Próximo CANDIDATE:
replay executa novamente

GILGAL GATE:
PASS somente se o erro antigo não voltou
```

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

Em vez disso:

```text
corrigir bug A em WORK
↓
comparar com STABLE
↓
verificar Change Budget
↓
Sentinel valida contratos e replays
↓
se B quebrar, bloquear promoção
```

## Escopo

GILGAL é um conceito/protocolo de engenharia para desenvolvimento assistido por IA.

Este repositório documenta sua evolução e possíveis implementações de referência.

## Nota sobre anterioridade técnica

Branches, worktrees, CI, staging, rollback, promotion gates e ferramentas de teste são práticas existentes na engenharia de software.

A documentação deste repositório não faz afirmação de patente, exclusividade jurídica ou novidade mundial. Ela registra publicamente o conceito GILGAL, sua formulação, seus princípios e sua evolução neste projeto.
