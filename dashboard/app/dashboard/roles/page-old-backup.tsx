"use client"

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { mockPermissions } from '@/lib/mock-data'
import { useRoles } from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import { ProtectedRoute } from '@/components/protected-route'
import type { Role, Permission } from '@/lib/types'
import { Plus, Pencil, Trash2, Shield, Users, MoreHorizontal, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Group permissions by module
const groupedPermissions = mockPermissions.reduce((acc, permission) => {
  if (!acc[permission.module]) {
    acc[permission.module] = []
  }
  acc[permission.module].push(permission)
  return acc
}, {} as Record<string, Permission[]>)

// จัดเรียงหมวดหมู่ตามลำดับความสำคัญ
const moduleOrder = ['users', 'roles', 'logs', 'apps', 'profile']

const moduleNames: Record<string, string> = {
  users: 'จัดการผู้ใช้',
  roles: 'จัดการ Role',
  logs: 'Activity Logs',
  apps: 'จัดการแอพ',
  profile: 'โปรไฟล์',
}

function RolesPageContent() {
  const { roles, loading, error, fetchRoles, createRole, updateRole, deleteRole } = useRoles()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as Permission[],
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: [],
    })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'ข้อผิดพลาด', description: 'กรุณากรอกชื่อ Role', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const result = await createRole({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.map(p => p.name),
      })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `สร้าง Role "${formData.name}" เรียบร้อยแล้ว` })
        setIsCreateOpen(false)
        resetForm()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error || 'ไม่สามารถสร้าง Role ได้', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedRole) return
    setSubmitting(true)
    try {
      const result = await updateRole({
        id: selectedRole.id,
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.map(p => p.name),
      })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `อัปเดต Role "${formData.name}" เรียบร้อยแล้ว` })
        setIsEditOpen(false)
        setSelectedRole(null)
        resetForm()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error || 'ไม่สามารถอัปเดต Role ได้', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return
    setSubmitting(true)
    try {
      const result = await deleteRole(selectedRole.id)
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `ลบ Role "${selectedRole.name}" เรียบร้อยแล้ว` })
        setIsDeleteOpen(false)
        setSelectedRole(null)
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error || 'ไม่สามารถลบ Role ได้', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (role: Role) => {
    setSelectedRole(role)
    // Map permissions from DB data - permissions stored as JSONB string array or Permission objects
    const rolePermissions = Array.isArray(role.permissions)
      ? role.permissions.map((p: any) => {
          if (typeof p === 'string') {
            return mockPermissions.find(mp => mp.name === p) || { id: p, name: p, description: p, module: 'unknown' }
          }
          return p
        })
      : []
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: rolePermissions,
    })
    setIsEditOpen(true)
  }

  const togglePermission = (permission: Permission) => {
    const exists = formData.permissions.some(p => p.id === permission.id)
    if (exists) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p.id !== permission.id),
      })
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission],
      })
    }
  }

  const toggleModulePermissions = (module: string) => {
    const modulePerms = groupedPermissions[module]
    const allSelected = modulePerms.every(p => formData.permissions.some(fp => fp.id === p.id))
    
    if (allSelected) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p.module !== module),
      })
    } else {
      const newPerms = [...formData.permissions.filter(p => p.module !== module), ...modulePerms]
      setFormData({
        ...formData,
        permissions: newPerms,
      })
    }
  }

  const getUserCountByRole = (role: any) => {
    return role.user_count ?? 0
  }

  const getPermissionsList = (role: Role) => {
    if (!Array.isArray(role.permissions)) return []
    return role.permissions.map((p: any) => {
      if (typeof p === 'string') {
        return mockPermissions.find(mp => mp.name === p) || { id: p, name: p, description: p, module: 'unknown' }
      }
      return p
    })
  }

  const PermissionSelector = () => (
    <div className="space-y-4 max-h-64 overflow-y-auto">
      {moduleOrder.map((module) => {
        const permissions = groupedPermissions[module] || []
        if (permissions.length === 0) return null
        
        const allSelected = permissions.every(p => formData.permissions.some(fp => fp.id === p.id))
        const someSelected = permissions.some(p => formData.permissions.some(fp => fp.id === p.id))
        const selectedCount = permissions.filter(p => formData.permissions.some(fp => fp.id === p.id)).length
        
        return (
          <div key={module} className="border rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`module-${module}`}
                  checked={allSelected}
                  onCheckedChange={() => toggleModulePermissions(module)}
                  className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
                <Label htmlFor={`module-${module}`} className="font-semibold cursor-pointer text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  {moduleNames[module] || module}
                </Label>
              </div>
              <div className="text-xs text-gray-500 px-2 py-1 bg-white rounded-md border">
                {selectedCount}/{permissions.length}
              </div>
            </div>
            <div className="ml-6 grid grid-cols-1 gap-2 pl-4 border-l-2 border-gray-200">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center gap-2 group">
                  <Checkbox
                    id={permission.id}
                    checked={formData.permissions.some(p => p.id === permission.id)}
                    onCheckedChange={() => togglePermission(permission)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={permission.id} className="text-sm font-normal cursor-pointer text-gray-700 group-hover:text-blue-600 transition-colors duration-150">
                    {permission.description}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col">
      <Header title="จัดการ Role" description="กำหนดสิทธิ์การใช้งานสำหรับผู้ใช้" />

      <div className="flex-1 p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
              <Badge variant="secondary">กำลังโหลด...</Badge>
            ) : (
              <Badge variant="secondary">{roles.length} Roles</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchRoles} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true) }} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่ม Role ใหม่
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">เกิดข้อผิดพลาด</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRoles} className="ml-auto">
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        {/* Roles Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={`skeleton-${i}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-20" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            roles.map((role) => {
              const userCount = getUserCountByRole(role)
              const permissionsList = getPermissionsList(role)
              const isAllPermissions = permissionsList.length === mockPermissions.length
              
              return (
                <Card key={role.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <CardDescription className="text-xs">
                            สร้างเมื่อ {new Date(role.created_at).toLocaleDateString('th-TH')}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(role)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRole(role)
                              setIsDeleteOpen(true)
                            }}
                            className="text-destructive"
                            disabled={userCount > 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{userCount} ผู้ใช้</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">สิทธิ์การใช้งาน</p>
                      <div className="flex flex-wrap gap-1">
                        {isAllPermissions ? (
                          <Badge variant="default" className="text-xs">
                            สิทธิ์ทั้งหมด
                          </Badge>
                        ) : permissionsList.length === 0 ? (
                          <span className="text-xs text-muted-foreground">ไม่มีสิทธิ์</span>
                        ) : (
                          <>
                            {permissionsList.slice(0, 4).map((perm: Permission) => (
                              <Badge key={perm.id} variant="outline" className="text-xs font-normal">
                                {perm.description}
                              </Badge>
                            ))}
                            {permissionsList.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{permissionsList.length - 4}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>เพิ่ม Role ใหม่</DialogTitle>
            <DialogDescription>กำหนดชื่อและสิทธิ์สำหรับ Role ใหม่</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">ชื่อ Role</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น Editor, Viewer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">รายละเอียด</Label>
              <Textarea
                id="create-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="อธิบายหน้าที่ของ Role นี้"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>สิทธิ์การใช้งาน ({formData.permissions.length} สิทธิ์)</Label>
              <div className="border border-border rounded-lg p-4">
                <PermissionSelector />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim() || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              สร้าง Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไข Role</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลและสิทธิ์ของ Role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">ชื่อ Role</Label>
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
            <div className="space-y-2">
              <Label>สิทธิ์การใช้งาน ({formData.permissions.length} สิทธิ์)</Label>
              <div className="border border-border rounded-lg p-4">
                <PermissionSelector />
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
              คุณต้องการลบ Role &quot;{selectedRole?.name}&quot; หรือไม่? 
              {selectedRole && getUserCountByRole(selectedRole) > 0 && (
                <span className="text-destructive block mt-2">
                  ไม่สามารถลบได้เนื่องจากยังมีผู้ใช้ {getUserCountByRole(selectedRole)} คนอยู่ใน Role นี้
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button 
              variant="destructive" 
              className='text-white'
              onClick={handleDelete}
              disabled={submitting || (selectedRole ? getUserCountByRole(selectedRole) > 0 : false)}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบ Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RolesPage() {
  return (
    <ProtectedRoute requiredPermissions={['roles:read']}>
      <RolesPageContent />
    </ProtectedRoute>
  )
}
