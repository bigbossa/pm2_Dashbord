import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/organization/branches - ดึงรายการสาขาทั้งหมด
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const result = await pool.query(`
      SELECT b.*, 
        COALESCE(d.dept_count, 0)::int as department_count
      FROM branches b
      LEFT JOIN (
        SELECT branch_id, COUNT(*) as dept_count 
        FROM departments 
        GROUP BY branch_id
      ) d ON b.id = d.branch_id
      ORDER BY b.created_at ASC
    `)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get branches error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/organization/branches - สร้างสาขาใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { name, code, location, description } = await request.json()

    if (!name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อสาขา' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO branches (name, code, location, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, code, location, description]
    )

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'create', 'branches', `สร้างสาขา ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Create branch error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'รหัสสาขานี้มีอยู่แล้ว' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// PATCH /api/organization/branches - อัปเดตสาขา
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { id, name, code, location, description, status } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID สาขา' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE branches 
       SET name = $1, code = $2, location = $3, description = $4, status = $5
       WHERE id = $6 
       RETURNING *`,
      [name, code, location, description, status || 'active', id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบสาขา' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'update', 'branches', `อัปเดตสาขา ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Update branch error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'รหัสสาขานี้มีอยู่แล้ว' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// DELETE /api/organization/branches - ลบสาขา
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID สาขา' }, { status: 400 })
    }

    // ตรวจสอบว่ามีแผนกภายใต้สาขานี้หรือไม่
    const deptCheck = await pool.query('SELECT COUNT(*) FROM departments WHERE branch_id = $1', [id])
    if (parseInt(deptCheck.rows[0].count) > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่สามารถลบสาขาที่มีแผนกอยู่ กรุณาลบแผนกก่อน' 
      }, { status: 400 })
    }

    const result = await pool.query(
      'DELETE FROM branches WHERE id = $1 RETURNING name',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบสาขา' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'delete', 'branches', `ลบสาขา ${result.rows[0].name}`]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete branch error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
