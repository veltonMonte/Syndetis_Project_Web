# 0007. CNPJ opcional e selo "Verificado Syndetis"

- Situação: aceita; substitui a obrigatoriedade do documento da [0004](0004-documento-do-lojista-na-receita.md) e da
  [0006](0006-lojista-somente-cnpj.md)
- Data: 2026-11-17

## Contexto
Exigir CNPJ para abrir qualquer loja barrava quem ainda está começando. O objetivo continua sendo dar ao comprador um
sinal confiável de que há uma empresa por trás da loja. Esse sinal precisa ser impossível de falsificar: nada que o
lojista edita no Maker (o `layout_config`) pode produzi-lo. E cada serviço tem o próprio banco: o core-service não
consulta as tabelas do auth-service.

## Decisão
- **Cadastro sem documento.** Qualquer lojista cria conta e loja e vende. O CNPJ é opcional no cadastro e pode ser
  informado depois, no painel (`POST /api/auth/me/document`). CPF continua fora ([0006](0006-lojista-somente-cnpj.md)).
- **Selo só com CNPJ confirmado.** Um CNPJ informado passa pela BrasilAPI: situação ATIVA (MEI aceito), um CNPJ por
  conta, recusa quando a consulta não responde. Confirmado, a loja mostra "Verificado Syndetis" na vitrine e no painel.
- **Como o selo chega ao core-service.** O auth-service assina no token do lojista o claim `doc_verified`. O
  core-service, que já valida o token (RS256, JWKS, [0001](0001-jwt-validado-localmente.md)), copia esse valor para as
  lojas do dono (`stores.owner_verified`, migração V12) ao criar uma loja e sempre que o lojista lista as próprias lojas
  (`GET /api/stores/me`, chamado pelo painel). Depois de confirmar o CNPJ, o painel recebe tokens novos e recarrega as
  lojas, que passam a carregar o selo. Um token sem o claim (cliente, token antigo) não altera nada.
- **Leitura pública.** `GET /api/public/stores/{slug}` devolve `verified` a partir de `stores.owner_verified`. A vitrine
  só desenha o selo a partir desse campo, nunca a partir do layout.

## Alternativas consideradas
- **Chamada interna do auth-service para o core-service** ao confirmar o CNPJ: propagação imediata, mas cria uma
  dependência nova entre os serviços e um segundo segredo interno. Pode ser adicionada depois sem mudar o modelo.
- **Evento no Redis**: o stream atual é do core-service para o integration-hub; usá-lo no sentido inverso exigiria um
  consumidor novo no core-service. Mais peças para o mesmo resultado.

## Consequências
- O selo não depende de nada que o lojista edita, e os bancos continuam separados.
- O selo atualiza quando o dono abre o painel (a confirmação acontece no próprio painel, então é imediato na prática).
  Se um CNPJ deixar de valer, a mudança chega às lojas na próxima vez que o dono listar as lojas; hoje não existe fluxo
  que retire uma confirmação.
- A exceção por e-mail para o lojista de homologação deixa de existir: sem obrigatoriedade, ela só daria selo a quem
  não tem CNPJ.
