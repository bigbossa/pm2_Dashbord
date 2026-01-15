import pool from './db.js';

const updateSchema = async () => {
  try {
    console.log('🔄 Updating database schema for Mileage Images...');

    const queries = [
      `ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS start_image_url TEXT`,
      `ALTER TABLE daily_work_logs ADD COLUMN IF NOT EXISTS end_image_url TEXT`
    ];

    for (const query of queries) {
      await pool.query(query);
      console.log(`✅ Executed: ${query}`);
    }

    console.log('🎉 Schema update complete!');
  } catch (err) {
    console.error('❌ Error updating schema:', err);
  } finally {
    await pool.end();
  }
};

updateSchema();
