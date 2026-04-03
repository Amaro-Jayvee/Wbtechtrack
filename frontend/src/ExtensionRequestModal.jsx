import React, { useState, useEffect } from "react";
import "./Dashboard.css";

function ExtensionRequestModal({ taskData, requestProductId, onClose, onSuccess }) {
  const [newDeadline, setNewDeadline] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newDeadline) {
      setError("Please select a new deadline date");
      return;
    }

    const selectedDate = new Date(newDeadline);
    const today = new Date(getTodayDate());
    if (selectedDate <= today) {
      setError("New deadline must be in the future");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:8000/app/request-products/${requestProductId}/request-extension/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            new_deadline: newDeadline,
            reason: reason,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Show success toast FIRST (while modals are still visible)
        setShowSuccessMessage(true);
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        // Close modals after a delay to let user see the toast
        setTimeout(() => {
          // Close ExtensionRequestModal
          onClose();
          
          // Then call onSuccess callback to close TaskDetailModal
          onSuccess();
        }, 1500);
      } else {
        try {
          const errorData = await response.json();
          setError(errorData.detail || "Failed to request extension");
        } catch {
          // If response is not JSON, parse as text
          const errorText = await response.text();
          console.error("Non-JSON error response:", errorText);
          setError(`Error: ${response.status} - Failed to request extension`);
        }
      }
    } catch (err) {
      console.error("Error requesting extension:", err);
      setError(`Error submitting extension request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="modal-backdrop fade show" 
        style={{ 
          position: "fixed",
          zIndex: 2070,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%"
        }}
      ></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-hidden="false"
        style={{ 
          position: "fixed",
          zIndex: 2080,
          display: "block",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%"
        }}
      >
        <div className="modal-dialog modal-dialog-centered" role="document" style={{
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto"
        }}>
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light border-bottom">
              <h5 className="modal-title">
                <i className="bi bi-calendar-check me-2"></i>
                Request Deadline Extension
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close"
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{
                  backgroundColor: "#f0f7ff",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #1D6AB7"
                }}>
                  <p style={{ margin: "0", fontSize: "13px", color: "#555" }}>
                    Select the new deadline date for this task extension request.
                  </p>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-500">
                    Product: <span style={{ color: "#1D6AB7" }}>{taskData?.product_name}</span>
                  </label>
                </div>

                <div className="mb-3">
                  <label htmlFor="newDeadline" className="form-label fw-500">
                    Request Extension Until <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="newDeadline"
                    className="form-control"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    min={getTodayDate()}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="reason" className="form-label fw-500">
                    Reason for Extension (Optional)
                  </label>
                  <textarea
                    id="reason"
                    className="form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows="3"
                    placeholder="Provide a reason for requesting this extension..."
                    disabled={isSubmitting}
                  ></textarea>
                </div>

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
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ backgroundColor: "#1D6AB7", borderColor: "#1D6AB7" }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check me-1"></i>
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style>{`.modal-backdrop { position: fixed; top: 0; left: 0; z-index: 2070; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); }`}</style>
      
      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#28a745",
            color: "white",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 9999,
            animation: "slideIn 0.3s ease-in-out forwards",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontWeight: "500",
            fontSize: "14px"
          }}
        >
          <i className="bi bi-check-circle-fill"></i>
          Extension request submitted successfully!
        </div>
      )}
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default ExtensionRequestModal;
