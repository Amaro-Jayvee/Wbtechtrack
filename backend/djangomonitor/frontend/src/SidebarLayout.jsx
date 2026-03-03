import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Dashboard.css";
import ExtensionApprovalModal from "./ExtensionApprovalModal";
import { useUser } from "./UserContext.jsx";

function SidebarLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, setUserData } = useUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutLoading, setShowLogoutLoading] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [showExtensionApprovalModal, setShowExtensionApprovalModal] = useState(false);
  const [selectedExtensionNotification, setSelectedExtensionNotification] = useState(null);

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
    // Check if user needs to accept terms
    if (userData.terms_accepted === false && userData.role === "customer") {
      setShowTermsModal(true);
    }
    
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
  }, [userData]);

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

  const handleNotificationClick = (notification) => {
    console.log("[SidebarLayout] Notification clicked:", notification.notification_type);
    
    // Handle extension request notifications
    if (notification.notification_type === "extension_requested") {
      console.log("[SidebarLayout] Loading extension approval modal");
      setSelectedExtensionNotification(notification);
      setShowExtensionApprovalModal(true);
      setShowNotificationDropdown(false);
    }
  };

  const handleExtensionApprovalClose = () => {
    setShowExtensionApprovalModal(false);
    setSelectedExtensionNotification(null);
  };

  const handleExtensionApprovalSuccess = async () => {
    console.log("[SidebarLayout] Extension approval/rejection successful");
    await fetchNotifications();
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    // Show loading screen immediately
    setShowLogoutModal(false);
    setShowLogoutLoading(true);
    
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

      // Clear local session data
      sessionStorage.clear();
      localStorage.removeItem("authToken");
      
      // Redirect after delay
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
      setShowLogoutLoading(false);
      alert(err.message || "Error logging out. Please try again.");
    }
  };

  const handleAcceptTerms = async () => {
    setTermsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/app/accept-terms/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.ok) {
        setShowTermsModal(false);
        // User data will be updated in the context when they re-login or page refreshes
      } else {
        console.error("Failed to accept terms:", response.status);
        alert("Failed to accept terms. Please try again.");
      }
    } catch (err) {
      console.error("Error accepting terms:", err);
      alert("Error accepting terms. Please try again.");
    } finally {
      setTermsLoading(false);
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
    if (path === "/task-status") {
      // Show "Customer Requests" for admin, "Task Status" for others
      return userData.role === "admin" ? "Customer Requests" : "Task Status";
    }
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
              {/* Accounts - Only for Admin */}
              {userData.role === "admin" && (
                <Link
                  to="/accounts"
                  className={`sidebar-item ${isActive("/accounts") ? "active" : ""}`}
                  title="Accounts"
                >
                  <img src="/Users.png" alt="Accounts" className="sidebar-icon" />
                </Link>
              )}
              
              {/* Admin - Request Approval (3rd icon) */}
              {userData.role === "admin" && (
                <Link
                  to="/task-status"
                  className={`sidebar-item ${isActive("/task-status") ? "active" : ""}`}
                  title="Request Approval"
                >
                  <img src="/3rd.png" alt="Request Approval" className="sidebar-icon" />
                </Link>
              )}
              
              {/* Production Manager - View Requests (3rd icon) */}
              {userData.role === "production_manager" && (
                <Link
                  to="/request-list"
                  className={`sidebar-item ${isActive("/request") || isActive("/request-list") ? "active" : ""}`}
                  title="View Requests"
                >
                  <img src="/3rd.png" alt="View Requests" className="sidebar-icon" />
                </Link>
              )}
              
              {/* Production Manager - Task Status (4th icon) */}
              {userData.role === "production_manager" && (
                <Link
                  to="/task-status"
                  className={`sidebar-item ${isActive("/task-status") ? "active" : ""}`}
                  title="Task Status"
                >
                  <img src="/4th.png" alt="Task Status" className="sidebar-icon" />
                </Link>
              )}

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
                            cursor: notification.notification_type === "extension_requested" ? "pointer" : "default",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = notification.is_read
                              ? "#f8f9fa"
                              : "#e8f4ff";
                            // Auto-mark as read on hover
                            if (!notification.is_read) {
                              markNotificationRead(notification.id);
                            }
                          }}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = notification.is_read
                              ? "transparent"
                              : "#f0f7ff")
                          }
                          onClick={() => {
                            if (notification.notification_type === "extension_requested") {
                              handleNotificationClick(notification);
                            }
                          }}
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
                                {notification.notification_type === "extension_requested" && (
                                  <i className="bi bi-calendar-check me-1" style={{ color: "#FFA500" }}></i>
                                )}
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
                                {notification.notification_type === "extension_requested" && (
                                  <span style={{ marginLeft: "12px", color: "#1D6AB7", fontWeight: "500" }}>
                                    Click to review
                                  </span>
                                )}
                              </div>
                            </div>
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

      {/* Terms & Agreement Modal */}
      {showTermsModal && (
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      )}
      <div 
        className={`modal fade ${showTermsModal ? "show d-block" : ""}`} 
        tabIndex="-1" 
        role="dialog" 
        aria-hidden={!showTermsModal}
        style={{ zIndex: 1060 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light border-bottom">
              <h5 className="modal-title">
                <i className="bi bi-file-earmark-text me-2"></i>
                Terms & Agreement
              </h5>
            </div>
            <div className="modal-body" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <div style={{ marginBottom: "20px" }}>
                <h6 style={{ fontWeight: "600", marginBottom: "12px", color: "#1D6AB7" }}>
                  Welcome to TechTrack
                </h6>
                <p style={{ color: "#555", lineHeight: "1.6", marginBottom: "12px" }}>
                  Before you can access our system, please review and accept our Terms & Agreement. 
                  These terms govern your use of the TechTrack manufacturing management system.
                </p>
              </div>
              
              <div style={{ backgroundColor: "#f8f9fa", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                <h6 style={{ fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                  Key Terms
                </h6>
                <ul style={{ marginBottom: "0", paddingLeft: "20px", color: "#555", lineHeight: "1.8" }}>
                  <li>You must provide accurate information when creating your account.</li>
                  <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                  <li>You agree to use this system only for authorized business purposes.</li>
                  <li>All data within this system is proprietary and confidential.</li>
                  <li>You will not attempt to access unauthorized resources or information.</li>
                  <li>Violations of these terms may result in immediate account suspension.</li>
                </ul>
              </div>

              <div style={{ backgroundColor: "#fff3cd", padding: "12px", borderRadius: "8px", borderLeft: "4px solid #ffc107" }}>
                <p style={{ margin: "0", color: "#856404", fontSize: "14px" }}>
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>By clicking "I Accept", you agree to comply with all terms and conditions outlined above.</strong>
                </p>
              </div>
            </div>
            <div className="modal-footer border-top bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  // Logout if declining
                  performLogout();
                }}
                disabled={termsLoading}
              >
                Decline & Logout
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAcceptTerms}
                disabled={termsLoading}
                style={{ 
                  backgroundColor: "#1D6AB7", 
                  borderColor: "#1D6AB7",
                  cursor: termsLoading ? "not-allowed" : "pointer"
                }}
              >
                {termsLoading ? (
                  <>
                    <span 
                      className="spinner-border spinner-border-sm me-2" 
                      role="status" 
                      aria-hidden="true"
                    ></span>
                    Accepting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    I Accept
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showTermsModal && (
        <style>{`.modal-backdrop { position: fixed; top: 0; left: 0; z-index: 1050; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); }`}</style>
      )}

      {/* Extension Approval Modal */}
      {showExtensionApprovalModal && selectedExtensionNotification && (
        <ExtensionApprovalModal
          notification={selectedExtensionNotification}
          onClose={handleExtensionApprovalClose}
          onSuccess={handleExtensionApprovalSuccess}
        />
      )}

      {/* Logout Loading Screen */}
      {showLogoutLoading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          animation: "fadeIn 0.3s ease-in-out forwards"
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "30px"
          }}>
            <img 
              src="/Group 1.png" 
              alt="WB Technologies" 
              style={{
                width: "120px",
                animation: "slideDown 0.5s ease-out forwards"
              }}
            />
            <div 
              className="spinner-border text-primary" 
              role="status"
              style={{
                width: "60px",
                height: "60px",
                borderWidth: "5px",
                animation: "spin 1s linear infinite",
                borderColor: "rgba(255,255,255,0.3) rgba(255,255,255,0.3) rgba(255,255,255,0.3) #ffffff"
              }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <h2 style={{
              color: "white",
              fontSize: "28px",
              fontWeight: "bold",
              margin: 0,
              animation: "fadeInUp 0.6s ease-out 0.2s both"
            }}>
              Goodbye!
            </h2>
            <p style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "16px",
              margin: 0,
              animation: "fadeInUp 0.6s ease-out 0.3s both"
            }}>
              Logging you out...
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default SidebarLayout;
