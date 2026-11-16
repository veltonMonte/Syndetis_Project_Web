# PostgreSQL no Neon

O Syndetis pode usar o Neon como PostgreSQL no lugar do RDS. Só a conexão muda: auth-service e
core-service continuam com Spring Data JPA (Hibernate), driver pgjdbc, HikariCP e Flyway; o
integration-hub não usa Postgres; o Redis (Streams) continua na AWS, sem alteração.

| Item | Valor |
|---|---|
| Organização | `org-calm-hill-54318135` |
| Projeto | `gentle-band-95278121` (PostgreSQL 18, `aws-us-east-2`) |
| Branch de produção | `production` (padrão do projeto) |
| Bancos | `syndetis_auth` (auth-service) e `syndetis_core` (core-service), dono `neondb_owner` |
| Configuração da CLI | `infra/neon/neon.ts` (política de branches) |

Cada serviço continua com o seu banco: são dois bancos na mesma branch, com URLs diferentes.

## Como a conexão funciona

Cada serviço lê `DATABASE_URL` (formato `postgresql://usuario:senha@host/banco?sslmode=require`,
como o Neon entrega). Um `EnvironmentPostProcessor` (`config/DatabaseUrlEnvironmentPostProcessor.kt`
em cada serviço) converte essa URL em `spring.datasource.url`, `username` e `password` antes de o
Spring criar o pool. Sem `DATABASE_URL`, nada muda: valem `POSTGRES_HOST`, `POSTGRES_USER`,
`POSTGRES_PASSWORD` como antes (Docker local, RDS, Testcontainers).

- **TLS obrigatório.** `sslmode=disable`, `allow` ou `prefer` impedem a inicialização. `require`
  (o padrão do Neon) vira `verify-full` no JDBC, com o truststore da JVM
  (`sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory`): além de cifrar, o certificado e o host
  são verificados.
- **Conexão direta, pool no Hikari.** Use a connection string *direta* (sem `-pooler` no host). O
  HikariCP já é o pool da aplicação, e o Flyway precisa de uma sessão real para o lock das
  migrations, o que o PgBouncer em modo transação não garante.
- **Pool**, configurável por variável:

  | Variável | Padrão | Uso |
  |---|---|---|
  | `DB_POOL_MAX_SIZE` | `10` | conexões máximas por serviço |
  | `DB_POOL_MIN_IDLE` | `2` | conexões ociosas mantidas |
  | `DB_CONNECTION_TIMEOUT_MS` | `15000` | espera por conexão; cobre o despertar do compute do Neon |

  `idle-timeout` é 5 min e `max-lifetime` 20 min, abaixo dos limites de conexão ociosa do Neon.
- **Segredo nunca aparece em log.** A senha é decodificada da URL e passada só para o datasource; as
  mensagens de erro não repetem a URL, e `toString` mascara a senha.

## Variáveis por ambiente

| Ambiente | Onde configurar | Chaves |
|---|---|---|
| Docker local (`docker-compose.yml`) | `.env` (ignorado pelo Git) | `AUTH_DATABASE_URL`, `CORE_DATABASE_URL` (vazias = Postgres do Compose) |
| AWS (`compose.aws.yml`) | segredo `syndetis/homologation` no Secrets Manager | `AUTH_DATABASE_URL`, `CORE_DATABASE_URL` no lugar de `POSTGRES_HOST/USER/PASSWORD` |
| `bootRun` / jar | variável de ambiente | `DATABASE_URL` |

Com as duas URLs no segredo, `scripts/aws/render-env.sh` grava `SYNDETIS_DATABASE=neon` e
`scripts/aws/deploy.sh` não tenta criar bancos no RDS. Sem elas, o fluxo do RDS continua igual.

## Credenciais e Git

- `.env`, `.env.*` (exceto os `.example`) e `.neon` estão no `.gitignore` da raiz;
  `infra/neon/.gitignore` repete `.neon` e `.env.local`.
- `neon init` e `neon env pull` gravam a URL **com senha** em `infra/neon/.env.local`. Esse arquivo
  fica só na máquina; para produção, a URL vai para o Secrets Manager.
- Para conferir antes de um commit: `git check-ignore -v infra/neon/.env.local infra/neon/.neon`.

## Branches de teste

`infra/neon/neon.ts` define a política: a branch `production` nunca é alterada por `neon deploy`, e
toda branch nova nasce com 0,25 CU e expira em 7 dias.

```bash
cd infra/neon
npm ci
npx neon@latest checkout minha-branch-de-teste --create   # cria a branch a partir de production
npx neon@latest databases create --name syndetis_auth --branch minha-branch-de-teste
npx neon@latest databases create --name syndetis_core --branch minha-branch-de-teste
npx neon@latest connection-string minha-branch-de-teste --database-name syndetis_auth --role-name neondb_owner
```

Os serviços criam as tabelas sozinhos: o Flyway aplica `V1..V3` no auth e `V1..V9` no core na
primeira subida. Nenhuma migration existente apaga tabela ou dado; todas são aditivas.

Antes de qualquer `neon deploy`, rode `npx neon@latest config plan --branch <branch>` e confira que
o plano não toca em `production`.

## Produção (não aplicado)

Nada foi alterado na branch `production`. Quando houver autorização para usar o Neon em produção:

1. Conferir o plano: `npx neon@latest config plan --branch production` deve responder "No changes".
2. Criar os bancos na `production` (aditivo, não mexe no `neondb` existente):
   `npx neon@latest databases create --name syndetis_auth --branch production` e o mesmo para
   `syndetis_core`.
3. Recomendado: criar um papel próprio da aplicação em vez de usar `neondb_owner`, e ativar a
   proteção da branch `production` (depende do plano do Neon; no plano Free não há).
4. Gravar no segredo `syndetis/homologation` (ou no segredo de produção) as chaves
   `AUTH_DATABASE_URL` e `CORE_DATABASE_URL` com as URLs **diretas** de cada banco.
5. Migrar os dados do RDS, se houver dados a preservar (com o serviço parado ou em manutenção):

   ```bash
   pg_dump --format=custom --no-owner --no-privileges "postgresql://syndetis@<rds-host>/syndetis_auth?sslmode=require" -f auth.dump
   pg_restore --no-owner --no-privileges --dbname "<AUTH_DATABASE_URL direta>" auth.dump
   ```

   Repetir para `syndetis_core`. Usar o `pg_dump` 18 (o RDS é PostgreSQL 16, o Neon 18). O
   `flyway_schema_history` vem junto, então o Flyway não reaplica as migrations. Sem dados a migrar,
   basta subir os serviços: o Flyway cria tudo.
6. `scripts/aws/deploy.sh` no EC2 e conferir `/actuator/health` dos dois serviços.
7. Manter o RDS parado (não excluído) até validar a produção no Neon; o snapshot automático é a
   volta.
