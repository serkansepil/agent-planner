import { apiRequest } from './client'
import {
  Session,
  Message,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateMessageRequest,
} from '@/types'

export const chatApi = {
  // Sessions
  sessions: {
    // Get all sessions (optionally filtered by workspace)
    getAll: async (workspaceId?: string): Promise<Session[]> => {
      const params = workspaceId ? `?workspaceId=${workspaceId}` : ''
      return apiRequest<Session[]>('get', `/sessions${params}`)
    },

    // Get session by ID
    getById: async (id: string): Promise<Session> => {
      return apiRequest<Session>('get', `/sessions/${id}`)
    },

    // Create a new session
    create: async (data: CreateSessionRequest): Promise<Session> => {
      return apiRequest<Session>('post', '/sessions', data)
    },

    // Update a session
    update: async (id: string, data: UpdateSessionRequest): Promise<Session> => {
      return apiRequest<Session>('patch', `/sessions/${id}`, data)
    },

    // Delete a session
    delete: async (id: string): Promise<void> => {
      return apiRequest<void>('delete', `/sessions/${id}`)
    },
  },

  // Messages
  messages: {
    // Get all messages for a session
    getBySession: async (sessionId: string): Promise<Message[]> => {
      return apiRequest<Message[]>('get', `/messages?sessionId=${sessionId}`)
    },

    // Get message by ID
    getById: async (id: string): Promise<Message> => {
      return apiRequest<Message>('get', `/messages/${id}`)
    },

    // Create a new message
    create: async (data: CreateMessageRequest): Promise<Message> => {
      return apiRequest<Message>('post', '/messages', data)
    },

    // Delete a message
    delete: async (id: string): Promise<void> => {
      return apiRequest<void>('delete', `/messages/${id}`)
    },
  },
}
