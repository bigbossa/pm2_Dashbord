"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, Role } from './types'

interface AuthContextType {
  user: User | null
  role: Role | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: { email: string; username: string; password: string; full_name: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ตรวจสอบ session จาก API
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success && data.user) {
          setUser(data.user)
          setRole(data.role)
        }
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setRole(data.role)
        return { success: true }
      }

      return { success: false, error: data.error || 'เกิดข้อผิดพลาด' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
    }
  }

  const register = async (data: { email: string; username: string; password: string; full_name: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success && result.user) {
        setUser(result.user)
        setRole(result.role)
        return { success: true }
      }

      return { success: false, error: result.error || 'เกิดข้อผิดพลาด' }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setRole(null)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!role || !role.permissions) return false
    
    // Admin has all permissions
    const permissions = Array.isArray(role.permissions) ? role.permissions : []
    if (permissions.includes('*')) return true
    
    return permissions.includes(permission)
  }

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, register, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
