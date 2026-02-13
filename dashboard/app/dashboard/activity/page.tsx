"use client"

import React from "react"

import { useState, useMemo, useCallback } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivityLogs } from '@/lib/api-hooks'
import { ProtectedRoute } from '@/components/protected-route'
import type { ActivityLog } from '@/lib/types'
import { Activity, LogIn, Plus, Pencil, Trash2, Ban, LogOut, Download, Filter, X, Search, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react'

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  login: { label: 'เข้าสู่ระบบ', icon: LogIn, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  logout: { label: 'ออกจากระบบ', icon: LogOut, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  create: { label: 'สร้าง', icon: Plus, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  update: { label: 'อัพเดท', icon: Pencil, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  delete: { label: 'ลบ', icon: Trash2, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  suspend: { label: 'ระงับ', icon: Ban, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  // Support case-insensitive และ legacy formats
  LOGIN: { label: 'เข้าสู่ระบบ', icon: LogIn, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  LOGOUT: { label: 'ออกจากระบบ', icon: LogOut, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  CREATE: { label: 'สร้าง', icon: Plus, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  UPDATE: { label: 'อัพเดท', icon: Pencil, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  DELETE: { label: 'ลบ', icon: Trash2, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  SUSPEND: { label: 'ระงับ', icon: Ban, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  // Specific actions
  update_user: { label: 'อัพเดทผู้ใช้', icon: Pencil, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  update_role: { label: 'อัพเดท Role', icon: Pencil, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  delete_app: { label: 'ลบแอพ', icon: Trash2, color: 'text-red-500', bgColor: 'bg-red-500/10' },
}

const moduleConfig: Record<string, string> = {
  auth: 'Authentication',
  users: 'จัดการผู้ใช้',
  roles: 'จัดการ Role',
  apps: 'จัดการแอพ',
  profile: 'โปรไฟล์',
}

function ActivityLogPageContent() {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [moduleFilter, setModuleFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const filters = useMemo(() => ({
    module: moduleFilter,
    action: actionFilter,
    search: searchQuery,
    page,
    limit: pageSize,
  }), [moduleFilter, actionFilter, searchQuery, page, pageSize])

  const { logs, loading, error, total, totalPages, stats, fetchLogs } = useActivityLogs(filters)

  const handleSearch = useCallback(() => {
    setSearchQuery(searchText)
    setPage(1)
  }, [searchText])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const openDetail = (log: ActivityLog) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const clearFilters = () => {
    setActionFilter('all')
    setModuleFilter('all')
    setSearchText('')
    setSearchQuery('')
    setPage(1)
  }

  const hasFilters = actionFilter !== 'all' || moduleFilter !== 'all' || searchQuery !== ''

  const handleExport = () => {
    // สร้าง CSV จากข้อมูลที่ดึงมา
    const headers = ['เวลา', 'ผู้ใช้', 'Email', 'การกระทำ', 'โมดูล', 'รายละเอียด', 'IP Address']
    const rows = logs.map(log => {
      // ลองหา config จาก action - เหมือนกับใน table
      let config = actionConfig[log.action] || actionConfig[log.action.toLowerCase()]
      if (!config) {
        const baseAction = log.action.toLowerCase().split('_')[0]
        config = actionConfig[baseAction] || { label: log.action, icon: Activity, color: '', bgColor: '' }
      }
      return [
        new Date(log.created_at).toLocaleString('th-TH'),
        log.user?.full_name || 'Unknown',
        log.user?.email || '-',
        config.label,
        moduleConfig[log.module] || log.module,
        log.description,
        log.ip_address || '-',
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <Header title="Activity Log" description="ประวัติการใช้งานระบบทั้งหมด" />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                รายการทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                วันนี้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.today}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                การเข้าสู่ระบบ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.logins}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                การเปลี่ยนแปลง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.changes}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ค้นหาชื่อ, username, รายละเอียด..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9 pr-9"
            />
            {searchText && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => { setSearchText(''); setSearchQuery(''); setPage(1) }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="การกระทำ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="login">เข้าสู่ระบบ</SelectItem>
              <SelectItem value="logout">ออกจากระบบ</SelectItem>
              <SelectItem value="create">สร้าง</SelectItem>
              <SelectItem value="update">อัพเดท</SelectItem>
              <SelectItem value="delete">ลบ</SelectItem>
              <SelectItem value="suspend">ระงับ</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="โมดูล" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {Object.entries(moduleConfig).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              ล้างตัวกรอง
            </Button>
          )}

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>

          <Button variant="outline" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">เกิดข้อผิดพลาด</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="ml-auto">
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">เวลา</TableHead>
                  <TableHead className="font-semibold">ผู้ใช้</TableHead>
                  <TableHead className="font-semibold">การกระทำ</TableHead>
                  <TableHead className="font-semibold">โมดูล</TableHead>
                  <TableHead className="font-semibold">รายละเอียด</TableHead>
                  <TableHead className="font-semibold">IP Address</TableHead>
                  <TableHead className="font-semibold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="text-muted-foreground">ไม่พบข้อมูล</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    // ลองหา config จาก action - ลำดับ: ตรงๆ -> lowercase -> base action (ตัดส่วนหลัง _)
                    let config = actionConfig[log.action] || actionConfig[log.action.toLowerCase()]
                    if (!config) {
                      // ถ้าไม่เจอ ลองตัด _ ออก เช่น update_profile -> update
                      const baseAction = log.action.toLowerCase().split('_')[0]
                      config = actionConfig[baseAction] || { label: log.action, icon: Activity, color: 'text-gray-500', bgColor: 'bg-gray-500/10' }
                    }
                    const Icon = config.icon
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell>
                          <span className="text-sm whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('th-TH', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {log.user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{log.user?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{log.user?.email || '-'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-full ${config.bgColor}`}>
                              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                            </div>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {moduleConfig[log.module] || log.module}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground max-w-xs truncate block">
                            {log.description}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {log.ip_address || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(log)}
                          >
                            ดูเพิ่มเติม
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>แสดง</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>จาก {total} รายการ</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                หน้า {page} จาก {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>รายละเอียด Activity Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  {selectedLog.user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                </div>
                <div>
                  <p className="font-semibold">{selectedLog.user?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.user?.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">การกระทำ</p>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const config = actionConfig[selectedLog.action] || { label: selectedLog.action, icon: Activity, color: 'text-gray-500', bgColor: 'bg-gray-500/10' }
                      const Icon = config.icon
                      return (
                        <>
                          <div className={`p-1.5 rounded-full ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <span className="font-medium">{config.label}</span>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">โมดูล</p>
                  <p className="font-medium mt-1">{moduleConfig[selectedLog.module] || selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">เวลา</p>
                  <p className="font-medium mt-1">
                    {new Date(selectedLog.created_at).toLocaleString('th-TH')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded mt-1 inline-block">
                    {selectedLog.ip_address || '-'}
                  </code>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">รายละเอียด</p>
                <p className="mt-1">{selectedLog.description}</p>
              </div>

              {selectedLog.user_agent && (
                <div>
                  <p className="text-sm text-muted-foreground">User Agent</p>
                  <code className="text-xs bg-muted px-2 py-2 rounded mt-1 block break-all">
                    {selectedLog.user_agent}
                  </code>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Metadata</p>
                  <pre className="text-xs bg-muted px-3 py-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ActivityLogPage() {
  return (
    <ProtectedRoute requiredPermissions={['logs:read']}>
      <ActivityLogPageContent />
    </ProtectedRoute>
  )
}

