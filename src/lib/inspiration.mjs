export const STATUS_LABELS = {
  active: "仍在",
  unreachable: "无法打开",
  changed: "有变化",
};

export const SPOTLIGHT_LABELS = {
  page_snapshot: "页面快照",
  scoring_rules: "评分规则",
  scoring_source: "评分来源",
  verification: "验证条件",
  grants: "资助规则",
  academy: "学院补充",
  observations: "初步观察",
};

export const STATUS_CLASS = {
  active: "active",
  unreachable: "unreachable",
  changed: "changed",
};

export function productMap(products) {
  return new Map(products.map((product) => [product.id, product]));
}

export function groupProducts(groups, products) {
  return groups.map((group) => ({
    ...group,
    products: products.filter((product) => product.group_id === group.id),
  }));
}

export function changelogNewestFirst(changelog) {
  return [...changelog].reverse();
}

export function formatDateZh(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function searchBlob(product) {
  const parts = [
    product.name,
    product.id,
    product.group_id,
    product.profile ?? "",
    product.placement,
    product.content_types,
    product.content_source,
    product.organization,
    product.interaction,
    product.rewards ?? "",
    product.conversion,
    product.scale ?? "",
    product.update_cadence ?? "",
    product.recent_updates,
    product.evidence,
    product.evidence_note,
    product.status,
    product.status_note,
    product.notes ?? "",
    ...(product.unconfirmed ?? []),
    ...product.modules.flatMap((module) => [
      module.name,
      module.kind,
      module.url,
      module.status,
      module.status_note ?? "",
    ]),
    ...product.sources.flatMap((source) => [source.label, source.url]),
    ...(product.examples ?? []).flatMap((example) => [
      example.title,
      example.url ?? "",
      example.note ?? "",
    ]),
  ];
  if (product.spotlight) {
    for (const [key, value] of Object.entries(product.spotlight)) {
      if (typeof value === "string") parts.push(value);
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") parts.push(item);
          else if (item && typeof item === "object") {
            parts.push(...Object.values(item).map(String));
          }
        }
      }
    }
  }
  return parts.join("\n").toLowerCase();
}
