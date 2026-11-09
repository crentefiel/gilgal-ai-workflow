# Revisão independente experimental

Helpers opcionais para #26 e PR #32, inspirados no [EGM](https://github.com/google/elephant-goldfish-model). Não alteram Gate, SPEC, `check`, aprovação humana ou promoção. Não são um adaptador de IA nem uma integração pronta com DeepSeek Harness.

## Executar a demonstração

No diretório `sentinel`, execute `npm ci` e `npm run review:demo`.

O exemplo lê a fixture sintética, captura bytes e hashes, valida dois achados escritos pelo script e apresenta um registro `unavailable`: não houve sessão independente. Isso demonstra transporte e validação, não descoberta de falhas por um modelo. Não imprime, acessa provedores ou escreve evidência de produto.

## Contrato do host

1. Selecionar os arquivos autorizados, sem segredos/dados de clientes; resolver HEAD/STABLE pelo Git no worktree correto. Os helpers validam formato, mas não consultam Git.
2. Chamar `captureReviewInput` com SHAs completos, contratos e caminhos. Incluir os próprios contratos, diff, baseline e evidências entre os materiais fornecidos.
3. Chamar `prepareReviewMaterials` e enviar exclusivamente os buffers retornados a uma sessão nova. Não reabrir os caminhos para envio. Esses buffers são cópias verificadas; o host não deve modificá-los após a conferência.
4. Documentar modelo, ID de execução e mecanismo de sessão pelo host. `freshSessionDeclared` é uma declaração dessa fronteira de confiança, não prova criptográfica nem afirmação do modelo.
5. Chamar `createCompletedRecord(snapshot, rawFindings, options)`, que valida os dados novamente. Só usar metadados de execução observados pelo host. Sem declaração de sessão nova, retorna `unavailable`, nunca aprovação.
6. Ao terminar, resolver HEAD/STABLE novamente e chamar `isSnapshotCurrent`; se false, usar `markStale`. A detecção é explícita, não um monitor contínuo.
7. Gravar com `saveReviewRecord` somente no diretório de revisões, separado dos stores de evidência e aprovação. Cada nome usa UUID e criação exclusiva. O diretório é fornecido pelo host confiável, não pelo modelo.

`source` é um caminho exato de um material do snapshot. `contractId` deve existir na lista selecionada. Fonte existente prova rastreabilidade, não a verdade semântica do texto. O host pode acrescentar localização/trecho nos resultados de sua interface.

Estados: `completed` = saída válida e sessão nova declarada pelo host; `unavailable` = sem essa sessão; `stale` = snapshot invalidado; `incomplete` reservado ao adaptador para timeout/resposta inválida. Erros de validação lançam exceção: o futuro adaptador deve tratá-los como falha, nunca sucesso.

## Limites e próximos passos

- Nenhuma execução real de IA, isolamento de processo, medição de tokens ou verificação de credenciais é implementada.
- O host controla permissões e transmissão. Estes helpers não são sandbox e não devem receber caminhos arbitrários do modelo.
- Contratos/IDs fornecidos pelo host não são inferidos do código por estes helpers.
- Sem resposta válida, não produzir `completed`. Zero achados não aprova candidato nem encerra pendências anteriores.
- O adaptador futuro deve registrar falhas e acessos observados, limitar rodadas/custo e preservar os checks humanos previstos no contrato.
- Planejamento rejeitado por custo/preferência deve permanecer decisão de planejamento, sem marcar estratégia `EXHAUSTED`.
