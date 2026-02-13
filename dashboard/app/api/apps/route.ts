import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/apps - ดึงรายการ apps ทั้งหมด
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const result = await pool.query('SELECT * FROM apps ORDER BY created_at DESC')

    return NextResponse.json({ success: true, data: result.rows }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Get apps error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// POST /api/apps - สร้าง app ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const { name, description, icon, url, status, allowed_roles } = await request.json()

    if (!name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ App' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const result = await pool.query(
      `INSERT INTO apps (name, description, icon, url, status, allowed_roles) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, description, icon, url, status || 'active', allowed_roles || []]
    )

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'create_app', 'apps', `สร้าง App ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Create app error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// PATCH /api/apps - อัปเดต app
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const { id, name, description, icon, url, status, allowed_roles } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID App' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(description)
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`)
      params.push(icon)
    }
    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`)
      params.push(url)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (allowed_roles !== undefined) {
      updates.push(`allowed_roles = $${paramIndex++}`)
      params.push(allowed_roles)
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    params.push(id)
    const query = `UPDATE apps SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบ App' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'update_app', 'apps', `อัปเดต App ${name || id}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Update app error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// DELETE /api/apps - ลบ app
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID App' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const result = await pool.query('DELETE FROM apps WHERE id = $1 RETURNING name', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบ App' }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'delete_app', 'apps', `ลบ App ${result.rows[0].name}`]
    )

    return NextResponse.json({ success: true }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Delete app error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
