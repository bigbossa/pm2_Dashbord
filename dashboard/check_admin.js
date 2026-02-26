const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const p = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'usermanagementsystem',
  user: 'postgres',
  password: '25800852'
});

async function check() {
  try {
    const res = await p.query("SELECT id, username, password_hash FROM users WHERE LOWER(username) = 'admin'");
    if (res.rows.length === 0) {
      console.log('Admin NOT FOUND');
    } else {
      const user = res.rows[0];
      console.log('User:', user.username);
      console.log('Hash:', user.password_hash);
      
      // Try with original hash
      const match1 = await bcrypt.compare('1234', user.password_hash);
      console.log('Password "1234" with original hash:', match1);
      
      // Try converting $2y$ to $2b$ (PHP bcrypt to Node bcrypt)
      const fixedHash = user.password_hash.replace('$2y$', '$2b$');
      console.log('Fixed hash:', fixedHash);
      const match2 = await bcrypt.compare('1234', fixedHash);
      console.log('Password "1234" with $2b$ hash:', match2);

      // Generate new hash for "1234"
      const newHash = await bcrypt.hash('1234', 10);
      console.log('New hash for "1234":', newHash);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}

check();
