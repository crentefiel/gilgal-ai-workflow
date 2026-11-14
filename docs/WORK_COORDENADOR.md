# GILGAL WORK — fluxo Swarm com três funções

`planSwarm` organiza tarefas e pareceres. Para delegar, use este fluxo, que
chama o escalonador `planWork` apenas como componente de planejamento.

| Ordem | Função | Missão |
| --- | --- | --- |
| 1 | [Security Audit](https://github.com/cloudflare/security-audit-skill) | Em leitura, verificar escopo, riscos e superfícies protegidas. Recomendar se a alteração proposta pode avançar. |
| 2 | [Ponytail](https://github.com/DietrichGebert/ponytail) | Programar somente no WORK autorizado, com a menor solução que preserva contratos, testes, segurança e acessibilidade. |
| 3 | Security Audit | Em leitura, verificar o diff final, permissões, entradas e alterações fora do escopo. |
| 4 | [EGM](https://github.com/google/elephant-goldfish-model) | Em sessão nova de leitura, comparar código, contratos e verificações do WORK com STABLE e registrar regressões ou provas faltantes. |

O coordenador encaminha as tarefas ao Ponytail. Tarefas independentes podem
rodar juntas; escrita em caminhos sobrepostos espera. A tarefa que falhar pode
voltar com o resultado anterior até o limite configurado. Se Security ou EGM
bloquear, registre a pendência; o planejador não aplica correções por conta
própria. Ao reformular escopo, obtenha nova análise do Security.

## Contrato com o host

- Resolva STABLE e WORK a partir do Git e registre os SHAs completos.
  Execute no worktree autorizado. Fixe o WORK inicial antes do preflight;
  forneça o WORK atual a cada passo.
- Cada tarefa tem objetivo, dependências, caminhos de escrita, critérios e
  capacidades a preservar. Use caminhos relativos concretos, sem glob.
  Restrições reais de arquivos e ferramentas e validação do diff são
  responsabilidade do host. Pare e replaneje se STABLE mudar.
- Obtenha pareceres separados para preflight, diff final e comparação EGM.
  Cada parecer usa os SHAs e o `planHash` devolvidos na solicitação,
  além de fase, função e evidência rastreável. Após qualquer alteração, reavalie resultados
  afetados; os pareceres finais de outro SHA são ignorados.
- Use os [helpers de revisão independente](../sentinel/examples/independent-review/)
  para registrar os materiais e a sessão observados. Não trate o nome de um
  agente como prova de skill carregada ou revisão independente.
- `readyForGate` encaminha ao Gate existente. As verificações automáticas,
  manuais e a promoção continuam separadas. Por exemplo, exportação
  de sete folhas não prova impressão física nem preservação do WhatsApp.

## Prompt para colar no Antigravity

```text
/swarm Use o fluxo GILGAL WORK deste repositório. Identifique o STABLE e o WORK
pelo SHA e mantenha STABLE somente leitura. Use as skills realmente disponíveis
no host e informe se alguma estiver ausente. Distribua três papéis:
@security usa Security Audit, em leitura, para validar o escopo e recomendar
allow/block antes de editar. Se bloquear ou não houver parecer, pare nessa etapa.
@ponytail usa Ponytail para implementar apenas no WORK, nos caminhos permitidos.
Execute os checks do contrato e registre o resultado por tarefa.
@security revisa em leitura o diff final do candidato.
@egm usa EGM em uma sessão nova, somente leitura, para comparar STABLE e WORK.
Passe o contrato, os dois SHAs, o diff e os checks. Peça que indique regressões
e o que não foi comprovado. Se não houver sessão nova, sinalize indisponível.
Registre os pareceres com os SHAs e o planHash do plano. Não modifique STABLE,
não trate parecer como teste e encaminhe o candidato ao Gate só após essas etapas.
```

Use o quadro do Swarm para acompanhar as funções. O prompt exige a divisão de
papéis; o planejador não impõe isolamento, não carrega skills e não chama o
Antigravity automaticamente. Se faltar uma skill, não simule seu carregamento.

## Demonstração local

Na raiz: `npm --prefix sentinel ci`, `npm --prefix sentinel run build` e
`node sentinel/examples/work/demo.mjs`. A saída é sintética, incluindo o caso
de retry e as fases do fluxo. Não executa modelos, impressão ou promoção.
