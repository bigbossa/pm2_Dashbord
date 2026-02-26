import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/roles - ดึงรายการ roles ทั้งหมด
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // ตรวจสอบว่ามีตาราง organization hierarchy หรือไม่
    const checkTables = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'branches'
      ) as has_org_tables
    `)
    
    const hasOrgTables = checkTables.rows[0]?.has_org_tables

    let result
    if (hasOrgTables) {
      // ถ้ามีตาราง organization hierarchy แล้ว ใช้ query แบบเต็ม (ใช้ department_id ตรง ไม่ผ่าน sub_departments)
      result = await pool.query(`
        SELECT r.*, 
          COALESCE(uc.user_count, 0)::int as user_count,
          d.name as department_name,
          d.code as department_code,
          b.name as branch_name,
          b.code as branch_code
        FROM roles r
        LEFT JOIN (
          SELECT role_id, COUNT(*) as user_count 
          FROM users 
          GROUP BY role_id
        ) uc ON r.id = uc.role_id
        LEFT JOIN departments d ON r.department_id = d.id
        LEFT JOIN branches b ON d.branch_id = b.id
        ORDER BY b.name NULLS LAST, d.name NULLS LAST, r.name ASC
      `)
    } else {
      // ถ้ายังไม่มี ใช้ query แบบเดิม
      result = await pool.query(`
        SELECT r.*, 
          COALESCE(uc.user_count, 0)::int as user_count
        FROM roles r
        LEFT JOIN (
          SELECT role_id, COUNT(*) as user_count 
          FROM users 
          GROUP BY role_id
        ) uc ON r.id = uc.role_id
        ORDER BY r.created_at ASC
      `)
    }

    return NextResponse.json({ success: true, data: result.rows }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Get roles error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// POST /api/roles - สร้าง role ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const { name, description, permissions, department_id, level, code } = await request.json()

    if (!name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ Role' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // ตรวจสอบว่ามี columns ใหม่หรือไม่
    const checkColumns = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'department_id'
      ) as has_org_columns
    `)
    
    const hasOrgColumns = checkColumns.rows[0]?.has_org_columns
    let result

    if (hasOrgColumns) {
      result = await pool.query(
        `INSERT INTO roles (name, description, permissions, department_id, level, code) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [name, description, JSON.stringify(permissions || []), department_id || null, level || null, code || null]
      )
    } else {
      result = await pool.query(
        `INSERT INTO roles (name, description, permissions) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [name, description, JSON.stringify(permissions || [])]
      )
    }

    // สร้าง activity log
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description, ip_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [session.userId, 'create_role', 'roles', `สร้าง Role ${name}`, ipAddress]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Create role error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// PATCH /api/roles - อัปเดต role
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const { id, name, description, permissions, department_id, level, code } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID Role' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // ตรวจสอบว่ามี columns ใหม่หรือไม่
    const checkColumns = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'department_id'
      ) as has_org_columns
    `)
    
    const hasOrgColumns = checkColumns.rows[0]?.has_org_columns

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
    if (permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`)
      params.push(JSON.stringify(permissions))
    }
    
    // เพิ่ม org columns เฉพาะเมื่อมีในฐานข้อมูล
    if (hasOrgColumns) {
      if (department_id !== undefined) {
        updates.push(`department_id = $${paramIndex++}`)
        params.push(department_id || null)
      }
      if (level !== undefined) {
        updates.push(`level = $${paramIndex++}`)
        params.push(level || null)
      }
      if (code !== undefined) {
        updates.push(`code = $${paramIndex++}`)
        params.push(code || null)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    params.push(id)
    const query = `UPDATE roles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบ Role' }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // สร้าง activity log
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description, ip_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [session.userId, 'update_role', 'roles', `อัปเดต Role ${name || id}`, ipAddress]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// DELETE /api/roles - ลบ role
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
      return NextResponse.json({ success: false, error: 'ไม่พบ ID Role' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // ตรวจสอบว่ามีผู้ใช้ที่ใช้ role นี้อยู่หรือไม่
    const usersWithRole = await pool.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [id])
    
    if (parseInt(usersWithRole.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลบ Role ที่มีผู้ใช้อยู่ได้' },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      )
    }

    const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING name', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบ Role' }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    // สร้าง activity log
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, module, description, ip_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [session.userId, 'delete_role', 'roles', `ลบ Role ${result.rows[0].name}`, ipAddress]
    )

    return NextResponse.json({ success: true }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Delete role error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}
