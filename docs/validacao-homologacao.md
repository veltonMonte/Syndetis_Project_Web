# Registro de validação — 2026-10-26

Versão: `0.1.0-homologation.1`. Base de desenvolvimento: `origin/dev` no commit `503d4c9`.

## Executado localmente

| Verificação | Resultado |
| --- | --- |
| Gateway: build e testes HTTP/JWT/proxy | 10 testes aprovados |
| Frontend: lint e build de produção | Aprovados, sem avisos de lint |
| Frontend: jornadas Chromium | 4 testes aprovados, com APIs controladas de teste |
| Integration-hub: testes unitários | 54 testes aprovados |
| Integration-hub: testes HTTP E2E | 27 testes aprovados |
| Integration-hub: lint e build | Aprovados, sem avisos de lint |
| Core: compilação de código e testes | Aprovada com JDK 21 |
| Core: JWT, layout, estados de pedido e publicação de evento | 11 testes unitários aprovados |
| Auth: compilação de código e testes | Aprovada com JDK 21 |
| Compose local e composição HTTPS de homologação | Configuração validada, sem iniciar containers |
| Pré-validação do domínio e variáveis | Aprovada com valores fictícios |
| Auditoria npm do gateway, frontend e hub | Nenhuma vulnerabilidade reportada após atualização dos lockfiles |

## Ainda não validado neste computador

- As migrations e os testes de integração com PostgreSQL/Testcontainers, incluindo `PaymentIntegrationTest`, não foram executados: Docker Desktop apresentou erro de inicialização em `dockerInference` e o daemon não ficou disponível. Os testes estão incluídos no CI.
- O smoke da stack completa em Compose depende desse mesmo daemon. O CI sobe uma stack isolada para executá-lo.
- Não foi feita uma compra na aplicação de teste do Mercado Pago: faltam as credenciais de teste e a configuração do webhook no ambiente publicado. Os testes do provedor usam respostas controladas, sem cobrança.
- Não foi publicado `syndetis-web.com`: faltam confirmação/acesso ao servidor, DNS e configuração dos segredos.

Os resultados locais não substituem essas verificações pendentes. O guia de execução e aceitação está em [homologacao.md](homologacao.md).
