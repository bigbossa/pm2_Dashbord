import pool from './db.js';

const updateSchema = async () => {
  try {
    console.log('⏳ Updating expenses table schema...');
    
    // Add liters column
    await pool.query(`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS liters DECIMAL(10, 2);
    `);
    
    console.log('✅ Schema updated successfully!');
  } catch (err) {
    console.error('❌ Error updating schema:', err);
  } finally {
    await pool.end();
  }
};

updateSchema();
