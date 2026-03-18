import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "./SidebarLayout";
import { useUser } from "./UserContext.jsx";
import "./Dashboard.css";
import "./Request.css";

function RequestList() {
  const navigate = useNavigate();
  const { userData } = useUser();
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("number"); // "date", "name", "number"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isTableAnimating, setIsTableAnimating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestHasTasks, setRequestHasTasks] = useState(false);
  const [showProjectStartModal, setShowProjectStartModal] = useState(false);
  const [projectStartData, setProjectStartData] = useState({
    requestID: "",
    taskCount: 0,
    message: ""
  });
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmRequestId, setDeleteConfirmRequestId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: "", type: "success" });
    }, 3000);
  };

  useEffect(() => {
    fetchRequests();

    // Listen for restore events from Settings.jsx
    const handleRestoreEvent = () => {
      fetchRequests();
    };
    window.addEventListener('requestsUpdated', handleRestoreEvent);
    return () => window.removeEventListener('requestsUpdated', handleRestoreEvent);
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Always fetch non-archived requests only
      params.append("include_archived", "false");

      const response = await fetch(
        `/app/request/?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setLoadingMessage(`Sorting by ${newSort === "date" ? "Date" : newSort === "number" ? "Number" : "Name"}...`);
    setIsRefreshing(true);
    setCurrentPage(1); // Reset to first page when sort changes
    
    // Delay the actual sort update so table updates while popup is visible
    setTimeout(() => {
      setSortBy(newSort);
      setIsTableAnimating(true);
      setTimeout(() => setIsTableAnimating(false), 600);
    }, 150);
    
    setTimeout(() => {
      setIsRefreshing(false);
      setLoadingMessage("");
    }, 800);
  };

  const handleSortOrderChange = (e) => {
    const newOrder = e.target.value;
    setLoadingMessage(`Sorting ${newOrder === "asc" ? "Ascending" : "Descending"}...`);
    setIsRefreshing(true);
    setCurrentPage(1); // Reset to first page when sort order changes
    
    // Delay the actual sort update so table updates while popup is visible
    setTimeout(() => {
      setSortOrder(newOrder);
      setIsTableAnimating(true);
      setTimeout(() => setIsTableAnimating(false), 600);
    }, 150);
    
    setTimeout(() => {
      setIsRefreshing(false);
      setLoadingMessage("");
    }, 800);
  };

  // Use useMemo to memoize sorted requests and recalculate only when dependencies change
  const sortedRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];
    
    const sorted = [...requests];
    
    sorted.sort((a, b) => {
      let compareResult = 0;
      
      switch(sortBy) {
        case "name":
          // Sort by requester name
          const nameA = (a.requester_name || "").toLowerCase().trim();
          const nameB = (b.requester_name || "").toLowerCase().trim();
          compareResult = nameA.localeCompare(nameB);
          break;
        
        case "number":
          // Sort by RequestID (numeric)
          compareResult = parseInt(a.RequestID) - parseInt(b.RequestID);
          break;
        
        case "date":
        default:
          // Sort by created_at date
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          compareResult = dateA - dateB;
          break;
      }
      
      // Apply sort order (asc = ascending, desc = descending)
      const result = sortOrder === "asc" ? compareResult : -compareResult;
      return result;
    });
    
    return sorted;
  }, [requests, sortBy, sortOrder]);

  const handleCreateRequest = () => {
    navigate("/request");
  };

  const handleDeleteRequest = (requestId) => {
    setDeleteConfirmRequestId(requestId);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmRequestId) {
      setShowDeleteConfirmModal(false);
      await deleteRequest(deleteConfirmRequestId);
      setDeleteConfirmRequestId(null);
    }
  };

  const handleDeclineDelete = () => {
    setShowDeleteConfirmModal(false);
    setDeleteConfirmRequestId(null);
  };

  const checkIfRequestHasTasks = async (requestId) => {
    try {
      // Check if any ProductProcess tasks exist for this request's products
      const response = await fetch(
        "/app/productprocess/",
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (response.ok) {
        const tasks = await response.json();
        // Check if any task belongs to this request's products
        const requestProducts = requests
          .find(r => r.RequestID === requestId)
          ?.request_products.map(p => p.id) || [];
        
        const hasTasks = tasks.some(task => requestProducts.includes(task.request_product));
        setRequestHasTasks(hasTasks);
      }
    } catch (err) {
      console.error("Error checking tasks:", err);
      setRequestHasTasks(false);
    }
  };

  const handleViewDetails = (requestId) => {
    const request = requests.find(r => r.RequestID === requestId);
    setSelectedRequest(request);
    setRequestHasTasks(false); // Reset before checking
    checkIfRequestHasTasks(requestId);
    setShowDetailsModal(true);
  };

  const handleStartProject = async () => {
    if (!selectedRequest) return;
    
    try {
      // Close modal immediately for better UX
      setShowDetailsModal(false);
      
      // Call the new unified start-project endpoint
      const response = await fetch(
        `http://localhost:8000/app/request/${selectedRequest.RequestID}/start-project/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = data.error || "Failed to start project";
        if (data.removed_products && data.removed_products.length > 0) {
          const removedItems = data.removed_products.map(p => `${p.product_name} (qty: ${p.quantity})`).join(", ");
          errorMessage += ` - Removed: ${removedItems}`;
        }
        showToast(errorMessage, "error");
        return;
      }

      // Show success message
      const successMessage = `✓ Project started! Created ${data.tasks_created} task(s)`;
      showToast(successMessage, "success");
      
      // Hide the details modal
      setShowDetailsModal(false);
      
      // Remove the request from the list immediately
      setRequests((current) => current.filter((r) => r.RequestID !== selectedRequest.RequestID));
      setSelectedRequest(null);
      
      // Set modal data and show success modal
      setProjectStartData({
        requestID: selectedRequest.RequestID,
        taskCount: data.tasks_created,
        message: data.message
      });
      setShowProjectStartModal(true);
      
      // Refresh notifications
      window.dispatchEvent(new Event('refreshNotifications'));
      window.dispatchEvent(new Event('requestsUpdated'));
      
      // Navigate to task-status after 3 seconds
      setTimeout(() => {
        setShowProjectStartModal(false);
        navigate("/task-status");
      }, 3000);
    } catch (err) {
      console.error("Error starting project:", err);
      showToast("Failed to start project: " + err.message, "error");
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) {
      showToast("No request selected", "error");
      return;
    }

    try {
      const response = await fetch(
        `/app/request/${selectedRequest.RequestID}/archive/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancellation_reason: 'Cancelled by admin/manager' }),
        }
      );

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseErr) {
        console.error("Failed to parse response JSON:", parseErr);
        showToast("Server error: Invalid response format", "error");
        return;
      }

      if (!response.ok) {
        const errorMsg = responseData?.error || responseData?.detail || responseData?.message || "Unknown error";
        showToast(`Error cancelling request: ${errorMsg}`, "error");
        return;
      }

      showToast("✅ Purchase order cancelled successfully!", "success");
      
      // Dispatch event to notify CancelledRequests component to refresh
      window.dispatchEvent(new Event('requestCancelled'));
      
      // Remove request from list and close modal
      setRequests(requests.filter(r => r.RequestID !== selectedRequest.RequestID));
      setShowDetailsModal(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error("Error cancelling request:", err);
      showToast("Network error: " + err.message, "error");
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      const response = await fetch(
        `/app/request/${requestId}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        showToast("Request archived successfully!", "success");
        fetchRequests();
      } else {
        const errorMsg = data.error || data.detail || "Error archiving request";
        showToast(`Failed to archive: ${errorMsg}`, "error");
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, "error");
    }
  };

  return (
    <SidebarLayout>
      <div className="page-content">
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
        
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        
        @keyframes tableRowFadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Loading Popup Modal for Sort Filter */}
      {isRefreshing && (
        <div 
          style={{ 
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            zIndex: 10000
          }}
        >
          <div 
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "40px 60px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              animation: "fadeInOut 1.6s ease-in-out"
            }}
          >
            <div 
              className="spinner-border"
              style={{
                width: "50px",
                height: "50px",
                borderWidth: "4px",
                color: "#1D6AB7",
                marginBottom: "20px"
              }}
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p style={{
              fontSize: "16px",
              fontWeight: "500",
              color: "#333",
              margin: 0
            }}>
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      {/* Project Start Success Modal */}
        {showProjectStartModal && (
          <div 
            className="modal d-block"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.5)", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999
            }}
          >
            <div 
              className="modal-dialog modal-dialog-centered" 
              style={{ maxWidth: "450px" }}
            >
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-body p-5 text-center">
                  <div 
                    className="mb-4"
                    style={{
                      animation: "fadeIn 0.3s ease-in"
                    }}
                  >
                    <i className="bi bi-check-circle text-success" style={{ fontSize: "4rem" }}></i>
                  </div>
                  <h3 className="fw-bold mb-4 text-success">Project Started!</h3>
                  <div className="bg-light p-4 rounded mb-4" style={{ border: "2px solid #198754" }}>
                    <p className="text-muted small mb-2 fw-600">ISSUANCE NO.</p>
                    <p className="text-primary fw-bold" style={{ fontSize: "1.4rem" }}>#{projectStartData.requestID}</p>
                  </div>
                  <p className="text-dark mb-4" style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>{projectStartData.message}</p>
                  <p className="small text-muted">Redirecting to task status...</p>
                  <div className="mt-3">
                    <div className="spinner-border spinner-border-sm text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header with Filters and Create Button - Aligned at same level */}
        <div className="d-flex justify-content-between align-items-flex-start mb-4 gap-3" style={{ marginTop: "30px" }}>
          {/* Filter Controls Container - Left Side */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Filters & Sort Row */}
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", padding: "0", border: "none", borderRadius: "6px", backgroundColor: "transparent" }}>
              {/* Sort By Controls */}
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="filter-dropdown"
                style={{ padding: "0.375rem 0.75rem", borderRadius: "4px", border: "1px solid #ddd", background: "#fff", minWidth: "130px", fontSize: "12px" }}
              >
                <option value="date">Sort By: Date</option>
                <option value="number">Sort By: Number</option>
                <option value="name">Sort By: Name</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={handleSortOrderChange}
                className="filter-dropdown"
                style={{ padding: "0.375rem 0.75rem", borderRadius: "4px", border: "1px solid #ddd", background: "#fff", minWidth: "165px", fontSize: "12px" }}
              >
                <option value="desc">Order: Descending</option>
                <option value="asc">Order: Ascending</option>
              </select>
            </div>
          </div>

          {/* Right-side Actions: Search and Create Button */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "12px",
                minWidth: "200px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#1D6AB7"}
              onBlur={(e) => e.target.style.borderColor = "#ddd"}
            />
            
            {/* Create Request Button - Only for Admin users */}
            {userData.role !== "manager" && userData.role !== "production_manager" && (
              <button
                className="btn btn-back-to-create"
                onClick={() => navigate("/request")}
                title="Go back to Create Request"
                style={{ whiteSpace: "nowrap" }}
              >
                <i className="bi bi-plus-circle me-2"></i> Create New Request
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Issuance ID No.</th>
                  <th>Requester</th>
                  <th>Company Name</th>
                  <th>Date Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests
                  .filter((request) =>
                    searchTerm === "" ||
                    request.RequestID.toString().includes(searchTerm) ||
                    (request.requester_name && request.requester_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (request.requester_company && request.requester_company.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((request) => (
                  <tr key={request.RequestID} style={isTableAnimating ? { animation: "tableRowFadeIn 0.5s ease-out" } : {}}>
                    <td>{request.RequestID}</td>
                    <td>{request.requester_name || "N/A"}</td>
                    <td>{request.requester_company || "N/A"}</td>
                    <td>{request.created_at}</td>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() => handleViewDetails(request.RequestID)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        View Full Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {(() => {
              const filteredData = sortedRequests.filter((request) =>
                searchTerm === "" ||
                request.RequestID.toString().includes(searchTerm) ||
                (request.requester_name && request.requester_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (request.requester_company && request.requester_company.toLowerCase().includes(searchTerm.toLowerCase()))
              );
              const maxPage = Math.ceil(filteredData.length / itemsPerPage);
              
              return maxPage > 1 ? (
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "20px",
                  padding: "15px",
                  borderTop: "1px solid #e0e0e0",
                  flexWrap: "wrap"
                }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 10px",
                      border: currentPage === 1 ? "1px solid #ddd" : "1px solid #1D6AB7",
                      backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                      color: currentPage === 1 ? "#999" : "#1D6AB7",
                      borderRadius: "4px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "12px"
                    }}
                  >
                    ◀◀ First
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 10px",
                      border: currentPage === 1 ? "1px solid #ddd" : "1px solid #1D6AB7",
                      backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                      color: currentPage === 1 ? "#999" : "#1D6AB7",
                      borderRadius: "4px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "12px"
                    }}
                  >
                    ◀ Previous
                  </button>

                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {Array.from({ length: maxPage }, (_, i) => i + 1)
                      .filter(page => {
                        if (maxPage <= 5) return true;
                        if (page === 1 || page === maxPage) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, idx, arr) => (
                        <div key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && <span style={{ color: "#999", padding: "0 4px" }}>...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            style={{
                              padding: "6px 10px",
                              border: currentPage === page ? "1px solid #1D6AB7" : "1px solid #ddd",
                              backgroundColor: currentPage === page ? "#1D6AB7" : "#fff",
                              color: currentPage === page ? "#fff" : "#333",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontWeight: currentPage === page ? "600" : "500",
                              fontSize: "12px",
                              minWidth: "32px"
                            }}
                          >
                            {page}
                          </button>
                        </div>
                      ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))}
                    disabled={currentPage === maxPage}
                    style={{
                      padding: "6px 10px",
                      border: currentPage === maxPage ? "1px solid #ddd" : "1px solid #1D6AB7",
                      backgroundColor: currentPage === maxPage ? "#f0f0f0" : "#fff",
                      color: currentPage === maxPage ? "#999" : "#1D6AB7",
                      borderRadius: "4px",
                      cursor: currentPage === maxPage ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "12px"
                    }}
                  >
                    Next ▶
                  </button>

                  <button
                    onClick={() => setCurrentPage(maxPage)}
                    disabled={currentPage === maxPage}
                    style={{
                      padding: "6px 10px",
                      border: currentPage === maxPage ? "1px solid #ddd" : "1px solid #1D6AB7",
                      backgroundColor: currentPage === maxPage ? "#f0f0f0" : "#fff",
                      color: currentPage === maxPage ? "#999" : "#1D6AB7",
                      borderRadius: "4px",
                      cursor: currentPage === maxPage ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "12px"
                    }}
                  >
                    Last ▶▶
                  </button>

                  <span style={{ color: "#666", fontSize: "12px", marginLeft: "10px" }}>
                    Page {currentPage} of {maxPage}
                  </span>
                </div>
              ) : null;
            })()}
          </>
        )}

        {!loading && requests.length === 0 && (
          <div className="no-data">No requests found.</div>
        )}

        {/* Request Details Modal - Production Manager Style */}
        {showDetailsModal && selectedRequest && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setShowDetailsModal(false)}>
            <div className="modal-dialog" style={{ backgroundColor: "white", borderRadius: "8px", maxWidth: "600px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="modal-header" style={{ backgroundColor: "#9BC284", padding: "1.5rem", borderBottom: "2px solid #fff", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "1rem" }}>
                <h5 className="modal-title" style={{ color: "white", marginBottom: 0, flex: 1, fontSize: "0.6rem", fontWeight: "600" }}>ISSUANCE #{selectedRequest.RequestID}</h5>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
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

              {/* Body */}
              <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
                {/* Customer Information */}
                <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #dee2e6" }}>
                  <h6 style={{ marginBottom: "1rem", color: "#333", fontSize: "0.95rem", fontWeight: "600" }}>Customer Information</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Name:</label>
                      <p style={{ margin: 0, color: "#333" }}>{selectedRequest.requester_name || "N/A"}</p>
                    </div>
                    <div>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Company:</label>
                      <p style={{ margin: 0, color: "#333" }}>{selectedRequest.requester_company || "N/A"}</p>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontWeight: "600", color: "#666", display: "block", marginBottom: "0.25rem" }}>Date Created:</label>
                      <p style={{ margin: 0, color: "#333" }}>{selectedRequest.created_at || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #dee2e6" }}>
                  <h6 style={{ marginBottom: "1rem", color: "#333", fontSize: "0.95rem", fontWeight: "600" }}>
                    Products ({selectedRequest.request_products?.length || 0})
                  </h6>
                  {!selectedRequest.request_products || selectedRequest.request_products.length === 0 ? (
                    <p style={{ fontSize: "0.9rem", color: "#999", margin: 0 }}>No products</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {selectedRequest.request_products.map((product, idx) => (
                        <div key={idx} style={{ borderLeft: "3px solid #9BC284", paddingLeft: "1rem", paddingRight: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: "0.95rem", color: "#333" }}>{product.product_name || "N/A"}</strong>
                            <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "600" }}>Qty: {product.quantity || 0}</span>
                          </div>
                          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
                            <strong>Deadline:</strong> {product.deadline || "N/A"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ backgroundColor: "#f8f9fa", padding: "1rem", borderTop: "2px solid #dee2e6", display: "flex", gap: "1.25rem", justifyContent: "space-between", alignItems: "center", position: "sticky", bottom: 0, zIndex: 999, flexShrink: 0 }}>
                {userData.role === "production_manager" && (
                  <button 
                    className="btn"
                    onClick={handleStartProject}
                    disabled={requestHasTasks}
                    style={{
                      minWidth: "160px",
                      padding: "0.65rem 1rem",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: requestHasTasks ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                      opacity: requestHasTasks ? 0.7 : 1
                    }}
                    title={requestHasTasks ? "This project has already been started" : "Start the project"}
                  >
                    {requestHasTasks ? "✓ Project Started" : "Start Project"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="btn"
                  style={{
                    minWidth: "160px",
                    marginLeft: "auto",
                    padding: "0.65rem 1rem",
                    backgroundColor: "#EF4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#DC2626"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#EF4444"}
                  aria-label="Cancel order"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Toast Notification */}
        {toast.visible && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: toast.type === "success" ? "#d4edda" : "#f8d7da",
              color: toast.type === "success" ? "#155724" : "#721c24",
              border: `1px solid ${toast.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
              borderRadius: "4px",
              padding: "12px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: "slideIn 0.3s ease-out"
            }}
          >
            <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`}></i>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div 
            className="modal d-block"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.5)", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              zIndex: 1050
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ zIndex: 1060 }}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-light border-bottom">
                  <h5 className="modal-title">
                    <i className="bi bi-exclamation-circle-fill text-warning me-2"></i>
                    Archive Request
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleDeclineDelete}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-0 text-muted">
                    Are you sure you want to archive this request? It will be moved to archived requests and can be accessed from the archive section.
                  </p>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDeclineDelete}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={handleConfirmDelete}
                  >
                    Archive Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

export default RequestList;
