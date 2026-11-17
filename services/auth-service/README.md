# auth-service

Kotlin + Spring Boot. Contas, login, tokens e identidade dos lojistas. Porta local 8081, banco `syndetis_auth`.

## Responsabilidades

- Cadastro de compradores (`/api/auth/register`) e de lojistas (`/api/auth/register/seller`, só com CNPJ
  ativo na Receita Federal).
- Login com e-mail e senha (BCrypt) e com Google ou GitHub (perfis `oauth-google`, `oauth-github`).
- Access token JWT RS256 curto e refresh token opaco, rotacionado a cada uso; chave pública em
  `/.well-known/jwks.json`.
- Confirmação de documento para lojistas vindos do login social (`/api/auth/me/document`).

## Executar

```bash
./mvnw spring-boot:run
```

```bash
./mvnw test
```

Os testes de integração usam Testcontainers e precisam do Docker; sem ele, são pulados.

## Documentação

- [Login com Google e GitHub](../../docs/integrations/oauth-google-github.md)
- [Receita Federal: CNPJ e MEI](../../docs/integrations/receita-federal.md)
- [ADR 0001: JWT validado localmente](../../docs/architecture/adr/0001-jwt-validado-localmente.md)

## Estrutura

Segue o padrão dos serviços Kotlin descrito no [AGENTS.md](../../AGENTS.md): `config/`, `controller/`,
`service/`, `repository/`, `model/{entity,dto,enum}/`, `security/`, `exception/` e, para a regra de documentos
dos lojistas, `document/`. Migrations Flyway em `src/main/resources/db/migration/`.
