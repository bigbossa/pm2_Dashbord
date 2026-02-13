"use client"

import { useEffect, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Shield, Activity, AppWindow, TrendingUp, TrendingDown, ArrowUpRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DashboardData {
  stats: {
    totalUsers: number
    totalRoles: number
    todayActivities: number
    activeApps: number
  }
  recentActivities: any[]
  activeUsers: any[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const stats = [
    {
      title: 'ผู้ใช้ทั้งหมด',
      value: data?.stats.totalUsers ?? 0,
      icon: Users,
      href: '/dashboard/users',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Roles',
      value: data?.stats.totalRoles ?? 0,
      icon: Shield,
      href: '/dashboard/roles',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'กิจกรรมวันนี้',
      value: data?.stats.todayActivities ?? 0,
      icon: Activity,
      href: '/dashboard/activity',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'แอพที่ใช้งาน',
      value: data?.stats.activeApps ?? 0,
      icon: AppWindow,
      href: '/dashboard/apps',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ]

  const recentActivities = data?.recentActivities ?? []
  const activeUsers = data?.activeUsers ?? []

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description="ภาพรวมระบบจัดการผู้ใช้งาน" />
      
      <div className="flex-1 space-y-6 p-6">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">เกิดข้อผิดพลาด</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboard} className="ml-auto">
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    {loading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className="text-2xl font-bold">{stat.value}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
                <CardDescription>การใช้งานระบบล่าสุด</CardDescription>
              </div>
              <Link 
                href="/dashboard/activity" 
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                ดูทั้งหมด
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-7 w-7 rounded-full mt-1" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                ) : recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีกิจกรรม</p>
                ) : (
                  recentActivities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`mt-1 p-1.5 rounded-full ${
                        activity.action === 'LOGIN' ? 'bg-green-500/10 text-green-500' :
                        activity.action === 'CREATE' ? 'bg-blue-500/10 text-blue-500' :
                        activity.action === 'UPDATE' ? 'bg-yellow-500/10 text-yellow-500' :
                        activity.action === 'DELETE' ? 'bg-red-500/10 text-red-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.user?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(activity.created_at).toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>ผู้ใช้ที่ใช้งานอยู่</CardTitle>
                <CardDescription>
                  {loading ? '...' : `${activeUsers.length} คนที่ active`}
                </CardDescription>
              </div>
              <Link 
                href="/dashboard/users" 
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                ดูทั้งหมด
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))
                ) : activeUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีผู้ใช้</p>
                ) : (
                  activeUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {user.role_name || 'No Role'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>ทางลัดไปยังฟังก์ชันที่ใช้บ่อย</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Link href="/dashboard/users?action=create">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">เพิ่มผู้ใช้ใหม่</p>
                    <p className="text-xs text-muted-foreground">สร้างบัญชีผู้ใช้</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/roles?action=create">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Shield className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">เพิ่ม Role</p>
                    <p className="text-xs text-muted-foreground">กำหนดสิทธิ์ใหม่</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/apps?action=create">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AppWindow className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">เพิ่มแอพ</p>
                    <p className="text-xs text-muted-foreground">ลงทะเบียนแอพใหม่</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/activity">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Activity className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">ดู Activity Log</p>
                    <p className="text-xs text-muted-foreground">ตรวจสอบการใช้งาน</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
