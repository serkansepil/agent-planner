# Agent Planner - Full Stack Application

A complete, production-ready full-stack monorepo application for managing AI agents, workspaces, and conversations with real-time chat capabilities.

## Monorepo Structure

This project is organized as a monorepo with the following structure:

```
agent-planner/
├── frontend/           # Next.js frontend application
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── lib/           # API clients and utilities
│   └── types/         # TypeScript type definitions
├── src/               # NestJS backend application
│   ├── auth/          # Authentication module
│   ├── agents/        # Agents module
│   ├── workspaces/    # Workspaces module
│   ├── chat/          # Real-time chat module
│   └── ...
├── prisma/            # Database schema and migrations
└── docker-compose.yml # Docker services configuration
```

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn

### 1. Backend Setup

Start the Docker containers (PostgreSQL and Redis):

```bash
npm run docker:up
```

Install backend dependencies:

```bash
npm install
```

Set up the database:

```bash
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
```

Start the backend:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api`

### 2. Frontend Setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3001`

## Overview

## Features

### Backend (NestJS)
- **Authentication**: JWT-based authentication with register/login endpoints
- **Complete CRUD APIs**: Agents, Workspaces, Sessions, and Messages
- **Real-time Chat**: WebSocket support with Socket.io for live messaging
- **LLM Streaming**: Token-by-token streaming of AI responses
- **User Management**: Profile management and password change
- **Swagger Documentation**: Interactive API documentation at `/api/docs`
- **Health Check**: Service health monitoring endpoint
- **Database**: Prisma ORM with PostgreSQL
- **Docker**: Compose setup for PostgreSQL and Redis
- **Validation**: Global validation pipes with DTOs
- **Error Handling**: Comprehensive exception filters
- **Security**: Password hashing with bcrypt
- **Pagination**: Support for paginated responses
- **TypeScript**: Full type safety

### Frontend (Next.js)
- **Modern UI**: Built with Next.js 15 App Router and React 18
- **Component Library**: shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS with custom design system
- **Authentication Pages**: Login, Register, and Forgot Password
- **Form Validation**: React Hook Form with Zod schema validation
- **Type Safety**: Full TypeScript support with shared types
- **API Integration**: Axios-based API client with interceptors
- **Toast Notifications**: User-friendly notification system
- **Responsive Design**: Mobile-first responsive layout

## Tech Stack

### Backend
- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma 6
- **Cache**: Redis 7 (via Docker)
- **Authentication**: JWT (Passport)
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI
- **Password Hashing**: bcrypt
- **WebSocket**: Socket.io

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **WebSocket Client**: Socket.io Client
- **Language**: TypeScript

## Application URLs

When running locally:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000

## Database Schema

The application includes the following models:

- **User**: User accounts with authentication
- **Agent**: AI agents with system prompts and configuration
- **Workspace**: Workspaces for organizing agents and sessions
- **WorkspaceAgent**: Many-to-many relationship between workspaces and agents
- **Session**: User sessions within workspaces
- **Message**: Messages exchanged in sessions with threading support
- **MessageReaction**: Emoji reactions on messages
- **MessageAttachment**: File attachments on messages
- **Integration**: External service integrations
- **KnowledgeDocument**: Document storage with vector embeddings

## Detailed Documentation

- **Backend API**: See main README sections below
- **Frontend**: See [frontend/README.md](./frontend/README.md)
- **Database Schema**: See [prisma/schema.prisma](./prisma/schema.prisma)
- **Real-time Chat**: See [src/chat/README.md](./src/chat/README.md)

## API Documentation

The application includes comprehensive Swagger/OpenAPI documentation. Once the application is running, visit `http://localhost:3000/api/docs` to:

- View all available endpoints
- Test API requests directly from the browser
- See request/response schemas
- Authenticate and test protected endpoints

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

### User Profile

- `GET /api/users/profile` - Get current user profile
- `PATCH /api/users/profile` - Update profile
  ```json
  {
    "name": "New Name",
    "email": "newemail@example.com"
  }
  ```
- `PATCH /api/users/password` - Change password
  ```json
  {
    "currentPassword": "oldpass123",
    "newPassword": "newpass456"
  }
  ```
- `DELETE /api/users/account` - Delete account

### Health Check

- `GET /api/health` - Check service health and database connectivity

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
