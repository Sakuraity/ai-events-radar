# insights.json schema

公开数据，供 AI Events Radar 站点的「活动特征总结」模块使用。文件与 `events.json` 放在同一目录（仓库里对应 `data/insights.json`）。只描述已收录场次的观察，不写邮箱、密码、报名方式或代报情况。

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schema_version` | number | 是 | 当前为 `1`。不兼容变更时加一。 |
| `timezone` | string | 是 | 固定为 `Asia/Shanghai`，与 `events.json` 一致。 |
| `last_updated` | string | 是 | ISO 8601 日期时间，必须带 `+08:00` 偏移，例如 `2026-11-28T12:05:00+08:00`。 |
| `disclaimer` | string | 是 | 简短声明：内容为初步观察，只依据当前已收录场次。 |
| `sample` | object | 是 | 这批观察所依据的样本范围。 |
| `sections` | array | 是 | 总结小节，建议 4–8 个，顺序即页面展示顺序。 |

## `sample`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `event_count` | number | 是 | 本次观察覆盖的活动条数，应与当时 `events.json` 中 `events.length` 一致。 |
| `session_count` | number | 否 | 所有活动 `schedule` 场次之和。系列活动可能一场对应多场次。 |
| `date_range` | object | 是 | `start`、`end` 均为 `YYYY-MM-DD`（上海时区日期），取样本中最早和最晚一场的开始日期。 |
| `note` | string | 否 | 对计数或日期范围的补充说明。 |

## `sections[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 稳定英文短 id，仅用小写字母、数字和连字符，例如 `topics`。页面锚点和后续更新应对齐同一 id。 |
| `title` | string | 是 | 中文标题。 |
| `summary` | string | 是 | 2–4 句总述，需标出这是初步观察，并尽量带上可核对的计数。 |
| `points` | array | 是 | 支撑该节的要点，建议 3–6 条。 |

建议的 `id`（均可增删，但不要随意改已发布的 id）：

- `topics` 内容主题分布
- `formats` 活动形式
- `scenarios` 常见具体场景
- `hosts` 举办方类型
- `replay-and-access` 回放与参与门槛
- `growth-and-community` 和增长或社区的连接

## `sections[].points[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | 是 | 中文要点，基于实际场次，不编造未出现的数据。 |
| `event_ids` | string[] | 否 | 用作例证的活动 id，必须是当时 `events.json` 里已有的 `events[].id`。建议 2–6 个，不要把本节所有相关场次穷尽列出。 |

## 校验建议

1. 文件是 UTF-8 JSON。
2. `schema_version` 为整数且 `>= 1`。
3. `timezone` 为 `Asia/Shanghai`。
4. `last_updated` 能被解析为带 `+08:00` 的日期时间。
5. `sample.event_count` 等于 `events.json` 的活动条数；若同时校验 `session_count`，应等于所有 `schedule` 长度之和。
6. `sample.date_range.start` / `end` 为 `YYYY-MM-DD`，且 `start <= end`。
7. `sections` 为非空数组；每个 `id` 唯一，匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`；`title`、`summary` 非空；`points` 为非空数组。
8. 每条 `points[].text` 非空；若存在 `event_ids`，则每一项都能在 `events.json` 中找到对应 `id`，且数组内无重复。
9. 正文（`disclaimer`、`summary`、`points[].text`、`sample.note`）不得出现邮箱地址、密码、或报名/代报细节。

## 更新原则

- 只根据当时的 `events.json`（及公开活动页）重写观察，不把跟踪表里的报名状态写进本文件。
- 计数变化时同步更新 `sample` 和各节 `summary` 里的数字。
- 文案保持「初步观察」，避免把当前样本写成行业结论。
