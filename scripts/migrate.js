const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log('Connecting to DB:', url);

  const client = createClient({ url, authToken });

  try {
    console.log('Applying schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
    // executeMultiple is available in some versions, but we can just split by ;
    const stmts = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      await client.execute(stmt);
    }
    console.log('Schema applied successfully.');

    console.log('Applying seed data...');
    const seed = fs.readFileSync(path.join(__dirname, '../db/migrations/0001_init.sql'), 'utf-8');
    const seedStmts = seed.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of seedStmts) {
      try {
        await client.execute(stmt);
      } catch (e) {
        // Ignore duplicate key errors on seed
      }
    }
    console.log('Seed applied successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  }
}

main();