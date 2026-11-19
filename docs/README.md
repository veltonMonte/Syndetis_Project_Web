# Documentação da Syndetis

Comece pelo [README da raiz](../README.md) para subir o ambiente. Esta pasta reúne o resto, agrupado pelo
que você quer fazer. Cada serviço também tem o próprio README, ao lado do código.

## Arquitetura

| Documento | Para quê |
|---|---|
| [Visão geral](architecture/visao-geral.md) | Serviços, bancos, fluxo de uma compra e onde cada regra vive |
| [Limites do gateway](architecture/gateway-rate-limits.md) | Quotas por rota e como ajustá-las |
| [Registro de decisões (ADR)](architecture/adr/README.md) | Por que o sistema é como é |

## Desenvolvimento

| Documento | Para quê |
|---|---|
| [Loja demo](development/loja-demo.md) | Popular uma loja completa ("Casa Brisa") para testar e apresentar |
| [Validação local do gateway](development/validacao-local-gateway.md) | Testar o caminho completo pelo gateway na sua máquina |
| [Kubernetes local](development/kubernetes-local.md) | Laboratório com Docker Desktop e Kustomize |

## Integrações

| Documento | Para quê |
|---|---|
| [Mercado Pago](integrations/mercado-pago.md) | Pagamentos e conexão da conta do lojista por OAuth |
| [Receita Federal](integrations/receita-federal.md) | CNPJ opcional (MEI aceito) e o selo Verificado Syndetis |
| [Login com Google e GitHub](integrations/oauth-google-github.md) | Credenciais, callbacks e perfis do auth-service |
| [Assinaturas com Asaas](integrations/assinaturas-asaas.md) | Cobrança das mensalidades das lojas |

## Implantação

| Documento | Para quê |
|---|---|
| [AWS e Cloudflare](deployment/deploy-aws-cloudflare.md) | Produção em EC2 atrás da Cloudflare |
| [Testando o backend na AWS](deployment/testando-backend-aws.md) | Conferências depois de implantar |
| [Neon Postgres](deployment/neon-postgres.md) | Bancos gerenciados, branches e credenciais |

## Operação

| Documento | Para quê |
|---|---|
| [Homologação](operations/homologacao.md) | Subir e usar o ambiente de homologação |
| [Validação da homologação](operations/validacao-homologacao.md) | Roteiro de aceite antes de liberar |

## Produto

| Documento | Para quê |
|---|---|
| [Planos e assinaturas](product/planos-e-assinaturas.md) | O que cada plano libera |
| [Marca Syndetis](product/marca.md) | Símbolo, cores, área de proteção e tamanho mínimo |
| [Sessão Maker: fase 0](product/maker/gerenciamento-fase-0.md) | Contratos de gerenciamento da loja |
| [Sessão Maker: fase 1](product/maker/fase-1.md) | Editor visual, tokens e publicação |
| [Posicionamento livre e novos elementos](product/maker/posicionamento-livre.md) | Arrastar, salvar e o formato no `layout_config` |
| [Modelos de loja](product/maker/modelos-de-loja.md) | A identidade de cada modelo e onde mudá-la |
| [Artes dos modelos Movimento](product/maker/motion-template-assets.md) | Origem e prompts das imagens |

## Convenções desta pasta

- Um documento por assunto, em português, com nome em minúsculas e hífens.
- Links relativos entre documentos; nada de caminhos absolutos da máquina de alguém.
- Decisões que mudam a arquitetura viram um ADR novo em `architecture/adr/`; ADRs antigos não são reescritos,
  e sim substituídos por um novo que diga o que mudou.
- Segredos nunca aparecem em exemplos: use os nomes das variáveis do `.env.example`.
