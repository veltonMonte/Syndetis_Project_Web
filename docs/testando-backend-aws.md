# Testando o backend na AWS (EC2)

Guia para testar o `auth-service` que está rodando na instância EC2 de testes.

> **Ambiente de testes.** Não use senhas reais nem dados pessoais verdadeiros.

## 1. Visão geral

| Item | Valor |
|---|---|
| Instância | `Syndetis_Host` (EC2 `t3.small`, Ubuntu 24.04, região `us-east-2` — Ohio) |
| Serviço exposto | `auth-service` na porta **8081** |
| Banco | PostgreSQL 16 + Redis 7 via `docker compose` (não expostos para a internet) |
| URL base | `http://<IP_PUBLICO>:8081` |

### Onde achar o `<IP_PUBLICO>`

AWS Console → **EC2** → **Instâncias** → `Syndetis_Host` → campo **Endereço IPv4 público**.

> ⚠️ A instância **não tem Elastic IP**: o IP público **muda toda vez que ela é parada e iniciada**. Sempre confira o IP atual antes de testar.

## 2. Endpoints disponíveis

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/register` | Pública | Cadastra um usuário |
| `POST` | `/api/auth/login` | Pública | Retorna um JWT |

### Valores aceitos em `role`

O cadastro público cria usuários com `CUSTOMER`. Atribuição de `SELLER` e `ADMIN` exige um fluxo administrativo separado.

## 3. Testando pelo Insomnia / Postman

### 3.1 Cadastro

- **Método:** `POST`
- **URL:** `http://<IP_PUBLICO>:8081/api/auth/register`
- **Header:** `Content-Type: application/json`
- **Body:**

```json
{
  "firstName": "Teste",
  "email": "teste@exemplo.com",
  "password": "SenhaDeTeste123"
}
```

**Resposta esperada — `200 OK`:**

```json
{
  "id": "15ad53b4-05ba-4ab6-9ae3-cfaeca89b27c",
  "firstName": "Teste",
  "email": "teste@exemplo.com",
  "role": "CUSTOMER"
}
```

### 3.2 Login

- **Método:** `POST`
- **URL:** `http://<IP_PUBLICO>:8081/api/auth/login`
- **Header:** `Content-Type: application/json`
- **Body:**

```json
{
  "email": "teste@exemplo.com",
  "password": "SenhaDeTeste123"
}
```

**Resposta esperada — `200 OK`:**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

O `accessToken` contém as claims `sub` (id do usuário), `email` e `role`. Inspecione tokens de teste localmente; não envie tokens reais para sites externos.

## 4. Testando pelo terminal

### PowerShell (Windows)

```powershell
$base = "http://<IP_PUBLICO>:8081"

# Cadastro
Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post `
  -ContentType "application/json" `
  -Body '{"firstName":"Teste","email":"teste@exemplo.com","password":"SenhaDeTeste123"}'

# Login
Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"teste@exemplo.com","password":"SenhaDeTeste123"}'
```

### curl (Linux / macOS / Git Bash)

```bash
BASE=http://<IP_PUBLICO>:8081

curl -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Teste","email":"teste@exemplo.com","password":"SenhaDeTeste123"}'

curl -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"SenhaDeTeste123"}'
```

## 5. Cenários de erro (comportamento atual)

| Cenário | Status | Mensagem |
|---|---|---|
| Campo obrigatório vazio ou e-mail inválido | `400` | `errors` com o campo e o motivo |
| E-mail já cadastrado | `401` | `Email já existente` |
| E-mail ou senha incorretos no login | `401` | `Credenciais inválidas` |
> O caso de e-mail duplicado deveria retornar `409`. Isso é uma pendência conhecida do `auth-service`.

## 6. Core service no ambiente de testes

O `core-service` usa o banco `syndetis_core` e escuta na porta 8082. O Compose publica essa porta apenas em `127.0.0.1`, para que o serviço seja acessado via túnel SSH ou pelo futuro API Gateway. Não abra 8082, PostgreSQL ou Redis para `0.0.0.0/0` no Security Group.

Para verificar a saúde na instância, use `curl http://127.0.0.1:8082/actuator/health`. Os endpoints privados exigem tokens RS256 emitidos pelo auth-service com JWKS público; a branch de chave RSA persistente precisa estar integrada antes do teste ponta a ponta.

## 7. Diagnóstico rápido

### "Impossível conectar-se ao servidor remoto" / timeout

1. **IP mudou?** Confira o IP atual no console (seção 1).
2. **A instância está ligada?** Estado deve ser `Executando`.
3. **Porta liberada?** No Security Group **`launch-wizard-1`** (o que está associado à instância), deve existir a regra de entrada `TCP 8081` com origem `0.0.0.0/0`.
4. **Teste de porta pelo Windows:**

   ```powershell
   Test-NetConnection -ComputerName <IP_PUBLICO> -Port 8081
   ```

   `TcpTestSucceeded : True` = a porta está acessível.

### Checar o serviço dentro da EC2

Conecte pelo console: **EC2** → `Syndetis_Host` → **Conectar** → **EC2 Instance Connect**.

```bash
# Banco e Redis estão de pé?
cd ~/Syndetis_Project_Web
sudo docker compose ps

# O auth-service está escutando na 8081?
sudo ss -ltnp | grep 8081

# Logs do auth-service
tail -f ~/Syndetis_Project_Web/services/auth-service/spring.log
```

## 8. Subir / reiniciar o ambiente

Necessário depois de **parar e iniciar** a instância (o `auth-service` não sobe sozinho).

```bash
cd ~/Syndetis_Project_Web
git pull
sudo docker compose up -d

cd services/auth-service
pkill -f NuVox || true          # encerra instância anterior, se houver
nohup ./mvnw spring-boot:run > spring.log 2>&1 &

# Aguarde ~20s e confirme:
grep "Started NuVoxApplicationKt" spring.log
```

> Rodar o comando `nohup` duas vezes gera o erro `Port 8081 was already in use` no log — significa que já existe uma instância rodando.

## 9. Custos

- A instância é paga por segundo enquanto estiver **Executando** (~US$ 0,02/h na `t3.small`), usando os créditos da conta.
- Ao terminar os testes do dia: **Estado da instância → Parar instância**.
- Parada, cobra apenas o disco (EBS), alguns centavos por mês.
