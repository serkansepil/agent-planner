import { apiRequest } from './client'
import { Workspace, CreateWorkspaceRequest, UpdateWorkspaceRequest } from '@/types'

export const workspacesApi = {
  // Get all workspaces
  getAll: async (): Promise<Workspace[]> => {
    return apiRequest<Workspace[]>('get', '/workspaces')
  },

  // Get workspace by ID
  getById: async (id: string): Promise<Workspace> => {
    return apiRequest<Workspace>('get', `/workspaces/${id}`)
  },

  // Create a new workspace
  create: async (data: CreateWorkspaceRequest): Promise<Workspace> => {
    return apiRequest<Workspace>('post', '/workspaces', data)
  },

  // Update a workspace
  update: async (id: string, data: UpdateWorkspaceRequest): Promise<Workspace> => {
    return apiRequest<Workspace>('patch', `/workspaces/${id}`, data)
  },

  // Delete a workspace
  delete: async (id: string): Promise<void> => {
    return apiRequest<void>('delete', `/workspaces/${id}`)
  },
}
