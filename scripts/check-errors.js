require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

async function main() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("--- SOURCES WITH ERRORS ---");
  const sources = await db.execute("SELECT id, name, feed_url, last_error FROM sources WHERE last_error IS NOT NULL");
  console.table(sources.rows);

  console.log("\n--- RECENT FETCH LOGS ---");
  const logs = await db.execute("SELECT id, source_id, status, error_message, articles_added FROM fetch_logs ORDER BY id DESC LIMIT 5");
  console.table(logs.rows);
}

main().catch(console.error);
