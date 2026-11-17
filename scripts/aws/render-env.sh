#!/usr/bin/env bash
# Renders the Compose env file on the EC2 from AWS Secrets Manager, without printing any value.
#
#   scripts/aws/render-env.sh [output-file]      (default: .env.aws)
#
# The secret (SECRET_ID, default "syndetis/homologation") is one JSON object. See
# docs/deployment/deploy-aws-cloudflare.md for every key; missing keys are reported by name only.
set -euo pipefail

SECRET_ID="${SECRET_ID:-syndetis/homologation}"
OUT="${1:-.env.aws}"

if [ -z "${AWS_REGION:-}" ]; then
  token=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
  AWS_REGION=$(curl -sf -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)
  export AWS_REGION
fi

json=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text)

required=(
  PUBLIC_ORIGIN EDGE_HOST EDGE_SECRET
  PAYMENTS_INTERNAL_TOKEN MP_ACCESS_TOKEN MP_WEBHOOK_SECRET
  HOMOLOGATION_SELLER_EMAIL HOMOLOGATION_SELLER_PASSWORD
  TAX_ID_INTERNAL_TOKEN DOCUMENT_HASH_KEY PAYMENT_TOKEN_KEY
)
optional=(
  AUTH_DATABASE_URL CORE_DATABASE_URL POSTGRES_HOST POSTGRES_USER POSTGRES_PASSWORD
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET
  ASAAS_API_KEY ASAAS_WEBHOOK_TOKEN BILLING_INTERNAL_TOKEN BILLING_ENABLED
  MP_CLIENT_ID MP_CLIENT_SECRET
  SERPRO_CPF_URL SERPRO_ACCESS_TOKEN SERPRO_CONSUMER_KEY SERPRO_CONSUMER_SECRET
)

value() { jq -r --arg key "$1" '.[$key] // empty' <<<"$json"; }

# The database is either Neon (one DATABASE_URL per service) or RDS (host, user and password).
if [ -n "$(value AUTH_DATABASE_URL)" ] || [ -n "$(value CORE_DATABASE_URL)" ]; then
  required+=(AUTH_DATABASE_URL CORE_DATABASE_URL)
  database=neon
else
  required+=(POSTGRES_HOST POSTGRES_USER POSTGRES_PASSWORD)
  database=rds
fi

missing=()
for key in "${required[@]}"; do
  [ -n "$(value "$key")" ] || missing+=("$key")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Faltam chaves no segredo $SECRET_ID: ${missing[*]}" >&2
  exit 1
fi

# Values are written single-quoted (Compose reads them literally), so a quote or a line break
# inside a value would corrupt the file: refuse instead of guessing.
line() {
  local key="$1" val="$2"
  case "$val" in
    *"'"* | *$'\n'* | *$'\r'*) echo "O valor de $key contém aspas simples ou quebra de linha." >&2; exit 1 ;;
  esac
  printf "%s='%s'\n" "$key" "$val"
}

if [ "$database" = neon ]; then
  for key in AUTH_DATABASE_URL CORE_DATABASE_URL; do
    case "$(value "$key")" in
      postgresql://* | postgres://*) ;;
      *) echo "$key deve começar com postgresql://" >&2; exit 1 ;;
    esac
  done
fi

public_origin=$(value PUBLIC_ORIGIN)
case "$public_origin" in
  https://*) ;;
  *) echo "PUBLIC_ORIGIN deve começar com https://" >&2; exit 1 ;;
esac

tmp=$(mktemp "${OUT}.XXXXXX")
trap 'rm -f "$tmp"' EXIT
chmod 600 "$tmp"
{
  echo "# Gerado por scripts/aws/render-env.sh a partir de $SECRET_ID. Não edite nem versione."
  line COMPOSE_PROJECT_NAME syndetis
  line AUTH_SPRING_PROFILES_ACTIVE homologation
  line PAYMENTS_ENABLED true
  line MP_SANDBOX true
  line JWT_ISSUER "$public_origin"
  line HOMOLOGATION_HOST "$(value EDGE_HOST)"
  line SYNDETIS_DATABASE "$database"
  # compose.homologation.yml interpolates the local postgres service even when Neon is used.
  [ "$database" = neon ] && [ -z "$(value POSTGRES_PASSWORD)" ] && line POSTGRES_PASSWORD "unused-with-neon"
  declare -A written=()
  for key in "${required[@]}" "${optional[@]}"; do
    [ -n "${written[$key]:-}" ] && continue
    written[$key]=1
    val=$(value "$key")
    [ -n "$val" ] && line "$key" "$val"
  done
} >"$tmp"
mv "$tmp" "$OUT"
trap - EXIT
echo "Arquivo $OUT gerado com ${#required[@]} chaves obrigatórias."
