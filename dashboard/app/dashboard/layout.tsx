"use client"

import React from "react"
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Sidebar } from '@/components/dashboard/sidebar'
import { cn } from '@/lib/utils'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          isCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireAuth={true} fallbackPath="/auth/login">
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ProtectedRoute>
  )
}
