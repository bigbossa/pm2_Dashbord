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
      `INSERT INTO roles (name, description, permissions) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, description, permissions`,
      [
        'Administrator',
        'ผู้ดูแลระบบสูงสุด มีสิทธิ์เข้าถึงทุกฟังก์ชัน',
        JSON.stringify(['*'])
      ]
    )
    console.log('Created:', JSON.stringify(result.rows[0], null, 2))
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

main()
