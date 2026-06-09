# AI 辅助 IP 拦截系统 — 需求与设计文档

> 状态: 设计阶段 | 日期: 2026-06-08

---

## 1. 概述

### 1.1 背景

当前项目已具备：

- **防火墙系统**：IP 黑白名单、规则匹配、频率限制、UA 聚合检测、Turnstile 人类验证
- **Cloudflare 集成**：IP List 推送、R2 存储、Turnstile 联动
- **DeepSeek AI 集成**：`sys.aiApiKey` / `sys.aiModel`，文章编辑器已在使用
- **IP 地理信息**：IP2Location DB3 Lite（国家/地区/城市）
- **访问日志**：FwLog 表记录所有请求的 IP、路径、Headers、状态码、时间戳

**痛点**：通过 Turnstile 验证的爬虫（如 AWS 云主机上的脚本）虽然被 307 拦截无法拿到内容，但仍在持续产生无效流量和日志。目前依赖手动分析日志、手动添加黑名单，效率低。

### 1.2 目标

构建一个 **AI 辅助的自动化 IP 分析-评分-拦截管线**：

1. 定期（或手动触发）从 FwLog 拉取最近一段时间内的访问记录
2. 自动排除已知可信来源（Cloudflare Verified Bots）
3. 仅分析已通过 Turnstile 验证的请求（说明是能执行 JS 的真实客户端）
4. 结合外部威胁情报（ip-api.com、AbuseIPDB）对 IP 进行多维度评分
5. 将时间窗口内全部日志一次性提交给 DeepSeek，由 AI 在全局视角下识别可疑 IP（包括分布式爬虫、IP 轮换等关联行为）
6. 高分 IP 自动加入黑名单，可选推送到 Cloudflare IP List
7. 可选对恶意 IP 的 ASN 段建立 Cloudflare WAF 规则

---

## 2. 分析管线

```
FwLog(最近 N 分钟)
  │
  ├─ 过滤：排除 CF Verified Bots (X-Client-Bot: true)
  ├─ 过滤：排除受信任搜索引擎类别
  ├─ 过滤：仅保留已通过 Turnstile 的请求 (headers 含 _tsv cookie)
  ├─ 过滤：排除已存在于 WhiteList 的 IP
  │
  ├─ 分组：按 IP 聚合
  ├─ 过滤：总请求数 < aiGuardThreshold → 跳过整个批次
  │
  ├─ [外部数据补全] 对每个唯一 IP：
  │   ├─ queryIpInfo(ip) → ISP、ASN、国家、组织、是否托管机房
  │   └─ queryAbuseIPDB(ip) → 滥用置信度评分(0-100)、历史举报记录
  │
  ├─ [AI 全局分析] 将全部日志 + IP 外部情报喂给 DeepSeek
  │   AI 被要求：
  │   ├─ 识别每个 IP 的行为模式（爬虫/扫描/正常浏览）
  │   ├─ 检测 IP 间的关联行为（分布式爬虫、IP 轮换、协同扫描）
  │   ├─ 结合 ISP 类型和 AbuseIPDB 数据综合判断
  │   └─ 返回 [{ip, score(0-100), remark}] 结构化结果
  │
  └─ [执行] score >= aiGuardScoreThreshold 的 IP：
      ├─ blockIP() → 写入 BlackList
      ├─ 可选 → 推送 CF IP List
      └─ 可选 → 建立 CF WAF ASN 规则
```

### 2.1 为什么全量交给 AI 而不是逐 IP 分析

- **分布式爬虫检测**：多 IP 相似的 UA、路径序列、时间间隔 → 仅依赖 AI 的全局视角才能发现
- **IP 轮换识别**：不同 IP 在相邻时间窗口接力访问相同路径集
- **协同扫描**：一组 IP 分工覆盖不同的路径前缀
- **上下文判断**：同样是 50 次请求，在全是真人流量的站点上 vs 凌晨 3 点的博客上含义完全不同

---

## 3. 功能需求

### 3.1 外部数据查询

| 方法                 | 数据源                                   | 返回内容                              | 限制                  |
| -------------------- | ---------------------------------------- | ------------------------------------- | --------------------- |
| `queryIpInfo(ip)`    | `http://ip-api.com/json/{ip}`            | ISP、ASN、组织、国家、城市、经纬度    | 免费 45次/分钟        |
| `queryAbuseIPDB(ip)` | `https://api.abuseipdb.com/api/v2/check` | 滥用置信度(0-100)、举报记录、使用类型 | 需 API Key，日限 1000 |

这两个方法封装为纯函数工具，可供 AI 在分析过程中自主调用。

**ip-api.com 返回示例**：

```json
{
	"country": "Taiwan",
	"countryCode": "TW",
	"regionName": "Taipei City",
	"city": "Taipei",
	"isp": "Amazon.com, Inc.",
	"org": "Amazon.com, Inc",
	"as": "AS16509 Amazon.com, Inc.",
	"query": "2406:da1c:8028:d301:9b22:409e:c4d:c114"
}
```

**AbuseIPDB 返回示例**：

```json
{
	"data": {
		"ipAddress": "118.25.6.39",
		"abuseConfidenceScore": 100,
		"countryCode": "CN",
		"usageType": "Data Center/Web Hosting/Transit",
		"isp": "Tencent Cloud Computing (Beijing) Co. Ltd",
		"totalReports": 1,
		"lastReportedAt": "2018-12-20T20:55:14+00:00"
	}
}
```

### 3.2 AI 分析 Prompt 设计

**输入格式**（全量日志 + 外部情报合并后发送）：

```
## 站点信息
博客名称: xxx | 访问量级: 中小型个人博客

## 时间窗口
2026-06-08 14:00 - 14:30 (30分钟)

## IP 外部情报
IP: 54.xxx.xxx.xxx | 国家: US | ISP: Amazon.com, Inc. | ASN: AS16509 | AbuseIPDB: 85/100
IP: 142.xxx.xxx.xxx | 国家: CA | ISP: OVH SAS | ASN: AS16276 | AbuseIPDB: 未查到

## 访问日志（按 IP 分组）

### IP: 54.xxx.xxx.xxx (47次请求)
14:01:23 GET / → 200
14:01:24 GET /posts → 200
14:01:25 GET /post/some-article → 200
14:01:26 GET /about → 200
14:01:27 GET /tags → 200
14:01:28 GET /tag/javascript → 200
... (省略中间)
14:12:45 GET /post/another → 200

### IP: 142.xxx.xxx.xxx (38次请求)
14:05:10 GET / → 200
14:05:12 GET /posts → 200
... (类似模式)
```

**要求 AI 输出格式**：

```json
{
	"analysis": "简要概述：发现 2 个云主机 IP，行为模式高度相似，疑似同一爬虫服务",
	"ips": [
		{
			"ip": "54.xxx.xxx.xxx",
			"score": 90,
			"remark": "AWS 云主机，30分钟内密集遍历所有公开页面，访问间隔均匀(1-2秒)，与 142.xxx 行为模式完全一致，疑似分布式爬虫"
		},
		{
			"ip": "142.xxx.xxx.xxx",
			"score": 85,
			"remark": "OVH 云主机，与 54.xxx 协同扫描互补路径，AbuseIPDB 未命中但行为高度可疑"
		}
	]
}
```

### 3.3 执行动作

| 动作            | 实现                                              | 条件                                            |
| --------------- | ------------------------------------------------- | ----------------------------------------------- |
| 写入 BlackList  | `db.save(model(BlackList, {ip, mark, createAt}))` | score >= `aiGuardScoreThreshold`                |
| 推送 CF IP List | 复用 `pushIpToCf(ip, mark)`                       | `aiGuardCfBlock = true` 且 CF 已配置            |
| ASN 段拦截      | 调用 CF WAF Rulesets API 创建 ASN 规则            | `aiGuardAsnBlock = true` 且 token 有 WAF 写权限 |

---

## 4. 配置项

在 `System` model 新增：

| 字段                    | 类型 | 默认值  | 说明                               |
| ----------------------- | ---- | ------- | ---------------------------------- |
| `abuseIpdbToken`        | TEXT | `''`    | AbuseIPDB API Key（日限1000次）    |
| `aiGuardEnabled`        | BOOL | `false` | 是否启用                           |
| `aiGuardThreshold`      | INT  | `20`    | 窗口内最低总请求数，低于此跳过分析 |
| `aiGuardWindowMinutes`  | INT  | `60`    | 分析时间窗口（分钟）               |
| `aiGuardScoreThreshold` | INT  | `80`    | 拉黑分数线(0-100)                  |
| `aiGuardCfBlock`        | BOOL | `false` | 拉黑时同步推送 CF IP List          |
| `aiGuardAsnBlock`       | BOOL | `false` | 拉黑时建立 CF WAF ASN 规则         |

---

## 5. 文件变更清单

| 文件                             | 操作     | 内容                   |
| -------------------------------- | -------- | ---------------------- |
| `src/lib/server/model/system.ts` | 修改     | 新增 7 个字段          |
| `src/lib/server/aiGuard.ts`      | **新建** | 核心模块（~350行）     |
| `src/lib/server/api/_common.ts`  | 修改     | `sysKs` 数组加入新字段 |
| `doc/ai-guard-design.md`         | **新建** | 本文档                 |

**无需修改 `firewall.ts`** — BlackList 的加载和匹配机制对新增来源透明。

---

## 6. 接口签名

```ts
// === 类型 ===
interface IpInfo {
	ip: string;
	country: string;
	countryCode: string;
	region: string;
	city: string;
	isp: string;
	org: string;
	asn: string; // "AS16509 Amazon.com, Inc."
	isHosting: boolean; // ISP 为已知云厂商 → true
}

interface AbuseInfo {
	ip: string;
	score: number; // 0-100
	usageType: string; // "Data Center/Web Hosting/Transit"
	totalReports: number;
	lastReportedAt: string;
	isp: string;
}

interface Candidate {
	ip: string;
	entries: FwLog[];
	ipInfo: IpInfo | null;
	abuseInfo: AbuseInfo | null;
}

interface AiResult {
	ip: string;
	score: number; // 0-100
	remark: string; // 中文备注
}

interface AnalyzeOptions {
	windowMin?: number;
	cfBlock?: boolean;
	asnBlock?: boolean;
}

interface AnalyzeResult {
	totalIps: number;
	analyzed: number;
	blocked: AiResult[];
	skipped: { ip: string; score: number; reason: string }[];
}

// === 导出方法 ===

/** 查询 IP 信息（ISP/ASN/国家） */
export async function queryIpInfo(ip: string): Promise<IpInfo | null>;

/** 查询 AbuseIPDB 滥用记录 */
export async function queryAbuseIPDB(ip: string): Promise<AbuseInfo | null>;

/** 从 FwLog 拉取候选日志 */
export async function fetchCandidates(windowMin?: number): Promise<FwLog[]>;

/** AI 分析：全量日志 + 外部情报 → DeepSeek → 评分+备注 */
export async function aiAnalyze(
	logs: FwLog[],
	ipInfoMap: Map<string, IpInfo | null>,
	abuseMap: Map<string, AbuseInfo | null>
): Promise<AiResult[]>;

/** 主管线 */
export async function analyzeBatch(options?: AnalyzeOptions): Promise<AnalyzeResult>;

/** 拉黑 IP */
export async function blockIP(
	ip: string,
	remark: string,
	opts?: { cfBlock?: boolean; asnBlock?: boolean }
): Promise<{ blocked: boolean; cfPushed: boolean; asnBlocked: boolean }>;

/** 校验 CF token 是否有 WAF 规则编辑权限 */
export async function validateCfWafPermission(): Promise<boolean>;
```

---

## 7. 任务步骤

| #   | 步骤                                                                 | 预估 |
| --- | -------------------------------------------------------------------- | ---- |
| 1   | System model 新增 7 个配置字段                                       | 小   |
| 2   | 新建 `aiGuard.ts` 模块骨架 + 类型定义                                | 小   |
| 3   | 实现 `queryIpInfo(ip)`                                               | 小   |
| 4   | 实现 `queryAbuseIPDB(ip)`                                            | 小   |
| 5   | 实现 `fetchCandidates(windowMin)`                                    | 中   |
| 6   | 实现 `aiAnalyze(logs[], ipInfoMap, abuseMap)` — DeepSeek Prompt 构建 | 中   |
| 7   | 实现 `analyzeBatch(options)` — 主管线串联                            | 中   |
| 8   | 实现 `blockIP(ip, remark, opts)`                                     | 小   |
| 9   | 实现 `validateCfWafPermission()`                                     | 小   |
| 10  | `_common.ts` 配置字段白名单更新                                      | 小   |
| 11  | 端到端验证                                                           | 中   |

---

## 8. 安全考量

- `queryIpInfo` 和 `queryAbuseIPDB` 对 AI 暴露为可调用工具，AI 可自主决定何时调用
- `blockIP` 不在 AI 自动执行链路中——需人工确认或显式开启自动拉黑
- CF token 权限在首次配置时校验并缓存，避免每次分析都调 CF API
- AbuseIPDB 日限 1000 次，`fetchCandidates` 阶段限制唯一 IP 数不超过 200 以避免超限
- AI prompt 中注入站点信息（博客名称、访问量级）帮助 AI 做出合理判断
