import React, { useState, useEffect } from "react";
import SidebarLayout from "./SidebarLayout";
import "./Dashboard.css";

function Settings() {
  const [selectedSetting, setSelectedSetting] = useState("session-timeout");
  const [settings, setSettings] = useState({
    session_timeout_minutes: 15,
    enable_session_timeout: true,
    enable_auto_archive: true,
    archive_threshold_days: 30,
    enable_email_alerts: true,
    data_retention_days: 365,
    enable_audit_logs: true,
  });

  const [workers, setWorkers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
    fetchWorkers();
    fetchAuditLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/settings/", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({
          session_timeout_minutes: data.session_timeout_minutes || 15,
          enable_session_timeout: data.enable_session_timeout ?? true,
          enable_auto_archive: data.enable_auto_archive ?? true,
          archive_threshold_days: data.archive_threshold_days || 30,
          enable_email_alerts: data.enable_email_alerts ?? true,
          data_retention_days: data.data_retention_days || 365,
          enable_audit_logs: data.enable_audit_logs ?? true,
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/worker/", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setWorkers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching workers:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/auditlogs/", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    const newValue = type === "checkbox" ? checked : parseInt(value) || value;
    setSettings((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleWorkerToggle = async (workerId, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/app/worker/${workerId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ WorkerID: workerId, is_active: !currentStatus }),
      });

      if (response.ok) {
        setMessage("Worker status updated successfully!");
        fetchWorkers();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error updating worker status");
      }
    } catch (err) {
      console.error("Error updating worker:", err);
      setMessage("Error updating worker status");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/app/settings/update/", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.detail || "Error saving settings");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchSettings();
    setMessage("");
  };

  const menuItems = [
    {
      category: "Account Settings",
      items: [
        { id: "manage-accounts", label: "Manage Accounts" },
      ],
    },
    {
      category: "System Behavior",
      items: [
        { id: "session-timeout", label: "Session Timeout Duration" },
        { id: "worker-assignment", label: "Enable/Disable Worker Assignment" },
      ],
    },
    {
      category: "Session & Archive",
      items: [
        { id: "enable-auto-archive", label: "Auto-Archive Configuration" },
        { id: "set-archive-threshold", label: "Archive Threshold Settings" },
        { id: "view-archived", label: "View Archived Records" },
      ],
    },
    {
      category: "Notifications",
      items: [
        { id: "email-alerts", label: "Email Alert Settings" },
      ],
    },
    {
      category: "Data and Privacy",
      items: [
        { id: "role-visibility", label: "Role-Based Visibility" },
        { id: "audit-logs", label: "System Audit Logs" },
        { id: "data-retention", label: "Data Retention Configuration" },
      ],
    },
  ];

  const renderDetailView = () => {
    if (loading) {
      return <div style={{ padding: "20px", color: "#999" }}>Loading...</div>;
    }

    switch (selectedSetting) {
      case "session-timeout":
        return (
          <div className="settings-detail">
            <h2>Session Timeout Duration</h2>
            <p className="settings-description">
              Configure how long a user can remain logged in without activity. When the timeout period is reached, the system automatically logs them out to protect sensitive data and prevent unauthorized access. Set the timeout value in minutes.
            </p>
            <div className="settings-form-group">
              <label className="settings-input-label">Timeout Duration (minutes)</label>
              <input
                type="number"
                name="session_timeout_minutes"
                min="1"
                max="1440"
                value={settings.session_timeout_minutes}
                onChange={handleInputChange}
                className="settings-input"
              />
            </div>
            <div className="settings-form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enable_session_timeout"
                  checked={settings.enable_session_timeout}
                  onChange={handleInputChange}
                  className="settings-checkbox"
                />
                <span>Enable automatic session timeout</span>
              </label>
            </div>
          </div>
        );

      case "enable-auto-archive":
        return (
          <div className="settings-detail">
            <h2>Auto-Archive Configuration</h2>
            <p className="settings-description">
              Automatically archive old records to keep the dashboard clean and focused. Archived records remain accessible but won't appear in active views. This helps maintain system performance and keeps the workspace organized.
            </p>
            <div className="settings-form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enable_auto_archive"
                  checked={settings.enable_auto_archive}
                  onChange={handleInputChange}
                  className="settings-checkbox"
                />
                <span>Enable automatic archiving of old records</span>
              </label>
            </div>
          </div>
        );

      case "set-archive-threshold":
        return (
          <div className="settings-detail">
            <h2>Archive Threshold Settings</h2>
            <p className="settings-description">
              Specify how many days a record must exist before it becomes eligible for automatic archiving. Records older than this threshold will be moved to the archive. This helps manage database size and performance.
            </p>
            <div className="settings-form-group">
              <label className="settings-input-label">Archive Threshold (days)</label>
              <input
                type="number"
                name="archive_threshold_days"
                min="1"
                max="3650"
                value={settings.archive_threshold_days}
                onChange={handleInputChange}
                className="settings-input"
                disabled={!settings.enable_auto_archive}
              />
            </div>
          </div>
        );

      case "worker-assignment":
        return (
          <div className="settings-detail">
            <h2>Worker Assignment Control</h2>
            <p className="settings-description">
              Control which workers are available for task assignment. Disabling a worker prevents new tasks from being assigned to them, but their current tasks continue normally. This is useful during absences or temporary unavailability. Enable workers again when they become available.
            </p>
            {message && (
              <div className={`settings-message ${message.includes("Error") ? "error" : "success"}`}>
                {message}
              </div>
            )}
            <div className="settings-table-container">
              <table className="settings-worker-table">
                <thead>
                  <tr>
                    <th>Worker ID</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length > 0 ? (
                    workers.map((worker) => (
                      <tr key={worker.WorkerID}>
                        <td>{worker.WorkerID}</td>
                        <td>{worker.FirstName || "-"}</td>
                        <td>{worker.LastName || "-"}</td>
                        <td>
                          <span className="status-badge" style={{ background: worker.is_active ? "#28a745" : "#999", color: "white" }}>
                            {worker.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="toggle-btn"
                            onClick={() => handleWorkerToggle(worker.WorkerID, worker.is_active)}
                            style={{ background: worker.is_active ? "#28a745" : "#6c757d" }}
                          >
                            {worker.is_active ? "On" : "Off"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "#999" }}>
                        No workers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "email-alerts":
        return (
          <div className="settings-detail">
            <h2>Email Alert Settings</h2>
            <p className="settings-description">
              Control whether the system sends email notifications for important events and updates. Enable this to receive alerts about task assignments, deadline changes, and system events.
            </p>
            <div className="settings-form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enable_email_alerts"
                  checked={settings.enable_email_alerts}
                  onChange={handleInputChange}
                  className="settings-checkbox"
                />
                <span>Send email notifications for system events</span>
              </label>
            </div>
          </div>
        );

      case "audit-logs":
        return (
          <div className="settings-detail">
            <h2>System Audit Logs</h2>
            <p className="settings-description">
              View and manage system activity logs showing all changes, actions, and updates performed by users. Audit logs help maintain security, compliance, and provide a complete history of system operations.
            </p>
            <div className="settings-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enable_audit_logs"
                  checked={settings.enable_audit_logs}
                  onChange={handleInputChange}
                  className="settings-checkbox"
                />
                <span>Enable system audit logging</span>
              </label>
            </div>
            <div className="settings-table-container">
              <table className="settings-audit-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action Type</th>
                    <th>Date & Time</th>
                    <th>Target Object</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length > 0 ? (
                    auditLogs.slice(0, 10).map((log, idx) => (
                      <tr key={idx}>
                        <td>{log.performed_by_username || "-"}</td>
                        <td>Admin</td>
                        <td>{log.action_type}</td>
                        <td>{log.timestamp}</td>
                        <td>
                          {log.request ? `Request #${log.request}` : log.request_product ? `Product #${log.request_product}` : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "#999" }}>
                        No audit logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "data-retention":
        return (
          <div className="settings-detail">
            <h2>Data Retention Configuration</h2>
            <p className="settings-description">
              Configure how long records are retained in the system before permanent deletion. This helps maintain performance, manage storage, and comply with data retention policies. Older records may be archived before final deletion.
            </p>
            <div className="settings-form-group">
              <label className="settings-input-label">Data Retention (days)</label>
              <input
                type="number"
                name="data_retention_days"
                min="1"
                max="3650"
                value={settings.data_retention_days}
                onChange={handleInputChange}
                className="settings-input"
              />
            </div>
          </div>
        );

      default:
        return <div className="settings-detail"><h2>Select a setting</h2></div>;
    }
  };

  return (
    <SidebarLayout>
      <div className="settings-page-wrapper">
        {/* Settings Sidebar */}
        <div className="settings-sidebar">
          {menuItems.map((category, idx) => (
            <div key={idx} className="settings-menu-category">
              <h3 className="settings-category-title">{category.category}</h3>
              {category.items.map((item) => (
                <button
                  key={item.id}
                  className={`settings-menu-item ${selectedSetting === item.id ? "active" : ""}`}
                  onClick={() => setSelectedSetting(item.id)}
                >
                  <span className="menu-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Settings Detail View */}
        <div className="settings-main-content">
          {renderDetailView()}

          {/* Action Buttons */}
          <div className="settings-footer">
            <button className="btn-reset" onClick={handleReset} disabled={saving}>
              Reset
            </button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default Settings;
