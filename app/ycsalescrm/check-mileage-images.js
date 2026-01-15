import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  host: process.env.CRM_DB_HOST,
  port: process.env.CRM_DB_PORT,
  database: process.env.CRM_DB_NAME,
  user: process.env.CRM_DB_USER,
  password: process.env.CRM_DB_PASSWORD
});

const imagesDir = path.join(process.cwd(), 'public', 'images');

async function checkMileageImages() {
  try {
    const result = await pool.query(`
      SELECT id, start_image_url, end_image_url 
      FROM daily_work_logs 
      WHERE start_image_url IS NOT NULL OR end_image_url IS NOT NULL
      ORDER BY id DESC
    `);

    console.log(`\n📋 Found ${result.rows.length} records with mileage images\n`);

    const missingImages = [];

    for (const row of result.rows) {
      if (row.start_image_url) {
        const filename = row.start_image_url.replace('/images/', '');
        const filepath = path.join(imagesDir, filename);
        const exists = fs.existsSync(filepath);
        
        if (!exists) {
          console.log(`❌ Missing START image: ID ${row.id} - ${row.start_image_url}`);
          missingImages.push({ id: row.id, field: 'start_image_url', url: row.start_image_url });
        } else {
          console.log(`✅ Found START image: ID ${row.id} - ${filename}`);
        }
      }

      if (row.end_image_url) {
        const filename = row.end_image_url.replace('/images/', '');
        const filepath = path.join(imagesDir, filename);
        const exists = fs.existsSync(filepath);
        
        if (!exists) {
          console.log(`❌ Missing END image: ID ${row.id} - ${row.end_image_url}`);
          missingImages.push({ id: row.id, field: 'end_image_url', url: row.end_image_url });
        } else {
          console.log(`✅ Found END image: ID ${row.id} - ${filename}`);
        }
      }
    }

    if (missingImages.length > 0) {
      console.log(`\n\n⚠️  Found ${missingImages.length} missing image(s):\n`);
      missingImages.forEach(img => {
        console.log(`   ID ${img.id}: ${img.field} = ${img.url}`);
      });

      console.log('\n💡 To clean up these records, run:');
      for (const img of missingImages) {
        console.log(`   UPDATE daily_work_logs SET ${img.field} = NULL WHERE id = ${img.id};`);
      }
    } else {
      console.log('\n✅ All mileage images exist!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMileageImages();
