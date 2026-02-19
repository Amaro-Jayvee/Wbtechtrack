import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Request.css";

function CustomerViewRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userData, setUserData] = useState({ username: "", role: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const getInitial = (username) => username.charAt(0).toUpperCase();

  useEffect(() => {
    checkAuthAndFetchRequests();
    fetchNotifications();
  }, []);

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
      await fetch(`http://localhost:8000/app/notifications/${notificationId}/read/`, {
        method: "POST",
        credentials: "include",
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const checkAuthAndFetchRequests = async () => {
    try {
      const userResponse = await fetch("http://localhost:8000/app/whoami/", {
        method: "GET",
        credentials: "include",
      });

      if (!userResponse.ok) {
        navigate("/login");
        return;
      }

      const userData = await userResponse.json();
      setUserData({
        username: userData.username,
        role: userData.role,
      });

      // If not a customer, redirect appropriately
      if (userData.role !== "customer") {
        navigate("/request");
        return;
      }

      // Fetch customer's assigned requests
      const requestsResponse = await fetch(
        "http://localhost:8000/app/customer/my-requests/",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!requestsResponse.ok) {
        setMessage("Failed to load your requests");
        setRequests([]);
        return;
      }

      const requestsData = await requestsResponse.json();
      console.log("[CustomerViewRequests] Loaded requests:", requestsData);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err) {
      console.error("Error:", err);
      setMessage("Unable to load requests");
    } finally {
      setLoading(false);
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
        throw new Error("Logout failed");
      }

      sessionStorage.clear();
      localStorage.removeItem("authToken");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
      alert("Error logging out");
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "#999";
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes("done") || normalizedStatus.includes("✅"))
      return "#28a745";
    if (
      normalizedStatus.includes("progress") ||
      normalizedStatus.includes("⏳")
    )
      return "#ffc107";
    return "#6c757d";
  };

  const getStatusLabel = (status) => {
    if (!status) return "Not Started";
    if (status.includes("✅")) return "Done";
    if (status.includes("⏳")) return "In Progress";
    return "Not Started";
  };

  // Flatten products from all requests for table display
  const flattenedTasks = requests.flatMap((request) =>
    (request.product_details || []).map((product) => {
      // Parse progress value - could be "24.0%" or 24 or 0
      let progressValue = 0;
      if (typeof product.progress === 'string') {
        progressValue = parseFloat(product.progress.replace('%', '')) || 0;
      } else {
        progressValue = parseFloat(product.progress) || 0;
      }
      
      return {
        requestId: request.request_id,
        productName: product.product_name,
        quantity: product.quantity,
        completedQuota: product.completed_quota,
        defectCount: product.defect_count,
        status: product.task_status,
        progress: Math.min(Math.max(progressValue, 0), 100), // Ensure between 0-100
        dueDate: request.due_date,
        workers: product.workers || [],
      };
    })
  );

  // Filter tasks
  const filteredTasks = flattenedTasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" || task.status.includes(statusFilter);
    const matchesSearch =
      task.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.requestId.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
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
              className="btn btn-notification"
              title="Notifications"
              style={{
                position: "relative",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "20px",
              }}
            >
              <i className="bi bi-bell-fill"></i>
              {unreadCount > 0 && (
                <span className="notification-badge">
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
              title={userData.username}
            >
              {getInitial(userData.username)}
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
                  {getInitial(userData.username)}
                </div>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ fontWeight: "600", color: "#333" }}>
                    {userData.username}
                  </div>
                  <div style={{ color: "#999", fontSize: "12px" }}>
                    {userData.role}
                  </div>
                </div>
              </div>

              {/* Settings Option */}
              <button
                onClick={() => {
                  navigate("/customer/settings");
                  setShowProfileDropdown(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "#333",
                  borderBottom: "1px solid #eee",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.backgroundColor = "#f5f5f5")
                }
                onMouseLeave={(e) =>
                  (e.target.backgroundColor = "transparent")
                }
              >
                ⚙️ Settings
              </button>

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

      {/* Main Content */}
      <div style={{ padding: "30px" }}>
        {/* Filters Bar */}
        <div
          style={{
            padding: "15px 0",
            marginBottom: "20px",
            display: "flex",
            gap: "20px",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          {/* Left Side - Filters */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* All Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-sm"
                style={{
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  padding: "8px 12px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                All ▼
              </button>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                className="form-select form-select-sm"
                style={{ 
                  width: "120px", 
                  height: "38px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  verticalAlign: "middle",
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Status</option>
                <option value="done">Done</option>
                <option value="progress">In Progress</option>
                <option value="started">Not Started</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <button
                className="btn btn-sm"
                style={{
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  padding: "8px 12px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                📅 Date Range
              </button>
            </div>

            {/* Filter Icon */}
            <button
              className="btn btn-sm"
              style={{
                border: "1px solid #ddd",
                backgroundColor: "white",
                padding: "8px 12px",
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "38px",
              }}
            >
              ⚙️
            </button>
          </div>

          {/* Right Side - Search */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flex: 1,
              justifyContent: "flex-end",
              minWidth: "250px",
            }}
          >
            {/* Search Box */}
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ flex: 1, minWidth: "200px", maxWidth: "300px", height: "38px" }}
              placeholder="🔍 Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className="alert alert-warning" role="alert">
            {message}
          </div>
        )}

        {/* Tasks Table */}
        {filteredTasks.length === 0 ? (
          <div
            className="alert alert-info"
            role="alert"
            style={{ marginTop: "20px" }}
          >
            <strong>No tasks assigned yet.</strong> Your admin will create and
            assign tasks to you.
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <table
              className="table table-hover"
              style={{ marginBottom: 0 }}
            >
              <thead
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #dee2e6",
                }}
              >
                <tr>
                  <th style={{ padding: "12px", fontWeight: "600" }}>ID</th>
                  <th style={{ padding: "12px", fontWeight: "600" }}>Tasks</th>
                  <th style={{ padding: "12px", fontWeight: "600" }}>
                    Progress Bar
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600" }}>
                    Assigned to
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600" }}>
                    Due Date
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600" }}>
                    Status (Product)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600" }}>
                    Deadline Extension
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      <strong>{task.requestId}</strong>
                    </td>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      {task.productName}
                    </td>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "200px",
                            height: "28px",
                            backgroundColor: "#e9ecef",
                            borderRadius: "20px",
                            overflow: "hidden",
                            border: "none",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              height: "100%",
                              width: `${task.progress}%`,
                              backgroundColor: "#28a745",
                              transition: "width 0.3s ease",
                              borderRadius: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {task.progress > 10 && (
                              <span style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>
                                {Math.round(task.progress)}%
                              </span>
                            )}
                          </div>
                          {task.progress <= 10 && (
                            <span style={{ 
                              position: "absolute", 
                              fontSize: "13px", 
                              fontWeight: "700", 
                              color: "#666",
                              left: "8px",
                              top: "50%",
                              transform: "translateY(-50%)"
                            }}>
                              {Math.round(task.progress)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      {task.workers && task.workers.length > 0
                        ? task.workers.map(w => w.name).join(", ")
                        : "Not Assigned"}
                    </td>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      {new Date(task.dueDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor:
                            getStatusColor(task.status) + "20",
                          color: getStatusColor(task.status),
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: `1px solid ${getStatusColor(task.status)}`,
                        }}
                      >
                        {getStatusLabel(task.status)}
                      </span>
                    </td>
                    <td style={{ padding: "12px", verticalAlign: "middle" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>-</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "30px",
              minWidth: "400px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h5 style={{ marginBottom: "15px", fontWeight: "600" }}>
              Confirm Logout
            </h5>
            <p style={{ marginBottom: "20px", color: "#666" }}>
              Are you sure you want to log out?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={performLogout}
                disabled={isLoggingOut}
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

export default CustomerViewRequests;
