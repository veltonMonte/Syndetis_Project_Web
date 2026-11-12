#!/usr/bin/env bash
# Deploys (or updates) Syndetis on the EC2. Run from the repository root as a user in the docker group:
#
#   scripts/aws/deploy.sh [git-ref]        (default: the current checkout)
#
# Renders .env.aws from Secrets Manager, makes sure both databases exist on RDS and starts the stack.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -n "${1:-}" ]; then
  git fetch --tags --force origin
  # A branch name ("dev") must resolve to the remote branch: checking out a bare branch name makes
  # git create a local tracking branch, which cannot be combined with --detach.
  commit=$(git rev-parse --verify --quiet "origin/$1^{commit}" || git rev-parse --verify "$1^{commit}")
  git checkout --detach "$commit"
fi

scripts/aws/render-env.sh .env.aws

set -a
# shellcheck disable=SC1091
. ./.env.aws
set +a

# RDS has no init scripts: create the service databases once (idempotent, TLS required).
# \gexec only works on psql's input stream, not inside -c, so the SQL goes through stdin.
for database in syndetis_auth syndetis_core; do
  echo "SELECT 'CREATE DATABASE $database' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec" |
    docker run --rm -i -e PGPASSWORD="$POSTGRES_PASSWORD" postgres:16-alpine \
      psql "host=$POSTGRES_HOST port=${POSTGRES_PORT:-5432} user=$POSTGRES_USER dbname=postgres sslmode=require" \
      -v ON_ERROR_STOP=1 -q
done

compose=(docker compose --env-file .env.aws -f docker-compose.yml -f compose.homologation.yml -f compose.aws.yml)
"${compose[@]}" config --quiet
"${compose[@]}" up -d --build --remove-orphans
"${compose[@]}" ps
echo "Deploy concluído em $(git rev-parse --short HEAD)."
