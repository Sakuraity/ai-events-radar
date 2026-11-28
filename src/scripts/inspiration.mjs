export function initInspiration() {
  try {
    mountInspiration();
  } catch (error) {
    console.error(error);
  }
}

function mountInspiration() {
  const groups = document.querySelector("#product-groups");
  if (!groups) return;

  const cards = [...document.querySelectorAll("article.product-card")].map((card) => ({
    card,
    group: card.dataset.group || "",
    status: card.dataset.status || "",
    name: card.dataset.name || "",
    search: (card.dataset.search || "").toLowerCase(),
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
      state = { group: "all", status: "all", q: "" };
      apply();
    }
  });

  document.querySelector("#q")?.addEventListener("input", (event) => {
    state = { ...state, q: event.target.value };
    apply();
  });

  apply();

  function apply() {
    const counts = new Map();
    let shown = 0;

    for (const item of cards) {
      const visible = isVisible(item, state);
      item.card.hidden = !visible;
      if (!visible) continue;
      shown += 1;
      counts.set(item.group, (counts.get(item.group) || 0) + 1);
    }

    for (const section of document.querySelectorAll(".product-group")) {
      const id = section.dataset.groupId;
      const count = counts.get(id) || 0;
      section.hidden = count === 0;
      const badge = section.querySelector(".count");
      if (badge) badge.textContent = String(count);
    }

    const empty = document.querySelector("#empty");
    if (empty) empty.hidden = shown > 0;

    const summary = document.querySelector("#summary");
    if (summary) {
      summary.textContent = isDefault(state)
        ? `共 ${cards.length} 个产品`
        : `显示 ${shown} / ${cards.length} 个产品`;
    }

    for (const button of document.querySelectorAll("button[data-group]")) {
      const pressed = state[button.dataset.group] === button.dataset.value;
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
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
  return {
    group: pick("group", params.get("group")),
    status: pick("status", params.get("status")),
    q: params.get("q") || "",
  };
}

function pick(group, value) {
  const choices =
    group === "group"
      ? [...document.querySelectorAll('button[data-group="group"]')].map((button) => button.dataset.value)
      : ["all", "active", "unreachable", "changed"];
  return choices.includes(value) ? value : "all";
}

function isDefault(state) {
  return state.group === "all" && state.status === "all" && state.q.trim() === "";
}

function isVisible(item, state) {
  if (state.group !== "all" && item.group !== state.group) return false;
  if (state.status !== "all" && item.status !== state.status) return false;
  const query = state.q.trim().toLowerCase();
  if (!query) return true;
  return query.split(/\s+/).every((token) => item.search.includes(token));
}

function writeState(state) {
  const params = new URLSearchParams();
  if (state.group !== "all") params.set("group", state.group);
  if (state.status !== "all") params.set("status", state.status);
  if (state.q.trim()) params.set("q", state.q.trim());
  const query = params.toString();
  const next = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next !== current) history.replaceState(null, "", next);
}
