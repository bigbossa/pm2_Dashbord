// Custom hooks สำหรับดึงข้อมูลจาก API
import { useState, useEffect } from 'react'
import type { User, Role, App, ActivityLog, Branch, Department, SubDepartment } from './types'

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  error?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Hook สำหรับดึงข้อมูล Users
export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users?limit=1000')
      const data: PaginatedResponse<User> = await response.json()
      
      if (data.success) {
        setUsers(data.data)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (userData: {
    email: string
    username: string
    password: string
    full_name: string
    role_id: string
    status?: string
  }) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data: ApiResponse<User> = await response.json()
      
      if (data.success && data.data) {
        await fetchUsers() // Refresh list
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  const updateUser = async (userData: {
    id: string
    email?: string
    username?: string
    full_name?: string
    role_id?: string
    status?: string
    password?: string
  }) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data: ApiResponse<User> = await response.json()
      
      if (data.success) {
        await fetchUsers() // Refresh list
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchUsers() // Refresh list
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return { users, loading, error, fetchUsers, createUser, updateUser, deleteUser }
}

// Hook สำหรับดึงข้อมูล Roles
export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/roles')
      const data: ApiResponse<Role[]> = await response.json()
      
      if (data.success && data.data) {
        setRoles(data.data)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const createRole = async (roleData: {
    name: string
    description?: string
    permissions?: string[]
    department_id?: number | string
    level?: string
    code?: string
  }) => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      })
      const data: ApiResponse<Role> = await response.json()
      
      if (data.success) {
        await fetchRoles()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  const updateRole = async (roleData: {
    id: string
    name?: string
    description?: string
    permissions?: string[]
    department_id?: number | string
    level?: string
    code?: string
  }) => {
    try {
      const response = await fetch('/api/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      })
      const data: ApiResponse<Role> = await response.json()
      
      if (data.success) {
        await fetchRoles()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  const deleteRole = async (id: string) => {
    try {
      const response = await fetch(`/api/roles?id=${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchRoles()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  return { roles, loading, error, fetchRoles, createRole, updateRole, deleteRole }
}

// Hook สำหรับดึงข้อมูล Apps
export function useApps() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApps = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/apps')
      const data: ApiResponse<App[]> = await response.json()
      
      if (data.success && data.data) {
        setApps(data.data)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const createApp = async (appData: {
    name: string
    description?: string
    icon?: string
    url?: string
    status?: string
    allowed_roles?: string[]
  }) => {
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData),
      })
      const data: ApiResponse<App> = await response.json()
      
      if (data.success) {
        await fetchApps()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  const updateApp = async (appData: {
    id: string
    name?: string
    description?: string
    icon?: string
    url?: string
    status?: string
    allowed_roles?: string[]
  }) => {
    try {
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData),
      })
      const data: ApiResponse<App> = await response.json()
      
      if (data.success) {
        await fetchApps()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  const deleteApp = async (id: string) => {
    try {
      const response = await fetch(`/api/apps?id=${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchApps()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาด' }
    }
  }

  useEffect(() => {
    fetchApps()
  }, [])

  return { apps, loading, error, fetchApps, createApp, updateApp, deleteApp }
}

// Hook สำหรับดึงข้อมูล Activity Logs
export function useActivityLogs(filters?: { module?: string; action?: string; search?: string; page?: number; limit?: number }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState<{ total: number; today: number; logins: number; changes: number }>({ total: 0, today: 0, logins: 0, changes: 0 })

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters?.module && filters.module !== 'all') params.set('module', filters.module)
      if (filters?.action && filters.action !== 'all') params.set('action', filters.action)
      if (filters?.search) params.set('search', filters.search)
      params.set('page', String(filters?.page || 1))
      params.set('limit', String(filters?.limit || 50))

      const response = await fetch(`/api/activity-logs?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        if (data.stats) setStats(data.stats)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.module, filters?.action, filters?.search, filters?.page, filters?.limit])

  return { logs, loading, error, total, totalPages, stats, fetchLogs }
}

// ============= Organization Hierarchy Hooks =============

// Hook สำหรับจัดการสาขา (Branches)
export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organization/branches')
      const data = await response.json()
      
      if (data.success) {
        setBranches(data.data)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const createBranch = async (branchData: { name: string; code?: string; location?: string; description?: string }) => {
    const response = await fetch('/api/organization/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branchData),
    })
    const result = await response.json()
    if (result.success) await fetchBranches()
    return result
  }

  const updateBranch = async (branchData: { id: string; name: string; code?: string; location?: string; description?: string; status?: string }) => {
    const response = await fetch('/api/organization/branches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branchData),
    })
    const result = await response.json()
    if (result.success) await fetchBranches()
    return result
  }

  const deleteBranch = async (id: string) => {
    const response = await fetch(`/api/organization/branches?id=${id}`, {
      method: 'DELETE',
    })
    const result = await response.json()
    if (result.success) await fetchBranches()
    return result
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  return { branches, loading, error, fetchBranches, createBranch, updateBranch, deleteBranch }
}

// Hook สำหรับจัดการแผนก (Departments)
export function useDepartments(branchId?: string) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const url = branchId 
        ? `/api/organization/departments?branch_id=${branchId}`
        : '/api/organization/departments'
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setDepartments(data.data)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const createDepartment = async (deptData: { branch_id: string; name: string; code?: string; description?: string }) => {
    const response = await fetch('/api/organization/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deptData),
    })
    const result = await response.json()
    if (result.success) await fetchDepartments()
    return result
  }

  const updateDepartment = async (deptData: { id: string; branch_id: string; name: string; code?: string; description?: string; status?: string }) => {
    const response = await fetch('/api/organization/departments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deptData),
    })
    const result = await response.json()
    if (result.success) await fetchDepartments()
    return result
  }

  const deleteDepartment = async (id: string) => {
    const response = await fetch(`/api/organization/departments?id=${id}`, {
      method: 'DELETE',
    })
    const result = await response.json()
    if (result.success) await fetchDepartments()
    return result
  }

  useEffect(() => {
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  return { departments, loading, error, fetchDepartments, createDepartment, updateDepartment, deleteDepartment }
}

// Hook สำหรับจัดการแผนกย่อย (Sub-departments)
export function useSubDepartments(departmentId?: string) {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubDepartments = async () => {
    try {
      setLoading(true)
      const url = departmentId 
        ? `/api/organization/sub-departments?department_id=${departmentId}`
        : '/api/organization/sub-departments'
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setSubDepartments(data.data)
        setError(null)
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const createSubDepartment = async (subDeptData: { department_id: string; name: string; code?: string; description?: string }) => {
    const response = await fetch('/api/organization/sub-departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subDeptData),
    })
    const result = await response.json()
    if (result.success) await fetchSubDepartments()
    return result
  }

  const updateSubDepartment = async (subDeptData: { id: string; department_id: string; name: string; code?: string; description?: string; status?: string }) => {
    const response = await fetch('/api/organization/sub-departments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subDeptData),
    })
    const result = await response.json()
    if (result.success) await fetchSubDepartments()
    return result
  }

  const deleteSubDepartment = async (id: string) => {
    const response = await fetch(`/api/organization/sub-departments?id=${id}`, {
      method: 'DELETE',
    })
    const result = await response.json()
    if (result.success) await fetchSubDepartments()
    return result
  }

  useEffect(() => {
    fetchSubDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId])

  return { subDepartments, loading, error, fetchSubDepartments, createSubDepartment, updateSubDepartment, deleteSubDepartment }
}
