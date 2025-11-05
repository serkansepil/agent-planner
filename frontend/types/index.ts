// Enums
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED'
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL'
}

export enum IntegrationType {
  API = 'API',
  DATABASE = 'DATABASE',
  WEBHOOK = 'WEBHOOK',
  OAUTH = 'OAUTH',
  CUSTOM = 'CUSTOM'
}

export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR'
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Models
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  name: string
  description?: string
  systemPrompt: string
  avatar?: string
  config: Record<string, any>
  metadata?: Record<string, any>
  isActive: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  avatar?: string
  config: Record<string, any>
  metadata?: Record<string, any>
  isActive: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
  workspaceAgents?: WorkspaceAgent[]
}

export interface WorkspaceAgent {
  id: string
  workspaceId: string
  agentId: string
  role: string
  config: Record<string, any>
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
  agent?: Agent
}

export interface Session {
  id: string
  workspaceId: string
  userId: string
  title?: string
  status: SessionStatus
  metadata?: Record<string, any>
  startedAt: string
  endedAt?: string
  createdAt: string
  updatedAt: string
  workspace?: Workspace
  messages?: Message[]
}

export interface Message {
  id: string
  sessionId: string
  agentId?: string
  content: string
  role: MessageRole
  metadata?: Record<string, any>
  tokens?: number
  parentMessageId?: string
  isEdited: boolean
  editedAt?: string
  isDeleted: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
  agent?: Agent
  replies?: Message[]
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
}

export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  metadata?: Record<string, any>
  createdAt: string
}

export interface Integration {
  id: string
  name: string
  description?: string
  type: IntegrationType
  status: IntegrationStatus
  config: Record<string, any>
  credentials?: Record<string, any>
  metadata?: Record<string, any>
  workspaceId?: string
  userId: string
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocument {
  id: string
  title: string
  content: string
  summary?: string
  source?: string
  sourceUrl?: string
  mimeType?: string
  fileSize?: number
  status: DocumentStatus
  metadata?: Record<string, any>
  workspaceId?: string
  agentId?: string
  userId: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// API Request/Response types
export interface AuthRegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface CreateAgentRequest {
  name: string
  description?: string
  systemPrompt: string
  config?: Record<string, any>
}

export interface UpdateAgentRequest {
  name?: string
  description?: string
  systemPrompt?: string
  config?: Record<string, any>
  isActive?: boolean
}

export interface CreateWorkspaceRequest {
  name: string
  description?: string
  config?: Record<string, any>
}

export interface UpdateWorkspaceRequest {
  name?: string
  description?: string
  config?: Record<string, any>
  isActive?: boolean
}

export interface CreateSessionRequest {
  workspaceId: string
  title?: string
}

export interface UpdateSessionRequest {
  status?: SessionStatus
  title?: string
}

export interface CreateMessageRequest {
  sessionId: string
  content: string
  role?: MessageRole
  parentMessageId?: string
  attachments?: {
    fileName: string
    fileUrl: string
    mimeType: string
    fileSize: number
    metadata?: Record<string, any>
  }[]
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  avatar?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}
