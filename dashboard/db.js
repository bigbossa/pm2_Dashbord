// db.js
const { Pool } = require('pg');

// เรียกใช้ dotenv เพื่อให้อ่านไฟล์ .env ได้
// (ใส่บรรทัดนี้ไว้บนสุดเสมอ ถ้าไฟล์นี้ถูกเรียกใช้โดดๆ)
require('dotenv').config(); 

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 5, // ลดจำนวน connection สูงสุด
    idleTimeoutMillis: 10000, // ปิด connection ที่ไม่ได้ใช้งานเร็วขึ้น (10 วินาที)
    connectionTimeoutMillis: 5000, // เพิ่มเวลารอให้มาก connection ว่าง (5 วินาที)
});

// ตรวจสอบ error จาก pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = pool;