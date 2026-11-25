/*
 * layout.js - Menuja anesore (sidebar), e ndryshme per adminin dhe korrierin.
 */
(function () {
  const links = document.getElementById("nav-links");
  const userBox = document.getElementById("nav-user");
  if (!links || !userBox) return;

  const page = document.body.dataset.page;
  const user = Auth.getUser();

  const items = [];
  if (user && user.role === "ADMIN") {
    items.push({ href: "/dashboard", text: "Dashboard", icon: "bi-grid", key: "dashboard" });
    items.push({ href: "/shipments", text: "Shipments", icon: "bi-box-seam", key: "shipments" });
    items.push({ href: "/couriers", text: "Couriers", icon: "bi-people", key: "couriers" });
  } else if (user) {
    items.push({ href: "/courier", text: "My deliveries", icon: "bi-truck", key: "courier" });
  }
  items.push({ href: "/track", text: "Track shipment", icon: "bi-search", key: "track" });

  links.innerHTML = items
    .map((i) => `<li><a href="${i.href}" class="${i.key === page ? "active" : ""}">
        <i class="bi ${i.icon}"></i><span>${UI.esc(i.text)}</span></a></li>`)
    .join("");

  if (user) {
    const role = user.role === "ADMIN" ? "Administrator" : "Courier";
    userBox.innerHTML = `
      <span class="avatar">${UI.esc(UI.initials(user.first_name + " " + user.last_name))}</span>
      <div class="min-w-0"><div class="name">${UI.esc(user.first_name)} ${UI.esc(user.last_name)}</div>
        <div class="role">${role}</div></div>
      <button class="btn-icon" id="btn-logout" type="button" title="Sign out" aria-label="Sign out">
        <i class="bi bi-box-arrow-right"></i></button>`;
    document.getElementById("btn-logout").addEventListener("click", () => Auth.logout());
    document.getElementById("nav-brand").href = Auth.homeFor(user);
  }
})();
