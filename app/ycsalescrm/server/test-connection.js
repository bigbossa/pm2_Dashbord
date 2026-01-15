/**
 * Test Database Connection and List Tables
 */

import pool from './db.js';

const testConnection = async () => {
  console.log('🔌 Testing database connection...\n');

  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('📅 Server time:', result.rows[0].now);
    console.log('📊 Database:', process.env.DB_NAME);
    console.log('👤 User:', process.env.DB_USER);
    console.log('🖥️  Host:', process.env.DB_HOST);
    console.log('🔌 Port:', process.env.DB_PORT);

    // List all tables
    console.log('\n📋 Tables in database:\n');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    if (tables.rows.length === 0) {
      console.log('❌ No tables found!');
    } else {
      tables.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.table_name}`);
      });
    }

    // Check specific tables we need
    console.log('\n🔍 Checking required tables:\n');
    const requiredTables = ['daily_work_logs', 'expenses', 'check_ins', 'customers'];
    
    for (const tableName of requiredTables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [tableName]);
      
      const status = exists.rows[0].exists ? '✅' : '❌';
      console.log(`  ${status} ${tableName}`);
      
      // If table exists, show columns
      if (exists.rows[0].exists) {
        const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position;
        `, [tableName]);
        
        console.log(`     Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
      }
    }

    console.log('\n✅ Connection test completed!\n');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
};

// Run the test
testConnection()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });
