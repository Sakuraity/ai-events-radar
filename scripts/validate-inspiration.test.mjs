import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import data from "../data/inspiration.json" with { type: "json" };
import {
  EVIDENCE_VALUES,
  STATUS_VALUES,
  blockedTerms,
  validateInspiration,
} from "./validate-inspiration.mjs";

function sample() {
  return {
    schema_version: 1,
    timezone: "Asia/Shanghai",
    last_updated: "2026-11-28T12:51:25+08:00",
    baseline_date: "2026-11-28",
    update_cadence: "每周一、周四",
    disclaimer: "公开页面观察，均为初步判断。",
    groups: [
      {
        id: "ai-creation",
        name: "AI 创作",
        description: "图像与视频类产品。",
      },
    ],
    products: [
      {
        id: "sample-product",
        name: "Sample Product",
        group_id: "ai-creation",
        modules: [
          {
            name: "Community",
            kind: "community",
            url: "https://example.com/community",
            status: "active",
          },
        ],
        placement: "顶部导航",
        content_types: "作品",
        content_source: "UGC",
        organization: "按热度",
        interaction: "点赞",
        conversion: "一键打开",
        recent_updates: "",
        evidence: "已打开",
        evidence_note: "",
        first_seen: "2026-11-28",
        last_checked: "2026-11-28",
        status: "active",
        status_note: "",
        sources: [{ label: "Community 页", url: "https://example.com/community" }],
        profile: "这是一段产品概述。",
        rewards: "积分奖励",
        scale: "页面显示约 100 条。",
        update_cadence: "待确认",
        examples: [
          {
            title: "Example Item",
            url: "https://example.com/community/item",
            note: "首页精选",
          },
        ],
        unconfirmed: ["Rooms 当前人数未读到。"],
      },
    ],
    changelog: [
      {
        date: "2026-11-28",
        product_id: "sample-product",
        summary: "基线核对。",
        source_url: "https://example.com/community",
      },
    ],
    patterns: [
      {
        id: "one-click-reuse",
        title: "作品可一键复用",
        summary: "初步观察：用户可以一键复用。第二句补充机制。",
        product_ids: ["sample-product"],
        observations: [{ product_id: "sample-product", note: "支持 recreate。" }],
      },
    ],
  };
}

test("seed inspiration file passes every schema rule", () => {
  assert.deepEqual(validateInspiration(data, JSON.stringify(data)), []);
  assert.equal(data.schema_version, 1);
  assert.equal(data.timezone, "Asia/Shanghai");
  assert.equal(data.baseline_date, "2026-11-28");
  assert.equal(data.groups.length, 5);
  assert.equal(data.products.length, 29);
  assert.equal(data.changelog.length, 27);
  assert.equal(data.patterns.length, 16);
  assert.ok(data.products.every((product) => product.modules.length >= 1));
  assert.ok(data.products.every((product) => product.sources.length >= 1));
  assert.ok(data.products.every((product) => EVIDENCE_VALUES.includes(product.evidence)));
  assert.ok(data.products.every((product) => STATUS_VALUES.includes(product.status)));
  assert.ok(data.products.every((product) => typeof product.profile === "string" && product.profile));
  assert.ok(
    data.products.every(
      (product) =>
        Array.isArray(product.examples) &&
        product.examples.length >= 1 &&
        product.examples.length <= 5,
    ),
  );
  assert.ok(data.products.every((product) => Array.isArray(product.unconfirmed)));
  const groupIds = new Set(data.groups.map((group) => group.id));
  assert.ok(data.products.every((product) => groupIds.has(product.group_id)));
  const productIds = new Set(data.products.map((product) => product.id));
  assert.ok(data.changelog.every((entry) => productIds.has(entry.product_id)));
  assert.ok(
    data.patterns.every((pattern) => pattern.product_ids.every((id) => productIds.has(id))),
  );
  assert.ok(
    data.patterns.every((pattern) =>
      (pattern.observations ?? []).every((item) => pattern.product_ids.includes(item.product_id)),
    ),
  );
  const dates = data.changelog.map((entry) => entry.date);
  assert.deepEqual(dates, [...dates].sort());
  assert.ok(dates[0] < data.baseline_date);
});

test("rejects blocked terms anywhere in the file text", () => {
  const [latin, cjk] = blockedTerms();
  const branded = sample();
  branded.products[0].notes = `compare with ${latin} later`;
  assert.match(validateInspiration(branded).join("\n"), /禁用词表|blocked terms/i);

  const mixedCase = sample();
  mixedCase.products[0].notes = latin[0].toUpperCase() + latin.slice(1);
  assert.match(validateInspiration(mixedCase).join("\n"), /禁用词表|blocked terms/i);

  const chinese = sample();
  chinese.disclaimer = `不要写${cjk}`;
  assert.match(validateInspiration(chinese).join("\n"), /禁用词表|blocked terms/i);
});

test("rejects an email address", () => {
  const mailed = sample();
  mailed.products[0].notes = "contact person@example.com";
  assert.match(validateInspiration(mailed).join("\n"), /邮箱/);
});

test("rejects unknown group_id and changelog product_id", () => {
  const badGroup = sample();
  badGroup.products[0].group_id = "missing-group";
  assert.match(validateInspiration(badGroup).join("\n"), /找不到分组/);

  const badChange = sample();
  badChange.changelog[0].product_id = "missing-product";
  assert.match(validateInspiration(badChange).join("\n"), /找不到产品/);
});

test("rejects duplicate ids and pattern product_ids", () => {
  const dupProduct = sample();
  dupProduct.products.push({ ...structuredClone(dupProduct.products[0]), name: "Copy" });
  assert.match(validateInspiration(dupProduct).join("\n"), /id 重复/);

  const dupPattern = sample();
  dupPattern.patterns[0].product_ids = ["sample-product", "sample-product"];
  assert.match(validateInspiration(dupPattern).join("\n"), /不能重复/);
});

test("rejects invalid evidence, status, and non-https urls", () => {
  const evidence = sample();
  evidence.products[0].evidence = "猜测";
  assert.match(validateInspiration(evidence).join("\n"), /已打开/);

  const status = sample();
  status.products[0].status = "offline";
  assert.match(validateInspiration(status).join("\n"), /active/);

  const moduleStatus = sample();
  moduleStatus.products[0].modules[0].status = "gone";
  assert.match(validateInspiration(moduleStatus).join("\n"), /active/);

  const http = sample();
  http.products[0].sources[0].url = "http://example.com/community";
  assert.match(validateInspiration(http).join("\n"), /https/);

  const moduleHttp = sample();
  moduleHttp.products[0].modules[0].url = "http://example.com/community";
  assert.match(validateInspiration(moduleHttp).join("\n"), /https/);
});

test("rejects empty modules or sources and bad dates", () => {
  const emptyModules = sample();
  emptyModules.products[0].modules = [];
  assert.match(validateInspiration(emptyModules).join("\n"), /非空数组/);

  const emptySources = sample();
  emptySources.products[0].sources = [];
  assert.match(validateInspiration(emptySources).join("\n"), /非空数组/);

  const badDate = sample();
  badDate.products[0].last_checked = "2026/11/28";
  assert.match(validateInspiration(badDate).join("\n"), /YYYY-MM-DD/);

  const badUpdated = sample();
  badUpdated.last_updated = "2026-11-28T12:51:25Z";
  assert.match(validateInspiration(badUpdated).join("\n"), /\+08:00/);
});

test("validates optional profile, examples, unconfirmed, and pattern observations", () => {
  const ok = sample();
  assert.deepEqual(validateInspiration(ok), []);

  const badExamples = sample();
  badExamples.products[0].examples = [];
  assert.match(validateInspiration(badExamples).join("\n"), /1 到 5/);

  const badExampleUrl = sample();
  badExampleUrl.products[0].examples[0].url = "http://example.com/item";
  assert.match(validateInspiration(badExampleUrl).join("\n"), /https/);

  const emptyExampleUrl = sample();
  emptyExampleUrl.products[0].examples[0].url = "";
  assert.deepEqual(validateInspiration(emptyExampleUrl), []);

  const badUnconfirmed = sample();
  badUnconfirmed.products[0].unconfirmed = [""];
  assert.match(validateInspiration(badUnconfirmed).join("\n"), /非空字符串/);

  const badObs = sample();
  badObs.patterns[0].observations = [{ product_id: "missing-product", note: "x" }];
  assert.match(validateInspiration(badObs).join("\n"), /product_ids/);

  const dupObs = sample();
  dupObs.patterns[0].observations = [
    { product_id: "sample-product", note: "a" },
    { product_id: "sample-product", note: "b" },
  ];
  assert.match(validateInspiration(dupObs).join("\n"), /不能重复/);
});

test("allows empty optional urls, empty string fields, and pre-baseline changelog dates", () => {
  const data = sample();
  data.products[0].modules[0].url = "";
  data.changelog = [
    {
      date: "2025-05-23",
      product_id: "sample-product",
      summary: "historic entry before baseline",
      source_url: "",
    },
    {
      date: "2026-11-28",
      product_id: "sample-product",
      summary: "baseline",
      source_url: "",
    },
  ];
  data.products[0].recent_updates = "";
  data.products[0].evidence_note = "";
  data.products[0].status_note = "";
  assert.deepEqual(validateInspiration(data), []);
});

test("rejects changelog out of date order", () => {
  const data = sample();
  data.changelog = [
    {
      date: "2026-11-28",
      product_id: "sample-product",
      summary: "later",
      source_url: "",
    },
    {
      date: "2026-11-01",
      product_id: "sample-product",
      summary: "earlier",
      source_url: "",
    },
  ];
  assert.match(validateInspiration(data).join("\n"), /升序/);
});

test("sample and cli both follow the contract", () => {
  assert.deepEqual(validateInspiration(sample()), []);
  const root = fileURLToPath(new URL("..", import.meta.url));
  const ok = spawnSync(process.execPath, ["scripts/validate-inspiration.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);

  const dir = mkdtempSync(join(tmpdir(), "inspiration-"));
  const file = join(dir, "inspiration.json");
  const bad = sample();
  bad.products[0].notes = "person@example.com";
  writeFileSync(file, JSON.stringify(bad));
  const failed = spawnSync(process.execPath, ["scripts/validate-inspiration.mjs", file], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /邮箱/);
});
