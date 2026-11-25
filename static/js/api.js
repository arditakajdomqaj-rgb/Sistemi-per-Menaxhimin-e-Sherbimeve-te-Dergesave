/*
 * api.js - Sherbimi qe flet me backend-in.
 *
 * Te gjitha faqet e therrasin API-n vetem permes ketij skedari.
 * Ketu behen tri gjera ne nje vend te vetem:
 *   1. shtohet token-i ne header-in Authorization,
 *   2. trajtohen gabimet e rrjetit dhe gabimet e API-se,
 *   3. nese token-i nuk vlen me (401), perdoruesi kthehet te login-i.
 */

/*
 * Mesazhet ne anglisht sipas kodit te gabimit qe kthen backend-i.
 * Backend-i (Raporti 2) kthen gjithmone nje kod te qendrueshem (p.sh. PERMISSION_DENIED);
 * nderfaqja e perkthen ate ne nje mesazh te qarte per perdoruesin.
 */
const ERROR_MESSAGES = {
  NETWORK_ERROR: "Cannot reach the server. Check your connection and try again.",
  INVALID_CREDENTIALS: "Incorrect username or password.",
  NOT_AUTHENTICATED: "Your session has expired. Please sign in again.",
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested item was not found.",
  SHIPMENT_NOT_FOUND: "No shipment found with this tracking code.",
  VALIDATION_ERROR: "Some fields are invalid. Please check the form.",
  INVALID_STATUS_TRANSITION: "This status change is not allowed from the current status.",
  INVALID_STATUS: "This status is not valid for this action.",
  NOTE_REQUIRED: "Please provide a reason for the failed delivery.",
  INVALID_COURIER: "The selected courier does not exist or is inactive.",
  INVALID_FILTER: "One of the filters has an invalid value.",
  SHIPMENT_LOCKED: "This shipment can no longer be edited because it has been picked up.",
  CANNOT_CANCEL: "Delivered or cancelled shipments cannot be cancelled.",
};

class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.code = code;        // p.sh. "PERMISSION_DENIED"
    this.status = status;    // statusi HTTP, 0 nese serveri nuk u arrit
    this.details = details;  // gabimet sipas fushave (vetem per 400)
  }
}

const Api = {
  BASE: "/api",

  async request(path, { method = "GET", body = null, auth = true } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== null) headers["Content-Type"] = "application/json";

    const token = Auth.getToken();
    if (auth && token) headers["Authorization"] = "Token " + token;

    let response;
    try {
      response = await fetch(this.BASE + path, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : null,
      });
    } catch (networkError) {
      // Serveri eshte i ndalur ose nuk ka internet.
      throw new ApiError("NETWORK_ERROR", ERROR_MESSAGES.NETWORK_ERROR, 0);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Token-i ka skaduar ose eshte fshire (logout ne nje skede tjeter).
      if (response.status === 401 && auth && token) {
        Auth.clear();
        window.location.href = "/login?expired=1";
      }
      // Backend-i kthen gjithmone: { success, error, message, details? }
      const code = (data && data.error) || "ERROR";
      throw new ApiError(
        code,
        ERROR_MESSAGES[code] || (data && data.message) || "An unexpected error occurred.",
        response.status,
        data && data.details
      );
    }
    return data;
  },

  // --- Autentikimi ---
  login(username, password) {
    return this.request("/auth/login", { method: "POST", body: { username, password }, auth: false });
  },
  logout() {
    return this.request("/auth/logout", { method: "POST" });
  },

  // --- Dergesat ---
  listShipments(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) params.append(key, value);
    });
    const query = params.toString();
    return this.request("/shipments" + (query ? "?" + query : ""));
  },
  getShipment(id) {
    return this.request(`/shipments/${id}`);
  },
  createShipment(data) {
    return this.request("/shipments", { method: "POST", body: data });
  },
  updateShipment(id, data) {
    return this.request(`/shipments/${id}`, { method: "PATCH", body: data });
  },
  cancelShipment(id, note) {
    return this.request(`/shipments/${id}`, { method: "DELETE", body: { note } });
  },
  assignCourier(id, courierId) {
    return this.request(`/shipments/${id}/assign`, { method: "PATCH", body: { courier_id: courierId } });
  },
  changeStatus(id, status, note = "") {
    return this.request(`/shipments/${id}/status`, { method: "PATCH", body: { status, note } });
  },

  // --- Te tjera ---
  track(code) {
    return this.request(`/track/${encodeURIComponent(code)}`, { auth: false });
  },
  stats() {
    return this.request("/stats");
  },
  // --- Korrieret (vetem admin) ---
  couriers() {
    return this.request("/couriers");
  },
  createCourier(data) {
    return this.request("/couriers", { method: "POST", body: data });
  },
  updateCourier(id, data) {
    return this.request(`/couriers/${id}`, { method: "PATCH", body: data });
  },
};
