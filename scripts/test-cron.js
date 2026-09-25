require('dotenv').config({ path: '.env.local' });
const { runScheduler } = require('./src/lib/scheduler');

async function test() {
  try {
    console.log("Running scheduler...");
    await runScheduler();
    console.log("Scheduler finished successfully.");
  } catch (err) {
    console.error("Scheduler failed with error:");
    console.error(err);
  }
}

test();
