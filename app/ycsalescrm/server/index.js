import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { userPool } from './db.js';
import initializeSchema from './init-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3015;

// Initialize database schema on startup
await initializeSchema();

// Base path for mounted app (e.g., /ycsalescrm)
const BASE_PATH = '/ycsalescrm';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads

// Middleware to handle /ycsalescrm prefix for Standalone Server
app.use((req, res, next) => {
  if (req.url.startsWith('/ycsalescrm/api')) {
    req.url = req.url.replace('/ycsalescrm/api', '/api');
  }
  next();
});

// Ensure images directory exists
const imagesDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Serve images
app.use('/images', express.static(imagesDir));

// --- 0. Auth (Login) ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Query from User DB (useryc)
    // Map 'iduser' to 'id' for frontend compatibility
    const query = `SELECT iduser as id, username, usersname FROM useryc WHERE username = $1 AND password = $2`;
    const result = await userPool.query(query, [username, password]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Test Connection
// app.get('/', (req, res) => {
//   res.send('Sales CRM API is running');
// });

// --- 1. Daily Work Logs (Start Day) ---
app.post('/api/daily-logs/start', async (req, res) => {
  try {
    console.log('Start day request:', req.body);
    const { user_id, start_mileage, image } = req.body;
    
    if (!user_id || !start_mileage) {
      console.error('Missing required fields:', { user_id, start_mileage });
      return res.status(400).json({ error: 'Missing required fields: user_id and start_mileage' });
    }
    
    let imagePath = null;
    if (image) {
      try {
        const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          
          const filename = `mileage_start_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const filepath = path.join(imagesDir, filename);
          
          fs.writeFileSync(filepath, buffer);
          
          // Verify file was created and has content
          if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            if (stats.size > 0) {
              imagePath = `/images/${filename}`;
              console.log(`✅ Start mileage image saved: ${imagePath} (${(stats.size/1024).toFixed(2)} KB)`);
            } else {
              console.error('❌ Start mileage image is empty (0 bytes)');
              fs.unlinkSync(filepath); // Delete empty file
            }
          } else {
            console.error('❌ Failed to create start mileage image file');
          }
        }
      } catch (e) {
        console.error('❌ Error processing start mileage image:', e);
      }
    }

    // Insert new log
    const query = `
      INSERT INTO daily_work_logs (user_id, start_mileage, start_time, status, start_image_url)
      VALUES ($1, $2, NOW(), 'started', $3)
      RETURNING *
    `;
    
    console.log('Executing query with:', [user_id, start_mileage, imagePath]);
    const newLog = await pool.query(query, [user_id, start_mileage, imagePath]);
    console.log('New log created:', newLog.rows[0]);
    res.json(newLog.rows[0]);
  } catch (err) {
    console.error('Error in /api/daily-logs/start:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// --- 2. Check Ins (Visit Customer) ---
app.post('/api/check-ins', async (req, res) => {
  try {
    const { 
      user_id, daily_log_id, customer_id, customer_name_temp, notes, latitude, longitude,
      customertype, target, type, typeproduct, budget, image, contact, phone, project
    } = req.body;

    // Process Images (Base64 -> File)
    let imagePaths = [];
    if (image) {
      try {
        const base64Images = JSON.parse(image);
        if (Array.isArray(base64Images)) {
          for (const base64 of base64Images) {
            if (base64.startsWith('data:image')) {
              const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const data = matches[2];
                const buffer = Buffer.from(data, 'base64');
                
                const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const filepath = path.join(imagesDir, filename);
                
                fs.writeFileSync(filepath, buffer);
                imagePaths.push(`/images/${filename}`);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error processing images:', e);
      }
    }

    // Logic to Upsert Customer (Auto-create if new)
    let finalCustomerId = customer_id;
    if (!finalCustomerId && customer_name_temp) {
      try {
        const existingCust = await pool.query('SELECT id FROM customers WHERE name = $1', [customer_name_temp]);
        if (existingCust.rows.length > 0) {
          finalCustomerId = existingCust.rows[0].id;
        } else {
          const newCust = await pool.query(
            'INSERT INTO customers (name, contact_person, phone) VALUES ($1, $2, $3) RETURNING id',
            [customer_name_temp, contact || null, phone || null]
          );
          finalCustomerId = newCust.rows[0].id;
        }
      } catch (custErr) {
        console.error('Error handling customer creation:', custErr);
      }
    }
    
    const query = `
      INSERT INTO check_ins (
        user_id, daily_log_id, customer_id, customer_name_temp, notes, latitude, longitude, check_in_time,
        customertype, target, type, typeproduct, budget, image, contact, phone, project
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    
    const newCheckIn = await pool.query(query, [
      user_id, 
      daily_log_id, 
      finalCustomerId || null, 
      customer_name_temp || null, 
      notes, 
      latitude, 
      longitude,
      customertype,
      target,
      type,
      typeproduct,
      budget,
      JSON.stringify(imagePaths), // Save paths instead of Base64
      contact,
      phone,
      project
    ]);
    
    res.json(newCheckIn.rows[0]);
  } catch (err) {
    console.error('Error in check-ins endpoint:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// --- 3. Expenses (Add Expense) ---
app.post('/api/expenses', async (req, res) => {
  try {
    const { user_id, daily_log_id, expense_type, amount, note, liters, image } = req.body;
    
    let imagePath = null;
    if (image) {
      try {
        const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          
          const filename = `expense_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const filepath = path.join(imagesDir, filename);
          
          fs.writeFileSync(filepath, buffer);
          imagePath = `/images/${filename}`;
        }
      } catch (e) {
        console.error('Error processing expense image:', e);
      }
    }

    const query = `
      INSERT INTO expenses (user_id, daily_log_id, expense_type, amount, note, liters, receipt_image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const newExpense = await pool.query(query, [
      user_id, 
      daily_log_id, 
      expense_type, 
      amount, 
      note, 
      liters || null, 
      imagePath
    ]);
    res.json(newExpense.rows[0]);
  } catch (err) {
    console.error('Error in expenses endpoint:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// --- 3b. Delete Expense ---
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get image path before deleting
    const selectQuery = 'SELECT receipt_image_url FROM expenses WHERE id = $1';
    const expenseResult = await pool.query(selectQuery, [id]);
    
    if (expenseResult.rows.length > 0) {
      const imagePath = expenseResult.rows[0].receipt_image_url;
      
      // Delete from database
      const deleteQuery = 'DELETE FROM expenses WHERE id = $1';
      await pool.query(deleteQuery, [id]);
      
      // Delete image file if exists
      if (imagePath) {
        const fullPath = path.join(__dirname, '../public', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`✅ Deleted expense image: ${imagePath}`);
        }
      }
      
      res.json({ success: true, message: 'Expense deleted' });
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (err) {
    console.error('❌ Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// --- 3c. Update Expense ---
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { expense_type, amount, liters, image } = req.body;
    
    // Get current expense data
    const selectQuery = 'SELECT receipt_image_url FROM expenses WHERE id = $1';
    const expenseResult = await pool.query(selectQuery, [id]);
    
    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    let imagePath = expenseResult.rows[0].receipt_image_url;
    
    // Handle new image upload
    if (image && image.startsWith('data:image/')) {
      try {
        // Delete old image if exists
        if (imagePath) {
          const oldFullPath = path.join(__dirname, '../public', imagePath);
          if (fs.existsSync(oldFullPath)) {
            fs.unlinkSync(oldFullPath);
            console.log(`✅ Deleted old expense image: ${imagePath}`);
          }
        }
        
        // Save new image
        const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          
          const filename = `expense_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const filepath = path.join(imagesDir, filename);
          
          fs.writeFileSync(filepath, buffer);
          
          // Verify file exists and has size
          if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            if (stats.size > 0) {
              imagePath = `/images/${filename}`;
              console.log(`✅ Updated expense image: ${imagePath} (${(stats.size/1024).toFixed(2)} KB)`);
            } else {
              console.error('❌ Updated expense image is empty (0 bytes)');
              fs.unlinkSync(filepath);
            }
          }
        }
      } catch (e) {
        console.error('Error processing updated expense image:', e);
      }
    }
    
    // Update expense in database
    const updateQuery = `
      UPDATE expenses 
      SET expense_type = $1, amount = $2, liters = $3, receipt_image_url = $4
      WHERE id = $5
      RETURNING *
    `;
    
    const updatedExpense = await pool.query(updateQuery, [
      expense_type,
      amount,
      liters || null,
      imagePath,
      id
    ]);
    
    res.json(updatedExpense.rows[0]);
  } catch (err) {
    console.error('❌ Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// --- 4. End Day (Update Daily Log) ---
app.put('/api/daily-logs/:id/end', async (req, res) => {
  console.log('End Day Request:', req.params, req.body);
  try {
    const { id } = req.params;
    const { end_mileage, image } = req.body;
    
    if (!id || id === 'null' || id === 'undefined') {
        console.error('Invalid Log ID:', id);
        return res.status(400).json({ message: 'Invalid Log ID' });
    }

    let imagePath = null;
    if (image) {
      try {
        const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          
          const filename = `mileage_end_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const filepath = path.join(imagesDir, filename);
          
          fs.writeFileSync(filepath, buffer);
          
          // Verify file was created and has content
          if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            if (stats.size > 0) {
              imagePath = `/images/${filename}`;
              console.log(`✅ End mileage image saved: ${imagePath} (${(stats.size/1024).toFixed(2)} KB)`);
            } else {
              console.error('❌ End mileage image is empty (0 bytes)');
              fs.unlinkSync(filepath); // Delete empty file
            }
          } else {
            console.error('❌ Failed to create end mileage image file');
          }
        }
      } catch (e) {
        console.error('❌ Error processing end mileage image:', e);
      }
    }

    const query = `
      UPDATE daily_work_logs
      SET end_mileage = $1, end_time = NOW(), status = 'finished', end_image_url = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const updatedLog = await pool.query(query, [end_mileage, imagePath, id]);
    
    if (updatedLog.rows.length === 0) {
      console.error('Log not found for ID:', id);
      return res.status(404).json({ message: 'Log not found' });
    }

    console.log('End Day Success:', updatedLog.rows[0]);
    res.json(updatedLog.rows[0]);
  } catch (err) {
    console.error('End Day Error:', err.message);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// --- 5. Get Daily Logs History ---
app.get('/api/daily-logs', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const query = `
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM check_ins c WHERE c.daily_log_id = d.id) as check_in_count,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.daily_log_id = d.id) as total_expenses
      FROM daily_work_logs d
      WHERE d.user_id = $1
      ORDER BY d.work_date DESC, d.created_at DESC
    `;
    
    const logs = await pool.query(query, [user_id]);
    res.json(logs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- 6. Get Today's Data (Resume State) ---
app.get('/api/today-state', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Ensure schema is up to date - add missing columns if they don't exist
    try {
      await pool.query(`ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS start_image_url TEXT`);
      await pool.query(`ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS end_image_url TEXT`);
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS liters DECIMAL(10, 2)`);
    } catch (e) {
      console.log('Schema columns may already exist or other constraint issue:', e.message);
    }

    // Find the latest log for today
    const logQuery = `
      SELECT * FROM daily_work_logs 
      WHERE user_id = $1 AND DATE(work_date) = CURRENT_DATE
      ORDER BY created_at DESC LIMIT 1
    `;
    const logRes = await pool.query(logQuery, [user_id]);
    
    if (logRes.rows.length === 0) {
      return res.json({ hasData: false });
    }

    const log = logRes.rows[0];

    // Get Check-ins
    const checkInsRes = await pool.query(`
      SELECT * FROM check_ins WHERE daily_log_id = $1 ORDER BY check_in_time DESC
    `, [log.id]);

    // Get Expenses
    const expensesRes = await pool.query(`
      SELECT * FROM expenses WHERE daily_log_id = $1 ORDER BY created_at DESC
    `, [log.id]);

    res.json({
      hasData: true,
      mileage: {
        start: log.start_mileage,
        end: log.end_mileage || '',
        distance: log.end_mileage ? (log.end_mileage - log.start_mileage) : 0,
        startTime: log.start_time,
        endTime: log.end_time,
        isStarted: true,
        isFinished: log.status === 'finished',
        dailyLogId: log.id,
        startImage: log.start_image_url || null,
        endImage: log.end_image_url || null
      },
      checkIns: checkInsRes.rows.map(c => ({
        id: c.id,
        customer: c.customer_name_temp,
        note: c.notes,
        timestamp: c.check_in_time,
        location: c.latitude ? `${c.latitude}° N, ${c.longitude}° E` : '',
        images: c.image ? JSON.parse(c.image) : [],
        latitude: c.latitude,
        longitude: c.longitude
      })),
      expenses: expensesRes.rows.map(e => ({
        id: e.id,
        type: e.expense_type,
        amount: e.amount,
        note: e.note,
        liters: e.liters || null,
        image: e.receipt_image_url,
        timestamp: e.created_at
      }))
    });

  } catch (err) {
    console.error('Error in today-state endpoint:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// --- 7. OCR with Gemini ---
app.post('/api/ocr', async (req, res) => {
  try {
    const { image } = req.body; // Base64 string
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: 'Gemini API Key not configured' });
    }

    // Extract mime type and base64 data
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
        return res.status(400).json({ message: 'Invalid image data format' });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    console.log(`Sending request to Gemini API... (Mime: ${mimeType}, Size: ${base64Data.length})`);

    // Use gemini-2.0-flash as it is available in the list
    const modelName = 'gemini-2.0-flash'; 
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this image of a vehicle dashboard. Locate the ODOMETER reading (total distance traveled). Return ONLY the numeric digits of the odometer. Ignore trip meters (often smaller or with a decimal point), speedometers, clocks, or radio displays. Do not include 'km', 'miles', or any other text. Just the raw number." },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error Response:', errorText);
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('Gemini Response Text:', text);

    // Extract only digits
    const number = text.replace(/\D/g, '');
    
    res.json({ number });
  } catch (err) {
    console.error('OCR Error Full Details:', err);
    res.status(500).json({ message: 'Failed to process image', details: err.message });
  }
});

// --- 8. Get Customer List (For Autocomplete) ---
app.get('/api/customers', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT customer_name_temp 
      FROM check_ins 
      WHERE customer_name_temp IS NOT NULL AND customer_name_temp != ''
      ORDER BY customer_name_temp ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows.map(row => row.customer_name_temp));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- 9. Get Daily Log Details ---
app.get('/api/daily-logs/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Log ID is required' });
    }

    const logQuery = `SELECT * FROM daily_work_logs WHERE id = $1`;
    const logRes = await pool.query(logQuery, [id]);
    
    if (logRes.rows.length === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }

    const log = logRes.rows[0];

    // Get Check-ins
    const checkInsRes = await pool.query(`
      SELECT * FROM check_ins WHERE daily_log_id = $1 ORDER BY check_in_time DESC
    `, [id]);

    // Get Expenses
    const expensesRes = await pool.query(`
      SELECT * FROM expenses WHERE daily_log_id = $1 ORDER BY created_at DESC
    `, [id]);

    res.json({
      mileage: {
        start: log.start_mileage,
        end: log.end_mileage || '',
        distance: log.end_mileage ? (log.end_mileage - log.start_mileage) : 0,
        startTime: log.start_time,
        endTime: log.end_time,
        startImage: log.start_image_url,
        endImage: log.end_image_url,
        isStarted: true,
        isFinished: log.status === 'finished',
        dailyLogId: log.id
      },
      checkIns: checkInsRes.rows.map(c => ({
        id: c.id,
        customer: c.customer_name_temp,
        note: c.notes,
        timestamp: c.check_in_time,
        location: c.latitude ? `${c.latitude}° N, ${c.longitude}° E` : '',
        images: c.image ? JSON.parse(c.image) : [],
        latitude: c.latitude,
        longitude: c.longitude,
        customertype: c.customertype,
        target: c.target,
        type: c.type,
        typeproduct: c.typeproduct,
        budget: c.budget,
        contact: c.contact,
        phone: c.phone,
        project: c.project
      })),
      expenses: expensesRes.rows.map(e => ({
        id: e.id,
        type: e.expense_type,
        amount: e.amount,
        note: e.note,
        liters: e.liters,
        image: e.receipt_image_url,
        timestamp: e.created_at
      }))
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- 10. Get Report Data (Range) ---
app.get('/api/reports', async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.query;
    
    if (!user_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Get Logs in range
    const logsQuery = `
      SELECT * FROM daily_work_logs 
      WHERE user_id = $1 
      AND work_date >= $2 
      AND work_date <= $3
      ORDER BY work_date ASC
    `;
    const logsRes = await pool.query(logsQuery, [user_id, start_date, end_date]);
    const logs = logsRes.rows;

    const reportData = [];

    for (const log of logs) {
      // Get Check-ins
      const checkInsRes = await pool.query(`
        SELECT * FROM check_ins WHERE daily_log_id = $1 ORDER BY check_in_time ASC
      `, [log.id]);

      // Get Expenses
      const expensesRes = await pool.query(`
        SELECT * FROM expenses WHERE daily_log_id = $1 ORDER BY created_at ASC
      `, [log.id]);

      reportData.push({
        date: log.work_date,
        mileage: {
          start: log.start_mileage,
          end: log.end_mileage,
          distance: log.end_mileage ? (log.end_mileage - log.start_mileage) : 0
        },
        checkIns: checkInsRes.rows.map(c => ({
            ...c,
            images: c.image ? JSON.parse(c.image) : []
        })),
        expenses: expensesRes.rows
      });
    }

    res.json(reportData);

  } catch (err) {
    console.error('Error in reports endpoint:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// --- Serve Static Files (Frontend) ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  // Serve at root (for standalone default)
  app.use(express.static(distPath));
  // Serve at /ycsalescrm (for standalone with base path)
  app.use('/ycsalescrm', express.static(distPath));

  // Handle SPA routing: return index.html for any unknown route
  // excluding /api routes (which should have been handled above)
  app.get(/(.*)/, (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ message: 'API endpoint not found' });
    }
  });
}

// Export app for mounting
export default app;

// Only listen if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
