/*
 * pages/dashboard.js - Paneli i adminit (KF-12): GET /api/stats dhe 5 dergesat e fundit (GET /api/shipments).
 * Te dy kerkesat behen njekohesisht me Promise.all.
 */
(function () {
  const user = Auth.require(["ADMIN"]);
  if (!user) return;

  document.getElementById("dash-title").textContent = `Welcome back, ${user.first_name}!`;
  const box = document.getElementById("dash-content");

  function kpi(label, value, icon, color, note, status) {
    // Karta pa status te vetem (p.sh. "Total") hap listen e plote.
    const link = status ? `/shipments?status=${status}` : "/shipments";
    return `<div class="col-sm-6 col-xl-3"><a href="${link}" class="card kpi">
      <span class="kpi-icon ${color}"><i class="bi ${icon}"></i></span>
      <div><div class="kpi-label">${UI.esc(label)}</div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-note">${note}</div></div></a></div>`;
  }

  // Grafiku rrethor (donut) me SVG: nje rreth per cdo status, me gjatesi sipas numrit.
  function donut(byStatus, total) {
    const r = 54, c = 2 * Math.PI * r;
    let offset = 0;
    const arcs = Object.keys(STATUS).filter((k) => byStatus[k] > 0).map((k) => {
      const len = (byStatus[k] / total) * c;
      const arc = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${STATUS_COLOR[k]}" stroke-width="18"
        stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}"></circle>`;
      offset += len;
      return arc;
    }).join("");
    return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="Shipments by status">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#26262E" stroke-width="18"></circle>${arcs}</svg>
      <div class="donut-center"><div><div class="v">${total}</div><div class="l">Total</div></div></div></div>`;
  }

  function render(stats, recent) {
    const s = stats.by_status;
    const total = stats.total;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

    box.innerHTML = `
      <div class="row g-3 mb-3">
        ${kpi("Total shipments", total, "bi-box-seam", "gold", "All registered shipments")}
        ${kpi("In transit", s.IN_TRANSIT, "bi-truck", "blue", `${s.ASSIGNED + s.PICKED_UP} more assigned or picked up`, "IN_TRANSIT")}
        ${kpi("Delivered", s.DELIVERED, "bi-check2-circle", "green", `<span class="up">${pct(s.DELIVERED)}%</span> delivery rate`, "DELIVERED")}
        ${kpi("Failed", s.FAILED, "bi-exclamation-triangle", "red", "Need to be reassigned", "FAILED")}
      </div>

      <div class="row g-3">
        <div class="col-lg-6 col-xl-4">
          <div class="card h-100">
            <div class="card-header-x"><h2 class="card-title-x">Shipment overview</h2></div>
            <div class="card-body">
              ${total ? `<div class="donut-wrap">${donut(s, total)}
                <ul class="legend">${Object.keys(STATUS).map((k) => `
                  <li><a href="/shipments?status=${k}" class="d-flex align-items-center gap-2 w-100 text-reset">
                    <span class="sw" style="background:${STATUS_COLOR[k]}"></span>${UI.esc(UI.label(k))}
                    <span class="val">${s[k]}<span class="pct">(${pct(s[k])}%)</span></span></a></li>`).join("")}
                </ul></div>` : '<div class="text-secondary">No shipments yet.</div>'}
            </div>
          </div>
        </div>

        <div class="col-lg-6 col-xl-4">
          <div class="card h-100">
            <div class="card-header-x"><h2 class="card-title-x">Couriers</h2>
              <a href="/couriers" class="card-link">Manage</a></div>
            <div class="card-body">
              ${stats.by_courier.length ? stats.by_courier.map((c) => {
                const rate = c.total ? Math.round((c.delivered / c.total) * 100) : 0;
                return `<a href="/shipments?courier=${c.id}" class="d-block text-reset mb-3">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="avatar">${UI.esc(UI.initials(c.name))}</span>
                    <span class="fw-medium flex-grow-1">${UI.esc(c.name)}</span>
                    <span class="small text-secondary">${c.delivered} / ${c.total} delivered</span>
                  </div>
                  <div class="bar"><span style="width:${rate}%"></span></div></a>`;
              }).join("") : '<div class="text-secondary">No couriers yet.</div>'}
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="card h-100">
            <div class="card-header-x bordered"><h2 class="card-title-x">Recent shipments</h2>
              <a href="/shipments" class="card-link">View all</a></div>
            ${recent.length ? recent.map((r) => `
              <a href="/shipments/${r.id}" class="list-row">
                <span class="row-icon status-${r.status.toLowerCase()}"><i class="bi ${STATUS[r.status].icon}"></i></span>
                <div class="flex-grow-1 min-w-0">
                  <div class="fw-semibold small text-nowrap">${UI.esc(r.tracking_code)}</div>
                  <div class="small text-secondary text-truncate">${UI.esc(r.receiver_name)} · ${UI.esc(r.city)}</div>
                </div>
                <div class="text-end">${UI.badge(r.status)}<div class="time-ago mt-1">${UI.ago(r.created_at)}</div></div>
              </a>`).join("") : '<div class="card-body text-secondary">No shipments yet.</div>'}
          </div>
        </div>
      </div>`;
  }

  async function load() {
    box.innerHTML = '<div class="card"></div>';
    UI.loading(box.firstChild, "Loading dashboard...");
    try {
      const [stats, list] = await Promise.all([Api.stats(), Api.listShipments({ page: 1 })]);
      render(stats, list.results.slice(0, 5));
    } catch (err) {
      box.innerHTML = '<div class="card"></div>';
      UI.error(box.firstChild, err, load);
    }
  }

  load();
})();
