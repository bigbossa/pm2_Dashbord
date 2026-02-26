const { Pool } = require('pg');

const p = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'usermanagementsystem',
  user: 'postgres',
  password: '25800852'
});

async function run() {
  try {
    // Update AutoPO URL to skip login page
    await p.query(
      "UPDATE apps SET url = '/autopo' WHERE name = 'AutoPO'"
    );
    const res = await p.query("SELECT name, url FROM apps WHERE name = 'AutoPO'");
    console.log('Updated:', res.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}

run();
