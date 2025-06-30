export interface APIEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH'
  path: string
  description: string
  params?: string[]
  body?: boolean
}

export interface APIResponse {
  success: boolean
  status: number
  data?: any
  error?: string
}