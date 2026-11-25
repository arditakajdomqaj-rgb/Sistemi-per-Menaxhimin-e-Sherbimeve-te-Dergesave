/*
 * pages/login.js - Faqja e login-it.
 * Flow: perdoruesi shkruan te dhenat -> validim ne browser -> POST /api/auth/login
 *       -> token-i ruhet -> ridrejtim sipas rolit (admin: /dashboard, korrier: /courier).
 */
(function () {
  // Nese eshte i kyçur tashme, nuk ka pse ta shohe login-in.
  if (Auth.getToken() && Auth.getUser()) {
    window.location.href = Auth.homeFor(Auth.getUser());
    return;
  }

  const form = document.getElementById("login-form");
  const btn = document.getElementById("login-btn");
  const errorBox = document.getElementById("login-error");

  if (new URLSearchParams(location.search).get("expired")) {
    document.getElementById("login-info").classList.remove("d-none");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    UI.clearFieldErrors(form);
    errorBox.classList.add("d-none");

    const username = form.username.value.trim();
    const password = form.password.value;

    // 1. Validimi ne browser: nuk dergojme kerkese bosh ne server.
    let valid = true;
    if (!username) { UI.setFieldError(form, "username", "Please enter your username."); valid = false; }
    if (!password) { UI.setFieldError(form, "password", "Please enter your password."); valid = false; }
    if (!valid) return;

    // 2. Kerkesa ne API.
    UI.busy(btn, true, "Signing in...");
    try {
      const data = await Api.login(username, password);
      // 3. Ruajme token-in dhe kalojme ne faqen e rolit.
      Auth.save(data.token, data.user);
      window.location.href = Auth.homeFor(data.user);
    } catch (err) {
      // 4. Gabimi shfaqet me mesazhin sipas kodit (p.sh. INVALID_CREDENTIALS).
      errorBox.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i>${UI.esc(err.message)}`;
      errorBox.classList.remove("d-none");
      form.password.value = "";
      form.password.focus();
      UI.busy(btn, false);
    }
  });
})();
