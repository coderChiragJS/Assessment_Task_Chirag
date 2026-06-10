#!/usr/bin/env sh
# Boot DynamoDB Local, wait for it, ensure tables + seed data, then start the API.
set -e

DATA_DIR="${DYNAMO_DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"

echo "[start] launching DynamoDB Local (data dir: $DATA_DIR)"
java -Djava.library.path=/opt/dynamodb/DynamoDBLocal_lib \
     -jar /opt/dynamodb/DynamoDBLocal.jar \
     -sharedDb -dbPath "$DATA_DIR" -port 8000 &

echo "[start] waiting for DynamoDB Local on :8000 ..."
i=0
until node -e "fetch('http://127.0.0.1:8000').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "[start] DynamoDB Local did not come up in time"
    exit 1
  fi
  sleep 1
done
echo "[start] DynamoDB Local is up"

echo "[start] ensuring tables exist"
node scripts/createTables.js

echo "[start] seeding demo data (idempotent)"
node scripts/seed.js || echo "[start] seed skipped/failed, continuing"

echo "[start] starting API"
exec node src/server.js
