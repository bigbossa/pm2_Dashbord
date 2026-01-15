#!/usr/bin/env node
/**
 * Quick Fix Script for /api/today-state 500 Error
 * Run this if you're still getting 500 errors
 */

import pool from './db.js';

console.log('🔧 Running quick fix for /api/today-state 500 error...\n');

const quickFix = async () => {
  try {
    console.log('Step 1: Ensuring daily_work_logs table has required columns...');
    await pool.query(`ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS start_image_url TEXT`);
    await pool.query(`ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS end_image_url TEXT`);
    console.log('✅ daily_work_logs columns OK\n');

    console.log('Step 2: Ensuring check_ins table has required columns...');
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS customertype VARCHAR(255)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS target VARCHAR(255)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS type VARCHAR(255)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS typeproduct VARCHAR(255)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS image TEXT`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS contact VARCHAR(255)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS project VARCHAR(255)`);
    console.log('✅ check_ins columns OK\n');

    console.log('Step 3: Ensuring expenses table has required columns...');
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS liters DECIMAL(10, 2)`);
    console.log('✅ expenses columns OK\n');

    console.log('Step 4: Testing database connectivity...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection OK');
    console.log(`   Current server time: ${result.rows[0].current_time}\n`);

    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('Now restart your server and try the endpoint again:');
    console.log('GET /ycsalescrm/api/today-state?user_id=43\n');

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check .env file has correct DB credentials');
    console.error('3. Verify database "crmsales_yc" exists');
    console.error('4. Run: npm run db:check');
  } finally {
    await pool.end();
  }
};

quickFix();
