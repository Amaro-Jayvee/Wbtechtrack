import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "./SidebarLayout";
import "./Dashboard.css";
import "./Request.css";

function RequestList() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterArchived, setFilterArchived] = useState("false");
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [dateFilter, setDateFilter] = useState({
    created_from: "",
    created_to: "",
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests(filterArchived, dateFilter);
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/whoami/", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (data.role) {
        setUserRole(data.role);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  const fetchRequests = async (archived = "false", dateFilters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("include_archived", archived === "true");

      if (dateFilters.created_from) {
        params.append("created_from", dateFilters.created_from);
      }
      if (dateFilters.created_to) {
        params.append("created_to", dateFilters.created_to);
      }

      const response = await fetch(
        `http://localhost:8000/app/request/?${params.toString()}`,
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

  const handleFilterChange = (e) => {
    setFilterArchived(e.target.value);
    fetchRequests(e.target.value, dateFilter);
  };

  const handleDateRangeApply = () => {
    fetchRequests(filterArchived, dateFilter);
    setShowDateRangePicker(false);
  };

  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    setDateFilter({ ...dateFilter, [name]: value });
  };

  const handleCreateRequest = () => {
    navigate("/request");
  };

  const handleDeleteRequest = (requestId) => {
    if (window.confirm("Are you sure you want to delete this request?")) {
      deleteRequest(requestId);
    }
  };

  const handleViewDetails = (requestId) => {
    const request = requests.find(r => r.RequestID === requestId);
    setSelectedRequest(request);
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
        const errorMessage = data.hint ? `${data.error}\n\n${data.hint}` : data.error || "Failed to start project";
        alert(`✗ Error: ${errorMessage}`);
        return;
      }

      // Show success message
      alert("✓ Project started successfully!");
      
      // Refresh notifications
      window.dispatchEvent(new Event('refreshNotifications'));
      
      // Refresh the request list to remove the started request
      fetchRequests(filterArchived, dateFilter);
      
      // Navigate to task-status after a short delay
      setTimeout(() => {
        navigate("/task-status");
      }, 500);
    } catch (err) {
      console.error("Error starting project:", err);
      alert("✗ Failed to start project: " + err.message);
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/app/request/${requestId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        fetchRequests(filterArchived, dateFilter);
      } else {
        alert("Error deleting request");
      }
    } catch (err) {
      console.error("Error deleting request:", err);
    }
  };

  return (
    <SidebarLayout>
      <div className="page-content">
        {/* Create Request Button - Only for Admin users */}
        {userRole !== "manager" && userRole !== "production_manager" && (
          <div className="d-flex justify-content-end mb-5">
            <button
              className="btn btn-back-to-create"
              onClick={() => navigate("/request")}
              title="Go back to Create Request"
            >
              <i className="bi bi-plus-circle me-2"></i> Create New Request
            </button>
          </div>
        )}

        {/* Filter and Controls Bar */}
        <div className="filters-actions-bar">
          <div className="filters-group">
            <div className="filter-item">
              <label>Status</label>
              <select
                value={filterArchived}
                onChange={handleFilterChange}
                className="filter-dropdown"
              >
                <option value="false">Active Requests</option>
                <option value="true">Archived Requests</option>
              </select>
            </div>

            <button
              className="filter-btn-date"
              onClick={() => setShowDateRangePicker(!showDateRangePicker)}
            >
              Date Range
            </button>

            {showDateRangePicker && (
              <div className="date-range-picker-inline">
                <input
                  type="date"
                  name="created_from"
                  value={dateFilter.created_from}
                  onChange={handleDateInputChange}
                  placeholder="From"
                />
                <input
                  type="date"
                  name="created_to"
                  value={dateFilter.created_to}
                  onChange={handleDateInputChange}
                  placeholder="To"
                />
                <button
                  className="btn-primary btn-small"
                  onClick={handleDateRangeApply}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Requester</th>
                <th>Company Name</th>
                <th>Date Created</th>
                <th>Action</th>
                <th style={{ textAlign: "center", width: "50px" }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.RequestID}>
                  <td>{request.RequestID}</td>
                  <td>{request.requester_name || "N/A"}</td>
                  <td>{request.requester_company || "N/A"}</td>
                  <td>{request.created_at}</td>
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => handleViewDetails(request.RequestID)}
                    >
                      View Full Details
                    </button>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="btn-delete-action"
                      onClick={() => handleDeleteRequest(request.RequestID)}
                      title="Delete request"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && requests.length === 0 && (
          <div className="no-data">No requests found.</div>
        )}

        {/* Request Details Modal - Wireframe Style */}
        {showDetailsModal && selectedRequest && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content modal-wireframe" onClick={(e) => e.stopPropagation()}>
              {/* Header with Icon */}
              <div className="modal-header-wireframe">
                <img src="/Tools.png" alt="Tools Icon" className="modal-icon" />
                <h2 className="modal-title-wireframe">Request ID {selectedRequest.RequestID}</h2>
              </div>

              {/* Body with 2-column Layout */}
              <div className="modal-body-wireframe">
                {/* Divider after Request ID */}
                <div className="details-divider"></div>

                {/* Requester Section */}
                <div className="details-row">
                  <label className="details-label">Requester</label>
                  <span className="details-value">{selectedRequest.requester_name || "N/A"}</span>
                </div>
                <div className="details-row">
                  <label className="details-label">Company Name</label>
                  <span className="details-value">{selectedRequest.requester_company || "N/A"}</span>
                </div>
                <div className="details-row">
                  <label className="details-label">Date Created</label>
                  <span className="details-value">{selectedRequest.created_at || "N/A"}</span>
                </div>

                {/* Divider between sections */}
                <div className="details-divider"></div>

                {/* Product Section */}
                <div className="details-row">
                  <label className="details-label">Product Name</label>
                  <span className="details-value">
                    {selectedRequest.request_products && selectedRequest.request_products.length > 0
                      ? selectedRequest.request_products.map(p => p.product_name || "N/A").join(", ")
                      : "N/A"}
                  </span>
                </div>
                <div className="details-row">
                  <label className="details-label">Qty.</label>
                  <span className="details-value">
                    {selectedRequest.request_products && selectedRequest.request_products.length > 0
                      ? selectedRequest.request_products.map(p => p.quantity).join(", ")
                      : "N/A"}
                  </span>
                </div>
                <div className="details-row">
                  <label className="details-label">Deadline</label>
                  <span className="details-value">
                    {selectedRequest.request_products && selectedRequest.request_products.length > 0
                      ? selectedRequest.request_products.map(p => p.deadline_extension || "N/A").join(", ")
                      : selectedRequest.deadline || "N/A"}
                  </span>
                </div>
              </div>

              {/* Footer with Buttons */}
              <div className="modal-footer-wireframe">
                <button 
                  className="btn-start-project-simple"
                  onClick={handleStartProject}
                >
                  Start Project
                </button>
                <button 
                  className="btn-cancel-simple"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

export default RequestList;
