import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection pool for Homecare Data (homecare)
const poolConfig = {
  host: process.env.DBHC_HOST || '127.0.0.1',
  port: parseInt(process.env.DBHC_PORT || '5432'),
  database: process.env.DBHC_NAME || 'homecare',
  user: process.env.DBHC_USER || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Only add password if it exists
if (process.env.DBHC_PASSWORD) {
  poolConfig.password = process.env.DBHC_PASSWORD;
}

const homecarePool = new Pool(poolConfig);

// Test database connection
homecarePool.on('connect', () => {
  console.log('✅ Connected to homecare database');
});

homecarePool.on('error', (err) => {
  console.error('❌ Unexpected error on homecare pool', err);
  process.exit(-1);
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - Landing page
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HomeCare Backend Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .status-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    h1 {
      color: #1f2937;
      font-size: 2em;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 1.1em;
    }
    .info-section {
      background: #f9fafb;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #374151;
    }
    .value {
      color: #6b7280;
      font-family: monospace;
    }
    .endpoints {
      margin-top: 20px;
    }
    .endpoint {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 12px;
      margin: 10px 0;
      border-radius: 5px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #9ca3af;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status-badge">🚀 SERVER IS RUNNING</div>
      <h1>HomeCare Backend Server</h1>
      <p class="subtitle">ระบบจัดการบ้านอัจฉริยะ</p>
    </div>
    
    <div class="info-section">
      <div class="info-item">
        <span class="label">Server Port:</span>
        <span class="value">${PORT}</span>
      </div>
      <div class="info-item">
        <span class="label">Host:</span>
        <span class="value">0.0.0.0 (All interfaces)</span>
      </div>
      <div class="info-item">
        <span class="label">Status:</span>
        <span class="value" style="color: #10b981; font-weight: bold;">✓ Online</span>
      </div>
      <div class="info-item">
        <span class="label">Environment:</span>
        <span class="value">${process.env.NODE_ENV || 'development'}</span>
      </div>
    </div>

    <div class="endpoints">
      <h3 style="color: #1f2937; margin-bottom: 15px;">📡 Available Endpoints:</h3>
      <div class="endpoint">GET /api/health - Health check</div>
      <div class="endpoint">POST /api/login - User authentication</div>
      <div class="endpoint">GET /api/air-ma - Get air conditioner data</div>
      <div class="endpoint">GET /api/water - Get water filter data</div>
      <div class="endpoint">GET /api/checklist - Get maintenance checklist</div>
    </div>

    <div class="footer">
      <p>© 2025 HomeCare Assistant • Powered by Node.js & PostgreSQL</p>
    </div>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const homecareCheck = await homecarePool.query('SELECT NOW() as homecare_time');
    
    res.json({ 
      status: 'ok', 
      databases: {
        homecare: 'connected'
      },
      timestamp: {
        homecare: homecareCheck.rows[0].homecare_time
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'กรุณากรอกเบอร์โทรศัพท์' 
    });
  }

  try {
    // Query user from loginphone table in homecare database
    console.log(`🔐 Attempting login for phone: ${phoneNumber}`);
    console.log(`📊 Database: ${process.env.DBHC_NAME || 'homecare'}@${process.env.DBHC_HOST || '127.0.0.1'}:${process.env.DBHC_PORT || '5432'}`);
    
    const query = 'SELECT * FROM loginphone WHERE phone_number = $1';
    const result = await homecarePool.query(query, [phoneNumber]);

    console.log(`📊 Query result: ${result.rows.length} rows found`);

    if (result.rows.length === 0) {
      console.log(`❌ Login failed: Phone number not found ${phoneNumber}`);
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบเบอร์โทรศัพท์นี้ในระบบ' 
      });
    }

    const user = result.rows[0];
    
    // แปลง role เป็นชื่อที่อ่านได้
    const roleNames = {
      0: 'admin',
      1: 'ช่าง',
      2: 'แม่บ้าน'
    };
    
    console.log(`✅ Login successful for phone: ${user.phone_number} (ID: ${user.id}, Role: ${user.role} - ${roleNames[user.role]})`);
    
    // Return success response
    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        roleName: roleNames[user.role]
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    // Check if it's a table not found error
    if (error.message.includes('relation "loginphone" does not exist') || error.code === '42P01') {
      return res.status(500).json({ 
        success: false, 
        message: 'ตาราง loginphone ไม่พบในฐานข้อมูล homecare - ตรวจสอบว่าตารางถูกสร้างแล้ว',
        error: error.message 
      });
    }
    
    // Check if it's a connection error
    if (error.message.includes('connect') || error.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        success: false, 
        message: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ - ตรวจสอบว่า PostgreSQL กำลังทำงานอยู่',
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: error.message 
    });
  }
});

// ========== User Management Endpoints ==========

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    console.log('📊 Getting all users from loginphone table');
    const result = await homecarePool.query(
      'SELECT id, phone_number, role, created_at FROM loginphone ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: result.rows,
      message: 'ดึงข้อมูลผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      error: error.message
    });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  const { phone_number, role } = req.body;

  if (!phone_number || role === undefined) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกเบอร์โทรศัพท์และระดับสิทธิ์'
    });
  }

  // Validate phone number format
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({
      success: false,
      message: 'เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)'
    });
  }

  // Validate role
  if (![0, 1, 2].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'ระดับสิทธิ์ไม่ถูกต้อง (ต้องเป็น 0, 1, หรือ 2)'
    });
  }

  try {
    // Check if phone number already exists
    const checkResult = await homecarePool.query(
      'SELECT * FROM loginphone WHERE phone_number = $1',
      [phone_number]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'เบอร์โทรศัพท์นี้มีในระบบแล้ว'
      });
    }

    // Insert new user
    const result = await homecarePool.query(
      'INSERT INTO loginphone (phone_number, role) VALUES ($1, $2) RETURNING *',
      [phone_number, role]
    );

    console.log(`✅ Created new user: ${phone_number} (role: ${role})`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'เพิ่มผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้',
      error: error.message
    });
  }
});

// Update user role
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role === undefined) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุระดับสิทธิ์'
    });
  }

  // Validate role
  if (![0, 1, 2].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'ระดับสิทธิ์ไม่ถูกต้อง (ต้องเป็น 0, 1, หรือ 2)'
    });
  }

  try {
    const result = await homecarePool.query(
      'UPDATE loginphone SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้นี้'
      });
    }

    console.log(`✅ Updated user ${id}: role = ${role}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'อัปเดตผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้',
      error: error.message
    });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await homecarePool.query(
      'DELETE FROM loginphone WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้นี้'
      });
    }

    console.log(`✅ Deleted user ${id}: ${result.rows[0].phone_number}`);

    res.json({
      success: true,
      message: 'ลบผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบผู้ใช้',
      error: error.message
    });
  }
});

// ========== Air_MA Table Endpoints ==========

// Get all Air_MA records
app.get('/api/air-ma', async (req, res) => {
  try {
    const result = await homecarePool.query('SELECT * FROM Air_MA ORDER BY created_at DESC');
    
    // Format date to YYYY-MM-DD string without timezone conversion
    const formattedData = result.rows.map(row => {
      let dateStr = null;
      if (row.date) {
        // Extract date directly without timezone conversion
        const d = new Date(row.date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      return {
        ...row,
        date: dateStr
      };
    });
    
    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length
    });
  } catch (error) {
    console.error('Get Air_MA error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message 
    });
  }
});

// Get single Air_MA record by ID
app.get('/api/air-ma/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await homecarePool.query('SELECT * FROM Air_MA WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get Air_MA by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
});

// Create new Air_MA record
app.post('/api/air-ma', async (req, res) => {
  try {
    const { room_name, floor, room_number, btu, date } = req.body;

    if (!room_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อห้อง' 
      });
    }

    const query = `
      INSERT INTO Air_MA (room_name, floor, room_number, btu, date)
      VALUES ($1, $2, $3, $4, $5::date)
      RETURNING *
    `;
    
    const result = await homecarePool.query(query, [room_name, floor || null, room_number || null, btu || null, date || null]);

    console.log('✅ บันทึกข้อมูลลงฐานข้อมูลสำเร็จ:', {
      id: result.rows[0].id,
      room_name: result.rows[0].room_name,
      floor: result.rows[0].floor,
      room_number: result.rows[0].room_number,
      btu: result.rows[0].btu,
      date: result.rows[0].date
    });

    res.status(201).json({
      success: true,
      message: 'เพิ่มข้อมูลสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create Air_MA error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล',
      error: error.message 
    });
  }
});

// Update Air_MA record
app.put('/api/air-ma/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { room_name, floor, room_number, btu, date } = req.body;

    const query = `
      UPDATE Air_MA 
      SET room_name = $1, floor = $2, room_number = $3, btu = $4, date = $5::date, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await homecarePool.query(query, [room_name, floor || null, room_number || null, btu || null, date || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update Air_MA error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล',
      error: error.message 
    });
  }
});

// ========== Water Table Endpoints ==========

// Get all Water records
app.get('/api/water', async (req, res) => {
  try {
    console.log('📞 GET /api/water - กำลังดึงข้อมูลเครื่องกรองน้ำ...');
    const result = await homecarePool.query('SELECT * FROM water ORDER BY create_time DESC');
    console.log(`📦 พบข้อมูลเครื่องกรองน้ำ: ${result.rows.length} รายการ`, result.rows);
    
    // Format date to YYYY-MM-DD string without timezone conversion
    const formattedData = result.rows.map(row => {
      let dateStr = null;
      if (row.create_time) {
        const d = new Date(row.create_time);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      return {
        ...row,
        create_time: dateStr
      };
    });
    
    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length
    });
  } catch (error) {
    console.error('Get Water error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message 
    });
  }
});

// Get single Water record by ID
app.get('/api/water/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await homecarePool.query('SELECT * FROM water WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get Water by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
});

// Create new Water record
app.post('/api/water', async (req, res) => {
  try {
    const { watername, location, name, create_time } = req.body;

    if (!watername) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อเครื่องกรองน้ำ' 
      });
    }

    const query = `
      INSERT INTO water (watername, location, name, create_time)
      VALUES ($1, $2, $3, $4::date)
      RETURNING *
    `;
    
    const result = await homecarePool.query(query, [watername, location || null, name || null, create_time || null]);

    console.log('✅ บันทึกข้อมูลเครื่องกรองน้ำสำเร็จ:', {
      id: result.rows[0].id,
      watername: result.rows[0].watername,
      location: result.rows[0].location,
      create_time: result.rows[0].create_time
    });

    res.json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create Water error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      error: error.message 
    });
  }
});

// Update Water record
app.put('/api/water/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { watername, location, name, create_time } = req.body;

    const query = `
      UPDATE water 
      SET watername = $1, location = $2, name = $3, create_time = $4::date
      WHERE id = $5
      RETURNING *
    `;
    
    const result = await homecarePool.query(query, [watername, location || null, name || null, create_time || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update Water error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล',
      error: error.message 
    });
  }
});

// Delete Water record
app.delete('/api/water/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await homecarePool.query('DELETE FROM water WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    res.json({
      success: true,
      message: 'ลบข้อมูลสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Delete Water error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการลบข้อมูล',
      error: error.message 
    });
  }
});

// Delete Air_MA record
app.delete('/api/air-ma/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await homecarePool.query('DELETE FROM Air_MA WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    res.json({
      success: true,
      message: 'ลบข้อมูลสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Delete Air_MA error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการลบข้อมูล',
      error: error.message 
    });
  }
});

// ============ Checklist API ============

// Create checklist record
app.post('/api/checklist', async (req, res) => {
  try {
    const { appliance_id, appliance_type, task_name, check_date, checked, notes, performed_by } = req.body;

    // Validate required fields
    if (!appliance_id || !appliance_type || !task_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน' 
      });
    }

    const result = await homecarePool.query(
      `INSERT INTO checklist 
       (appliance_id, appliance_type, task_name, check_date, checked, notes, performed_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        appliance_id,
        appliance_type,
        task_name,
        check_date || new Date().toISOString().split('T')[0],
        checked !== undefined ? checked : true,
        notes || null,
        performed_by || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'บันทึกการเช็คสำเร็จ',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create checklist error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      error: error.message 
    });
  }
});

// Get checklist records
app.get('/api/checklist', async (req, res) => {
  try {
    const { appliance_id, appliance_type, from_date, to_date } = req.query;
    
    let query = 'SELECT * FROM checklist WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (appliance_id) {
      query += ` AND appliance_id = $${paramCount}`;
      params.push(appliance_id);
      paramCount++;
    }

    if (appliance_type) {
      query += ` AND appliance_type = $${paramCount}`;
      params.push(appliance_type);
      paramCount++;
    }

    if (from_date) {
      query += ` AND check_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND check_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    query += ' ORDER BY check_date DESC, created_at DESC';

    const result = await homecarePool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVER IS RUNNING ..........'.padEnd(60));
  console.log('='.repeat(60));
  console.log(`   📍 Local:   http://localhost:${PORT}`);
  console.log(`   📍 Network: http://192.168.19.37:${PORT}`);
  console.log(`   📍 API:     /api/*`);
  console.log('='.repeat(60));
  console.log(`📊 Database: ${process.env.DBHC_NAME || 'homecare'}@${process.env.DBHC_HOST || '127.0.0.1'}:${process.env.DBHC_PORT || '5432'}`);
  console.log('='.repeat(60) + '\n');
});

