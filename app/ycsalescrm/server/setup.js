import pool from './db.js';

const createTablesQuery = `
  -- 1. Customers (ตัด FK user_id)
  CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(50),
      email VARCHAR(100),
      address TEXT,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      assigned_to_user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. Deals (ตัด FK user_id)
  CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      user_id INT,
      title VARCHAR(200) NOT NULL,
      value DECIMAL(12, 2) DEFAULT 0,
      stage VARCHAR(50) DEFAULT 'New',
      expected_close_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 3. Daily Work Logs (ตัด FK user_id)
  CREATE TABLE IF NOT EXISTS daily_work_logs (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      work_date DATE NOT NULL DEFAULT CURRENT_DATE,
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      start_mileage INT,
      end_mileage INT,
      -- total_distance คำนวณใน Application หรือใช้ Generated Column (Postgres 12+)
      status VARCHAR(20) DEFAULT 'started',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  -- Note: Generated column syntax might vary by PG version, keeping it simple for now.

  -- 4. Check Ins (ตัด FK user_id)
  CREATE TABLE IF NOT EXISTS check_ins (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      daily_log_id INT REFERENCES daily_work_logs(id),
      customer_id INT REFERENCES customers(id),
      customer_name_temp VARCHAR(200),
      check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      check_out_time TIMESTAMP,
      notes TEXT,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      photo_url TEXT
  );

  -- 5. Expenses (ตัด FK user_id)
  CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      daily_log_id INT REFERENCES daily_work_logs(id),
      expense_type VARCHAR(50),
      amount DECIMAL(10, 2) NOT NULL,
      note TEXT,
      receipt_image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const setupDatabase = async () => {
  try {
    console.log('⏳ Creating tables...');
    await pool.query(createTablesQuery);
    console.log('✅ Tables created successfully!');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  } finally {
    await pool.end();
  }
};

setupDatabase();
