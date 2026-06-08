# EMM 多语言翻译 — 实施计划

## 概述

为 EMM 博客系统增加文章/标签翻译功能，复用已接入的 DeepSeek API。核心设计原则：**按需翻译 + 字段级版本管理 + 后台队列批处理 + 前端轮询通知**。

---

## 1. 数据模型

### 1.1 PostTranslation（文章翻译表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INT PK | |
| `postId` | INT | 关联 Post.id |
| `lang` | TEXT | 语言代码 `en` / `ja` |
| `title` | TEXT | 翻译后标题 |
| `desc` | TEXT | 翻译后摘要 |
| `content` | TEXT | 翻译后 Markdown 正文 |
| `titleVer` | INT | 原标题 hash → 字段级版本 |
| `descVer` | INT | 原描述 hash |
| `contentVer` | INT | 原正文 hash |
| `save` | INT | 更新时间戳 |
| `createAt` | INT | 创建时间戳 |

### 1.2 TagTranslation（标签翻译表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INT PK | |
| `tagId` | INT | 关联 Tag.id |
| `lang` | TEXT | 语言代码 |
| `displayName` | TEXT | 翻译后展示名 |
| `desc` | TEXT | 翻译后描述 |
| `nameVer` | INT | 原 name hash |
| `descVer` | INT | 原 desc hash |
| `save` | INT | |
| `createAt` | INT | |

### 1.3 System 新增字段

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `translationEnabled` | BOOL | `false` | 管理员翻译总开关 |
| `translationLangs` | TEXT | `""` | 逗号分隔，如 `"en,ja"` |

### 1.4 启用条件（门控）

翻译功能激活需要 **两把锁同时打开**：

```
translationEnabled === true   // 管理员手动开启
  AND
aiApiKey 非空                 // AI 已配置（复用现有 Settings 字段）
```

**任一条件不满足时：**

| 影响范围 | 行为 |
|---|---|
| `[[lang]]` 路由 | 路径有效但不触发任何翻译逻辑 |
| LangSwitcher 按钮 | 不渲染 |
| `/en/post/slug` 访问 | 正常展示原文，不显示 Toast，不入队 |
| 管理后台 TranslateButton | 不显示 |
| Settings 翻译配置 | 开关置灰 + 提示"请先配置 AI Key" |

实现：

```typescript
// src/lib/server/index.ts
export const translationReady = () =>
  sys.translationEnabled && !!sys.aiApiKey;
```

所有翻译入口统一调用 `translationReady()` 判断。

### 1.5 版本判断逻辑

```
翻译新鲜 ⇔  PostTranslation.titleVer   === hash(Post.title)
         && PostTranslation.descVer    === hash(Post.desc)
         && PostTranslation.contentVer === hash(Post.content)
```

任一字段版本不匹配 → 该字段过期，下次访问触发重译。翻译时只打包版本不匹配的字段。

---

## 2. 翻译队列

### 2.1 架构

```
入队（列表页/详情页触发）
  ↓
Queue（pending Map，去重 key = postId:lang）
  ↓
Consumer（单线程消费，一次最多合并 5 个同语言任务）
  ↓
打包成一条 AI 请求 → 逐个解析回写 PostTranslation
  ↓
前端轮询 status → 对应卡片刷新
```

### 2.2 批处理打包

**输入格式（一条 AI 请求）：**

```
Translate the following articles to English.
Preserve ALL markdown syntax exactly (headings, links, code blocks, images, tables).
Only translate prose text. Keep code blocks, URLs, image paths unchanged.
Output in the exact format shown.

---ARTICLE:42---
Title: 人工智能入门
Desc: 探讨AI的基本概念

---ARTICLE:78---
Title: 机器学习基础
Content: ## 什么是监督学习\n...

---ARTICLE:103---
Title: 深度学习框架对比
Desc: PyTorch与TensorFlow分析
```

**输出格式：**

```
---ARTICLE:42---
Title: Introduction to AI
Desc: Exploring AI basics

---ARTICLE:78---
Title: Machine Learning Basics
Content: ## What is Supervised Learning\n...

---ARTICLE:103---
Title: Deep Learning Framework Comparison
Desc: PyTorch vs TensorFlow analysis
```

解析规则：
- 按 `---ARTICLE:N---` 分隔
- 逐字段匹配 `Title:` / `Desc:` / `Content:`
- 未匹配到的文章标记 `failed`
- 部分失败不影响其他文章回写

### 2.3 队列参数

| 参数 | 值 | 说明 |
|---|---|---|
| 最大批次 | 5 | 一次 AI 调用最多合并 5 篇 |
| 并发批数 | 1 | 同一时间只跑一批 |
| 去重 | postId:lang | 已在队列中不重复入队 |
| 回写粒度 | 单条 | 批内逐个独立写 DB |
| 部分失败 | 允许 | 一篇失败不影响同批其他篇 |

---

## 3. API 设计

### 3.1 查询翻译状态

```
GET /api/translate/status?postId=42&lang=en

Response:
{
  "status": "done" | "missing" | "pending" | "processing" | "failed"
}
```

- `done` — 翻译存在且版本新鲜
- `missing` — 无翻译记录且未入队
- `pending` — 已入队等待处理
- `processing` — 正在 AI 翻译中
- `failed` — 翻译失败

### 3.2 手动触发翻译（管理员）

```
POST /api/translate
{ "postId": 42, "lang": "en" }

Response: { "status": "pending" }
```

去重：已存在且版本新鲜返回 `{ "status": "done" }`。

### 3.3 路由改造

**新增可选参数：**

```
src/routes/[[lang]]/(app)/  ...
                           ├─ +page.svelte
                           ├─ post/[[tag]]/[slug]/+page.server.ts
                           ├─ posts/+page.svelte
                           ├─ tag/[name]/+page.svelte
                           └─ ...
```

`lang` 存在时触发翻译逻辑，不存在时保持现有行为（100% 向后兼容）。

---

## 4. 页面行为

### 4.1 文章详情页 `/en/post/slug`

```
请求 → 查 Post → 查 PostTranslation WHERE postId=42 AND lang='en'

翻译未启用：
  → 正常返回原文，无额外逻辑

翻译已启用：
  新鲜翻译存在：
    → 返回翻译后的 title + content + desc
    → 页面正常渲染

  翻译过期/缺失：
    → 返回原文 title + content + desc
    → 入队: queue.enqueue(42, 'en')
    → post._translationStatus = 'pending'
    → 前端显示 TranslateToast
```

### 4.2 文章列表页 `/en/posts/`

```
请求 → 查 20 篇 Post → 批量查 PostTranslation WHERE postId IN (...) AND lang='en'

翻译未启用：
  → 正常返回原文

翻译已启用：
  有翻译 → 用翻译 title + desc
  无翻译 → 批量入队 → 显示原文 title + desc（不阻塞）
```

### 4.3 TranslateToast 轮询

```
每 3 秒 GET /api/translate/status?postId=42&lang=en

status === 'done'    → Toast 消失 → location.reload()
status === 'failed'  → Toast 消失（静默）
status === 'pending' 或 'processing' → Toast 持续显示

最大轮询 20 次（60 秒），超时后 Toast 消失
```

**Toast 样式：**

```
┌────────────────────────────────────────────────────┐
│  🔄 Translating to English...                      │
└────────────────────────────────────────────────────┘
  顶部固定，半透明深色背景，不遮挡内容
```

---

## 5. 本地 UI 多语言

### 5.1 方案

- **Svelte store + JSON 词典**，零外部依赖
- 词典文件：`src/lib/lang/en.json`、`ja.json`
- `lang` store 从 URL `[[lang]]` 参数同步
- Cookie 记住用户语言偏好

### 5.2 词典结构

```json
// en.json
{
  "nav.home": "Home",
  "nav.posts": "Posts",
  "nav.tags": "Tags",
  "nav.about": "About",
  "post.published": "Published",
  "post.modified": "Modified",
  "post.prev": "Previous",
  "post.next": "Next",
  "tag.title": "Tags",
  "comment.title": "Comments",
  "toast.translating": "Translating to English..."
}
```

### 5.3 使用方式

```typescript
// src/lib/lang/index.ts
import { writable, derived } from 'svelte/store';
import en from './en.json';
import ja from './ja.json';

const dicts: Record<string, Record<string, string>> = { en, ja };
export const lang = writable('zh');     // zh = 原文，直接返回 key
export const t = derived(lang, ($lang) => (key: string) => dicts[$lang]?.[key] ?? key);
export const availableLangs = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];
```

```svelte
<script>
  import { t, lang } from '$lib/lang';
  const $t = get(t);
</script>

<a href="/">{$t('nav.home')}</a>
```

---

## 6. LangSwitcher 语言切换按钮

### 6.1 位置

导航栏右上角 — `nav.svelte` 的第二个 `.a` 容器内，仅当 `translationReady()` 时渲染。

```
┌─────────────────────────────────────────────────────────┐
│  ☰  Home  Posts  Tags  About              🌐 EN  ▾     │
└─────────────────────────────────────────────────────────┘
```

### 6.2 交互

```
点击 → 下拉菜单
  ├─ 中文
  ├─ English ✓
  └─ 日本語

选择 →
  1. 写入 cookie: lang=en
  2. 更新 URL: /post/slug → /en/post/slug
  3. lang store 切换 → 全页面 UI 立即更新
```

### 6.3 URL 映射

| 当前路径 | 切换到 EN | 切换到中文 |
|---|---|---|
| `/post/slug` | `/en/post/slug` | 不变 |
| `/en/post/slug` | 不变 | `/post/slug` |
| `/ja/post/slug` | `/en/post/slug` | `/post/slug` |
| `/posts` | `/en/posts` | `/posts` |
| `/tags` | `/en/tags` | `/tags` |

---

## 7. 分阶段任务

### Phase 1: 数据模型

- [ ] 创建 `PostTranslation` 模型类（`src/lib/server/model/translation.ts`）
- [ ] 创建 `TagTranslation` 模型类
- [ ] `System` 模型新增 `translationEnabled`、`translationLangs` 字段
- [ ] `src/lib/server/index.ts` 添加 `translationReady()` 门控函数
- [ ] 导出并注册到 `src/lib/server/model/index.ts`
- [ ] 验证 SQLite 自动建表

### Phase 2: 翻译队列 + 批处理消费者

- [ ] 实现 `TranslateQueue` 类（`src/lib/server/translateQueue.ts`）
  - `enqueue(postId, lang)` — 入队 + 去重
  - `status(postId, lang)` — 查询状态（含 DB 新鲜度判断）
  - `drain()` — 消费循环，按 lang 合并批次
  - `translateBatch()` — 打包 prompt → 调用 DeepSeek → 解析回写
- [ ] 单例初始化（`server.start()` 时创建）

### Phase 3: API + 路由 + Toast

- [ ] 新增 API 端点：
  - `GET /api/translate/status` — 状态查询
  - `POST /api/translate` — 管理员手动触发
- [ ] 路由改造：添加 `[[lang]]` 可选参数
  - `src/routes/[[lang]]/(app)/post/[[tag]]/[slug]/+page.server.ts`
  - `src/routes/[[lang]]/(app)/posts/+page.server.ts`
  - `src/routes/[[lang]]/(app)/tag/[name]/`
- [ ] Post 页面集成：加载时判断翻译状态、入队
- [ ] `TranslateToast.svelte` 组件（轮询 + Toast UI）

### Phase 4: 本地 UI 多语言

- [ ] 创建词典 JSON 文件：`src/lib/lang/en.json`、`ja.json`
- [ ] 实现 `src/lib/lang/index.ts`（lang store + $t 函数）
- [ ] `nav.svelte` 及其他组件文案替换为 `$t()` 调用
- [ ] `LangSwitcher.svelte` 组件实现
- [ ] 嵌入 `nav.svelte` 第二个 `.a` 容器

### Phase 5: 管理工具 + Feed + SEO

- [ ] 编辑器工具栏添加 TranslateButton
- [ ] Settings 页面添加翻译配置（开关 + 语言列表）
- [ ] 文章管理列表添加翻译状态列
- [ ] 多语言 Feed：`/en/feed/atom`、`/en/feed/rss`、`/en/feed/json`
- [ ] Sitemap 添加 `hreflang` 标注
- [ ] Post 页面添加 `<link rel="alternate" hreflang="...">` 标签
- [ ] `og:locale` 元标签

---

## 8. 不做的事（明确排除）

- **不预翻译** — 不自动翻译全部文章，仅按需触发
- **不用 SSE** — Phase 1 用轮询，SSE 复杂度过高收益小
- **不翻译代码块和 URL** — AI prompt 约束，Markdown 语法完整保留
- **不改变现有 URL** — `[[lang]]` 可选参数，不加前缀时行为完全不变
- **翻译未启用时不显示任何多语言 UI** — LangSwitcher、Toast 等全部不可见
