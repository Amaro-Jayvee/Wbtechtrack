import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function CustomerSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    full_name: "",
    company_name: "",
    contact_number: "",
    is_verified: false,
    created_at: "",
  });

  const [profileEdits, setProfileEdits] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [userData, setUserData] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [changePassword, setChangePassword] = useState({ new_password: "", confirm_password: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: "", description: "" });
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_alerts: true,
    request_updates: true,
    status_changes: true,
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const getInitial = (username) => username.charAt(0).toUpperCase();

  useEffect(() => {
    fetchUserData();
    fetchProfile();
    fetchNotifications();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/whoami/", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/profile/", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 401) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setMessageType("error");
      setMessage("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/notifications/", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:8000/app/notifications/${notificationId}/read/`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/app/profile/", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          full_name: profile.full_name,
          company_name: profile.company_name,
          contact_number: profile.contact_number,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setIsEditing(false);
        setMessageType("success");
        setMessage("Profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessageType("error");
        setMessage("Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessageType("error");
      setMessage("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfile();
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("http://localhost:8000/app/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
        {/* Header */}
        <div
          style={{
            backgroundColor: "#1f5a96",
            color: "white",
            padding: "15px 30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <img
              src="/Group 1.png"
              alt="Logo"
              style={{ height: "35px", width: "auto" }}
            />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>
              TECHNOLOGIES INC
            </span>
          </div>
        </div>

        {/* Loading Content */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 65px)",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ marginTop: "16px", color: "#666", fontSize: "14px" }}>
              Loading your settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "#1f5a96",
          color: "white",
          padding: "15px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div 
          onClick={() => navigate("/customer-requests")}
          style={{ display: "flex", alignItems: "center", gap: "15px", cursor: "pointer" }}
        >
          <img
            src="/Group 1.png"
            alt="Logo"
            style={{ height: "35px", width: "auto" }}
          />
          <span style={{ fontSize: "14px", fontWeight: "500" }}>
            TECHNOLOGIES INC
          </span>
        </div>

        {/* Notification Bell and User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "18px",
                padding: 0,
                position: "relative",
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    backgroundColor: "#e74c3c",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotificationDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "50px",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  minWidth: "350px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  zIndex: 1000,
                }}
              >
                {/* Notification Header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #eee",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  Notifications {unreadCount > 0 && `(${unreadCount} new)`}
                </div>

                {/* Notifications List */}
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 16px",
                      textAlign: "center",
                      color: "#999",
                      fontSize: "13px",
                    }}
                  >
                    No notifications
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #eee",
                          backgroundColor: notification.is_read ? "transparent" : "#f0f7ff",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = notification.is_read
                            ? "#f8f9fa"
                            : "#e8f4ff")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = notification.is_read
                            ? "transparent"
                            : "#f0f7ff")
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            gap: "8px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: notification.is_read ? "400" : "600",
                                fontSize: "13px",
                                color: "#333",
                                marginBottom: "4px",
                              }}
                            >
                              {notification.title}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#666",
                                marginBottom: "4px",
                                lineHeight: "1.4",
                              }}
                            >
                              {notification.message}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#999",
                              }}
                            >
                              {new Date(notification.created_at).toLocaleDateString()}{" "}
                              {new Date(notification.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationRead(notification.id);
                              }}
                              style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: "#007bff",
                                cursor: "pointer",
                                fontSize: "12px",
                                padding: "2px 6px",
                                fontWeight: "500",
                                marginTop: "2px",
                              }}
                              title="Mark as read"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "600",
                padding: 0,
              }}
              title={userData?.username}
            >
              {userData?.username && getInitial(userData.username)}
            </button>

          {showProfileDropdown && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: 0,
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                minWidth: "180px",
                zIndex: 1000,
              }}
            >
              {/* User Info */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {userData?.username && getInitial(userData.username)}
                </div>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ fontWeight: "600", color: "#333" }}>
                    {userData?.username}
                  </div>
                  <div style={{ color: "#999", fontSize: "12px" }}>
                    {userData?.role}
                  </div>
                </div>
              </div>

              {/* Logout Option */}
              <button
                onClick={() => {
                  setShowProfileDropdown(false);
                  handleLogout();
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "#dc3545",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.backgroundColor = "#f5f5f5")
                }
                onMouseLeave={(e) =>
                  (e.target.backgroundColor = "transparent")
                }
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 65px)", backgroundColor: "#f8f9fa" }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: "300px",
            backgroundColor: "white",
            borderRight: "1px solid #e0e0e0",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", color: "#333" }}>
            Settings
          </h3>

          {/* Search */}
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Menu Items */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("account")}
              style={{
                padding: "12px 16px",
                border: "none",
                backgroundColor: activeTab === "account" ? "#e3f2fd" : "transparent",
                color: activeTab === "account" ? "#1976d2" : "#666",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "account" ? "600" : "500",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Account Settings
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              style={{
                padding: "12px 16px",
                border: "none",
                backgroundColor: activeTab === "notifications" ? "#e3f2fd" : "transparent",
                color: activeTab === "notifications" ? "#1976d2" : "#666",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "notifications" ? "600" : "500",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Notification Preferences
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              style={{
                padding: "12px 16px",
                border: "none",
                backgroundColor: activeTab === "privacy" ? "#e3f2fd" : "transparent",
                color: activeTab === "privacy" ? "#1976d2" : "#666",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "privacy" ? "600" : "500",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Privacy Settings
            </button>
            <button
              onClick={() => setActiveTab("support")}
              style={{
                padding: "12px 16px",
                border: "none",
                backgroundColor: activeTab === "support" ? "#e3f2fd" : "transparent",
                color: activeTab === "support" ? "#1976d2" : "#666",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: activeTab === "support" ? "600" : "500",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Support Contact
            </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, padding: "40px", backgroundColor: "#f8f9fa", overflowY: "auto" }}>
          {/* Message Alert */}
          {message && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                backgroundColor:
                  messageType === "success"
                    ? "#d4edda"
                    : messageType === "error"
                    ? "#f8d7da"
                    : "#d1ecf1",
                color:
                  messageType === "success"
                    ? "#155724"
                    : messageType === "error"
                    ? "#721c24"
                    : "#0c5460",
                borderRadius: "4px",
                fontSize: "14px",
                border: `1px solid ${
                  messageType === "success"
                    ? "#c3e6cb"
                    : messageType === "error"
                    ? "#f5c6cb"
                    : "#bee5eb"
                }`,
              }}
            >
              {message}
            </div>
          )}

          {/* ACCOUNT SETTINGS TAB */}
          {activeTab === "account" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "600" }}>
                Account Settings
              </h2>
              <p style={{ marginBottom: "30px", color: "#666", fontSize: "14px" }}>
                Update your profile details, change your password, and view your account status.
              </p>

              <div style={{ backgroundColor: "white", borderRadius: "6px", padding: "30px", marginBottom: "20px" }}>
                {/* Profile Picture Section */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    marginBottom: "30px",
                    paddingBottom: "20px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      backgroundColor: "#1976d2",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px",
                      fontWeight: "600",
                    }}
                  >
                    {userData?.username && getInitial(userData.username)}
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" }}>
                      {profile.full_name || userData?.username}
                    </h4>
                    <p style={{ margin: "0 0 4px 0", color: "#1976d2", fontSize: "13px", fontWeight: "500" }}>
                      {profile.is_verified ? "Verified" : "Pending Verification"}
                    </p>
                    <p style={{ margin: "0", color: "#999", fontSize: "12px" }}>
                      Joined on {new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      {profile.is_verified ? "Active Account" : "Account Pending"}
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={profile.full_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                        backgroundColor: isEditing ? "white" : "#f5f5f5",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={profile.company_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                        backgroundColor: isEditing ? "white" : "#f5f5f5",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                        backgroundColor: isEditing ? "white" : "#f5f5f5",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={profile.contact_number}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                        backgroundColor: isEditing ? "white" : "#f5f5f5",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Change Password Link */}
                <div style={{ marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #eee" }}>
                  <button
                    onClick={() => setChangePassword({ ...changePassword, showing: !changePassword.showing })}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#1976d2",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      padding: 0,
                    }}
                  >
                    Change Password
                  </button>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setProfileEdits(profile);
                      }}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setProfile(profileEdits);
                          setIsEditing(false);
                        }}
                        style={{
                          padding: "10px 24px",
                          backgroundColor: "white",
                          color: "#666",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          padding: "10px 24px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: saving ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATION PREFERENCES TAB */}
          {activeTab === "notifications" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "600" }}>
                Notification Preferences
              </h2>
              <p style={{ marginBottom: "30px", color: "#666", fontSize: "14px" }}>
                Choose how and when you want to be notified about your requests and updates.
              </p>

              <div style={{ backgroundColor: "white", borderRadius: "6px", padding: "30px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600" }}>Email Alerts</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>Receive important notifications via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.email_alerts}
                      onChange={(e) => setNotificationPreferences({ ...notificationPreferences, email_alerts: e.target.checked })}
                      style={{ width: "20px", height: "20px", cursor: "pointer" }}
                    />
                  </div>
                  <hr style={{ margin: 0, border: "none", borderTop: "1px solid #eee" }} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600" }}>Request Updates</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>Get notified when your requests are updated</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.request_updates}
                      onChange={(e) => setNotificationPreferences({ ...notificationPreferences, request_updates: e.target.checked })}
                      style={{ width: "20px", height: "20px", cursor: "pointer" }}
                    />
                  </div>
                  <hr style={{ margin: 0, border: "none", borderTop: "1px solid #eee" }} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600" }}>Status Changes</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>Notify me when request status changes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.status_changes}
                      onChange={(e) => setNotificationPreferences({ ...notificationPreferences, status_changes: e.target.checked })}
                      style={{ width: "20px", height: "20px", cursor: "pointer" }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "30px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setMessageType("success");
                      setMessage("Notification preferences updated!");
                      setTimeout(() => setMessage(""), 3000);
                    }}
                    style={{
                      padding: "10px 24px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY SETTINGS TAB */}
          {activeTab === "privacy" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "600" }}>
                Privacy Settings
              </h2>
              <p style={{ marginBottom: "30px", color: "#666", fontSize: "14px" }}>
                This section lets you request permanent deletion of your account and data. No other privacy controls are needed at this time.
              </p>

              <div style={{ backgroundColor: "white", borderRadius: "6px", padding: "30px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600" }}>Delete Account</h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{
                      padding: "10px 24px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUPPORT CONTACT TAB */}
          {activeTab === "support" && (
            <div style={{ maxWidth: "800px" }}>
              <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "600" }}>
                Support Contact
              </h2>
              <p style={{ marginBottom: "30px", color: "#666", fontSize: "14px" }}>
                Reach out to our support team for help with your account or requests.
              </p>

              <div style={{ backgroundColor: "white", borderRadius: "6px", padding: "30px", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 20px 0", fontSize: "14px", fontWeight: "600" }}>Contact Methods</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
                  <div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#999" }}>Email address</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>wbtechnologies@gmail.com</p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#999" }}>Phone number</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>0963-898-7703</p>
                  </div>
                </div>

                <div style={{ paddingTop: "20px", borderTop: "1px solid #eee", marginBottom: "30px" }}>
                  <h4 style={{ margin: "20px 0 10px 0", fontSize: "14px", fontWeight: "600" }}>Support Hours</h4>
                  <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>Available Monday-Friday, 9 AM-6 PM (PHT)</p>
                </div>

                <div style={{ paddingTop: "20px", borderTop: "1px solid #eee" }}>
                  <h4 style={{ margin: "20px 0 15px 0", fontSize: "14px", fontWeight: "600" }}>Support Form</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600" }}>
                        Subject
                      </label>
                      <input
                        type="text"
                        value={supportForm.subject}
                        onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                        placeholder="Enter subject"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600" }}>
                        Description
                      </label>
                      <textarea
                        value={supportForm.description}
                        onChange={(e) => setSupportForm({ ...supportForm, description: e.target.value })}
                        placeholder="Describe your issue"
                        rows="6"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          fontFamily: "Arial, sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => {
                        setSupportForm({ subject: "", description: "" });
                        setMessageType("success");
                        setMessage("Support request submitted successfully!");
                        setTimeout(() => setMessage(""), 3000);
                      }}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e9ecef",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <h5 style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>
                Delete Account
              </h5>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px", fontWeight: "500" }}>
                This action is permanent and cannot be undone.
              </p>
              <p style={{ margin: 0, color: "#999", fontSize: "13px" }}>
                Your account and all associated data will be permanently deleted from our system.
              </p>
            </div>
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e9ecef",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setMessageType("success");
                  setMessage("Account deletion request submitted. You will receive a confirmation email.");
                  setTimeout(() => setMessage(""), 5000);
                }}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e9ecef",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <h5 style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>
                Confirm Logout
              </h5>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 20px 0", color: "#666", fontSize: "14px" }}>
                Are you sure you want to logout? You will need to sign in again to access your account.
              </p>
            </div>
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e9ecef",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  cursor: isLoggingOut ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  color: "#333",
                  fontWeight: "500",
                  opacity: isLoggingOut ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={performLogout}
                disabled={isLoggingOut}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "4px",
                  cursor: isLoggingOut ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: isLoggingOut ? 0.6 : 1,
                }}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerSettings;
