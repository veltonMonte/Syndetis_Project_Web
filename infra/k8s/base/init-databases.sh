#!/bin/sh
set -eu
for database in syndetis_auth syndetis_core; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
SELECT 'CREATE DATABASE $database'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
SQL
done
