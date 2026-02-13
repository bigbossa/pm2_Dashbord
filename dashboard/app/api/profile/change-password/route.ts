import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      )
    }

    const { current_password, new_password } = await request.json()

    if (!current_password || !new_password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      // ดึงข้อมูลผู้ใช้
      const userResult = await client.query(
        'SELECT id, username, password FROM users WHERE id = $1',
        [session.userId]
      )

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
          { status: 404 }
        )
      }

      const user = userResult.rows[0]

      // ตรวจสอบรหัสผ่านปัจจุบัน
      const isPasswordValid = await bcrypt.compare(current_password, user.password)

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
          { status: 401 }
        )
      }

      // เข้ารหัสรหัสผ่านใหม่
      const hashedPassword = await bcrypt.hash(new_password, 10)

      // อัปเดตรหัสผ่าน
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, session.userId]
      )

      // Log activity
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          session.userId,
          'UPDATE',
          'User changed password',
          request.headers.get('x-forwarded-for') || 'unknown'
        ]
      )

      return NextResponse.json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ'
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
