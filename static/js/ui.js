/*
 * ui.js - Funksione te perbashketa per pamjen.
 *
 * Statuset (emri, ikona, ngjyra), formati i datave, gjendjet
 * loading / empty / error, njoftimet (toast) dhe gabimet e validimit ne forme.
 * Teksti i nderfaqes eshte ne anglisht.
 */
const STATUS = {
  CREATED: { label: "Created", icon: "bi-file-earmark-plus" },
  ASSIGNED: { label: "Assigned", icon: "bi-person-check" },
  PICKED_UP: { label: "Picked up", icon: "bi-box-seam" },
  IN_TRANSIT: { label: "In transit", icon: "bi-truck" },
  DELIVERED: { label: "Delivered", icon: "bi-check2" },
  FAILED: { label: "Failed", icon: "bi-x-lg" },
  CANCELLED: { label: "Cancelled", icon: "bi-slash-circle" },
};

// Teksti i butonit qe kalon dergesen ne kete status.
const STATUS_ACTION = {
  PICKED_UP: { text: "Mark as picked up", icon: "bi-box-seam" },
  IN_TRANSIT: { text: "Start delivery", icon: "bi-truck" },
  DELIVERED: { text: "Mark as delivered", icon: "bi-check2-circle" },
  FAILED: { text: "Report failed delivery", icon: "bi-exclamation-circle" },
};

// Ngjyrat e statuseve per grafikun rrethor (te njejtat si pill-at ne app.css).
const STATUS_COLOR = {
  CREATED: "#71717A", ASSIGNED: "#38BDF8", PICKED_UP: "#A78BFA", IN_TRANSIT: "#E2B85C",
  DELIVERED: "#34D399", FAILED: "#F87171", CANCELLED: "#3F3F46",
};

const UI = {
  // Mbron nga XSS: te dhenat e perdoruesit nuk futen kurre si HTML.
  esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  badge(status, large = false) {
    const s = STATUS[status] || { label: status };
    return `<span class="status status-${String(status).toLowerCase()}${large ? " status-lg" : ""}">
      <span class="dot"></span>${UI.esc(s.label)}</span>`;
  },

  label(status) {
    return (STATUS[status] || { label: status }).label;
  },

  initials(name) {
    return String(name || "").trim().split(/\s+/).map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();
  },

  date(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  },

  // "5 min ago", "3 hours ago", "2 days ago"
  ago(iso) {
    const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    const units = [["day", 86400], ["hour", 3600], ["min", 60]];
    for (const [name, size] of units) {
      const n = Math.floor(sec / size);
      if (n >= 1) return `${n} ${name}${n > 1 && name !== "min" ? "s" : ""} ago`;
    }
    return "just now";
  },

  money(value) {
    return "€" + Number(value).toFixed(2);
  },

  // --- Gjendjet e nje zone me te dhena ---
  loading(el, text = "Loading...") {
    el.innerHTML = `
      <div class="state state-loading" role="status">
        <div class="spinner-border" aria-hidden="true"></div>
        <div class="state-text mt-2">${UI.esc(text)}</div>
      </div>`;
  },

  empty(el, title, hint = "", icon = "bi-inbox") {
    el.innerHTML = `
      <div class="state state-empty">
        <div class="state-icon"><i class="bi ${icon}"></i></div>
        <div class="state-title">${UI.esc(title)}</div>
        ${hint ? `<div class="state-text">${UI.esc(hint)}</div>` : ""}
      </div>`;
  },

  error(el, err, onRetry) {
    el.innerHTML = `
      <div class="state state-error" role="alert">
        <div class="state-icon"><i class="bi bi-exclamation-triangle"></i></div>
        <div class="state-title">Something went wrong</div>
        <div class="state-text">${UI.esc(err.message)}</div>
        <div class="state-text mono mt-1">${UI.esc(err.code || "ERROR")}${err.status ? " · HTTP " + err.status : ""}</div>
        ${onRetry ? '<button type="button" class="btn btn-outline-secondary btn-sm mt-3" data-retry><i class="bi bi-arrow-clockwise me-1"></i>Try again</button>' : ""}
      </div>`;
    if (onRetry) el.querySelector("[data-retry]").addEventListener("click", onRetry);
  },

  // --- Njoftimet e shkurtra ---
  toast(message, type = "success") {
    let box = document.getElementById("toast-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast-box";
      box.className = "toast-container position-fixed bottom-0 end-0 p-3";
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.setAttribute("role", "alert");
    el.innerHTML = `<div class="d-flex"><div class="toast-body">
        <i class="bi ${type === "success" ? "bi-check-circle" : "bi-exclamation-circle"} me-2"></i>${UI.esc(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    box.appendChild(el);
    const toast = new bootstrap.Toast(el, { delay: 3500 });
    el.addEventListener("hidden.bs.toast", () => el.remove());
    toast.show();
  },

  // --- Butoni gjate nje kerkese: c'aktivizohet qe te mos klikohet dy here ---
  busy(button, isBusy, busyText = "Saving...") {
    if (isBusy) {
      button.dataset.text = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" style="width:1rem;height:1rem;color:inherit"></span>${UI.esc(busyText)}`;
    } else {
      button.disabled = false;
      if (button.dataset.text) button.innerHTML = button.dataset.text;
    }
  },

  // --- Gabimet e validimit ne forme ---
  clearFieldErrors(form) {
    form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    form.querySelectorAll(".invalid-feedback[data-for]").forEach((el) => (el.textContent = ""));
  },

  setFieldError(form, field, message) {
    const input = form.querySelector(`[name="${field}"]`);
    const feedback = form.querySelector(`.invalid-feedback[data-for="${field}"]`);
    if (input) input.classList.add("is-invalid");
    if (feedback) feedback.textContent = message;
  },

  // details vjen nga backend-i: { "weight_kg": ["..."], ... }
  showServerErrors(form, details) {
    if (!details) return false;
    let shown = false;
    Object.keys(details).forEach((field) => {
      if (form.querySelector(`[name="${field}"]`)) {
        UI.setFieldError(form, field, "Please enter a valid value.");
        shown = true;
      }
    });
    return shown;
  },
};
