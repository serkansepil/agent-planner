import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { ApiError } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient

// Helper function to handle API errors
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    return axiosError.response?.data?.message || 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}

// Generic API request function
export async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request<T>({
    method,
    url,
    data,
    ...config,
  })
  return response.data
}
