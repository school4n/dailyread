const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

async function run() {
  const url = 'https://vnexpress.net/tranh-tu-bien-minh-thanh-cot-thu-loi-khi-giong-set-5124895.html';
  const response = await fetch(url);
  const html = await response.text();
  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  console.log("Title:", article.title);
  console.log("Content length:", article.content.length);
  console.log("Preview:", article.content.substring(0, 300));
}
run();
