# Fills the keys only a person can provide in the AWS secret, typed with hidden input.
# Values never appear on screen, in history or in the repository.
#
#   powershell -ExecutionPolicy Bypass -File scripts\aws\set-secret-keys.ps1
#
# Requires the AWS CLI logged in (aws login) with access to the secret.
param(
  [string]$SecretId = 'syndetis/homologation',
  [string]$Region = 'us-east-1'
)
$ErrorActionPreference = 'Stop'

function Read-Hidden([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Assert-Value([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Name não pode ficar vazio." }
  if ($Value.Contains("'") -or $Value.Contains("`n") -or $Value.Contains("`r")) {
    throw "$Name não pode ter aspas simples nem quebra de linha."
  }
}

Write-Host "Preenchendo chaves de $SecretId ($Region). A digitação das senhas e chaves fica oculta." -ForegroundColor Cyan

$raw = aws secretsmanager get-secret-value --secret-id $SecretId --region $Region --query SecretString --output text
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível ler o segredo. Confira o login com: aws login' }
$secret = $raw | ConvertFrom-Json

$email = (Read-Host -Prompt 'E-mail do lojista de teste da Syndetis').Trim()
Assert-Value 'HOMOLOGATION_SELLER_EMAIL' $email
if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { throw 'E-mail inválido.' }

$password = Read-Hidden 'Senha do lojista de teste (12+ caracteres)'
Assert-Value 'HOMOLOGATION_SELLER_PASSWORD' $password
if ($password.Length -lt 12) { throw 'A senha do lojista precisa ter pelo menos 12 caracteres.' }
$confirm = Read-Hidden 'Repita a senha do lojista'
if ($confirm -ne $password) { throw 'As senhas não conferem.' }

$token = (Read-Hidden 'Access Token do vendedor de teste do Mercado Pago (APP_USR-... ou TEST-...)').Trim()
Assert-Value 'MP_ACCESS_TOKEN' $token
if ($token -notmatch '^(APP_USR|TEST)-') { throw 'O Access Token do Mercado Pago começa com APP_USR- ou TEST-.' }

$webhook = (Read-Hidden 'Assinatura secreta do webhook do Mercado Pago').Trim()
Assert-Value 'MP_WEBHOOK_SECRET' $webhook

foreach ($pair in @(
    @('HOMOLOGATION_SELLER_EMAIL', $email),
    @('HOMOLOGATION_SELLER_PASSWORD', $password),
    @('MP_ACCESS_TOKEN', $token),
    @('MP_WEBHOOK_SECRET', $webhook))) {
  $secret | Add-Member -NotePropertyName $pair[0] -NotePropertyValue $pair[1] -Force
}

# UTF-8 without BOM: a BOM would become part of the secret and break the JSON on the server.
$file = Join-Path ([IO.Path]::GetTempPath()) ("syndetis-secret-" + [guid]::NewGuid() + '.json')
try {
  [IO.File]::WriteAllText($file, ($secret | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
  aws secretsmanager put-secret-value --secret-id $SecretId --region $Region --secret-string "file://$file" --query VersionId --output text | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível gravar o segredo.' }
} finally {
  Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
}

Write-Host 'Chaves gravadas no segredo. Pode voltar para o chat.' -ForegroundColor Green
