import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import data from "../data/events.json" with { type: "json" };
import schema from "../data/events.schema.json" with { type: "json" };
import { TAG_ORDER } from "../src/lib/classify.mjs";
import {
  EVENT_KEYS,
  LINK_KEYS,
  LINK_TYPES,
  PRICE_KEYS,
  REPLAY_KEYS,
  REPLAY_STATUSES,
  ROOT_KEYS,
  SESSION_KEYS,
  SPEAKER_KEYS,
  validateEvents,
} from "./validate-events.mjs";

const SEED_TITLES = [
  "TwoSetAI Workshop Series",
  "Midjourney Office Hours（David Holz）",
  "Figma Weave Office Hours",
  "The AI Visibility Playbook: 4 Experts, 4 Strategies, One Goal",
  "Building an AI-Assisted GTM Strategy for Smarter, Faster Acquisition",
  "Build Your Personal Brand With AI in One Hour",
  "Building an Agentic GTM Engine Workshop - Round 2",
  "Building an Agentic GTM Engine Workshop - Round 3",
  "Create Your Own Claude Social Media Manager",
  "Build your AI Content Machine + Q&A",
  "Why Geo, Why Now?",
  "Wellows Webinar, Session 3: Why AI Trusts Your Competitors",
  "Wellows Webinar, Session 4: Make AI Quote You",
  "Wellows Webinar, Session 5: Your 30-Day AI Visibility Plan, Built Live",
  "Stop Being the Middleman: Become the Marketer-in-the-Loop.",
  "Create Your AI Growth Brief: Get People to Find and Use What You Built",
  "How Much of Your Next Product Launch Can AI Actually Handle?",
  "A Mini-Masterclass for Brands Using AI for Content",
];

function sample() {
  return {
    schema_version: 2,
    timezone: "Asia/Shanghai",
    last_updated: "2026-11-12T21:30:00+08:00",
    events: [
      {
        id: "sample-event",
        title: "Sample Event",
        summary: "一场示例活动。",
        host: "Sample Host",
        speakers: [{ name: "Ada Example", title: "Host" }],
        format: "Workshop",
        platform: "Zoom",
        schedule: [
          {
            start: "2026-12-01T02:00:00+08:00",
            end: "2026-12-01T03:00:00+08:00",
            duration_minutes: 60,
            date: "2026-12-01",
            label: "Opening session",
            url: "https://example.com/event",
          },
        ],
        links: [{ type: "event", label: "活动页", url: "https://example.com/event" }],
        price: { type: "free", amount: null, currency: null, note: null },
        replay: { channel: "Example", status: "upcoming", url: null },
        tags: ["growth"],
        notes: null,
        missing: [],
        last_updated: "2026-11-12T21:30:00+08:00",
      },
    ],
  };
}

test("schema keys stay aligned with the validator", () => {
  assert.equal(schema.properties.schema_version.const, 2);
  assert.deepEqual(schema.required, ROOT_KEYS);
  assert.deepEqual(Object.keys(schema.properties), ROOT_KEYS);
  assert.deepEqual(schema.$defs.event.required, EVENT_KEYS);
  assert.deepEqual(Object.keys(schema.$defs.event.properties), EVENT_KEYS);
  assert.deepEqual(schema.$defs.session.required, SESSION_KEYS);
  assert.deepEqual(Object.keys(schema.$defs.session.properties), SESSION_KEYS);
  assert.deepEqual(schema.$defs.speaker.required, SPEAKER_KEYS);
  assert.deepEqual(Object.keys(schema.$defs.speaker.properties), SPEAKER_KEYS);
  assert.deepEqual(schema.$defs.link.required, LINK_KEYS);
  assert.deepEqual(Object.keys(schema.$defs.link.properties), LINK_KEYS);
  assert.deepEqual(schema.$defs.linkType.enum, LINK_TYPES);
  assert.deepEqual(schema.$defs.price.required, PRICE_KEYS);
  assert.deepEqual(schema.$defs.replay.required, REPLAY_KEYS);
  assert.deepEqual(schema.$defs.tag.enum, TAG_ORDER);
  assert.deepEqual(schema.$defs.replayStatus.enum, REPLAY_STATUSES);
  assert.equal(schema.$defs.event.additionalProperties, false);
  assert.equal(EVENT_KEYS.includes("urls"), false);
});

test("seed file is public-safe schema v2 and matches the 18 source titles", () => {
  assert.deepEqual(validateEvents(data), []);
  assert.equal(data.schema_version, 2);
  assert.equal(data.events.length, 18);
  assert.deepEqual(
    data.events.map((event) => event.title).sort(),
    [...SEED_TITLES].sort(),
  );
  const raw = JSON.stringify(data);
  assert.equal(raw.includes('"urls"'), false);
  assert.doesNotMatch(raw, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(raw, /密码|用户决定|会员库|mailto:|\bpassword\b/i);
});

test("rejects an email address", () => {
  const data = sample();
  data.events[0].notes = "write me at person@example.com";
  assert.match(validateEvents(data).join("\n"), /邮箱/);
});

test("rejects the word password and 密码", () => {
  const english = sample();
  english.events[0].notes = "the password is on the form";
  assert.match(validateEvents(english).join("\n"), /密码/);

  const chinese = sample();
  chinese.events[0].summary = "报名时不要填写密码";
  assert.match(validateEvents(chinese).join("\n"), /密码/);
});

test("rejects a sensitive field name", () => {
  const data = sample();
  data.events[0].password = "nope";
  assert.match(validateEvents(data).join("\n"), /不允许的字段名|多余字段/);
});

test("rejects the retired urls field", () => {
  const data = sample();
  data.events[0].urls = ["https://example.com/event"];
  assert.match(validateEvents(data).join("\n"), /多余字段 urls/);
});

test("rejects a fuzzy time with an invented clock time", () => {
  const data = sample();
  data.events[0].schedule[0] = {
    start: "2026-12-01T00:00:00+08:00",
    end: "2026-12-01T01:00:00+08:00",
    duration_minutes: 60,
    date: "2026-12-01",
    label: "凌晨",
    url: "https://example.com/event",
  };
  assert.match(validateEvents(data).join("\n"), /label/);
});

test("allows a session subtitle next to an exact start", () => {
  const data = sample();
  assert.deepEqual(validateEvents(data), []);
});

test("rejects a missing fuzzy label", () => {
  const data = sample();
  data.events[0].schedule[0] = {
    start: null,
    end: null,
    duration_minutes: null,
    date: "2026-12-01",
    label: null,
    url: null,
  };
  assert.match(validateEvents(data).join("\n"), /label/);
});

test("rejects an offset other than +08:00", () => {
  const data = sample();
  data.events[0].schedule[0].start = "2026-12-01T02:00:00Z";
  assert.match(validateEvents(data).join("\n"), /ISO 8601/);
});

test("rejects a non-https link", () => {
  const data = sample();
  data.events[0].links[0].url = "http://example.com/event";
  data.events[0].schedule[0].url = null;
  assert.match(validateEvents(data).join("\n"), /https/);
});

test("rejects paid events without an amount and free events with one", () => {
  const paid = sample();
  paid.events[0].price = { type: "paid", amount: null, currency: null, note: null };
  assert.match(validateEvents(paid).join("\n"), /金额/);

  const free = sample();
  free.events[0].price.amount = 0;
  assert.match(validateEvents(free).join("\n"), /免费/);
});

test("rejects replay urls unless the replay is published", () => {
  const early = sample();
  early.events[0].replay.url = "https://example.com/replay";
  assert.match(validateEvents(early).join("\n"), /只有已有回放/);

  const published = sample();
  published.events[0].schedule[0].start = "2026-11-01T02:00:00+08:00";
  published.events[0].schedule[0].end = "2026-11-01T03:00:00+08:00";
  published.events[0].schedule[0].date = "2026-11-01";
  published.events[0].replay = {
    channel: "YouTube",
    status: "replay_available",
    url: null,
  };
  assert.match(validateEvents(published).join("\n"), /https/);
});

test("rejects upcoming status after every session has started", () => {
  const data = sample();
  data.events[0].schedule[0].start = "2026-11-01T02:00:00+08:00";
  data.events[0].schedule[0].end = "2026-11-01T03:00:00+08:00";
  data.events[0].schedule[0].date = "2026-11-01";
  assert.match(validateEvents(data).join("\n"), /不能再标为 upcoming/);
});

test("sample event and the cli both follow the contract", () => {
  assert.deepEqual(validateEvents(sample()), []);
  const root = fileURLToPath(new URL("..", import.meta.url));
  const ok = spawnSync(process.execPath, ["scripts/validate-events.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);

  const dir = mkdtempSync(join(tmpdir(), "events-"));
  const file = join(dir, "events.json");
  const bad = sample();
  bad.events[0].notes = "person@example.com";
  writeFileSync(file, JSON.stringify(bad));
  const failed = spawnSync(process.execPath, ["scripts/validate-events.mjs", file], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /邮箱/);
});
