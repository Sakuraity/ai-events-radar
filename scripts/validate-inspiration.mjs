import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { isExactShanghaiIso, isRealDate } from "../src/lib/classify.mjs";

export const ROOT_KEYS = [
  "schema_version",
  "timezone",
  "last_updated",
  "baseline_date",
  "update_cadence",
  "disclaimer",
  "groups",
  "products",
  "changelog",
  "patterns",
];

export const GROUP_KEYS = ["id", "name", "description"];

export const PRODUCT_REQUIRED_KEYS = [
  "id",
  "name",
  "group_id",
  "modules",
  "placement",
  "content_types",
  "content_source",
  "organization",
  "interaction",
  "conversion",
  "recent_updates",
  "evidence",
  "evidence_note",
  "first_seen",
  "last_checked",
  "status",
  "status_note",
  "sources",
];

export const PRODUCT_OPTIONAL_KEYS = ["notes", "spotlight"];

export const MODULE_REQUIRED_KEYS = ["name", "kind", "url", "status"];
export const MODULE_OPTIONAL_KEYS = ["status_note"];

export const SOURCE_KEYS = ["label", "url"];

export const CHANGELOG_KEYS = ["date", "product_id", "summary", "source_url"];

export const PATTERN_KEYS = ["id", "title", "summary", "product_ids"];

export const EVIDENCE_VALUES = ["已打开", "部分打开", "仅搜到"];
export const STATUS_VALUES = ["active", "unreachable", "changed"];

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const KIND_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL = /[^@\s]+@[^@\s]+\.[^@\s]+/;
export const FORBIDDEN_BRAND = /youmind|优麦/i;

const STRING_PRODUCT_FIELDS = [
  "name",
  "group_id",
  "placement",
  "content_types",
  "content_source",
  "organization",
  "interaction",
  "conversion",
  "recent_updates",
  "evidence",
  "evidence_note",
  "first_seen",
  "last_checked",
  "status",
  "status_note",
];

export function validateInspiration(data, rawText = null) {
  const errors = [];
  const fail = (path, message) => errors.push(`${path}: ${message}`);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["根节点: 必须是对象"];
  }

  if (rawText !== null) {
    checkSafetyText(rawText, "文件文本", fail);
  } else {
    checkSafetyText(JSON.stringify(data), "序列化文本", fail);
  }

  for (const key of ROOT_KEYS) {
    if (!(key in data)) fail("根节点", `缺少字段 ${key}`);
  }

  if (!Number.isInteger(data.schema_version) || data.schema_version < 1) {
    fail("schema_version", "必须是 >= 1 的整数");
  }
  if (data.timezone !== "Asia/Shanghai") {
    fail("timezone", "必须是 Asia/Shanghai");
  }
  if (!isExactShanghaiIso(data.last_updated)) {
    fail("last_updated", "必须是带 +08:00 的 ISO 8601 日期时间");
  }
  if (!isRealDate(data.baseline_date)) {
    fail("baseline_date", "必须是 YYYY-MM-DD");
  }
  checkNonEmptyString(data.update_cadence, "update_cadence", fail);
  checkNonEmptyString(data.disclaimer, "disclaimer", fail);

  if (!Array.isArray(data.groups) || data.groups.length === 0) {
    fail("groups", "必须是非空数组");
  }
  if (!Array.isArray(data.products) || data.products.length === 0) {
    fail("products", "必须是非空数组");
  }
  if (!Array.isArray(data.changelog)) {
    fail("changelog", "必须是数组");
  }
  if (!Array.isArray(data.patterns)) {
    fail("patterns", "必须是数组");
  }

  const groupIds = new Set();
  if (Array.isArray(data.groups)) {
    for (let index = 0; index < data.groups.length; index += 1) {
      validateGroup(data.groups[index], `groups[${index}]`, groupIds, fail);
    }
  }

  const productIds = new Set();
  const productById = new Map();
  if (Array.isArray(data.products)) {
    for (let index = 0; index < data.products.length; index += 1) {
      const product = data.products[index];
      validateProduct(product, `products[${index}]`, groupIds, productIds, fail);
      if (product && typeof product.id === "string") productById.set(product.id, product);
    }
  }

  if (Array.isArray(data.changelog)) {
    let previousDate = null;
    for (let index = 0; index < data.changelog.length; index += 1) {
      validateChangelogEntry(data.changelog[index], `changelog[${index}]`, productIds, fail);
      const date = data.changelog[index]?.date;
      if (typeof date === "string" && previousDate !== null && date < previousDate) {
        fail(`changelog[${index}].date`, "changelog 必须按 date 升序排列");
      }
      if (typeof date === "string") previousDate = date;
    }
  }

  const patternIds = new Set();
  if (Array.isArray(data.patterns)) {
    for (let index = 0; index < data.patterns.length; index += 1) {
      validatePattern(data.patterns[index], `patterns[${index}]`, productIds, patternIds, fail);
    }
  }

  return errors;
}

function validateGroup(group, path, groupIds, fail) {
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    fail(path, "必须是对象");
    return;
  }
  for (const key of GROUP_KEYS) {
    if (!(key in group)) fail(path, `缺少字段 ${key}`);
  }
  checkStableId(group.id, `${path}.id`, groupIds, fail);
  checkNonEmptyString(group.name, `${path}.name`, fail);
  checkNonEmptyString(group.description, `${path}.description`, fail);
}

function validateProduct(product, path, groupIds, productIds, fail) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    fail(path, "必须是对象");
    return;
  }

  for (const key of PRODUCT_REQUIRED_KEYS) {
    if (!(key in product)) fail(path, `缺少字段 ${key}`);
  }
  for (const key of Object.keys(product)) {
    if (![...PRODUCT_REQUIRED_KEYS, ...PRODUCT_OPTIONAL_KEYS].includes(key)) {
      fail(path, `有未知字段 ${key}`);
    }
  }

  checkStableId(product.id, `${path}.id`, productIds, fail);
  for (const field of STRING_PRODUCT_FIELDS) {
    if (!(field in product)) continue;
    if (typeof product[field] !== "string") {
      fail(`${path}.${field}`, "必须是字符串");
    }
  }
  checkNonEmptyString(product.name, `${path}.name`, fail);

  if (typeof product.group_id === "string" && product.group_id && !groupIds.has(product.group_id)) {
    fail(`${path}.group_id`, `找不到分组 ${product.group_id}`);
  }

  if (!EVIDENCE_VALUES.includes(product.evidence)) {
    fail(`${path}.evidence`, "只能是 已打开、部分打开、仅搜到");
  }
  if (!STATUS_VALUES.includes(product.status)) {
    fail(`${path}.status`, "只能是 active、unreachable、changed");
  }
  if (!isRealDate(product.first_seen)) fail(`${path}.first_seen`, "必须是 YYYY-MM-DD");
  if (!isRealDate(product.last_checked)) fail(`${path}.last_checked`, "必须是 YYYY-MM-DD");

  if (!Array.isArray(product.modules) || product.modules.length === 0) {
    fail(`${path}.modules`, "必须是非空数组");
  } else {
    for (let index = 0; index < product.modules.length; index += 1) {
      validateModule(product.modules[index], `${path}.modules[${index}]`, fail);
    }
  }

  if (!Array.isArray(product.sources) || product.sources.length === 0) {
    fail(`${path}.sources`, "必须是非空数组");
  } else {
    for (let index = 0; index < product.sources.length; index += 1) {
      validateSource(product.sources[index], `${path}.sources[${index}]`, fail);
    }
  }

  if ("notes" in product && typeof product.notes !== "string") {
    fail(`${path}.notes`, "必须是字符串");
  }
  if ("spotlight" in product) validateSpotlight(product.spotlight, `${path}.spotlight`, fail);
}

function validateModule(module, path, fail) {
  if (!module || typeof module !== "object" || Array.isArray(module)) {
    fail(path, "必须是对象");
    return;
  }
  for (const key of MODULE_REQUIRED_KEYS) {
    if (!(key in module)) fail(path, `缺少字段 ${key}`);
  }
  for (const key of Object.keys(module)) {
    if (![...MODULE_REQUIRED_KEYS, ...MODULE_OPTIONAL_KEYS].includes(key)) {
      fail(path, `有未知字段 ${key}`);
    }
  }
  checkNonEmptyString(module.name, `${path}.name`, fail);
  if (typeof module.kind !== "string" || !KIND_PATTERN.test(module.kind)) {
    fail(`${path}.kind`, "必须是小写短标签（如 community、gallery）");
  }
  checkOptionalHttpsUrl(module.url, `${path}.url`, fail);
  if (!STATUS_VALUES.includes(module.status)) {
    fail(`${path}.status`, "只能是 active、unreachable、changed");
  }
  if ("status_note" in module && typeof module.status_note !== "string") {
    fail(`${path}.status_note`, "必须是字符串");
  }
}

function validateSource(source, path, fail) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    fail(path, "必须是对象");
    return;
  }
  for (const key of SOURCE_KEYS) {
    if (!(key in source)) fail(path, `缺少字段 ${key}`);
  }
  checkNonEmptyString(source.label, `${path}.label`, fail);
  checkHttpsUrl(source.url, `${path}.url`, fail);
}

function validateChangelogEntry(entry, path, productIds, fail) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    fail(path, "必须是对象");
    return;
  }
  for (const key of CHANGELOG_KEYS) {
    if (!(key in entry)) fail(path, `缺少字段 ${key}`);
  }
  if (!isRealDate(entry.date)) fail(`${path}.date`, "必须是 YYYY-MM-DD");
  if (typeof entry.product_id !== "string" || !productIds.has(entry.product_id)) {
    fail(`${path}.product_id`, `找不到产品 ${entry.product_id}`);
  }
  checkNonEmptyString(entry.summary, `${path}.summary`, fail);
  checkOptionalHttpsUrl(entry.source_url, `${path}.source_url`, fail);
}

function validatePattern(pattern, path, productIds, patternIds, fail) {
  if (!pattern || typeof pattern !== "object" || Array.isArray(pattern)) {
    fail(path, "必须是对象");
    return;
  }
  for (const key of PATTERN_KEYS) {
    if (!(key in pattern)) fail(path, `缺少字段 ${key}`);
  }
  checkStableId(pattern.id, `${path}.id`, patternIds, fail);
  checkNonEmptyString(pattern.title, `${path}.title`, fail);
  checkNonEmptyString(pattern.summary, `${path}.summary`, fail);
  if (!Array.isArray(pattern.product_ids) || pattern.product_ids.length === 0) {
    fail(`${path}.product_ids`, "必须是非空数组");
    return;
  }
  const seen = new Set();
  for (let index = 0; index < pattern.product_ids.length; index += 1) {
    const id = pattern.product_ids[index];
    if (typeof id !== "string" || !productIds.has(id)) {
      fail(`${path}.product_ids[${index}]`, `找不到产品 ${id}`);
      continue;
    }
    if (seen.has(id)) fail(`${path}.product_ids[${index}]`, "product_ids 内部不能重复");
    seen.add(id);
  }
}

function validateSpotlight(spotlight, path, fail) {
  if (!spotlight || typeof spotlight !== "object" || Array.isArray(spotlight)) {
    fail(path, "必须是对象");
    return;
  }
  for (const [key, value] of Object.entries(spotlight)) {
    if (key === "scoring_rules") {
      if (!Array.isArray(value)) {
        fail(`${path}.scoring_rules`, "必须是数组");
        continue;
      }
      for (let index = 0; index < value.length; index += 1) {
        const rule = value[index];
        const rulePath = `${path}.scoring_rules[${index}]`;
        if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
          fail(rulePath, "必须是对象");
          continue;
        }
        for (const field of ["action", "score", "credit"]) {
          if (typeof rule[field] !== "string") fail(`${rulePath}.${field}`, "必须是字符串");
        }
      }
      continue;
    }
    if (key === "observations") {
      if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        fail(`${path}.observations`, "必须是字符串数组");
      }
      continue;
    }
    if (typeof value !== "string") {
      fail(`${path}.${key}`, "spotlight 子字段必须是字符串、scoring_rules 或 observations");
    }
  }
}

function checkStableId(value, path, seen, fail) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    fail(path, "必须匹配 ^[a-z0-9]+(?:-[a-z0-9]+)*$");
    return;
  }
  if (seen.has(value)) {
    fail(path, `id 重复：${value}`);
    return;
  }
  seen.add(value);
}

function checkNonEmptyString(value, path, fail) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(path, "必须是非空字符串");
  }
}

function checkHttpsUrl(value, path, fail) {
  if (typeof value !== "string" || !value.startsWith("https://")) {
    fail(path, "必须是以 https:// 开头的 URL");
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) {
      fail(path, "必须是带域名的 https URL");
    }
  } catch {
    fail(path, "必须是有效的 https URL");
  }
}

function checkOptionalHttpsUrl(value, path, fail) {
  if (value === "") return;
  checkHttpsUrl(value, path, fail);
}

function checkSafetyText(text, path, fail) {
  if (typeof text !== "string") return;
  if (FORBIDDEN_BRAND.test(text)) {
    fail(path, "不得出现 YouMind / 优麦 / youmind（大小写不敏感）");
  }
  if (EMAIL.test(text)) {
    fail(path, "不得出现邮箱地址");
  }
}

function main() {
  const file = process.argv[2] ?? new URL("../data/inspiration.json", import.meta.url);
  let raw;
  let data;
  try {
    raw = readFileSync(file, "utf8");
    data = JSON.parse(raw);
  } catch (error) {
    console.error(`无法读取数据文件：${error.message}`);
    process.exit(1);
  }
  const errors = validateInspiration(data, raw);
  if (errors.length > 0) {
    console.error(`inspiration 数据校验失败（${errors.length}）`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `校验通过：inspiration ${data.products.length} 个产品 · ${data.groups.length} 组 · ${data.changelog.length} 条变更 · ${data.patterns.length} 条模式`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
