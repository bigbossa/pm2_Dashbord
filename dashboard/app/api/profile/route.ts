import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      )
    }

    const result = await pool.query(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [session.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      )
    }

    const user = result.rows[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role_id: user.role_id,
        status: user.status,
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      role: user.role_id ? {
        id: user.role_id,
        name: user.role_name,
        permissions: Array.isArray(user.permissions) ? user.permissions : []
      } : null
    })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      )
    }

    const { full_name, email } = await request.json()

    if (!full_name || !email) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, session.userId]
    )

    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 409 }
      )
    }

    const client = await pool.connect()
    try {
      // อัปเดตข้อมูล
      await client.query(
        `UPDATE users 
         SET full_name = $1, email = $2, updated_at = NOW() 
         WHERE id = $3`,
        [full_name, email, session.userId]
      )

      // Log activity
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          session.userId,
          'UPDATE',
          'User updated profile',
          request.headers.get('x-forwarded-for') || 'unknown'
        ]
      )

      return NextResponse.json({
        success: true,
        message: 'อัปเดตข้อมูลโปรไฟล์สำเร็จ'
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
