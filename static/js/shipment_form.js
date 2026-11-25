/*
 * shipment_form.js - Forma e dergeses (krijim dhe ndryshim).
 *
 * Validimi behet ne dy vende:
 *   1. ne browser (ketu): pergjigje e menjehershme, pa kerkese te panevojshme;
 *   2. ne backend (serializers.py): validimi i vertete. Nese ai refuzon,
 *      gabimet e tij (details) shfaqen poshte fushes perkatese.
 */
const ShipmentForm = (function () {
  const FIELDS = [
    "sender_name", "sender_phone", "pickup_address",
    "receiver_name", "receiver_phone", "delivery_address", "city",
    "weight_kg", "price",
  ];
  const PHONE_RE = /^\+?[0-9 ]{8,15}$/; // i njejti rregull si ne backend

  const modalEl = document.getElementById("shipment-modal");
  const form = document.getElementById("shipment-form");
  const title = document.getElementById("shipment-modal-title");
  const saveBtn = document.getElementById("shipment-save");
  const errorBox = document.getElementById("shipment-form-error");
  const modal = new bootstrap.Modal(modalEl);

  let editing = null;    // dergesa qe po ndryshohet, ose null per krijim
  let onSaved = null;    // callback pas ruajtjes

  function readForm() {
    const data = {};
    FIELDS.forEach((f) => (data[f] = form.elements[f].value.trim()));
    return data;
  }

  function validate(data) {
    const errors = {};
    FIELDS.forEach((f) => { if (!data[f]) errors[f] = "This field is required."; });
    ["sender_phone", "receiver_phone"].forEach((f) => {
      if (data[f] && !PHONE_RE.test(data[f])) errors[f] = "Enter a valid phone number (8–15 digits, e.g. +383 44 123 456).";
    });
    if (data.weight_kg && !(Number(data.weight_kg) > 0)) errors.weight_kg = "Weight must be greater than 0.";
    if (data.price && !(Number(data.price) >= 0)) errors.price = "Price cannot be negative.";
    return errors;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    UI.clearFieldErrors(form);
    errorBox.classList.add("d-none");

    const data = readForm();
    const errors = validate(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([f, msg]) => UI.setFieldError(form, f, msg));
      form.querySelector(".is-invalid").focus();
      return;
    }

    UI.busy(saveBtn, true);
    try {
      const saved = editing
        ? await Api.updateShipment(editing.id, data)
        : await Api.createShipment(data);
      modal.hide();
      if (onSaved) onSaved(saved, !editing);
    } catch (err) {
      // Gabimet e fushave nga backend-i, ose nje mesazh i pergjithshem.
      if (!UI.showServerErrors(form, err.details)) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("d-none");
      }
    } finally {
      UI.busy(saveBtn, false);
    }
  });

  return {
    open({ shipment = null, saved = null } = {}) {
      editing = shipment;
      onSaved = saved;
      form.reset();
      UI.clearFieldErrors(form);
      errorBox.classList.add("d-none");
      title.textContent = shipment ? `Edit shipment ${shipment.tracking_code}` : "New shipment";
      saveBtn.textContent = shipment ? "Save changes" : "Create shipment";
      if (shipment) FIELDS.forEach((f) => (form.elements[f].value = shipment[f] ?? ""));
      modal.show();
      setTimeout(() => form.elements.sender_name.focus(), 300);
    },
  };
})();
