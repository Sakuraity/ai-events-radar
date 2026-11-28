import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const SECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROOT_KEYS = ["schema_version", "timezone", "last_updated", "disclaimer", "sample", "sections"];
const SAMPLE_KEYS = ["event_count", "session_count", "date_range", "note"];
const SAMPLE_REQUIRED = ["event_count", "date_range"];
const SECTION_KEYS = ["id", "title", "summary", "points"];
const POINT_KEYS = ["text", "event_ids"];
const POINT_REQUIRED = ["text"];

export function validateInsights(insights, eventsData) {
  const errors = [];
  const fail = (path, message) => errors.push(`${path}: ${message}`);

  if (!insights || typeof insights !== "object" || Array.isArray(insights)) {
    return ["根节点: 必须是对象"];
  }
  if (!eventsData || typeof eventsData !== "object" || !Array.isArray(eventsData.events)) {
    return ["events: 必须提供含 events 数组的活动数据以便交叉校验"];
  }

  checkKeys(insights, ROOT_KEYS, "根节点", fail, { allowExtra: false });

  if (!Number.isInteger(insights.schema_version) || insights.schema_version < 1) {
    fail("schema_version", "必须是 >= 1 的整数");
  }
  if (insights.timezone !== "Asia/Shanghai") {
    fail("timezone", "必须是 Asia/Shanghai");
  }
  if (!isExactShanghaiIso(insights.last_updated)) {
    fail("last_updated", "必须是 Asia/Shanghai 的 ISO 8601（+08:00）");
  }
  checkPlainText(insights.disclaimer, "disclaimer", fail, { min: 1, max: 400 });
  checkNoEmail(insights.disclaimer, "disclaimer", fail);

  validateSample(insights.sample, eventsData, fail);
  validateSections(insights.sections, eventsData, fail);

  return errors;
}

function validateSample(sample, eventsData, fail) {
  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    fail("sample", "必须是对象");
    return;
  }
  checkKeys(sample, SAMPLE_KEYS, "sample", fail, { required: SAMPLE_REQUIRED, allowExtra: false });

  if (!Number.isInteger(sample.event_count) || sample.event_count < 0) {
    fail("sample.event_count", "必须是非负整数");
  } else if (sample.event_count !== eventsData.events.length) {
    fail(
      "sample.event_count",
      `必须等于 events.json 的活动条数（当前 ${eventsData.events.length}，写的是 ${sample.event_count}）`,
    );
  }

  if ("session_count" in sample && sample.session_count !== undefined) {
    if (!Number.isInteger(sample.session_count) || sample.session_count < 0) {
      fail("sample.session_count", "必须是非负整数");
    } else {
      const sessions = eventsData.events.reduce(
        (sum, event) => sum + (Array.isArray(event.schedule) ? event.schedule.length : 0),
        0,
      );
      if (sample.session_count !== sessions) {
        fail(
          "sample.session_count",
          `必须等于全部 schedule 长度之和（当前 ${sessions}，写的是 ${sample.session_count}）`,
        );
      }
    }
  }

  const range = sample.date_range;
  if (!range || typeof range !== "object" || Array.isArray(range)) {
    fail("sample.date_range", "必须是对象");
  } else {
    checkKeys(range, ["start", "end"], "sample.date_range", fail, { allowExtra: false });
    if (!DATE.test(range.start) || !isRealDate(range.start)) {
      fail("sample.date_range.start", "必须是真实的 YYYY-MM-DD");
    }
    if (!DATE.test(range.end) || !isRealDate(range.end)) {
      fail("sample.date_range.end", "必须是真实的 YYYY-MM-DD");
    }
    if (DATE.test(range.start) && DATE.test(range.end) && range.start > range.end) {
      fail("sample.date_range", "start 不能晚于 end");
    }
  }

  if ("note" in sample && sample.note !== undefined && sample.note !== null) {
    checkPlainText(sample.note, "sample.note", fail, { min: 1, max: 400 });
    checkNoEmail(sample.note, "sample.note", fail);
  }
}

function validateSections(sections, eventsData, fail) {
  if (!Array.isArray(sections) || sections.length < 1) {
    fail("sections", "必须是非空数组");
    return;
  }

  const eventIds = new Set(eventsData.events.map((event) => event.id));
  const seenSectionIds = new Set();

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const path = `sections[${index}]`;
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      fail(path, "必须是对象");
      continue;
    }
    checkKeys(section, SECTION_KEYS, path, fail, { allowExtra: false });

    if (typeof section.id !== "string" || !SECTION_ID.test(section.id)) {
      fail(`${path}.id`, "必须是小写字母、数字和连字符组成的短 id");
    } else if (seenSectionIds.has(section.id)) {
      fail(`${path}.id`, `id 重复：${section.id}`);
    } else {
      seenSectionIds.add(section.id);
    }

    checkPlainText(section.title, `${path}.title`, fail, { min: 1, max: 80 });
    checkPlainText(section.summary, `${path}.summary`, fail, { min: 1, max: 1200 });
    checkNoEmail(section.summary, `${path}.summary`, fail);

    if (!Array.isArray(section.points) || section.points.length < 1) {
      fail(`${path}.points`, "必须是非空数组");
      continue;
    }

    for (let pointIndex = 0; pointIndex < section.points.length; pointIndex += 1) {
      const point = section.points[pointIndex];
      const pointPath = `${path}.points[${pointIndex}]`;
      if (!point || typeof point !== "object" || Array.isArray(point)) {
        fail(pointPath, "必须是对象");
        continue;
      }
      checkKeys(point, POINT_KEYS, pointPath, fail, { required: POINT_REQUIRED, allowExtra: false });
      checkPlainText(point.text, `${pointPath}.text`, fail, { min: 1, max: 800 });
      checkNoEmail(point.text, `${pointPath}.text`, fail);

      if (!("event_ids" in point) || point.event_ids === undefined) continue;
      if (!Array.isArray(point.event_ids)) {
        fail(`${pointPath}.event_ids`, "必须是字符串数组");
        continue;
      }
      const seen = new Set();
      for (let idIndex = 0; idIndex < point.event_ids.length; idIndex += 1) {
        const id = point.event_ids[idIndex];
        const idPath = `${pointPath}.event_ids[${idIndex}]`;
        if (typeof id !== "string" || id.length < 1) {
          fail(idPath, "必须是非空字符串");
          continue;
        }
        if (seen.has(id)) {
          fail(idPath, `event_id 重复：${id}`);
        }
        seen.add(id);
        if (!eventIds.has(id)) {
          fail(idPath, `在 events.json 中找不到 id：${id}`);
        }
      }
    }
  }
}

function checkKeys(value, expected, path, fail, { required = expected, allowExtra = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const actual = Object.keys(value);
  for (const key of required) {
    if (!actual.includes(key)) fail(path, `缺少字段 ${key}`);
  }
  if (!allowExtra) {
    for (const key of actual) {
      if (!expected.includes(key)) fail(path, `有多余字段 ${key}`);
    }
  }
}

function checkPlainText(value, path, fail, { min, max }) {
  if (typeof value !== "string" || value.trim() !== value || value.length < min || value.length > max) {
    fail(path, `必须是 ${min} 到 ${max} 个字符的纯文本`);
  }
}

function checkNoEmail(value, path, fail) {
  if (typeof value !== "string") return;
  if (EMAIL.test(value) || /mailto:/i.test(value)) {
    fail(path, "不能包含邮箱地址");
  }
}

function isExactShanghaiIso(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isRealDate(value) {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function loadJson(url) {
  return JSON.parse(readFileSync(url, "utf8"));
}

function main() {
  const insightsFile = process.argv[2]
    ? new URL(process.argv[2], `file://${process.cwd()}/`)
    : new URL("../data/insights.json", import.meta.url);
  const eventsFile = process.argv[3]
    ? new URL(process.argv[3], `file://${process.cwd()}/`)
    : new URL("../data/events.json", import.meta.url);

  let insights;
  let eventsData;
  try {
    insights = loadJson(insightsFile);
    eventsData = loadJson(eventsFile);
  } catch (error) {
    console.error(`无法读取数据文件：${error.message}`);
    process.exit(1);
  }

  const errors = validateInsights(insights, eventsData);
  if (errors.length > 0) {
    console.error(`insights 校验失败（${errors.length}）`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `insights 校验通过：${insights.sections.length} 节 · 样本 ${insights.sample.event_count} 场`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
