import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import pool from '@/lib/db'
import { createToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      )
    }

    // หาผู้ใช้จากฐานข้อมูล
    const result = await pool.query(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.username = $1`,
      [username]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    const user = result.rows[0]

    // ตรวจสอบสถานะผู้ใช้
    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'บัญชีถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      )
    }

    if (user.status === 'inactive') {
      return NextResponse.json(
        { success: false, error: 'บัญชีไม่ได้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      )
    }

    // ตรวจสอบรหัสผ่าน
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // อัปเดต last_login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'login', 'auth', `ผู้ใช้ ${username} เข้าสู่ระบบ`]
    )

    // สร้าง JWT token
    const token = await createToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.role_id,
    })

    // ตั้งค่า cookie
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role_id: user.role_id,
        role_name: user.role_name,
        status: user.status,
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      role: {
        id: user.role_id,
        name: user.role_name,
        permissions: user.permissions,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    )
  }
}
