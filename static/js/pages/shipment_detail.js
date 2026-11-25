/*
 * pages/shipment_detail.js - Detajet e nje dergese: GET /api/shipments/<id> (me historikun).
 * Admini: ndryshim, caktim te korrieri, anulim. Korrieri: ndryshim statusi.
 * Butonat qe shfaqen vijne nga fusha next_statuses e API-se.
 */
(function () {
  const user = Auth.require(["ADMIN", "COURIER"]);
  if (!user) return;

  const id = location.pathname.split("/").pop();
  const box = document.getElementById("detail");
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) {
    const back = document.getElementById("back-link");
    back.href = "/courier";
    back.innerHTML = '<i class="bi bi-arrow-left"></i> Back to my deliveries';
  }

  let shipment = null;
  let couriers = null;

  function info(label, value) {
    return `<div><div class="info-label">${label}</div><div class="info-value">${value}</div></div>`;
  }

  function actionsHtml(s) {
    const next = s.next_statuses;
    const statusButtons = next
      .filter((st) => st !== "ASSIGNED" && st !== "CANCELLED")
      .map((st) => {
        const a = STATUS_ACTION[st] || { text: UI.label(st), icon: "bi-arrow-right" };
        return `<button class="btn ${st === "FAILED" ? "btn-outline-danger" : "btn-primary"}" data-status="${st}">
          <i class="bi ${a.icon} me-1"></i>${UI.esc(a.text)}</button>`;
      }).join("");

    let admin = "";
    if (isAdmin) {
      const canAssign = next.includes("ASSIGNED");
      const canEdit = ["CREATED", "ASSIGNED"].includes(s.status);
      admin = `
        ${canAssign ? `
          <form id="assign-form" class="mb-3">
            <label class="form-label" for="assign-select">Assign to courier</label>
            <div class="d-flex gap-2">
              <select class="form-select" id="assign-select"><option value="">Loading couriers...</option></select>
              <button class="btn btn-primary" type="submit" id="assign-btn">Assign</button>
            </div>
            <div class="invalid-feedback d-block" data-for="courier"></div>
          </form>` : ""}
        <div class="d-flex flex-wrap gap-2">
          ${canEdit ? '<button class="btn btn-outline-secondary" id="btn-edit"><i class="bi bi-pencil me-1"></i>Edit details</button>' : ""}
          ${next.includes("CANCELLED") ? '<button class="btn btn-outline-danger" id="btn-cancel"><i class="bi bi-x-circle me-1"></i>Cancel shipment</button>' : ""}
        </div>`;
    }

    if (!statusButtons && !admin.replace(/<div class="d-flex flex-wrap gap-2">\s*<\/div>/, "").trim()) {
      return '<div class="text-secondary small"><i class="bi bi-lock me-1"></i>This shipment is closed. No further actions are available.</div>';
    }
    return `${statusButtons ? `<div class="d-grid gap-2 mb-3">${statusButtons}</div>` : ""}${admin}`;
  }

  function render(s) {
    shipment = s;
    const history = [...s.history].reverse();
    box.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="mono" style="font-size:1.4rem">${UI.esc(s.tracking_code)}</h1>
          <p>Created ${UI.date(s.created_at)}</p>
        </div>
        ${UI.badge(s.status, true)}
      </div>
      <div class="row g-3">
        <div class="col-lg-8 d-flex flex-column gap-3">
          <div class="card">
            <div class="card-header-x"><h2 class="card-title-x">Shipment details</h2></div>
            <div class="card-body"><div class="info-grid">
              ${info("Sender", `${UI.esc(s.sender_name)}<div><a href="tel:${UI.esc(s.sender_phone)}" class="text-secondary">${UI.esc(s.sender_phone)}</a></div>`)}
              ${info("Recipient", `${UI.esc(s.receiver_name)}<div><a href="tel:${UI.esc(s.receiver_phone)}" class="text-secondary">${UI.esc(s.receiver_phone)}</a></div>`)}
              ${info("Pickup address", UI.esc(s.pickup_address))}
              ${info("Delivery address", `${UI.esc(s.delivery_address)}, ${UI.esc(s.city)}`)}
              ${info("Weight / Price", `${UI.esc(s.weight_kg)} kg · ${UI.money(s.price)}`)}
              ${info("Courier", s.courier_name
                ? `<div class="d-flex align-items-center gap-2"><span class="avatar">${UI.esc(UI.initials(s.courier_name))}</span>${UI.esc(s.courier_name)}</div>`
                : '<span class="text-secondary">Unassigned</span>')}
            </div></div>
          </div>
          <div class="card">
            <div class="card-header-x"><h2 class="card-title-x">Status history</h2></div>
            <div class="card-body">
              <ul class="timeline">${history.map((h, i) => `
                <li class="${i === 0 ? "current" : ""}">
                  <div class="t-title">${UI.esc(UI.label(h.status))}</div>
                  <div class="t-meta">${UI.date(h.changed_at)}${h.changed_by ? " · by " + UI.esc(h.changed_by) : ""}</div>
                  ${h.note ? `<div class="t-note">${UI.esc(h.note)}</div>` : ""}
                </li>`).join("")}</ul>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header-x"><h2 class="card-title-x">Actions</h2></div>
            <div class="card-body">${actionsHtml(s)}</div>
          </div>
        </div>
      </div>`;
    bindActions();
  }

  async function fillCouriers() {
    const select = document.getElementById("assign-select");
    if (!select) return;
    try {
      couriers = couriers || (await Api.couriers()).results.filter((c) => c.is_active);
      select.innerHTML = '<option value="">Select a courier...</option>' +
        couriers.map((c) => `<option value="${c.id}">${UI.esc(c.first_name)} ${UI.esc(c.last_name)}</option>`).join("");
    } catch (err) {
      select.innerHTML = '<option value="">Could not load couriers</option>';
    }
  }

  function bindActions() {
    box.querySelectorAll("button[data-status]").forEach((b) =>
      b.addEventListener("click", () => StatusAction.open(shipment, b.dataset.status, afterChange("Status updated."))));

    const cancelBtn = document.getElementById("btn-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", () =>
      StatusAction.open(shipment, "CANCELLED", afterChange("Shipment cancelled.")));

    const editBtn = document.getElementById("btn-edit");
    if (editBtn) editBtn.addEventListener("click", () =>
      ShipmentForm.open({ shipment, saved: afterChange("Changes saved.") }));

    const assignForm = document.getElementById("assign-form");
    if (assignForm) {
      fillCouriers();
      assignForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        UI.clearFieldErrors(assignForm);
        const select = document.getElementById("assign-select");
        const feedback = assignForm.querySelector('[data-for="courier"]');
        if (!select.value) {
          select.classList.add("is-invalid");
          feedback.textContent = "Please select a courier.";
          return;
        }
        const btn = document.getElementById("assign-btn");
        UI.busy(btn, true, "Assigning...");
        try {
          afterChange("Shipment assigned.")(await Api.assignCourier(shipment.id, Number(select.value)));
        } catch (err) {
          UI.busy(btn, false);
          feedback.textContent = err.message;
        }
      });
    }
  }

  // Pas cdo veprimi, faqja rindertohet me pergjigjen e API-se (jo me supozime).
  function afterChange(message) {
    return (updated) => { render(updated); UI.toast(message); };
  }

  async function load() {
    box.innerHTML = '<div class="card"></div>';
    const card = box.firstChild;
    UI.loading(card, "Loading shipment...");
    try {
      render(await Api.getShipment(id));
    } catch (err) {
      if (err.status === 404) UI.empty(card, "Shipment not found", "It may have been removed or the link is incorrect.", "bi-search");
      else if (err.status === 403) UI.error(card, { ...err, message: "This shipment is not assigned to you." });
      else UI.error(card, err, load);
    }
  }

  load();
})();
