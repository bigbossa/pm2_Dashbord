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
    // 1. เพิ่ม department_id column ถ้ายังไม่มี
    const checkCol = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'department_id'
      ) as exists
    `)
    
    if (!checkCol.rows[0].exists) {
      await pool.query(`ALTER TABLE roles ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL`)
      console.log('Added department_id column to roles table')
    } else {
      console.log('department_id column already exists')
    }

    // 2. Migrate: ถ้า role มี sub_department_id ให้หา department_id จาก sub_departments
    const migrateResult = await pool.query(`
      UPDATE roles r
      SET department_id = sd.department_id
      FROM sub_departments sd
      WHERE r.sub_department_id = sd.id
        AND r.department_id IS NULL
      RETURNING r.id, r.name, r.department_id
    `)
    console.log('Migrated', migrateResult.rowCount, 'roles to department_id')
    if (migrateResult.rows.length > 0) {
      console.log(JSON.stringify(migrateResult.rows, null, 2))
    }

    console.log('Done!')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

main()
