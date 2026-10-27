# Limites de requisição do gateway

| Operação | Limite padrão por IP | Janela | Variável |
| --- | --- | --- | --- |
| Login e cadastro | 30 | 15 minutos | `AUTH_RATE_LIMIT` |
| Leitura pública de planos e catálogo | 300 | 5 minutos | `PUBLIC_READ_RATE_LIMIT` |
| Cotação de frete | 20 | 1 minuto | `SHIPPING_RATE_LIMIT` |
| Webhooks Asaas, Mercado Pago e genéricos | 600 | 1 minuto | `WEBHOOK_RATE_LIMIT` |

Cada grupo tem seu próprio contador. Esgotar catálogo não bloqueia login nem
entregas de webhook. Todas as respostas limitadas retornam 429, `Retry-After`
e cabeçalhos `RateLimit` no padrão draft-8. As regras de autenticação das rotas
e dos webhooks continuam obrigatórias.

O teto de webhook é maior para acomodar eventos de várias lojas enviados pelo
mesmo IP do provedor. Ajuste a partir de volume medido, acompanhe 429 e monitore
as filas; o limite é uma proteção de entrada, não uma garantia contra DDoS.

Os contadores usam o MemoryStore já fornecido por express-rate-limit, adequado
à única instância de gateway definida no Compose atual. Reiniciar o processo
zera os contadores. Antes de executar múltiplas instâncias ou exigir contadores
persistentes, configure um store Redis compartilhado e teste sua política de
indisponibilidade. Não multiplique réplicas mantendo contadores independentes.

A precisão depende do IP validado na borda. Com proxy, mantenha o gateway sem
exposição pública direta e valide a configuração de confiança antes do deploy.
Limitar volume não substitui o limite de corpo e o prazo de recebimento.
