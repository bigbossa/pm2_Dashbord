"use client"

import React from "react"

import { useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useApps, useRoles } from '@/lib/api-hooks'
import { ProtectedRoute } from '@/components/protected-route'
import type { App, Role } from '@/lib/types'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Users,
  Package,
  BarChart3,
  Contact,
  Wallet,
  FileText,
  AppWindow,
  Settings,
  Play,
  Pause,
  Wrench,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const iconMap: Record<string, React.ElementType> = {
  Users,
  Package,
  BarChart3,
  Contact,
  Wallet,
  FileText,
  AppWindow,
  Settings,
}

const iconOptions = [
  { value: 'Users', label: 'Users' },
  { value: 'Package', label: 'Package' },
  { value: 'BarChart3', label: 'Chart' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Wallet', label: 'Wallet' },
  { value: 'FileText', label: 'Document' },
  { value: 'AppWindow', label: 'App' },
  { value: 'Settings', label: 'Settings' },
]

const statusConfig = {
  active: { label: 'ใช้งาน', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  inactive: { label: 'ไม่ใช้งาน', color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/20' },
  maintenance: { label: 'กำลังปรับปรุง', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
}

function AppsPageContent() {
  const { apps, loading, createApp, updateApp, deleteApp } = useApps()
  const { roles } = useRoles()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'AppWindow',
    url: '',
    status: 'active' as App['status'],
    allowed_roles: [] as string[],
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'AppWindow',
      url: '',
      status: 'active',
      allowed_roles: [],
    })
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'กรุณากรอกชื่อแอพ',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    const result = await createApp(formData)
    setSubmitting(false)

    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'เพิ่มแอพใหม่เรียบร้อย',
      })
      setIsCreateOpen(false)
      resetForm()
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถเพิ่มแอพได้',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedApp) return

    setSubmitting(true)
    const result = await updateApp({
      id: selectedApp.id,
      ...formData,
    })
    setSubmitting(false)

    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'อัปเดตข้อมูลแอพเรียบร้อย',
      })
      setIsEditOpen(false)
      setSelectedApp(null)
      resetForm()
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถอัปเดตแอพได้',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedApp) return

    setSubmitting(true)
    const result = await deleteApp(selectedApp.id)
    setSubmitting(false)

    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'ลบแอพเรียบร้อย',
      })
      setIsDeleteOpen(false)
      setSelectedApp(null)
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถลบแอพได้',
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (app: App, status: App['status']) => {
    const result = await updateApp({ id: app.id, status })
    
    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'เปลี่ยนสถานะเรียบร้อย',
      })
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถเปลี่ยนสถานะได้',
        variant: 'destructive',
      })
    }
  }

  const openEdit = (app: App) => {
    setSelectedApp(app)
    setFormData({
      name: app.name,
      description: app.description,
      icon: app.icon || 'AppWindow',
      url: app.url || '',
      status: app.status,
      allowed_roles: app.allowed_roles,
    })
    setIsEditOpen(true)
  }

  const toggleRole = (roleId: string) => {
    if (formData.allowed_roles.includes(roleId)) {
      setFormData({
        ...formData,
        allowed_roles: formData.allowed_roles.filter(r => r !== roleId),
      })
    } else {
      setFormData({
        ...formData,
        allowed_roles: [...formData.allowed_roles, roleId],
      })
    }
  }

  const RoleSelector = () => {
    // จัดกลุ่ม roles ตามสาขา > แผนก
    const grouped: Record<string, Role[]> = {}
    const ungrouped: Role[] = []

    roles.forEach((role) => {
      if (role.branch_name || role.department_name) {
        const key = [role.branch_name, role.department_name].filter(Boolean).join(' > ')
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(role)
      } else {
        ungrouped.push(role)
      }
    })

    const allSelected = roles.length > 0 && roles.every(r => formData.allowed_roles.includes(r.id))

    return (
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {/* เลือกทั้งหมด */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Checkbox
            id="role-all"
            checked={allSelected}
            onCheckedChange={() => {
              if (allSelected) {
                setFormData({ ...formData, allowed_roles: [] })
              } else {
                setFormData({ ...formData, allowed_roles: roles.map(r => r.id) })
              }
            }}
          />
          <Label htmlFor="role-all" className="font-semibold cursor-pointer text-sm">
            เลือกทั้งหมด ({roles.length})
          </Label>
        </div>

        {/* Roles ทั่วไป (ไม่มีสาขา/แผนก) */}
        {ungrouped.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">ตำแหน่งทั่วไป</p>
            {ungrouped.map((role) => (
              <div key={role.id} className="flex items-center gap-2 ml-2">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={formData.allowed_roles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer text-sm">
                  {role.name}
                  {role.level && <span className="text-muted-foreground ml-1">· {role.level}</span>}
                </Label>
              </div>
            ))}
          </div>
        )}

        {/* Roles จัดกลุ่มโดยสาขา > แผนก */}
        {Object.entries(grouped).map(([group, groupRoles]) => (
          <div key={group} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{group}</p>
            {groupRoles.map((role) => (
              <div key={role.id} className="flex items-center gap-2 ml-2">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={formData.allowed_roles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer text-sm">
                  {role.name}
                  {role.level && <span className="text-muted-foreground ml-1">· {role.level}</span>}
                </Label>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  const activeApps = apps.filter(a => a.status === 'active').length
  const inactiveApps = apps.filter(a => a.status === 'inactive').length
  const maintenanceApps = apps.filter(a => a.status === 'maintenance').length

  return (
    <div className="flex flex-col">
      <Header title="จัดการแอพพลิเคชัน" description="จัดการแอพและกำหนดสิทธิ์การเข้าถึง" />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="flex items-center gap-4 flex-wrap">
          {loading ? (
            <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" /> กำลังโหลด...</Badge>
          ) : (
            <>
              <Badge variant="secondary">{apps.length} แอพทั้งหมด</Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                {activeApps} ใช้งาน
              </Badge>
              <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                {inactiveApps} ไม่ใช้งาน
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                {maintenanceApps} กำลังปรับปรุง
              </Badge>
            </>
          )}
          <div className="flex-1" />
          <Button onClick={() => setIsCreateOpen(true)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มแอพใหม่
          </Button>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => {
              const IconComponent = iconMap[app.icon || 'AppWindow'] || AppWindow
              const status = statusConfig[app.status]
              const allowedRoleNames = app.allowed_roles
                .map(id => roles.find(r => r.id === id)?.name)
                .filter(Boolean)

            return (
              <Card key={app.id} className="relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${status.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${status.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {app.name}
                          {app.url && (
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${status.color} ${status.bgColor} ${status.borderColor}`}
                        >
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(app)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {app.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(app, 'active')}>
                            <Play className="mr-2 h-4 w-4 text-green-500" />
                            เปิดใช้งาน
                          </DropdownMenuItem>
                        )}
                        {app.status !== 'inactive' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(app, 'inactive')}>
                            <Pause className="mr-2 h-4 w-4 text-gray-500" />
                            ปิดใช้งาน
                          </DropdownMenuItem>
                        )}
                        {app.status !== 'maintenance' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(app, 'maintenance')}>
                            <Wrench className="mr-2 h-4 w-4 text-yellow-500" />
                            โหมดปรับปรุง
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedApp(app)
                            setIsDeleteOpen(true)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          ลบแอพ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-2">
                    {app.description}
                  </CardDescription>

                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Role ที่เข้าถึงได้:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {allowedRoleNames.length > 0 ? (
                        allowedRoleNames.map((name) => (
                          <Badge key={name} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">ไม่ได้กำหนด</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    อัพเดทล่าสุด: {new Date(app.updated_at).toLocaleDateString('th-TH')}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>เพิ่มแอพใหม่</DialogTitle>
            <DialogDescription>ลงทะเบียนแอพพลิเคชันใหม่ในระบบ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">ชื่อแอพ</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น HR System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">รายละเอียด</Label>
              <Textarea
                id="create-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="อธิบายหน้าที่ของแอพ"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-icon">ไอคอน</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => {
                      const Icon = iconMap[icon.value]
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">สถานะ</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as App['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                    <SelectItem value="maintenance">กำลังปรับปรุง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-url">URL</Label>
              <Input
                id="create-url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="/apps/my-app"
              />
            </div>
            <div className="space-y-2">
              <Label>Role ที่เข้าถึงได้</Label>
              <div className="border border-border rounded-lg p-4">
                <RoleSelector />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={!formData.name || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              สร้างแอพ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไขแอพ</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลแอพพลิเคชัน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">ชื่อแอพ</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">รายละเอียด</Label>
              <Textarea
                id="edit-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-icon">ไอคอน</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => {
                      const Icon = iconMap[icon.value]
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">สถานะ</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as App['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                    <SelectItem value="maintenance">กำลังปรับปรุง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role ที่เข้าถึงได้</Label>
              <div className="border border-border rounded-lg p-4">
                <RoleSelector />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบแอพ &quot;{selectedApp?.name}&quot; หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบแอพ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AppsPage() {
  return (
    <ProtectedRoute requiredPermissions={['apps:read']}>
      <AppsPageContent />
    </ProtectedRoute>
  )
}
