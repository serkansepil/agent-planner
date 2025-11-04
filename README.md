# Agent Planner - NestJS Application

A complete NestJS application with authentication, database integration, and containerized infrastructure.

## Features

- JWT Authentication (Register/Login)
- Prisma ORM with PostgreSQL
- Docker Compose setup (PostgreSQL + Redis)
- Global validation pipes
- Exception filters
- Environment configuration with validation
- TypeScript

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma 6
- **Cache**: Redis 7 (via Docker)
- **Authentication**: JWT (Passport)
- **Validation**: class-validator, class-transformer
- **Password Hashing**: bcrypt

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn

## Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration (default values should work for local development)

## Database Setup

1. Start the Docker containers (PostgreSQL and Redis):

```bash
npm run docker:up
```

2. Generate Prisma Client:

```bash
npm run prisma:generate
```

3. Run database migrations:

```bash
npm run prisma:migrate
```

4. (Optional) Open Prisma Studio to view/edit data:

```bash
npm run prisma:studio
```

## Database Schema

The application includes the following models:

- **User**: User accounts with authentication
- **Agent**: AI agents with system prompts and configuration
- **Workspace**: Workspaces for organizing agents and sessions
- **Session**: User sessions within workspaces
- **Message**: Messages exchanged in sessions

## Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }
  ```

- `POST /api/auth/login` - Login
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Protected Routes

All endpoints below require JWT authentication. Add the JWT token to the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Agents

- `POST /api/agents` - Create a new agent
  ```json
  {
    "name": "Customer Support Agent",
    "description": "A helpful customer support assistant",
    "systemPrompt": "You are a friendly customer support agent...",
    "config": { "temperature": 0.7 }
  }
  ```

- `GET /api/agents` - Get all agents for the current user
- `GET /api/agents/:id` - Get a specific agent
- `PATCH /api/agents/:id` - Update an agent
- `DELETE /api/agents/:id` - Delete an agent

### Workspaces

- `POST /api/workspaces` - Create a new workspace
  ```json
  {
    "name": "Customer Support Workspace",
    "description": "Main workspace for customer support",
    "hostAgentId": "agent-uuid-here"
  }
  ```

- `GET /api/workspaces` - Get all workspaces for the current user
- `GET /api/workspaces/:id` - Get a specific workspace
- `PATCH /api/workspaces/:id` - Update a workspace
- `DELETE /api/workspaces/:id` - Delete a workspace

### Sessions

- `POST /api/sessions` - Create a new session
  ```json
  {
    "workspaceId": "workspace-uuid-here"
  }
  ```

- `GET /api/sessions?workspaceId=uuid` - Get all sessions (optionally filter by workspace)
- `GET /api/sessions/:id` - Get a specific session with messages
- `PATCH /api/sessions/:id` - Update session status
  ```json
  {
    "status": "COMPLETED"
  }
  ```
- `DELETE /api/sessions/:id` - Delete a session

### Messages

- `POST /api/messages` - Create a new message
  ```json
  {
    "sessionId": "session-uuid-here",
    "content": "Hello, I need help!",
    "role": "USER"
  }
  ```

- `GET /api/messages?sessionId=uuid` - Get all messages for a session
- `GET /api/messages/:id` - Get a specific message
- `DELETE /api/messages/:id` - Delete a message

## Available Scripts

### Development
- `npm run start` - Start the application
- `npm run start:dev` - Start with hot reload
- `npm run start:debug` - Start in debug mode

### Build
- `npm run build` - Build for production

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Generate coverage report
- `npm run test:e2e` - Run end-to-end tests

### Database (Prisma)
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Create and run migrations (dev)
- `npm run prisma:migrate:prod` - Deploy migrations (production)
- `npm run prisma:studio` - Open Prisma Studio

### Docker
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run docker:restart` - Restart Docker containers

### Code Quality
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                # Data transfer objects
│   ├── guards/             # Auth guards
│   ├── strategies/         # Passport strategies
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.service.ts     # Auth business logic
│   └── auth.module.ts      # Auth module definition
├── common/                  # Shared utilities
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   └── pipes/              # Validation pipes
├── config/                  # Configuration
│   ├── env.validation.ts   # Environment validation
│   └── config.module.ts    # Config module
├── database/                # Database module
│   ├── prisma.service.ts   # Prisma service
│   └── prisma.module.ts    # Prisma module
├── app.module.ts           # Root module
└── main.ts                 # Application entry point

prisma/
└── schema.prisma           # Database schema

docker-compose.yml          # Docker services configuration
```

## Environment Variables

See `.env.example` for all available environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration time
- `PORT` - Application port
- `NODE_ENV` - Environment (development/production)

## Docker Services

The `docker-compose.yml` includes:

- **PostgreSQL 16**: Database server on port 5432
- **Redis 7**: Cache server on port 6379

Both services include health checks and persistent volumes.

## License

UNLICENSED
