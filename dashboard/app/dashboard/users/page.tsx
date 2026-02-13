"use client"

import { useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { DataTable } from '@/components/dashboard/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers, useRoles, useBranches, useDepartments } from '@/lib/api-hooks'
import { ProtectedRoute } from '@/components/protected-route'
import type { User, Role } from '@/lib/types'
import { Plus, MoreHorizontal, Pencil, Trash2, Ban, CheckCircle, Eye, Loader2, Building2, Building, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const statusConfig = {
  active: { label: 'ใช้งาน', variant: 'default' as const, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  inactive: { label: 'ไม่ใช้งาน', variant: 'secondary' as const, className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  suspended: { label: 'ถูกระงับ', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

// Helper: สร้าง path โครงสร้างองค์กรของ Role
const getRolePath = (role: Role) => {
  const parts = []
  if (role.branch_name) parts.push(role.branch_name)
  if (role.department_name) parts.push(role.department_name)
  return parts.join(' > ')
}

// ========== Cascading Role Selector Component ==========
function RoleSelector({ 
  roles, 
  value, 
  onChange,
  initialBranchId,
  initialDeptId,
}: { 
  roles: Role[]
  value: string
  onChange: (roleId: string) => void
  initialBranchId?: string
  initialDeptId?: string
}) {
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId || '')
  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId || '')

  const branchesData = useBranches()
  const departmentsData = useDepartments(selectedBranchId || undefined)

  // Filter roles: ถ้าเลือกแผนกแล้ว แสดง roles ที่อยู่ใน department นั้น
  const filteredRoles = selectedDeptId
    ? roles.filter(r => r.department_name === departmentsData.departments.find(d => d.id === selectedDeptId)?.name)
    : !selectedBranchId ? roles.filter(r => !r.branch_name) : []

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId)
    setSelectedDeptId('')
    onChange('')
  }

  const handleDeptChange = (deptId: string) => {
    setSelectedDeptId(deptId)
    onChange('')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Building2 className="h-3 w-3" /> สาขา
          </Label>
          <Select value={selectedBranchId} onValueChange={handleBranchChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="เลือกสาขา" />
            </SelectTrigger>
            <SelectContent>
              {branchesData.branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Building className="h-3 w-3" /> แผนก
          </Label>
          <Select 
            value={selectedDeptId} 
            onValueChange={handleDeptChange} 
            disabled={!selectedBranchId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={selectedBranchId ? "เลือกแผนก" : "เลือกสาขาก่อน"} />
            </SelectTrigger>
            <SelectContent>
              {departmentsData.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" /> ตำแหน่ง
          </Label>
          <Select 
            value={value} 
            onValueChange={onChange} 
            disabled={!selectedDeptId && filteredRoles.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={selectedDeptId ? "เลือกตำแหน่ง" : "เลือกแผนกก่อน"} />
            </SelectTrigger>
            <SelectContent>
              {filteredRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                  {role.level && <span className="ml-1 text-muted-foreground">· {role.level}</span>}
                </SelectItem>
              ))}
              {filteredRoles.length === 0 && selectedDeptId && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">ไม่มีตำแหน่งในแผนกนี้</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* แสดง Role ที่ไม่มีสังกัดถ้าไม่ได้เลือกสาขา */}
      {!selectedBranchId && roles.filter(r => !r.branch_name).length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">หรือเลือกตำแหน่งทั่วไป</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="เลือกตำแหน่ง" />
            </SelectTrigger>
            <SelectContent>
              {roles.filter(r => !r.branch_name).map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

function UsersPageContent() {
  const { users, loading, createUser, updateUser, deleteUser } = useUsers()
  const { roles } = useRoles()
  const branchesData = useBranches()
  const departmentsData = useDepartments()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role_id: '',
    status: 'active' as User['status'],
  })

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      full_name: '',
      role_id: '',
      status: 'active',
    })
  }

  const handleCreate = async () => {
    if (!formData.email || !formData.username || !formData.password || !formData.full_name || !formData.role_id) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    const result = await createUser(formData)
    setSubmitting(false)

    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'เพิ่มผู้ใช้ใหม่เรียบร้อย',
      })
      setIsCreateOpen(false)
      resetForm()
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถเพิ่มผู้ใช้ได้',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    const result = await updateUser({
      id: selectedUser.id,
      ...formData,
      password: formData.password || undefined, // ส่ง password เฉพาะเมื่อกรอก
    })
    setSubmitting(false)

    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'อัปเดตข้อมูลผู้ใช้เรียบร้อย',
      })
      setIsEditOpen(false)
      setSelectedUser(null)
      resetForm()
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถอัปเดตผู้ใช้ได้',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    const result = await deleteUser(selectedUser.id)
    setSubmitting(false)

    if (result.success) {
      toast({
        title: 'สำเร็จ',
        description: 'ลบผู้ใช้เรียบร้อย',
      })
      setIsDeleteOpen(false)
      setSelectedUser(null)
    } else {
      toast({
        title: 'ข้อผิดพลาด',
        description: result.error || 'ไม่สามารถลบผู้ใช้ได้',
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (user: User, status: User['status']) => {
    const result = await updateUser({ id: user.id, status })
    
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

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      username: user.username,
      password: '', // ไม่แสดง password เดิม
      full_name: user.full_name,
      role_id: user.role_id,
      status: user.status,
    })
    setIsEditOpen(true)
  }

  const openView = (user: User) => {
    setSelectedUser(user)
    setIsViewOpen(true)
  }

  const columns = [
    {
      key: 'full_name',
      header: 'ชื่อ-นามสกุล',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="font-medium">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'อีเมล',
    },
    {
      key: 'role_id',
      header: 'ตำแหน่ง / สังกัด',
      render: (user: User) => {
        const role = roles.find(r => r.id === user.role_id)
        if (!role) return <Badge variant="outline" className="font-normal text-muted-foreground">ไม่มี Role</Badge>
        const path = getRolePath(role)
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="font-normal">
              {role.name}
              {role.level && <span className="ml-1 text-muted-foreground">({role.level})</span>}
            </Badge>
            {path && (
              <p className="text-xs text-muted-foreground leading-tight">
                {path}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (user: User) => {
        const config = statusConfig[user.status]
        return (
          <Badge variant={config.variant} className={config.className}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: 'last_login',
      header: 'เข้าสู่ระบบล่าสุด',
      render: (user: User) => (
        <span className="text-sm text-muted-foreground">
          {user.last_login 
            ? new Date(user.last_login).toLocaleString('th-TH')
            : 'ยังไม่เคยเข้าสู่ระบบ'
          }
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: User) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openView(user)}>
              <Eye className="mr-2 h-4 w-4" />
              ดูรายละเอียด
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              แก้ไข
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.status !== 'active' && (
              <DropdownMenuItem onClick={() => handleStatusChange(user, 'active')}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                เปิดใช้งาน
              </DropdownMenuItem>
            )}
            {user.status !== 'suspended' && (
              <DropdownMenuItem onClick={() => handleStatusChange(user, 'suspended')}>
                <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                ระงับบัญชี
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                setSelectedUser(user)
                setIsDeleteOpen(true)
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4 " />
              ลบผู้ใช้
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col">
      <Header title="จัดการผู้ใช้" description="จัดการบัญชีผู้ใช้งานในระบบ" />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
              <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" /> กำลังโหลด...</Badge>
            ) : (
              <>
                <Badge variant="secondary">{users.length} ผู้ใช้</Badge>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  {users.filter(u => u.status === 'active').length} ใช้งาน
                </Badge>
              </>
            )}
          </div>
          <Button onClick={() => setIsCreateOpen(true)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มผู้ใช้ใหม่
          </Button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            data={users}
            columns={columns}
            searchKey="full_name"
            searchPlaceholder="ค้นหาชื่อผู้ใช้..."
          />
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">ชื่อ-นามสกุล</Label>
              <Input
                id="create-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="สมชาย ใจดี"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-username">ชื่อผู้ใช้</Label>
              <Input
                id="create-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="somchai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">อีเมล</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">รหัสผ่าน</Label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="รหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">ตำแหน่ง (Role)</Label>
              <div className="border rounded-lg p-3 bg-muted/30">
                <RoleSelector
                  roles={roles}
                  value={formData.role_id}
                  onChange={(roleId) => setFormData({ ...formData, role_id: roleId })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status">สถานะ</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as User['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                  <SelectItem value="suspended">ถูกระงับ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              สร้างผู้ใช้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขผู้ใช้</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลผู้ใช้</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
              <Input
                id="edit-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">ชื่อผู้ใช้</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">อีเมล</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">รหัสผ่านใหม่ (ไม่บังคับ)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="ใส่เฉพาะเมื่อต้องการเปลี่ยนรหัสผ่าน"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">ตำแหน่ง (Role)</Label>
              <div className="border rounded-lg p-3 bg-muted/30">
                {(() => {
                  const currentRole = roles.find(r => r.id === formData.role_id)
                  // หา branch/dept/subdept IDs จาก role ปัจจุบัน
                  const initBranch = currentRole?.branch_name 
                    ? branchesData.branches.find(b => b.name === currentRole.branch_name)?.id 
                    : undefined
                  const initDept = currentRole?.department_name
                    ? departmentsData.departments.find(d => d.name === currentRole.department_name)?.id
                    : undefined
                  return (
                    <RoleSelector
                      roles={roles}
                      value={formData.role_id}
                      onChange={(roleId) => setFormData({ ...formData, role_id: roleId })}
                      initialBranchId={initBranch}
                      initialDeptId={initDept}
                    />
                  )
                })()}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">สถานะ</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as User['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                  <SelectItem value="suspended">ถูกระงับ</SelectItem>
                </SelectContent>
              </Select>
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

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รายละเอียดผู้ใช้</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-medium">
                  {selectedUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.full_name}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">อีเมล</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ตำแหน่ง (Role)</p>
                  {(() => {
                    const role = roles.find(r => r.id === selectedUser.role_id)
                    if (!role) return <p className="font-medium text-muted-foreground">ไม่มี</p>
                    const path = getRolePath(role)
                    return (
                      <div>
                        <p className="font-medium">
                          {role.name}
                          {role.level && <span className="ml-1 text-xs text-muted-foreground">({role.level})</span>}
                        </p>
                        {path && <p className="text-xs text-muted-foreground">{path}</p>}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">สถา���ะ</p>
                  <Badge variant={statusConfig[selectedUser.status].variant} className={statusConfig[selectedUser.status].className}>
                    {statusConfig[selectedUser.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">เข้าสู่ระบบล่าสุด</p>
                  <p className="font-medium">
                    {selectedUser.last_login 
                      ? new Date(selectedUser.last_login).toLocaleString('th-TH')
                      : 'ยังไม่เคย'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">สร้างเมื่อ</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString('th-TH')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">อัพเดทล่าสุด</p>
                  <p className="font-medium">{new Date(selectedUser.updated_at).toLocaleString('th-TH')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>ปิด</Button>
            <Button onClick={() => {
              setIsViewOpen(false)
              if (selectedUser) openEdit(selectedUser)
            }}>แก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบผู้ใช้ &quot;{selectedUser?.full_name}&quot; หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button variant="destructive" className=' text-white' onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบผู้ใช้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredPermissions={['users:read']}>
      <UsersPageContent />
    </ProtectedRoute>
  )
}
