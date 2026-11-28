import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import events from "../data/events.json" with { type: "json" };
import insights from "../data/insights.json" with { type: "json" };
import { validateInsights } from "./validate-insights.mjs";

function sampleInsights() {
  return {
    schema_version: 1,
    timezone: "Asia/Shanghai",
    last_updated: "2026-11-28T12:05:00+08:00",
    disclaimer: "初步观察。结论只依据当前站点已收录的场次。",
    sample: {
      event_count: 1,
      session_count: 1,
      date_range: { start: "2026-12-01", end: "2026-12-01" },
      note: "测试样本。",
    },
    sections: [
      {
        id: "topics",
        title: "内容主题分布",
        summary: "初步观察：本批只有一场示例活动。",
        points: [
          {
            text: "示例要点。",
            event_ids: ["sample-event"],
          },
        ],
      },
    ],
  };
}

function sampleEvents() {
  return {
    schema_version: 2,
    timezone: "Asia/Shanghai",
    last_updated: "2026-11-12T21:30:00+08:00",
    events: [
      {
        id: "sample-event",
        title: "Sample Event",
        schedule: [{ start: "2026-12-01T02:00:00+08:00", date: "2026-12-01" }],
      },
    ],
  };
}

test("seed insights.json validates against production events.json", () => {
  assert.deepEqual(validateInsights(insights, events), []);
  assert.equal(insights.schema_version, 1);
  assert.equal(insights.timezone, "Asia/Shanghai");
  assert.equal(insights.sample.event_count, events.events.length);
  assert.ok(insights.sections.length >= 4);
  assert.match(insights.disclaimer, /初步观察/);
  const raw = JSON.stringify(insights);
  assert.doesNotMatch(raw, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(raw, /mailto:/i);
});

test("rejects an email address in insight text", () => {
  const data = sampleInsights();
  data.sections[0].points[0].text = "联系 person@example.com";
  assert.match(validateInsights(data, sampleEvents()).join("\n"), /邮箱/);
});

test("rejects event_ids missing from events.json", () => {
  const data = sampleInsights();
  data.sections[0].points[0].event_ids = ["does-not-exist"];
  assert.match(validateInsights(data, sampleEvents()).join("\n"), /找不到 id/);
});

test("rejects duplicate event_ids inside one point", () => {
  const data = sampleInsights();
  data.sections[0].points[0].event_ids = ["sample-event", "sample-event"];
  assert.match(validateInsights(data, sampleEvents()).join("\n"), /重复/);
});

test("rejects mismatched sample.event_count", () => {
  const data = sampleInsights();
  data.sample.event_count = 99;
  assert.match(validateInsights(data, sampleEvents()).join("\n"), /活动条数/);
});

test("rejects mismatched sample.session_count", () => {
  const data = sampleInsights();
  data.sample.session_count = 99;
  assert.match(validateInsights(data, sampleEvents()).join("\n"), /schedule/);
});

test("rejects invalid section ids and empty sections", () => {
  const badId = sampleInsights();
  badId.sections[0].id = "Topics_1";
  assert.match(validateInsights(badId, sampleEvents()).join("\n"), /短 id/);

  const empty = sampleInsights();
  empty.sections = [];
  assert.match(validateInsights(empty, sampleEvents()).join("\n"), /非空数组/);
});

test("rejects inverted date_range", () => {
  const data = sampleInsights();
  data.sample.date_range = { start: "2026-12-10", end: "2026-12-01" };
  assert.match(validateInsights(data, sampleEvents()).join("\n"), /start 不能晚于 end/);
});

test("cli validates the seed file and fails on bad input", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const ok = spawnSync(process.execPath, ["scripts/validate-insights.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);

  const dir = mkdtempSync(join(tmpdir(), "insights-"));
  const insightsFile = join(dir, "insights.json");
  const eventsFile = join(dir, "events.json");
  const bad = sampleInsights();
  bad.disclaimer = "write me at person@example.com";
  writeFileSync(insightsFile, JSON.stringify(bad));
  writeFileSync(eventsFile, JSON.stringify(sampleEvents()));
  const failed = spawnSync(process.execPath, ["scripts/validate-insights.mjs", insightsFile, eventsFile], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /邮箱/);
});
