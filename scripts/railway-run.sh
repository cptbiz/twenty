#!/bin/sh

# Set default values if environment variables are not provided
export PG_DATABASE_URL=${DATABASE_URL:-postgres://${PGUSER:-postgres}:${PGPASSWORD:-postgres}@${PGHOST:-localhost}:${PGPORT:-5432}/${PGDATABASE:-postgres}}
export REDIS_URL=${REDIS_URL:-redis://redis:6379}
export SERVER_URL=${RAILWAY_STATIC_URL:-http://localhost:3000}
export FRONT_BASE_URL=${RAILWAY_STATIC_URL:-http://localhost:3000}

echo "Initializing database..."
yarn database:init:prod

echo "Starting Twenty server..."
node dist/src/main