import { NextResponse } from 'next/server'
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

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
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
    console.error('Get session error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}
