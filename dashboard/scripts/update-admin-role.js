const { Pool } = require('pg')

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'usermanagementsystem',
  user: 'postgres',
  password: '25800852'
})

async function main() {
  try {
    const result = await pool.query(
      `UPDATE roles 
       SET name = $1, 
           description = $2, 
           permissions = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING id, name, description, permissions`,
      [
        'Administrator',
        'ผู้ดูแลระบบสูงสุด มีสิทธิ์เข้าถึงทุกฟังก์ชัน',
        JSON.stringify(['*']),
        '04fe0e1e-92a7-415f-8bdf-f79d95c2e754'
      ]
    )
    console.log('✅ Updated successfully:')
    console.log(JSON.stringify(result.rows[0], null, 2))
  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await pool.end()
  }
}

main()
