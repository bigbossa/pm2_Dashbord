import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  host: process.env.CRM_DB_HOST,
  port: process.env.CRM_DB_PORT,
  database: process.env.CRM_DB_NAME,
  user: process.env.CRM_DB_USER,
  password: process.env.CRM_DB_PASSWORD
});

const cleanupQueries = [
  { id: 84, field: 'start_image_url' },
  { id: 82, field: 'start_image_url' },
  { id: 81, field: 'start_image_url' },
  { id: 80, field: 'start_image_url' },
  { id: 79, field: 'start_image_url' },
  { id: 78, field: 'start_image_url' },
  { id: 73, field: 'start_image_url' },
  { id: 73, field: 'end_image_url' },
  { id: 72, field: 'start_image_url' },
  { id: 71, field: 'start_image_url' },
  { id: 71, field: 'end_image_url' },
  { id: 70, field: 'start_image_url' },
  { id: 70, field: 'end_image_url' },
  { id: 69, field: 'start_image_url' },
  { id: 69, field: 'end_image_url' },
  { id: 68, field: 'start_image_url' },
  { id: 68, field: 'end_image_url' },
  { id: 66, field: 'start_image_url' },
  { id: 66, field: 'end_image_url' },
  { id: 65, field: 'start_image_url' },
  { id: 65, field: 'end_image_url' },
  { id: 64, field: 'start_image_url' },
  { id: 64, field: 'end_image_url' },
  { id: 63, field: 'start_image_url' },
  { id: 63, field: 'end_image_url' },
  { id: 62, field: 'end_image_url' },
  { id: 59, field: 'end_image_url' },
  { id: 58, field: 'end_image_url' },
  { id: 57, field: 'end_image_url' },
  { id: 56, field: 'end_image_url' },
  { id: 54, field: 'end_image_url' },
  { id: 52, field: 'end_image_url' },
];

async function cleanupMissingImages() {
  try {
    console.log(`🧹 Cleaning up ${cleanupQueries.length} records...\n`);

    for (const { id, field } of cleanupQueries) {
      const query = `UPDATE daily_work_logs SET ${field} = NULL WHERE id = $1`;
      await pool.query(query, [id]);
      console.log(`✅ Cleared ${field} for ID ${id}`);
    }

    console.log(`\n✅ Successfully cleaned up ${cleanupQueries.length} invalid image paths!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

cleanupMissingImages();
