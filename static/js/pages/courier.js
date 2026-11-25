/*
 * pages/courier.js - Faqja e korrierit (e menduar per telefon).
 * GET /api/shipments kthen vetem dergesat e ketij korrieri (filtri behet ne backend).
 * Butoni ne karte -> dialog -> PATCH /status -> karta perditesohet me pergjigjen.
 */
(function () {
  const user = Auth.require(["COURIER"]);
  if (!user) return;

  const ACTIVE = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];
  const box = document.getElementById("cards");
  let shipments = [];
  let tab = "active";

  // Lexon te gjitha faqet e listes (korrieri zakonisht ka pak dergesa).
  async function fetchAll() {
    let page = 1;
    let all = [];
    for (;;) {
      const data = await Api.listShipments({ page });
      all = all.concat(data.results);
      if (!data.next) return all;
      page += 1;
    }
  }

  function card(s) {
    const actions = s.next_statuses.filter((st) => st !== "ASSIGNED" && st !== "CANCELLED");
    return `
      <div class="card job" data-id="${s.id}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <a href="/shipments/${s.id}" class="mono text-secondary text-decoration-none">${UI.esc(s.tracking_code)}</a>
          ${UI.badge(s.status)}
        </div>
        <div class="job-name">${UI.esc(s.receiver_name)}</div>
        <div class="job-line"><i class="bi bi-geo-alt"></i><span>${UI.esc(s.delivery_address)}, ${UI.esc(s.city)}</span></div>
        <div class="job-line"><i class="bi bi-telephone"></i><a href="tel:${UI.esc(s.receiver_phone)}">${UI.esc(s.receiver_phone)}</a></div>
        <div class="job-line"><i class="bi bi-box"></i><span>${UI.esc(s.weight_kg)} kg · ${UI.money(s.price)} to collect</span></div>
        ${actions.length ? `<div class="d-grid gap-2 mt-3">${actions.map((st) => {
          const a = STATUS_ACTION[st];
          return `<button class="btn ${st === "FAILED" ? "btn-outline-danger" : "btn-primary"} btn-lg" data-status="${st}">
            <i class="bi ${a.icon} me-1"></i>${UI.esc(a.text)}</button>`;
        }).join("")}</div>` : ""}
      </div>`;
  }

  function render() {
    const active = shipments.filter((s) => ACTIVE.includes(s.status));
    const done = shipments.filter((s) => !ACTIVE.includes(s.status));
    document.querySelector('[data-count="active"]').textContent = active.length;
    document.querySelector('[data-count="done"]').textContent = done.length;

    const items = tab === "active" ? active : done;
    if (!items.length) {
      box.innerHTML = '<div class="card"></div>';
      UI.empty(box.firstChild,
        tab === "active" ? "No active deliveries" : "No completed deliveries",
        tab === "active" ? "New shipments assigned to you will appear here." : "",
        tab === "active" ? "bi-truck" : "bi-check2-circle");
      return;
    }
    box.innerHTML = items.map(card).join("");
    box.querySelectorAll(".job").forEach((el) => {
      const s = shipments.find((x) => String(x.id) === el.dataset.id);
      el.querySelectorAll("button[data-status]").forEach((b) =>
        b.addEventListener("click", () => StatusAction.open(s, b.dataset.status, (updated) => {
          // Zevendesojme dergesen me versionin qe ktheu API-ja dhe rindertojme listen.
          shipments = shipments.map((x) => (x.id === updated.id ? updated : x));
          render();
          UI.toast(`${updated.tracking_code}: ${UI.label(updated.status)}`);
        })));
    });
  }

  async function load() {
    box.innerHTML = '<div class="card"></div>';
    UI.loading(box.firstChild, "Loading your deliveries...");
    try {
      shipments = await fetchAll();
      render();
    } catch (err) {
      box.innerHTML = '<div class="card"></div>';
      UI.error(box.firstChild, err, load);
    }
  }

  document.querySelectorAll("#tabs [data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("#tabs button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      tab = b.dataset.tab;
      render();
    }));
  document.getElementById("btn-refresh").addEventListener("click", load);

  load();
})();
