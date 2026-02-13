"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Save, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Lock
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function ProfilePageContent() {
  const { user, role, hasPermission } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const canEditProfile = hasPermission('profile:write')

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'สำเร็จ',
          description: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว',
        })
        setIsEditing(false)
      } else {
        toast({
          title: 'ข้อผิดพลาด',
          description: result.error || 'ไม่สามารถบันทึกข้อมูลได้',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'รหัสผ่านใหม่ไม่ตรงกัน',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.new_password.length < 6) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'สำเร็จ',
          description: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
        })
        setShowPasswordDialog(false)
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        })
      } else {
        toast({
          title: 'ข้อผิดพลาด',
          description: result.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'ไม่ทราบ'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header 
        title="โปรไฟล์ของฉัน" 
        description="จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี" 
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* ข้อมูลโปรไฟล์ */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      ข้อมูลส่วนตัว
                    </CardTitle>
                    <CardDescription>แก้ไขข้อมูลส่วนตัวของคุณ</CardDescription>
                  </div>
                  {canEditProfile && (
                    <Button
                      variant={isEditing ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'ยกเลิก' : 'แก้ไข'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">ชื่อผู้ใช้</Label>
                  <Input
                    id="username"
                    value={user.username || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    ชื่อผู้ใช้ไม่สามารถเปลี่ยนแปลงได้
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="กรอกชื่อ-นามสกุล"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      className="pl-9"
                      placeholder="example@email.com"
                    />
                  </div>
                </div>

                {isEditing && canEditProfile && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          บันทึกการเปลี่ยนแปลง
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* เปลี่ยนรหัสผ่าน */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  ความปลอดภัย
                </CardTitle>
                <CardDescription>จัดการรหัสผ่านและความปลอดภัยของบัญชี</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <Key className="mr-2 h-4 w-4" />
                  เปลี่ยนรหัสผ่าน
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ข้อมูล Role และ Permissions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  บทบาทและสิทธิ์
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">บทบาท</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {role?.name || 'ไม่มีบทบาท'}
                    </Badge>
                  </div>
                  {role?.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-sm text-muted-foreground">สิทธิ์การเข้าถึง</Label>
                  <div className="mt-2 space-y-1">
                    {role?.permissions && Array.isArray(role.permissions) && role.permissions.length > 0 ? (
                      <div className="space-y-1">
                        {role.permissions.map((permission, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-muted-foreground">{permission}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        <span>ไม่มีสิทธิ์พิเศษ</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ข้อมูลบัญชี</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">สร้างเมื่อ</p>
                    <p className="text-xs font-medium">{formatDate(user.created_at)}</p>
                  </div>
                </div>
                {user.last_login && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">เข้าสู่ระบบล่าสุด</p>
                      <p className="text-xs font-medium">{formatDate(user.last_login)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog เปลี่ยนรหัสผ่าน */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
            <DialogDescription>
              กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">รหัสผ่านปัจจุบัน</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">รหัสผ่านใหม่</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              disabled={isChangingPassword}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเปลี่ยนรหัสผ่าน...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  เปลี่ยนรหัสผ่าน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute requiredPermissions={['profile:read']}>
      <ProfilePageContent />
    </ProtectedRoute>
  )
}
