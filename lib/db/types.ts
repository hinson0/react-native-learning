/**
 * SmartLedger 数据模型类型定义
 *
 * 类比 Python:
 *   TypeScript interface ≈ Pydantic BaseModel
 *   union type ('a' | 'b') ≈ Literal['a', 'b']
 *   readonly ≈ frozen=True
 */

// TODO(human): 定义所有枚举类型（union types）
// 提示: 参考 spec 中的数据模型，用 `type Xxx = 'a' | 'b' | 'c'` 的形式
// 需要定义以下类型:
//   - AccountType: wechat / alipay / cash / bank_card
//   - Currency: CNY / USD
//   - TransactionType: income / expense
//   - TransactionSource: manual / text / voice / ocr
//   - SyncStatus: pending / synced / failed
//   - MessageRole: user / assistant
//   - MessageContentType: text / voice / image / card
//   - ParseStatus: success / fallback / pending / error
//   - Confidence: high / low
//   - ParseSource: rule_engine / glm

export type AccountType = "wechat" | "alipay" | "cash" | "bank_card";
export type Currency = "CNY" | "USD";
export type TransactionType = "income" | "expense";
export type TransactionSource = "manual" | "text" | "voice" | "ocr";
export type SyncStatus = "pending" | "synced" | "failed";
export type MessageRole = "user" | "assistant";
export type MessageContentType = "text" | "voice" | "image" | "card";
export type ParseStatus = "success" | "fallback" | "pending" | "error";
export type Confidence = "high" | "low";
export type ParseSource = "rule_engine" | "glm";

// TODO(human): 定义 Account 接口（对应数据库 accounts 表）
// 提示: 参考 spec 第 4 节的 Account 表结构
// 所有字段用 readonly 修饰，deleted_at 和可选字段用 `string | null`
// export interface Account { ... }
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

// TODO(human): 定义 Category 接口（对应数据库 categories 表）
// 提示: 预设固定分类，is_system 用 number（SQLite 没有 boolean）
// export interface Category { ... }
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly type: TransactionType;
  readonly is_system: number;
  readonly sort_order: number;
}

// TODO(human): 定义 Transaction 接口（对应数据库 transactions 表）
// 提示: amount 是正数(REAL)，date 格式 YYYY-MM-DD
// 注意 sync_status 和 device_id 是为未来云同步准备的
// export interface Transaction { ... }

export interface Transaction {
  readonly id: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly category_id: string;
  readonly account_id: string;
  readonly note: string | null;
  readonly date: string;
  readonly source: TransactionSource;
  readonly sync_status: SyncStatus;
  readonly device_id: string;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

// TODO(human): 定义 ChatMessage 接口（对应数据库 chat_messages 表）
// 提示: parse_status 仅 assistant 消息有值，user 消息为 null
// transaction_id 在 card 类型消息确认后才关联
// export interface ChatMessage { ... }
export interface ChatMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly content_type: MessageContentType;
  readonly parse_status: ParseStatus | null;
  readonly transaction_id: string | null;
  readonly created_at: string;
}

// TODO(human): 定义 ParsedTransaction 接口（非数据库表，规则引擎/AI 的统一输出契约）
// 提示: 这个接口是规则引擎和 GLM 的"公共语言"
// category_id 为 null 时表示需要用户手动选择分类
// export interface ParsedTransaction { ... }
export interface ParsedTransaction {
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly category_id: string | null;
  readonly note: string | null;
  readonly confidence: Confidence;
  readonly source: ParseSource;
}

// TODO(human): 定义 CreateTransactionInput 接口（创建账单时的输入参数）
// 提示: 比 Transaction 少了 id, sync_status, device_id, deleted_at, created_at, updated_at
// 这些字段由 DAO 层自动生成
// export interface CreateTransactionInput { ... }
export type CreateTransactionInput = Pick<
  Transaction,
  | "account_id"
  | "amount"
  | "category_id"
  | "currency"
  | "note"
  | "source"
  | "type"
  | "date"
>;
// TODO(human): 定义 CreateChatMessageInput 接口（创建聊天消息时的输入参数）
// 提示: 比 ChatMessage 少了 id 和 created_at
// export interface CreateChatMessageInput { ... }
export type CreateChatMessageInput = Omit<ChatMessage, "id" | "created_at">;

// TODO(human): 定义 AccountBalance 接口（账户余额，查询时计算）
// 提示: 包含 account 对象和计算出的 balance 数值
// export interface AccountBalance { ... }
export interface AccountBalance {
  readonly account: Account;
  readonly balance: number;
}
