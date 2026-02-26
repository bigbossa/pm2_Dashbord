import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import pool from '@/lib/db'
import { createToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, full_name } = await request.json()

    if (!email || !username || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามี email หรือ username ซ้ำหรือไม่
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' },
        { status: 409 }
      )
    }

    // เข้ารหัสรหัสผ่าน
    const passwordHash = await bcrypt.hash(password, 10)

    // หา role_id ของ 'user' (default role)
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = 'user'"
    )

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ role เริ่มต้น' },
        { status: 500 }
      )
    }

    const roleId = roleResult.rows[0].id

    // สร้างผู้ใช้ใหม่
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, full_name, role_id, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') 
       RETURNING id, email, username, full_name, role_id, status, created_at, updated_at`,
      [email, username, passwordHash, full_name, roleId]
    )

    const newUser = result.rows[0]

    // สร้าง activity log
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description, ip_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [newUser.id, 'register', 'auth', `ผู้ใช้ ${username} สมัครสมาชิกใหม่`, ipAddress]
    )

    // หาข้อมูล role
    const roleDataResult = await pool.query(
      'SELECT name, permissions FROM roles WHERE id = $1',
      [roleId]
    )
    const roleData = roleDataResult.rows[0]

    // สร้าง JWT token
    const token = await createToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      roleId: newUser.role_id,
    })

    // ตั้งค่า cookie
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        role_name: roleData.name,
      },
      role: {
        id: roleId,
        name: roleData.name,
        permissions: roleData.permissions,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    )
  }
}
