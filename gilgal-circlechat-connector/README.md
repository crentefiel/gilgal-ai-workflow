# GILGAL CircleChat Connector — MVP 0.1

Ponte experimental entre **CircleChat**, **GILGAL** e **FreeLLMAPI**.

```text
CircleChat → GILGAL Connector → FreeLLMAPI → várias LLMs
                    ↓
             evidência + Gate
```

## O que este MVP prova

- recebe um evento HTTP do CircleChat;
- reconhece `@gilgal` ou `gilgal:`;
- executa seis papéis: arquiteto, dois programadores, revisor, testador e sintetizador;
- suporta políticas `auto`, `specialist` e `council`;
- usa o modelo virtual `fusion` no sintetizador em modo council;
- registra modelo solicitado, modelo resolvido, hash da saída e SHA candidato;
- devolve ações compatíveis com um agente webhook do CircleChat;
- permanece `BLOCKED` enquanto só existem respostas de LLM.

Este MVP **não executa nem publica código**, não faz merge e não transforma texto produzido por IA em evidência verificada. A cápsula Docker/SWE-ReX e o Gate executável são a próxima etapa.

## Executar

Requisitos: Node.js 20+ e uma instância acessível do FreeLLMAPI.

```bash
cp .env.example .env
# edite .env
npm test
npm start
```

Teste de saúde:

```bash
curl http://localhost:7332/health
```

Evento de demonstração:

```bash
curl -X POST http://localhost:7332/circlechat/events \
  -H "content-type: application/json" \
  -d '{"content":"@gilgal crie um site simples para uma gráfica"}'
```

## Configuração no CircleChat

1. Suba o conector e o FreeLLMAPI.
2. No CircleChat, provisione um agente webhook chamado `gilgal`.
3. Aponte o webhook para `http://<host>:7332/circlechat/events`.
4. Configure o FreeLLMAPI em `FREELLM_BASE_URL` e `FREELLM_API_KEY`.
5. Escreva `@gilgal <objetivo>` num canal.

O formato exato de autenticação/assinatura do webhook deve ser adaptado à instalação do CircleChat antes de exposição pública.

## Políticas de modelos

| Política | Comportamento |
|---|---|
| `auto` | FreeLLMAPI escolhe o modelo em todas as funções |
| `specialist` | GILGAL solicita uma rota por função |
| `council` | especialistas independentes e síntese final via `fusion` |

## Invariantes GILGAL

- saída de LLM não é prova de execução;
- evidência registra o SHA candidato quando fornecido;
- nenhum papel pode promover automaticamente;
- falha ou ausência de evidência mantém o Gate fechado;
- o sintetizador pode concluir `NO_WINNER`;
- nenhuma credencial deve ser commitada.

## Próximas etapas

1. autenticação assinada do webhook CircleChat;
2. descoberta do catálogo `/v1/models` e fixação de modelos por agente;
3. diversidade obrigatória entre autor e revisor;
4. cápsula de execução Docker/SWE-ReX;
5. armazenamento persistente do Capability Ledger e das evidências;
6. testes reais de integração com CircleChat e FreeLLMAPI.
