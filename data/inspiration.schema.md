# inspiration.json schema

公开数据，供 AI Events Radar 站点的「产品社区 / 灵感 / 模板模块观察」页面使用，路径为 `/inspiration/`。文件与 `events.json`、`insights.json` 放在同一目录（仓库里对应 `data/inspiration.json`）。

只放对各产品公开模块的观察。不要写入针对某个公司的建议，也不要出现邮箱、密码、注册或私人备注。

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schema_version` | number | 是 | 当前为 `1`。不兼容变更时加一。 |
| `timezone` | string | 是 | 固定为 `Asia/Shanghai`。 |
| `last_updated` | string | 是 | ISO 8601 日期时间，必须带 `+08:00` 偏移，例如 `2026-11-28T12:50:00+08:00`。 |
| `baseline_date` | string | 是 | 首期基线日期，`YYYY-MM-DD`。当前为 `2026-11-28`。不要改已发布的基线日期。 |
| `update_cadence` | string | 是 | 更新节奏的中文说明，当前为 `每周一、周四`。 |
| `disclaimer` | string | 是 | 声明：内容为公开页面观察 / 初步判断；未注册、未登录、未付费；查不到的字段留空，不代表功能不存在。 |
| `groups` | array | 是 | 产品分组，顺序即页面分组顺序。 |
| `products` | array | 是 | 被观察的产品，一条一条列出。 |
| `changelog` | array | 是 | 按时间排列的变更记录。基线写入已知的关键事件；之后只追加，不改写已发布条目（除非纠错）。 |
| `patterns` | array | 是 | 跨产品的初步观察，措辞保持中性，不指向特定委托方。 |

## `groups[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 稳定英文短 id，匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。后续更新不要随意改已发布的 id。 |
| `name` | string | 是 | 中文组名，例如 `AI 创作`。 |
| `description` | string | 是 | 一两句说明该组覆盖什么类型的产品与模块。 |

建议的 `id`（可增，不要随意改已发布项）：

- `ai-creation` AI 创作
- `ai-agents` AI 智能体与助手
- `ai-site-docs` AI 建站与文档
- `knowledge-notes` 知识与笔记
- `non-ai-tools` 非 AI 工具

## `products[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 稳定英文短 id，规则同 `groups[].id`，全文件唯一。 |
| `name` | string | 是 | 产品名，用公开品牌名。 |
| `group_id` | string | 是 | 必须是 `groups[]` 里已有的 `id`。 |
| `modules` | array | 是 | 被观察的模块，至少一条。同一产品可同时有社区、模板、学院等。 |
| `placement` | string | 是 | 模块在官网或产品里的入口位置。未知则空字符串。 |
| `content_types` | string | 是 | 模块里放什么内容。未知则空字符串。 |
| `content_source` | string | 是 | 内容从哪来：用户 UGC、官方策展、创作者、合作方等。未知则空字符串。 |
| `organization` | string | 是 | 分类、筛选、排序或信息架构。未知则空字符串。 |
| `interaction` | string | 是 | 用户如何互动：点赞、remix、比赛、排行、创作者主页、奖励等。未知则空字符串。 |
| `conversion` | string | 是 | 如何连回产品使用：一键打开、复制进工作区、消耗积分等。未知则空字符串。 |
| `recent_updates` | string | 是 | 本轮核对到的近期变化，可含日期。没有则空字符串。 |
| `evidence` | string | 是 | 本轮证据强度，只能是 `已打开`、`部分打开`、`仅搜到`。 |
| `evidence_note` | string | 是 | 对证据的补充，例如 403、前端渲染、直链 404。没有则空字符串。 |
| `first_seen` | string | 是 | 本追踪首次记录该产品的日期，`YYYY-MM-DD`。基线产品均为 `2026-11-28`。 |
| `last_checked` | string | 是 | 最近一次核对日期，`YYYY-MM-DD`。 |
| `status` | string | 是 | 产品级状态，只能是 `active`、`unreachable`、`changed`。见下方规则。 |
| `status_note` | string | 是 | 状态说明，尤其是混合状态或未确认下线时必填。没有则空字符串。 |
| `sources` | array | 是 | 可核对的公开来源，至少一条。 |
| `profile` | string | 否 | 产品级概述，一段话（约 150–400 字），先讲这个模块是什么、入口在哪、怎么组织、怎么互动与复用，再点出最值得注意的一两点。只写本轮页面或官方文档支持的事实；来自搜索摘要或第三方的内容要在文中标明。页面应作为卡片的开头段落展示。（2026-11-28 深度补充起新增。） |
| `rewards` | string | 否 | 积分、奖金、分成、版税、资助或身份权益。没有或未确认则省略，不要写「无」来代替「未发现」，可写「未发现…（待确认）」。 |
| `scale` | string | 否 | 页面可见的数量与规模（条目数、成员数、下载数、金额），写明是页面自述、官方博客还是本轮所见，以及无法确认含义的数字。页面没有显示就写「未显示」。 |
| `update_cadence` | string | 否 | 更新节奏：页面或 changelog 能看出的周期，如「约每周一版」。看不出就写「待确认」。 |
| `examples` | array | 否 | 1–5 个具体条目（证据不足时可能只有 1 个），见下方 `products[].examples[]`。 |
| `unconfirmed` | string[] | 否 | 本轮没能确认的事项，每项一句话。页面应单独列出，让读者知道哪些是缺口。没有则省略或空数组。 |
| `notes` | string | 否 | 需要保留的研究备注，仍须是公开事实，不得写私人建议。 |
| `spotlight` | object | 否 | 需要展开写的补充观察。目前主要用于机制较完整的产品。字段可按产品增减，但值必须有来源。 |

### `products[].modules[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 模块在产品中的名称，可保留官方英文名。 |
| `kind` | string | 是 | 模块类型短标签，便于筛选。建议值：`community`、`gallery`、`templates`、`explore`、`feed`、`academy`、`marketplace`、`store`、`playbook`、`events`、`directory`、`showcase`、`contests`、`grants`、`blogs`。可以出现建议列表之外的小写短标签，但不要把一句话写进 `kind`。 |
| `url` | string | 是 | 模块页 URL，必须是 `https`。未知则空字符串，不要编造。 |
| `status` | string | 是 | 该模块的状态，枚举与产品级相同。 |
| `status_note` | string | 否 | 模块状态说明，例如某直链 404、文案与帮助中心不一致。 |

### `products[].sources[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `label` | string | 是 | 来源短名，例如 `Community 页`、`官方博客`。 |
| `url` | string | 是 | `https` URL。 |

### `products[].examples[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 是 | 条目标题，保留页面上的原文（英文标题不翻译）。需要注明作者、价格或数字时可写在括号里。 |
| `url` | string | 是 | `https` URL，指向条目详情页或该条目所在的列表页。条目没有独立链接时，用所在列表页的 URL；不确定就用空字符串，不要编造。 |
| `note` | string | 否 | 一句补充：出处、位置或为什么值得看。 |

### 状态规则

- `active`：有公开证据表明该模块仍在，即使本轮请求被 403/500 拦住，或页面靠前端渲染没读全。这时必须在 `evidence` / `evidence_note` 里写清楚。
- `unreachable`：本轮打开被跟踪的模块 URL 时得到 404、Project not found 或同等「页面不存在」结果。不能把「对我 403」写成 `unreachable`。未确认下线时，在 `status_note` 写明「未确认是否已下线」。
- `changed`：与上一份已发布数据相比，入口、分类、机制、状态或关键文案有可核对的变化。基线一般不用 `changed`；从第二次更新开始使用。变化本身同时追加到 `changelog[]`。
- 产品有多个模块时：产品级 `status` 看主要被跟踪的模块。若主模块仍在、个别子模块打不开（例如社区页还在、作品榜 404），产品级用 `active`，把打不开的那一项标为 `unreachable`，并在 `status_note` 说明。
- 不要因为未登录看不到内容就把状态写成 `unreachable`。

### `spotlight`（可选）

常用子字段，均为可选：

| 字段 | 类型 | 说明 |
|---|---|---|
| `page_snapshot` | string | 某次打开页面时看到的区块与文案。 |
| `scoring_rules` | array | `{action, score, credit}` 三条都是字符串。 |
| `scoring_source` | string | 评分规则出处与核对日期。 |
| `verification` | string | 验证或送审条件。 |
| `grants` | string | 资助 / 积分奖励规则。 |
| `academy` | string | 课程模块补充说明。 |
| `observations` | string[] | 基于该产品公开机制的初步观察，须标明「初步观察」或同等限定。 |

## `changelog[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `date` | string | 是 | 事件日期，`YYYY-MM-DD`，按 Asia/Shanghai。若来源带其他时区，先换算再写入。 |
| `product_id` | string | 是 | 必须是已有的 `products[].id`。 |
| `summary` | string | 是 | 一句或两句说明发生了什么。只写能核对的事实。若同一天有精确时刻，写进摘要并标注 `Asia/Shanghai`。 |
| `source_url` | string | 是 | 对应来源的 `https` URL。没有可核对链接时用空字符串，不要编。 |

排序：按 `date` 升序；同一天按合理的叙事顺序（先发生的在前）。新一轮只追加新条目（按日期排好），不要删除已发布条目。只有带日期、带来源链接的变化才写进 `changelog[]`；日期来自页面元数据（如 LinkedIn 帖）而非正文时，在 `summary` 里注明「元数据日期」。

基线与深度补充应至少包含：Higgsfield Community 于 2026-10-17 由官方博客发布、Grants 规则口径随后发生变化、Lovable Launched 与 Bolt Gallery 在 2026-11-28 无法打开。

## `patterns[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 稳定英文短 id，规则同分组 id。 |
| `title` | string | 是 | 中文短标题。 |
| `summary` | string | 是 | 2–5 句，须标明这是初步观察，并只根据 `product_ids` 里的产品来写。 |
| `product_ids` | string[] | 是 | 用作例证的产品 id，必须都能在 `products[]` 中找到，数组内不重复。建议 3–12 个，不要把所有相关产品穷尽列出，也不要写未收录的产品。 |
| `observations` | array | 否 | 每个产品在这一模式下的具体表现，元素为 `{product_id, note}`。`product_id` 必须在本条 `product_ids` 里，每个产品最多一条；`note` 一句话，只写 `products[]` 里已有的事实。（2026-11-28 深度补充起新增。） |

## 校验规则

1. 文件是 UTF-8 JSON。
2. `schema_version` 为整数且 `>= 1`。
3. `timezone` 为 `Asia/Shanghai`。
4. `last_updated` 能被解析为带 `+08:00` 的日期时间。
5. `baseline_date`、`first_seen`、`last_checked`、`changelog[].date` 均为 `YYYY-MM-DD`。
6. `groups`、`products`、`changelog`、`patterns` 均为数组；`groups` 与 `products` 不得为空。
7. `groups[].id`、`products[].id`、`patterns[].id` 各自唯一，且匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。
8. 每个 `products[].group_id` 都能在 `groups[]` 中找到。
9. `changelog[].product_id` 以及 `patterns[].product_ids` 里的每一项，都能在 `products[]` 中找到；`product_ids` 内部无重复。
10. 所有非空 URL（`modules[].url`、`sources[].url`、`changelog[].source_url`）必须以 `https://` 开头。
11. `evidence` 只能是 `已打开`、`部分打开`、`仅搜到`。
12. 产品级和模块级 `status` 只能是 `active`、`unreachable`、`changed`。
13. 每个产品的 `modules`、`sources` 均为非空数组；`modules[].name`、`modules[].kind`、`sources[].label` 非空。
14. **安全检查（必须通过）**：把整个 JSON 当作文本，忽略大小写后，不得命中内置禁用词表（blocked terms）。任意字符串字段中不得出现邮箱地址（匹配 `[^@\s]+@[^@\s]+\.[^@\s]+` 这类形式即可）。这是防止把私人建议或联系方式写进公开数据的兜底规则。
15. 未知事实用空字符串或省略可选字段，不要写猜测，也不要把「未登录所以看不到」写成功能不存在。
16. `profile`、`rewards`、`scale`、`update_cadence`（如存在）为字符串；`unconfirmed`（如存在）为字符串数组，元素非空。
17. `examples[]`（如存在）每项有非空 `title`；`url` 为空字符串或 `https://` 开头。
18. `patterns[].observations[]`（如存在）每项的 `product_id` 必须出现在该条 `product_ids` 里，且同一条内不重复；`note` 非空。
19. 页面渲染这些可选字段时，字段缺失就整块隐藏，不要显示空标题；`unconfirmed` 建议以「待确认」小节显示。

## 更新原则

- 每周一、周四对照各产品的模块页和 changelog / 公告入口，先看日期，再看分类名、内容类型、入口位置和关键机制是否变化。
- 有变化：更新对应产品字段，`last_checked` 改为当天，必要时把产品或模块 `status` 改为 `changed` 或 `unreachable`，并往 `changelog[]` 追加条目。`last_updated` 同步改成这次写入的时间。
- 无变化：至少更新被核对产品的 `last_checked`；若所有产品都无变化，可以只更新 `last_updated`，或按站点发布策略选择是否推送。不要为了「有更新」去改写没有新证据的摘要。
- `patterns[]` 只在有新的跨产品证据时改写，并保持「初步观察」的语气。
- 只依据公开页面和可核对来源。私人建议、对特定雇主产品的借鉴、邮箱和注册信息一律不要写入本文件。
- 新增产品时分配新的稳定 `id`，补上 `group_id`、`first_seen` 和来源。不要复用已删除或已改名的 id。
