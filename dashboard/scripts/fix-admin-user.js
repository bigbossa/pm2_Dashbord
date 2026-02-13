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
      'UPDATE users SET role_id = $1 WHERE username = $2 RETURNING id, username, full_name, role_id',
      ['bb973ca0-ab33-43d8-aca2-5c0850b91026', 'admin']
    )
    if (result.rows.length > 0) {
      console.log('Updated:', JSON.stringify(result.rows[0], null, 2))
    } else {
      console.log('User admin not found')
    }
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

main()
