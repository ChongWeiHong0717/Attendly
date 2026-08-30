const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(__dirname, '..', '.env.example'), envPath);
}

const envText = fs.readFileSync(envPath, 'utf8');
const match = envText.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
if (!match) throw new Error('DATABASE_URL is missing from backend/.env');

const url = new URL(match[1]);
const database = url.pathname.replace(/^\//, '');
const connection = {
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
};

(async () => {
  const conn = await mysql.createConnection(connection);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`Database ready: ${database}`);
})().catch((err) => {
  console.error('\nCould not connect to MySQL. Make sure XAMPP MySQL is running and backend/.env has the correct port/password.\n');
  console.error(err.message);
  process.exit(1);
});
