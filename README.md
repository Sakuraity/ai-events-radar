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

`npm run dev` 启动开发服务器。`npm run validate` 只检查 `data/events.json`。

技术栈是 [Astro](https://astro.build/)。页面在构建时从数据文件渲染成静态 HTML，筛选、搜索和「即将开始 / 已结束」的重新归类由一个小脚本在浏览器里完成。没有客户端框架。

## 页面行为

每场活动一张卡片，从上到下是：标题、举办方、主讲人（姓名和头衔）、开始时间、时长或结束时间、形式、平台、简介、价格和备注、回放状态和渠道、链接按钮。`missing` 里的字段显示成「待补：…」。`notes` 放在「备注」里，默认折叠。

- 开始时间用上海时间，带星期。还没开始的场次标「今天」或「x 天后」，开始时间一到就标「已结束」。
- 系列活动列出每一场，并写各自的副标题。只要还有未开始的场次，整张卡片算即将开始。
- 即将开始的活动在前，按下一场的开始时间从近到远。已结束的在后，按最近一场从新到旧。同一时刻按标题字母序稳定排列。
- 结束时间只用于展示时长，不改变分组。进行中的场次在开始之后就算已结束。
- 筛选：时间（全部 / 即将开始 / 已结束）、价格（全部 / 免费 / 付费）、回放状态、形式、文本搜索。条件会写进地址栏，可以分享。
- 搜索匹配标题、简介、举办方、主讲人、形式、平台、主题、备注、回放渠道、链接文字和「熬夜场」。多个词都要命中。
- 上海时间 00:00（含）到 08:00（不含）开始的场次显示「熬夜场」。08:00 整点不算。模糊时间「凌晨、清晨、半夜、午夜、通宵」也算熬夜场。
- 链接按类型分成活动页、报名、回放、举办方、其他。
- 页头「数据更新于」读的是数据文件根上的 `last_updated`，不是页面构建时刻。
- 没有 JavaScript 时，列表仍在，分类和「x 天后 / 已结束」用的是构建时刻。打开 JavaScript 后会按访客当前时刻重算。
- 部署产物里的 `/events.json` 是数据文件的副本，方便核对线上内容。可编辑的源头只有仓库里的 `data/events.json`。

## 数据约定

每日更新的机器人**只提交 `data/events.json`**。改完跑 `npm run validate`，通过后再提交。GitHub Actions（`.github/workflows/check.yml`）和 Cloudflare Pages 的构建都会再查一次；校验失败时构建失败，线上会继续保留上一份成功的部署。

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
  "last_updated": "2026-12-01T09:00:00+08:00"
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
| `tags` | 至少一个，取自下面的列表，按该顺序排列，不能重复 |
| `notes` | 给读者的公开备注，或 `null`，最长 400 |
| `missing` | 字符串数组，列出还缺的字段路径，例如 `speakers.title`。没有缺口则 `[]` |
| 每场 `last_updated` | 这一条的修改时间，格式同根字段 |

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

要新增标签，得同时改 schema 的枚举、`src/lib/classify.mjs` 里的 `TAG_ORDER` / `TAG_LABELS`，以及测试。日常更新不需要新标签。形式不是枚举；页面只为当前这几种提供中文名，不认识的形式会原样显示。

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

## 隐私

数据必须可以公开。种子已经去掉个人报名信息，以后的提交也要保持这样。

不要写入：

- 邮箱地址、`mailto:`、密码、令牌、手机号
- 谁报名了、谁决定不报名、会员库之类的私人去向
- 具体报名步骤，或带有账号、密码、邮箱、token 的链接

可以写公开信息：活动页链接、价格、货币、以及「免费但需主办方审批」这种参与条件。回放如果只给报名者、没有公开地址，`channel` 写「仅向报名者提供」即可，不要写邮箱。

校验会拒绝邮箱地址、敏感字段名（如 `email`、`password`、`token`）、英文 `password`、中文「密码」、HTML，以及带账号密码或敏感查询参数的 URL。

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
