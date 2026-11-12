# Segurança

- Nunca coloque chaves reais no repositório.
- Execute o conector numa rede privada durante o MVP.
- Valide assinatura e replay dos eventos antes de expor o endpoint publicamente.
- Não monte `/var/run/docker.sock` no conector.
- Dê a agentes somente uma cópia WORK descartável do projeto.
- Rede, segredos, deploy, push, merge e promoção exigem políticas explícitas.
- O Gate deve falhar fechado quando evidência obrigatória estiver ausente.

Para reportar uma vulnerabilidade, use o mecanismo privado de security advisory do repositório.
