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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { useBranches, useDepartments, useSubDepartments, useRoles } from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import { ProtectedRoute } from '@/components/protected-route'
import { mockPermissions } from '@/lib/mock-data'
import type { Branch, Department, SubDepartment, Role, Permission } from '@/lib/types'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  Building, 
  Users, 
  Shield,
  Loader2, 
  AlertCircle, 
  RefreshCw,
  MapPin,
  Briefcase,
  ChevronRight,
  Home,
  MoreVertical,
  ArrowLeft
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ========== Types ==========
type ViewLevel = 'branches' | 'departments' | 'sub-departments' | 'roles'

interface NavigationState {
  level: ViewLevel
  selectedBranch: Branch | null
  selectedDepartment: Department | null
  selectedSubDepartment: SubDepartment | null
}

// Group permissions
const groupedPermissions = mockPermissions.reduce((acc, permission) => {
  if (!acc[permission.module]) {
    acc[permission.module] = []
  }
  acc[permission.module].push(permission)
  return acc
}, {} as Record<string, Permission[]>)

const moduleOrder = ['users', 'roles', 'logs', 'apps', 'profile']
const moduleNames: Record<string, string> = {
  users: 'จัดการผู้ใช้',
  roles: 'จัดการ Role',
  logs: 'Activity Logs',
  apps: 'จัดการแอพ',
  profile: 'โปรไฟล์',
}

// ========== Permission Selector Component ==========
function PermissionSelector({ 
  selectedPermissions, 
  onToggle 
}: { 
  selectedPermissions: Permission[]
  onToggle: (permission: Permission, module?: string) => void 
}) {
  const toggleModulePermissions = (module: string) => {
    onToggle(groupedPermissions[module][0], module)
  }

  return (
    <div className="space-y-4 max-h-64 overflow-y-auto">
      {moduleOrder.map((module) => {
        const permissions = groupedPermissions[module] || []
        if (permissions.length === 0) return null
        
        const allSelected = permissions.every(p => selectedPermissions.some(fp => fp.id === p.id))
        const someSelected = permissions.some(p => selectedPermissions.some(fp => fp.id === p.id))
        const selectedCount = permissions.filter(p => selectedPermissions.some(fp => fp.id === p.id)).length
        
        return (
          <div key={module} className="border rounded-lg p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleModulePermissions(module)}
                />
                <Label className="font-semibold cursor-pointer">{moduleNames[module]}</Label>
              </div>
              <Badge variant="outline">{selectedCount}/{permissions.length}</Badge>
            </div>
            <div className="ml-6 space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPermissions.some(p => p.id === permission.id)}
                    onCheckedChange={() => onToggle(permission)}
                  />
                  <Label className="text-sm font-normal cursor-pointer">{permission.description}</Label>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========== Main Page Component ==========
function OrganizationRolesContent() {
  const { toast } = useToast()
  const [nav, setNav] = useState<NavigationState>({
    level: 'branches',
    selectedBranch: null,
    selectedDepartment: null,
    selectedSubDepartment: null,
  })

  // Fetch data hooks
  const branchesData = useBranches()
  const departmentsData = useDepartments(nav.selectedBranch?.id)
  const subDepartmentsData = useSubDepartments(nav.selectedDepartment?.id)
  const rolesData = useRoles()

  // Filter roles by selected sub-department
  const filteredRoles = nav.selectedSubDepartment
    ? rolesData.roles.filter(r => r.sub_department_id === nav.selectedSubDepartment?.id)
    : []

  // Navigation handlers
  const goToBranches = () => setNav({ level: 'branches', selectedBranch: null, selectedDepartment: null, selectedSubDepartment: null })
  const goToDepartments = (branch: Branch) => setNav({ ...nav, level: 'departments', selectedBranch: branch, selectedDepartment: null, selectedSubDepartment: null })
  const goToSubDepartments = (dept: Department) => setNav({ ...nav, level: 'sub-departments', selectedDepartment: dept, selectedSubDepartment: null })
  const goToRoles = (subdept: SubDepartment) => setNav({ ...nav, level: 'roles', selectedSubDepartment: subdept })

  const goBack = () => {
    if (nav.level === 'roles') {
      setNav({ ...nav, level: 'sub-departments', selectedSubDepartment: null })
    } else if (nav.level === 'sub-departments') {
      setNav({ ...nav, level: 'departments', selectedDepartment: null })
    } else if (nav.level === 'departments') {
      goToBranches()
    }
  }

  // Breadcrumb
  const breadcrumb = () => {
    const items = []
    items.push(
      <button key="home" onClick={goToBranches} className="flex items-center gap-1 hover:text-primary">
        <Home className="h-4 w-4" />
        <span>สาขา</span>
      </button>
    )
    
    if (nav.selectedBranch) {
      items.push(<ChevronRight key="chevron1" className="h-4 w-4 text-muted-foreground" />)
      items.push(
        <button key="branch" onClick={() => goToDepartments(nav.selectedBranch!)} className="hover:text-primary">
          {nav.selectedBranch.name}
        </button>
      )
    }
    
    if (nav.selectedDepartment) {
      items.push(<ChevronRight key="chevron2" className="h-4 w-4 text-muted-foreground" />)
      items.push(
        <button key="dept" onClick={() => goToSubDepartments(nav.selectedDepartment!)} className="hover:text-primary">
          {nav.selectedDepartment.name}
        </button>
      )
    }
    
    if (nav.selectedSubDepartment) {
      items.push(<ChevronRight key="chevron3" className="h-4 w-4 text-muted-foreground" />)
      items.push(<span key="subdept" className="text-primary">{nav.selectedSubDepartment.name}</span>)
    }
    
    return <div className="flex items-center gap-2 text-sm">{items}</div>
  }

  // Render current view
  const renderView = () => {
    switch (nav.level) {
      case 'branches':
        return <BranchesView data={branchesData} onSelect={goToDepartments} />
      case 'departments':
        return <DepartmentsView data={departmentsData} branch={nav.selectedBranch!} onSelect={goToSubDepartments} />
      case 'sub-departments':
        return <SubDepartmentsView data={subDepartmentsData} department={nav.selectedDepartment!} onSelect={goToRoles} />
      case 'roles':
        return <RolesView roles={filteredRoles} loading={rolesData.loading} error={rolesData.error} subDepartment={nav.selectedSubDepartment!} fetchRoles={rolesData.fetchRoles} />
    }
  }

  return (
    <div className="flex flex-col">
      <Header 
        title="โครงสร้างองค์กร & บทบาท" 
        description="จัดการสาขา แผนก แผนกย่อย และตำแหน่ง (Role)" 
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Breadcrumb & Back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {nav.level !== 'branches' && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                ย้อนกลับ
              </Button>
            )}
            {breadcrumb()}
          </div>
        </div>

        {/* Current View */}
        {renderView()}
      </div>
    </div>
  )
}

// ========== Branches View ==========
function BranchesView({ data, onSelect }: { data: ReturnType<typeof useBranches>, onSelect: (branch: Branch) => void }) {
  const { branches, loading, error } = data

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">เลือกสาขา</h2>
        <Badge variant="secondary">{branches.length} สาขา</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card 
            key={branch.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
            onClick={() => onSelect(branch)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Building2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{branch.name}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {branch.location || '-'}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">รหัสสาขา:</span>
                <Badge variant="outline">{branch.code || '-'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">จำนวนแผนก:</span>
                <Badge>{branch.department_count || 0} แผนก</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">สถานะ:</span>
                <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                  {branch.status === 'active' ? 'เปิดใช้งาน' : 'ปิด'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ========== Departments View ==========
function DepartmentsView({ data, branch, onSelect }: { 
  data: ReturnType<typeof useDepartments>
  branch: Branch
  onSelect: (dept: Department) => void 
}) {
  const { departments, loading, error } = data

  if (loading) {
    return <div>Loading departments...</div>
  }

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">เลือกแผนก - {branch.name}</h2>
        <Badge variant="secondary">{departments.length} แผนก</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card 
            key={dept.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
            onClick={() => onSelect(dept)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Building className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <CardDescription className="text-xs">{dept.code || '-'}</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">แผนกย่อย:</span>
                <Badge>{dept.sub_department_count || 0} แผนก</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ========== Sub-departments View ==========
function SubDepartmentsView({ data, department, onSelect }: { 
  data: ReturnType<typeof useSubDepartments>
  department: Department
  onSelect: (subdept: SubDepartment) => void 
}) {
  const { subDepartments, loading, error } = data

  if (loading) {
    return <div>Loading sub-departments...</div>
  }

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">เลือกแผนกย่อย - {department.name}</h2>
        <Badge variant="secondary">{subDepartments.length} แผนกย่อย</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subDepartments.map((subdept) => (
          <Card 
            key={subdept.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
            onClick={() => onSelect(subdept)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Briefcase className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{subdept.name}</CardTitle>
                    <CardDescription className="text-xs">{subdept.code || '-'}</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ตำแหน่ง:</span>
                <Badge>{subdept.role_count || 0} ตำแหน่ง</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ========== Roles View ==========
function RolesView({ roles, loading, error, subDepartment, fetchRoles }: {
  roles: Role[]
  loading: boolean
  error: string | null
  subDepartment: SubDepartment
  fetchRoles: () => void
}) {
  const { toast } = useToast()
  const { deleteRole, updateRole, createRole } = useRoles()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as Permission[],
    level: 'staff' as string,
    code: ''
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', permissions: [], level: 'staff', code: '' })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'ข้อผิดพลาด', description: 'กรุณากรอกชื่อตำแหน่ง', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const result = await createRole({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.map(p => p.name),
        sub_department_id: subDepartment.id,
        level: formData.level,
        code: formData.code
      })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `สร้างตำแหน่ง "${formData.name}" เรียบร้อยแล้ว` })
        setIsCreateOpen(false)
        resetForm()
        fetchRoles()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
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
        toast({ title: 'สำเร็จ', description: `ลบตำแหน่ง "${selectedRole.name}" เรียบร้อยแล้ว` })
        setIsDeleteOpen(false)
        setSelectedRole(null)
        fetchRoles()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const togglePermission = (permission: Permission, module?: string) => {
    if (module) {
      // Toggle all permissions in module
      const modulePerms = groupedPermissions[module]
      const allSelected = modulePerms.every(p => formData.permissions.some(fp => fp.id === p.id))
      setFormData({
        ...formData,
        permissions: allSelected 
          ? formData.permissions.filter(p => p.module !== module)
          : [...formData.permissions.filter(p => p.module !== module), ...modulePerms]
      })
    } else {
      // Toggle single permission
      const exists = formData.permissions.some(p => p.id === permission.id)
      setFormData({
        ...formData,
        permissions: exists 
          ? formData.permissions.filter(p => p.id !== permission.id)
          : [...formData.permissions, permission]
      })
    }
  }

  if (loading) {
    return <div>Loading roles...</div>
  }

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ตำแหน่ง/Role - {subDepartment.name}</h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{roles.length} ตำแหน่ง</Badge>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มตำแหน่ง
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const permCount = Array.isArray(role.permissions) ? role.permissions.length : 0
          return (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Shield className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {role.level ? `Role: ${role.level}` : '-'}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {/* TODO: Edit */}}>
                        <Pencil className="mr-2 h-4 w-4" />
                        แก้ไข
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => { setSelectedRole(role); setIsDeleteOpen(true) }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">{role.description || '-'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">สิทธิ์:</span>
                  <Badge>{permCount} สิทธิ์</Badge>
                </div>
                {role.code && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">รหัส:</span>
                    <Badge variant="outline">{role.code}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>เพิ่มตำแหน่งใหม่</DialogTitle>
            <DialogDescription>สร้างตำแหน่งใหม่ใน {subDepartment.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อตำแหน่ง</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัส</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">SuperAdmin</SelectItem>
                    <SelectItem value="systemadmin">SystemAdmin</SelectItem>
                    <SelectItem value="branchadmin">BranchAdmin</SelectItem>
                    <SelectItem value="departmenthead">DepartmentHead</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>สิทธิ์การใช้งาน ({formData.permissions.length})</Label>
              <div className="border rounded-lg p-4">
                <PermissionSelector selectedPermissions={formData.permissions} onToggle={togglePermission} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              สร้างตำแหน่ง
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
              คุณต้องการลบตำแหน่ง &quot;{selectedRole?.name}&quot; หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบตำแหน่ง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== Main Export ==========
export default function OrganizationRolesPage() {
  return (
    <ProtectedRoute requiredPermissions={['roles:read']}>
      <OrganizationRolesContent />
    </ProtectedRoute>
  )
}
