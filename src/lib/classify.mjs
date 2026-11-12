/**
 * 上海时间分类规则。页面和校验脚本共用。
 * 上海无夏令时，所有精确时间都带 +08:00。
 * 一场次是否已结束只看开始时间，结束时间只用于展示。
 */

export const TAG_ORDER = [
  "growth",
  "brand",
  "gtm",
  "aigc",
  "content",
  "visibility",
  "workshop",
];

export const TAG_LABELS = {
  growth: "增长",
  brand: "品牌",
  gtm: "GTM",
  aigc: "AIGC",
  content: "内容",
  visibility: "可见度",
  workshop: "研讨",
};

export const FORMAT_LABELS = {
  Workshop: "工作坊",
  "Office Hours": "在线答疑",
  Webinar: "线上讲座",
  Roundtable: "圆桌",
  Masterclass: "大师课",
};

export const REPLAY_LABELS = {
  upcoming: "尚未开始",
  awaiting_replay: "等待回放",
  replay_available: "已有回放",
  no_replay: "无回放",
};

export const LINK_GROUP_ORDER = ["event", "register", "replay", "host", "other"];

export const LINK_GROUP_LABELS = {
  event: "活动页",
  register: "报名",
  replay: "回放",
  host: "举办方",
  other: "其他",
};

export const MISSING_LABELS = {
  summary: "简介",
  host: "举办方",
  speakers: "主讲人",
  "speakers.name": "主讲人姓名",
  "speakers.title": "主讲人头衔",
  format: "形式",
  platform: "平台",
  schedule: "时间",
  "schedule.start": "开始时间",
  "schedule.end": "结束时间",
  "schedule.duration_minutes": "时长",
  links: "链接",
  price: "价格",
  "price.amount": "价格金额",
  "price.note": "价格备注",
  replay: "回放",
  "replay.channel": "回放渠道",
  "replay.url": "回放链接",
  "replay.status": "回放状态",
  notes: "备注",
};

const EARLY_LABEL = /凌晨|清晨|半夜|午夜|通宵/;

export function isEarlyLabel(label) {
  return typeof label === "string" && EARLY_LABEL.test(label);
}

export function isExactShanghaiIso(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return formatShanghaiIso(date) === value;
}

export function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function formatShanghaiIso(date) {
  const part = shanghaiParts(date);
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}:${part.second}+08:00`;
}

export function shanghaiDateString(iso) {
  return formatShanghaiIso(new Date(iso)).slice(0, 10);
}

function shanghaiParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

export function shanghaiHour(iso) {
  return Number(shanghaiParts(new Date(iso)).hour);
}

/** 用于排序的最早合理时刻。模糊时间放在当天 00:00，页面不把它显示成钟点。 */
export function sessionStartKey(session) {
  if (session.start) return Date.parse(session.start);
  return Date.parse(`${session.date}T00:00:00+08:00`);
}

/** 从此刻起，该场次视为已结束。精确时间一到点即结束；凌晨类模糊时间到当天 08:00；其他模糊时间到当天结束。 */
export function sessionPastAt(session) {
  if (session.start) return Date.parse(session.start);
  if (isEarlyLabel(session.label)) return Date.parse(`${session.date}T08:00:00+08:00`);
  return Date.parse(`${session.date}T23:59:59+08:00`);
}

export function isSessionPast(session, now) {
  return now.getTime() >= sessionPastAt(session);
}

/** 上海时间 00:00（含）到 08:00（不含），以及凌晨类模糊时间。 */
export function isSleepSession(session) {
  if (session.start) {
    const hour = shanghaiHour(session.start);
    return hour >= 0 && hour < 8;
  }
  return isEarlyLabel(session.label);
}

export function sleepCoverage(schedule) {
  const flags = schedule.map(isSleepSession);
  if (flags.every(Boolean)) return "all";
  if (flags.some(Boolean)) return "some";
  return "none";
}

export function classifyEvent(schedule, now) {
  const sessions = schedule.map((session) => ({
    startKey: sessionStartKey(session),
    past: isSessionPast(session, now),
  }));
  const future = sessions.filter((session) => !session.past);
  if (future.length > 0) {
    return {
      group: "upcoming",
      sortKey: Math.min(...future.map((session) => session.startKey)),
    };
  }
  return {
    group: "past",
    sortKey: Math.max(...sessions.map((session) => session.startKey)),
  };
}

function byTitle(a, b) {
  return a.event.title.localeCompare(b.event.title, "en");
}

export function groupEvents(events, now) {
  const upcoming = [];
  const past = [];
  for (const event of events) {
    const classified = classifyEvent(event.schedule, now);
    const item = { event, sortKey: classified.sortKey };
    if (classified.group === "upcoming") upcoming.push(item);
    else past.push(item);
  }
  upcoming.sort((a, b) => a.sortKey - b.sortKey || byTitle(a, b));
  past.sort((a, b) => b.sortKey - a.sortKey || byTitle(a, b));
  return {
    upcoming: upcoming.map((item) => item.event),
    past: past.map((item) => item.event),
  };
}

export function sessionFlags(session, schedule, now) {
  const past = isSessionPast(session, now);
  const classified = classifyEvent(schedule, now);
  const isNext =
    classified.group === "upcoming" &&
    !past &&
    sessionStartKey(session) === classified.sortKey;
  return { past, isNext };
}

export function formatSession(session) {
  const instant = session.start
    ? new Date(session.start)
    : new Date(`${session.date}T12:00:00+08:00`);
  const part = shanghaiParts(instant);
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(instant);
  const dateLine = `${part.year}年${Number(part.month)}月${Number(part.day)}日 ${weekday}`;
  const timeLine = session.start ? `${part.hour}:${part.minute}` : session.label;
  return { dateLine, timeLine, sleep: isSleepSession(session) };
}

/** 还没开始：当天写「今天」，之后写「x 天后」。开始时间一到就写「已结束」。 */
export function relativeWhen(session, now) {
  if (isSessionPast(session, now)) return "已结束";
  const today = shanghaiDateString(formatShanghaiIso(now));
  const diff = Math.round(
    (Date.parse(`${session.date}T00:00:00+08:00`) - Date.parse(`${today}T00:00:00+08:00`)) / 86400000,
  );
  if (diff <= 0) return "今天";
  return `${diff} 天后`;
}

export function formatDuration(minutes) {
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours} 小时 ${rest} 分钟`;
  if (hours > 0) return `${hours} 小时`;
  return `${minutes} 分钟`;
}

export function formatEndClock(session) {
  if (!isExactShanghaiIso(session.end)) return null;
  const part = shanghaiParts(new Date(session.end));
  const clock = `${part.hour}:${part.minute}`;
  const endDate = session.end.slice(0, 10);
  if (session.date && endDate !== session.date) {
    return `${Number(part.month)}月${Number(part.day)}日 ${clock}`;
  }
  return clock;
}

export function formatTiming(session) {
  const duration = formatDuration(session.duration_minutes);
  const end = formatEndClock(session);
  if (duration && end) return `${duration} · ${end} 结束`;
  if (duration) return duration;
  if (end) return `${end} 结束`;
  return null;
}

export function missingLabel(field) {
  return MISSING_LABELS[field] ?? field;
}

export function formatLabel(format) {
  if (!format) return null;
  return FORMAT_LABELS[format] ?? format;
}

export function formatUpdated(iso) {
  const part = shanghaiParts(new Date(iso));
  return `${part.year}年${Number(part.month)}月${Number(part.day)}日 ${part.hour}:${part.minute}（上海时间）`;
}

export function formatPrice(price) {
  if (price.type === "free") return { label: "免费", note: price.note };
  const symbols = { USD: "US$", EUR: "€", CNY: "¥", GBP: "£" };
  const symbol = symbols[price.currency];
  const amount = Number.isInteger(price.amount) ? String(price.amount) : String(price.amount);
  return {
    label: symbol ? `${symbol}${amount}` : `${amount} ${price.currency}`,
    note: price.note,
  };
}

export function searchBlob(event) {
  const price = formatPrice(event.price);
  const bits = [
    event.title,
    event.summary,
    event.host,
    event.format,
    formatLabel(event.format),
    event.platform,
    event.notes,
    event.replay?.channel,
    price.label,
    price.note,
    REPLAY_LABELS[event.replay?.status],
    ...(event.tags ?? []).flatMap((tag) => [tag, TAG_LABELS[tag] ?? ""]),
    ...(event.speakers ?? []).flatMap((speaker) => [speaker?.name, speaker?.title]),
    ...(event.links ?? []).flatMap((link) => [link?.label, LINK_GROUP_LABELS[link?.type]]),
    ...(event.missing ?? []).flatMap((field) => [field, missingLabel(field), "待补"]),
    ...(event.schedule ?? []).map((session) => session.label),
  ];
  if (Array.isArray(event.schedule) && event.schedule.length > 0 && sleepCoverage(event.schedule) !== "none") {
    bits.push("熬夜场");
  }
  return bits.filter(Boolean).join("\n").toLowerCase();
}
