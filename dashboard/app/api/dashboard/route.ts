import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// GET /api/dashboard - ดึงข้อมูลสรุปสำหรับ Dashboard
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    // ดึงข้อมูลสรุปทั้งหมดพร้อมกัน
    const [statsResult, recentActivityResult, activeUsersResult] = await Promise.all([
      // สถิติรวม
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users)::int as total_users,
          (SELECT COUNT(*) FROM roles)::int as total_roles,
          (SELECT COUNT(*) FROM activity_logs WHERE created_at >= CURRENT_DATE)::int as today_activities,
          (SELECT COUNT(*) FROM apps WHERE status = 'active')::int as active_apps
      `),
      // กิจกรรมล่าสุด 5 รายการ
      pool.query(`
        SELECT a.*, u.username, u.full_name, u.email
        FROM activity_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 5
      `),
      // ผู้ใช้ที่ active 5 คนล่าสุด
      pool.query(`
        SELECT u.id, u.email, u.username, u.full_name, u.role_id, u.status, u.last_login,
               r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.status = 'active'
        ORDER BY u.last_login DESC NULLS LAST
        LIMIT 5
      `),
    ])

    const stats = statsResult.rows[0]

    const recentActivities = recentActivityResult.rows.map((row: any) => ({
      ...row,
      user: row.username ? {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        email: row.email,
      } : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers: stats.total_users,
          totalRoles: stats.total_roles,
          todayActivities: stats.today_activities,
          activeApps: stats.active_apps,
        },
        recentActivities,
        activeUsers: activeUsersResult.rows,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
