# AGENTS.md

Este arquivo orienta agentes de IA (Claude Code, Cursor, Copilot, etc.) e desenvolvedores humanos trabalhando neste repositório. Leia antes de gerar ou alterar código.

## Visão geral do projeto

Plataforma SaaS multi-domínio que permite criar, gerenciar e personalizar múltiplos modelos de negócio em um único ecossistema: **lojas virtuais (e-commerce)**, **cardápios digitais** e **bilheterias de eventos**.

O diferencial do produto é a **Sessão Maker**: uma interface de customização visual baseada em templates modulares. Em vez de gerar código dinâmico, o sistema serializa as escolhas de estilo (cards, animações, temas, paletas) em objetos JSON, persistidos no banco (coluna `JSONB`) e interpretados dinamicamente pelo frontend.

Arquitetura de **microsserviços desacoplados e poliglotas** — cada serviço usa a linguagem mais adequada ao seu perfil de execução.

## Arquitetura

```
Frontend (React SPA)
        │
        ▼
   API Gateway  ── roteamento centralizado, validação de token
        │
        ├──► auth-service        (Kotlin + Spring Boot)
        ├──► core-service         (Kotlin + Spring Boot)
        └──► integration-hub      (TypeScript / Node.js)
```

### auth-service (Kotlin + Spring Boot)
- Autenticação e login (local + OAuth2 com Google e GitHub)
- Emissão e validação de JWT (RS256), com endpoint JWKS público
- Gestão de usuários e roles
- Banco: PostgreSQL (tabelas `users`, `refresh_tokens`)

### core-service (Kotlin + Spring Boot)
- E-commerce e vendas (produtos, pedidos, estoque)
- Sessão Maker: salva e entrega o `layout_config` (JSON) de cada loja
- Banco: PostgreSQL (colunas `JSONB` para layout)

### integration-hub (TypeScript / Node.js)
- Cálculo de frete (API dos Correios)
- Disparo de e-mails (Gmail API)
- Mensagens via WhatsApp API
- Webhooks e filas — I/O assíncrono e não bloqueante

### API Gateway
- Ponto de entrada único da infraestrutura
- Roteia requisições do frontend para os microsserviços corretos
- Valida tokens JWT **localmente** via JWKS (não chama o auth-service a cada request)

### Frontend (React)
- SPA único que atende tanto o painel administrativo (Maker) quanto a vitrine pública/checkout
- Renderiza componentes dinamicamente a partir do `layout_config` retornado pela API

## Decisões de arquitetura importantes

- **Validação de token**: o Gateway e os demais serviços validam o JWT localmente via chave pública exposta em `/.well-known/jwks.json` pelo auth-service — evita acoplamento e chamadas de rede extras a cada requisição.
- **Tokens**: access token JWT de vida curta (5–15 min); refresh token opaco, armazenado hasheado no banco do auth-service, com rotação a cada uso — permite revogação real.
- **Multi-domínio**: cada loja/cardápio/evento tem seu próprio `layout_config` em JSON, não código compilado — customização sem deploy.

## Estrutura do repositório (monorepo)

```
/
├── settings.gradle.kts
├── build.gradle.kts
├── services/
│   ├── auth-service/          (Kotlin, Gradle Kotlin DSL)
│   ├── core-service/          (Kotlin, Gradle Kotlin DSL)
│   └── integration-hub/       (TypeScript / Node.js)
├── libs/
│   ├── common/                 (DTOs e exceptions compartilhadas entre serviços Kotlin)
│   └── jwt-utils/               (validação de JWT compartilhada)
├── frontend/                    (React SPA)
└── docker-compose.yml           (sobe todos os serviços + Postgres localmente)
```

## Padrão de pastas — serviços Kotlin/Spring Boot

Aplicado em `auth-service` e `core-service`:

```
src/main/kotlin/com/<projeto>/<servico>/
├── <Servico>Application.kt
├── config/          (SecurityConfig, JwtConfig, OAuth2Config)
├── controller/      (endpoints REST)
├── service/         (regras de negócio)
├── repository/      (interfaces JPA)
├── model/
│   ├── entity/      (@Entity — mapeamento do banco)
│   ├── dto/         (request/response — nunca expor entity diretamente na API)
│   └── enum/
├── security/        (filtros e handlers específicos do Spring Security)
└── exception/       (GlobalExceptionHandler + exceptions customizadas)

src/main/resources/
├── application.properties (+ -dev / -prod)
└── db/migration/    (Flyway, arquivos V1__..., V2__... numerados sequencialmente)
```

## Stack e convenções técnicas

| Item | Escolha |
|---|---|
| Build tool | Gradle com Kotlin DSL (`build.gradle.kts`) |
| Linguagem (auth/core) | Kotlin |
| Linguagem (integration-hub) | TypeScript / Node.js |
| Framework (Kotlin) | Spring Boot (Web, Security, OAuth2 Client, OAuth2 Resource Server, Data JPA) |
| Java target | 21 |
| Banco de dados | PostgreSQL |
| Migrations | Flyway, versionadas (`V1__descricao.sql`) |
| Autenticação | OAuth2 (Google, GitHub) + JWT (RS256) via Spring Security |
| Hash de senha | BCrypt |
| Frontend | React SPA |

## Convenções de código

- Pacotes e nomes de projeto sempre em **minúsculo** (evitar `com.NuVox`; usar `com.<nome>`).
- DTOs de request/response ficam separados das entidades JPA — nunca expor `@Entity` direto num endpoint.
- Toda alteração de schema passa por uma migration Flyway nova, nunca editar uma migration já aplicada.
- Cada microsserviço mantém seu próprio banco de dados — sem joins entre bancos de serviços diferentes.
- Módulos compartilhados (`libs/common`, `libs/jwt-utils`) só devem conter código realmente reutilizado por mais de um serviço.

## Como rodar localmente

```bash
docker compose up -d          # sobe Postgres e serviços dependentes
./gradlew :services:auth-service:bootRun
./gradlew :services:core-service:bootRun
cd services/integration-hub && npm run dev
cd frontend && npm run dev
```

*(ajustar comandos conforme o `docker-compose.yml` e scripts finais do projeto)*

## Testes

- Testes de integração dos fluxos de autenticação (registro, login, refresh, token inválido/expirado) usando **Testcontainers** para o Postgres.
- CI simples via GitHub Actions: build + testes a cada push.

## Contexto acadêmico

Projeto desenvolvido na disciplina de Integração de Sistemas, ciclo de 5 meses, dividido em duas frentes:
- **Backend & Infraestrutura**: API Gateway, bancos de dados, regras de negócio dos três microsserviços, orquestração de APIs externas.
- **Frontend & UI**: ecossistema React, componentes reutilizáveis, checkout, Sessão Maker, estados da aplicação.

## Pendências / decisões em aberto

- [ ] Nome definitivo do projeto (era "NuVox", em processo de troca).
- [ ] Definição final de Group/Artifact do Gradle.
- [ ] Estratégia de deploy (ainda não decidida).
