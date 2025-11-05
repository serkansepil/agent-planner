import apiClient, { apiRequest } from './client'
import {
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthResponse,
  User,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '@/types'

export const authApi = {
  // Register a new user
  register: async (data: AuthRegisterRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('post', '/auth/register', data)
  },

  // Login
  login: async (data: AuthLoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('post', '/auth/login', data)
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    return apiRequest<User>('get', '/users/profile')
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    return apiRequest<User>('patch', '/users/profile', data)
  },

  // Change password
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    return apiRequest<void>('patch', '/users/password', data)
  },

  // Delete account
  deleteAccount: async (): Promise<void> => {
    return apiRequest<void>('delete', '/users/account')
  },

  // Logout (client-side only - clear tokens)
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },

  // Save auth data
  saveAuth: (authResponse: AuthResponse) => {
    localStorage.setItem('access_token', authResponse.access_token)
    localStorage.setItem('user', JSON.stringify(authResponse.user))
  },

  // Get stored auth data
  getStoredAuth: (): { token: string | null; user: User | null } => {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    return { token, user }
  },
}
