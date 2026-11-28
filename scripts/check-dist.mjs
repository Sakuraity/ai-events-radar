import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import data from "../data/events.json" with { type: "json" };
import insights from "../data/insights.json" with { type: "json" };
import inspiration from "../data/inspiration.json" with { type: "json" };
import { containsBlockedTerm } from "./validate-inspiration.mjs";

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const inspirationHtml = readFileSync(new URL("../dist/inspiration/index.html", import.meta.url), "utf8");
const published = readFileSync(new URL("../dist/events.json", import.meta.url), "utf8");
const publishedInsights = readFileSync(new URL("../dist/insights.json", import.meta.url), "utf8");
const publishedInspiration = readFileSync(new URL("../dist/inspiration.json", import.meta.url), "utf8");

assert.equal(published, readFileSync(new URL("../data/events.json", import.meta.url), "utf8"));
assert.equal(publishedInsights, readFileSync(new URL("../data/insights.json", import.meta.url), "utf8"));
assert.equal(
  publishedInspiration,
  readFileSync(new URL("../data/inspiration.json", import.meta.url), "utf8"),
);

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
assert.match(html, /href="\/inspiration\/"/);
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

const inspirationDecoded = decode(inspirationHtml);
assert.match(inspirationHtml, /产品社区与灵感模块观察/);
assert.match(inspirationHtml, /最近变化/);
assert.match(inspirationHtml, /跨产品模式/);
assert.match(inspirationHtml, /href="\/"/);
assert.ok(inspirationDecoded.includes(inspiration.disclaimer), "missing disclaimer text");
assert.match(inspirationHtml, /每周一、周四/);
assert.equal(containsBlockedTerm(inspirationHtml), false);
assert.doesNotMatch(inspirationHtml, /[^@\s]+@[^@\s]+\.[^@\s]+/);

for (const product of inspiration.products) {
  assert.ok(inspirationHtml.includes(`id="${product.id}"`), `missing product id: ${product.id}`);
  assert.ok(inspirationDecoded.includes(product.name), `missing product name: ${product.name}`);
  assert.ok(inspirationDecoded.includes(product.placement), `missing placement: ${product.id}`);
  assert.ok(inspirationDecoded.includes(product.content_types), `missing content_types: ${product.id}`);
  assert.ok(inspirationDecoded.includes(product.content_source), `missing content_source: ${product.id}`);
  assert.ok(inspirationDecoded.includes(product.organization), `missing organization: ${product.id}`);
  assert.ok(inspirationDecoded.includes(product.interaction), `missing interaction: ${product.id}`);
  assert.ok(inspirationDecoded.includes(product.conversion), `missing conversion: ${product.id}`);
  if (product.profile) {
    assert.ok(inspirationDecoded.includes(product.profile), `missing profile: ${product.id}`);
  }
  if (product.rewards) {
    assert.ok(inspirationDecoded.includes(product.rewards), `missing rewards: ${product.id}`);
  }
  if (product.scale) {
    assert.ok(inspirationDecoded.includes(product.scale), `missing scale: ${product.id}`);
  }
  if (product.update_cadence) {
    assert.ok(inspirationDecoded.includes(product.update_cadence), `missing product update_cadence: ${product.id}`);
  }
  if (product.recent_updates) {
    assert.ok(inspirationDecoded.includes(product.recent_updates), `missing recent_updates: ${product.id}`);
  }
  if (product.status_note) {
    assert.ok(inspirationDecoded.includes(product.status_note), `missing status_note: ${product.id}`);
  }
  if (product.evidence_note) {
    assert.ok(inspirationDecoded.includes(product.evidence_note), `missing evidence_note: ${product.id}`);
  }
  if (product.notes) {
    assert.ok(inspirationDecoded.includes(product.notes), `missing notes: ${product.id}`);
  }
  for (const module of product.modules) {
    assert.ok(inspirationDecoded.includes(module.name), `missing module ${module.name} on ${product.id}`);
    if (module.url) {
      assert.ok(inspirationHtml.includes(module.url), `missing module url ${module.url}`);
    }
    if (module.status_note) {
      assert.ok(inspirationDecoded.includes(module.status_note), `missing module status_note on ${product.id}`);
    }
  }
  for (const source of product.sources) {
    assert.ok(inspirationDecoded.includes(source.label), `missing source ${source.label}`);
    assert.ok(inspirationHtml.includes(source.url), `missing source url ${source.url}`);
  }
  for (const example of product.examples ?? []) {
    assert.ok(inspirationDecoded.includes(example.title), `missing example ${example.title}`);
    if (example.url) {
      assert.ok(inspirationHtml.includes(example.url), `missing example url ${example.url}`);
    }
    if (example.note) {
      assert.ok(inspirationDecoded.includes(example.note), `missing example note on ${product.id}`);
    }
  }
  for (const item of product.unconfirmed ?? []) {
    assert.ok(inspirationDecoded.includes(item), `missing unconfirmed on ${product.id}`);
  }
  if ((product.unconfirmed ?? []).length > 0) {
    assert.match(inspirationHtml, /待确认/);
  }
  if (product.spotlight) {
    for (const [key, value] of Object.entries(product.spotlight)) {
      if (typeof value === "string") {
        assert.ok(inspirationDecoded.includes(value), `missing spotlight.${key} on ${product.id}`);
      } else if (key === "observations") {
        for (const item of value) {
          assert.ok(inspirationDecoded.includes(item), `missing observation on ${product.id}`);
        }
      } else if (key === "scoring_rules") {
        for (const rule of value) {
          assert.ok(inspirationDecoded.includes(rule.action), `missing scoring action on ${product.id}`);
          assert.ok(inspirationDecoded.includes(rule.score), `missing scoring score on ${product.id}`);
          assert.ok(inspirationDecoded.includes(rule.credit), `missing scoring credit on ${product.id}`);
        }
      }
    }
  }
}

for (const entry of inspiration.changelog) {
  assert.ok(inspirationDecoded.includes(entry.summary), `missing changelog: ${entry.summary.slice(0, 40)}`);
  if (entry.source_url) {
    assert.ok(inspirationHtml.includes(entry.source_url), `missing changelog url: ${entry.source_url}`);
  }
}

for (const pattern of inspiration.patterns) {
  assert.ok(inspirationDecoded.includes(pattern.title), `missing pattern title: ${pattern.title}`);
  assert.ok(inspirationDecoded.includes(pattern.summary), `missing pattern summary: ${pattern.id}`);
  for (const item of pattern.observations ?? []) {
    assert.ok(inspirationDecoded.includes(item.note), `missing pattern observation on ${pattern.id}`);
    assert.ok(
      inspirationHtml.includes(`href="#${item.product_id}"`),
      `missing pattern observation link ${item.product_id}`,
    );
  }
}

const productArticles = inspirationHtml.match(/<article\b[^>]*class="[^"]*product-card/g) ?? [];
assert.equal(productArticles.length, inspiration.products.length);

console.log(
  `页面检查通过：${data.events.length} 场活动、${insights.sections.length} 节特征总结、${inspiration.products.length} 个灵感产品已写入 dist`,
);
