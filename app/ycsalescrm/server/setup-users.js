import { userPool } from './db.js';

const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert a demo user if not exists
  INSERT INTO users (username, password, full_name, email)
  VALUES ('demo', '1234', 'Demo User', 'demo@example.com')
  ON CONFLICT (username) DO NOTHING;
`;

const setupUserDatabase = async () => {
  try {
    console.log('⏳ Creating users table in useryc...');
    await userPool.query(createUsersTableQuery);
    console.log('✅ Users table created successfully!');
    console.log('👤 Demo user created: username=demo, password=1234');
  } catch (err) {
    console.error('❌ Error creating users table:', err);
  } finally {
    await userPool.end();
  }
};

setupUserDatabase();
