/**
 * SmartLedger 数据库 Schema 与版本化迁移
 *
 * 类比 Python:
 *   migrateDb() ≈ Alembic 的 upgrade()
 *   PRAGMA user_version ≈ alembic_version 表
 *   execAsync(多条SQL) ≈ cursor.executescript()
 *
 * expo-sqlite API:
 *   db.execAsync(sql)       — 执行多条 SQL（用 ; 分隔），无返回值
 *   db.getFirstAsync<T>(sql) — 查询单行，返回 T | null
 *   db.runAsync(sql, ...params) — 执行单条 SQL，返回 { lastInsertRowId, changes }
 */
import type { SQLiteDatabase } from "expo-sqlite";

const DATABASE_VERSION = 1;

// TODO(human): 实现数据库迁移函数
// 提示:
//   1. 用 PRAGMA user_version 读取当前版本
//   2. 如果 currentVersion >= DATABASE_VERSION，直接 return（已是最新）
//   3. 如果 currentVersion === 0（首次），用 db.execAsync() 执行建表 SQL：
//      - 设置 PRAGMA journal_mode = 'wal'（WAL 模式，提高并发读写性能）
//      - 建 categories 表（参考 types.ts 的 Category 接口）
//      - 建 accounts 表（参考 Account，注意 deleted_at 可以为 NULL）
//      - 建 transactions 表（参考 Transaction，注意外键、CHECK 约束）
//      - 建 chat_messages 表（参考 ChatMessage）
//      - 创建索引：transactions 的 date、category_id、account_id、deleted_at
//      - 创建索引：chat_messages 的 created_at
//   4. 更新 PRAGMA user_version = DATABASE_VERSION
//
// SQL 语法参考:
//   CREATE TABLE IF NOT EXISTS xxx (
//     id TEXT PRIMARY KEY NOT NULL,
//     type TEXT NOT NULL CHECK(type IN ('a', 'b')),
//     amount REAL NOT NULL CHECK(amount > 0),
//     foreign_id TEXT NOT NULL REFERENCES other_table(id),
//     nullable_field TEXT,          -- 可以为 NULL（不写 NOT NULL 即可）
//     created_at TEXT NOT NULL
//   );
//   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  // TODO(human): 在这里实现迁移逻辑
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }
  if (currentVersion === 0) {
    await db.execAsync(`PRAGMA journal_mode = 'wal';`);

    // 创建表:accounts
    await db.execAsync(`
            CREATE TABLE IF NOT EXISTS accounts (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              type TEXT NOT NULL CHECK(type IN ('wechat', 'alipay', 'cash', 'bank_card')),
              currency TEXT NOT NULL CHECK(currency IN ('CNY', 'USD')),
              initial_balance REAL NOT NULL DEFAULT 0,
              icon TEXT NOT NULL,
              sort_order INTEGER NOT NULL,
              deleted_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              icon TEXT NOT NULL,
              type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
              is_system INTEGER NOT NULL,
              sort_order INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY NOT NULL,
              amount REAL NOT NULL,
              currency TEXT NOT NULL CHECK(currency IN ('CNY', 'USD')),
              type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
              category_id TEXT NOT NULL REFERENCES categories(id),
              account_id TEXT NOT NULL REFERENCES accounts(id),
              note TEXT,
              date TEXT NOT NULL,
              source TEXT NOT NULL CHECK(source IN ('manual' , 'text' , 'voice' , 'ocr')),
              sync_status TEXT NOT NULL CHECK(sync_status IN ('pending' , 'synced' , 'failed')),
              device_id TEXT NOT NULL,
              deleted_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
              id TEXT PRIMARY KEY NOT NULL,
              role TEXT NOT NULL CHECK(role IN ('user' , 'assistant')),
              content TEXT NOT NULL,
              content_type TEXT NOT NULL CHECK(content_type IN ('text' , 'voice' , 'image' , 'card')),
              parse_status TEXT CHECK(parse_status IN ('pending' , 'success' ,'fallback' , 'error')),
              transaction_id TEXT REFERENCES transactions(id),
              created_at TEXT NOT NULL
            );

            -- 创建索引：transactions 表的常用查询字段
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);

            -- 创建索引：chat_messages 表的常用查询字段
            CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

        `);

    // 设置为版本:DATABASE_VERSION
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
  }
}
