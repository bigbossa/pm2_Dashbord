import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/organization/sub-departments - ดึงรายการแผนกย่อยทั้งหมด (หรือตาม department_id)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('department_id')

    let query = `
      SELECT sd.*, 
        d.name as department_name,
        d.code as department_code,
        b.name as branch_name,
        b.code as branch_code,
        COALESCE(r.role_count, 0)::int as role_count
      FROM sub_departments sd
      LEFT JOIN departments d ON sd.department_id = d.id
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN (
        SELECT sub_department_id, COUNT(*) as role_count 
        FROM roles 
        WHERE sub_department_id IS NOT NULL
        GROUP BY sub_department_id
      ) r ON sd.id = r.sub_department_id
    `
    const params: any[] = []

    if (departmentId) {
      query += ' WHERE sd.department_id = $1'
      params.push(departmentId)
    }

    query += ' ORDER BY sd.created_at ASC'

    const result = await pool.query(query, params)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get sub-departments error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/organization/sub-departments - สร้างแผนกย่อยใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { department_id, name, code, description } = await request.json()

    if (!name || !department_id) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อแผนกย่อยและเลือกแผนก' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO sub_departments (department_id, name, code, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [department_id, name, code, description]
    )

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'create', 'sub_departments', `สร้างแผนกย่อย ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Create sub-department error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'รหัสแผนกย่อยนี้มีอยู่แล้วในแผนกนี้' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// PATCH /api/organization/sub-departments - อัปเดตแผนกย่อย
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { id, department_id, name, code, description, status } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID แผนกย่อย' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE sub_departments 
       SET department_id = $1, name = $2, code = $3, description = $4, status = $5
       WHERE id = $6 
       RETURNING *`,
      [department_id, name, code, description, status || 'active', id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนกย่อย' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'update', 'sub_departments', `อัปเดตแผนกย่อย ${name}`]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Update sub-department error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'รหัสแผนกย่อยนี้มีอยู่แล้วในแผนกนี้' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// DELETE /api/organization/sub-departments - ลบแผนกย่อย
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID แผนกย่อย' }, { status: 400 })
    }

    // ตรวจสอบว่ามีตำแหน่ง (roles) ภายใต้แผนกย่อยนี้หรือไม่
    const roleCheck = await pool.query('SELECT COUNT(*) FROM roles WHERE sub_department_id = $1', [id])
    if (parseInt(roleCheck.rows[0].count) > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่สามารถลบแผนกย่อยที่มีตำแหน่งอยู่ กรุณาลบตำแหน่งหรือย้ายตำแหน่งก่อน' 
      }, { status: 400 })
    }

    const result = await pool.query(
      'DELETE FROM sub_departments WHERE id = $1 RETURNING name',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนกย่อย' }, { status: 404 })
    }

    // สร้าง activity log
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description) 
       VALUES ($1, $2, $3, $4)`,
      [session.userId, 'delete', 'sub_departments', `ลบแผนกย่อย ${result.rows[0].name}`]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete sub-department error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
