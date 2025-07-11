#!/bin/sh
set -e

# Ensure we have the correct permissions for our files
if [ "$(id -u)" = "1000" ]; then
    echo "Running as user 1000..."
else
    echo "Warning: Running as user $(id -u)"
fi

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."
    
    # Better database URL parsing
    if [ -n "${DATABASE_URL}" ]; then
        export PG_DATABASE_URL=${DATABASE_URL}
    elif [ -n "${PG_DATABASE_URL}" ]; then
        export PG_DATABASE_URL=${PG_DATABASE_URL}
    else
        echo "Warning: No database URL provided"
        return
    fi

    # Parse database URL more safely
    PGUSER=$(echo $PG_DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    PGPASS=$(echo $PG_DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    PGHOST=$(echo $PG_DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    PGPORT=$(echo $PG_DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    PGDATABASE=$(echo $PG_DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    # Check if database exists
    if command -v psql >/dev/null 2>&1; then
        # Creating the database if it doesn't exist
        db_count=$(PGPASSWORD=${PGPASS} psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d postgres -tAc "SELECT COUNT(*) FROM pg_database WHERE datname = '${PGDATABASE}'" 2>/dev/null || echo "0")
        if [ "$db_count" = "0" ]; then
            echo "Database ${PGDATABASE} does not exist, creating..."
            PGPASSWORD=${PGPASS} psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d postgres -c "CREATE DATABASE \"${PGDATABASE}\""

            # Run setup and migration scripts
            NODE_OPTIONS="--max-old-space-size=1500" tsx ./scripts/setup-db.ts
            yarn database:migrate:prod
        fi
    else
        echo "psql not available, skipping database creation check"
    fi
    
    yarn command:prod upgrade
    echo "Successfully migrated DB!"
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi
  
    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
register_background_jobs

# Continue with the original Docker command
exec "$@"