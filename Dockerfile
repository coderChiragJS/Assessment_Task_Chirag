# Smart Ops API + bundled DynamoDB Local, in a single Railway-friendly image.
# The Express app talks to DynamoDB Local over localhost; data is persisted to
# a Railway Volume mounted at $DYNAMO_DATA_DIR (default /data).
FROM node:20-bookworm-slim

# Java runtime (DynamoDB Local is a Java app) + curl to download it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-jre-headless curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Fetch DynamoDB Local (the same engine you run locally) into /opt/dynamodb.
RUN mkdir -p /opt/dynamodb \
  && curl -sSL https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz \
     | tar -xz -C /opt/dynamodb

WORKDIR /app

# Install production dependencies only (lockfile-based, reproducible).
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app (node_modules excluded via .dockerignore).
COPY . .
RUN chmod +x ./start.sh

# Defaults so the bundled DynamoDB "just works". Override the JWT secrets
# (and anything else) in Railway -> Variables.
ENV NODE_ENV=production \
    DYNAMODB_ENDPOINT=http://127.0.0.1:8000 \
    AWS_REGION=us-east-1 \
    AWS_ACCESS_KEY_ID=local \
    AWS_SECRET_ACCESS_KEY=local \
    TABLE_PREFIX=SmartOps_ \
    DYNAMO_DATA_DIR=/data

# Documentation only; Railway routes to the $PORT it injects at runtime.
EXPOSE 4000

CMD ["./start.sh"]
