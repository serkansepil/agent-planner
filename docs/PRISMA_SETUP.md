# Prisma ORM Setup Guide

This document provides comprehensive information about the Prisma ORM setup for the Agent Planner application.

## Table of Contents

- [Database Schema](#database-schema)
- [Models Overview](#models-overview)
- [Relationships](#relationships)
- [Setup Instructions](#setup-instructions)
- [Migration Commands](#migration-commands)
- [Seeding Data](#seeding-data)
- [Vector Embeddings](#vector-embeddings)
- [Best Practices](#best-practices)

## Database Schema

The application uses PostgreSQL with the following extensions:
- **pgvector**: For storing and querying vector embeddings

### Key Features

- UUID primary keys for all models
- Automatic timestamps (createdAt, updatedAt)
- JSONB fields for flexible config and metadata
- Comprehensive indexes for performance
- Proper cascading deletes and relationships
- Vector embeddings support for AI/ML features

## Models Overview

### User
User accounts with authentication and role-based access control.

**Fields:**
- `id` - UUID primary key
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `name` - User's full name
- `avatar` - Profile picture URL
- `role` - USER | ADMIN | SUPER_ADMIN
- `metadata` - JSONB for additional user data
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** email, role, createdAt

### Agent
AI agents that can be configured for specific tasks.

**Fields:**
- `id` - UUID primary key
- `name` - Agent name
- `description` - Agent description
- `systemPrompt` - System prompt for AI
- `avatar` - Agent avatar URL
- `config` - JSONB for agent configuration (temperature, model, etc.)
- `metadata` - JSONB for additional agent data
- `isActive` - Boolean flag
- `ownerId` - Foreign key to User
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** ownerId, isActive, createdAt

### Workspace
Workspaces for organizing agents and sessions.

**Fields:**
- `id` - UUID primary key
- `name` - Workspace name
- `description` - Workspace description
- `avatar` - Workspace avatar URL
- `config` - JSONB for workspace configuration
- `metadata` - JSONB for additional workspace data
- `isActive` - Boolean flag
- `ownerId` - Foreign key to User
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** ownerId, isActive, createdAt

### WorkspaceAgent
Join table linking agents to workspaces with role configuration.

**Fields:**
- `id` - UUID primary key
- `workspaceId` - Foreign key to Workspace
- `agentId` - Foreign key to Agent
- `role` - Agent role in workspace (primary, member, assistant)
- `config` - JSONB for agent-workspace specific configuration
- `isActive` - Boolean flag
- `order` - Integer for agent ordering
- `createdAt`, `updatedAt` - Timestamps

**Unique Constraint:** workspaceId + agentId
**Indexes:** workspaceId, agentId, isActive

### Session
Conversation sessions within workspaces.

**Fields:**
- `id` - UUID primary key
- `workspaceId` - Foreign key to Workspace
- `userId` - Foreign key to User
- `title` - Optional session title
- `status` - ACTIVE | COMPLETED | FAILED | PAUSED
- `metadata` - JSONB for session data
- `startedAt` - Session start time
- `endedAt` - Optional session end time
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** workspaceId, userId, status, createdAt, startedAt

### Message
Individual messages within sessions.

**Fields:**
- `id` - UUID primary key
- `sessionId` - Foreign key to Session
- `agentId` - Optional foreign key to Agent
- `content` - Message content (TEXT)
- `role` - USER | ASSISTANT | SYSTEM | TOOL
- `metadata` - JSONB for message metadata
- `tokens` - Optional token count
- `createdAt` - Timestamp

**Indexes:** sessionId, agentId, role, createdAt

### Integration
External service integrations.

**Fields:**
- `id` - UUID primary key
- `name` - Integration name
- `description` - Integration description
- `type` - API | DATABASE | WEBHOOK | OAUTH | CUSTOM
- `status` - ACTIVE | INACTIVE | ERROR
- `config` - JSONB for integration configuration
- `credentials` - JSONB for encrypted credentials
- `metadata` - JSONB for additional data
- `workspaceId` - Optional foreign key to Workspace
- `userId` - Foreign key to User
- `lastSyncAt` - Last synchronization timestamp
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** workspaceId, userId, type, status, createdAt

### KnowledgeDocument
Documents for knowledge base and RAG (Retrieval Augmented Generation).

**Fields:**
- `id` - UUID primary key
- `title` - Document title
- `content` - Document content (TEXT)
- `summary` - Optional summary
- `source` - Document source
- `sourceUrl` - Optional source URL
- `mimeType` - Document MIME type
- `fileSize` - File size in bytes
- `embedding` - Vector(1536) for embeddings
- `status` - PENDING | PROCESSING | COMPLETED | FAILED
- `metadata` - JSONB for document metadata
- `workspaceId` - Optional foreign key to Workspace
- `agentId` - Optional foreign key to Agent
- `userId` - Foreign key to User
- `tags` - Array of tags
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** workspaceId, agentId, userId, status, tags, createdAt

## Relationships

```
User
├── agents (one-to-many)
├── workspaces (one-to-many)
├── sessions (one-to-many)
├── integrations (one-to-many)
└── knowledgeDocuments (one-to-many)

Agent
├── owner (many-to-one to User)
├── workspaceAgents (one-to-many)
├── messages (one-to-many)
└── knowledgeDocuments (one-to-many)

Workspace
├── owner (many-to-one to User)
├── workspaceAgents (one-to-many)
├── sessions (one-to-many)
├── integrations (one-to-many)
└── knowledgeDocuments (one-to-many)

WorkspaceAgent
├── workspace (many-to-one to Workspace)
└── agent (many-to-one to Agent)

Session
├── workspace (many-to-one to Workspace)
├── user (many-to-one to User)
└── messages (one-to-many)

Message
├── session (many-to-one to Session)
└── agent (many-to-one to Agent, optional)

Integration
├── workspace (many-to-one to Workspace, optional)
└── user (many-to-one to User)

KnowledgeDocument
├── workspace (many-to-one to Workspace, optional)
├── agent (many-to-one to Agent, optional)
└── user (many-to-one to User)
```

## Setup Instructions

### Prerequisites

1. PostgreSQL 14+ installed or running via Docker
2. Node.js 18+ installed
3. pgvector extension available (included in Docker setup)

### Initial Setup

```bash
# 1. Start Docker services (PostgreSQL with pgvector + Redis)
npm run docker:up

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations to create database schema
npm run prisma:migrate

# 4. Seed the database with sample data
npm run prisma:seed

# 5. (Optional) Open Prisma Studio to view/edit data
npm run prisma:studio
```

### Environment Variables

Ensure your `.env` file contains:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agent_planner?schema=public"
```

## Migration Commands

### Development

```bash
# Generate Prisma Client after schema changes
npm run prisma:generate

# Create and apply a new migration
npm run prisma:migrate

# Create migration file without applying (useful for review)
npm run prisma:migrate:create

# Check migration status
npm run prisma:migrate:status

# Reset database (WARNING: deletes all data)
npm run prisma:migrate:reset

# Format schema file
npm run prisma:format

# Validate schema file
npm run prisma:validate
```

### Production

```bash
# Deploy pending migrations (for production)
npm run prisma:migrate:deploy
```

### Database Synchronization

```bash
# Pull schema from existing database
npm run prisma:pull

# Push schema changes without creating migrations (development only)
npm run prisma:push
```

## Seeding Data

The seed file (`prisma/seed.ts`) creates comprehensive test data:

- **2 Users**: Admin and regular user
- **3 Agents**: Customer Support, Technical Documentation, Data Analysis
- **3 Workspaces**: Customer Support, Development, Analytics
- **4 Workspace-Agent Links**: Various agent assignments
- **3 Sessions**: With different statuses and metadata
- **7 Messages**: Realistic conversation examples
- **3 Integrations**: Slack, PostgreSQL, GitHub
- **4 Knowledge Documents**: Various guides and documentation

**Login Credentials:**
- Admin: `admin@example.com` / `password123`
- User: `demo@example.com` / `password123`

Run seed:
```bash
npm run prisma:seed
```

## Vector Embeddings

The `KnowledgeDocument` model includes a `vector(1536)` field for storing embeddings compatible with OpenAI's text-embedding-ada-002 model.

### Using Embeddings

```typescript
// Example: Store embedding
await prisma.knowledgeDocument.create({
  data: {
    title: 'My Document',
    content: 'Document content...',
    embedding: embedding, // Float array of length 1536
    // ... other fields
  },
});

// Example: Similarity search (raw SQL)
const results = await prisma.$queryRaw`
  SELECT id, title, 1 - (embedding <=> ${embedding}::vector) as similarity
  FROM knowledge_documents
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> ${embedding}::vector
  LIMIT 10
`;
```

### Vector Extension

The pgvector extension is automatically enabled via the initial migration. It provides:
- Vector data type
- Distance operators (<->, <#>, <=>)
- Index support for fast similarity search

## Best Practices

### 1. Always Use Transactions for Complex Operations

```typescript
await prisma.$transaction(async (tx) => {
  const workspace = await tx.workspace.create({...});
  await tx.workspaceAgent.create({...});
});
```

### 2. Use Select to Optimize Queries

```typescript
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    // Exclude password
  },
});
```

### 3. Use Include for Related Data

```typescript
const session = await prisma.session.findUnique({
  where: { id },
  include: {
    workspace: true,
    messages: {
      orderBy: { createdAt: 'asc' },
      include: { agent: true },
    },
  },
});
```

### 4. Always Add Indexes for Foreign Keys and Frequently Queried Fields

All models in this schema include appropriate indexes for:
- Foreign keys
- Frequently filtered fields (status, role, etc.)
- Timestamp fields for ordering

### 5. Use Enums for Fixed Value Sets

Enums are type-safe and prevent invalid values:
- UserRole
- SessionStatus
- MessageRole
- IntegrationType
- IntegrationStatus
- DocumentStatus

### 6. Leverage JSONB for Flexible Data

Use `config` and `metadata` fields for:
- Feature flags
- Dynamic configuration
- Custom attributes
- Non-relational data

### 7. Handle Cascading Deletes Carefully

Review cascade rules in schema:
- `onDelete: Cascade` - Automatically delete related records
- `onDelete: Restrict` - Prevent deletion if related records exist
- `onDelete: SetNull` - Set foreign key to null

## Troubleshooting

### Migration Conflicts

```bash
# Reset and start fresh (development only)
npm run prisma:migrate:reset

# Mark migration as applied without running
npx prisma migrate resolve --applied [migration-name]
```

### Out of Sync Schema

```bash
# Pull current database schema
npm run prisma:pull

# Push schema without migrations (dev only)
npm run prisma:push
```

### Client Out of Date

```bash
# Regenerate Prisma Client
npm run prisma:generate
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
