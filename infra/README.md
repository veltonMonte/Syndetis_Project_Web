# Infraestrutura

| Pasta | Conteúdo | Usado por |
|---|---|---|
| `docker/postgres/` | Script que cria, na primeira subida, os bancos listados em `POSTGRES_MULTIPLE_DATABASES` | `docker-compose.yml` |
| `k8s/` | Manifests Kustomize: `base/` e o overlay `overlays/docker-desktop/` | `scripts/kubernetes/local.mjs` ([guia](../docs/development/kubernetes-local.md)) |
| `neon/` | Política de branches do Neon (`neon.ts`) | CLI do Neon ([guia](../docs/deployment/neon-postgres.md)) |

Os arquivos Compose ficam na raiz (`docker-compose.yml`, `compose.homologation.yml`, `compose.aws.yml`) porque
os caminhos de build de cada serviço são relativos a ela.

Arquivos locais com credenciais nunca são versionados: `infra/k8s/.local/` e `infra/neon/.env.local` estão no
`.gitignore`.
