// RSS Parser Tests
// tests/rss.test.ts

/**
 * Test the RSS parser logic
 * Run with: node tests/rss.test.ts (requires ts-node or tsx)
 */

import { parseFeed } from '../worker/parsers/rss';

const RSS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    <item>
      <title>Test Article 1</title>
      <link>https://example.com/article-1</link>
      <description>This is a test excerpt for article 1</description>
      <pubDate>Thu, 25 Sep 2026 10:00:00 +0700</pubDate>
      <guid>https://example.com/article-1</guid>
      <author>Test Author</author>
      <category>Technology</category>
      <media:thumbnail url="https://example.com/image.jpg" />
    </item>
    <item>
      <title>Test Article 2</title>
      <link>https://example.com/article-2</link>
      <description><![CDATA[<p>Article 2 content with <strong>HTML</strong></p>]]></description>
      <pubDate>Thu, 25 Sep 2026 11:00:00 +0700</pubDate>
      <guid>test-guid-2</guid>
    </item>
  </channel>
</rss>`;

const ATOM_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com" rel="alternate"/>
  <id>https://example.com/feed</id>
  <entry>
    <title>Atom Article 1</title>
    <link href="https://example.com/atom-1" rel="alternate"/>
    <id>https://example.com/atom-1</id>
    <published>2026-09-25T10:00:00+07:00</published>
    <updated>2026-09-25T10:00:00+07:00</updated>
    <summary>Summary of atom article 1</summary>
    <author><name>Atom Author</name></author>
    <category term="science"/>
  </entry>
</feed>`;

type TestResult = {
  passed: boolean;
  message: string;
};

function test(name: string, fn: () => void): TestResult {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return { passed: true, message: name };
  } catch (err) {
    console.error(`❌ FAIL: ${name} - ${err}`);
    return { passed: false, message: `${name}: ${err}` };
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const results: TestResult[] = [];

// Test RSS parsing
results.push(test('RSS: Parse feed title', () => {
  const feed = parseFeed(RSS_SAMPLE);
  assertEquals(feed.title, 'Test Feed', 'Feed title');
}));

results.push(test('RSS: Parse items count', () => {
  const feed = parseFeed(RSS_SAMPLE);
  assertEquals(feed.items.length, 2, 'Items count');
}));

results.push(test('RSS: Parse first item title', () => {
  const feed = parseFeed(RSS_SAMPLE);
  assertEquals(feed.items[0].title, 'Test Article 1', 'First item title');
}));

results.push(test('RSS: Parse first item link', () => {
  const feed = parseFeed(RSS_SAMPLE);
  assertEquals(feed.items[0].link, 'https://example.com/article-1', 'First item link');
}));

results.push(test('RSS: Parse item author', () => {
  const feed = parseFeed(RSS_SAMPLE);
  assertEquals(feed.items[0].author, 'Test Author', 'Item author');
}));

results.push(test('RSS: Parse item category', () => {
  const feed = parseFeed(RSS_SAMPLE);
  assertEquals(feed.items[0].category, 'Technology', 'Item category');
}));

results.push(test('RSS: Strip HTML from description', () => {
  const feed = parseFeed(RSS_SAMPLE);
  const item2 = feed.items[1];
  assert(!item2.description?.includes('<p>'), 'HTML stripped from excerpt');
  assert(item2.description?.includes('Article 2 content') === true, 'Content preserved');
}));

// Test Atom parsing
results.push(test('Atom: Parse feed title', () => {
  const feed = parseFeed(ATOM_SAMPLE);
  assertEquals(feed.title, 'Test Atom Feed', 'Atom feed title');
}));

results.push(test('Atom: Parse entry title', () => {
  const feed = parseFeed(ATOM_SAMPLE);
  assertEquals(feed.items[0].title, 'Atom Article 1', 'Atom entry title');
}));

results.push(test('Atom: Parse entry link', () => {
  const feed = parseFeed(ATOM_SAMPLE);
  assertEquals(feed.items[0].link, 'https://example.com/atom-1', 'Atom entry link');
}));

results.push(test('Atom: Parse entry author', () => {
  const feed = parseFeed(ATOM_SAMPLE);
  assertEquals(feed.items[0].author, 'Atom Author', 'Atom entry author');
}));

// Test error handling
results.push(test('Error: Throw on invalid XML', () => {
  let threw = false;
  try {
    parseFeed('not xml at all');
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw on invalid XML');
}));

// Summary
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`\n📊 Results: ${passed}/${results.length} tests passed`);

if (failed > 0) {
  console.error(`Failed tests: ${failed}`);
  process.exit(1);
} else {
  console.log('All tests passed! 🎉');
}
