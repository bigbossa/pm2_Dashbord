/**
 * Check and Fix Database Schema
 * This script checks if all required tables and columns exist, and creates them if missing
 */

import pool from './db.js';

const checkAndFixSchema = async () => {
  console.log('🔍 Checking database schema...\n');

  try {
    // 1. Check and Create daily_work_logs table
    console.log('📋 Checking daily_work_logs table...');
    const logsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'daily_work_logs'
      );
    `);

    if (!logsTableExists.rows[0].exists) {
      console.log('❌ Table daily_work_logs does not exist. Creating...');
      await pool.query(`
        CREATE TABLE daily_work_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          start_mileage INTEGER NOT NULL,
          end_mileage INTEGER,
          start_time TIMESTAMP DEFAULT NOW(),
          end_time TIMESTAMP,
          status VARCHAR(50) DEFAULT 'started',
          start_image_url TEXT,
          end_image_url TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Table daily_work_logs created successfully!');
    } else {
      console.log('✅ Table daily_work_logs exists');
      
      // Check for missing columns
      const columns = ['start_image_url', 'end_image_url', 'status'];
      for (const col of columns) {
        const colExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'daily_work_logs' AND column_name = $1
          );
        `, [col]);
        
        if (!colExists.rows[0].exists) {
          console.log(`⚠️  Column ${col} missing. Adding...`);
          let colType = 'TEXT';
          if (col === 'status') colType = "VARCHAR(50) DEFAULT 'started'";
          await pool.query(`ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS ${col} ${colType}`);
          console.log(`✅ Column ${col} added`);
        }
      }
    }

    // 2. Check and Create expenses table
    console.log('\n📋 Checking expenses table...');
    const expensesTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'expenses'
      );
    `);

    if (!expensesTableExists.rows[0].exists) {
      console.log('❌ Table expenses does not exist. Creating...');
      await pool.query(`
        CREATE TABLE expenses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          daily_log_id INTEGER REFERENCES daily_work_logs(id),
          expense_type VARCHAR(50) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          note TEXT,
          liters DECIMAL(10, 2),
          receipt_image_url TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Table expenses created successfully!');
    } else {
      console.log('✅ Table expenses exists');
      
      // Check for liters column
      const litersExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'expenses' AND column_name = 'liters'
        );
      `);
      
      if (!litersExists.rows[0].exists) {
        console.log('⚠️  Column liters missing. Adding...');
        await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS liters DECIMAL(10, 2)`);
        console.log('✅ Column liters added');
      }
    }

    // 3. Check and Create check_ins table
    console.log('\n📋 Checking check_ins table...');
    const checkInsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'check_ins'
      );
    `);

    if (!checkInsTableExists.rows[0].exists) {
      console.log('❌ Table check_ins does not exist. Creating...');
      await pool.query(`
        CREATE TABLE check_ins (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          daily_log_id INTEGER REFERENCES daily_work_logs(id),
          customer_id INTEGER,
          customer_name_temp VARCHAR(255),
          notes TEXT,
          check_in_time TIMESTAMP DEFAULT NOW(),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          customertype VARCHAR(255),
          target VARCHAR(255),
          type VARCHAR(255),
          typeproduct VARCHAR(255),
          budget DECIMAL(15, 2),
          image TEXT,
          contact VARCHAR(255),
          phone VARCHAR(50),
          project VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Table check_ins created successfully!');
    } else {
      console.log('✅ Table check_ins exists');
      
      // Check for extended columns
      const extendedCols = ['customertype', 'target', 'type', 'typeproduct', 'budget', 'image', 'contact', 'phone', 'project'];
      for (const col of extendedCols) {
        const colExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'check_ins' AND column_name = $1
          );
        `, [col]);
        
        if (!colExists.rows[0].exists) {
          console.log(`⚠️  Column ${col} missing. Adding...`);
          let colType = 'TEXT';
          if (col === 'budget') colType = 'DECIMAL(15, 2)';
          else if (col === 'phone') colType = 'VARCHAR(50)';
          else if (col !== 'image') colType = 'VARCHAR(255)';
          
          await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS ${col} ${colType}`);
          console.log(`✅ Column ${col} added`);
        }
      }
    }

    // 4. Check customers table (optional, for reference)
    console.log('\n📋 Checking customers table...');
    const customersTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customers'
      );
    `);

    if (!customersTableExists.rows[0].exists) {
      console.log('⚠️  Table customers does not exist. Creating...');
      await pool.query(`
        CREATE TABLE customers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          contact_person VARCHAR(255),
          phone VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Table customers created successfully!');
    } else {
      console.log('✅ Table customers exists');
    }

    console.log('\n✅ Database schema check and fix completed successfully!');
    console.log('🎉 All required tables and columns are in place.\n');

  } catch (error) {
    console.error('❌ Error checking/fixing schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the check
checkAndFixSchema()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });
