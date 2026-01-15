import { userPool } from './db.js';

const checkDb = async () => {
  try {
    console.log('🔍 Checking database structure...');
    
    // List tables
    const tablesRes = await userPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📂 Tables found:', tablesRes.rows.map(r => r.table_name));

    // Check columns for each table
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      const colsRes = await userPool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);
      console.log(`   📄 Columns in ${tableName}:`, colsRes.rows.map(r => r.column_name));
    }

  } catch (err) {
    console.error('❌ Error checking DB:', err);
  } finally {
    await userPool.end();
  }
};

checkDb();
