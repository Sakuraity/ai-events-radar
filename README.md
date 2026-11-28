# AI Events Radar

**English:** A public static radar of overseas online AI events — company growth, brand narrative, GTM, and a little AIGC — with Asia/Shanghai times, speakers, and replay status.

面向中文读者的公开静态站，收录海外线上 AI 活动。页面是简体中文，活动标题保留英文原文。每场显示上海时间、主讲人、简介、价格和回放状态。

构建命令：`npm run build`  
输出目录：`dist`

## 本地开发

需要 Node.js 22。

```bash
npm ci
npm test
npm run build
npm run preview
```

`npm run dev` 启动开发服务器。`npm run validate` 检查 `data/events.json`、`data/insights.json` 与 `data/inspiration.json`。

技术栈是 [Astro](https://astro.build/)。页面在构建时从数据文件渲染成静态 HTML，筛选、搜索和「即将开始 / 已结束」的重新归类由一个小脚本在浏览器里完成。没有客户端框架。

站点页面：

| 路径 | 数据文件 | 说明 |
| --- | --- | --- |
| `/` | `data/events.json` + `data/insights.json` | 活动列表与活动特征总结 |
| `/inspiration/` | `data/inspiration.json` | 产品社区 / 灵感 / 模板模块观察 |

## 页面行为

每场活动一张卡片，从上到下是：标题、内容标签、举办方、主讲人（姓名和头衔）、开始时间、时长或结束时间、形式、平台、简介、价格和备注、回放状态和渠道、链接按钮。内容标签是小徽章。英文 `tags` 仍显示成原来的中文短标签。`missing` 里的字段显示成「待补：…」。`notes` 放在「备注」里，默认折叠。

- 开始时间用上海时间，带星期。还没开始的场次标「今天」或「x 天后」，开始时间一到就标「已结束」。
- 系列活动列出每一场，并写各自的副标题。只要还有未开始的场次，整张卡片算即将开始。
- 即将开始的活动在前，按下一场的开始时间从近到远。已结束的在后，按最近一场从新到旧。同一时刻按标题字母序稳定排列。
- 结束时间只用于展示时长，不改变分组。进行中的场次在开始之后就算已结束。
- 筛选：时间（全部 / 即将开始 / 已结束）、价格（全部 / 免费 / 付费）、回放状态、形式、内容标签、文本搜索。条件会写进地址栏，可以分享。
- 内容标签筛在列表上方，一排可点的徽章。每个标签旁是包含它的场次数，最前面有「全部」。可以多选；多选时，命中任一所选标签的活动都会留下。没选时等于全部。选择写进 `topic` 查询参数，例如 `?topic=内容策略`，多个标签会重复这个参数。刷新或打开分享链接后保持，并和分组、排序以及其他筛选一起生效。
- 搜索匹配标题、简介、举办方、主讲人、形式、平台、英文标签、内容标签、备注、回放渠道、链接文字和「熬夜场」。多个词都要命中。
- 上海时间 00:00（含）到 08:00（不含）开始的场次显示「熬夜场」。08:00 整点不算。模糊时间「凌晨、清晨、半夜、午夜、通宵」也算熬夜场。
- 链接按类型分成活动页、报名、回放、举办方、其他。
- 页头「数据更新于」读的是数据文件根上的 `last_updated`，不是页面构建时刻。
- 「活动特征总结」在页头下方、筛选和活动列表上方，按 `data/insights.json` 在构建时渲染。标为「初步观察」，并显示样本规模、日期范围和观察更新时间。要点里的 `event_ids` 链到对应活动卡片锚点。
- 没有 JavaScript 时，列表仍在，分类和「x 天后 / 已结束」用的是构建时刻。打开 JavaScript 后会按访客当前时刻重算。
- 部署产物里的 `/events.json`、`/insights.json` 和 `/inspiration.json` 是数据文件的副本，方便核对线上内容。可编辑的源头分别在仓库的 `data/` 目录。
- 页头导航可在「活动列表」与「灵感观察」之间切换。

### `/inspiration/` 页面行为

- 顶部展示声明、`baseline_date`、更新节奏（每周一、周四）和 `last_updated`。
- 「最近变化」按日期从新到旧列出全部 changelog，含完整摘要与来源链接。
- 「跨产品模式」展示全部 patterns 的完整 summary，并链到例证产品。
- 产品按 `groups` 分组；可用分组、状态和搜索筛选。每张卡片完整渲染模块链接、入口位置、内容类型、内容来源、组织方式、互动机制、转化路径、近期变化、证据、状态、核对日期、来源、备注和 spotlight（含评分表）；不截断、不省略字段。
- 部署产物里的 `/inspiration.json` 是数据副本。后续更新**只替换** `data/inspiration.json`。

## 数据约定

每日更新的机器人**只提交 `data/events.json`**（活动列表）。「活动特征总结」由人工或另外的流程更新 `data/insights.json`。灵感观察页每周一、周四更新时**只提交 `data/inspiration.json`**。改完跑 `npm run validate`，通过后再提交。GitHub Actions（`.github/workflows/check.yml`）和 Cloudflare Pages 的构建都会再查一次；校验失败时构建失败，线上会继续保留上一份成功的部署。

当前契约是 **schema v2**。不再使用 `urls`。

`id` 是稳定主键。同一活动不要改 id。页面用它做锚点，例如 `#twosetai-workshops`。

字段都要出现，不要省略，这样 diff 更干净。没有内容时，字符串写 `null`，列表可以写 `[]` 或 `null`。字段顺序保持现有文件的顺序。不要写 HTML。

时间一律是上海时间（`Asia/Shanghai`，UTC+8，无夏令时，与北京时间的钟点相同）。

机器可读的形状见 [`data/events.schema.json`](data/events.schema.json)。下面的规则和 `scripts/validate-events.mjs` 是实际生效的校验。两边要一起改。

### 新增一场

把对象放进 `events`。根上的 `last_updated` 和这一场的 `last_updated` 都改成这次编辑的上海时间，根时间不能早于任何一场。

```json
{
  "id": "example-office-hours",
  "title": "Example Office Hours",
  "summary": "一场面向增长团队的线上答疑，介绍如何用公开材料准备下周的发布。",
  "host": "Example",
  "speakers": [{ "name": "Ada Example", "title": "Host" }],
  "format": "Office Hours",
  "platform": "Zoom",
  "schedule": [
    {
      "start": "2026-12-20T02:00:00+08:00",
      "end": "2026-12-20T03:00:00+08:00",
      "duration_minutes": 60,
      "date": "2026-12-20",
      "label": null,
      "url": "https://example.com/events/office-hours"
    }
  ],
  "links": [
    { "type": "event", "label": "活动页", "url": "https://example.com/events/office-hours" }
  ],
  "price": { "type": "free", "amount": null, "currency": null, "note": null },
  "replay": { "channel": "YouTube @example", "status": "upcoming", "url": null },
  "tags": ["gtm"],
  "notes": null,
  "missing": [],
  "last_updated": "2026-12-01T09:00:00+08:00",
  "topics": ["增长与 GTM"]
}
```

系列活动的每一场可以把副标题写进 `label`，精确 `start` 仍然要填。模糊时间不要编造钟点，把原文放进 `label`，`start` 留 `null`：

```json
{ "start": null, "end": null, "duration_minutes": null, "date": "2026-11-12", "label": "凌晨", "url": null }
```

付费示例：`"price": { "type": "paid", "amount": 59, "currency": "USD", "note": null }`。

公开回放出来之后，把状态改成 `replay_available` 并填 https 链接：

```json
{ "channel": "YouTube @example", "status": "replay_available", "url": "https://www.youtube.com/watch?v=xxxxxxxxxxx" }
```

不知道主讲人头衔或回放渠道时，对应值写 `null`，并在 `missing` 里记下，例如 `"missing": ["speakers.title", "replay.channel"]`。

### 修改一场

找到原来的 `id` 就地修改。场次变化时替换 `schedule`，并保持时间严格递增。全部场次都已经开始后，`replay.status` 不能再是 `upcoming`，要改成 `awaiting_replay`、`replay_available` 或 `no_replay`。

### 字段

| 字段 | 要求 |
| --- | --- |
| `schema_version` | 只能是 `2` |
| `timezone` | 只能是 `Asia/Shanghai` |
| `last_updated` | `YYYY-MM-DDTHH:mm:ss+08:00`。根上这个值就是页面显示的更新时间 |
| `id` | 以小写字母开头，只含小写字母、数字和连字符，最长 80，全文件唯一 |
| `title` | 原文标题，不要翻译，1–180 字 |
| `summary` | 中文简介，或 `null`，最长 800 |
| `host` | 举办方。标题或公开页面能确定时填写，否则 `null`。不要猜 |
| `speakers` | `null` 或最多 12 人。每人含 `name`、`title`（头衔未知则为 `null`） |
| `format` | 形式，例如 `Workshop`、`Office Hours`、`Webinar`、`Roundtable`、`Masterclass`。没有则 `null` |
| `platform` | 平台，例如 `Zoom`、`YouTube Live`。没有则 `null` |
| `schedule` | 1–12 场。每场含 `start`、`end`、`duration_minutes`、`date`、`label`、`url` |
| `schedule[].start` | 精确开始时间，格式同上；模糊时间用 `null` |
| `schedule[].end` | 精确结束时间，必须晚于 `start`；不知道则 `null` |
| `schedule[].duration_minutes` | 正整数分钟，最长 1440。`start` 和 `end` 都有时必须等于两者的分钟差。不知道则 `null` |
| `schedule[].date` | `YYYY-MM-DD`。有 `start` 时必须等于该时刻的上海时间日期 |
| `schedule[].label` | 这一场的副标题，最长 160。没有则 `null`。`start` 为 `null` 时必须写模糊时间原文。已有精确 `start` 时，不要只写「凌晨」这类模糊时间 |
| `schedule[].url` | 这一场自己的公开页面，或 `null`。有值时必须同时出现在 `links` |
| `links` | `null` 或最多 24 条。每条含 `type`（`event`、`register`、`replay`、`host`、`other`）、`label`、`url`。链接必须是 https，同一场里不能重复 |
| `price.type` | `free` 或 `paid` |
| `price.amount` / `price.currency` | 付费时金额为正数，货币是三位 ISO 代码（如 `USD`）。免费时两者都是 `null` |
| `price.note` | 可选的公开参与条件，例如 `需主办方审批`。没有则 `null` |
| `replay.channel` | 公开渠道名称，或 `null` |
| `replay.status` | `upcoming`、`awaiting_replay`、`replay_available`、`no_replay` |
| `replay.url` | 只有 `replay_available` 才能填 https 链接，其他状态必须是 `null` |
| `tags` | 至少一个，取自下面的英文标签列表，按该顺序排列，不能重复 |
| `notes` | 给读者的公开备注，或 `null`，最长 400 |
| `missing` | 字符串数组，列出还缺的字段路径，例如 `speakers.title`。没有缺口则 `[]` |
| 每场 `last_updated` | 这一条的修改时间，格式同根字段 |
| `topics` | 必填。1–3 个内容标签，不能重复，只能取下面的中文词表。与英文 `tags` 分开。数组内部不要求按词表排序 |

标签：

| 标签 | 页面文案 |
| --- | --- |
| `growth` | 增长 |
| `brand` | 品牌 |
| `gtm` | GTM |
| `aigc` | AIGC |
| `content` | 内容 |
| `visibility` | 可见度 |
| `workshop` | 研讨 |

要新增英文标签，得同时改 schema 的枚举、`src/lib/classify.mjs` 里的 `TAG_ORDER` / `TAG_LABELS`，以及测试。日常更新不需要新标签。形式不是枚举；页面只为当前这几种提供中文名，不认识的形式会原样显示。

内容标签（`topics`）是另一套固定词表，页面筛选按这个顺序排列：

| 内容标签 |
| --- |
| 内容策略 |
| 社媒运营 |
| 个人品牌 |
| 品牌叙事 |
| 增长与 GTM |
| AI 搜索可见度 |
| AI 工作流与智能体 |
| 销售获客 |
| 视觉与视频制作 |

要新增内容标签，得同时改 schema 的枚举、`src/lib/classify.mjs` 里的 `TOPIC_ORDER`，以及测试。一场里这些值不能重复，也不能写成上面 9 个以外的文字。英文 `tags` 继续用原来的枚举，不要把中文内容标签写进 `tags`。

### insights.json（活动特征总结）

公开数据，供首页「活动特征总结」模块使用，与 `events.json` 同目录（`data/insights.json`）。只描述已收录场次的观察，不写邮箱、密码、报名方式或代报情况。机器可读说明见 [`data/insights.schema.md`](data/insights.schema.md)。实际生效的校验在 `scripts/validate-insights.mjs`，由 `npm run validate` 一并执行。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schema_version` | number | 是 | 当前为 `1`。不兼容变更时加一 |
| `timezone` | string | 是 | 固定为 `Asia/Shanghai` |
| `last_updated` | string | 是 | `YYYY-MM-DDTHH:mm:ss+08:00` |
| `disclaimer` | string | 是 | 简短声明：内容为初步观察，只依据当前已收录场次 |
| `sample` | object | 是 | 观察所依据的样本范围 |
| `sample.event_count` | number | 是 | 必须等于当时 `events.json` 的 `events.length` |
| `sample.session_count` | number | 否 | 若填写，必须等于全部 `schedule` 长度之和 |
| `sample.date_range` | object | 是 | `start` / `end` 均为 `YYYY-MM-DD`，且 `start <= end` |
| `sample.note` | string | 否 | 对计数或日期范围的补充说明 |
| `sections` | array | 是 | 非空。顺序即页面展示顺序，建议 4–8 节 |
| `sections[].id` | string | 是 | 稳定英文短 id，匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`，全文件唯一 |
| `sections[].title` | string | 是 | 中文标题 |
| `sections[].summary` | string | 是 | 2–4 句总述，需标出这是初步观察 |
| `sections[].points` | array | 是 | 非空要点，建议 3–6 条 |
| `sections[].points[].text` | string | 是 | 中文要点 |
| `sections[].points[].event_ids` | string[] | 否 | 例证活动 id，必须存在于 `events.json`，数组内不重复 |

建议的 `sections[].id`：`topics`、`formats`、`scenarios`、`hosts`、`replay-and-access`、`growth-and-community`。可增删，但不要随意改已发布的 id。

校验还会拒绝正文（`disclaimer`、`summary`、`points[].text`、`sample.note`）里的邮箱地址。更新时只根据当时的 `events.json` 重写观察，计数变化时同步 `sample` 和各节数字，文案保持「初步观察」。

### 时间怎么算已结束

- 精确时间：当前时刻大于等于 `start`，这场次已结束。
- `label` 含「凌晨、清晨、半夜、午夜、通宵」且没有 `start`：当天 08:00（上海时间）起算已结束。排序时它落在当天 00:00，页面只显示原文，不显示虚构的 08:00。
- 其他模糊时间：当天 23:59:59（上海时间）起算已结束，排序落在当天 00:00。
- 相对该条 `last_updated`，只要还有未结束场次，`replay.status` 必须是 `upcoming`。一场都没有了，就不能再是 `upcoming`。

### 回放状态

| 状态 | 含义 |
| --- | --- |
| `upcoming` | 还有场次没开始 |
| `awaiting_replay` | 已经结束，还没有公开回放地址 |
| `replay_available` | 已有公开回放地址，必须带 `replay.url` |
| `no_replay` | 已确认没有公开回放 |


## 灵感观察数据（`data/inspiration.json`）

人读契约见 [`data/inspiration.schema.md`](data/inspiration.schema.md)。实际校验在 `scripts/validate-inspiration.mjs`。后续更新只替换该 JSON，不要改页面代码。

### 必满足规则

1. UTF-8 JSON；顶层含 `schema_version`（整数 `>= 1`）、`timezone`（`Asia/Shanghai`）、`last_updated`（`+08:00` ISO）、`baseline_date`、`update_cadence`、`disclaimer`、`groups`、`products`、`changelog`、`patterns`。
2. `baseline_date`、`first_seen`、`last_checked`、`changelog[].date` 均为 `YYYY-MM-DD`。不要改已发布的 `baseline_date`。
3. `groups`、`products` 非空；`changelog`、`patterns` 为数组。
4. `groups[].id`、`products[].id`、`patterns[].id` 各自唯一，匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。
5. 每个 `products[].group_id` 必须存在于 `groups[]`；`changelog[].product_id` 与 `patterns[].product_ids` 必须存在于 `products[]`；`product_ids` 内部不重复。
6. 非空 URL（`modules[].url`、`sources[].url`、`changelog[].source_url`）必须以 `https://` 开头；未知用空字符串。
7. `evidence` 只能是 `已打开`、`部分打开`、`仅搜到`。
8. 产品级与模块级 `status` 只能是 `active`、`unreachable`、`changed`。
9. 每个产品的 `modules`、`sources` 非空；`modules[].name`、`modules[].kind`、`sources[].label` 非空；`kind` 为小写短标签。
10. **安全**：整个文件文本（大小写不敏感）不得出现 `youmind` / `优麦`；任意字符串不得含邮箱地址。
11. `changelog` 按 `date` 升序；新条目只追加。有变化时更新产品字段、`last_checked`，必要时改 `status` 并追加 changelog；同步改 `last_updated`。
12. 只写公开页面可核对事实；不要写私人建议、邮箱、密码、注册信息；未知留空，不要猜测。

## 隐私

数据必须可以公开。种子已经去掉个人报名信息，以后的提交也要保持这样。

不要写入（`events.json`、`insights.json` 与 `inspiration.json` 均适用）：

- 邮箱地址、`mailto:`、密码、令牌、手机号
- 谁报名了、谁决定不报名、会员库之类的私人去向
- 具体报名步骤，或带有账号、密码、邮箱、token 的链接
- 灵感数据中的 `YouMind` / `优麦` / `youmind`（大小写不敏感）

可以写公开信息：活动页链接、价格、货币、以及「免费但需主办方审批」这种参与条件。回放如果只给报名者、没有公开地址，`channel` 写「仅向报名者提供」即可，不要写邮箱。

`events.json` 校验会拒绝邮箱地址、敏感字段名（如 `email`、`password`、`token`）、英文 `password`、中文「密码」、HTML，以及带账号密码或敏感查询参数的 URL。`insights.json` 额外检查正文不含邮箱，且所有 `event_ids` 都能在 `events.json` 里找到。`inspiration.json` 额外拒绝 `youmind` / `优麦`，以及邮箱地址。

## 部署到 Cloudflare Pages

这个仓库已接到 Cloudflare Pages 的 **Git 集成**，项目名是 `ai-events-radar`。

正式地址：https://ai-events-radar.pages.dev/

当前配置：

- Production branch：`main`
- Build command：`npm run build`
- Build output directory：`dist`
- 环境变量：Production / Preview 都有 `NODE_VERSION=22`

推到 `main` 的提交（包括只改 `data/events.json`）会自动重新构建。其他分支会生成预览部署。构建命令里已经包含数据校验；畸形数据会让这次部署失败，上一份成功的站点继续对外。

站点保持公开，不要在前面加 Cloudflare Access。需要的话，可在该 Pages 项目里绑定自定义域名。

## 许可证

[MIT](LICENSE)。
