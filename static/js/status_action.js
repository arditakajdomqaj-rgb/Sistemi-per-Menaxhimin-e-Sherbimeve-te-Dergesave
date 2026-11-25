/*
 * status_action.js - Dialogu per ndryshimin e statusit dhe anulimin.
 *
 * PATCH /api/shipments/<id>/status  ose  DELETE /api/shipments/<id> (anulim).
 * Per FAILED shenimi eshte i detyrueshem (si ne backend: NOTE_REQUIRED).
 */
const StatusAction = (function () {
  const modal = new bootstrap.Modal(document.getElementById("status-modal"));
  const form = document.getElementById("status-form");
  const title = document.getElementById("status-modal-title");
  const text = document.getElementById("status-modal-text");
  const noteLabel = document.getElementById("status-note-label");
  const confirmBtn = document.getElementById("status-confirm");
  const errorBox = document.getElementById("status-form-error");

  let current = null; // { shipment, status, done }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    UI.clearFieldErrors(form);
    errorBox.classList.add("d-none");
    const note = form.note.value.trim();
    const { shipment, status, done } = current;

    if (status === "FAILED" && !note) {
      UI.setFieldError(form, "note", "Please describe why the delivery failed.");
      return;
    }

    UI.busy(confirmBtn, true, "Saving...");
    try {
      const updated = status === "CANCELLED"
        ? await Api.cancelShipment(shipment.id, note)
        : await Api.changeStatus(shipment.id, status, note);
      modal.hide();
      done(updated);
    } catch (err) {
      // P.sh. 400 INVALID_STATUS_TRANSITION nese dikush tjeter e ndryshoi ndermjet.
      errorBox.textContent = err.message;
      errorBox.classList.remove("d-none");
    } finally {
      UI.busy(confirmBtn, false);
    }
  });

  return {
    open(shipment, status, done) {
      current = { shipment, status, done };
      form.reset();
      UI.clearFieldErrors(form);
      errorBox.classList.add("d-none");
      const cancel = status === "CANCELLED";
      title.textContent = cancel ? "Cancel shipment" : (STATUS_ACTION[status] ? STATUS_ACTION[status].text : UI.label(status));
      text.innerHTML = cancel
        ? `Shipment <span class="mono">${UI.esc(shipment.tracking_code)}</span> will be cancelled. This cannot be undone.`
        : `Shipment <span class="mono">${UI.esc(shipment.tracking_code)}</span> will be updated to ${UI.badge(status)}`;
      noteLabel.textContent = status === "FAILED" ? "Reason (required)" : "Note (optional)";
      confirmBtn.className = "btn " + (cancel || status === "FAILED" ? "btn-danger" : "btn-primary");
      confirmBtn.textContent = cancel ? "Cancel shipment" : "Confirm";
      modal.show();
    },
  };
})();
