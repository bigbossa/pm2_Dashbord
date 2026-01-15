/**
 * Database Health Check Script
 * Run this to verify all tables and columns exist
 */

import pool from './db.js';

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database schema...\n');

    // Check tables exist
    const tables = ['daily_work_logs', 'check_ins', 'expenses'];
    for (const table of tables) {
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      if (res.rows[0].exists) {
        console.log(`✅ Table "${table}" exists`);
      } else {
        console.log(`❌ Table "${table}" does NOT exist`);
      }
    }

    // Check columns in daily_work_logs
    console.log('\n📋 Checking columns in daily_work_logs:');
    const requiredColumns = ['id', 'user_id', 'work_date', 'start_mileage', 'end_mileage', 'start_image_url', 'end_image_url', 'status'];
    
    for (const col of requiredColumns) {
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'daily_work_logs' AND column_name = $1
        );
      `, [col]);
      
      if (res.rows[0].exists) {
        console.log(`  ✅ Column "${col}"`);
      } else {
        console.log(`  ❌ Column "${col}" is MISSING`);
      }
    }

    // Check columns in expenses
    console.log('\n📋 Checking columns in expenses:');
    const expenseColumns = ['id', 'user_id', 'daily_log_id', 'expense_type', 'amount', 'liters', 'receipt_image_url'];
    
    for (const col of expenseColumns) {
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'expenses' AND column_name = $1
        );
      `, [col]);
      
      if (res.rows[0].exists) {
        console.log(`  ✅ Column "${col}"`);
      } else {
        console.log(`  ❌ Column "${col}" is MISSING`);
      }
    }

    // Check columns in check_ins
    console.log('\n📋 Checking columns in check_ins:');
    const checkinColumns = ['id', 'user_id', 'daily_log_id', 'customer_name_temp', 'notes', 'image', 'customertype', 'target', 'type', 'typeproduct', 'budget', 'contact', 'phone', 'project'];
    
    for (const col of checkinColumns) {
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'check_ins' AND column_name = $1
        );
      `, [col]);
      
      if (res.rows[0].exists) {
        console.log(`  ✅ Column "${col}"`);
      } else {
        console.log(`  ❌ Column "${col}" is MISSING`);
      }
    }

    console.log('\n✅ Database health check complete!');
    
  } catch (err) {
    console.error('❌ Error checking database:', err.message);
  } finally {
    await pool.end();
  }
};

checkDatabase();
