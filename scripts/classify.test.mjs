import assert from "node:assert/strict";
import test from "node:test";
import data from "../data/events.json" with { type: "json" };
import {
  formatSession,
  groupEvents,
  isExactShanghaiIso,
  isSleepSession,
  sleepCoverage,
} from "../src/lib/classify.mjs";

const NOW = new Date("2026-11-12T11:26:00Z");

test("exact Shanghai timestamps round-trip, invalid dates do not", () => {
  assert.equal(isExactShanghaiIso("2026-11-14T02:00:00+08:00"), true);
  assert.equal(isExactShanghaiIso("2026-11-14T02:00:00Z"), false);
  assert.equal(isExactShanghaiIso("2026-02-31T00:00:00+08:00"), false);
});

test("sleep hours are 00:00 inclusive through 08:00 exclusive", () => {
  assert.equal(isSleepSession({ start: "2026-11-13T00:00:00+08:00", date: "2026-11-13", label: null }), true);
  assert.equal(isSleepSession({ start: "2026-11-13T00:30:00+08:00", date: "2026-11-13", label: null }), true);
  assert.equal(isSleepSession({ start: "2026-11-14T07:59:00+08:00", date: "2026-11-14", label: null }), true);
  assert.equal(isSleepSession({ start: "2026-11-12T08:00:00+08:00", date: "2026-11-12", label: null }), false);
  assert.equal(isSleepSession({ start: "2026-11-25T23:00:00+08:00", date: "2026-11-25", label: null }), false);
  assert.equal(isSleepSession({ start: null, date: "2026-11-12", label: "凌晨" }), true);
});

test("fuzzy early-morning text is not rendered as an invented clock time", () => {
  const formatted = formatSession({ start: null, date: "2026-10-29", label: "凌晨" });
  assert.match(formatted.dateLine, /2026年10月29日/);
  assert.equal(formatted.timeLine, "凌晨");
  assert.equal(formatted.sleep, true);
  assert.equal(JSON.stringify(formatted).includes("08:00"), false);
});

test("seed events are grouped with upcoming first at 2026-11-12 19:26 Shanghai", () => {
  const grouped = groupEvents(data.events, NOW);
  assert.deepEqual(
    grouped.upcoming.map((event) => event.id),
    [
      "figma-weave-office-hours",
      "wellows-s3-why-ai-trusts-your-competitors",
      "stop-being-the-middleman",
      "build-your-ai-content-machine",
      "twosetai-workshops",
      "agentic-gtm-engine-round-2",
      "the-ai-visibility-playbook",
      "claude-social-media-manager",
      "wellows-s4-make-ai-quote-you",
      "why-geo-why-now",
      "wellows-s5-30-day-ai-visibility-plan",
      "building-an-ai-assisted-gtm-strategy",
      "agentic-gtm-engine-round-3",
      "build-your-personal-brand-with-ai",
    ],
  );
  assert.deepEqual(
    grouped.past.map((event) => event.id),
    [
      "a-mini-masterclass-for-brands-using-ai-for-content",
      "midjourney-office-hours",
      "how-much-of-your-next-product-launch-can-ai-handle",
      "create-your-ai-growth-brief",
    ],
  );
});

test("only the three daytime-or-evening seed events skip the sleep badge", () => {
  const awake = data.events
    .filter((event) => sleepCoverage(event.schedule) === "none")
    .map((event) => event.id)
    .sort();
  assert.deepEqual(awake, [
    "a-mini-masterclass-for-brands-using-ai-for-content",
    "how-much-of-your-next-product-launch-can-ai-handle",
    "why-geo-why-now",
  ]);
});
