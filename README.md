# SmartLedger - AI 记账 App

离线优先的对话式 AI 记账应用，基于 React Native + Expo 构建。

## 产品特性

- **对话式记账** — 聊天窗口为统一入口，输入"午饭25元"即可记账
- **本地规则引擎** — 正则 + 关键词匹配，离线覆盖 80% 日常记账场景
- **语音记账** — 长按说话，AI 自动解析生成账单（腾讯云 ASR）
- **拍照识票** — 拍小票/发票，OCR + AI 自动录入（腾讯云 OCR）
- **AI 智能分析** — 自然语言查询消费、消费习惯分析（GLM-4.7-Flash）
- **离线优先** — 核心功能完全离线可用，联网后静默同步

## 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | React Native + Expo SDK 55 |
| 本地数据库 | expo-sqlite |
| 路由 | expo-router（文件系统路由） |
| 规则引擎 | 纯 TypeScript（正则 + 关键词） |
| ASR/OCR | 腾讯云语音识别 / 票据识别 |
| LLM | GLM-4.7-Flash（智谱 AI，免费） |
| 云同步 | 腾讯云开发 CloudBase |
| 语言 | TypeScript（strict mode） |

## 开发路线图

- **P0 (MVP)** — 本地数据层 + 规则引擎 + 对话式 UI + 手动录入 ← 当前阶段
- **P1** — 收支统计 + 语音记账 + 拍照识票
- **P2** — AI 智能层 + 预算管理 + 云同步
- **P3** — 数据导出

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 运行测试
npm test
```

## 项目结构

```
lib/
├── db/           # 数据层（类型定义、Schema、DAO）
└── engine/       # 规则引擎（金额解析、分类匹配）
app/
├── (tabs)/       # Tab 页面（记账、统计、设置）
├── transaction/  # 账单相关页面
└── components/   # 业务组件（聊天、确认卡片）
__tests__/        # 单元测试
docs/             # 设计文档和实现计划
```

## 文档

- [产品设计文档](docs/superpowers/specs/2026-03-21-ai-ledger-design.md)
- [P0 实现计划](docs/superpowers/plans/2026-03-21-smartledger-p0-mvp.md)
