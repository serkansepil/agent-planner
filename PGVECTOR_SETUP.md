# pgvector Extension Setup

## Problem

The application uses PostgreSQL's `pgvector` extension for vector similarity search (AI embeddings). The migration fails with:

```
ERROR: extension "vector" is not available
```

This happens because the pgvector extension is not installed on your PostgreSQL server.

## Solutions

### Option 1: Using Docker (Recommended)

The `docker-compose.yml` has been updated to use the pgvector image:

```bash
# Stop the current PostgreSQL container
docker compose down postgres

# Remove the old volume (WARNING: This will delete your data)
docker volume rm agent-planner_postgres_data

# Start with the new pgvector image
docker compose up -d postgres

# Wait for PostgreSQL to be ready (about 10 seconds)
sleep 10

# Run migrations
npm run prisma:migrate
```

### Option 2: Manual Installation (Ubuntu/Debian)

If you're using a local PostgreSQL installation:

```bash
# Install pgvector extension
sudo apt-get update
sudo apt-get install -y postgresql-16-pgvector

# Restart PostgreSQL
sudo systemctl restart postgresql

# Run migrations
npm run prisma:migrate
```

### Option 3: Manual Installation (macOS)

```bash
# Install pgvector using Homebrew
brew install pgvector

# Restart PostgreSQL
brew services restart postgresql@16

# Run migrations
npm run prisma:migrate
```

### Option 4: Build from Source

If the package isn't available in your package manager:

```bash
# Clone pgvector repository
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector

# Build and install
make
sudo make install

# Restart PostgreSQL
sudo systemctl restart postgresql  # Linux
# or
brew services restart postgresql@16  # macOS

# Run migrations
cd /path/to/agent-planner
npm run prisma:migrate
```

## Verification

After installation, you can verify the extension is available:

```bash
psql -U postgres -d agent_planner -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

If successful, you should see:
```
CREATE EXTENSION
```

## What Changed

1. **docker-compose.yml**: Updated PostgreSQL image from `postgres:16-alpine` to `pgvector/pgvector:pg16`
2. **prisma/migrations/00000000000000_init/migration.sql**: Already includes `CREATE EXTENSION IF NOT EXISTS vector;`

The extension is required for the `KnowledgeDocument.embedding` field which stores vector embeddings for semantic search.
