import React, { useState, useEffect } from "react";
import "./Dashboard.css";

function AdminRequestApproval() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/app/admin/pending-requests/", {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending requests");
      }

      const data = await response.json();
      setPendingRequests(data.pending_requests || []);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setMessage("❌ Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:8000/app/admin/request-details/${requestId}/`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch request details");
      }

      const data = await response.json();
      setRequestDetails(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error fetching request details:", error);
      setMessage("❌ Failed to load request details");
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setApprovalNotes("");
    setDeclineReason("");
    setMessage("");
    fetchRequestDetails(request.request_id);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedRequest(null);
    setRequestDetails(null);
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch("http://localhost:8000/app/admin/approve-request/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          request_id: selectedRequest.request_id,
          approval_notes: approvalNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to approve request");
      }

      setMessage("✓ Request approved successfully!");
      setTimeout(() => {
        handleCloseModal();
        fetchPendingRequests();
        setMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error approving request:", error);
      setMessage(`❌ ${error.message}`);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch("http://localhost:8000/app/admin/decline-request/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          request_id: selectedRequest.request_id,
          reason: declineReason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to decline request");
      }

      setMessage("✓ Request declined successfully!");
      setTimeout(() => {
        handleCloseModal();
        fetchPendingRequests();
        setMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error declining request:", error);
      setMessage(`❌ ${error.message}`);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Toast Notification */}
      {message && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: message.includes("❌") ? "#dc3545" : "#28a745",
            color: "white",
            padding: "14px 20px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 2000,
            animation: "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <span>{message}</span>
        </div>
      )}
      
      <style>{`
        @keyframes slideInRight {
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

      {/* Pending Requests Count */}
      <div style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "600", color: "#666" }}>
        Pending Requests ({pendingRequests.length})
      </div>

      {/* Table */}
      {pendingRequests.length === 0 ? (
        <div style={{
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
          border: "1px dashed #dee2e6"
        }}>
          <p style={{ color: "#999", marginBottom: 0 }}>No pending requests</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: "80px" }}>Request #</th>
              <th>Requester</th>
              <th>Company</th>
              <th style={{ textAlign: "center" }}>Products</th>
              <th>Deadline</th>
              <th>Created Date</th>
              <th style={{ textAlign: "center", width: "50px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((req) => (
              <tr key={req.request_id}>
                <td style={{ fontWeight: "600" }}>#{req.request_id}</td>
                <td>{req.requester}</td>
                <td>{req.company_name || "—"}</td>
                <td style={{ textAlign: "center" }}>{req.products_count}</td>
                <td>{req.deadline}</td>
                <td>{new Date(req.created_at).toLocaleDateString()}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    className="actions-menu-btn"
                    title="View details"
                    onClick={() => handleViewDetails(req)}
                  >
                    ⋯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && requestDetails && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="modal-dialog" style={{ backgroundColor: "white", borderRadius: "8px", maxWidth: "600px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ backgroundColor: "#9BC284", padding: "1.5rem", borderBottom: "2px solid #fff", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "1rem" }}>
              <h5 className="modal-title" style={{ color: "white", marginBottom: 0, flex: 1, fontSize: "1.25rem", fontWeight: "600" }}>ISSUANCE #{selectedRequest.request_id}</h5>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "2rem",
                  cursor: "pointer",
                  padding: "0",
                  width: "2rem",
                  height: "2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ padding: "1.5rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
                {/* Customer Information */}
                <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #dee2e6" }}>
                  <h6 style={{ marginBottom: "1rem", color: "#333", fontSize: "0.95rem", fontWeight: "600" }}>Customer Information</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Name:</label>
                      <p style={{ margin: 0, color: "#333" }}>{requestDetails.requester.username}</p>
                    </div>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Email:</label>
                      <p style={{ margin: 0, color: "#333" }}>{requestDetails.requester.email}</p>
                    </div>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Company:</label>
                      <p style={{ margin: 0, color: "#333" }}>{requestDetails.requester.company_name || "—"}</p>
                    </div>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Contact:</label>
                      <p style={{ margin: 0, color: "#333" }}>{requestDetails.requester.contact_number || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #dee2e6" }}>
                  <h6 style={{ marginBottom: "1rem", color: "#333", fontSize: "0.95rem", fontWeight: "600" }}>Request Details</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Deadline:</label>
                      <p style={{ margin: 0, color: "#333" }}>{requestDetails.deadline}</p>
                    </div>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Created:</label>
                      <p style={{ margin: 0, color: "#333" }}>{requestDetails.created_at}</p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #dee2e6" }}>
                  <h6 style={{ marginBottom: "1rem", color: "#333", fontSize: "0.95rem", fontWeight: "600" }}>Products ({requestDetails.products.length})</h6>
                  {requestDetails.products.length === 0 ? (
                    <p style={{ fontSize: "0.9rem", color: "#999", margin: 0 }}>No products</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {requestDetails.products.map((product, idx) => (
                        <div key={idx} style={{ borderLeft: "3px solid #9BC284", paddingLeft: "1rem", paddingRight: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <strong style={{ fontSize: "0.95rem", color: "#333" }}>{product.product_name}</strong>
                            <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "600" }}>Qty: {product.quantity || 0}</span>
                          </div>
                          {product.processes.length > 0 && (
                            <ul style={{ margin: "0.25rem 0 0 0", paddingLeft: "1.5rem", fontSize: "0.85rem", color: "#666" }}>
                              {product.processes.map((proc, pidx) => (
                                <li key={pidx}>
                                  {proc.process_name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Approval Notes */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.5rem" }}>Approval Notes:</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Enter approval notes (optional)"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      fontFamily: "inherit",
                      fontSize: "0.9rem",
                      minHeight: "80px",
                      resize: "none"
                    }}
                  />
                </div>

                {/* Decline Reason */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.5rem" }}>Decline Reason:</label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Enter reason for declining (required if declining)"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      fontFamily: "inherit",
                      fontSize: "0.9rem",
                      minHeight: "80px",
                      resize: "none"
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ backgroundColor: "#f8f9fa", padding: "1rem", borderTop: "2px solid #dee2e6", display: "flex", gap: "10px", justifyContent: "flex-end", position: "sticky", bottom: 0, zIndex: 999, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCloseModal}
                  disabled={isProcessing}
                  style={{ flex: "1", padding: "0.65rem 1rem", backgroundColor: "#e9ecef", color: "#333", border: "1px solid #dee2e6", borderRadius: "4px", cursor: isProcessing ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "0.9rem", opacity: isProcessing ? 0.7 : 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleDecline}
                  disabled={isProcessing || !declineReason.trim()}
                  style={{
                    flex: 1,
                    padding: "0.65rem 1rem",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isProcessing || !declineReason.trim() ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    opacity: isProcessing || !declineReason.trim() ? 0.7 : 1
                  }}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  {isProcessing ? "Processing..." : "Decline"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: "0.65rem 1rem",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    opacity: isProcessing ? 0.7 : 1
                  }}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  {isProcessing ? "Processing..." : "Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRequestApproval;
