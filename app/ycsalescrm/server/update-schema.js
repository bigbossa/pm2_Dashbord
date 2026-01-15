import pool from './db.js';

const updateSchema = async () => {
  try {
    console.log('🔄 Updating database schema...');

    const queries = [
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS customertype VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS target VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS type VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS typeproduct VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS image TEXT`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS contact VARCHAR(255)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
      `ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS project VARCHAR(255)`
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
