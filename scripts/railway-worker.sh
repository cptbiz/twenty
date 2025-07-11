#!/bin/sh

# Set default values if environment variables are not provided
export PG_DATABASE_URL=${DATABASE_URL:-postgres://${PGUSER:-postgres}:${PGPASSWORD:-postgres}@${PGHOST:-localhost}:${PGPORT:-5432}/${PGDATABASE:-postgres}}
export REDIS_URL=${REDIS_URL:-redis://redis:6379}
export SERVER_URL=${RAILWAY_STATIC_URL:-http://localhost:3000}
export FRONT_BASE_URL=${RAILWAY_STATIC_URL:-http://localhost:3000}

# Disable database migrations and cron jobs for worker (they run on the main server)
export DISABLE_DB_MIGRATIONS=true
export DISABLE_CRON_JOBS_REGISTRATION=true

echo "Starting Twenty worker..."
node dist/src/queue-worker/queue-worker