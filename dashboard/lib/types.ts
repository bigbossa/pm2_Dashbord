// User Management Types

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url?: string
  role_id: string
  status: 'active' | 'inactive' | 'suspended'
  last_login?: Date
  created_at: Date
  updated_at: Date
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  department_id?: string
  sub_department_id?: string
  level?: string
  code?: string
  created_at: Date
  updated_at: Date
  // Joined fields from API
  department_name?: string
  department_code?: string
  branch_name?: string
  branch_code?: string
}

export interface Permission {
  id: string
  name: string
  description: string
  module: string
}

// Organization Hierarchy Types
export interface Branch {
  id: string
  name: string
  code?: string
  location?: string
  description?: string
  status: 'active' | 'inactive'
  department_count?: number
  created_at: Date
  updated_at: Date
}

export interface Department {
  id: string
  branch_id: string
  name: string
  code?: string
  description?: string
  status: 'active' | 'inactive'
  branch_name?: string
  branch_code?: string
  sub_department_count?: number
  created_at: Date
  updated_at: Date
}

export interface SubDepartment {
  id: string
  department_id: string
  name: string
  code?: string
  description?: string
  status: 'active' | 'inactive'
  department_name?: string
  department_code?: string
  branch_name?: string
  branch_code?: string
  role_count?: number
  created_at: Date
  updated_at: Date
}


export interface ActivityLog {
  id: string
  user_id: string
  user?: User
  action: string
  module: string
  description: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
  created_at: Date
}

export interface App {
  id: string
  name: string
  description: string
  icon?: string
  url?: string
  status: 'active' | 'inactive' | 'maintenance'
  allowed_roles: string[]
  created_at: Date
  updated_at: Date
}

export interface Session {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}

// Auth Types
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  full_name: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
