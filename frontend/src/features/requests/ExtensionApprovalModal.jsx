import React, { useState } from "react";
import "../../features/dashboard/Dashboard.css";

function ExtensionApprovalModal({ notification, onClose, onSuccess }) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [selectedAction, setSelectedAction] = useState(null);

  const actionData = notification.action_data || {};
  const requestProductId = actionData.request_product_id;
  const newDeadline = actionData.new_deadline;
  const extensionReason = actionData.reason;

  const handleApprove = async () => {
    setIsApproving(true);
    setError("");
    try {
      const response = await fetch(
        `/app/request-products/${requestProductId}/approve-extension/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_product_id: requestProductId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to approve extension");
      }
    } catch (err) {
      console.error("Error approving extension:", err);
      setError("Error approving extension");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setIsRejecting(true);
    setError("");
    try {
      const response = await fetch(
        `/app/request-products/${requestProductId}/reject-extension/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_product_id: requestProductId,
            rejection_reason: rejectionReason,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to reject extension");
      }
    } catch (err) {
      console.error("Error rejecting extension:", err);
      setError("Error rejecting extension");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-hidden="false"
        style={{ zIndex: 1060 }}
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light border-bottom">
              <h5 className="modal-title">
                <i className="bi bi-calendar-check me-2"></i>
                Extension Request Review
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isApproving || isRejecting}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  backgroundColor: "#f0f7ff",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #1D6AB7",
                }}
              >
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>
                  <strong>Product:</strong> {notification.message.split("Extension Request for ")[1]?.split(",")[0] || "N/A"}
                </p>
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>
                  <strong>Requested New Deadline:</strong>{" "}
                  <span style={{ color: "#1D6AB7", fontWeight: "600" }}>{newDeadline}</span>
                </p>
                {extensionReason && (
                  <p style={{ margin: "0", fontSize: "13px", color: "#666" }}>
                    <strong>Reason:</strong> {extensionReason}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#333", fontWeight: "500" }}>
                  Do you want to accept this deadline extension?
                </p>
              </div>

              {selectedAction === "reject" && (
                <div className="mb-3">
                  <label htmlFor="rejectionReason" className="form-label fw-500 small">
                    Reason for Rejection <span style={{ color: "red" }}>*</span>
                  </label>
                  <textarea
                    id="rejectionReason"
                    className="form-control"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows="3"
                    placeholder="Explain why you're rejecting this extension..."
                    disabled={isRejecting}
                  ></textarea>
                </div>
              )}

              {error && (
                <div className="alert alert-danger mb-3" role="alert">
                  <i className="bi bi-exclamation-circle me-2"></i>
                  {error}
                </div>
              )}
            </div>

            <div className="modal-footer border-top bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isApproving || isRejecting}
              >
                Cancel
              </button>

              {selectedAction !== "reject" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setSelectedAction("reject")}
                    disabled={isApproving}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Approving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        Approve
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedAction(null)}
                    disabled={isRejecting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleReject}
                    disabled={isRejecting || !rejectionReason.trim()}
                  >
                    {isRejecting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-x-circle me-1"></i>
                        Confirm Rejection
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ExtensionApprovalModal;
