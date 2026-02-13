// PostgreSQL Database Configuration
// ต้องติดตั้ง: npm install pg
// และสร้าง .env ไฟล์พร้อมค่า DATABASE_URL

import { Pool, PoolClient } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'usermanagementsystem',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

export default pool

// Helper function สำหรับ query
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

// Helper function สำหรับ transaction
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Placeholder exports สำหรับใช้กับ Mock Data
export const mockDb = {
  query: async <T>(text: string, params?: unknown[]): Promise<T[]> => {
    console.log('Mock DB Query:', text, params)
    return []
  },
}
