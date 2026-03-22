# React Native 学习计划

> 以"记账 App"为主线，每课在前一课基础上迭代，最终做出一个可用的记账应用。
> 所有概念都会用 Python/FastAPI 做类比。

## 已完成

- [x] Lesson 1: 组件基础 — 函数返回 JSX（expense-card.tsx）
- [x] Lesson 2: JSX 表达式 — `{}` 插值（feat2.tsx）
- [x] Lesson 3: Props + TypeScript interface（feat3.tsx）

---

## 第一阶段：React 核心概念

> 目标：掌握 React 的心智模型，能独立写出有交互的页面

### Lesson 4: State（状态）⭐ 最重要

**Python 类比**: 类的实例变量，但修改后自动"刷新页面"

```
# Python — 手动管理状态
class Counter:
    def __init__(self):
        self.count = 0       # 状态
    def increment(self):
        self.count += 1      # 修改状态
        self.render()        # 手动刷新
```

**学习内容**:
- `useState` hook 基本用法
- 状态更新触发重新渲染（re-render）
- 不可变更新原则（≈ Pydantic 的 immutable model）

**练习**: 给记账卡片加一个"已支付"切换按钮

---

### Lesson 5: 事件处理

**Python 类比**: FastAPI 路由处理函数 `@app.post("/pay")` → `onPress={handlePay}`

**学习内容**:
- `onPress`, `onChangeText` 等事件
- `TextInput` 组件（≈ HTML 的 `<input>`）
- 受控组件模式（state 驱动输入框的值）

**练习**: 做一个"添加记账"表单 — 输入金额、分类、备注，点击提交

---

### Lesson 6: 列表渲染

**Python 类比**: Jinja2 的 `{% for item in items %}`

**学习内容**:
- `.map()` 渲染列表
- `key` 的作用（≈ 数据库主键，帮 React 识别哪条变了）
- `FlatList` 组件（长列表性能优化，≈ 分页查询 vs 全量查询）

**练习**: 用 state 存一个记账数组，用 FlatList 渲染列表

---

### Lesson 7: 组件通信（父子传值）

**Python 类比**: 函数调用链 — 父函数把回调传给子函数

**学习内容**:
- Props 向下传数据（父 → 子）
- 回调函数向上传事件（子 → 父）
- 组件拆分原则

**练习**: 把"添加表单"和"列表"拆成独立组件，通过 props/回调通信

---

### Lesson 8: useEffect（副作用）

**Python 类比**: `@app.on_event("startup")` + 依赖注入的"依赖变了就重新执行"

**学习内容**:
- useEffect 基本用法和依赖数组
- 挂载 / 更新 / 卸载 生命周期
- 清理函数（≈ `try/finally` 或 `contextmanager` 的 `__exit__`）

**练习**: 组件挂载时从 AsyncStorage 读取历史记账数据

---

## 第二阶段：实用技能

> 目标：能和后端 API 对接，处理真实数据

### Lesson 9: 网络请求

**Python 类比**: `httpx.get()` / `requests.post()`

**学习内容**:
- `fetch` API（RN 内置）
- async/await 在 useEffect 中的用法
- Loading / Error / Success 三态处理

**练习**: 调用一个公开 API（如汇率接口），在记账中支持多币种显示

---

### Lesson 10: 自定义 Hook

**Python 类比**: 把重复逻辑抽成一个可复用的依赖（FastAPI `Depends()`）

**学习内容**:
- 自定义 hook 的命名和规则（`use` 前缀）
- 逻辑复用 vs 组件复用
- 常见模式：`useFetch`, `useForm`, `useStorage`

**练习**: 抽取一个 `useExpenses` hook，封装记账数据的 CRUD 逻辑

---

### Lesson 11: Context（全局状态）

**Python 类比**: FastAPI 的 `Depends()` 依赖注入 — 任何地方都能拿到，不用层层传递

**学习内容**:
- `createContext` + `useContext`
- Provider 模式（≈ 中间件注入）
- 什么时候用 Context vs Props

**练习**: 创建一个全局的 ExpenseContext，让任何页面都能读写记账数据

---

## 第三阶段：导航与多页面

> 目标：做出多页面的完整 App

### Lesson 12: 路由与导航

**Python 类比**: FastAPI 路由系统 — 文件 ≈ endpoint，文件夹 ≈ router

**学习内容**:
- expo-router 文件系统路由（你项目已经在用了）
- Stack / Tab / Modal 导航模式
- 路由参数（≈ path params: `/expense/[id]`）
- 页面间传参

**练习**: 点击记账卡片 → 跳转到详情页，展示完整信息

---

### Lesson 13: 表单与验证

**Python 类比**: Pydantic 验证 — 输入不合法就报错，不让提交

**学习内容**:
- 表单状态管理模式
- 输入验证与错误提示
- 键盘处理（移动端特有）

**练习**: 完善添加记账表单 — 金额必填、分类下拉选择、验证提示

---

## 第四阶段：进阶与优化

> 目标：写出生产级别的代码

### Lesson 14: 本地持久化

**Python 类比**: SQLite / JSON 文件存储

**学习内容**:
- AsyncStorage（简单键值存储，≈ Redis）
- expo-sqlite（本地关系数据库，≈ SQLAlchemy + SQLite）

**练习**: 记账数据持久化到本地，重启 App 不丢失

---

### Lesson 15: 样式与主题

**学习内容**:
- StyleSheet 深入（Flexbox 布局）
- 暗色/亮色主题切换（你项目已有基础）
- 响应式设计

**练习**: 给记账 App 做一套好看的 UI，支持深色模式

---

### Lesson 16: 动画

**Python 类比**: 无直接类比 — 这是纯前端的东西

**学习内容**:
- `react-native-reanimated` 基础
- 布局动画（列表增删的过渡效果）
- 手势交互（左滑删除）

**练习**: 记账列表左滑删除 + 添加时的入场动画

---

## 学习原则

1. **每课一个 commit** — 方便回顾和对比
2. **先写再理解** — 抄一遍比看十遍有用
3. **用后端思维理解** — 每个概念都找 Python 类比
4. **不求完美** — 能跑就行，后面会重构
