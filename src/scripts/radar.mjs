import { classifyEvent } from "../lib/classify.mjs";

const ALLOWED = {
  when: ["all", "upcoming", "past"],
  price: ["all", "free", "paid"],
  replay: ["all", "upcoming", "awaiting_replay", "replay_available", "no_replay"],
};

export function initRadar() {
  try {
    mountRadar();
  } catch (error) {
    console.error(error);
  }
}

function mountRadar() {
  const groups = document.querySelector("#groups");
  if (!groups) return;

  const cards = [...document.querySelectorAll("article.card")].map((card) => ({
    card,
    price: card.dataset.price,
    replay: card.dataset.replay,
    search: (card.dataset.search || "").toLowerCase(),
    title: card.dataset.title || "",
    schedule: JSON.parse(card.dataset.schedule),
  }));

  let state = readState();

  document.querySelector(".toolbar")?.addEventListener("click", (event) => {
    const choice = event.target.closest("button[data-group]");
    if (choice) {
      state = { ...state, [choice.dataset.group]: choice.dataset.value };
      apply();
      return;
    }
    if (event.target.closest("#clear")) {
      state = { when: "all", price: "all", replay: "all", q: "" };
      apply();
    }
  });

  document.querySelector("#q")?.addEventListener("input", (event) => {
    state = { ...state, q: event.target.value };
    apply();
  });

  apply();

  function apply() {
    const now = new Date();
    const buckets = { upcoming: [], past: [] };
    for (const item of cards) {
      const classified = classifyEvent(item.schedule, now);
      item.group = classified.group;
      item.sortKey = classified.sortKey;
      buckets[item.group].push(item);
    }
    buckets.upcoming.sort(compareUpcoming);
    buckets.past.sort(comparePast);
    document.querySelector("#upcoming-list")?.append(...buckets.upcoming.map((item) => item.card));
    document.querySelector("#past-list")?.append(...buckets.past.map((item) => item.card));

    let shownUpcoming = 0;
    let shownPast = 0;
    for (const item of cards) {
      const visible = isVisible(item, state);
      item.card.hidden = !visible;
      item.card.classList.toggle("is-upcoming", item.group === "upcoming");
      item.card.classList.toggle("is-past", item.group === "past");
      if (!visible) continue;
      if (item.group === "upcoming") shownUpcoming += 1;
      else shownPast += 1;
    }

    const upcomingSection = document.querySelector("#upcoming");
    const pastSection = document.querySelector("#past");
    const empty = document.querySelector("#empty");
    if (upcomingSection) upcomingSection.hidden = shownUpcoming === 0;
    if (pastSection) pastSection.hidden = shownPast === 0;
    if (empty) empty.hidden = shownUpcoming + shownPast > 0;

    const upcomingCount = document.querySelector("#upcoming-count");
    const pastCount = document.querySelector("#past-count");
    if (upcomingCount) upcomingCount.textContent = String(shownUpcoming);
    if (pastCount) pastCount.textContent = String(shownPast);

    const summary = document.querySelector("#summary");
    if (summary) {
      const shown = shownUpcoming + shownPast;
      summary.textContent = isDefault(state)
        ? `共 ${cards.length} 场 · 即将开始 ${shownUpcoming} · 已结束 ${shownPast}`
        : `显示 ${shown} 场 · 即将开始 ${shownUpcoming} · 已结束 ${shownPast}`;
    }

    for (const button of document.querySelectorAll("button[data-group]")) {
      button.setAttribute("aria-pressed", state[button.dataset.group] === button.dataset.value ? "true" : "false");
    }
    const input = document.querySelector("#q");
    if (input && input.value !== state.q) input.value = state.q;
    const clear = document.querySelector("#clear");
    if (clear) clear.hidden = isDefault(state);
    writeState(state);
  }
}

function readState() {
  const params = new URLSearchParams(location.search);
  const q = params.get("q") || "";
  return {
    when: pick("when", params.get("when")),
    price: pick("price", params.get("price")),
    replay: pick("replay", params.get("replay")),
    q,
  };
}

function pick(group, value) {
  return ALLOWED[group].includes(value) ? value : "all";
}

function isDefault(state) {
  return state.when === "all" && state.price === "all" && state.replay === "all" && state.q.trim() === "";
}

function isVisible(item, state) {
  if (state.when !== "all" && item.group !== state.when) return false;
  if (state.price !== "all" && item.price !== state.price) return false;
  if (state.replay !== "all" && item.replay !== state.replay) return false;
  const tokens = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.every((token) => item.search.includes(token));
}

function compareUpcoming(a, b) {
  return a.sortKey - b.sortKey || a.title.localeCompare(b.title, "en");
}

function comparePast(a, b) {
  return b.sortKey - a.sortKey || a.title.localeCompare(b.title, "en");
}

function writeState(state) {
  const params = new URLSearchParams();
  if (state.when !== "all") params.set("when", state.when);
  if (state.price !== "all") params.set("price", state.price);
  if (state.replay !== "all") params.set("replay", state.replay);
  if (state.q.trim()) params.set("q", state.q.trim());
  const query = params.toString();
  const next = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next !== current) history.replaceState(null, "", next);
}
