"use client"

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, ArrowLeft, Home, LogOut } from 'lucide-react'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            ไม่มีสิทธิ์เข้าถึง
          </CardTitle>
          <CardDescription>
            คุณไม่มีสิทธิ์เข้าถึงหน้าเว็บนี้
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>
              หากคุณต้องการเข้าถึงส่วนนี้ กรุณาติดต่อผู้ดูแลระบบ
            </p>
            {user && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p><span className="font-medium">ผู้ใช้:</span> {user.username}</p>
                <p><span className="font-medium">อีเมล:</span> {user.email}</p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleGoBack}
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              ย้อนกลับ
            </Button>
            
            <Button 
              onClick={handleGoHome}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              ไปหน้าหลัก
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              ออกจากระบบ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}