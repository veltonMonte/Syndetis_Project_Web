# Scripts

Rode todos a partir da raiz do repositório.

| Pasta | Script | Para quê |
|---|---|---|
| `aws/` | `bootstrap-ec2.sh`, `deploy.sh`, `render-env.sh`, `set-secret-keys.ps1` | Implantação em EC2 ([guia](../docs/deployment/deploy-aws-cloudflare.md)) |
| `ci/` | `smoke-checkout.mjs` | Compra completa pelo gateway; roda no CI e no Kubernetes local |
| `ci/` | `http-response.mjs` (+ teste) | Leitura segura de respostas HTTP usada pelo smoke |
| `demo-store/` | `seed.mjs`, `generate-images.mjs`, `catalog.mjs` | Loja demo "Casa Brisa" ([guia](../docs/development/loja-demo.md)) |
| `homologation/` | `validate.mjs` | Conferência do ambiente de homologação ([guia](../docs/operations/homologacao.md)) |
| `kubernetes/` | `local.mjs` | Laboratório Kubernetes local ([guia](../docs/development/kubernetes-local.md)) |

Convenções: Node com ES modules (`.mjs`) e sem dependências externas; nenhum script imprime segredos; scripts
que escrevem dados recusam hosts que não sejam locais, salvo opção explícita.
