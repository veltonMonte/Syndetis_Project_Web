#!/bin/sh
set -eu

key_path="${JWT_RSA_PRIVATE_KEY_PATH:-/app/keys/private.pem}"
if [ -z "${JWT_RSA_PRIVATE_KEY_VALUE:-}" ] && [ ! -s "$key_path" ]; then
    umask 077
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$key_path"
fi

exec java -XX:MaxRAMPercentage=75 -jar /app/app.jar
