# Como usar o task.json no Codex e no Gemini

O `task.json` não é descoberto automaticamente. A IA só consegue lê-lo quando:

1. o arquivo é anexado à conversa;
2. o conteúdo é colado na mensagem; ou
3. a IA está conectada ao repositório e recebe o caminho exato.

A opção mais simples é anexar o arquivo.

## Arquivo da demonstração

Use:

```text
network/demo/task.json
```

Esse arquivo descreve a tarefa, o SHA do STABLE, as capacidades-alvo, as capacidades que devem ser preservadas, o escopo permitido e as provas necessárias.

## No Gemini Pro

1. Abra uma conversa nova.
2. Use o botão de adicionar ou anexar arquivo.
3. Selecione `task.json`.
4. Cole a instrução padrão abaixo.
5. Peça a resposta somente em JSON.
6. Salve a resposta como `gemini-response.json`.

## No Codex

### Pela conversa

1. Abra uma conversa nova.
2. Anexe `task.json`.
3. Cole a mesma instrução padrão.
4. Peça a resposta somente em JSON.
5. Salve a resposta como `codex-response.json`.

### Com o repositório disponível

Informe o caminho exato:

```text
Leia network/demo/task.json como o contrato da tarefa.
```

Não diga apenas “leia o arquivo” se o arquivo não estiver anexado nem disponível no workspace.

## Instrução padrão

```text
Leia o arquivo task.json anexado como um contrato de tarefa do GILGAL.

Você é um agente candidato não confiável. Analise o problema e proponha somente uma tentativa com escopo limitado.

Retorne exclusivamente um objeto JSON válido, sem Markdown e sem explicações fora do JSON, usando este formato:

{
  "contributor": {
    "name": "NOME_DO_AGENTE",
    "provider": "Codex ou Gemini",
    "version": "VERSAO_OU_PLANO"
  },
  "hypothesis": "causa provável que será testada",
  "strategy": "estratégia limitada às capacidades e ao escopo permitido",
  "changedFiles": ["caminho/do/arquivo"],
  "rollbackReference": "como desfazer a tentativa",
  "capabilityChanges": [
    {
      "capabilityId": "ID_DA_CAPACIDADE",
      "candidateStatus": "PASS, FAIL, PENDING ou NOT_TESTED"
    }
  ],
  "evidenceClaims": [
    {
      "capabilityIds": ["ID_DA_CAPACIDADE"],
      "evidenceKind": "AUTOMATED, INTEGRATION, PACKAGED, PHYSICAL ou HUMAN",
      "result": "PASS, FAIL ou PENDING",
      "environment": {
        "os": "sistema operacional",
        "architecture": "arquitetura"
      },
      "reference": "referência verificável do teste ou observação",
      "synthetic": false
    }
  ]
}

Regras obrigatórias:
- Não informe candidateSha nem stableSha.
- Não informe stableStatus; ele vem do baseline confiável do task.json.
- Não marque evidência como VERIFIED.
- Não invente aprovação humana.
- Não decida promoção ou merge.
- Não afirme que executou testes que não executou.
- Inclua no capabilityChanges todas as capacidades-alvo e preservadas do task.json.
- Não altere arquivos fora de allowedScope.
- Não inclua senhas, tokens, apiKey, credenciais ou dados privados.
```

## Resultado esperado

Codex e Gemini podem produzir hipóteses diferentes. Isso é desejável.

As respostas ainda não são provas. O adaptador GILGAL:

- rejeita campos controlados pela IA;
- deriva o STABLE do Task;
- converte evidências em `CLAIMED`;
- exige verificação independente;
- envia candidatos normalizados ao coordenador.

Nunca cole chaves de API ou credenciais junto do arquivo.
