// db.js
const { Pool } = require("pg");

// Pool หลักสำหรับ purch_order
const pool = new Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "purch_order",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "25800852",

  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Pool สำหรับ useryc database (สำหรับดึงข้อมูล user คอนกรีต)
const useryc_pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  database: "useryc",
  user: "postgres",
  password: "25800852",

  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

module.exports = { pool, useryc_pool };
