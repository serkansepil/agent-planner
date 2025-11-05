# NestJS Module Structure Guide

This document describes the module architecture and organization of the Agent Planner application.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Hierarchy](#module-hierarchy)
- [Common Module](#common-module)
- [Core Modules](#core-modules)
- [Feature Modules](#feature-modules)
- [Module Organization Best Practices](#module-organization-best-practices)

## Architecture Overview

The application follows a modular architecture with three main layers:

1. **Core Modules**: Essential infrastructure (Common, Config, Database)
2. **Feature Modules**: Business logic and domain features
3. **Shared Resources**: Global utilities, decorators, guards, etc.

### Module Import Order

```typescript
@Module({
  imports: [
    // Core modules (order matters)
    CommonModule,      // Must be first (provides global filters, pipes, interceptors)
    ConfigModule,      // Configuration management
    PrismaModule,      // Database access

    // Feature modules
    AuthModule,
    UsersModule,
    AgentsModule,
    WorkspacesModule,
    SessionsModule,
    MessagesModule,
    HealthModule,
  ],
})
export class AppModule {}
```

## Module Hierarchy

```
AppModule (Root)
├── CommonModule (@Global)
│   ├── Global Filters
│   ├── Global Interceptors
│   ├── Global Pipes
│   └── ThrottlerModule
├── ConfigModule (@Global)
│   └── Environment Configuration
├── PrismaModule (@Global)
│   └── Database Service
├── AuthModule
│   ├── JWT Strategy
│   ├── Auth Guards
│   └── Auth Service
├── UsersModule
├── AgentsModule
├── WorkspacesModule
├── SessionsModule
├── MessagesModule
└── HealthModule
```

## Common Module

**Location**: `src/common/`

The Common module is a **global module** that provides shared utilities, decorators, filters, guards, interceptors, and pipes across the entire application.

### Directory Structure

```
src/common/
├── common.module.ts       # Module definition with global providers
├── index.ts              # Barrel export
├── decorators/           # Custom parameter decorators
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   ├── api-paginated-response.decorator.ts
│   ├── user-agent.decorator.ts
│   ├── ip-address.decorator.ts
│   └── index.ts
├── dto/                  # Shared DTOs
│   └── pagination.dto.ts
├── filters/              # Exception filters
│   ├── http-exception.filter.ts
│   ├── prisma-exception.filter.ts
│   ├── validation-exception.filter.ts
│   ├── query-failed.filter.ts
│   └── index.ts
├── guards/               # Custom guards
│   ├── roles.guard.ts
│   ├── throttle.guard.ts
│   └── index.ts
├── interceptors/         # Request/Response interceptors
│   ├── logging.interceptor.ts
│   ├── transform.interceptor.ts
│   ├── timeout.interceptor.ts
│   └── index.ts
├── pipes/                # Validation and transformation pipes
│   ├── validation.pipe.ts
│   ├── parse-uuid.pipe.ts
│   └── index.ts
├── utils/                # Utility functions
│   ├── logger.util.ts
│   ├── date.util.ts
│   ├── hash.util.ts
│   └── index.ts
└── constants/            # Application constants
    └── index.ts
```

### Global Providers

The Common module registers the following global providers:

**Exception Filters** (APP_FILTER):
- `AllExceptionsFilter` - Catches all exceptions
- `PrismaExceptionFilter` - Handles Prisma database errors
- `ValidationExceptionFilter` - Formats validation errors

**Interceptors** (APP_INTERCEPTOR):
- `LoggingInterceptor` - Logs all requests and responses
- `TimeoutInterceptor` - Enforces request timeouts (default 30s)

**Pipes** (APP_PIPE):
- `ValidationPipe` - Validates and transforms DTOs

### Rate Limiting

ThrottlerModule is configured for rate limiting:
- 100 requests per minute per user/IP
- Uses user ID if authenticated, otherwise IP address

### Decorators

#### @CurrentUser()
Extract the authenticated user from the request.

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

#### @Public()
Mark an endpoint as publicly accessible (bypass JWT guard).

```typescript
@Public()
@Get('public-data')
getPublicData() {
  return { data: 'public' };
}
```

#### @Roles(...roles)
Restrict endpoint access to specific roles.

```typescript
@Roles('ADMIN', 'SUPER_ADMIN')
@Get('admin-only')
getAdminData() {
  return { data: 'admin' };
}
```

#### @ApiPaginatedResponse(Model)
Swagger decorator for paginated responses.

```typescript
@ApiPaginatedResponse(UserDto)
@Get('users')
getUsers(@Query() pagination: PaginationDto) {
  return this.usersService.findAll(pagination);
}
```

#### @UserAgent()
Extract user agent from request headers.

```typescript
@Get('check')
check(@UserAgent() userAgent: string) {
  return { userAgent };
}
```

#### @IpAddress()
Extract IP address from request.

```typescript
@Get('check')
check(@IpAddress() ip: string) {
  return { ip };
}
```

### Exception Filters

#### AllExceptionsFilter
Catches all unhandled exceptions and returns a standardized error response.

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "errors": null,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users"
}
```

#### PrismaExceptionFilter
Handles Prisma-specific errors:
- P2002: Unique constraint violation → 409 Conflict
- P2025: Record not found → 404 Not Found
- P2003: Foreign key violation → 400 Bad Request

#### ValidationExceptionFilter
Formats class-validator validation errors:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/register"
}
```

### Interceptors

#### LoggingInterceptor
Logs all incoming requests and outgoing responses with:
- Request ID generation
- Method, URL, IP, User-Agent
- Request body (with sensitive data redaction)
- Response time
- Status code

**Sensitive fields redacted**: password, token, secret, apiKey, accessToken, refreshToken, credentials

Example log output:
```
[LOG] [1234567890-abc123] Incoming Request: POST /api/auth/login - IP: 127.0.0.1 - User-Agent: Mozilla/5.0
[LOG] [1234567890-abc123] Outgoing Response: POST /api/auth/login 200 - 45ms
```

#### TimeoutInterceptor
Enforces a timeout on all requests (default: 30 seconds).

Throws `RequestTimeoutException` if request exceeds timeout.

#### TransformInterceptor
Wraps all successful responses in a standard format:

```json
{
  "data": { /* actual response data */ },
  "statusCode": 200,
  "message": "Success",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Pipes

#### ValidationPipe
Validates and transforms DTOs using class-validator:
- Automatically strips properties not in DTO (whitelist: true)
- Rejects requests with unknown properties (forbidNonWhitelisted: true)
- Transforms plain objects to class instances
- Enables implicit type conversion

#### ParseUUIDPipe
Validates UUID format for route parameters:

```typescript
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.service.findOne(id);
}
```

### Guards

#### RolesGuard
Enforces role-based access control:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Delete(':id')
deleteUser(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

#### CustomThrottlerGuard
Rate limiting based on user ID (if authenticated) or IP address.

### Utilities

#### Logger
Extended NestJS Logger with additional methods:

```typescript
import { Logger } from './common/utils';

const logger = new Logger('MyService');
logger.info('Information message');
logger.success('✓ Success message');
logger.warn('Warning message');
logger.error('Error message', stackTrace);
logger.debug('Debug message');
logger.verbose('Verbose message');
```

#### Date Utilities
Helper functions for date manipulation:

```typescript
import { addDays, addHours, isPast, startOfDay } from './common/utils';

const tomorrow = addDays(new Date(), 1);
const inTwoHours = addHours(new Date(), 2);
const isExpired = isPast(expiryDate);
const today = startOfDay(new Date());
```

#### Hash Utilities
Cryptographic helper functions:

```typescript
import { hashPassword, comparePassword, generateToken } from './common/utils';

const hash = await hashPassword('password123');
const isValid = await comparePassword('password123', hash);
const token = generateToken(32); // 32-byte hex string
const uuid = generateUUID();
```

### Constants

Application-wide constants:

```typescript
import { APP_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from './common/constants';

const pageSize = APP_CONSTANTS.DEFAULT_PAGE_SIZE; // 10
const timeout = APP_CONSTANTS.DEFAULT_TIMEOUT; // 30000ms

const errorMsg = ERROR_MESSAGES.NOT_FOUND; // 'Resource not found'
const successMsg = SUCCESS_MESSAGES.CREATED; // 'Resource created successfully'
```

## Core Modules

### ConfigModule

**Location**: `src/config/`

Manages environment variables with validation.

```typescript
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
  ],
})
export class ConfigModule {}
```

**Files**:
- `config.module.ts` - Module definition
- `env.validation.ts` - Environment variable validation schema

### PrismaModule

**Location**: `src/database/`

Provides database access via Prisma Client.

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Files**:
- `prisma.module.ts` - Module definition
- `prisma.service.ts` - Prisma Client wrapper with connection lifecycle

## Feature Modules

### AuthModule

**Location**: `src/auth/`

Handles authentication with JWT tokens.

**Features**:
- User registration
- Login with JWT token generation
- JWT strategy for Passport
- JWT authentication guard

### UsersModule

**Location**: `src/users/`

User profile and account management.

**Features**:
- Get user profile
- Update profile
- Change password
- Delete account

### AgentsModule

**Location**: `src/agents/`

AI agent management.

**Features**:
- CRUD operations for agents
- Agent configuration
- Owner-based authorization

### WorkspacesModule

**Location**: `src/workspaces/`

Workspace management.

**Features**:
- CRUD operations for workspaces
- Workspace-agent associations
- Session management within workspaces

### SessionsModule

**Location**: `src/sessions/`

Conversation session management.

**Features**:
- Create and manage sessions
- Session status tracking
- Message association

### MessagesModule

**Location**: `src/messages/`

Message management within sessions.

**Features**:
- Create messages
- Query messages by session
- Role-based messaging (USER, ASSISTANT, SYSTEM, TOOL)

### HealthModule

**Location**: `src/health/`

Application health checks.

**Features**:
- Service health status
- Database connectivity check
- Uptime information

## Module Organization Best Practices

### 1. Module Structure

Each feature module should follow this structure:

```
module-name/
├── module-name.module.ts     # Module definition
├── module-name.controller.ts # REST endpoints
├── module-name.service.ts    # Business logic
├── dto/                      # Data Transfer Objects
│   ├── create-entity.dto.ts
│   ├── update-entity.dto.ts
│   └── index.ts
├── entities/                 # TypeScript interfaces/types (optional)
│   └── entity.interface.ts
└── guards/                   # Module-specific guards (optional)
    └── custom.guard.ts
```

### 2. Import Order

```typescript
// Third-party imports
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Local imports - services first
import { MyService } from './my.service';
import { MyController } from './my.controller';

// DTOs and entities
import { CreateDto, UpdateDto } from './dto';
```

### 3. Module Decorators

```typescript
@Module({
  imports: [
    // External modules
    JwtModule.register({...}),

    // Internal modules
    UsersModule,
  ],
  controllers: [MyController],
  providers: [MyService],
  exports: [MyService], // Export if used by other modules
})
export class MyModule {}
```

### 4. Global vs Local Modules

**Use @Global() decorator when**:
- Module provides infrastructure (Common, Config, Database)
- Services are used across many modules
- Avoid circular dependencies

**Don't use @Global() for**:
- Feature modules
- Domain-specific services
- Business logic

### 5. Dependency Injection

Always inject dependencies through constructor:

```typescript
@Injectable()
export class MyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
}
```

### 6. Barrel Exports

Use `index.ts` files for clean imports:

```typescript
// src/common/decorators/index.ts
export * from './current-user.decorator';
export * from './public.decorator';
export * from './roles.decorator';

// Usage
import { CurrentUser, Public, Roles } from './common/decorators';
```

## Testing Modules

Each module should have corresponding test files:

```
module-name/
├── module-name.controller.spec.ts
├── module-name.service.spec.ts
└── module-name.module.spec.ts
```

Example test:

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Additional Resources

- [NestJS Modules Documentation](https://docs.nestjs.com/modules)
- [NestJS Global Modules](https://docs.nestjs.com/modules#global-modules)
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
