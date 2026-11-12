import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import data from "../data/events.json" with { type: "json" };

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const published = readFileSync(new URL("../dist/events.json", import.meta.url), "utf8");

assert.equal(published, readFileSync(new URL("../data/events.json", import.meta.url), "utf8"));
assert.match(html, /rel="stylesheet"/);
assert.match(html, /即将开始/);
assert.match(html, /已结束/);
assert.match(html, /熬夜场/);
assert.match(html, /数据更新于/);
assert.match(html, /免费/);
assert.match(html, /付费|US\$59/);
assert.match(html, /等待回放/);
assert.match(html, /已有回放/);
assert.match(html, /无回放/);
assert.doesNotMatch(html, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
assert.doesNotMatch(html, /用户决定|会员库|mailto:/);

for (const event of data.events) {
  assert.ok(html.includes(event.title), `missing title: ${event.title}`);
  assert.ok(html.includes(`id="${event.id}"`), `missing id: ${event.id}`);
}

const articles = html.match(/<article\b/g) ?? [];
assert.equal(articles.length, data.events.length);

function decode(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

const schedules = [...html.matchAll(/data-schedule="([^"]*)"/g)];
assert.equal(schedules.length, data.events.length);
for (const [, raw] of schedules) {
  const schedule = JSON.parse(decode(raw));
  assert.ok(Array.isArray(schedule) && schedule.length > 0);
  assert.ok(schedule.every((session) => "start" in session && "date" in session && "label" in session));
}

console.log(`页面检查通过：${data.events.length} 场活动已写入 dist/index.html`);
