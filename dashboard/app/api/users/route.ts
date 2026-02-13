import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import bcrypt from 'bcrypt'

// GET /api/users - ดึงรายการผู้ใช้ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    let query = `
      SELECT u.*, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `
    const params: any[] = []

    if (search) {
      query += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR u.full_name ILIKE $1`
      params.push(`%${search}%`)
      query += ` ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`
      params.push(limit, offset)
    } else {
      query += ` ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`
      params.push(limit, offset)
    }

    const result = await pool.query(query, params)

    // นับจำนวนทั้งหมด
    const countQuery = search
      ? `SELECT COUNT(*) FROM users WHERE username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1`
      : `SELECT COUNT(*) FROM users`
    const countParams = search ? [`%${search}%`] : []
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      success: true,
      data: result.rows.map(user => ({
        ...user,
        password_hash: undefined, // ไม่ส่ง password hash ไปที่ client
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/users - สร้างผู้ใช้ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { email, username, password, full_name, role_id, status } = await request.json()

    if (!email || !username || !password || !full_name || !role_id) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามีผู้ใช้ซ้ำหรือไม่
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

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, full_name, role_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, username, full_name, role_id, status, created_at, updated_at`,
      [email, username, passwordHash, full_name, role_id, status || 'active']
    )

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'create_user', 'users', `สร้างผู้ใช้ ${username}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// PATCH /api/users - อัปเดตผู้ใช้
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { id, email, username, full_name, role_id, status, password } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้' }, { status: 400 })
    }

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      params.push(email)
    }
    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`)
      params.push(username)
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`)
      params.push(full_name)
    }
    if (role_id !== undefined) {
      updates.push(`role_id = $${paramIndex++}`)
      params.push(role_id)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updates.push(`password_hash = $${paramIndex++}`)
      params.push(passwordHash)
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 })
    }

    params.push(id)
    const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, email, username, full_name, role_id, status, created_at, updated_at`

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'update_user', 'users', `อัปเดตผู้ใช้ ${username || id}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// DELETE /api/users - ลบผู้ใช้
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้' }, { status: 400 })
    }

    // ห้ามลบตัวเอง
    if (id === session.userId) {
      return NextResponse.json({ success: false, error: 'ไม่สามารถลบบัญชีตัวเองได้' }, { status: 400 })
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING username', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'delete_user', 'users', `ลบผู้ใช้ ${result.rows[0].username}`]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
