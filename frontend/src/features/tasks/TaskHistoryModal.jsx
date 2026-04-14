/**
 * TaskHistoryModal Component
 * 
 * Displays detailed audit log history for a specific task/product.
 * Shows all updates made to the product with detailed descriptions of what changed.
 * 
 * Features:
 * - Title: "Log History" (renamed from "Task History" for clarity)
 * - Action column: Plain text display (removed button styling for cleaner UI)
 * - Changes column: Shows meaningful details like:
 *   - "PST 01 (Withdrawal), Saved total quota: 140"
 *   - "PST 08 (Assembly), Saved defect: 2"
 *   - "PST 01, Marked as complete"
 * - By column: Shows the user who performed the action
 * - Date & Time column: Timestamp of each action
 * 
 * Related Backend: app/views.py -> task_history_view()
 */

import React, { useState, useEffect } from "react";
import "../../features/dashboard/Dashboard.css";

function TaskHistoryModal({ requestProductId, productName, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTaskHistory();
  }, [requestProductId]);

  const fetchTaskHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/app/task-history/${requestProductId}/",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("Error fetching task history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActionTypeColor = (actionType) => {
    const colors = {
      'update': '#1D6AB7',
      'create': '#28a745',
      'delete': '#dc3545',
      'archive': '#ffc107',
      'restore': '#17a2b8',
      'extension_request': '#6f42c1',
      'extension_approved': '#28a745',
      'extension_rejected': '#dc3545',
    };
    return colors[actionType] || '#6c757d';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "800px", maxHeight: "600px", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ 
          backgroundColor: "#1D6AB7", 
          color: "white", 
          padding: "1rem 1.5rem", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "1.1rem", fontWeight: "600" }}>
              Log History
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", opacity: 0.9 }}>
              {productName || "Product"}
            </p>
          </div>
          <button 
            className="btn-close" 
            onClick={onClose} 
            style={{ 
              color: "white", 
              fontSize: "1.5rem", 
              background: "none", 
              border: "none", 
              cursor: "pointer" 
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ 
          padding: "1rem", 
          overflow: "auto", 
          flex: 1,
          backgroundColor: "#f8f9fa"
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: "center", 
              padding: "2rem", 
              color: "#dc3545",
              backgroundColor: "#f8d7da",
              borderRadius: "4px"
            }}>
              <p style={{ fontWeight: "600" }}>Error loading history</p>
              <p style={{ fontSize: "0.9rem" }}>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "2rem", 
              color: "#999"
            }}>
              <i className="bi bi-clock-history" style={{ fontSize: "2rem", color: "#ccc" }}></i>
              <p style={{ marginTop: "0.5rem" }}>No history yet</p>
            </div>
          ) : (
            <table className="data-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Action</th>
                  <th style={{ width: "180px" }}>Date & Time</th>
                  <th style={{ width: "150px" }}>By</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: "0.85rem", fontWeight: "500" }}>
                      {item.action_display}
                    </td>
                    <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {formatTimestamp(item.timestamp)}
                    </td>
                    <td style={{ fontSize: "0.9rem" }}>
                      {item.performed_by || "System"}
                    </td>
                    <td>
                      {item.changes && item.changes.length > 0 ? (
                        <div style={{ fontSize: "0.85rem" }}>
                          {item.changes.map((change, idx) => (
                            <div key={idx} style={{ padding: "2px 0" }}>
                              {change}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#999", fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: "0.75rem 1rem", 
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "0.85rem", color: "#666" }}>
            {history.length} {history.length === 1 ? 'entry' : 'entries'} found
          </div>
          <button 
            onClick={onClose}
            style={{ 
              padding: "0.4rem 1.2rem",
              backgroundColor: "#6c757d",
              border: "none",
              color: "white",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskHistoryModal;
