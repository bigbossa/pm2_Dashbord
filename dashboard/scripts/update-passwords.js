// Script สำหรับอัปเดต password สำหรับผู้ใช้ที่มีอยู่
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: '.env.local' });

async function updatePasswords() {
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'usermanagementsystem',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔐 กำลังอัปเดต password...');

    // Hash password สำหรับ admin
    const adminHash = await bcrypt.hash('admin123', 10);

    // อัปเดต admin user
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [adminHash, 'admin']
    );

    console.log('✅ อัปเดต password สำหรับ admin เรียบร้อย');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    await pool.end();
    console.log('🎉 เสร็จสิ้น!');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

updatePasswords();
