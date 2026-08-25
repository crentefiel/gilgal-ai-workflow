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
typecheck / testes / build
  ↓
contratos de regressão
  ↓
validações humanas, quando necessárias
  ↓
GILGAL GATE
  ├── FAIL → promoção bloqueada; STABLE permanece intacto
  └── PASS → candidato pode ser promovido
```

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
10. O sistema deve ser simples, auditável e reversível.

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

O GILGAL não afirma ter inventado esses mecanismos. O conceito documentado aqui é o **protocolo específico que combina esses mecanismos para reduzir regressões em trabalho feito por agentes de IA**.

## Exemplo

```text
STABLE: beta.12
recebimento automático de arquivo = PASS

CANDIDATE: beta.13
recebimento automático de arquivo = FAIL

Resultado GILGAL:
REGRESSION DETECTED
PROMOTION BLOCKED
STABLE continua disponível
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
validar contratos
↓
se B quebrar, bloquear promoção
```

## Escopo

GILGAL é um conceito/protocolo de engenharia para desenvolvimento assistido por IA.

Este repositório documenta sua evolução e possíveis implementações de referência.

## Nota sobre anterioridade técnica

Branches, worktrees, CI, staging, rollback e promotion gates são práticas existentes na engenharia de software.

A documentação deste repositório não faz afirmação de patente, exclusividade jurídica ou novidade mundial. Ela registra publicamente o conceito GILGAL, sua formulação, seus princípios e sua evolução neste projeto.