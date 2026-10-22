# Login com Google e GitHub

O login social é opcional. Ative `oauth-google`, `oauth-github` ou ambos em
`SPRING_PROFILES_ACTIVE` e configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` conforme os perfis ativados.

Cadastre os callbacks no console de cada provedor:

- Google: `http://localhost:8081/login/oauth2/code/google`
- GitHub: `http://localhost:8081/login/oauth2/code/github`

Em produção, use a URL HTTPS pública do auth-service. O início do fluxo é
`GET /oauth2/authorization/google` ou `GET /oauth2/authorization/github`.
Configure `AUTH_OAUTH2_FRONTEND_CALLBACK` com a URL fixa da página do frontend
que receberá o parâmetro `code` (padrão local:
`http://localhost:5173/auth/callback`). Essa página deve enviar o código em
`POST /api/auth/oauth2/exchange` com `{"code":"..."}`; a resposta contém os
mesmos tokens de `/api/auth/login`. O código expira em 60 segundos, é de uso
único e o banco guarda apenas seu hash. O frontend deve evitar registrar a URL
do callback em ferramentas de analytics ou logs e trocar o código imediatamente.

O serviço exige e-mail verificado. Contas locais existentes não são vinculadas
automaticamente à identidade social, pois o e-mail por si só não comprova que
o usuário autorizou a vinculação. A migration V3 cria um índice único para
`LOWER(email)`; se houver e-mails duplicados por diferenças de caixa no banco
atual, resolva essa inconsistência antes de aplicar a migration.

O estado temporário da autorização OAuth é armazenado em sessões JDBC no
PostgreSQL para funcionar entre instâncias. A sessão é invalidada após o
callback; refresh tokens continuam independentes das sessões HTTP.
