# Loja demo "Casa Brisa"

Um script popula uma loja completa pelas APIs públicas, como o frontend faria: conta de lojista com CNPJ
confirmado, loja, 3 categorias, 12 produtos com imagens e estoque, layout do Maker publicado (com elementos em
posição livre) e 10 pedidos em todas as situações, para o painel mostrar vendas, pedidos e estoque.

## Rodar

```bash
docker compose up -d
```

```bash
node scripts/demo-store/seed.mjs
```

Rodar de novo não duplica nada: contas, loja, categorias e produtos são reaproveitados, e pedidos só são criados
numa loja sem pedidos. As imagens dos produtos são SVGs gerados localmente em `frontend/public/images/demo/`
(`node scripts/demo-store/generate-images.mjs` recria).

## Acesso

- Vitrine: `http://localhost:8080/#/lojas/casa-brisa`
- Painel: entre com `lojista@casabrisa.test`; a senha de demonstração está em `scripts/demo-store/seed.mjs`
  e pode ser trocada com `SEED_SELLER_PASSWORD`.

## Segurança

O script recusa qualquer host que não seja desta máquina. Para um ambiente de teste descartável atrás de
serviços locais (por exemplo a branch `syndetis-neon-test` do Neon), use `SEED_ALLOW_REMOTE=1`. Nunca rode contra
produção.

Contas de lojista são só com CNPJ ativo (veja [Receita Federal](../integrations/receita-federal.md)). Para criar o
lojista demo, informe em `SEED_SELLER_DOCUMENT` o CNPJ de uma empresa que você pode usar em testes; sem ele, o script
para e explica. Um lojista demo que já existe é reaproveitado e, se ainda não tiver CNPJ confirmado, confirma o
`SEED_SELLER_DOCUMENT` informado. Variáveis: `SEED_BASE_URL`, `SEED_AUTH_URL`, `SEED_CORE_URL`, `SEED_PUBLIC_ORIGIN`,
`SEED_SELLER_EMAIL`, `SEED_SELLER_PASSWORD`, `SEED_SELLER_DOCUMENT`, `SEED_BUYER_EMAIL`, `SEED_BUYER_PASSWORD`.
