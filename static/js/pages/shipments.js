/*
 * pages/shipments.js - Lista e dergesave (admin): GET /api/shipments me filtra dhe faqezim.
 * Filtrat ruhen ne URL (?status=...&page=2), keshtu faqja mund te rifreskohet
 * ose te ndahet si link dhe tregon te njejtat rezultate.
 */
(function () {
  const user = Auth.require(["ADMIN"]);
  if (!user) return;

  const list = document.getElementById("list");
  const filters = document.getElementById("filters");
  const statusSelect = document.getElementById("flt-status");
  const KEYS = ["search", "status", "courier", "city", "date_from", "date_to"];

  const courierSelect = document.getElementById("flt-courier");

  // Lista e korriereve per filtrin (edhe ata jo aktive, sepse kane dergesa te vjetra).
  async function loadCouriers() {
    try {
      const data = await Api.couriers();
      data.results.forEach((c) => courierSelect.insertAdjacentHTML("beforeend",
        `<option value="${c.id}">${UI.esc(c.first_name)} ${UI.esc(c.last_name)}${c.is_active ? "" : " (inactive)"}</option>`));
    } catch (err) {
      courierSelect.disabled = true; // lista funksionon edhe pa kete filter
    }
  }

  Object.entries(STATUS).forEach(([key, s]) => {
    statusSelect.insertAdjacentHTML("beforeend", `<option value="${key}">${UI.esc(s.label)}</option>`);
  });

  function currentFilters() {
    const p = new URLSearchParams(location.search);
    const f = { page: p.get("page") || "1" };
    KEYS.forEach((k) => (f[k] = p.get(k) || ""));
    return f;
  }

  function fillForm(f) {
    KEYS.forEach((k) => (filters.elements[k].value = f[k]));
  }

  function setUrl(f) {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v && !(k === "page" && v === "1")) p.set(k, v); });
    history.pushState(null, "", "/shipments" + (p.toString() ? "?" + p : ""));
  }

  const hasFilters = (f) => KEYS.some((k) => f[k]);

  function render(data, f) {
    if (!data.results.length) {
      UI.empty(list,
        hasFilters(f) ? "No shipments match these filters" : "No shipments yet",
        hasFilters(f) ? "Try changing or clearing the filters." : "Create the first shipment with the New shipment button.",
        hasFilters(f) ? "bi-funnel" : "bi-inbox");
      return;
    }
    const page = Number(f.page);
    const pages = Math.ceil(data.count / 20);
    const from = (page - 1) * 20 + 1;
    const to = from + data.results.length - 1;
    list.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead><tr><th>Tracking code</th><th>Recipient</th><th>City</th><th>Status</th>
            <th class="d-none d-md-table-cell">Courier</th><th class="d-none d-lg-table-cell">Created</th></tr></thead>
          <tbody>${data.results.map((r) => `
            <tr data-id="${r.id}">
              <td class="mono text-dark">${UI.esc(r.tracking_code)}</td>
              <td>${UI.esc(r.receiver_name)}</td>
              <td>${UI.esc(r.city)}</td>
              <td>${UI.badge(r.status)}</td>
              <td class="d-none d-md-table-cell">${r.courier_name
                ? `<div class="d-flex align-items-center gap-2"><span class="avatar">${UI.esc(UI.initials(r.courier_name))}</span>${UI.esc(r.courier_name)}</div>`
                : '<span class="text-secondary">Unassigned</span>'}</td>
              <td class="d-none d-lg-table-cell text-secondary">${UI.date(r.created_at)}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>
      <div class="d-flex justify-content-between align-items-center px-3 py-3 border-top">
        <span class="small text-secondary">Showing ${from}–${to} of ${data.count} · Page ${page} of ${pages}</span>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" data-page="${page - 1}" ${data.previous ? "" : "disabled"}><i class="bi bi-chevron-left"></i> Previous</button>
          <button class="btn btn-outline-secondary btn-sm" data-page="${page + 1}" ${data.next ? "" : "disabled"}>Next <i class="bi bi-chevron-right"></i></button>
        </div>
      </div>`;

    list.querySelectorAll("tr[data-id]").forEach((tr) =>
      tr.addEventListener("click", () => (location.href = `/shipments/${tr.dataset.id}`)));
    list.querySelectorAll("button[data-page]").forEach((b) =>
      b.addEventListener("click", () => { setUrl({ ...currentFilters(), page: b.dataset.page }); load(); }));
  }

  async function load() {
    const f = currentFilters();
    fillForm(f);
    UI.loading(list, "Loading shipments...");
    try {
      render(await Api.listShipments(f), f);
    } catch (err) {
      UI.error(list, err, load);
    }
  }

  filters.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = { page: "1" };
    KEYS.forEach((k) => (f[k] = filters.elements[k].value.trim()));
    setUrl(f);
    load();
  });
  document.getElementById("btn-reset").addEventListener("click", () => { setUrl({}); load(); });
  window.addEventListener("popstate", load);

  // Krijimi: pas ruajtjes, lista rifreskohet dhe dergesa e re del e para.
  function openNew() {
    ShipmentForm.open({
      saved: (shipment) => {
        UI.toast(`Shipment ${shipment.tracking_code} created.`);
        setUrl({});
        load();
      },
    });
  }
  document.getElementById("btn-new").addEventListener("click", openNew);

  loadCouriers().then(load); // korrieret ngarkohen para, qe filtri nga URL te zgjidhet sakte
  if (new URLSearchParams(location.search).get("new")) {
    history.replaceState(null, "", "/shipments");
    openNew();
  }
})();
