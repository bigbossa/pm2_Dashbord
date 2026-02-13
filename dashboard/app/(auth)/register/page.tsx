"use client"

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Loader2, Eye, EyeOff, Check, X } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const passwordRequirements = [
    { label: 'อย่างน้อย 8 ตัวอักษร', met: formData.password.length >= 8 },
    { label: 'มีตัวพิมพ์ใหญ่', met: /[A-Z]/.test(formData.password) },
    { label: 'มีตัวพิมพ์เล็ก', met: /[a-z]/.test(formData.password) },
    { label: 'มีตัวเลข', met: /[0-9]/.test(formData.password) },
  ]

  const isPasswordValid = passwordRequirements.every(req => req.met)
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid) {
      setError('รหัสผ่านไม่ตรงตามเงื่อนไข')
      return
    }

    if (!doPasswordsMatch) {
      setError('รหัสผ���านไม่ตรงกัน')
      return
    }

    setIsLoading(true)

    try {
      const result = await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
      })
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">ระบบจัดการผู้ใช้งาน</p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">สมัครสมาชิก</CardTitle>
            <CardDescription>
              กรอกข้อมูลเพื่อสร้างบัญชีใหม่
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="สมชาย ใจดี"
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="somchai"
                  value={formData.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  required
                  disabled={isLoading}
                />
                {formData.confirmPassword && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    {doPasswordsMatch ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">รหัสผ่านตรงกัน</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">รหัสผ่านไม่ตรงกัน</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                สมัครสมาชิก
              </Button>
              
              <p className="text-sm text-center text-muted-foreground">
                มีบัญชีอยู่แล้ว?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
