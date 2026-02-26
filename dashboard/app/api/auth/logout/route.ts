import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // ดึงข้อมูล session ก่อน logout
    const session = await getSession()
    
    if (session) {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, module, description, ip_address) 
         VALUES ($1, $2, $3, $4, $5)`,
        [session.userId, 'logout', 'auth', `ผู้ใช้ ${session.username} ออกจากระบบ`, ipAddress]
      )
    }

    await clearSessionCookie()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
      { status: 500 }
    )
  }
}
