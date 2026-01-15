import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (one level up from server/)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.CRM_DB_USER || process.env.DB_USER,
  host: process.env.CRM_DB_HOST || process.env.DB_HOST,
  database: process.env.CRM_DB_NAME || process.env.DB_NAME,
  password: process.env.CRM_DB_PASSWORD || process.env.DB_PASSWORD,
  port: process.env.CRM_DB_PORT || process.env.DB_PORT,
});

export const userPool = new Pool({
  user: process.env.CRM_USER_DB_USER || process.env.USER_DB_USER,
  host: process.env.CRM_USER_DB_HOST || process.env.USER_DB_HOST,
  database: process.env.CRM_USER_DB_NAME || process.env.USER_DB_NAME,
  password: process.env.CRM_USER_DB_PASSWORD || process.env.USER_DB_PASSWORD,
  port: process.env.CRM_USER_DB_PORT || process.env.USER_DB_PORT,
});

export default pool;
