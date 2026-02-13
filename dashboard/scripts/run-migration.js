// Script สำหรับรัน Organization Hierarchy Migration
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'usermanagementsystem',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25800852',
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 เริ่มรัน Organization Hierarchy Migration...\n')
    
    // อ่าน SQL file
    const sqlPath = path.join(__dirname, 'add-organization-hierarchy.sql')
    console.log(`📄 อ่านไฟล์: ${sqlPath}\n`)
    
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // รัน migration
    console.log('⚙️  กำลังสร้างตารางและข้อมูล...\n')
    await client.query(sql)
    
    console.log('✅ Migration สำเร็จ!\n')
    
    // ตรวจสอบข้อมูลที่สร้าง
    console.log('📊 ตรวจสอบข้อมูล:')
    console.log('=' .repeat(70))
    
    const branchCount = await client.query('SELECT COUNT(*) FROM branches')
    console.log(`   สาขา: ${branchCount.rows[0].count} รายการ`)
    
    const deptCount = await client.query('SELECT COUNT(*) FROM departments')
    console.log(`   แผนก: ${deptCount.rows[0].count} รายการ`)
    
    const subdeptCount = await client.query('SELECT COUNT(*) FROM sub_departments')
    console.log(`   แผนกย่อย: ${subdeptCount.rows[0].count} รายการ`)
    
    const roleCount = await client.query('SELECT COUNT(*) FROM roles WHERE sub_department_id IS NOT NULL')
    console.log(`   ตำแหน่ง (มี sub_dept): ${roleCount.rows[0].count} รายการ\n`)
    
    // แสดงข้อมูลตัวอย่าง
    console.log('📋 ข้อมูลตัวอย่าง:')
    console.log('=' .repeat(70))
    
    const sample = await client.query(`
      SELECT 
        b.name as branch,
        d.name as department,
        sd.name as sub_department
      FROM branches b
      LEFT JOIN departments d ON d.branch_id = b.id
      LEFT JOIN sub_departments sd ON sd.department_id = d.id
      ORDER BY b.name, d.name, sd.name
      LIMIT 10
    `)
    
    sample.rows.forEach(row => {
      if (row.department && row.sub_department) {
        console.log(`   ${row.branch} → ${row.department} → ${row.sub_department}`)
      } else if (row.department) {
        console.log(`   ${row.branch} → ${row.department}`)
      } else {
        console.log(`   ${row.branch}`)
      }
    })
    
    console.log('=' .repeat(70))
    console.log('\n✨ พร้อมใช้งานระบบ Organization Hierarchy!\n')
    
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
runMigration().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
