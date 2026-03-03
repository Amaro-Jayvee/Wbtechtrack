import React, { useState, useEffect } from "react";
import "./ActivityLogsPanel.css";

function ActivityLogsPanel({ title = "Activity Logs", limit = 10 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchActivityLogs();
  }, [currentPage, startDate, endDate]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError("");
      
      const offset = currentPage * limit;
      const params = new URLSearchParams();
      params.append("limit", limit);
      params.append("offset", offset);
      
      if (startDate) {
        params.append("start_date", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
      }
      
      const response = await fetch(`/app/activity-logs/?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with logs property)
        if (Array.isArray(data)) {
          setLogs(data);
          setTotalCount(data.length);
        } else {
          setLogs(Array.isArray(data.logs) ? data.logs : []);
          setTotalCount(data.total_count || 0);
        }
      } else {
        setError("Failed to load activity logs");
        console.error("Error response:", response.status);
      }
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      setError("Error fetching activity logs");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getActionLabel = (actionType) => {
    const labels = {
      login: "Login",
      logout: "Logout",
      create: "Create",
      update: "Update",
      delete: "Delete",
      archive: "Archive",
      restore: "Restore",
      extension_request: "Extension Request",
      extension_approved: "Extension Approved",
      extension_rejected: "Extension Rejected",
      settings_update: "Settings Update",
      worker_create: "Worker Created",
      worker_update: "Worker Updated",
      worker_delete: "Worker Deleted",
      password_change: "Password Changed",
      profile_update: "Profile Updated",
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType) => {
    if (actionType.includes("create") || actionType.includes("approved")) return "#28a745";
    if (actionType.includes("delete") || actionType.includes("rejected")) return "#dc3545";
    if (actionType.includes("update")) return "#ffc107";
    if (actionType.includes("restore")) return "#17a2b8";
    return "#6c757d";
  };

  const getActionAbbreviation = (actionType) => {
    const abbr = {
      login: "L",
      logout: "LO",
      create: "C",
      update: "U",
      delete: "D",
      archive: "A",
      restore: "R",
      extension_request: "ER",
      extension_approved: "EA",
      extension_rejected: "EX",
      settings_update: "S",
      worker_create: "W",
      worker_update: "WU",
      worker_delete: "WD",
      password_change: "P",
      profile_update: "PU",
    };
    return abbr[actionType] || actionType.substring(0, 2).toUpperCase();
  };

  const getActionDescription = (log) => {
    let description = "";
    
    if (log.request && log.action_type.includes("request")) {
      description = `Request #${log.request.RequestID}`;
    }
    if (log.request_product && log.request_product.product) {
      description = `${log.request_product.product.prodName}`;
    }
    if (log.performed_by) {
      description += ` by ${log.performed_by.username}`;
    }
    
    return description || "System action";
  };

  return (
    <div className="activity-logs-panel">
      <div className="activity-logs-header">
        <h3>{title}</h3>
        <button 
          className="btn btn-sm btn-primary"
          onClick={() => {
            setCurrentPage(0);
            fetchActivityLogs();
          }}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Date Filter */}
      <div className="activity-logs-filter" style={{
        display: "flex",
        gap: "12px",
        marginBottom: "16px",
        alignItems: "center",
        flexWrap: "wrap",
        paddingBottom: "12px",
        borderBottom: "1px solid #e0e0e0"
      }}>
        <label style={{ fontWeight: "600", margin: 0, whiteSpace: "nowrap" }}>Filter by Date:</label>
        <input 
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setCurrentPage(0);
          }}
          style={{
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
          placeholder="Start Date"
        />
        <span style={{ color: "#999" }}>to</span>
        <input 
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setCurrentPage(0);
          }}
          style={{
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
          placeholder="End Date"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setCurrentPage(0);
            }}
            style={{
              padding: "6px 10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fff",
              cursor: "pointer",
              fontSize: "12px",
              color: "#666"
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-4 text-muted">
          No activity logs available
        </div>
      ) : (
        <>
          <div className="activity-logs-list">
          {logs.map((log, idx) => (
            <div key={idx} className="activity-log-item">
              <div 
                className="activity-log-icon"
                style={{ 
                  backgroundColor: getActionColor(log.action_type),
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "16px",
                }}
              >
                {getActionAbbreviation(log.action_type)}
              </div>
              <div className="activity-log-content">
                <div className="activity-log-action">
                  {getActionLabel(log.action_type)}
                </div>
                <div className="activity-log-description">
                  {getActionDescription(log)}
                </div>
                <div className="activity-log-timestamp">
                  {formatDate(log.timestamp)}
                </div>
              </div>
            </div>
          ))}
          </div>

          {/* Pagination Controls */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #e0e0e0"
          }}>
            <div style={{ fontSize: "14px", color: "#666" }}>
              Showing {currentPage * limit + 1} - {Math.min((currentPage + 1) * limit, totalCount)} of {totalCount}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0 || loading}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: currentPage === 0 ? "#f0f0f0" : "#fff",
                  cursor: currentPage === 0 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: currentPage === 0 ? "#999" : "#333"
                }}
              >
                ← Previous
              </button>
              <span style={{
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#666"
              }}>
                Page {currentPage + 1}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={(currentPage + 1) * limit >= totalCount || loading}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: (currentPage + 1) * limit >= totalCount ? "#f0f0f0" : "#fff",
                  cursor: (currentPage + 1) * limit >= totalCount ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: (currentPage + 1) * limit >= totalCount ? "#999" : "#333"
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ActivityLogsPanel;
