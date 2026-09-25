const { fetchAndParseFeed } = require('./src/lib/parsers/rss');
async function run() {
  try {
    const res = await fetchAndParseFeed('https://vnexpress.net/rss/tin-moi-nhat.rss');
    console.log("Success! Found " + res.feed.items.length + " items.");
    console.log("First item:", res.feed.items[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
