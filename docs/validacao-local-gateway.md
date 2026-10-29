# Validação local do gateway — 29/10/2026

Base: `dev` em `508027a`, com os ajustes locais do frontend preservados.

## Ambiente local

O Docker Desktop voltou a iniciar após preservar e recriar as pastas de sockets
`Docker/run` e `docker-secrets-engine`. As pastas antigas foram mantidas como
backup. Discos, imagens, volumes e dados não foram removidos.

As portas 8080 e 5432 já estavam ocupadas por outros serviços. Esta validação usa:

| Serviço | Endereço local |
| --- | --- |
| Gateway | `http://127.0.0.1:8085` |
| Prévia Vite | `http://127.0.0.1:5174` |
| PostgreSQL do Syndetis | `127.0.0.1:5440` |
| Auth | `127.0.0.1:8081` |
| Core | `127.0.0.1:8082` |
| Integration-hub | `127.0.0.1:3001` |

`frontend/.env.local` define `VITE_GATEWAY_URL` para a prévia usar o gateway na
porta 8085. Sem essa variável, o Vite continua usando a porta 8080 por padrão.

## Configuração de teste

`.env.gateway-validation` contém as sobreposições locais e uma conta SELLER de
teste com senha aleatória. Esse arquivo e `frontend/.env.local` são ignorados pelo
Git. Não copie seu conteúdo para logs, tickets ou commits.

As sobreposições desativam assinaturas externas e retiram as credenciais de
cobrança dos contêineres. `PAYMENTS_ENABLED=true` ativa as regras de checkout do
core, incluindo endereço obrigatório e bloqueio de confirmação manual de
pagamento. `PAYMENTS_INTERNAL_TOKEN` e credenciais Mercado Pago permanecem
vazios; chamadas de cobrança falham localmente antes de acessar o provedor.
A configuração original de `.env` não é usada isoladamente para esta validação.

```powershell
docker compose --env-file .env --env-file .env.gateway-validation up -d --build
docker compose --env-file .env --env-file .env.gateway-validation ps
```

Para executar o smoke com os serviços disponíveis:

```powershell
node --env-file=.env.gateway-validation --input-type=module -e "process.env.SMOKE_BASE_URL='http://127.0.0.1:8085'; await import('./scripts/smoke-checkout.mjs')"
```

O smoke cria registros demonstrativos no banco local e verifica autenticação,
permissões, catálogo, publicação, endereço, cálculo do pedido, idempotência,
estoque e cancelamento. Não chama provedores de cobrança.

## Resultados

- Docker Engine 29.6.2: disponível.
- Sintaxe do Compose com as sobreposições: validada.
- Sete serviços do Syndetis: em execução; verificações de saúde definidas no Compose aprovadas.
- Cobranças externas: indisponíveis na configuração de teste, sem credenciais de provedores.
- Build local do frontend: aprovado.
- Smoke integrado contra os serviços reais: aprovado, incluindo login, permissões,
  publicação de vitrine, catálogo, endereço, total calculado no servidor,
  idempotência concorrente, cancelamento e devolução da reserva de estoque.
- Gateway: `/health`, planos públicos e frontend retornam 200; pedidos sem token
  retornam 401 e rotas internas não publicadas retornam 404.
- Proxy Vite: login e consulta autenticada retornam 200, logout retorna 204 e o
  refresh token revogado é rejeitado com 401.
- O contêiner `evolution_api` de outro projeto permaneceu em execução na porta 8080.

A prévia Vite foi reiniciada em 5174. Para iniciá-la novamente:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

O teste de cobrança externa permanece separado: a URL Asaas atual é de sandbox
e a credencial original é de produção. É necessário usar uma credencial de
sandbox coerente com esse ambiente antes de habilitar essa integração.

## Regras de planos — 29/10/2026

- Core-service reconstruído e atualizado isoladamente; migration V8 aplicada.
- Catálogo pelo gateway: Standard R$ 29/100 produtos e Maker R$ 49/500 produtos,
  com franquia Maker de 30 requisições diárias de IA.
- Endpoint autenticado de permissões: 200 para o lojista; 401 sem token.
- Suíte completa do core: 53 testes aprovados, sem falhas ou testes ignorados,
  incluindo 11 novos cenários de planos/cotas com PostgreSQL/Testcontainers.
- Smoke de checkout repetido contra o core atualizado: aprovado.
- O ambiente local permanece com `BILLING_ENABLED=false`: `enforced=false`,
  edição em modo de prévia e IA paga desabilitada. A aplicação obrigatória das
  regras foi testada com billing habilitado em bancos isolados dos testes.

Contrato e comportamento de downgrade em [planos e assinaturas](planos-e-assinaturas.md).
