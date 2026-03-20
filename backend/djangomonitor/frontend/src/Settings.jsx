import React, { useState, useEffect } from "react";
import SidebarLayout from "./SidebarLayout";
import ActivityLogsPanel from "./ActivityLogsPanel";
import TaskUpdateLogsPanel from "./TaskUpdateLogsPanel";
import "./Dashboard.css";

function Settings() {
  const [selectedSetting, setSelectedSetting] = useState("manage-accounts");
  const [settings, setSettings] = useState({
    enable_email_alerts: true,
    data_retention_days: 365,
    enable_audit_logs: true,
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loginBackgroundFile, setLoginBackgroundFile] = useState(null);
  const [loginBackgroundPreview, setLoginBackgroundPreview] = useState("");
  const [uploadingLoginBackground, setUploadingLoginBackground] = useState(false);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const [userProfile, setUserProfile] = useState({
    username: "",
    email: "",
    full_name: "",
    company_name: "",
    contact_number: "",
    role: "",
  });

  const [profileEdit, setProfileEdit] = useState({
    full_name: "",
    contact_number: "",
  });

  const [passwordChange, setPasswordChange] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    fetchSettings();
    fetchArchivedRequests();
    fetchUserProfile();
  }, []);

  // Listen for archive updates from TaskDetailModal
  useEffect(() => {
    const handleArchivedUpdate = () => {
      fetchArchivedRequests();
    };

    window.addEventListener('archivedRequestsUpdated', handleArchivedUpdate);
    return () => window.removeEventListener('archivedRequestsUpdated', handleArchivedUpdate);
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
          enable_email_alerts: data.enable_email_alerts ?? true,
          data_retention_days: data.data_retention_days || 365,
          enable_audit_logs: data.enable_audit_logs ?? true,
        });
        setLoginBackgroundPreview(data.login_background_image_url || "");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/profile/", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        setProfileEdit({
          full_name: data.full_name || "",
          contact_number: data.contact_number || "",
        });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileEdit(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordChange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/app/profile/", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(profileEdit),
      });

      if (response.ok) {
        setMessage("Profile updated successfully!");
        fetchUserProfile();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.detail || "Error updating profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSaving(true);
    setMessage("");

    try {
      if (passwordChange.new_password !== passwordChange.confirm_password) {
        setMessage("New passwords do not match");
        setSaving(false);
        return;
      }

      const response = await fetch("http://localhost:8000/app/profile/change-password/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(passwordChange),
      });

      if (response.ok) {
        setMessage("Password changed successfully!");
        setPasswordChange({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.detail || "Error changing password");
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setMessage("Error changing password");
    } finally {
      setSaving(false);
    }
  };

  const fetchArchivedRequests = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/archived-requests/", {
        method: "GET",
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract archived request products from the response
        let archivedProducts = [];
        if (Array.isArray(data)) {
          data.forEach((item, idx) => {
            if (item.products && Array.isArray(item.products)) {
              // Each product already has request_id, id (RequestProduct ID), and archived_at from serializer
              archivedProducts = archivedProducts.concat(item.products);
            }
          });
        }
        setArchivedRequests(archivedProducts);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch archived requests:", response.status, errorText);
        setArchivedRequests([]);
      }
    } catch (err) {
      console.error("Error fetching archived requests:", err);
      setArchivedRequests([]);
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

  const handleRestoreProduct = (requestProductId, issuanceNo) => {
    setRestoreTarget({
      requestProductId,
      issuanceNo,
    });
    setShowRestoreModal(true);
  };

  const handleLoginBackgroundFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    setLoginBackgroundFile(file);
    setMessage("");
  };

  const handleUploadLoginBackground = async () => {
    if (!loginBackgroundFile) {
      setMessage("Please choose an image before uploading.");
      return;
    }

    setUploadingLoginBackground(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("background_image", loginBackgroundFile);

      const response = await fetch("http://localhost:8000/app/settings/login-background/", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.detail || "Failed to upload login background.");
        return;
      }

      setLoginBackgroundPreview(data.login_background_image_url || "");
      setLoginBackgroundFile(null);
      setMessage("Login background updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Error uploading login background:", err);
      setMessage("Error uploading login background.");
    } finally {
      setUploadingLoginBackground(false);
    }
  };

  const confirmRestore = async () => {
    const requestProductId = restoreTarget?.requestProductId;
    if (!requestProductId) {
      setMessage("❌ Restore target is missing. Please try again.");
      setShowRestoreModal(false);
      setRestoreTarget(null);
      return;
    }

    setShowRestoreModal(false);
    setRestoreTarget(null);

    try {
      const response = await fetch("http://localhost:8000/app/restore-request-product/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ request_product_id: requestProductId }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error(`[RestoreProduct] Failed to parse JSON response:`, parseErr);
        const textData = await response.text();
        console.error(`[RestoreProduct] Raw response:`, textData);
        setMessage(`Server error: ${response.status} - Invalid response format`);
        return;
      }

      if (response.ok) {
        setMessage(data.message || `✅ Product restored successfully!`);
        
        // Dispatch event for request list to refresh
        window.dispatchEvent(new Event('requestsUpdated'));
        
        // Refresh archived requests list
        fetchArchivedRequests();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorMsg = data?.error || data?.detail || data?.message || "Error restoring product";
        console.error(`❌ Restore failed (${response.status}):`, errorMsg);
        setMessage(`❌ ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ Network error restoring product:", err);
      console.error(`   Message: ${err.message}`);
      setMessage(`❌ Network error: ${err.message}`);
    }
  };

  const menuItems = React.useMemo(() => {
    const items = [
      {
        category: "Account Settings",
        items: [
          { id: "manage-accounts", label: "Manage Account" },
        ],
      },
      {
        category: "Archive Management",
        items: [
          { id: "archive-requests", label: "Archive Requests" },
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
          { id: "audit-logs", label: "Activity Logs" },
          { id: "data-retention", label: "Data Retention Configuration" },
        ],
      },
    ];

    // Only show Task Management for production managers
    if (userProfile && userProfile.role === "production_manager") {
      items.push({
        category: "Task Management",
        items: [
          { id: "task-updates", label: "Task Update History" },
        ],
      });
    }

    if (userProfile && userProfile.role === "admin") {
      items.push({
        category: "Appearance",
        items: [
          { id: "login-background", label: "Login Background" },
        ],
      });
    }

    return items;
  }, [userProfile]);

  const renderDetailView = () => {
    if (loading) {
      return <div style={{ padding: "20px", color: "#999" }}>Loading...</div>;
    }

    switch (selectedSetting) {
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

      case "archive-requests":
        return (
          <div className="settings-detail">
            <h2>Archive Requests</h2>
            <p className="settings-description">
              View and manage all archived requests. Archived requests are completed tasks that have been archived for record-keeping. You can restore or permanently delete archived requests from here.
            </p>

            <div className="settings-table-container">
              <table className="settings-audit-table">
                <thead>
                  <tr>
                    <th>Issuance No.</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Archived Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedRequests.length > 0 ? (
                    archivedRequests.map((req, idx) => {
                      const requestId = req.request_id;
                      const productId = req.id;
                      return (
                        <tr key={idx}>
                          <td>#{requestId}</td>
                          <td>{req.product_name || "-"}</td>
                          <td>{req.quantity || "-"}</td>
                          <td><span style={{ color: "#999" }}>Archived</span></td>
                          <td>{req.archived_at || "-"}</td>
                          <td>
                            <button 
                              onClick={() => handleRestoreProduct(productId, requestId)}
                              style={{ padding: "5px 10px", fontSize: "12px", color: "#0066cc", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                              title="Restore this product"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#999" }}>
                        No archived requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "audit-logs":
        return (
          <div className="settings-detail">
            <h2>Activity Logs</h2>
            <p className="settings-description">
              View activity logs showing all changes, actions, and updates performed by users. Activity logs help maintain security, compliance, and provide a complete history of system operations.
            </p>
            <div className="settings-table-container">
              <ActivityLogsPanel title="User Activity History" limit={10} />
            </div>
          </div>
        );

      case "task-updates":
        return (
          <div className="settings-detail">
            <h2>Task Update History</h2>
            <p className="settings-description">
              View all task-related updates including task creation, modifications, deletions, and worker assignments. This history helps track production progress and changes made by production managers.
            </p>
            <div className="settings-table-container">
              <TaskUpdateLogsPanel title="Task Update History" limit={100} />
            </div>
          </div>
        );

      case "manage-accounts":
        return (
          <div className="settings-detail">
            <h2>Manage Account</h2>
            <p className="settings-description">
              Update your personal information and manage your account security.
            </p>

            {message && (
              <div className={`alert mb-4 ${message.includes("Error") ? "alert-danger" : "alert-success"}`}>
                {message}
              </div>
            )}

            {/* Profile Information Section */}
            <div style={{
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "30px",
              border: "1px solid #dee2e6"
            }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333", fontSize: "18px" }}>Personal Information</h3>
              
              <div className="settings-form-group">
                <label className="settings-input-label">Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={profileEdit.full_name}
                  onChange={handleProfileChange}
                  className="settings-input"
                  placeholder="Enter your name"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-input-label">Contact Number</label>
                <input
                  type="text"
                  name="contact_number"
                  value={profileEdit.contact_number}
                  onChange={handleProfileChange}
                  className="settings-input"
                  placeholder="e.g., +1-555-1234 or 555-1234"
                />
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={saving}
                style={{
                  backgroundColor: saving ? "#a0b4d1" : "#1D6AB7",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "10px 20px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {saving ? "Updating..." : "Update Profile"}
              </button>
            </div>

            {/* Change Password Section */}
            <div style={{
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #dee2e6"
            }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333", fontSize: "18px" }}>Change Password</h3>
              <p style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>Enter your current password and set a new password</p>

              <div className="settings-form-group">
                <label className="settings-input-label">Current Password</label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordChange.current_password}
                  onChange={handlePasswordChange}
                  className="settings-input"
                  placeholder="Enter current password"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-input-label">New Password</label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordChange.new_password}
                  onChange={handlePasswordChange}
                  className="settings-input"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-input-label">Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordChange.confirm_password}
                  onChange={handlePasswordChange}
                  className="settings-input"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={saving}
                style={{
                  backgroundColor: saving ? "#a0b4d1" : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "10px 20px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {saving ? "Changing Password..." : "Change Password"}
              </button>
              <small style={{ color: "#666", marginTop: "10px", display: "block" }}>Password must be at least 6 characters and different from your current password. You can change your password once per 24 hours.</small>
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

      case "login-background":
        return (
          <div className="settings-detail">
            <h2>Login Background</h2>
            <p className="settings-description">
              Upload an image that will be used as the login page background. Only admin users can update this image.
            </p>

            {message && (
              <div className={`alert mb-4 ${message.includes("Error") || message.includes("Failed") ? "alert-danger" : "alert-success"}`}>
                {message}
              </div>
            )}

            <div style={{ backgroundColor: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", padding: "20px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label className="settings-input-label" htmlFor="login-background-file">Select Background Image</label>
                <input
                  id="login-background-file"
                  type="file"
                  accept="image/*"
                  onChange={handleLoginBackgroundFileChange}
                  className="settings-input"
                />
                <small style={{ color: "#666" }}>Accepted formats: any image type. Maximum file size: 10MB.</small>
              </div>

              {loginBackgroundPreview && (
                <div style={{ marginBottom: "14px" }}>
                  <p style={{ fontWeight: 600, marginBottom: "8px" }}>Current Preview</p>
                  <img
                    src={loginBackgroundPreview}
                    alt="Login background preview"
                    style={{ width: "100%", maxWidth: "560px", borderRadius: "8px", border: "1px solid #ddd" }}
                  />
                </div>
              )}

              <button
                onClick={handleUploadLoginBackground}
                disabled={uploadingLoginBackground || !loginBackgroundFile}
                style={{
                  backgroundColor: uploadingLoginBackground || !loginBackgroundFile ? "#a0b4d1" : "#1D6AB7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "10px 18px",
                  cursor: uploadingLoginBackground || !loginBackgroundFile ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {uploadingLoginBackground ? "Uploading..." : "Upload Background"}
              </button>
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
      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div
          onClick={() => {
            setShowRestoreModal(false);
            setRestoreTarget(null);
          }}
          style={{
            position: "fixed", inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "32px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              borderTop: "4px solid #1D6AB7",
            }}
          >
            <h4 style={{ margin: "0 0 12px", color: "#1D6AB7", fontWeight: 700 }}>
              Restore Issuance
            </h4>
            <p style={{ margin: "0 0 24px", color: "#444", fontSize: "15px" }}>
              Are you sure you want to restore <strong>Issuance #{restoreTarget?.issuanceNo ?? "-"}</strong>?
              It will be moved back to the active task list.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreTarget(null);
                }}
                style={{
                  padding: "8px 20px", borderRadius: "6px",
                  border: "1px solid #ccc", background: "#f5f5f5",
                  cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                style={{
                  padding: "8px 20px", borderRadius: "6px",
                  border: "none", background: "#1D6AB7",
                  color: "#fff", cursor: "pointer", fontWeight: 600,
                }}
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default Settings;
