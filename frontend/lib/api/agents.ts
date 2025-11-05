import { apiRequest } from './client'
import { Agent, CreateAgentRequest, UpdateAgentRequest } from '@/types'

export const agentsApi = {
  // Get all agents
  getAll: async (): Promise<Agent[]> => {
    return apiRequest<Agent[]>('get', '/agents')
  },

  // Get agent by ID
  getById: async (id: string): Promise<Agent> => {
    return apiRequest<Agent>('get', `/agents/${id}`)
  },

  // Create a new agent
  create: async (data: CreateAgentRequest): Promise<Agent> => {
    return apiRequest<Agent>('post', '/agents', data)
  },

  // Update an agent
  update: async (id: string, data: UpdateAgentRequest): Promise<Agent> => {
    return apiRequest<Agent>('patch', `/agents/${id}`, data)
  },

  // Delete an agent
  delete: async (id: string): Promise<void> => {
    return apiRequest<void>('delete', `/agents/${id}`)
  },
}
