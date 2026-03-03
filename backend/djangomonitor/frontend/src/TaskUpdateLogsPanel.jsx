import React, { useState, useEffect } from "react";
import "./TaskUpdateLogsPanel.css";

function TaskUpdateLogsPanel({ title = "Task Update History", limit = 30 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState(null);

  useEffect(() => {
    fetchTaskUpdateLogs();
  }, []);

  const fetchTaskUpdateLogs = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`/app/task-update-logs/?limit=${limit}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load task update logs");
        console.error("Error response:", response.status);
      }
    } catch (err) {
      console.error("Error fetching task update logs:", err);
      setError("Error fetching task update logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      const response = await fetch(`/app/task-update-logs/${logId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setLogs(logs.filter(log => log.id !== logId));
        setDeleteConfirmId(null);
      } else {
        setError("Failed to delete log");
      }
    } catch (err) {
      console.error("Error deleting log:", err);
      setError("Error deleting log");
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getActionLabel = (actionType) => {
    const labels = {
      create: "Create",
      update: "Update",
      delete: "Delete",
      worker_create: "Worker Created",
      worker_update: "Worker Updated",
      worker_delete: "Worker Deleted",
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType) => {
    if (actionType.includes("create")) return "#28a745";
    if (actionType.includes("delete")) return "#dc3545";
    if (actionType.includes("update")) return "#ffc107";
    return "#6c757d";
  };

  const getActionAbbreviation = (actionType) => {
    const abbr = {
      create: "C",
      update: "U",
      delete: "D",
      worker_create: "WC",
      worker_update: "WU",
      worker_delete: "WD",
    };
    return abbr[actionType] || actionType.substring(0, 2).toUpperCase();
  };

  const getTaskDescription = (log) => {
    let description = "";
    
    if (log.request && log.request.RequestID) {
      description += `Request #${log.request.RequestID}`;
    }
    
    if (log.request_product && log.request_product.product) {
      if (description) description += " - ";
      description += log.request_product.product.prodName || "Product";
    }
    
    return description || "Task update";
  };

  return (
    <div className="task-update-logs-panel">
      <div className="logs-header">
        <h3>{title}</h3>
        <button 
          className="btn btn-sm btn-primary"
          onClick={fetchTaskUpdateLogs}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
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
          No task updates yet
        </div>
      ) : (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Details</th>
                  <th style={{ width: "180px" }}>Date & Time</th>
                  <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} className="log-row">
                    <td>
                      <div className="task-details">
                        {getTaskDescription(log)}
                      </div>
                    </td>
                    <td>
                      <div className="timestamp">
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", position: "relative" }}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === log.id ? null : log.id)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "18px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#666",
                          fontWeight: "bold"
                        }}
                        title="More options"
                      >
                        •••
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === log.id && (
                        <div 
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: "0",
                            backgroundColor: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "130px"
                          }}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setSelectedLogDetails(log);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "10px 16px",
                              border: "none",
                              background: "transparent",
                              textAlign: "left",
                              cursor: "pointer",
                              color: "#0050b3",
                              fontSize: "14px",
                              fontWeight: "500"
                            }}
                          >
                            View
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmId !== null && (
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
                  borderRadius: "8px",
                  padding: "30px",
                  maxWidth: "400px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                  textAlign: "center"
                }}
              >
                <div style={{
                  fontSize: "48px",
                  marginBottom: "16px",
                  color: "#dc3545"
                }}>
                  ⚠️
                </div>
                <h4 style={{
                  margin: "0 0 8px 0",
                  color: "#333",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
                  Delete Log Entry
                </h4>
                <p style={{
                  color: "#666",
                  margin: "8px 0 24px 0",
                  fontSize: "14px"
                }}>
                  Are you sure you want to delete this log entry? This action cannot be undone.
                </p>
                <div style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center"
                }}>
                  <button
                    onClick={() => {
                      const id = deleteConfirmId;
                      setDeleteConfirmId(null);
                      handleDeleteLog(id);
                    }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "600",
                      minWidth: "80px"
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      background: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "600",
                      minWidth: "80px"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Details Modal */}
          {selectedLogDetails && (
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
              onClick={() => setSelectedLogDetails(null)}
            >
              <div 
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  maxWidth: "900px",
                  maxHeight: "80vh",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                  display: "flex",
                  flexDirection: "column"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{
                  padding: "24px 30px",
                  borderBottom: "2px solid #f0f0f0",
                  flexShrink: 0
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}>
                    <div>
                      <h3 style={{
                        margin: "0 0 6px 0",
                        color: "#333",
                        fontSize: "20px",
                        fontWeight: "600"
                      }}>
                        {getTaskDescription(selectedLogDetails)}
                      </h3>
                      <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>
                        {formatDate(selectedLogDetails.timestamp)} • {selectedLogDetails.performed_by?.username || "System"}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedLogDetails(null)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "28px",
                        cursor: "pointer",
                        color: "#ccc",
                        padding: 0,
                        marginTop: "-4px"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div style={{
                  padding: "24px 30px",
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0
                }}>
                  {selectedLogDetails.old_value && selectedLogDetails.new_value && (
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>📝 Changes</h4>
                      {(() => {
                        try {
                          const oldData = JSON.parse(selectedLogDetails.old_value);
                          const newData = JSON.parse(selectedLogDetails.new_value);
                          const changes = [];
                          
                          // Only track important field changes
                          const importantFields = [
                            'completed_quota',
                            'defect_count',
                            'is_completed',
                            'production_date_formatted',
                            'progress',
                            'completed_summary',
                            'overall_progress',
                            'due_date',
                            'deadline_extension',
                            'step_order',
                            'process_number',
                            'product_name'
                          ];
                          
                          importantFields.forEach(key => {
                            const oldVal = oldData[key];
                            const newVal = newData[key];
                            
                            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                              changes.push({ key, oldVal, newVal });
                            }
                          });
                          
                          if (changes.length === 0) {
                            return (
                              <div style={{ padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "6px", color: "#666", fontSize: "13px" }}>
                                No changes detected
                              </div>
                            );
                          }
                          
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {changes.map((change, idx) => {
                                const fieldName = change.key
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, c => c.toUpperCase());
                                
                                return (
                                  <div key={idx} style={{
                                    padding: "12px",
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: "6px",
                                    border: "1px solid #e9ecef",
                                    borderLeft: "4px solid #0066cc"
                                  }}>
                                    <p style={{ margin: "0 0 8px 0", color: "#495057", fontSize: "12px", fontWeight: "600" }}>
                                      {fieldName}
                                    </p>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                                      <div>
                                        <span style={{ color: "#999", fontSize: "10px", fontWeight: "600", textTransform: "uppercase" }}>Before</span>
                                        <div style={{
                                          marginTop: "4px",
                                          padding: "8px",
                                          backgroundColor: "#fff",
                                          borderRadius: "4px",
                                          border: "1px solid #f5c6cb",
                                          color: "#333",
                                          wordBreak: "break-word",
                                          minHeight: "32px",
                                          display: "flex",
                                          alignItems: "center"
                                        }}>
                                          {change.oldVal === null || change.oldVal === undefined ? '-' : String(change.oldVal)}
                                        </div>
                                      </div>
                                      <div>
                                        <span style={{ color: "#999", fontSize: "10px", fontWeight: "600", textTransform: "uppercase" }}>After</span>
                                        <div style={{
                                          marginTop: "4px",
                                          padding: "8px",
                                          backgroundColor: "#fff",
                                          borderRadius: "4px",
                                          border: "1px solid #c3e6cb",
                                          color: "#155724",
                                          wordBreak: "break-word",
                                          fontWeight: "500",
                                          minHeight: "32px",
                                          display: "flex",
                                          alignItems: "center"
                                        }}>
                                          {change.newVal === null || change.newVal === undefined ? '-' : String(change.newVal)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } catch (e) {
                          return (
                            <div style={{ padding: "12px", backgroundColor: "#ffe6e6", borderRadius: "6px", color: "#dc3545", fontSize: "12px" }}>
                              Error parsing changes: {e.message}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}

                  {(!selectedLogDetails.old_value || !selectedLogDetails.new_value) && (
                    <div>
                      <h4 style={{ margin: "0 0 12px 0", color: "#333", fontSize: "13px", fontWeight: "700", textTransform: "uppercase" }}>📋 Details</h4>
                      {(() => {
                        try {
                          let dataToDisplay = null;
                          
                          if (selectedLogDetails.old_value) {
                            dataToDisplay = JSON.parse(selectedLogDetails.old_value);
                          } else if (selectedLogDetails.new_value) {
                            dataToDisplay = JSON.parse(selectedLogDetails.new_value);
                          }
                          
                          if (!dataToDisplay) {
                            return <p style={{ color: "#999", fontSize: "12px" }}>No data available</p>;
                          }
                          
                          // Filter important fields only
                          const importantFields = [
                            'completed_quota',
                            'defect_count',
                            'is_completed',
                            'production_date_formatted',
                            'progress',
                            'completed_summary',
                            'overall_progress',
                            'due_date',
                            'deadline_extension',
                            'step_order',
                            'process_number',
                            'product_name'
                          ];
                          
                          const filteredData = Object.entries(dataToDisplay)
                            .filter(([key]) => importantFields.includes(key))
                            .sort((a, b) => importantFields.indexOf(a[0]) - importantFields.indexOf(b[0]));
                          
                          if (filteredData.length === 0) {
                            return <p style={{ color: "#999", fontSize: "12px" }}>No important details available</p>;
                          }
                          
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {filteredData.map(([key, value], idx) => {
                                const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                
                                let displayValue;
                                if (value === null || value === undefined) {
                                  displayValue = '-';
                                } else if (typeof value === 'object') {
                                  displayValue = JSON.stringify(value);
                                } else if (value === '') {
                                  displayValue = '-';
                                } else {
                                  displayValue = String(value);
                                }
                                
                                return (
                                  <div key={idx} style={{
                                    padding: "10px 12px",
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: "4px",
                                    border: "1px solid #dee2e6",
                                    display: "grid",
                                    gridTemplateColumns: "200px 1fr",
                                    gap: "16px"
                                  }}>
                                    <div style={{ fontWeight: "600", color: "#495057", fontSize: "12px" }}>
                                      {fieldName}
                                    </div>
                                    <div style={{ color: "#333", fontSize: "12px", wordBreak: "break-word" }}>
                                      {displayValue}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } catch (e) {
                          return (
                            <div style={{ padding: "12px", backgroundColor: "#ffe6e6", borderRadius: "6px", color: "#dc3545", fontSize: "12px" }}>
                              Error parsing data: {e.message}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "16px 30px",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => {
                      const id = selectedLogDetails.id;
                      setSelectedLogDetails(null);
                      setDeleteConfirmId(id);
                    }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Delete Log
                  </button>
                  <button
                    onClick={() => setSelectedLogDetails(null)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      background: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TaskUpdateLogsPanel;
