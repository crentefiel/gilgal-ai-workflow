# GILGAL WORK — delegação por skills

O WORK organiza o trabalho no candidato. Um adaptador ou operador executa o plano.
O Sentinel checa o candidato; o Gate continua responsável pela promoção.

O planejador TypeScript em `sentinel/src/work-coordinator.ts` recebe tarefas e
resultados registrados pelo host. Cada tarefa inclui objetivo, caminhos de escrita,
dependências, critérios de aceitação, comportamentos a preservar e as superfícies
que precisam de revisão. O plano lista tarefas despacháveis em ordem de entrada e
explica por que as outras esperam. Caminhos iguais e relações pasta/arquivo são
tratados como conflito sem distinção de caixa. Use caminhos concretos relativos
ao repositório, sem glob. A lista orienta a delegação: não restringe ferramentas
nem resolve links simbólicos. O host deve validar o diff e limitar a escrita no
worktree autorizado.

Uma falha com referência ao resultado anterior permite nova tentativa apenas
daquela tarefa, até o limite configurado (padrão: duas tentativas no total).
Tarefas dependentes aguardam; tarefas concluídas ficam fora do próximo despacho.
O host precisa manter seu próprio registro de estado e serializar a reserva/
execução das tarefas. Uma referência a evidência é obrigatória para resultados
terminais, mas este planejador não executa nem verifica o teste citado.

| Perfil | Quando usar | Pergunta |
| --- | --- | --- |
| [EGM](https://github.com/google/elephant-goldfish-model) | Arquitetura ou contratos | O plano e a implementação concordam? O que falta demonstrar? |
| [Security Audit Skill](https://github.com/cloudflare/security-audit-skill) | IPC, permissões, arquivos, rede ou entradas não confiáveis | Qual fronteira está exposta? O achado foi validado ou é hipótese? |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Complexidade, duplicação ou dependências | Qual solução menor atende aos mesmos requisitos, sem cortar proteções? |

Perfis podem orientar o plano antes de codificar. Para revisar a entrega, espere
`readyForReview` e peça a cada perfil selecionado um parecer de leitura. O host
deve abrir sessões novas, fornecer contrato, diff e verificações, e usar os
[helpers de revisão independente](../sentinel/examples/independent-review/)
para registrar o candidato e os materiais efetivamente consultados. Três funções
especializadas podem usar o mesmo modelo; isso não demonstra independência de
sessão. Se uma skill real não estiver carregada, reporte como indisponível ou
descreva o parecer como inspirado nela. Não afirme que o roteiro completo de
auditoria da Cloudflare executou só porque a função se chama Security.

## Executar

Da raiz, rode `npm --prefix sentinel ci`, `npm --prefix sentinel run build`
e `node sentinel/examples/work/demo.mjs`. A demonstração simulada mostra duas
tarefas independentes, falha de prévia, retry com o erro, desbloqueio do teste de
exportação e seleção dos três perfis. Não chama IA, não imprime e não faz deploy.

## Usar no Swarm manualmente

Crie o plano em um worktree de teste e entregue cada tarefa despachável ao
coordenador do Swarm. Peça que ele respeite as dependências e caminhos, atualize
o estado após as verificações e recalcule o plano. Configure EGM, Security Audit
e Ponytail como funções distintas; use os pareceres como pendências verificáveis.
Peça revisão em sessão nova fora da conversa de implementação quando o host
oferecer esse isolamento. Só atribua cobertura a um teste que foi realmente
executado no candidato. Para LAN House, conferir exportação não valida impressão
física nem preservação de WhatsApp; registre essas verificações separadamente.

O módulo não instala skills, não cria agentes, não autentica revisores, não
controla permissões e não promove o candidato. A ligação automática ao Swarm
ou ao DeepSeek Harness será feita via adaptador separado.
