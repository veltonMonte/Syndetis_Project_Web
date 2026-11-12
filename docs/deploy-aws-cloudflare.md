# Deploy de homologação — AWS + Cloudflare

A homologação roda em **https://syndetis.online** (zona no Cloudflare, região AWS `us-east-1`):

```text
Navegador ──▶ Cloudflare Worker  (https://syndetis.online, domínio personalizado do Worker)
               ├─ SPA (frontend/dist, Workers Static Assets)
               └─ /api, /oauth2, /login/oauth2, /.well-known ──▶ AWS EC2 (https://<ip>.sslip.io)
                                                                   Caddy (borda) ─▶ gateway
                                                                   auth · core · integration-hub · Redis
                                                                   └──▶ Amazon RDS PostgreSQL (privado)
```

- **Mesma origem para o navegador.** O Worker repassa a API para a AWS, então cookies, OAuth e as chamadas
  relativas `/api` funcionam sem mudança no app.
- **A AWS só aceita o Worker.** O Caddy (`gateway/Caddyfile.cloudflare`) recusa com 403 toda requisição sem o
  cabeçalho `X-Syndetis-Edge` correto e substitui o `X-Forwarded-For` pelo IP real enviado pelo Worker. Assim os
  limites de login e de leitura do gateway continuam valendo por pessoa.
- **RDS sem acesso público.** O security group do banco aceita somente o security group do EC2.
- **`sslip.io` só entre o Worker e a AWS.** `3-90-12-34.sslip.io` resolve para `3.90.12.34`, o que permite ao Caddy
  emitir um certificado HTTPS para o EC2 sem registro DNS extra. Visitantes nunca veem esse nome.
- **Uma origem só.** `workers.dev` e as URLs de prévia ficam desligados em `frontend/wrangler.jsonc`.

## Variáveis

Todas as variáveis do EC2 ficam em **um** segredo do AWS Secrets Manager, `syndetis/homologation` (JSON).
`scripts/aws/render-env.sh` gera o `.env.aws` a partir dele no próprio servidor, sem imprimir valores.

| Chave | Exemplo / formato | Quem define |
| --- | --- | --- |
| `POSTGRES_HOST` | endpoint do RDS | provisionamento |
| `POSTGRES_USER` | `syndetis` | provisionamento |
| `POSTGRES_PASSWORD` | 32+ caracteres aleatórios | gerado no provisionamento |
| `PUBLIC_ORIGIN` | `https://syndetis.online` | provisionamento |
| `EDGE_HOST` | `3-90-12-34.sslip.io` (IP elástico do EC2) | provisionamento |
| `EDGE_SECRET` | 64 caracteres hex; o mesmo valor vai para o Worker | gerado no provisionamento |
| `PAYMENTS_INTERNAL_TOKEN` | 64 caracteres hex (core ↔ hub) | gerado no provisionamento |
| `HOMOLOGATION_SELLER_EMAIL` | e-mail do lojista de teste | **você**, no console |
| `HOMOLOGATION_SELLER_PASSWORD` | 12+ caracteres | **você**, no console |
| `MP_ACCESS_TOKEN` | credencial do **vendedor de teste** do Mercado Pago | **você**, no console |
| `MP_WEBHOOK_SECRET` | assinatura secreta do webhook do Mercado Pago | **você**, no console |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | opcional, login com Google | **você**, no console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | opcional, login com GitHub | **você**, no console |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `BILLING_INTERNAL_TOKEN`, `BILLING_ENABLED` | opcional, assinaturas Asaas (sandbox) | **você**, no console |

Derivadas automaticamente pelo script: `JWT_ISSUER = PUBLIC_ORIGIN`, `HOMOLOGATION_HOST = EDGE_HOST`,
`AUTH_SPRING_PROFILES_ACTIVE=homologation`, `PAYMENTS_ENABLED=true`, `MP_SANDBOX=true`.

O Worker tem duas configurações: `API_ORIGIN` (em `frontend/wrangler.jsonc`, `https://<EDGE_HOST>`) e o segredo
`EDGE_SECRET` (`wrangler secret put`). Valores de chaves e senhas nunca vão para o Git nem para o chat.

## Recursos na AWS

| Recurso | Configuração |
| --- | --- |
| Security group `syndetis-ec2` | entrada TCP 80 e 443 de qualquer origem (o Caddy recusa o que não vier do Worker); SSH só se necessário, restrito ao seu IP |
| Security group `syndetis-rds` | entrada TCP 5432 somente do `syndetis-ec2` |
| RDS PostgreSQL 16 | `db.t4g.micro`, 20 GB gp3, sem acesso público, backup automático de 7 dias, usuário `syndetis` |
| IAM role `syndetis-ec2` | `secretsmanager:GetSecretValue` somente em `syndetis/homologation`; `AmazonSSMManagedInstanceCore` para acesso sem SSH |
| EC2 | Amazon Linux 2023, `t3.small` (2 GB + 4 GB de swap) ou `t3.medium`, 30 GB gp3, user data `scripts/aws/bootstrap-ec2.sh` |
| IP elástico | associado ao EC2; dele sai o `EDGE_HOST` |

## Ordem do provisionamento

1. Criar os security groups, o RDS (senha gerada e gravada direto no segredo) e o segredo `syndetis/homologation`
   com as chaves geradas.
2. Preencher no console da AWS as chaves marcadas como **você** (Secrets Manager → `syndetis/homologation` →
   *Retrieve secret value* → *Edit*).
3. Criar a IAM role, o EC2 com o user data e o IP elástico; gravar `EDGE_HOST` e `POSTGRES_HOST` no segredo.
4. Publicar o Worker:

   ```sh
   cd frontend
   npm run build
   npx wrangler deploy
   aws secretsmanager get-secret-value --secret-id syndetis/homologation --query SecretString --output text \
     | jq -r .EDGE_SECRET | npx wrangler secret put EDGE_SECRET
   ```

5. Rodar o deploy no EC2 (via SSM Session Manager):

   ```sh
   cd /opt/syndetis && scripts/aws/deploy.sh
   ```

6. Configurar o webhook do Mercado Pago para `https://<PUBLIC_ORIGIN>/api/payments/webhooks/mercadopago` e seguir
   a jornada de aceitação de [homologacao.md](homologacao.md).

## Atualizar uma versão

```sh
cd /opt/syndetis && scripts/aws/deploy.sh <tag-ou-commit>    # EC2
cd frontend && npm run build && npx wrangler deploy          # Worker
```

Antes de atualizar uma instalação com dados, confira o último snapshot automático do RDS.
