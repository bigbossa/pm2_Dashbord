/**
 * Initialize Database Schema
 * This file ensures all required columns exist before the server starts
 */

import pool from './db.js';

export const initializeSchema = async () => {
  try {
    console.log('🔄 Initializing database schema...');

    // First, check if tables exist, if not, create them
    const createTablesSQL = `
      -- 1. Customers
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

      -- 2. Deals
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

      -- 3. Daily Work Logs
      CREATE TABLE IF NOT EXISTS daily_work_logs (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          work_date DATE NOT NULL DEFAULT CURRENT_DATE,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          start_mileage INT,
          end_mileage INT,
          total_distance INT,
          status VARCHAR(20) DEFAULT 'started',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Check Ins
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

      -- 5. Expenses
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

    await pool.query(createTablesSQL);
    console.log('✅ Base tables ensured');

    // All schema migrations in one place
    const migrations = [
      // Daily work logs enhancements
      `ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS total_distance INT`,
      `ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS start_image_url TEXT`,
      `ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS end_image_url TEXT`,
      
      // Check-ins table enhancements
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS customertype VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS target VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS type VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS typeproduct VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS image TEXT`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS contact VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS project VARCHAR(255)`,
      
      // Expenses enhancements
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS liters DECIMAL(10, 2)`
    ];

    for (const query of migrations) {
      try {
        await pool.query(query);
        console.log(`✅ Applied migration: ${query.substring(0, 80)}...`);
      } catch (e) {
        // Column might already exist, which is fine
        if (!e.message.includes('already exists')) {
          console.warn(`⚠️ Warning applying migration: ${e.message}`);
        }
      }
    }

    console.log('✅ Database schema initialization complete!');
    return true;
  } catch (err) {
    console.error('❌ Fatal error initializing schema:', err);
    return false;
  }
};

export default initializeSchema;
