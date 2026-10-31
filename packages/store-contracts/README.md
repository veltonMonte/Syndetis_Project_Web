# @syndetis/store-contracts

Contrato da nova separação entre Maker (aparência) e Gerenciamento (operação). Entrega da fase 0; não é um renderer, servidor ou integração já ligada à aplicação.

- Dados: schemaVersion 1, revisão da entidade e dataRevision.
- Layout: schemaVersion 2, layoutRevision independente.
- Schemas estritos Zod com tipos inferidos; ações e fontes por ID.
- Políticas puras de escopo, vínculos e preservação de sistemas.
- Rotas canônicas e matriz de responsabilidade.
- Estados de recurso e comandos separados de gravação.

Ver [contrato e critérios](../../docs/maker-gerenciamento-fase-0.md) para limites, rotas e plano de migração do legado.

## Executar

    npm ci
    npm run check
    npm run build
    npm test

Node >=22.18. O build emite JavaScript ESM e declarações TypeScript em dist, ignorado pelo Git.

## Consumo futuro

Após compilar e adicionar este pacote local às dependências do consumidor:

    import { layoutDocumentSchema, productSchema, checkPublication } from '@syndetis/store-contracts'

As APIs Kotlin precisam de validadores/adaptadores equivalentes e testes de compatibilidade; o pacote TypeScript não altera automaticamente o backend. Não substituir o contrato v1 em produção sem migração explícita.

As permissões são especificação testada. Autorização deve continuar sendo aplicada no servidor usando associação autenticada por loja e regras do plano. Dados de teste estão somente em tests e não são catálogo de exemplo da aplicação.
