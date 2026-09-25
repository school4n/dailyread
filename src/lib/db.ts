import { createClient } from '@libsql/client';

// Khởi tạo connection đến Turso (hoặc SQLite local)
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper functions để format response giống D1 cũ
export async function queryAll<T>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function queryFirst<T>(sql: string, args: (string | number | null)[] = []): Promise<T | null> {
  const result = await db.execute({ sql, args });
  return (result.rows[0] as unknown as T) || null;
}

export async function execute(sql: string, args: (string | number | null)[] = []) {
  return await db.execute({ sql, args });
}
