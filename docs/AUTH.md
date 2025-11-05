# Authentication & Authorization

This document describes the authentication and authorization system implemented in the Agent Planner API.

## Overview

The application uses JWT (JSON Web Token) based authentication with refresh token rotation for secure user authentication. Role-based access control (RBAC) is implemented to manage user permissions.

## Features

- JWT-based authentication
- Refresh token rotation
- Password reset functionality
- Role-based access control (RBAC)
- WebSocket authentication
- Password strength validation
- Secure password hashing with bcrypt

## User Roles

The system supports the following roles:

- **USER**: Standard user with basic permissions
- **ADMIN**: Administrator with elevated permissions
- **SUPER_ADMIN**: Super administrator with full system access

## Authentication Endpoints

All authentication endpoints are under `/api/auth`.

### Register

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### Login

**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### Logout

**POST** `/api/auth/logout`

Logout and invalidate refresh token.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Refresh Token

**POST** `/api/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token"
}
```

### Password Reset Request

**POST** `/api/auth/password-reset/request`

Request a password reset token.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent",
  "resetToken": "reset-token" // Only in development mode
}
```

### Password Reset Confirm

**POST** `/api/auth/password-reset/confirm`

Confirm password reset with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## User Management Endpoints

All user endpoints are under `/api/users` and require authentication.

### Get Profile

**GET** `/api/users/profile`

Get current user profile.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Profile

**PATCH** `/api/users/profile`

Update user profile.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### Change Password

**PATCH** `/api/users/password`

Change user password.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### Delete Account

**DELETE** `/api/users/account`

Delete user account.

**Headers:**
```
Authorization: Bearer <access-token>
```

## Authentication Guards

### JwtAuthGuard

Protects routes that require authentication. Use with `@UseGuards(JwtAuthGuard)`.

```typescript
@Get('protected')
@UseGuards(JwtAuthGuard)
async getProtected(@CurrentUser() user: any) {
  return user;
}
```

### LocalAuthGuard

Used for login endpoint to validate credentials. Use with `@UseGuards(LocalAuthGuard)`.

```typescript
@Post('login')
@UseGuards(LocalAuthGuard)
async login(@Req() req: any) {
  return this.authService.login(req.user);
}
```

### RolesGuard

Protects routes based on user roles. Use with `@Roles()` decorator.

```typescript
@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
async getAdminData() {
  return 'Admin data';
}
```

## WebSocket Authentication

WebSocket connections require JWT authentication. The adapter automatically validates tokens and attaches user information to the socket.

### Client Connection

**JavaScript/TypeScript:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-access-token'
  }
});

// Or using query parameter
const socket = io('http://localhost:3000', {
  query: {
    token: 'your-jwt-access-token'
  }
});

// Or using authorization header
const socket = io('http://localhost:3000', {
  extraHeaders: {
    'Authorization': 'Bearer your-jwt-access-token'
  }
});
```

### Server-side Usage

Access authenticated user from socket:

```typescript
@WebSocketGateway()
export class EventsGateway {
  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const user = client.data.user;
    console.log(`User ${user.email} sent: ${data}`);
  }
}
```

### WsJwtGuard

Protect WebSocket handlers with authentication:

```typescript
@UseGuards(WsJwtGuard)
@SubscribeMessage('protected-event')
handleProtectedEvent(@ConnectedSocket() client: Socket) {
  const user = client.data.user;
  return { message: `Hello ${user.name}` };
}
```

## Environment Variables

Required environment variables:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*
```

## Security Best Practices

1. **Token Storage**
   - Store access tokens in memory (not localStorage)
   - Store refresh tokens in httpOnly cookies or secure storage
   - Never expose tokens in URLs or logs

2. **Password Security**
   - Passwords are hashed using bcrypt with 10 rounds
   - Enforce strong password requirements
   - Implement rate limiting on login attempts

3. **Token Rotation**
   - Refresh tokens are rotated on each use
   - Old refresh tokens are invalidated
   - Access tokens have short expiration (15 minutes)

4. **WebSocket Security**
   - All WebSocket connections require authentication
   - Tokens are validated on connection
   - User sessions are tracked for auditing

## Database Schema

The User model includes the following authentication-related fields:

```prisma
model User {
  id                   String    @id @default(uuid())
  email                String    @unique
  password             String
  refreshToken         String?
  passwordResetToken   String?   @unique
  passwordResetExpires DateTime?
  role                 UserRole  @default(USER)
  // ... other fields
}
```

## Error Handling

Common error responses:

- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient permissions
- **409 Conflict**: Email already exists
- **400 Bad Request**: Validation error (weak password, invalid email, etc.)

## Testing

Use the Swagger documentation at `/api/docs` to test authentication endpoints interactively.

## Migration

To apply the authentication schema changes:

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Or in production
npm run prisma:migrate:deploy
```

## Notes

- Password reset tokens expire after 1 hour
- Reset token is returned in the response for development only (should be sent via email in production)
- All user sessions are invalidated when password is reset
- The system logs WebSocket connections and disconnections for auditing
