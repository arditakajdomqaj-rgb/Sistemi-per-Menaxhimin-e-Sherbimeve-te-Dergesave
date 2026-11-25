/*
 * pages/couriers.js - Korrieret (vetem admin) - funksionaliteti F2 / KF-03 nga Raporti 1.
 *   GET   /api/couriers          lista
 *   POST  /api/couriers          shtimi i nje korrieri (password-i ruhet i hash-uar)
 *   PATCH /api/couriers/<id>     aktivizim / c'aktivizim ({ "is_active": false })
 *   GET   /api/stats             sa dergesa ka dhe sa ka dorezuar secili
 */
(function () {
  const user = Auth.require(["ADMIN"]);
  if (!user) return;

  const list = document.getElementById("list");
  const PHONE_RE = /^\+?[0-9 ]{8,15}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let couriers = [];
  let stats = {};

  // ---------- Lista ----------
  function render() {
    if (!couriers.length) {
      UI.empty(list, "No couriers yet", "Add the first courier with the Add courier button.", "bi-people");
      return;
    }
    list.innerHTML = `
      <div class="table-responsive"><table class="table">
        <thead><tr><th>Courier</th><th>Username</th><th class="d-none d-md-table-cell">Contact</th>
          <th class="text-end">Assigned</th><th class="text-end">Delivered</th><th>Status</th><th class="text-end">Actions</th></tr></thead>
        <tbody>${couriers.map((c) => {
          const name = `${c.first_name} ${c.last_name}`;
          const st = stats[c.id] || { total: 0, delivered: 0 };
          return `<tr>
            <td><div class="d-flex align-items-center gap-2"><span class="avatar">${UI.esc(UI.initials(name))}</span>
              <span class="${c.is_active ? "" : "text-secondary"}">${UI.esc(name)}</span></div></td>
            <td class="mono">${UI.esc(c.username)}</td>
            <td class="d-none d-md-table-cell small">${UI.esc(c.email)}${c.phone ? `<div class="text-secondary">${UI.esc(c.phone)}</div>` : ""}</td>
            <td class="text-end">${st.total}</td>
            <td class="text-end">${st.delivered}</td>
            <td>${c.is_active
              ? '<span class="status status-delivered"><span class="dot"></span>Active</span>'
              : '<span class="status status-cancelled"><span class="dot"></span>Inactive</span>'}</td>
            <td class="text-end text-nowrap">
              <a class="btn btn-outline-secondary btn-sm" href="/shipments?courier=${c.id}" title="View shipments"><i class="bi bi-box-seam"></i><span class="d-none d-xl-inline ms-1">Shipments</span></a>
              <button class="btn btn-outline-${c.is_active ? "danger" : "secondary"} btn-sm" data-toggle="${c.id}">
                ${c.is_active ? "Deactivate" : "Activate"}</button>
            </td></tr>`;
        }).join("")}</tbody>
      </table></div>`;
    list.querySelectorAll("[data-toggle]").forEach((b) =>
      b.addEventListener("click", () => openToggle(couriers.find((c) => String(c.id) === b.dataset.toggle))));
  }

  async function load() {
    UI.loading(list, "Loading couriers...");
    try {
      const [data, s] = await Promise.all([Api.couriers(), Api.stats()]);
      couriers = data.results;
      stats = Object.fromEntries(s.by_courier.map((c) => [c.id, c]));
      render();
    } catch (err) {
      UI.error(list, err, load);
    }
  }

  // ---------- Shtimi i korrierit ----------
  const modal = new bootstrap.Modal(document.getElementById("courier-modal"));
  const form = document.getElementById("courier-form");
  const saveBtn = document.getElementById("courier-save");
  const formError = document.getElementById("courier-form-error");
  const FIELDS = ["first_name", "last_name", "username", "phone", "email", "password"];

  function validate(d) {
    const e = {};
    ["first_name", "last_name", "username", "email", "password"].forEach((f) => { if (!d[f]) e[f] = "This field is required."; });
    if (d.username && !/^[\w.@+-]+$/.test(d.username)) e.username = "Use letters, numbers and . @ + - _ only (no spaces).";
    if (d.email && !EMAIL_RE.test(d.email)) e.email = "Enter a valid email address.";
    if (d.phone && !PHONE_RE.test(d.phone)) e.phone = "Enter a valid phone number (8–15 digits).";
    if (d.password && d.password.length < 8) e.password = "The password must have at least 8 characters.";
    return e;
  }

  // Gabimet e backend-it per fushat (p.sh. username ose email qe ekzistojne).
  const SERVER_FIELD_MESSAGES = {
    username: "This username is already taken.",
    email: "This email is already used by another account.",
    password: "The password must have at least 8 characters.",
  };

  document.getElementById("btn-add").addEventListener("click", () => {
    form.reset();
    UI.clearFieldErrors(form);
    formError.classList.add("d-none");
    modal.show();
    setTimeout(() => form.elements.first_name.focus(), 300);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    UI.clearFieldErrors(form);
    formError.classList.add("d-none");
    const d = {};
    FIELDS.forEach((f) => (d[f] = form.elements[f].value.trim()));
    d.password = form.elements.password.value; // password-i nuk shkurtohet

    const errors = validate(d);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([f, m]) => UI.setFieldError(form, f, m));
      form.querySelector(".is-invalid").focus();
      return;
    }

    UI.busy(saveBtn, true, "Adding...");
    try {
      const created = await Api.createCourier(d);
      modal.hide();
      UI.toast(`${created.first_name} ${created.last_name} was added as a courier.`);
      load();
    } catch (err) {
      if (err.details) {
        Object.keys(err.details).forEach((f) =>
          UI.setFieldError(form, f, SERVER_FIELD_MESSAGES[f] || "Please enter a valid value."));
      } else {
        formError.textContent = err.message;
        formError.classList.remove("d-none");
      }
    } finally {
      UI.busy(saveBtn, false);
    }
  });

  // ---------- Aktivizimi / c'aktivizimi ----------
  const toggleModal = new bootstrap.Modal(document.getElementById("toggle-modal"));
  const toggleBtn = document.getElementById("toggle-confirm");
  const toggleError = document.getElementById("toggle-error");
  let target = null;

  function openToggle(c) {
    target = c;
    const name = UI.esc(`${c.first_name} ${c.last_name}`);
    toggleError.classList.add("d-none");
    document.getElementById("toggle-modal-title").textContent = c.is_active ? "Deactivate courier" : "Activate courier";
    document.getElementById("toggle-modal-text").innerHTML = c.is_active
      ? `<strong>${name}</strong> will no longer be able to sign in or receive new shipments. Shipments already assigned to them are kept.`
      : `<strong>${name}</strong> will be able to sign in and receive shipments again.`;
    toggleBtn.className = "btn " + (c.is_active ? "btn-danger" : "btn-primary");
    toggleBtn.textContent = c.is_active ? "Deactivate" : "Activate";
    toggleModal.show();
  }

  toggleBtn.addEventListener("click", async () => {
    UI.busy(toggleBtn, true, "Saving...");
    try {
      const updated = await Api.updateCourier(target.id, { is_active: !target.is_active });
      couriers = couriers.map((c) => (c.id === updated.id ? updated : c));
      toggleModal.hide();
      render();
      UI.toast(`${updated.first_name} ${updated.last_name} is now ${updated.is_active ? "active" : "inactive"}.`);
    } catch (err) {
      toggleError.textContent = err.message;
      toggleError.classList.remove("d-none");
    } finally {
      UI.busy(toggleBtn, false);
    }
  });

  load();
})();
