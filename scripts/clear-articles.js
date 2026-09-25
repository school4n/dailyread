require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

async function main() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Deleting old articles...");
  await db.execute("DELETE FROM articles");
  console.log("Resetting fetch tracking...");
  await db.execute("UPDATE sources SET last_fetched_at = NULL, last_success_at = NULL, etag = NULL, last_modified = NULL");
  
  console.log("Successfully cleared articles and reset source tracking.");
}

main().catch(console.error);
