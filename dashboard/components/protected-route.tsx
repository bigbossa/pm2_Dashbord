"use client"

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  requiredPermissions?: string[]
  fallbackPath?: string
  showLoader?: boolean
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredPermissions = [],
  fallbackPath = '/auth/login',
  showLoader = true,
}: ProtectedRouteProps) {
  const { user, role, isLoading, hasPermission } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // รอการโหลดเสร็จก่อน
    if (isLoading) return

    // ตรวจสอบการ login
    if (requireAuth && !user) {
      // เก็บหน้าปัจจุบันไว้สำหรับ redirect กลับมา
      sessionStorage.setItem('redirect_after_login', pathname)
      router.push(fallbackPath)
      return
    }

    // ตรวจสอบสิทธิ์
    if (user && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        hasPermission(permission)
      )

      if (!hasAllPermissions) {
        router.push('/dashboard/unauthorized')
        return
      }
    }
  }, [isLoading, user, requireAuth, requiredPermissions.length, router, pathname, hasPermission, fallbackPath])

  // แสดง loader ระหว่างตรวจสอบ
  if (isLoading && showLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">กำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    )
  }

  // ถ้าต้องการ auth แต่ไม่ได้ login หรือไม่มีสิทธิ์ ไม่แสดงอะไร
  if (requireAuth && !user) {
    return null
  }

  if (user && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    )
    
    if (!hasAllPermissions) {
      return null
    }
  }

  return <>{children}</>
}

// Hook สำหรับตรวจสอบสิทธิ์ใน component
export function usePermission(permission: string) {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

// Hook สำหรับตรวจสอบสิทธิ์หลายอัน
export function usePermissions(permissions: string[]) {
  const { hasPermission } = useAuth()
  
  return {
    hasAll: permissions.every(permission => hasPermission(permission)),
    hasAny: permissions.some(permission => hasPermission(permission)),
    check: (permission: string) => hasPermission(permission),
  }
}