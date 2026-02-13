import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/activity-logs - ดึงรายการ activity logs
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const module = searchParams.get('module')
    const action = searchParams.get('action')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    // Build WHERE conditions
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (module) {
      conditions.push(`a.module = $${paramIndex++}`)
      params.push(module)
    }
    if (action) {
      // ใช้ LIKE เพื่อให้ filter 'update' จับได้ทั้ง 'update', 'update_profile', 'update_role' ฯลฯ
      conditions.push(`LOWER(a.action) LIKE LOWER($${paramIndex++})`)
      params.push(`${action}%`)
    }
    if (search) {
      conditions.push(`(u.full_name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT a.*, u.username, u.full_name, u.email
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Map rows เพื่อรวม user info
    const data = result.rows.map((row: any) => ({
      ...row,
      user: row.username ? {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        email: row.email,
      } : null,
    }))

    // นับจำนวนทั้งหมด
    const countQuery = `SELECT COUNT(*) FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id ${whereClause}`
    const countParams = params.slice(0, params.length - 2) // ไม่ใช้ limit, offset
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    // สถิติรวม (ไม่ filter)
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE LOWER(action) = 'login') as logins,
        COUNT(*) FILTER (WHERE LOWER(action) LIKE 'create%' OR LOWER(action) LIKE 'update%' OR LOWER(action) LIKE 'delete%') as changes
      FROM activity_logs
    `)
    const stats = statsResult.rows[0]

    return NextResponse.json({
      success: true,
      data,
      total: parseInt(total.toString()),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: parseInt(stats.total),
        today: parseInt(stats.today),
        logins: parseInt(stats.logins),
        changes: parseInt(stats.changes),
      },
    })
  } catch (error) {
    console.error('Get activity logs error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
