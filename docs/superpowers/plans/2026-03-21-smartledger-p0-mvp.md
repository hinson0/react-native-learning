# SmartLedger P0 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully offline-capable text-based bookkeeping app with a chat UI, local rule engine, and SQLite persistence.

**Architecture:** Offline-first with expo-sqlite as the single source of truth. A local rule engine (pure TypeScript regex + keyword matching) parses natural language input into structured transactions. A chat-style UI serves as the unified entry point. SQLiteProvider wraps the app at root level, providing database access via `useSQLiteContext()` hook to all screens.

**Tech Stack:** React Native + Expo SDK 55, expo-sqlite, expo-router, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-21-ai-ledger-design.md`

---

## File Structure

```
lib/
├── db/
│   ├── types.ts              # All TypeScript interfaces and enums
│   ├── schema.ts             # SQL DDL + migration logic
│   ├── seed.ts               # Preset categories and accounts
│   ├── category-dao.ts       # Category read operations
│   ├── account-dao.ts        # Account CRUD
│   ├── transaction-dao.ts    # Transaction CRUD + balance query
│   └── chat-dao.ts           # ChatMessage CRUD
├── engine/
│   ├── keywords.ts           # Category keyword mapping table
│   ├── amount-parser.ts      # Extract amount + currency from text
│   ├── category-matcher.ts   # Match text to category via keywords
│   └── parser.ts             # Orchestrator: text → ParsedTransaction
app/
├── _layout.tsx               # MODIFY: wrap with SQLiteProvider
├── (tabs)/
│   ├── _layout.tsx           # MODIFY: update tabs (Chat/Stats/Settings)
│   ├── index.tsx             # REWRITE: chat screen
│   ├── stats.tsx             # CREATE: placeholder
│   └── settings.tsx          # CREATE: placeholder
├── transaction/
│   ├── [id].tsx              # CREATE: transaction detail/edit
│   └── manual.tsx            # CREATE: manual entry form
├── components/
│   ├── chat/
│   │   ├── message-list.tsx      # FlatList of chat messages
│   │   ├── message-bubble.tsx    # Single message (text or card)
│   │   ├── input-bar.tsx         # Text input + send button
│   │   └── confirmation-card.tsx # Parsed transaction confirm/cancel
│   └── transaction/
│       ├── category-picker.tsx   # Category selection grid
│       └── transaction-list.tsx  # Date-grouped transaction list
__tests__/
├── engine/
│   ├── amount-parser.test.ts
│   ├── category-matcher.test.ts
│   └── parser.test.ts
```

---

## Task 1: Project Setup & Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install expo-sqlite**

```bash
npx expo install expo-sqlite
```

- [ ] **Step 2: Install uuid generation library**

```bash
npx expo install expo-crypto
```

> `expo-crypto` provides `randomUUID()` for generating UUIDs without native module issues.

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev jest @types/jest ts-jest
```

- [ ] **Step 4: Create jest config**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

- [ ] **Step 5: Add test script to package.json**

Add to `scripts`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p lib/db lib/engine app/components/chat app/components/transaction app/transaction __tests__/engine
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json jest.config.js
git commit -m "chore: add expo-sqlite, expo-crypto, jest setup for P0 MVP"
```

---

## Task 2: TypeScript Types & Interfaces

**Files:**
- Create: `lib/db/types.ts`

- [ ] **Step 1: Write all type definitions**

```typescript
// lib/db/types.ts

// === Enums as union types ===

export type AccountType = 'wechat' | 'alipay' | 'cash' | 'bank_card';
export type Currency = 'CNY' | 'USD';
export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'text' | 'voice' | 'ocr';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type MessageRole = 'user' | 'assistant';
export type MessageContentType = 'text' | 'voice' | 'image' | 'card';
export type ParseStatus = 'success' | 'fallback' | 'pending' | 'error';
export type Confidence = 'high' | 'low';
export type ParseSource = 'rule_engine' | 'glm';

// === Database row types ===

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: Currency;
  readonly initial_balance: number;
  readonly icon: string;
  readonly sort_order: number;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly type: TransactionType;
  readonly is_system: number; // SQLite has no boolean; 1 = true
  readonly sort_order: number;
}

export interface Transaction {
  readonly id: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly category_id: string;
  readonly account_id: string;
  readonly note: string | null;
  readonly date: string; // YYYY-MM-DD
  readonly source: TransactionSource;
  readonly sync_status: SyncStatus;
  readonly device_id: string;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly content_type: MessageContentType;
  readonly parse_status: ParseStatus | null;
  readonly transaction_id: string | null;
  readonly created_at: string;
}

// === Non-DB types ===

export interface ParsedTransaction {
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly category_id: string | null;
  readonly note: string | null;
  readonly confidence: Confidence;
  readonly source: ParseSource;
}

// === Input types for creating records ===

export interface CreateTransactionInput {
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly category_id: string;
  readonly account_id: string;
  readonly note: string | null;
  readonly date: string;
  readonly source: TransactionSource;
}

export interface CreateChatMessageInput {
  readonly role: MessageRole;
  readonly content: string;
  readonly content_type: MessageContentType;
  readonly parse_status: ParseStatus | null;
  readonly transaction_id: string | null;
}

export interface AccountBalance {
  readonly account: Account;
  readonly balance: number; // initial_balance + income - expense
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/types.ts
git commit -m "feat: add TypeScript type definitions for all data models"
```

---

## Task 3: Database Schema & Migration

**Files:**
- Create: `lib/db/schema.ts`

- [ ] **Step 1: Write schema with versioned migration**

```typescript
// lib/db/schema.ts
import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        is_system INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('wechat', 'alipay', 'cash', 'bank_card')),
        currency TEXT NOT NULL CHECK(currency IN ('CNY', 'USD')),
        initial_balance REAL NOT NULL DEFAULT 0,
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        currency TEXT NOT NULL CHECK(currency IN ('CNY', 'USD')),
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category_id TEXT NOT NULL REFERENCES categories(id),
        account_id TEXT NOT NULL REFERENCES accounts(id),
        note TEXT,
        date TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('manual', 'text', 'voice', 'ocr')),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
        device_id TEXT NOT NULL,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        content_type TEXT NOT NULL CHECK(content_type IN ('text', 'voice', 'image', 'card')),
        parse_status TEXT CHECK(parse_status IN ('success', 'fallback', 'pending', 'error')),
        transaction_id TEXT REFERENCES transactions(id),
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
    `);
    currentVersion = 1;
  }

  // Future migrations go here:
  // if (currentVersion === 1) { ... currentVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add SQLite schema with versioned migration"
```

---

## Task 4: Seed Data

**Files:**
- Create: `lib/db/seed.ts`

- [ ] **Step 1: Write seed data for categories and accounts**

```typescript
// lib/db/seed.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

interface CategorySeed {
  readonly name: string;
  readonly icon: string;
  readonly type: 'income' | 'expense';
}

const EXPENSE_CATEGORIES: readonly CategorySeed[] = [
  { name: '餐饮', icon: 'utensils', type: 'expense' },
  { name: '交通', icon: 'car', type: 'expense' },
  { name: '购物', icon: 'shopping-bag', type: 'expense' },
  { name: '住房', icon: 'home', type: 'expense' },
  { name: '娱乐', icon: 'gamepad', type: 'expense' },
  { name: '医疗', icon: 'hospital', type: 'expense' },
  { name: '教育', icon: 'book', type: 'expense' },
  { name: '通讯', icon: 'phone', type: 'expense' },
  { name: '日用', icon: 'box', type: 'expense' },
  { name: '其他', icon: 'ellipsis', type: 'expense' },
] as const;

const INCOME_CATEGORIES: readonly CategorySeed[] = [
  { name: '工资', icon: 'briefcase', type: 'income' },
  { name: '兼职', icon: 'clock', type: 'income' },
  { name: '投资', icon: 'trending-up', type: 'income' },
  { name: '红包', icon: 'gift', type: 'income' },
  { name: '其他', icon: 'ellipsis', type: 'income' },
] as const;

interface AccountSeed {
  readonly name: string;
  readonly type: 'wechat' | 'alipay' | 'cash' | 'bank_card';
  readonly currency: 'CNY' | 'USD';
  readonly icon: string;
}

const DEFAULT_ACCOUNTS: readonly AccountSeed[] = [
  { name: '微信', type: 'wechat', currency: 'CNY', icon: 'message-circle' },
  { name: '支付宝', type: 'alipay', currency: 'CNY', icon: 'credit-card' },
  { name: '现金', type: 'cash', currency: 'CNY', icon: 'dollar-sign' },
  { name: '银行卡', type: 'bank_card', currency: 'CNY', icon: 'credit-card' },
] as const;

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  // Check if already seeded
  const count = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM categories'
  );
  if (count && count.cnt > 0) {
    return;
  }

  const now = new Date().toISOString();
  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < allCategories.length; i++) {
      const cat = allCategories[i];
      await txn.runAsync(
        'INSERT INTO categories (id, name, icon, type, is_system, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
        randomUUID(), cat.name, cat.icon, cat.type, i
      );
    }

    for (let i = 0; i < DEFAULT_ACCOUNTS.length; i++) {
      const acc = DEFAULT_ACCOUNTS[i];
      await txn.runAsync(
        'INSERT INTO accounts (id, name, type, currency, initial_balance, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)',
        randomUUID(), acc.name, acc.type, acc.currency, acc.icon, i, now, now
      );
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/seed.ts
git commit -m "feat: add seed data for preset categories and accounts"
```

---

## Task 5: DAO Layer — Categories & Accounts

**Files:**
- Create: `lib/db/category-dao.ts`
- Create: `lib/db/account-dao.ts`

- [ ] **Step 1: Write category DAO (read-only for P0)**

```typescript
// lib/db/category-dao.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, TransactionType } from './types';

export function getAllCategories(db: SQLiteDatabase): Category[] {
  return db.getAllSync<Category>(
    'SELECT * FROM categories ORDER BY type, sort_order'
  );
}

export function getCategoriesByType(
  db: SQLiteDatabase,
  type: TransactionType
): Category[] {
  return db.getAllSync<Category>(
    'SELECT * FROM categories WHERE type = ? ORDER BY sort_order',
    type
  );
}

export function getCategoryById(
  db: SQLiteDatabase,
  id: string
): Category | null {
  return db.getFirstSync<Category>(
    'SELECT * FROM categories WHERE id = ?',
    id
  );
}

export function getCategoryByName(
  db: SQLiteDatabase,
  name: string,
  type: TransactionType
): Category | null {
  return db.getFirstSync<Category>(
    'SELECT * FROM categories WHERE name = ? AND type = ?',
    name, type
  );
}
```

- [ ] **Step 2: Write account DAO**

```typescript
// lib/db/account-dao.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, AccountBalance } from './types';

export function getAllAccounts(db: SQLiteDatabase): Account[] {
  return db.getAllSync<Account>(
    'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order'
  );
}

export function getAccountById(
  db: SQLiteDatabase,
  id: string
): Account | null {
  return db.getFirstSync<Account>(
    'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL',
    id
  );
}

export function getAccountBalance(
  db: SQLiteDatabase,
  accountId: string
): number {
  const account = getAccountById(db, accountId);
  if (!account) return 0;

  const income = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions
     WHERE account_id = ? AND type = 'income' AND deleted_at IS NULL`,
    accountId
  );

  const expense = db.getFirstSync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions
     WHERE account_id = ? AND type = 'expense' AND deleted_at IS NULL`,
    accountId
  );

  return account.initial_balance
    + (income?.total ?? 0)
    - (expense?.total ?? 0);
}

export function getAllAccountBalances(db: SQLiteDatabase): AccountBalance[] {
  const accounts = getAllAccounts(db);
  return accounts.map((account) => ({
    account,
    balance: getAccountBalance(db, account.id),
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/category-dao.ts lib/db/account-dao.ts
git commit -m "feat: add category and account DAO layers"
```

---

## Task 6: DAO Layer — Transactions

**Files:**
- Create: `lib/db/transaction-dao.ts`

- [ ] **Step 1: Write transaction DAO with CRUD + queries**

```typescript
// lib/db/transaction-dao.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { Transaction, CreateTransactionInput } from './types';
import { getAccountById } from './account-dao';

const DEVICE_ID = randomUUID(); // One per app install

export function createTransaction(
  db: SQLiteDatabase,
  input: CreateTransactionInput
): Transaction {
  const account = getAccountById(db, input.account_id);
  if (!account) {
    throw new Error(`Account not found: ${input.account_id}`);
  }
  if (account.currency !== input.currency) {
    throw new Error(
      `Currency mismatch: account is ${account.currency}, transaction is ${input.currency}`
    );
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  db.runSync(
    `INSERT INTO transactions
     (id, amount, currency, type, category_id, account_id, note, date, source, sync_status, device_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    id, input.amount, input.currency, input.type,
    input.category_id, input.account_id, input.note,
    input.date, input.source, DEVICE_ID, now, now
  );

  return db.getFirstSync<Transaction>(
    'SELECT * FROM transactions WHERE id = ?', id
  )!;
}

export function softDeleteTransaction(
  db: SQLiteDatabase,
  id: string
): void {
  const now = new Date().toISOString();
  db.runSync(
    'UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_status = ? WHERE id = ? AND deleted_at IS NULL',
    now, now, 'pending', id
  );
}

export function getTransactionById(
  db: SQLiteDatabase,
  id: string
): Transaction | null {
  return db.getFirstSync<Transaction>(
    'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
    id
  );
}

export function getTransactionsByDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  limit: number = 50,
  offset: number = 0
): Transaction[] {
  return db.getAllSync<Transaction>(
    `SELECT * FROM transactions
     WHERE date >= ? AND date <= ? AND deleted_at IS NULL
     ORDER BY date DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    startDate, endDate, limit, offset
  );
}

export function getRecentTransactions(
  db: SQLiteDatabase,
  limit: number = 20
): Transaction[] {
  return db.getAllSync<Transaction>(
    `SELECT * FROM transactions
     WHERE deleted_at IS NULL
     ORDER BY date DESC, created_at DESC
     LIMIT ?`,
    limit
  );
}

export function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Pick<CreateTransactionInput, 'amount' | 'category_id' | 'account_id' | 'note' | 'date'>>
): Transaction | null {
  const existing = getTransactionById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.runSync(
    `UPDATE transactions SET
       amount = ?, category_id = ?, account_id = ?, note = ?, date = ?,
       updated_at = ?, sync_status = 'pending'
     WHERE id = ? AND deleted_at IS NULL`,
    updates.amount ?? existing.amount,
    updates.category_id ?? existing.category_id,
    updates.account_id ?? existing.account_id,
    updates.note ?? existing.note,
    updates.date ?? existing.date,
    now, id
  );

  return getTransactionById(db, id);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/transaction-dao.ts
git commit -m "feat: add transaction DAO with CRUD and queries"
```

---

## Task 7: DAO Layer — Chat Messages

**Files:**
- Create: `lib/db/chat-dao.ts`

- [ ] **Step 1: Write chat message DAO**

```typescript
// lib/db/chat-dao.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { ChatMessage, CreateChatMessageInput } from './types';

export function createChatMessage(
  db: SQLiteDatabase,
  input: CreateChatMessageInput
): ChatMessage {
  const now = new Date().toISOString();
  const id = randomUUID();

  db.runSync(
    `INSERT INTO chat_messages
     (id, role, content, content_type, parse_status, transaction_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id, input.role, input.content, input.content_type,
    input.parse_status, input.transaction_id, now
  );

  return db.getFirstSync<ChatMessage>(
    'SELECT * FROM chat_messages WHERE id = ?', id
  )!;
}

export function getRecentMessages(
  db: SQLiteDatabase,
  limit: number = 50
): ChatMessage[] {
  return db.getAllSync<ChatMessage>(
    `SELECT * FROM chat_messages
     ORDER BY created_at DESC
     LIMIT ?`,
    limit
  ).reverse(); // Reverse so oldest first for display
}

export function updateMessageParseStatus(
  db: SQLiteDatabase,
  messageId: string,
  parseStatus: string,
  transactionId: string | null
): void {
  db.runSync(
    'UPDATE chat_messages SET parse_status = ?, transaction_id = ? WHERE id = ?',
    parseStatus, transactionId, messageId
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/chat-dao.ts
git commit -m "feat: add chat message DAO"
```

---

## Task 8: Wire Up SQLiteProvider in Root Layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Wrap app with SQLiteProvider + run migration and seed**

```typescript
// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { Text } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { migrateDb } from '@/lib/db/schema';
import { seedDatabase } from '@/lib/db/seed';

export const unstable_settings = {
  anchor: '(tabs)',
};

async function initDatabase(db: import('expo-sqlite').SQLiteDatabase) {
  await migrateDb(db);
  await seedDatabase(db);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Suspense fallback={<Text>Loading database...</Text>}>
      <SQLiteProvider databaseName="smartledger.db" onInit={initDatabase} useSuspense>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="transaction/manual" options={{ presentation: 'modal', title: '手动记账' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify app starts without crash**

```bash
npx expo start
```

Open on device/emulator. Expected: app loads without error, database is created.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: integrate SQLiteProvider with migration and seed data"
```

---

## Task 9: Rule Engine — Amount Parser (TDD)

**Files:**
- Create: `__tests__/engine/amount-parser.test.ts`
- Create: `lib/engine/amount-parser.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/engine/amount-parser.test.ts
import { parseAmount } from '@/lib/engine/amount-parser';

describe('parseAmount', () => {
  // Basic CNY amounts
  test('extracts "25元"', () => {
    expect(parseAmount('午饭吃了25元')).toEqual({ amount: 25, currency: 'CNY' });
  });

  test('extracts "35.5块"', () => {
    expect(parseAmount('打车35.5块')).toEqual({ amount: 35.5, currency: 'CNY' });
  });

  test('extracts "100块钱"', () => {
    expect(parseAmount('买衣服花了100块钱')).toEqual({ amount: 100, currency: 'CNY' });
  });

  test('extracts bare number with ￥', () => {
    expect(parseAmount('￥88')).toEqual({ amount: 88, currency: 'CNY' });
  });

  // USD amounts
  test('extracts "10刀"', () => {
    expect(parseAmount('买了个东西10刀')).toEqual({ amount: 10, currency: 'USD' });
  });

  test('extracts "$25.99"', () => {
    expect(parseAmount('$25.99')).toEqual({ amount: 25.99, currency: 'USD' });
  });

  test('extracts "50美元"', () => {
    expect(parseAmount('花了50美元')).toEqual({ amount: 50, currency: 'USD' });
  });

  // Bare number (no unit) defaults to CNY
  test('extracts bare number "午饭25"', () => {
    expect(parseAmount('午饭25')).toEqual({ amount: 25, currency: 'CNY' });
  });

  // No amount found
  test('returns null for no amount', () => {
    expect(parseAmount('今天天气不错')).toBeNull();
  });

  // Multiple numbers: pick the most likely amount
  test('extracts amount from "3杯咖啡45元"', () => {
    expect(parseAmount('3杯咖啡45元')).toEqual({ amount: 45, currency: 'CNY' });
  });
});
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npm test -- --testPathPattern=amount-parser
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement amount parser**

```typescript
// lib/engine/amount-parser.ts
import type { Currency } from '@/lib/db/types';

export interface AmountResult {
  readonly amount: number;
  readonly currency: Currency;
}

// Patterns ordered by specificity: unit-attached amounts first, bare numbers last
const AMOUNT_PATTERNS: readonly { regex: RegExp; currency: Currency }[] = [
  // USD patterns
  { regex: /\$\s*(\d+(?:\.\d{1,2})?)/, currency: 'USD' },
  { regex: /(\d+(?:\.\d{1,2})?)\s*(?:刀|美元|usd)/i, currency: 'USD' },
  // CNY patterns
  { regex: /[￥¥]\s*(\d+(?:\.\d{1,2})?)/, currency: 'CNY' },
  { regex: /(\d+(?:\.\d{1,2})?)\s*(?:元|块钱|块|rmb|cny)/i, currency: 'CNY' },
  // Bare number — only match if followed by end-of-string or non-digit non-unit char
  // Must be > 0 to be a valid amount
  { regex: /(?:^|[^\d.])(\d+(?:\.\d{1,2})?)(?:\s*$|(?=[^\d.元块刀美]))/, currency: 'CNY' },
];

export function parseAmount(text: string): AmountResult | null {
  for (const { regex, currency } of AMOUNT_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > 0) {
        return { amount, currency };
      }
    }
  }

  // Last resort: find any number in the text
  const numbers = text.match(/(\d+(?:\.\d{1,2})?)/g);
  if (numbers && numbers.length > 0) {
    // Pick the last number (more likely to be the amount in "3杯咖啡45")
    const amount = parseFloat(numbers[numbers.length - 1]);
    if (amount > 0) {
      return { amount, currency: 'CNY' };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test -- --testPathPattern=amount-parser
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add __tests__/engine/amount-parser.test.ts lib/engine/amount-parser.ts
git commit -m "feat: add amount parser with CNY/USD extraction (TDD)"
```

---

## Task 10: Rule Engine — Category Matcher (TDD)

**Files:**
- Create: `lib/engine/keywords.ts`
- Create: `lib/engine/category-matcher.ts`
- Create: `__tests__/engine/category-matcher.test.ts`

- [ ] **Step 1: Write keyword mapping table**

```typescript
// lib/engine/keywords.ts
import type { TransactionType } from '@/lib/db/types';

export interface KeywordMapping {
  readonly categoryName: string;
  readonly type: TransactionType;
  readonly keywords: readonly string[];
}

export const KEYWORD_MAPPINGS: readonly KeywordMapping[] = [
  // Expense categories
  {
    categoryName: '餐饮', type: 'expense',
    keywords: ['早饭', '午饭', '晚饭', '早餐', '午餐', '晚餐', '外卖', '吃饭', '饭', '夜宵', '小吃', '零食', '奶茶', '咖啡', '饮料', '水果', '菜', '食堂', '餐厅', '火锅', '烧烤', '快餐', '面包', '蛋糕', '甜点'],
  },
  {
    categoryName: '交通', type: 'expense',
    keywords: ['打车', '滴滴', '出租车', '地铁', '公交', '高铁', '火车', '飞机', '机票', '车票', '加油', '油费', '停车', '过路费', '共享单车', '骑车', '船票'],
  },
  {
    categoryName: '购物', type: 'expense',
    keywords: ['衣服', '裤子', '鞋', '包', '淘宝', '京东', '拼多多', '网购', '超市', '商场', '化妆品', '护肤', '日用品'],
  },
  {
    categoryName: '住房', type: 'expense',
    keywords: ['房租', '租金', '水费', '电费', '燃气费', '物业费', '宽带', '网费', '维修'],
  },
  {
    categoryName: '娱乐', type: 'expense',
    keywords: ['电影', '游戏', 'KTV', '唱歌', '旅游', '门票', '景点', '演出', '音乐', '健身', '运动', '游泳'],
  },
  {
    categoryName: '医疗', type: 'expense',
    keywords: ['看病', '医院', '药', '挂号', '体检', '牙科', '配眼镜', '保健'],
  },
  {
    categoryName: '教育', type: 'expense',
    keywords: ['学费', '培训', '课程', '书', '教材', '考试', '网课', '补课'],
  },
  {
    categoryName: '通讯', type: 'expense',
    keywords: ['话费', '流量', '充值', '手机', '电话'],
  },
  {
    categoryName: '日用', type: 'expense',
    keywords: ['纸巾', '洗衣液', '牙膏', '洗发水', '肥皂', '垃圾袋', '清洁'],
  },
  // Income categories
  {
    categoryName: '工资', type: 'income',
    keywords: ['工资', '薪水', '月薪', '发工资', '底薪'],
  },
  {
    categoryName: '兼职', type: 'income',
    keywords: ['兼职', '副业', '外包', '私活', '稿费'],
  },
  {
    categoryName: '投资', type: 'income',
    keywords: ['利息', '股息', '分红', '理财', '基金', '收益'],
  },
  {
    categoryName: '红包', type: 'income',
    keywords: ['红包', '转账收入', '收到'],
  },
] as const;

// Build a fast lookup map: keyword → { categoryName, type }
export interface KeywordMatch {
  readonly categoryName: string;
  readonly type: TransactionType;
}

const keywordMap = new Map<string, KeywordMatch>();

for (const mapping of KEYWORD_MAPPINGS) {
  for (const keyword of mapping.keywords) {
    keywordMap.set(keyword, {
      categoryName: mapping.categoryName,
      type: mapping.type,
    });
  }
}

export function lookupKeyword(keyword: string): KeywordMatch | undefined {
  return keywordMap.get(keyword);
}

export function getAllKeywords(): ReadonlyMap<string, KeywordMatch> {
  return keywordMap;
}
```

- [ ] **Step 2: Write failing tests for category matcher**

```typescript
// __tests__/engine/category-matcher.test.ts
import { matchCategory } from '@/lib/engine/category-matcher';

describe('matchCategory', () => {
  test('matches "午饭" → 餐饮/expense', () => {
    expect(matchCategory('午饭吃了25元')).toEqual({
      categoryName: '餐饮',
      type: 'expense',
    });
  });

  test('matches "打车" → 交通/expense', () => {
    expect(matchCategory('打车去公司')).toEqual({
      categoryName: '交通',
      type: 'expense',
    });
  });

  test('matches "工资" → 工资/income', () => {
    expect(matchCategory('发工资了8000')).toEqual({
      categoryName: '工资',
      type: 'income',
    });
  });

  test('matches "奶茶" → 餐饮/expense', () => {
    expect(matchCategory('奶茶15块')).toEqual({
      categoryName: '餐饮',
      type: 'expense',
    });
  });

  test('returns null for no keyword match', () => {
    expect(matchCategory('花了100')).toBeNull();
  });

  test('longer keyword matches first: "发工资" over "工资"', () => {
    expect(matchCategory('发工资8000')).toEqual({
      categoryName: '工资',
      type: 'income',
    });
  });
});
```

- [ ] **Step 3: Run tests — verify FAIL**

```bash
npm test -- --testPathPattern=category-matcher
```

- [ ] **Step 4: Implement category matcher**

```typescript
// lib/engine/category-matcher.ts
import { getAllKeywords, type KeywordMatch } from './keywords';

export function matchCategory(text: string): KeywordMatch | null {
  const keywordMap = getAllKeywords();

  // Sort keywords by length descending so longer matches take priority
  // e.g., "发工资" matches before "工资"
  const sortedKeywords = [...keywordMap.keys()].sort(
    (a, b) => b.length - a.length
  );

  for (const keyword of sortedKeywords) {
    if (text.includes(keyword)) {
      return keywordMap.get(keyword)!;
    }
  }

  return null;
}
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
npm test -- --testPathPattern=category-matcher
```

- [ ] **Step 6: Commit**

```bash
git add lib/engine/keywords.ts lib/engine/category-matcher.ts __tests__/engine/category-matcher.test.ts
git commit -m "feat: add keyword mapping table and category matcher (TDD)"
```

---

## Task 11: Rule Engine — Main Parser (TDD)

**Files:**
- Create: `__tests__/engine/parser.test.ts`
- Create: `lib/engine/parser.ts`

- [ ] **Step 1: Write failing tests for parser orchestrator**

```typescript
// __tests__/engine/parser.test.ts
import { parseText } from '@/lib/engine/parser';

describe('parseText', () => {
  test('parses "午饭吃了25元" → high confidence expense', () => {
    const result = parseText('午饭吃了25元');
    expect(result).toEqual({
      amount: 25,
      currency: 'CNY',
      type: 'expense',
      categoryName: '餐饮',
      note: '午饭吃了25元',
      confidence: 'high',
      source: 'rule_engine',
    });
  });

  test('parses "工资8000" → income', () => {
    const result = parseText('工资8000');
    expect(result).toEqual({
      amount: 8000,
      currency: 'CNY',
      type: 'income',
      categoryName: '工资',
      note: '工资8000',
      confidence: 'high',
      source: 'rule_engine',
    });
  });

  test('parses "花了100" → low confidence (no category)', () => {
    const result = parseText('花了100');
    expect(result).toEqual({
      amount: 100,
      currency: 'CNY',
      type: 'expense',
      categoryName: null,
      note: '花了100',
      confidence: 'low',
      source: 'rule_engine',
    });
  });

  test('parses "$25.99" → USD', () => {
    const result = parseText('$25.99');
    expect(result).toEqual({
      amount: 25.99,
      currency: 'USD',
      type: 'expense',
      categoryName: null,
      note: '$25.99',
      confidence: 'low',
      source: 'rule_engine',
    });
  });

  test('returns null for non-transaction text', () => {
    expect(parseText('今天天气不错')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
npm test -- --testPathPattern='parser\.test'
```

- [ ] **Step 3: Implement parser orchestrator**

Note: this returns `categoryName` (string) instead of `category_id` because the parser is pure logic with no DB access. The chat flow layer will resolve `categoryName → category_id` via the DAO.

```typescript
// lib/engine/parser.ts
import type { Currency, TransactionType, Confidence, ParseSource } from '@/lib/db/types';
import { parseAmount } from './amount-parser';
import { matchCategory } from './category-matcher';

export interface ParseResult {
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly categoryName: string | null;
  readonly note: string;
  readonly confidence: Confidence;
  readonly source: ParseSource;
}

export function parseText(text: string): ParseResult | null {
  const amountResult = parseAmount(text);
  if (!amountResult) {
    return null;
  }

  const categoryMatch = matchCategory(text);

  return {
    amount: amountResult.amount,
    currency: amountResult.currency,
    type: categoryMatch?.type ?? 'expense',
    categoryName: categoryMatch?.categoryName ?? null,
    note: text,
    confidence: categoryMatch ? 'high' : 'low',
    source: 'rule_engine',
  };
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
npm test -- --testPathPattern='parser\.test'
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add __tests__/engine/parser.test.ts lib/engine/parser.ts
git commit -m "feat: add main text parser orchestrating amount + category matching (TDD)"
```

---

## Task 12: Update Tab Layout for SmartLedger

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/stats.tsx`
- Create: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Update tab layout — 3 tabs: Chat / Stats / Settings**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '记账',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="message.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '统计',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.pie.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder pages**

```typescript
// app/(tabs)/stats.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>收支统计（P1 开发）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#999' },
});
```

```typescript
// app/(tabs)/settings.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>设置（P1 开发）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#999' },
});
```

- [ ] **Step 3: Remove old explore tab**

Delete `app/(tabs)/explore.tsx` — no longer needed.

- [ ] **Step 4: Verify app shows 3 tabs**

```bash
npx expo start
```

Expected: bottom tabs show 记账 / 统计 / 设置

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/stats.tsx app/(tabs)/settings.tsx
git rm app/(tabs)/explore.tsx
git commit -m "feat: update tab layout to Chat/Stats/Settings"
```

---

## Task 13: Chat UI — Input Bar Component

**Files:**
- Create: `app/components/chat/input-bar.tsx`

- [ ] **Step 1: Build text input with send button**

```typescript
// app/components/chat/input-bar.tsx
import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface InputBarProps {
  readonly onSend: (text: string) => void;
  readonly onManualEntry: () => void;
}

export function InputBar({ onSend, onManualEntry }: InputBarProps) {
  const [text, setText] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.container, { borderTopColor: colors.icon + '30' }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onManualEntry}
        >
          <IconSymbol name="plus.circle.fill" size={28} color={colors.tint} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
          placeholder="输入记账内容，如"午饭25元""
          placeholderTextColor={colors.icon}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: text.trim() ? colors.tint : colors.icon + '40' }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <IconSymbol name="arrow.up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/components/chat/input-bar.tsx
git commit -m "feat: add chat input bar component"
```

---

## Task 14: Chat UI — Confirmation Card & Message Bubble

**Files:**
- Create: `app/components/chat/confirmation-card.tsx`
- Create: `app/components/chat/message-bubble.tsx`

> Note: confirmation-card must be created first because message-bubble imports it.

- [ ] **Step 1: Build confirmation card component**

(See confirmation card code below in Step 2)

- [ ] **Step 2: Build message bubble (renders text or card)**

```typescript
// app/components/chat/message-bubble.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { ChatMessage } from '@/lib/db/types';
import { ConfirmationCard } from './confirmation-card';

interface MessageBubbleProps {
  readonly message: ChatMessage;
  readonly onConfirm?: (messageId: string) => void;
  readonly onCancel?: (messageId: string) => void;
}

export function MessageBubble({ message, onConfirm, onCancel }: MessageBubbleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isUser = message.role === 'user';

  if (message.content_type === 'card') {
    return (
      <ConfirmationCard
        message={message}
        onConfirm={() => onConfirm?.(message.id)}
        onCancel={() => onCancel?.(message.id)}
      />
    );
  }

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.tint }
            : { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f0f0f0' },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? '#fff' : colors.text },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
```

- [ ] **Step 2: Build confirmation card component**

```typescript
// app/components/chat/confirmation-card.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { ChatMessage } from '@/lib/db/types';

interface ConfirmationCardProps {
  readonly message: ChatMessage;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

interface CardContent {
  readonly amount: number;
  readonly currency: string;
  readonly type: string;
  readonly categoryName: string;
  readonly accountName: string;
  readonly date: string;
  readonly note: string;
}

function parseCardContent(content: string): CardContent | null {
  try {
    return JSON.parse(content) as CardContent;
  } catch {
    return null;
  }
}

export function ConfirmationCard({ message, onConfirm, onCancel }: ConfirmationCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const card = parseCardContent(message.content);
  const isConfirmed = message.parse_status === 'success';
  const isCancelled = message.parse_status === 'error';
  const isDone = isConfirmed || isCancelled;

  if (!card) {
    return null;
  }

  const currencySymbol = card.currency === 'USD' ? '$' : '¥';
  const typeLabel = card.type === 'income' ? '收入' : '支出';
  const typeColor = card.type === 'income' ? '#34C759' : '#FF3B30';

  return (
    <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }]}>
      <View style={styles.header}>
        <Text style={[styles.typeLabel, { color: typeColor }]}>{typeLabel}</Text>
        <Text style={[styles.amount, { color: colors.text }]}>
          {currencySymbol}{card.amount.toFixed(2)}
        </Text>
      </View>

      <View style={styles.details}>
        <DetailRow label="分类" value={card.categoryName ?? '未分类'} color={colors.text} />
        <DetailRow label="账户" value={card.accountName} color={colors.text} />
        <DetailRow label="日期" value={card.date} color={colors.text} />
        {card.note ? <DetailRow label="备注" value={card.note} color={colors.text} /> : null}
      </View>

      {isDone ? (
        <View style={styles.statusBar}>
          <Text style={[styles.statusText, { color: isConfirmed ? '#34C759' : '#999' }]}>
            {isConfirmed ? '✓ 已记录' : '✗ 已取消'}
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>确认记账</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: color + '80' }]}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
  },
  details: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  statusBar: {
    alignItems: 'center',
    paddingTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/components/chat/message-bubble.tsx app/components/chat/confirmation-card.tsx
git commit -m "feat: add message bubble and confirmation card components"
```

---

## Task 15: Chat UI — Message List

**Files:**
- Create: `app/components/chat/message-list.tsx`

- [ ] **Step 1: Build message list with FlatList**

```typescript
// app/components/chat/message-list.tsx
import { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ChatMessage } from '@/lib/db/types';
import { MessageBubble } from './message-bubble';

interface MessageListProps {
  readonly messages: readonly ChatMessage[];
  readonly onConfirm: (messageId: string) => void;
  readonly onCancel: (messageId: string) => void;
}

export function MessageList({ messages, onConfirm, onCancel }: MessageListProps) {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.topSpacer} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 8,
  },
  topSpacer: {
    height: 12,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/components/chat/message-list.tsx
git commit -m "feat: add chat message list with auto-scroll"
```

---

## Task 16: Chat Screen — Wire Everything Together

**Files:**
- Rewrite: `app/(tabs)/index.tsx`

This is the core task that connects: input → parser → card → confirm → save to DB.

- [ ] **Step 1: Build chat screen with full flow**

```typescript
// app/(tabs)/index.tsx
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { MessageList } from '../components/chat/message-list';
import { InputBar } from '../components/chat/input-bar';

import type { ChatMessage } from '@/lib/db/types';
import { getRecentMessages, createChatMessage, updateMessageParseStatus } from '@/lib/db/chat-dao';
import { createTransaction } from '@/lib/db/transaction-dao';
import { getCategoryByName } from '@/lib/db/category-dao';
import { getAllAccounts } from '@/lib/db/account-dao';
import { parseText } from '@/lib/engine/parser';

export default function ChatScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadMessages = useCallback(() => {
    const msgs = getRecentMessages(db, 100);
    setMessages(msgs);
  }, [db]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = useCallback((text: string) => {
    // 1. Save user message
    createChatMessage(db, {
      role: 'user',
      content: text,
      content_type: 'text',
      parse_status: null,
      transaction_id: null,
    });

    // 2. Parse with rule engine
    const parseResult = parseText(text);

    if (parseResult) {
      // Resolve default account for the currency
      const accounts = getAllAccounts(db);
      const defaultAccount = accounts.find((a) => a.currency === parseResult.currency) ?? accounts[0];
      const today = new Date().toISOString().split('T')[0];

      // Create assistant card message with parsed data
      const cardContent = JSON.stringify({
        amount: parseResult.amount,
        currency: parseResult.currency,
        type: parseResult.type,
        categoryName: parseResult.categoryName ?? '其他',
        accountName: defaultAccount?.name ?? '现金',
        date: today,
        note: parseResult.note,
      });

      createChatMessage(db, {
        role: 'assistant',
        content: cardContent,
        content_type: 'card',
        parse_status: 'pending',
        transaction_id: null,
      });
    } else {
      // Not a transaction — respond with helper text
      createChatMessage(db, {
        role: 'assistant',
        content: '没有识别到金额。试试输入"午饭25元"，或点击 + 手动记账。',
        content_type: 'text',
        parse_status: null,
        transaction_id: null,
      });
    }

    loadMessages();
  }, [db, loadMessages]);

  const handleConfirm = useCallback((messageId: string) => {
    // Find the card message
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.content_type !== 'card') return;

    try {
      const card = JSON.parse(msg.content) as {
        amount: number;
        currency: string;
        type: string;
        categoryName: string;
        note: string;
      };

      // Resolve category name to ID
      const category = getCategoryByName(
        db,
        card.categoryName,
        card.type as 'income' | 'expense'
      );
      if (!category) {
        Alert.alert('错误', `未找到分类: ${card.categoryName}`);
        return;
      }

      // Use first account matching the currency
      const accounts = getAllAccounts(db);
      const account = accounts.find((a) => a.currency === card.currency) ?? accounts[0];
      if (!account) return;

      // Create the transaction
      const txn = createTransaction(db, {
        amount: card.amount,
        currency: card.currency as 'CNY' | 'USD',
        type: card.type as 'income' | 'expense',
        category_id: category.id,
        account_id: account.id,
        note: card.note,
        date: new Date().toISOString().split('T')[0],
        source: 'text',
      });

      // Update card message status
      updateMessageParseStatus(db, messageId, 'success', txn.id);
      loadMessages();
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
    }
  }, [db, messages, loadMessages]);

  const handleCancel = useCallback((messageId: string) => {
    updateMessageParseStatus(db, messageId, 'error', null);
    loadMessages();
  }, [db, loadMessages]);

  const handleManualEntry = useCallback(() => {
    router.push('/transaction/manual');
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        {/* Header can be expanded later */}
      </View>
      <View style={styles.chatArea}>
        <MessageList
          messages={messages}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </View>
      <InputBar onSend={handleSend} onManualEntry={handleManualEntry} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatArea: {
    flex: 1,
  },
});
```

- [ ] **Step 2: Test the full flow on device/emulator**

```bash
npx expo start
```

Test scenarios:
1. Type "午饭25元" → should show confirmation card with ¥25.00 / 餐饮
2. Tap "确认记账" → card should show "✓ 已记录"
3. Type "今天天气不错" → should show "没有识别到金额" helper text
4. Type "打车35.5块" → should show card with ¥35.50 / 交通

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: wire up chat screen with rule engine → confirmation → save flow"
```

---

## Task 17: Manual Entry Form

**Files:**
- Create: `app/components/transaction/category-picker.tsx`
- Create: `app/transaction/manual.tsx`

- [ ] **Step 1: Build category picker grid**

```typescript
// app/components/transaction/category-picker.tsx
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { Category } from '@/lib/db/types';

interface CategoryPickerProps {
  readonly categories: readonly Category[];
  readonly selectedId: string | null;
  readonly onSelect: (category: Category) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <FlatList
      data={categories}
      numColumns={5}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const isSelected = item.id === selectedId;
        return (
          <TouchableOpacity
            style={[
              styles.item,
              isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint },
            ]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.name, { color: isSelected ? colors.tint : colors.text }]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.grid}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 4,
    minWidth: 60,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Build manual entry form**

```typescript
// app/transaction/manual.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { CategoryPicker } from '@/app/components/transaction/category-picker';

import type { TransactionType, Category, Account } from '@/lib/db/types';
import { getCategoriesByType } from '@/lib/db/category-dao';
import { getAllAccounts } from '@/lib/db/account-dao';
import { createTransaction } from '@/lib/db/transaction-dao';
import { createChatMessage } from '@/lib/db/chat-dao';

export default function ManualEntryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [type, setType] = useState<TransactionType>('expense');
  const [amountText, setAmountText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = getCategoriesByType(db, type);
  const accounts = getAllAccounts(db);

  // Auto-select first account (useEffect to avoid setState during render)
  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  const handleSave = () => {
    const amount = parseFloat(amountText);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('提示', '请选择分类');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('提示', '请选择账户');
      return;
    }

    const txn = createTransaction(db, {
      amount,
      currency: selectedAccount.currency,
      type,
      category_id: selectedCategory.id,
      account_id: selectedAccount.id,
      note: note || null,
      date,
      source: 'manual',
    });

    // Also create a chat message record for the manual entry
    createChatMessage(db, {
      role: 'assistant',
      content: JSON.stringify({
        amount,
        currency: selectedAccount.currency,
        type,
        categoryName: selectedCategory.name,
        accountName: selectedAccount.name,
        date,
        note: note || selectedCategory.name,
      }),
      content_type: 'card',
      parse_status: 'success',
      transaction_id: txn.id,
    });

    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Type toggle */}
        <View style={styles.typeToggle}>
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeButton,
                type === t && { backgroundColor: colors.tint },
              ]}
              onPress={() => {
                setType(t);
                setSelectedCategory(null);
              }}
            >
              <Text style={[styles.typeText, { color: type === t ? '#fff' : colors.text }]}>
                {t === 'expense' ? '支出' : '收入'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>金额</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text, borderColor: colors.icon + '40' }]}
            placeholder="0.00"
            placeholderTextColor={colors.icon}
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={setAmountText}
            autoFocus
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>分类</Text>
          <CategoryPicker
            categories={categories}
            selectedId={selectedCategory?.id ?? null}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>账户</Text>
          <View style={styles.accountRow}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accountChip,
                  selectedAccount?.id === acc.id && { backgroundColor: colors.tint + '20', borderColor: colors.tint },
                ]}
                onPress={() => setSelectedAccount(acc)}
              >
                <Text style={[styles.accountText, { color: selectedAccount?.id === acc.id ? colors.tint : colors.text }]}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>日期</Text>
          <TextInput
            style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '40' }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.icon}
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>备注</Text>
          <TextInput
            style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '40' }]}
            placeholder="可选备注"
            placeholderTextColor={colors.icon}
            value={note}
            onChangeText={setNote}
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.tint }]}
        onPress={handleSave}
      >
        <Text style={styles.saveText}>保存</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 24 },
  typeToggle: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  typeText: { fontSize: 16, fontWeight: '600' },
  section: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 8,
  },
  accountRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#f0f0f0',
  },
  accountText: { fontSize: 14, fontWeight: '500' },
  noteInput: {
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 3: Test manual entry on device**

```bash
npx expo start
```

Test: Tap "+" in chat → form opens → enter amount, select category, save → returns to chat with confirmed card.

- [ ] **Step 4: Commit**

```bash
git add app/components/transaction/category-picker.tsx app/transaction/manual.tsx
git commit -m "feat: add manual entry form with category picker"
```

---

## Task 18: Transaction List (Date-Grouped)

**Files:**
- Create: `app/components/transaction/transaction-list.tsx`

Spec requires: "账单列表 — 按日期分组查看历史账单" as P0 feature. Accessible via settings tab or a list view within the chat screen.

- [ ] **Step 1: Build date-grouped transaction list**

```typescript
// app/components/transaction/transaction-list.tsx
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import type { Transaction, Category } from '@/lib/db/types';
import { getRecentTransactions } from '@/lib/db/transaction-dao';
import { getCategoryById } from '@/lib/db/category-dao';

interface TransactionWithCategory extends Transaction {
  readonly categoryName: string;
}

interface DateSection {
  readonly title: string;
  readonly data: readonly TransactionWithCategory[];
}

function groupByDate(transactions: Transaction[], db: ReturnType<typeof useSQLiteContext>): DateSection[] {
  const groups = new Map<string, TransactionWithCategory[]>();

  for (const txn of transactions) {
    const list = groups.get(txn.date) ?? [];
    const category = getCategoryById(db, txn.category_id);
    list.push({ ...txn, categoryName: category?.name ?? '未知' });
    groups.set(txn.date, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([title, data]) => ({ title, data }));
}

export function TransactionList() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const transactions = getRecentTransactions(db, 100);
  const sections = groupByDate(transactions, db);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.icon }]}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const symbol = item.currency === 'USD' ? '$' : '¥';
        const sign = item.type === 'income' ? '+' : '-';
        const amountColor = item.type === 'income' ? '#34C759' : '#FF3B30';

        return (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.icon + '20' }]}
            onPress={() => router.push(`/transaction/${item.id}`)}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.categoryText, { color: colors.text }]}>{item.categoryName}</Text>
              {item.note ? <Text style={[styles.noteText, { color: colors.icon }]}>{item.note}</Text> : null}
            </View>
            <Text style={[styles.amountText, { color: amountColor }]}>
              {sign}{symbol}{item.amount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ color: colors.icon }}>暂无记账记录</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flex: 1 },
  categoryText: { fontSize: 16, fontWeight: '500' },
  noteText: { fontSize: 13, marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
});
```

- [ ] **Step 2: Add transaction list to settings screen (temporary home)**

Update `app/(tabs)/settings.tsx` to include the transaction list:

```typescript
// app/(tabs)/settings.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { TransactionList } from '@/app/components/transaction/transaction-list';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.header, { color: colors.text }]}>账单记录</Text>
      <TransactionList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 20, fontWeight: '700', padding: 16 },
});
```

> Note: In P0 this lives in the settings tab temporarily. When the settings tab gets its proper content in P1+, the transaction list will move to its own screen.

- [ ] **Step 3: Commit**

```bash
git add app/components/transaction/transaction-list.tsx app/(tabs)/settings.tsx
git commit -m "feat: add date-grouped transaction list"
```

---

## Task 19: Transaction Detail/Edit Screen

**Files:**
- Create: `app/transaction/[id].tsx`

Per spec: "已确认的账单：可通过 transaction/[id] 页面编辑或删除（软删除）"

- [ ] **Step 1: Build transaction detail screen with edit/delete**

```typescript
// app/transaction/[id].tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { CategoryPicker } from '@/app/components/transaction/category-picker';

import { getTransactionById, updateTransaction, softDeleteTransaction } from '@/lib/db/transaction-dao';
import { getCategoriesByType, getCategoryById } from '@/lib/db/category-dao';
import type { Category } from '@/lib/db/types';

export default function TransactionDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const transaction = id ? getTransactionById(db, id) : null;

  const [amountText, setAmountText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (transaction) {
      setAmountText(transaction.amount.toString());
      setNote(transaction.note ?? '');
      setDate(transaction.date);
      const cat = getCategoryById(db, transaction.category_id);
      if (cat) setSelectedCategory(cat);
    }
  }, [transaction?.id]);

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>账单不存在</Text>
      </View>
    );
  }

  const categories = getCategoriesByType(db, transaction.type);

  const handleSave = () => {
    const amount = parseFloat(amountText);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (!selectedCategory) return;

    updateTransaction(db, transaction.id, {
      amount,
      category_id: selectedCategory.id,
      note: note || null,
      date,
    });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          softDeleteTransaction(db, transaction.id);
          router.back();
        },
      },
    ]);
  };

  const symbol = transaction.currency === 'USD' ? '$' : '¥';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>金额 ({symbol})</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={setAmountText}
        />

        <Text style={[styles.label, { color: colors.text }]}>分类</Text>
        <CategoryPicker
          categories={categories}
          selectedId={selectedCategory?.id ?? null}
          onSelect={setSelectedCategory}
        />

        <Text style={[styles.label, { color: colors.text }]}>日期</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={[styles.label, { color: colors.text }]}>备注</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.icon + '40' }]}
          value={note}
          onChangeText={setNote}
          placeholder="可选备注"
        />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.tint }]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存修改</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>删除账单</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
  label: { fontSize: 16, fontWeight: '600' },
  input: {
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttons: { padding: 16, gap: 12 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  deleteBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  deleteBtnText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Register route in root layout**

Update `app/_layout.tsx` to add the transaction detail route:

```typescript
<Stack.Screen name="transaction/[id]" options={{ title: '账单详情' }} />
```

- [ ] **Step 3: Commit**

```bash
git add app/transaction/[id].tsx app/_layout.tsx
git commit -m "feat: add transaction detail screen with edit and delete"
```

---

## Task 20: Clean Up & Final Verification

**Files:**
- Remove: `app/components/expense-card.tsx`
- Remove: `app/components/feat2.tsx`
- Remove: `app/components/feat3.tsx`
- Remove: `app/modal.tsx`

- [ ] **Step 1: Remove old learning exercise files**

```bash
git rm app/components/expense-card.tsx app/components/feat2.tsx app/components/feat3.tsx app/modal.tsx
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all engine tests PASS.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Fix any issues.

- [ ] **Step 4: Full manual test on device**

Test checklist:
- [ ] App launches without crash
- [ ] 3 tabs visible: 记账 / 统计 / 设置
- [ ] Type "午饭25元" → confirmation card appears (¥25.00 / 餐饮)
- [ ] Tap "确认记账" → card shows "✓ 已记录"
- [ ] Tap "取消" on a card → shows "✗ 已取消"
- [ ] Type "工资8000" → card shows income (收入 / ¥8000.00 / 工资)
- [ ] Type "hello" → shows "没有识别到金额" message
- [ ] Tap "+" → manual entry form opens
- [ ] Fill form and save → returns to chat with confirmed card
- [ ] Kill app and reopen → previous messages still visible (persistence works)

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove old learning exercises, finalize P0 MVP"
```

---

## Summary

| Task | Description | Type |
|------|-------------|------|
| 1 | Project setup & dependencies | Setup |
| 2 | TypeScript types & interfaces | Data |
| 3 | Database schema & migration | Data |
| 4 | Seed data (categories, accounts) | Data |
| 5 | Category & Account DAO | Data |
| 6 | Transaction DAO (with update) | Data |
| 7 | Chat message DAO | Data |
| 8 | SQLiteProvider in root layout | Integration |
| 9 | Amount parser (TDD) | Engine |
| 10 | Category matcher (TDD) | Engine |
| 11 | Main parser (TDD) | Engine |
| 12 | Tab layout update | UI |
| 13 | Chat input bar | UI |
| 14 | Confirmation card + message bubble | UI |
| 15 | Message list | UI |
| 16 | Chat screen (wire everything) | Integration |
| 17 | Manual entry form | UI |
| 18 | Transaction list (date-grouped) | UI |
| 19 | Transaction detail/edit screen | UI |
| 20 | Cleanup & verification | QA |

**Total: 20 tasks, ~20 commits**

After completing all tasks, you will have a **fully offline-capable text-based bookkeeping app** with:
- Local SQLite persistence
- Rule engine parsing "午饭25元" → structured transaction
- Chat UI with confirmation cards (showing amount, category, account, date)
- Manual entry form (with date picker)
- Date-grouped transaction list
- Transaction edit/delete
- Preset categories and accounts
