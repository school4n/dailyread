-- Migration: 0001_init.sql
-- Initial database setup

-- Categories seed data
INSERT OR IGNORE INTO categories (name, slug, icon, display_order) VALUES
  ('Mới nhất', 'latest', '🔥', 0),
  ('Việt Nam', 'vietnam', '🇻🇳', 1),
  ('Thế giới', 'world', '🌍', 2),
  ('Công nghệ', 'technology', '💻', 3),
  ('Thể thao', 'sports', '⚽', 4),
  ('Kinh tế', 'business', '📈', 5),
  ('Khoa học', 'science', '🔬', 6),
  ('Giải trí', 'entertainment', '🎭', 7),
  ('Game', 'game', '🎮', 8),
  ('Ô tô', 'auto', '🚗', 9),
  ('Điện thoại', 'mobile', '📱', 10),
  ('Máy tính', 'computer', '🖥️', 11),
  ('AI', 'ai', '🤖', 12),
  ('Bóng đá', 'football', '⚽', 13);

-- Demo sources with valid RSS feeds
INSERT OR IGNORE INTO sources (name, website_url, feed_url, category, language, country, enabled, fetch_interval) VALUES
  ('VnExpress', 'https://vnexpress.net', 'https://vnexpress.net/rss/tin-moi-nhat.rss', 'latest', 'vi', 'VN', 1, 30),
  ('VnExpress Công nghệ', 'https://vnexpress.net', 'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss', 'technology', 'vi', 'VN', 1, 60),
  ('VnExpress Thể thao', 'https://vnexpress.net', 'https://vnexpress.net/rss/the-thao.rss', 'sports', 'vi', 'VN', 1, 60),
  ('VnExpress Kinh doanh', 'https://vnexpress.net', 'https://vnexpress.net/rss/kinh-doanh.rss', 'business', 'vi', 'VN', 1, 60),
  ('VnExpress Giải trí', 'https://vnexpress.net', 'https://vnexpress.net/rss/giai-tri.rss', 'entertainment', 'vi', 'VN', 1, 60),
  ('BBC News Tiếng Việt', 'https://www.bbc.com/vietnamese', 'https://feeds.bbci.co.uk/vietnamese/rss.xml', 'world', 'vi', 'GB', 1, 60),
  ('Reuters Technology', 'https://www.reuters.com', 'https://feeds.reuters.com/reuters/technologyNews', 'technology', 'en', 'US', 1, 60),
  ('NASA News', 'https://www.nasa.gov', 'https://www.nasa.gov/feed/', 'science', 'en', 'US', 1, 120),
  ('Hacker News', 'https://news.ycombinator.com', 'https://hnrss.org/frontpage', 'technology', 'en', 'US', 1, 30),
  ('TechCrunch', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 'technology', 'en', 'US', 1, 60);
