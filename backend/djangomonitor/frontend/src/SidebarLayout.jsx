import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Dashboard.css";

function SidebarLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState({ username: "", role: "" });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      console.log("[SidebarLayout] Fetching notifications from: http://localhost:8000/app/notifications/");
      const response = await fetch("http://localhost:8000/app/notifications/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        }
      });

      console.log("[SidebarLayout] Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[SidebarLayout] Fetched notifications:", data);
        console.log("[SidebarLayout] Unread count from API:", data.unread_count);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        return data;
      } else {
        const errorData = await response.text();
        console.error("[SidebarLayout] Error response:", response.status, errorData);
      }
    } catch (err) {
      console.error("[SidebarLayout] Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/app/whoami/", {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        if (data.username) {
          setUserData({
            username: data.username,
            role: data.role || "User",
          });
        }
      } catch (err) {
        console.error("Error fetching user", err);
      }
    };
    fetchUser();
    
    console.log("[SidebarLayout] Initial notification fetch on mount");
    fetchNotifications();

    // Poll for new notifications every 5 seconds
    const notificationInterval = setInterval(() => {
      console.log("[SidebarLayout] Polling for notifications (5s interval)");
      fetchNotifications();
    }, 5000);

    // Listen for manual refresh events from child components
    const handleRefreshNotifications = () => {
      console.log("[SidebarLayout] Manual refresh event triggered");
      fetchNotifications();
    };
    window.addEventListener('refreshNotifications', handleRefreshNotifications);

    return () => {
      clearInterval(notificationInterval);
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
    };
  }, []);

  const markAllNotificationsRead = async () => {
    try {
      console.log("[SidebarLayout] Marking all notifications as read");
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) {
        console.log("[SidebarLayout] No unread notifications to mark");
        return;
      }
      
      // Mark all unread notifications as read
      for (const notif of unreadNotifications) {
        await fetch(`http://localhost:8000/app/notifications/${notif.id}/read/`, {
          method: "POST",
          credentials: "include",
        });
      }
      
      console.log("[SidebarLayout] All notifications marked as read, fetching updated list");
      await fetchNotifications();
    } catch (err) {
      console.error("[SidebarLayout] Error marking all notifications as read:", err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      console.log("[SidebarLayout] Marking notification as read:", notificationId);
      const response = await fetch(`http://localhost:8000/app/notifications/${notificationId}/read/`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const markData = await response.json();
        console.log("[SidebarLayout] Notification marked as read successfully:", markData);
        
        // Now fetch the updated notifications list to get the new unread count
        console.log("[SidebarLayout] Fetching updated notifications list...");
        await fetchNotifications();
        console.log("[SidebarLayout] Notifications refreshed");
      } else {
        console.error("[SidebarLayout] Failed to mark notification as read:", response.status);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("http://localhost:8000/app/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Logout failed. Please try again.");
      }

      // Successful logout
      setShowLogoutModal(false);
      setIsLoggingOut(false);
      
      // Clear local session data
      sessionStorage.clear();
      localStorage.removeItem("authToken");
      
      // Redirect to login
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
      alert(err.message || "Error logging out. Please try again.");
    }
  };

  const isActive = (path) => location.pathname === path;
  const getInitial = (username) => username.charAt(0).toUpperCase();

  // Determine page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/accounts") return "Accounts";
    if (path === "/request") return "Requests";
    if (path === "/request-list") return "Request List";
    if (path === "/customer-requests") return "My Requests";
    if (path === "/customer/settings") return "Settings";
    if (path === "/task-status") return "Task Status";
    if (path === "/settings") return "Settings";
    return "Dashboard";
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/Group 1.png" alt="WB Technologies" className="sidebar-logo-img" />
        </div>
        
        <div className="sidebar-items">
          {/* Admin/Manager Menu */}
          {userData.role !== "customer" && (
            <>
              <Link
                to="/dashboard"
                className={`sidebar-item ${isActive("/dashboard") ? "active" : ""}`}
                title="Dashboard"
              >
                <img src="/Graph.png" alt="Dashboard" className="sidebar-icon" />
              </Link>
              <Link
                to="/accounts"
                className={`sidebar-item ${isActive("/accounts") ? "active" : ""}`}
                title="Accounts"
              >
                <img src="/Users.png" alt="Accounts" className="sidebar-icon" />
              </Link>
              
              {/* Create Request - Admin sees create form, Production Manager sees list */}
              {(userData.role === "admin" || userData.role === "manager" || userData.role === "production_manager") && (
                <Link
                  to={userData.role === "admin" ? "/request" : "/request-list"}
                  className={`sidebar-item ${isActive("/request") || isActive("/request-list") ? "active" : ""}`}
                  title={userData.role === "admin" ? "Create Request" : "View Requests"}
                >
                  <img src="/3rd.png" alt={userData.role === "admin" ? "Create Request" : "View Requests"} className="sidebar-icon" />
                </Link>
              )}
              
              <Link
                to="/task-status"
                className={`sidebar-item ${isActive("/task-status") ? "active" : ""}`}
                title="Task Status"
              >
                <img src="/4th.png" alt="Task Status" className="sidebar-icon" />
              </Link>
              <Link
                to="/settings"
                className={`sidebar-item ${isActive("/settings") ? "active" : ""}`}
                title="Settings"
              >
                <img src="/Settings.png" alt="Settings" className="sidebar-icon" />
              </Link>
            </>
          )}
          
          {/* Customer Menu */}
          {userData.role === "customer" && (
            <>
              <Link
                to="/customer-requests"
                className={`sidebar-item ${isActive("/customer-requests") ? "active" : ""}`}
                title="My Requests"
              >
                <img src="/3rd.png" alt="My Requests" className="sidebar-icon" />
              </Link>
              <Link
                to="/customer/settings"
                className={`sidebar-item ${isActive("/customer/settings") ? "active" : ""}`}
                title="Settings"
              >
                <img src="/Settings.png" alt="Settings" className="sidebar-icon" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-title">
            {getPageTitle()}
          </div>

          <div className="header-center">
            <input
              type="text"
              placeholder="Search"
              className="search-box"
            />
          </div>

          <div className="header-right">
            <div style={{ position: "relative" }}>
              <button 
                className={`btn btn-notification ${showNotificationDropdown ? 'notification-paused' : ''}`}
                title="Notifications"
                onClick={async () => {
                  console.log("[SidebarLayout] Notification bell clicked, current dropdown state:", showNotificationDropdown);
                  console.log("[SidebarLayout] Current notifications:", notifications);
                  console.log("[SidebarLayout] Unread count:", unreadCount);
                  
                  // If opening the dropdown, mark all as read
                  if (!showNotificationDropdown && unreadCount > 0) {
                    console.log("[SidebarLayout] Opening dropdown - marking all as read");
                    await markAllNotificationsRead();
                  }
                  
                  setShowNotificationDropdown(!showNotificationDropdown);
                }}
              >
                <i className="bi bi-bell-fill"></i>
                {unreadCount > 0 && (
                  <span className={`notification-badge ${showNotificationDropdown ? 'animation-disabled' : ''}`}>{unreadCount}</span>
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

            <div className="profile-section-dropdown">
              <button
                className="btn btn-profile-toggle"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                title="User Profile"
              >
                <div className="profile-avatar">
                  {getInitial(userData.username)}
                </div>
                <div className="profile-info">
                  <span className="profile-name-text">{userData.username}</span>
                  <span className="profile-role">{userData.role}</span>
                </div>
                <i className={`bi bi-chevron-down profile-chevron ${showProfileDropdown ? 'open' : ''}`}></i>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <div className="dropdown-avatar">{getInitial(userData.username)}</div>
                      <div>
                        <div className="dropdown-username">{userData.username}</div>
                        <div className="dropdown-role">{userData.role}</div>
                      </div>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <button
                    className="dropdown-item logout-item"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-backdrop fade show"></div>
      )}
      <div className={`modal fade ${showLogoutModal ? "show d-block" : ""}`} tabIndex="-1" role="dialog" aria-hidden={!showLogoutModal}>
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light border-bottom">
              <h5 className="modal-title">
                <i className="bi bi-exclamation-circle-fill text-warning me-2"></i>
                Confirm Logout
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowLogoutModal(false)}
                aria-label="Close"
                disabled={isLoggingOut}
              ></button>
            </div>
            <div className="modal-body">
              <p className="mb-0 text-muted">
                Are you sure you want to logout? You will need to sign in again to access your account.
              </p>
            </div>
            <div className="modal-footer border-top bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={performLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging out...
                  </>
                ) : (
                  "Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showLogoutModal && (
        <style>{`.modal-backdrop { position: fixed; top: 0; left: 0; z-index: 1040; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); }`}</style>
      )}
    </div>
  );
}

export default SidebarLayout;
