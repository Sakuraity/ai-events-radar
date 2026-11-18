import assert from "node:assert/strict";
import test from "node:test";
import data from "../data/events.json" with { type: "json" };
import {
  classifyEvent,
  countByTopic,
  formatDuration,
  formatSession,
  formatTiming,
  groupEvents,
  isExactShanghaiIso,
  isSleepSession,
  matchesFilters,
  relativeWhen,
  searchBlob,
  selectedTopics,
  sleepCoverage,
  toggleTopic,
  writeTopicParams,
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
  assert.match(formatted.dateLine, /星期/);
  assert.equal(formatted.timeLine, "凌晨");
  assert.equal(formatted.sleep, true);
  assert.equal(JSON.stringify(formatted).includes("08:00"), false);
});

test("relative labels use the Shanghai calendar", () => {
  const past = { start: "2026-11-12T08:00:00+08:00", date: "2026-11-12", label: null };
  const today = { start: "2026-11-12T23:00:00+08:00", date: "2026-11-12", label: null };
  const later = { start: "2026-11-14T02:00:00+08:00", date: "2026-11-14", label: null };
  assert.equal(relativeWhen(past, NOW), "已结束");
  assert.equal(relativeWhen(today, NOW), "今天");
  assert.equal(relativeWhen(later, NOW), "2 天后");
});

test("duration prefers hours and keeps an end time that crosses midnight", () => {
  assert.equal(formatDuration(30), "30 分钟");
  assert.equal(formatDuration(60), "1 小时");
  assert.equal(formatDuration(90), "1 小时 30 分钟");
  assert.equal(formatDuration(120), "2 小时");
  assert.equal(
    formatTiming({
      start: "2026-11-14T02:00:00+08:00",
      end: "2026-11-14T03:00:00+08:00",
      duration_minutes: 60,
      date: "2026-11-14",
    }),
    "1 小时 · 03:00 结束",
  );
  assert.equal(
    formatTiming({
      start: "2026-11-25T23:00:00+08:00",
      end: "2026-11-26T00:00:00+08:00",
      duration_minutes: 60,
      date: "2026-11-25",
    }),
    "1 小时 · 11月26日 00:00 结束",
  );
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
      "midjourney-office-hours",
      "wellows-s4-make-ai-quote-you",
      "go-to-market-in-the-ai-era",
      "why-geo-why-now",
      "wellows-s5-30-day-ai-visibility-plan",
      "building-an-ai-assisted-gtm-strategy",
      "new-playbook-ama-gtm-marketing-ai-era",
      "deepline-deepdives-gtm-ai-office-hours",
      "agentic-gtm-engine-round-3",
      "content-strategy-you-can-sustain-ai",
      "geo-for-b2b-saas-whats-working-now",
      "build-your-personal-brand-with-ai",
    ],
  );
  assert.deepEqual(
    grouped.past.map((event) => event.id),
    [
      "a-mini-masterclass-for-brands-using-ai-for-content",
      "how-much-of-your-next-product-launch-can-ai-handle",
      "create-your-ai-growth-brief",
    ],
  );
});

test("topic selection keeps vocabulary order and drops unknown values", () => {
  assert.deepEqual(
    selectedTopics(["销售获客", "不存在", "内容策略", "内容策略"]),
    ["内容策略", "销售获客"],
  );
  assert.deepEqual(selectedTopics([]), []);
  assert.deepEqual(selectedTopics("内容策略"), []);
  assert.deepEqual(toggleTopic(["内容策略"], "社媒运营"), ["内容策略", "社媒运营"]);
  assert.deepEqual(toggleTopic(["社媒运营"], "内容策略"), ["内容策略", "社媒运营"]);
  assert.deepEqual(toggleTopic(["内容策略", "社媒运营"], "内容策略"), ["社媒运营"]);
  assert.deepEqual(toggleTopic(["内容策略"], "all"), []);

  const params = new URLSearchParams();
  writeTopicParams(params, ["销售获客", "增长与 GTM", "内容策略"]);
  assert.equal(params.getAll("topic").join("|"), "内容策略|增长与 GTM|销售获客");
  assert.deepEqual(selectedTopics(params.getAll("topic")), ["内容策略", "增长与 GTM", "销售获客"]);
  assert.equal(new URLSearchParams("topic=内容策略").get("topic"), "内容策略");
});

test("topic counts use the fixed vocabulary", () => {
  assert.deepEqual(countByTopic(data.events), {
    内容策略: 6,
    社媒运营: 2,
    个人品牌: 2,
    品牌叙事: 3,
    "增长与 GTM": 6,
    "AI 搜索可见度": 6,
    "AI 工作流与智能体": 7,
    销售获客: 3,
    视觉与视频制作: 3,
  });
});

test("content topic filter is any-match and combines with the other filters", () => {
  const items = data.events.map((event) => ({
    id: event.id,
    group: classifyEvent(event.schedule, NOW).group,
    price: event.price.type,
    replay: event.replay.status,
    format: event.format ?? "",
    topics: event.topics,
    search: searchBlob(event),
  }));
  const ids = (state) =>
    items
      .filter((item) => matchesFilters(item, state))
      .map((item) => item.id)
      .sort();
  const base = { when: "all", price: "all", replay: "all", format: "all", topics: [], q: "" };

  assert.equal(ids(base).length, 23);
  assert.deepEqual(ids({ ...base, topics: ["内容策略", "社媒运营"] }), [
    "a-mini-masterclass-for-brands-using-ai-for-content",
    "build-your-ai-content-machine",
    "build-your-personal-brand-with-ai",
    "claude-social-media-manager",
    "content-strategy-you-can-sustain-ai",
    "go-to-market-in-the-ai-era",
    "wellows-s4-make-ai-quote-you",
  ]);
  assert.deepEqual(ids({ ...base, when: "upcoming", price: "free", topics: ["内容策略", "社媒运营"] }), [
    "build-your-ai-content-machine",
    "content-strategy-you-can-sustain-ai",
    "go-to-market-in-the-ai-era",
    "wellows-s4-make-ai-quote-you",
  ]);
  assert.deepEqual(ids({ ...base, topics: ["内容策略"], q: "wellows" }), ["wellows-s4-make-ai-quote-you"]);
  assert.deepEqual(ids({ ...base, topics: ["视觉与视频制作"], format: "Office Hours" }), [
    "figma-weave-office-hours",
    "midjourney-office-hours",
  ]);
});

test("only the four daytime-or-evening seed events skip the sleep badge", () => {
  const awake = data.events
    .filter((event) => sleepCoverage(event.schedule) === "none")
    .map((event) => event.id)
    .sort();
  assert.deepEqual(awake, [
    "a-mini-masterclass-for-brands-using-ai-for-content",
    "geo-for-b2b-saas-whats-working-now",
    "how-much-of-your-next-product-launch-can-ai-handle",
    "why-geo-why-now",
  ]);
});
