/*
 * pages/track.js - Gjurmimi publik (pa login). GET /api/track/<kodi>
 * Klienti sheh vetem statusin, qytetin dhe historikun, pa te dhena personale.
 * Faqja perdor vetem te dhenat qe kthen API: tracking_code, status, city,
 * created_at dhe history (status, note, changed_at).
 */
(function () {
  const form = document.getElementById("track-form");
  const input = document.getElementById("code");
  const btn = document.getElementById("track-btn");
  const result = document.getElementById("track-result");

  // Nese perdoruesi eshte i kyçur, butoni lart e con ne faqen e tij.
  const user = Auth.getUser();
  const signin = document.getElementById("public-signin");
  if (user && signin) { signin.textContent = "Open app"; signin.href = Auth.homeFor(user); }

  const STEPS = ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];
  const CODE_RE = /^DRG-\d{4}-[0-9A-F]{6}$/;

  // Titulli dhe fjalia per klientin sipas statusit aktual.
  const HEADLINE = {
    CREATED: ["Shipment created", "We have received your shipment. A courier will be assigned soon."],
    ASSIGNED: ["Courier assigned", "A courier has been assigned and will pick up your parcel soon."],
    PICKED_UP: ["Picked up", "The courier has picked up your parcel."],
    IN_TRANSIT: ["On the way", "Your parcel is out for delivery to {city}."],
    DELIVERED: ["Delivered", "Your parcel has been delivered in {city}."],
    FAILED: ["Delivery attempt failed", "The courier could not deliver your parcel. See the note below."],
    CANCELLED: ["Cancelled", "This shipment has been cancelled."],
  };

  const dayFmt = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeFmt = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const shortFmt = (iso) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  // Progresi: secili hap merr daten kur u arrit per here te pare (nga historiku).
  function renderProgress(data) {
    const failed = data.status === "FAILED";
    const reached = failed ? STEPS.indexOf("IN_TRANSIT") : STEPS.indexOf(data.status);
    const firstTime = {};
    data.history.forEach((h) => { if (!firstTime[h.status]) firstTime[h.status] = h.changed_at; });

    return `<ol class="progress-track">${STEPS.map((s, i) => {
      let cls = i < reached || (failed && i === reached) ? "done" : i === reached ? "done current" : "";
      let label = UI.label(s);
      let when = firstTime[s];
      if (failed && i === STEPS.length - 1) { cls = "failed"; label = "Failed"; when = firstTime.FAILED; }
      return `<li class="${cls}">
        <span class="pt-bar"></span>
        <span class="pt-label">${UI.esc(label)}</span>
        <span class="pt-date">${when ? shortFmt(when) : "&nbsp;"}</span>
      </li>`;
    }).join("")}</ol>`;
  }

  // Historiku i grupuar sipas dites; nje <li> per cdo ndryshim statusi.
  function renderHistory(history) {
    const days = [];
    history.forEach((h) => {
      const day = dayFmt(h.changed_at);
      if (!days.length || days[days.length - 1].day !== day) days.push({ day, items: [] });
      days[days.length - 1].items.push(h);
    });
    let first = true;
    return days.map((d) => `
      <div class="day-group">
        <div class="day-title">${UI.esc(d.day)}</div>
        <ul class="timeline timeline-time">
          ${d.items.map((h) => {
            const li = `
            <li class="${first ? "current" : ""}${h.status === "FAILED" ? " is-failed" : ""}">
              <div class="t-time">${timeFmt(h.changed_at)}</div>
              <div class="t-body">
                <div class="t-title">${UI.esc(UI.label(h.status))}</div>
                ${h.note ? `<div class="t-note">${UI.esc(h.note)}</div>` : ""}
              </div>
            </li>`;
            first = false;
            return li;
          }).join("")}
        </ul>
      </div>`).join("");
  }

  function render(data) {
    const history = [...data.history].reverse(); // me i fundit lart
    const [title, text] = HEADLINE[data.status] || [UI.label(data.status), ""];
    const last = history.length ? history[0].changed_at : data.created_at;
    const tone = data.status === "DELIVERED" ? "ok" : data.status === "FAILED" ? "bad" : data.status === "CANCELLED" ? "muted" : "live";

    result.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card status-hero tone-${tone}">
            <div class="card-body p-4 p-md-5">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <div class="sh-eyebrow">${tone === "live" ? '<span class="live-dot"></span>' : ""}Current status</div>
                  <h2 class="sh-title">${UI.esc(title)}</h2>
                  <p class="sh-text">${UI.esc(text.replace("{city}", data.city))}</p>
                </div>
                ${UI.badge(data.status, true)}
              </div>
              <div class="sh-updated"><i class="bi bi-clock me-1"></i>Last update: ${UI.date(last)} · ${UI.ago(last)}</div>
              ${data.status === "CANCELLED" ? "" : renderProgress(data)}
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header-x"><h2 class="card-title-x">Shipment history</h2>
              <span class="text-secondary small">${history.length} update${history.length === 1 ? "" : "s"}</span></div>
            <div class="card-body p-4 pt-2">${renderHistory(history)}</div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card side-info">
            <div class="mini-map" aria-hidden="true">
              <svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
                <g class="map-roads"><path d="M-10 40 C 80 50, 160 20, 330 45"/><path d="M-10 115 C 100 100, 200 135, 330 110"/>
                  <path d="M70 -10 C 80 60, 60 100, 85 160"/><path d="M230 -10 C 215 60, 250 100, 235 160"/><path d="M-10 78 H330"/></g>
                <g class="map-roads thin"><path d="M0 18 H320 M0 135 H320 M30 0 V150 M150 0 V150 M290 0 V150"/></g>
                <g class="map-pin" transform="translate(160 75)"><circle r="20" class="pulse"/><circle r="8"/></g>
              </svg>
              <div class="mini-map-label"><i class="bi bi-geo-alt-fill me-1"></i>${UI.esc(data.city)}</div>
            </div>
            <div class="card-body p-4">
              <dl class="info-list">
                <div><dt>Tracking code</dt><dd class="mono">${UI.esc(data.tracking_code)}</dd></div>
                <div><dt>Destination</dt><dd>${UI.esc(data.city)}</dd></div>
                <div><dt>Status</dt><dd>${UI.esc(UI.label(data.status))}</dd></div>
                <div><dt>Created</dt><dd>${UI.date(data.created_at)}</dd></div>
              </dl>
              <div class="privacy-note"><i class="bi bi-shield-lock me-2"></i>For your privacy, names, phone numbers and full addresses are not shown on this page.</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function search(code) {
    UI.loading(result, "Looking up your shipment...");
    UI.busy(btn, true, "Searching...");
    try {
      const data = await Api.track(code);
      render(data);
      history.replaceState(null, "", "/track?code=" + encodeURIComponent(code));
    } catch (err) {
      result.innerHTML = '<div class="card track-state"></div>';
      if (err.status === 404) {
        UI.empty(result.firstChild, "Shipment not found", "Check that the tracking code is typed correctly.", "bi-search");
      } else {
        UI.error(result.firstChild, err, () => search(code));
      }
    } finally {
      UI.busy(btn, false);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    UI.clearFieldErrors(form);
    const code = input.value.trim().toUpperCase();
    if (!code) {
      UI.setFieldError(form, "code", "Please enter a tracking code.");
      return;
    }
    if (!CODE_RE.test(code)) {
      UI.setFieldError(form, "code", "The code must have the format DRG-2026-XXXXXX.");
      return;
    }
    search(code);
  });

  // Linku /track?code=... hap direkt rezultatin (p.sh. kur i dergohet klientit).
  const initial = new URLSearchParams(location.search).get("code");
  if (initial) {
    input.value = initial.toUpperCase();
    search(input.value);
  }
})();
