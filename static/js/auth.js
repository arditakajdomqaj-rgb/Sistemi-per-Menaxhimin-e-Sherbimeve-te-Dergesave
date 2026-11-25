/*
 * auth.js - Ruajtja e sesionit ne browser dhe mbrojtja e faqeve.
 *
 * Token-i dhe perdoruesi ruhen ne localStorage pas login-it.
 * Auth.require() kontrollon ne fillim te cdo faqeje nese perdoruesi
 * eshte i kyçur dhe ka rolin e duhur. Ky kontroll eshte vetem per
 * pervoje me te mire: siguria e vertete behet ne backend (401/403).
 */
const Auth = {
  TOKEN_KEY: "dergesat_token",
  USER_KEY: "dergesat_user",

  save(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  getToken() {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch (e) {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (e) {
      /* asgje */
    }
  },

  // Faqja e pare pas login-it, sipas rolit.
  homeFor(user) {
    return user && user.role === "ADMIN" ? "/dashboard" : "/courier";
  },

  // Thirret ne fillim te faqeve te mbrojtura. Kthen perdoruesin ose ridrejton.
  require(roles) {
    const user = this.getUser();
    if (!this.getToken() || !user) {
      window.location.href = "/login";
      return null;
    }
    if (roles && !roles.includes(user.role)) {
      window.location.href = this.homeFor(user);
      return null;
    }
    return user;
  },

  async logout() {
    try {
      await Api.logout(); // fshin token-in ne databaze
    } catch (e) {
      /* edhe nese deshton, e pastrojme sesionin lokal */
    }
    this.clear();
    window.location.href = "/login";
  },
};
