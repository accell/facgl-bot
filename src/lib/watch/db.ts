import initSqlJs, { type Database } from 'sql.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data', 'watches.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS watches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        category_id INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        UNIQUE(guild_id, keyword, category_id)
      );

      CREATE TABLE IF NOT EXISTS seen_items (
        watch_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        first_seen INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (watch_id, item_id),
        FOREIGN KEY (watch_id) REFERENCES watches(id) ON DELETE CASCADE
      );
    `);
    saveDb();
  }
  return db;
}

function saveDb(): void {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export interface Watch {
  id: number;
  guild_id: string;
  channel_id: string;
  keyword: string;
  category_id: number | null;
  created_at: number;
}

function rowToWatch(row: Record<string, unknown>): Watch {
  return {
    id: Number(row.id),
    guild_id: String(row.guild_id),
    channel_id: String(row.channel_id),
    keyword: String(row.keyword),
    category_id: row.category_id != null ? Number(row.category_id) : null,
    created_at: Number(row.created_at),
  };
}

function queryAll(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as initSqlJs.BindParams);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(db: Database, sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const rows = queryAll(db, sql, params);
  return rows[0] ?? null;
}

function execute(db: Database, sql: string, params: unknown[] = []): void {
  db.run(sql, params as initSqlJs.BindParams);
}

export async function addWatch(
  guildId: string,
  channelId: string,
  keyword: string,
  categoryId: number | null,
): Promise<Watch> {
  const d = await getDb();
  execute(d, 'INSERT INTO watches (guild_id, channel_id, keyword, category_id) VALUES (?, ?, ?, ?)', [
    guildId,
    channelId,
    keyword,
    categoryId,
  ]);
  const row = queryOne(d, 'SELECT * FROM watches WHERE guild_id = ? AND keyword = ? AND category_id IS ?', [
    guildId,
    keyword,
    categoryId,
  ]);
  saveDb();
  return rowToWatch(row!);
}

export async function removeWatch(guildId: string, watchId: number): Promise<boolean> {
  const d = await getDb();
  const before = queryAll(d, 'SELECT id FROM watches WHERE id = ? AND guild_id = ?', [watchId, guildId]);
  if (before.length === 0) return false;
  execute(d, 'DELETE FROM seen_items WHERE watch_id = ?', [watchId]);
  execute(d, 'DELETE FROM watches WHERE id = ? AND guild_id = ?', [watchId, guildId]);
  saveDb();
  return true;
}

export async function listWatches(guildId: string): Promise<Watch[]> {
  const d = await getDb();
  return queryAll(d, 'SELECT * FROM watches WHERE guild_id = ? ORDER BY id', [guildId]).map(rowToWatch);
}

export async function setWatchChannel(guildId: string, watchId: number, channelId: string): Promise<boolean> {
  const d = await getDb();
  const before = queryAll(d, 'SELECT id FROM watches WHERE id = ? AND guild_id = ?', [watchId, guildId]);
  if (before.length === 0) return false;
  execute(d, 'UPDATE watches SET channel_id = ? WHERE id = ? AND guild_id = ?', [channelId, watchId, guildId]);
  saveDb();
  return true;
}

export async function getAllWatches(): Promise<Watch[]> {
  const d = await getDb();
  return queryAll(d, 'SELECT * FROM watches ORDER BY id').map(rowToWatch);
}

export async function getSeenItems(watchId: number): Promise<Set<string>> {
  const d = await getDb();
  const rows = queryAll(d, 'SELECT item_id FROM seen_items WHERE watch_id = ?', [watchId]);
  return new Set(rows.map((r) => String(r.item_id)));
}

export async function markItemsSeen(watchId: number, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const d = await getDb();
  for (const id of itemIds) {
    execute(d, 'INSERT OR IGNORE INTO seen_items (watch_id, item_id) VALUES (?, ?)', [watchId, id]);
  }
  saveDb();
}
