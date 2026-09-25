// URL utility tests
// tests/url.test.ts

import { normalizeUrl, slugify, generateSlug, isValidUrl } from '../worker/utils/url';
import { normalizeTitle, calculateSimilarity } from '../worker/utils/dedup';

type TestResult = { passed: boolean; name: string };

function test(name: string, fn: () => void): TestResult {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return { passed: true, name };
  } catch (err) {
    console.error(`❌ FAIL: ${name} - ${err}`);
    return { passed: false, name: `${name}: ${err}` };
  }
}

function assertEquals<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) throw new Error(`${msg}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const results: TestResult[] = [];

// normalizeUrl tests
results.push(test('normalizeUrl: Remove utm_source', () => {
  const url = normalizeUrl('https://example.com/article?utm_source=facebook&id=123');
  assert(!url.includes('utm_source'), 'utm_source removed');
  assert(url.includes('id=123'), 'legitimate param kept');
}));

results.push(test('normalizeUrl: Remove utm_campaign', () => {
  const url = normalizeUrl('https://example.com/article?utm_campaign=newsletter&utm_medium=email');
  assert(!url.includes('utm_campaign'), 'utm_campaign removed');
  assert(!url.includes('utm_medium'), 'utm_medium removed');
}));

results.push(test('normalizeUrl: Keep necessary params', () => {
  const url = normalizeUrl('https://example.com/search?q=test&page=2');
  assert(url.includes('q=test'), 'query param kept');
  assert(url.includes('page=2'), 'page param kept');
}));

results.push(test('normalizeUrl: Lowercase hostname', () => {
  const url = normalizeUrl('https://EXAMPLE.COM/article');
  assert(url.includes('example.com'), 'hostname lowercased');
}));

results.push(test('normalizeUrl: Handle invalid URL gracefully', () => {
  const result = normalizeUrl('not-a-url');
  assertEquals(result, 'not-a-url', 'Returns original on invalid');
}));

// slugify tests
results.push(test('slugify: Vietnamese chars', () => {
  const slug = slugify('Việt Nam đổi mới công nghệ');
  assert(!slug.includes('ệ'), 'Vietnamese removed');
  assert(slug.includes('viet-nam'), 'Words preserved');
}));

results.push(test('slugify: Special chars removed', () => {
  const slug = slugify('Test: Article! (2026)');
  assert(!slug.includes(':'), 'Colon removed');
  assert(!slug.includes('!'), 'Exclamation removed');
  assert(!slug.includes('('), 'Parens removed');
}));

results.push(test('slugify: Max length 100', () => {
  const long = 'a'.repeat(200);
  const slug = slugify(long);
  assert(slug.length <= 100, `Slug length ${slug.length} <= 100`);
}));

results.push(test('slugify: Fallback on empty', () => {
  const slug = slugify('!!!');
  assertEquals(slug, 'article', 'Fallback to "article"');
}));

// isValidUrl tests
results.push(test('isValidUrl: Valid HTTPS', () => {
  assert(isValidUrl('https://example.com'), 'https is valid');
}));

results.push(test('isValidUrl: Valid HTTP', () => {
  assert(isValidUrl('http://example.com/feed.rss'), 'http is valid');
}));

results.push(test('isValidUrl: Invalid protocol', () => {
  assert(!isValidUrl('ftp://example.com'), 'ftp is invalid');
  assert(!isValidUrl('javascript:alert(1)'), 'javascript is invalid');
}));

// Dedup tests
results.push(test('normalizeTitle: Lowercase', () => {
  const result = normalizeTitle('Apple Ra Mắt iPhone Mới');
  assertEquals(result, result.toLowerCase(), 'Lowercased');
}));

results.push(test('calculateSimilarity: Identical titles', () => {
  const sim = calculateSimilarity('Apple ra mắt iPhone mới', 'Apple ra mắt iPhone mới');
  assertEquals(sim, 1, 'Same title = 1.0 similarity');
}));

results.push(test('calculateSimilarity: Very different', () => {
  const sim = calculateSimilarity('Bóng đá Việt Nam thắng trận', 'Công nghệ AI phát triển nhanh');
  assert(sim < 0.3, `Different articles have low similarity: ${sim}`);
}));

results.push(test('calculateSimilarity: Similar articles', () => {
  const sim = calculateSimilarity(
    'Apple ra mắt iPhone 16 mới nhất',
    'Apple chính thức ra mắt iPhone 16'
  );
  assert(sim > 0.5, `Similar articles: ${sim}`);
}));

// Summary
const passed = results.filter(r => r.passed).length;
console.log(`\n📊 Results: ${passed}/${results.length} tests passed`);
if (passed < results.length) {
  console.error(`Failed: ${results.length - passed} tests`);
  process.exit(1);
} else {
  console.log('All tests passed! 🎉');
}
