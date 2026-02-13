import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/organization/departments - ดึงรายการแผนกทั้งหมด (หรือตาม branch_id)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')

    let query = `
      SELECT d.*, 
        b.name as branch_name,
        b.code as branch_code,
        COALESCE(sd.subdept_count, 0)::int as sub_department_count
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN (
        SELECT department_id, COUNT(*) as subdept_count 
        FROM sub_departments 
        GROUP BY department_id
      ) sd ON d.id = sd.department_id
    `
    const params: any[] = []

    if (branchId) {
      query += ' WHERE d.branch_id = $1'
      params.push(branchId)
    }

    query += ' ORDER BY d.created_at ASC'

    const result = await pool.query(query, params)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get departments error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/organization/departments - สร้างแผนกใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { branch_id, name, code, description } = await request.json()

    if (!name || !branch_id) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อแผนกและเลือกสาขา' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO departments (branch_id, name, code, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [branch_id, name, code, description]
    )

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'create', 'departments', `สร้างแผนก ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Create department error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'รหัสแผนกนี้มีอยู่แล้วในสาขานี้' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// PATCH /api/organization/departments - อัปเดตแผนก
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { id, branch_id, name, code, description, status } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID แผนก' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE departments 
       SET branch_id = $1, name = $2, code = $3, description = $4, status = $5
       WHERE id = $6 
       RETURNING *`,
      [branch_id, name, code, description, status || 'active', id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนก' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'update', 'departments', `อัปเดตแผนก ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Update department error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'รหัสแผนกนี้มีอยู่แล้วในสาขานี้' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// DELETE /api/organization/departments - ลบแผนก
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID แผนก' }, { status: 400 })
    }

    // ตรวจสอบว่ามีแผนกย่อยภายใต้แผนกนี้หรือไม่
    const subdeptCheck = await pool.query('SELECT COUNT(*) FROM sub_departments WHERE department_id = $1', [id])
    if (parseInt(subdeptCheck.rows[0].count) > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่สามารถลบแผนกที่มีแผนกย่อยอยู่ กรุณาลบแผนกย่อยก่อน' 
      }, { status: 400 })
    }

    const result = await pool.query(
      'DELETE FROM departments WHERE id = $1 RETURNING name',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนก' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'delete', 'departments', `ลบแผนก ${result.rows[0].name}`]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete department error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
