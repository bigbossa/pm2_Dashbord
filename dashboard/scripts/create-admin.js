// Script สำหรับสร้างบัญชีแอดมินตัวอย่าง
const { Pool } = require('pg')
const bcrypt = require('bcrypt')

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'usermanagementsystem',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25800852',
})

async function createAdminAccount() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 เริ่มสร้างบัญชีแอดมิน...\n')

    // 1. สร้าง Admin Role ถ้ายังไม่มี
    console.log('1️⃣ ตรวจสอบ/สร้าง Admin Role...')
    
    const existingRole = await client.query(
      "SELECT id, name FROM roles WHERE name = 'Admin'"
    )

    let adminRoleId
    if (existingRole.rows.length > 0) {
      adminRoleId = existingRole.rows[0].id
      console.log(`   ✅ พบ Admin Role อยู่แล้ว (ID: ${adminRoleId})`)
      
      // อัปเดตสิทธิ์ให้ครบถ้วน
      await client.query(`
        UPDATE roles 
        SET permissions = $1, 
            description = 'ผู้ดูแลระบบ - มีสิทธิ์เข้าถึงทุกส่วน',
            updated_at = NOW()
        WHERE id = $2
      `, [
        JSON.stringify([
          'users:read', 'users:write', 'users:delete',
          'roles:read', 'roles:write', 'roles:delete',
          'logs:read',
          'apps:read', 'apps:write', 'apps:delete',
          'profile:read', 'profile:write'
        ]),
        adminRoleId
      ])
      console.log('   ✅ อัปเดตสิทธิ์ Admin Role เรียบร้อย')
    } else {
      const roleResult = await client.query(`
        INSERT INTO roles (name, description, permissions)
        VALUES ($1, $2, $3)
        RETURNING id, name
      `, [
        'Admin',
        'ผู้ดูแลระบบ - มีสิทธิ์เข้าถึงทุกส่วน',
        JSON.stringify([
          'users:read', 'users:write', 'users:delete',
          'roles:read', 'roles:write', 'roles:delete',
          'logs:read',
          'apps:read', 'apps:write', 'apps:delete',
          'profile:read', 'profile:write'
        ])
      ])
      adminRoleId = roleResult.rows[0].id
      console.log(`   ✅ สร้าง Admin Role สำเร็จ (ID: ${adminRoleId})`)
    }

    console.log()

    // 2. สร้างผู้ใช้ Admin
    console.log('2️⃣ สร้างผู้ใช้ Admin...')
    
    const adminUsername = 'admin'
    const adminPassword = 'admin123'
    const adminEmail = 'admin@system.local'
    const adminFullName = 'System Administrator'

    // ตรวจสอบว่ามีผู้ใช้ admin อยู่แล้วหรือไม่
    const existingUser = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      [adminUsername]
    )

    if (existingUser.rows.length > 0) {
      console.log(`   ⚠️  มีผู้ใช้ "${adminUsername}" อยู่แล้ว`)
      
      // อัปเดตรหัสผ่านและ role
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      await client.query(`
        UPDATE users 
        SET password_hash = $1, role_id = $2, status = 'active', updated_at = NOW()
        WHERE username = $3
      `, [hashedPassword, adminRoleId, adminUsername])
      
      console.log(`   ✅ อัปเดตข้อมูลผู้ใช้ admin เรียบร้อย`)
      console.log(`      - รีเซ็ตรหัสผ่าน: ${adminPassword}`)
      console.log(`      - อัปเดต role: Admin`)
    } else {
      // สร้างผู้ใช้ใหม่
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role_id, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING id, username, email, full_name
      `, [adminUsername, adminEmail, hashedPassword, adminFullName, adminRoleId])
      
      console.log(`   ✅ สร้างผู้ใช้ admin สำเร็จ`)
      console.log(`      - ID: ${userResult.rows[0].id}`)
      console.log(`      - Username: ${userResult.rows[0].username}`)
      console.log(`      - Email: ${userResult.rows[0].email}`)
      console.log(`      - Full Name: ${userResult.rows[0].full_name}`)
    }

    console.log()

    // 3. แสดงข้อมูลสรุป
    console.log('=' .repeat(70))
    console.log('✨ สร้างบัญชีแอดมินสำเร็จ!')
    console.log('=' .repeat(70))
    console.log()
    console.log('📋 ข้อมูลสำหรับเข้าสู่ระบบ:')
    console.log(`   Username: ${adminUsername}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   Email:    ${adminEmail}`)
    console.log()
    console.log('🔐 สิทธิ์การใช้งาน: สิทธิ์เต็ม (Admin)')
    console.log('   ✅ จัดการผู้ใช้ (เพิ่ม/แก้ไข/ลบ)')
    console.log('   ✅ จัดการ Role (เพิ่ม/แก้ไข/ลบ)')
    console.log('   ✅ ดู Activity Logs')
    console.log('   ✅ จัดการแอพ (เพิ่ม/แก้ไข/ลบ)')
    console.log('   ✅ จัดการโปรไฟล์')
    console.log()
    console.log('🌐 เข้าสู่ระบบที่: http://localhost:3000/auth/login')
    console.log('=' .repeat(70))
    console.log()

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
    console.error('\nรายละเอียด:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run
createAdminAccount().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
