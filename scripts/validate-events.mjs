import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import schema from "../data/events.schema.json" with { type: "json" };
import {
  TAG_ORDER,
  isExactShanghaiIso,
  isRealDate,
  isSessionPast,
  sessionStartKey,
  shanghaiDateString,
} from "../src/lib/classify.mjs";

export const EVENT_KEYS = schema.$defs.event.required;
export const SESSION_KEYS = schema.$defs.session.required;
export const PRICE_KEYS = schema.$defs.price.required;
export const REPLAY_KEYS = schema.$defs.replay.required;
export const ROOT_KEYS = schema.required;
export const REPLAY_STATUSES = schema.$defs.replayStatus.enum;
export const PRICE_TYPES = schema.$defs.priceType.enum;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const FORBIDDEN_KEY = /(email|e-mail|password|passwd|secret|token|phone|mobile)/i;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateEvents(data) {
  const errors = [];
  const fail = (path, message) => errors.push(`${path}: ${message}`);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["根节点: 必须是对象"];
  }

  walkPrivacy(data, "", fail);
  checkKeys(data, ROOT_KEYS, "根节点", fail);

  if (data.schema_version !== schema.properties.schema_version.const) {
    fail("schema_version", "必须是 1");
  }
  if (data.timezone !== "Asia/Shanghai") {
    fail("timezone", "必须是 Asia/Shanghai");
  }
  checkTimestamp(data.last_updated, "last_updated", fail);

  if (!Array.isArray(data.events)) {
    fail("events", "必须是数组");
    return errors;
  }

  const seenIds = new Set();
  for (let index = 0; index < data.events.length; index += 1) {
    const event = data.events[index];
    const path = `events[${index}]`;
    validateEvent(event, path, data.last_updated, seenIds, fail);
  }

  return errors;
}

function validateEvent(event, path, rootUpdated, seenIds, fail) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(path, "必须是对象");
    return;
  }
  checkKeys(event, EVENT_KEYS, path, fail);

  if (typeof event.id !== "string" || !ID_PATTERN.test(event.id) || event.id.length > 80) {
    fail(`${path}.id`, "必须是不超过 80 字符、以字母开头的小写连字符 id");
  } else if (seenIds.has(event.id)) {
    fail(`${path}.id`, `id 重复：${event.id}`);
  } else {
    seenIds.add(event.id);
  }

  checkPlainText(event.title, `${path}.title`, fail, { min: 1, max: 180 });
  if (event.host !== null) checkPlainText(event.host, `${path}.host`, fail, { min: 1, max: 80 });
  if (event.notes !== null) checkPlainText(event.notes, `${path}.notes`, fail, { min: 1, max: 400 });
  checkTimestamp(event.last_updated, `${path}.last_updated`, fail);
  if (isExactShanghaiIso(event.last_updated) && isExactShanghaiIso(rootUpdated)) {
    if (Date.parse(rootUpdated) < Date.parse(event.last_updated)) {
      fail("last_updated", "不能早于任何一场的 last_updated");
    }
  }

  validateSchedule(event, path, fail);
  validateUrls(event, path, fail);
  validatePrice(event.price, `${path}.price`, fail);
  validateReplay(event, path, fail);
  validateTags(event.tags, `${path}.tags`, fail);
}

function validateSchedule(event, path, fail) {
  if (!Array.isArray(event.schedule) || event.schedule.length < 1 || event.schedule.length > 12) {
    fail(`${path}.schedule`, "必须是 1 到 12 场的数组");
    return;
  }

  let previousKey = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < event.schedule.length; index += 1) {
    const session = event.schedule[index];
    const sessionPath = `${path}.schedule[${index}]`;
    if (!session || typeof session !== "object" || Array.isArray(session)) {
      fail(sessionPath, "必须是对象");
      continue;
    }
    checkKeys(session, SESSION_KEYS, sessionPath, fail);

    const hasStart = session.start !== null;
    if (hasStart) {
      if (!isExactShanghaiIso(session.start)) {
        fail(`${sessionPath}.start`, "必须是 Asia/Shanghai 的 ISO 8601（+08:00），或在时间模糊时为 null");
      } else if (session.date !== shanghaiDateString(session.start)) {
        fail(`${sessionPath}.date`, "必须与 start 的北京时间日期一致");
      }
      if (session.label !== null) {
        fail(`${sessionPath}.label`, "已有精确 start 时必须为 null");
      }
    } else {
      if (!isRealDate(session.date)) {
        fail(`${sessionPath}.date`, "模糊时间必须提供真实的 YYYY-MM-DD 日期");
      }
      checkPlainText(session.label, `${sessionPath}.label`, fail, { min: 1, max: 40 });
      if (session.label === null || session.label === "") {
        fail(`${sessionPath}.label`, "不能确定钟点时必须把原文写进 label，不能编造 start");
      }
    }

    if (session.url !== null) checkHttpsUrl(session.url, `${sessionPath}.url`, fail);

    if ((hasStart && isExactShanghaiIso(session.start)) || (!hasStart && isRealDate(session.date))) {
      const key = sessionStartKey(session);
      if (!(key > previousKey)) {
        fail(sessionPath, "场次时间必须严格递增");
      }
      previousKey = key;
    }
  }
}

function validateUrls(event, path, fail) {
  if (!Array.isArray(event.urls) || event.urls.length < 1 || event.urls.length > 8) {
    fail(`${path}.urls`, "必须是 1 到 8 条公开 https 链接");
    return;
  }
  const seen = new Set();
  for (let index = 0; index < event.urls.length; index += 1) {
    const url = event.urls[index];
    checkHttpsUrl(url, `${path}.urls[${index}]`, fail);
    if (seen.has(url)) fail(`${path}.urls[${index}]`, "链接重复");
    seen.add(url);
  }
  if (Array.isArray(event.schedule)) {
    for (let index = 0; index < event.schedule.length; index += 1) {
      const url = event.schedule[index]?.url;
      if (url && !seen.has(url)) {
        fail(`${path}.schedule[${index}].url`, "场次链接必须同时出现在 urls 里");
      }
    }
  }
}

function validatePrice(price, path, fail) {
  if (!price || typeof price !== "object" || Array.isArray(price)) {
    fail(path, "必须是对象");
    return;
  }
  checkKeys(price, PRICE_KEYS, path, fail);
  if (!PRICE_TYPES.includes(price.type)) {
    fail(`${path}.type`, "必须是 free 或 paid");
    return;
  }
  if (price.note !== null) checkPlainText(price.note, `${path}.note`, fail, { min: 1, max: 80 });

  if (price.type === "free") {
    if (price.amount !== null || price.currency !== null) {
      fail(path, "免费活动的 amount 和 currency 必须为 null");
    }
    return;
  }

  if (typeof price.amount !== "number" || !Number.isFinite(price.amount) || price.amount <= 0) {
    fail(`${path}.amount`, "付费活动必须写大于 0 的金额");
  }
  if (typeof price.currency !== "string" || !/^[A-Z]{3}$/.test(price.currency)) {
    fail(`${path}.currency`, "付费活动必须写三位 ISO 4217 货币代码");
  }
}

function validateReplay(event, path, fail) {
  const replay = event.replay;
  const replayPath = `${path}.replay`;
  if (!replay || typeof replay !== "object" || Array.isArray(replay)) {
    fail(replayPath, "必须是对象");
    return;
  }
  checkKeys(replay, REPLAY_KEYS, replayPath, fail);
  if (!REPLAY_STATUSES.includes(replay.status)) {
    fail(`${replayPath}.status`, "必须是 upcoming、awaiting_replay、replay_available 或 no_replay");
  }
  if (replay.channel !== null) {
    checkPlainText(replay.channel, `${replayPath}.channel`, fail, { min: 1, max: 120 });
  }
  if (replay.status === "replay_available") {
    checkHttpsUrl(replay.url, `${replayPath}.url`, fail);
  } else if (replay.url !== null) {
    fail(`${replayPath}.url`, "只有已有回放时才能填写链接");
  }

  if (!Array.isArray(event.schedule) || !isExactShanghaiIso(event.last_updated)) return;
  const updatedAt = new Date(event.last_updated);
  const anyFuture = event.schedule.some((session) => session && !isSessionPast(session, updatedAt));
  if (anyFuture && replay.status !== "upcoming") {
    fail(`${replayPath}.status`, "相对 last_updated 仍有未开始场次时，必须是 upcoming");
  }
  if (!anyFuture && replay.status === "upcoming") {
    fail(`${replayPath}.status`, "场次都已开始时，不能再标为 upcoming");
  }
}

function validateTags(tags, path, fail) {
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > TAG_ORDER.length) {
    fail(path, "至少要有一个标签");
    return;
  }
  let previous = -1;
  for (let index = 0; index < tags.length; index += 1) {
    const position = TAG_ORDER.indexOf(tags[index]);
    if (position === -1) {
      fail(`${path}[${index}]`, `标签不在允许列表：${tags[index]}`);
      continue;
    }
    if (position <= previous) {
      fail(path, "标签必须按 growth、brand、gtm、aigc、content、visibility、workshop 的顺序排列且不能重复");
    }
    previous = position;
  }
}

function checkTimestamp(value, path, fail) {
  if (!isExactShanghaiIso(value)) {
    fail(path, "必须是 Asia/Shanghai 的 ISO 8601（+08:00）");
  }
}

function checkPlainText(value, path, fail, { min, max }) {
  if (typeof value !== "string" || value.trim() !== value || value.length < min || value.length > max) {
    fail(path, `必须是 ${min} 到 ${max} 个字符的纯文本`);
  }
}

function checkHttpsUrl(value, path, fail) {
  if (typeof value !== "string") {
    fail(path, "必须是 https 链接");
    return;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(path, "必须是 https 链接");
    return;
  }
  if (url.protocol !== "https:" || url.origin === "null" || !url.hostname.includes(".")) {
    fail(path, "必须是带域名的 https 链接");
    return;
  }
  if (url.username || url.password) {
    fail(path, "链接不能包含账号或密码");
  }
  for (const key of url.searchParams.keys()) {
    if (FORBIDDEN_KEY.test(key)) fail(path, `链接不能包含敏感查询参数 ${key}`);
  }
}

function checkKeys(value, expected, path, fail) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const actual = Object.keys(value);
  for (const key of expected) {
    if (!actual.includes(key)) fail(path, `缺少字段 ${key}`);
  }
  for (const key of actual) {
    if (!expected.includes(key)) fail(path, `有多余字段 ${key}`);
  }
}

function walkPrivacy(value, path, fail) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkPrivacy(item, `${path}[${index}]`, fail));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) {
        fail(path || "根节点", `不允许的字段名 ${key}（数据必须保持公开，不含账号或联系方式）`);
      }
      walkPrivacy(child, path ? `${path}.${key}` : key, fail);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (EMAIL.test(value) || /mailto:/i.test(value)) {
    fail(path, "不能包含邮箱地址");
  }
  if (/\bpassword\b/i.test(value) || value.includes("密码")) {
    fail(path, "不能包含密码");
  }
  if (/[<>]/.test(value)) fail(path, "必须是纯文本，不能包含 HTML");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) fail(path, "包含控制字符");
}

function main() {
  const file = process.argv[2] ?? new URL("../data/events.json", import.meta.url);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`无法读取数据文件：${error.message}`);
    process.exit(1);
  }
  const errors = validateEvents(data);
  if (errors.length > 0) {
    console.error(`数据校验失败（${errors.length}）`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`校验通过：${data.events.length} 场活动`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
