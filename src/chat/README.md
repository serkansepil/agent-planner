# Real-time Chat Module

Comprehensive WebSocket-based real-time chat implementation with Socket.io, LLM streaming, and advanced messaging features.

## Features

### 6.1 Chat Gateway (WebSocket)

The Chat Gateway provides real-time bidirectional communication using Socket.io.

#### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/chat', {
  auth: {
    userId: 'user-uuid',
    token: 'jwt-token'
  }
});

socket.on('connection:success', (data) => {
  console.log('Connected:', data);
});
```

#### Events

**Session Management**
- `session:join` - Join a chat session
- `session:leave` - Leave a chat session
- `user:joined` - Notification when user joins
- `user:left` - Notification when user leaves

**Messaging**
- `message:send` - Send a new message
- `message:new` - Receive new message
- `message:edit` - Edit an existing message
- `message:edited` - Receive edited message
- `message:delete` - Delete a message
- `message:deleted` - Receive deletion notification
- `message:delivered` - Delivery confirmation
- `message:seen` - Mark message as seen
- `message:seen:update` - Receive seen status update

**Reactions**
- `message:reaction` - Add/remove emoji reaction
- `message:reaction:update` - Receive reaction update

**Typing Indicators**
- `typing:start` - User starts typing
- `typing:stop` - User stops typing

**Presence Tracking**
- `presence:update` - Online/offline status changes

**LLM Streaming**
- `stream:request` - Start LLM response stream
- `stream:chunk` - Receive stream chunk
- `stream:complete` - Stream completed
- `stream:error` - Stream error
- `stream:stop` - Stop active stream
- `stream:stopped` - Stream stopped confirmation

#### Rate Limiting

WebSocket events are rate-limited using the `@WsThrottle` decorator:
- `session:join` - 5 requests per minute
- `message:send` - 30 messages per minute
- `message:edit` - 20 requests per minute
- `typing:start` - 100 requests per minute
- `stream:request` - 10 requests per minute

### 6.2 Chat Service

The Chat Service handles message processing, persistence, and business logic.

#### Message Operations

```typescript
// Create message
const message = await chatService.createMessage({
  sessionId: 'session-uuid',
  userId: 'user-uuid',
  content: 'Hello world!',
  parentMessageId?: 'parent-message-uuid', // For threading
  attachments?: [
    {
      fileName: 'document.pdf',
      fileUrl: 'https://...',
      mimeType: 'application/pdf',
      fileSize: 12345
    }
  ]
});

// Get message history with pagination
const { messages, total } = await chatService.getMessageHistory(
  'session-uuid',
  'user-uuid',
  {
    limit: 50,
    offset: 0,
    parentMessageId: 'parent-uuid' // Optional: get thread replies
  }
);

// Edit message
const updated = await chatService.editMessage(
  'message-uuid',
  'Updated content',
  'user-uuid'
);

// Delete message
await chatService.deleteMessage('message-uuid', 'user-uuid');

// Search messages
const results = await chatService.searchMessages(
  'session-uuid',
  'user-uuid',
  'search query',
  { limit: 20, offset: 0 }
);
```

#### Message Threading

Messages support nested threading for organized conversations:

```typescript
// Get thread replies
const replies = await chatService.getThreadMessages(
  'parent-message-uuid',
  'user-uuid'
);
```

#### Reactions

Add emoji reactions to messages:

```typescript
// Toggle reaction (add if not exists, remove if exists)
const result = await chatService.toggleReaction(
  'message-uuid',
  'user-uuid',
  '👍'
);

// Get all reactions for a message
const reactions = await chatService.getMessageReactions('message-uuid');
```

#### File Attachments

Handle file attachments on messages:

```typescript
// Add attachment
const attachment = await chatService.addAttachment('message-uuid', {
  fileName: 'image.jpg',
  fileUrl: 'https://cdn.example.com/image.jpg',
  mimeType: 'image/jpeg',
  fileSize: 54321,
  metadata: { width: 1920, height: 1080 }
});

// Get attachments
const attachments = await chatService.getAttachments('message-uuid');

// Delete attachment
await chatService.deleteAttachment('attachment-uuid', 'user-uuid');
```

#### Profanity Filter

Messages are automatically filtered for profanity using the `bad-words` library.

### 6.3 LLM Streaming Integration

Real-time streaming of LLM responses through WebSocket.

#### Starting a Stream

```typescript
// Start streaming
const streamId = await chatService.startStream(
  'session-uuid',
  'What is the weather like?',
  'user-uuid',
  'agent-uuid',
  {
    temperature: 0.7,
    maxTokens: 500,
    model: 'gpt-4'
  },
  // On chunk callback
  (chunk) => {
    console.log('Received chunk:', chunk.delta);
  },
  // On error callback
  (error) => {
    console.error('Stream error:', error);
  },
  // On complete callback
  () => {
    console.log('Stream completed');
  }
);
```

#### Stream Features

- **Token-by-token streaming** - Real-time token generation
- **Chunk processing** - Efficient buffering and delivery
- **Multiple concurrent streams** - Support for parallel streams
- **Stream interruption** - Cancel streams in progress
- **Error recovery** - Graceful error handling
- **Stream analytics** - Metrics and monitoring
- **Bandwidth optimization** - Efficient data transfer

#### Stream Monitoring

```typescript
// Get stream status
const status = await chatService.getStreamStatus('stream-uuid');
// Returns: { streamId, sessionId, status, progress, tokensGenerated, startedAt, completedAt? }

// Get stream metrics
const metrics = await chatService.getStreamMetrics('stream-uuid');
// Returns: { streamId, totalTokens, tokensPerSecond, latency, bandwidth, errors }
```

#### Client-side WebSocket Integration

```javascript
// Request stream
socket.emit('stream:request', {
  sessionId: 'session-uuid',
  prompt: 'Tell me a story',
  agentId: 'agent-uuid',
  config: {
    temperature: 0.8,
    maxTokens: 1000
  }
});

// Receive stream chunks
socket.on('stream:chunk', (chunk) => {
  // chunk: { id, sessionId, messageId, content, delta, tokens, isComplete }
  console.log('Delta:', chunk.delta);

  if (chunk.isComplete) {
    console.log('Full response:', chunk.content);
  }
});

// Stream completed
socket.on('stream:complete', (data) => {
  console.log('Stream finished');
});

// Stream error
socket.on('stream:error', (error) => {
  console.error('Stream error:', error);
});

// Stop stream manually
socket.emit('stream:stop', { streamId: 'stream-uuid' });
```

## HTTP REST API Endpoints

In addition to WebSocket events, the Chat module provides REST endpoints:

### Messages

- `POST /api/chat/messages` - Send a message
- `GET /api/chat/sessions/:sessionId/messages` - Get message history
- `GET /api/chat/messages/:messageId` - Get specific message
- `PUT /api/chat/messages/:messageId` - Edit message
- `DELETE /api/chat/messages/:messageId` - Delete message

### Reactions

- `POST /api/chat/messages/:messageId/reactions` - Toggle reaction
- `GET /api/chat/messages/:messageId/reactions` - Get reactions

### Threading

- `GET /api/chat/messages/:messageId/thread` - Get thread replies

### Search

- `GET /api/chat/sessions/:sessionId/search?query=...` - Search messages

### Presence

- `GET /api/chat/sessions/:sessionId/presence` - Get presence info

### Attachments

- `POST /api/chat/messages/:messageId/attachments` - Add attachment
- `GET /api/chat/messages/:messageId/attachments` - Get attachments
- `DELETE /api/chat/attachments/:attachmentId` - Delete attachment

### Streaming

- `GET /api/chat/streams/:streamId/status` - Get stream status
- `GET /api/chat/streams/:streamId/metrics` - Get stream metrics

## Database Schema

### Message Model

```prisma
model Message {
  id              String      @id @default(uuid())
  sessionId       String
  agentId         String?
  content         String      @db.Text
  role            MessageRole
  metadata        Json?
  tokens          Int?
  parentMessageId String?     // Threading
  isEdited        Boolean     @default(false)
  editedAt        DateTime?
  isDeleted       Boolean     @default(false)
  deletedAt       DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  session         Session
  agent           Agent?
  parentMessage   Message?
  replies         Message[]
  reactions       MessageReaction[]
  attachments     MessageAttachment[]
}
```

### MessageReaction Model

```prisma
model MessageReaction {
  id        String   @id @default(uuid())
  messageId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())

  message Message
}
```

### MessageAttachment Model

```prisma
model MessageAttachment {
  id        String   @id @default(uuid())
  messageId String
  fileName  String
  fileUrl   String
  mimeType  String
  fileSize  Int
  metadata  Json?
  createdAt DateTime @default(now())

  message Message
}
```

## Configuration

### Environment Variables

```env
# WebSocket Configuration
WEBSOCKET_PORT=3000
CORS_ORIGIN=*

# Rate Limiting
WS_THROTTLE_TTL=60000
WS_THROTTLE_LIMIT=10

# Stream Configuration
STREAM_DELAY=50
MAX_CONCURRENT_STREAMS=10
```

## Reconnection Handling

The gateway implements automatic message queuing for reconnections:

1. When a client disconnects, their socket ID is tracked
2. Messages sent to the session are queued (up to 100 messages)
3. On reconnection, queued messages are delivered automatically
4. Queue is cleared after successful delivery

## Security

- **Authentication**: JWT tokens required for WebSocket connections
- **Authorization**: Session access validation before operations
- **Rate Limiting**: Per-user, per-event rate limits
- **Input Validation**: All DTOs validated with class-validator
- **Profanity Filter**: Automatic content filtering
- **CORS**: Configurable CORS settings

## Testing

```bash
# Run tests
npm test

# Build application
npm run build

# Start development server
npm run start:dev
```

## Integration Example

```typescript
// Complete chat flow example
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/chat', {
  auth: { userId: 'user-123', token: 'jwt-token' }
});

// Join session
socket.emit('session:join', { sessionId: 'session-123' });

// Send message
socket.emit('message:send', {
  sessionId: 'session-123',
  content: 'Hello everyone!',
  attachments: []
});

// Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});

// Start typing indicator
socket.emit('typing:start', {
  sessionId: 'session-123',
  userName: 'John Doe'
});

// Request LLM stream
socket.emit('stream:request', {
  sessionId: 'session-123',
  prompt: 'Explain quantum computing',
  config: { temperature: 0.7 }
});

// Receive stream chunks
socket.on('stream:chunk', (chunk) => {
  process.stdout.write(chunk.delta);
});
```

## Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ WebSocket (Socket.io)
         ▼
┌─────────────────┐
│  Chat Gateway   │ ◄── Rate Limiting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Chat Service   │ ◄── Message Pipeline
└────────┬────────┘     ├─ Profanity Filter
         │              ├─ Validation
         │              └─ Processing
         ▼
┌─────────────────┐
│ Prisma Service  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

## Future Enhancements

- [ ] Voice message support
- [ ] Video call integration
- [ ] Screen sharing
- [ ] Message encryption (E2E)
- [ ] Message scheduling
- [ ] Auto-moderation with AI
- [ ] Message translation
- [ ] Rich media embeds
- [ ] Message pinning
- [ ] User mentions (@user)
- [ ] Custom emoji support
- [ ] Message templates
- [ ] Typing prediction
- [ ] Read receipts persistence
- [ ] Push notifications
