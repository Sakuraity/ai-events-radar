import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import data from "../data/events.json" with { type: "json" };
import insights from "../data/insights.json" with { type: "json" };

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const published = readFileSync(new URL("../dist/events.json", import.meta.url), "utf8");
const publishedInsights = readFileSync(new URL("../dist/insights.json", import.meta.url), "utf8");

assert.equal(published, readFileSync(new URL("../data/events.json", import.meta.url), "utf8"));
assert.equal(publishedInsights, readFileSync(new URL("../data/insights.json", import.meta.url), "utf8"));
assert.match(html, /rel="stylesheet"/);
assert.match(html, /即将开始/);
assert.match(html, /已结束/);
assert.match(html, /熬夜场/);
assert.match(html, /数据更新于/);
assert.match(html, /上海时间/);
assert.match(html, /简介/);
assert.match(html, /备注/);
assert.match(html, /待补：/);
assert.match(html, /免费/);
assert.match(html, /付费|US\$59/);
assert.match(html, /等待回放/);
assert.match(html, /已有回放/);
assert.match(html, /无回放/);
assert.match(html, /活动页/);
assert.match(html, /举办方/);
assert.match(html, /内容标签/);
assert.match(html, /活动特征总结/);
assert.match(html, /初步观察/);
assert.match(html, /id="insights"/);
assert.match(published, /"topics"/);
assert.equal((html.match(/data-group="topic"/g) ?? []).length, 10);
assert.doesNotMatch(html, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
assert.doesNotMatch(html, /用户决定|mailto:/);
assert.doesNotMatch(published, /用户决定|mailto:/);
assert.doesNotMatch(publishedInsights, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
assert.doesNotMatch(publishedInsights, /mailto:/i);

function decode(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

const decoded = decode(html);
for (const event of data.events) {
  assert.ok(decoded.includes(event.title), `missing title: ${event.title}`);
  assert.ok(html.includes(`id="${event.id}"`), `missing id: ${event.id}`);
  if (event.summary) assert.ok(decoded.includes(event.summary), `missing summary: ${event.id}`);
  for (const topic of event.topics) {
    assert.ok(decoded.includes(topic), `missing topic ${topic} on ${event.id}`);
  }
  assert.ok(decoded.includes(JSON.stringify(event.topics)), `missing topics data: ${event.id}`);
}

for (const section of insights.sections) {
  assert.ok(html.includes(`id="insight-${section.id}"`), `missing insight section: ${section.id}`);
  assert.ok(decoded.includes(section.title), `missing insight title: ${section.title}`);
  assert.ok(decoded.includes(section.summary), `missing insight summary: ${section.id}`);
  for (const point of section.points) {
    assert.ok(decoded.includes(point.text), `missing insight point: ${section.id}`);
    for (const id of point.event_ids ?? []) {
      assert.ok(html.includes(`href="#${id}"`), `missing insight event link: ${id}`);
    }
  }
}

const articles = html.match(/<article\b/g) ?? [];
assert.equal(articles.length, data.events.length + insights.sections.length);

const schedules = [...html.matchAll(/data-schedule="([^"]*)"/g)];
assert.equal(schedules.length, data.events.length);
for (const [, raw] of schedules) {
  const schedule = JSON.parse(decode(raw));
  assert.ok(Array.isArray(schedule) && schedule.length > 0);
  assert.ok(schedule.every((session) => "start" in session && "date" in session && "label" in session));
}

console.log(
  `页面检查通过：${data.events.length} 场活动、${insights.sections.length} 节特征总结已写入 dist/index.html`,
);
