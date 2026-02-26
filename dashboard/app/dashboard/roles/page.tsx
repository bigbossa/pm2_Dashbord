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
import { useBranches, useDepartments, useRoles } from '@/lib/api-hooks'
import { useToast } from '@/hooks/use-toast'
import { ProtectedRoute } from '@/components/protected-route'
import { mockPermissions } from '@/lib/mock-data'
import type { Branch, Department, Role, Permission } from '@/lib/types'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  Building, 
  Shield,
  Loader2, 
  AlertCircle, 
  MapPin,
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
type ViewLevel = 'branches' | 'departments' | 'roles'

interface NavigationState {
  level: ViewLevel
  selectedBranch: Branch | null
  selectedDepartment: Department | null
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
  })

  // Fetch data hooks
  const branchesData = useBranches()
  const departmentsData = useDepartments(nav.selectedBranch?.id)
  const rolesData = useRoles()

  // Filter roles by selected department
  const filteredRoles = nav.selectedDepartment
    ? rolesData.roles.filter(r => r.department_id === nav.selectedDepartment?.id)
    : []

  // Navigation handlers
  const goToBranches = () => setNav({ level: 'branches', selectedBranch: null, selectedDepartment: null })
  const goToDepartments = (branch: Branch) => setNav({ ...nav, level: 'departments', selectedBranch: branch, selectedDepartment: null })
  const goToRoles = (dept: Department) => setNav({ ...nav, level: 'roles', selectedDepartment: dept })

  const goBack = () => {
    if (nav.level === 'roles') {
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
      items.push(<span key="dept" className="text-primary">{nav.selectedDepartment.name}</span>)
    }
    
    return <div className="flex items-center gap-2 text-sm">{items}</div>
  }

  // Render current view
  const renderView = () => {
    switch (nav.level) {
      case 'branches':
        return <BranchesView data={branchesData} onSelect={goToDepartments} />
      case 'departments':
        return <DepartmentsView data={departmentsData} branch={nav.selectedBranch!} onSelect={goToRoles} />
      case 'roles':
        return <RolesView roles={filteredRoles} loading={rolesData.loading} error={rolesData.error} department={nav.selectedDepartment!} fetchRoles={rolesData.fetchRoles} />
    }
  }

  return (
    <div className="flex flex-col">
      <Header 
        title="โครงสร้างองค์กร & บทบาท" 
        description="จัดการสาขา แผนก และตำแหน่ง (Role)" 
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
  const { branches, loading, error, createBranch, updateBranch, deleteBranch } = data
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })

  const resetForm = () => {
    setFormData({ name: '', code: '', location: '', description: '', status: 'active' })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'ข้อผิดพลาด', description: 'กรุณากรอกชื่อสาขา', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const result = await createBranch(formData)
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `สร้างสาขา "${formData.name}" เรียบร้อยแล้ว` })
        setIsCreateOpen(false)
        resetForm()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedBranch) return
    setSubmitting(true)
    try {
      const result = await updateBranch({ ...formData, id: selectedBranch.id })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `อัปเดตสาขา "${formData.name}" เรียบร้อยแล้ว` })
        setIsEditOpen(false)
        setSelectedBranch(null)
        resetForm()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBranch) return
    setSubmitting(true)
    try {
      const result = await deleteBranch(selectedBranch.id)
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `ลบสาขา "${selectedBranch.name}" เรียบร้อยแล้ว` })
        setIsDeleteOpen(false)
        setSelectedBranch(null)
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (e: React.MouseEvent, branch: Branch) => {
    e.stopPropagation()
    setSelectedBranch(branch)
    setFormData({
      name: branch.name,
      code: branch.code || '',
      location: branch.location || '',
      description: branch.description || '',
      status: branch.status
    })
    setIsEditOpen(true)
  }

  const openDelete = (e: React.MouseEvent, branch: Branch) => {
    e.stopPropagation()
    setSelectedBranch(branch)
    setIsDeleteOpen(true)
  }

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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{branches.length} สาขา</Badge>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มสาขา
          </Button>
        </div>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => openEdit(e, branch)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => openDelete(e, branch)}
                      disabled={(branch.department_count || 0) > 0}
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มสาขาใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลสาขาที่ต้องการเพิ่ม</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อสาขา *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น สำนักงานใหญ่" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสสาขา</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="เช่น HQ" />
              </div>
              <div className="space-y-2">
                <Label>ที่ตั้ง</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="เช่น กรุงเทพฯ" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              สร้างสาขา
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขสาขา</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสาขา</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อสาขา *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสสาขา</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ที่ตั้ง</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={formData.status} onValueChange={(v: 'active' | 'inactive') => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ปิด</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
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
              คุณต้องการลบสาขา &quot;{selectedBranch?.name}&quot; หรือไม่?
              {selectedBranch && (selectedBranch.department_count || 0) > 0 && (
                <span className="text-destructive block mt-2">
                  ไม่สามารถลบได้เนื่องจากมีแผนก {selectedBranch.department_count} แผนก กรุณาลบแผนกก่อน
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={submitting || (selectedBranch ? (selectedBranch.department_count || 0) > 0 : false)}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบสาขา
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== Departments View ==========
function DepartmentsView({ data, branch, onSelect }: { 
  data: ReturnType<typeof useDepartments>
  branch: Branch
  onSelect: (dept: Department) => void 
}) {
  const { departments, loading, error, createDepartment, updateDepartment, deleteDepartment } = data
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '', status: 'active' })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'ข้อผิดพลาด', description: 'กรุณากรอกชื่อแผนก', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const result = await createDepartment({ ...formData, branch_id: branch.id })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `สร้างแผนก "${formData.name}" เรียบร้อยแล้ว` })
        setIsCreateOpen(false)
        resetForm()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedDept) return
    setSubmitting(true)
    try {
      const result = await updateDepartment({ ...formData, id: selectedDept.id, branch_id: branch.id })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `อัปเดตแผนก "${formData.name}" เรียบร้อยแล้ว` })
        setIsEditOpen(false)
        setSelectedDept(null)
        resetForm()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDept) return
    setSubmitting(true)
    try {
      const result = await deleteDepartment(selectedDept.id)
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `ลบแผนก "${selectedDept.name}" เรียบร้อยแล้ว` })
        setIsDeleteOpen(false)
        setSelectedDept(null)
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation()
    setSelectedDept(dept)
    setFormData({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      status: dept.status
    })
    setIsEditOpen(true)
  }

  const openDelete = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation()
    setSelectedDept(dept)
    setIsDeleteOpen(true)
  }

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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{departments.length} แผนก</Badge>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มแผนก
          </Button>
        </div>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => openEdit(e, dept)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => openDelete(e, dept)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      ลบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">สถานะ:</span>
                <Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>
                  {dept.status === 'active' ? 'เปิดใช้งาน' : 'ปิด'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มแผนกใหม่</DialogTitle>
            <DialogDescription>สร้างแผนกใหม่ในสาขา {branch.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อแผนก *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น เทคโนโลยีสารสนเทศ" />
            </div>
            <div className="space-y-2">
              <Label>รหัสแผนก</Label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="เช่น IT" />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              สร้างแผนก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขแผนก</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลแผนก</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อแผนก *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>รหัสแผนก</Label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={formData.status} onValueChange={(v: 'active' | 'inactive') => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ปิด</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
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
              คุณต้องการลบแผนก &quot;{selectedDept?.name}&quot; หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>ยกเลิก</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบแผนก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== Roles View ==========
function RolesView({ roles, loading, error, department, fetchRoles }: {
  roles: Role[]
  loading: boolean
  error: string | null
  department: Department
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
        department_id: department.id,
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

  const handleEdit = async () => {
    if (!selectedRole) return
    setSubmitting(true)
    try {
      const result = await updateRole({
        id: selectedRole.id,
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.map(p => p.name),
        department_id: department.id,
        level: formData.level,
        code: formData.code
      })
      if (result.success) {
        toast({ title: 'สำเร็จ', description: `อัปเดตตำแหน่ง "${formData.name}" เรียบร้อยแล้ว` })
        setIsEditOpen(false)
        setSelectedRole(null)
        resetForm()
        fetchRoles()
      } else {
        toast({ title: 'ข้อผิดพลาด', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (role: Role) => {
    setSelectedRole(role)
    const rolePermissions = Array.isArray(role.permissions) 
      ? mockPermissions.filter(p => 
          role.permissions.some((perm: any) => 
            typeof perm === 'string' ? perm === p.name : perm.name === p.name
          )
        )
      : []
    
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: rolePermissions,
      level: role.level || 'staff',
      code: role.code || ''
    })
    setIsEditOpen(true)
  }

  const togglePermission = (permission: Permission, module?: string) => {
    if (module) {
      const modulePerms = groupedPermissions[module]
      const allSelected = modulePerms.every(p => formData.permissions.some(fp => fp.id === p.id))
      setFormData({
        ...formData,
        permissions: allSelected 
          ? formData.permissions.filter(p => p.module !== module)
          : [...formData.permissions.filter(p => p.module !== module), ...modulePerms]
      })
    } else {
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
        <h2 className="text-2xl font-bold">ตำแหน่ง/Role - {department.name}</h2>
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
                      <DropdownMenuItem onClick={() => openEdit(role)}>
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
            <DialogDescription>สร้างตำแหน่งใหม่ในแผนก {department.name}</DialogDescription>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไขตำแหน่ง</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลตำแหน่ง</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อตำแหน่ง *</Label>
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
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                <PermissionSelector selectedPermissions={formData.permissions} onToggle={togglePermission} />
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
