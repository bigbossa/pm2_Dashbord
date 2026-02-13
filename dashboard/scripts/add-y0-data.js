// Script สำหรับเพิ่มข้อมูล Organization Hierarchy
// สาขา Y0 -> แผนก เทคโนโลยีสารสนเทศ -> แผนกย่อย ทีม Dev -> ตำแหน่ง หัวหน้าแผนก

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'usermanagementsystem',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25800852',
})

async function addY0Branch() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 เริ่มเพิ่มข้อมูล Organization Hierarchy...\n')

    // 1. สร้างสาขา Y0
    console.log('1️⃣ กำลังสร้างสาขา Y0...')
    const branchResult = await client.query(`
      INSERT INTO branches (name, code, location, description, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name
      RETURNING id, name, code
    `, ['สาขา Y0', 'Y0', 'กรุงเทพมหานคร', 'สาขาหลัก Y0', 'active'])
    
    const branchId = branchResult.rows[0].id
    console.log(`   ✅ สร้างสาขา: ${branchResult.rows[0].name} (${branchResult.rows[0].code})\n`)

    // 2. สร้างแผนก เทคโนโลยีสารสนเทศ
    console.log('2️⃣ กำลังสร้างแผนก เทคโนโลยีสารสนเทศ...')
    const deptResult = await client.query(`
      INSERT INTO departments (branch_id, name, code, description, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (branch_id, code) DO UPDATE 
        SET name = EXCLUDED.name
      RETURNING id, name, code
    `, [branchId, 'เทคโนโลยีสารสนเทศ', 'IT-Y0', 'แผนกเทคโนโลยีสารสนเทศ', 'active'])
    
    const deptId = deptResult.rows[0].id
    console.log(`   ✅ สร้างแผนก: ${deptResult.rows[0].name} (${deptResult.rows[0].code})\n`)

    // 3. สร้างแผนกย่อย ทีม Dev
    console.log('3️⃣ กำลังสร้างแผนกย่อย ทีม Dev...')
    const subdeptResult = await client.query(`
      INSERT INTO sub_departments (department_id, name, code, description, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (department_id, code) DO UPDATE 
        SET name = EXCLUDED.name
      RETURNING id, name, code
    `, [deptId, 'ทีม Dev', 'DEV-Y0', 'ทีมพัฒนาซอฟต์แวร์', 'active'])
    
    const subdeptId = subdeptResult.rows[0].id
    console.log(`   ✅ สร้างแผนกย่อย: ${subdeptResult.rows[0].name} (${subdeptResult.rows[0].code})\n`)

    // 4. สร้างตำแหน่ง หัวหน้าแผนก
    console.log('4️⃣ กำลังสร้างตำแหน่ง หัวหน้าแผนก Dev...')
    
    // ตรวจสอบว่ามี role นี้อยู่แล้วหรือไม่
    const existingRole = await client.query(
      'SELECT id, name FROM roles WHERE name = $1',
      ['หัวหน้าแผนก Dev Y0']
    )

    let roleResult
    if (existingRole.rows.length > 0) {
      // อัปเดต role ที่มีอยู่
      roleResult = await client.query(`
        UPDATE roles 
        SET description = $1, sub_department_id = $2, level = $3, code = $4, 
            permissions = $5, updated_at = NOW()
        WHERE name = $6
        RETURNING id, name, code, level
      `, [
        'หัวหน้าแผนกพัฒนาซอฟต์แวร์ สาขา Y0',
        subdeptId,
        'manager',
        'MGR-DEV-Y0',
        JSON.stringify(['users:read', 'users:write', 'roles:read', 'apps:read', 'logs:read', 'profile:read', 'profile:write']),
        'หัวหน้าแผนก Dev Y0'
      ])
      console.log(`   ✅ อัปเดตตำแหน่ง: ${roleResult.rows[0].name} (${roleResult.rows[0].code})`)
    } else {
      // สร้างใหม่
      roleResult = await client.query(`
        INSERT INTO roles (name, description, sub_department_id, level, code, permissions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, code, level
      `, [
        'หัวหน้าแผนก Dev Y0',
        'หัวหน้าแผนกพัฒนาซอฟต์แวร์ สาขา Y0',
        subdeptId,
        'manager',
        'MGR-DEV-Y0',
        JSON.stringify(['users:read', 'users:write', 'roles:read', 'apps:read', 'logs:read', 'profile:read', 'profile:write'])
      ])
      console.log(`   ✅ สร้างตำแหน่ง: ${roleResult.rows[0].name} (${roleResult.rows[0].code})`)
    }

    // แสดงผลลัพธ์
    console.log('\n📊 ผลลัพธ์:')
    console.log('=' .repeat(70))
    const result = await client.query(`
      SELECT 
        b.name as branch,
        d.name as department,
        sd.name as sub_department,
        r.name as role,
        r.level,
        r.code
      FROM branches b
      LEFT JOIN departments d ON d.branch_id = b.id
      LEFT JOIN sub_departments sd ON sd.department_id = d.id
      LEFT JOIN roles r ON r.sub_department_id = sd.id
      WHERE b.code = 'Y0'
      ORDER BY b.name, d.name, sd.name, r.name
    `)

    result.rows.forEach(row => {
      console.log(`
  สาขา:        ${row.branch}
  แผนก:        ${row.department || '-'}
  แผนกย่อย:    ${row.sub_department || '-'}
  ตำแหน่ง:     ${row.role || '-'}
  ระดับ:       ${row.level || '-'}
  รหัส:        ${row.code || '-'}
      `)
    })

    console.log('=' .repeat(70))
    console.log('\n✨ เพิ่มข้อมูลสำเร็จ!\n')

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run
addY0Branch().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
