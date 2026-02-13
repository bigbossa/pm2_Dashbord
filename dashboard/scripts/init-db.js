// Script สำหรับสร้างฐานข้อมูลเริ่มต้น
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// อ่าน environment variables
require('dotenv').config({ path: '.env.local' });

async function initDatabase() {
  // เชื่อมต่อ postgres database ก่อน เพื่อสร้าง database ใหม่
  const adminPool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // เชื่อมต่อ postgres database ก่อน
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  const dbName = process.env.DB_NAME || 'usermanagementsystem';

  try {
    console.log('🔍 ตรวจสอบว่ามีฐานข้อมูลอยู่แล้วหรือไม่...');
    
    // ตรวจสอบว่ามี database อยู่แล้วหรือไม่
    const checkDb = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`📝 สร้างฐานข้อมูล ${dbName}...`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ สร้างฐานข้อมูลสำเร็จ');
    } else {
      console.log(`✅ ฐานข้อมูล ${dbName} มีอยู่แล้ว`);
    }

    await adminPool.end();

    // เชื่อมต่อกับ database ที่สร้างใหม่
    const pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    console.log('📋 รัน schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await pool.query(schema);
    console.log('✅ สร้างตารางและข้อมูลเริ่มต้นสำเร็จ');

    await pool.end();
    console.log('🎉 เสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

initDatabase();
