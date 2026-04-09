import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Request.css";
import { useUser } from "./UserContext.jsx";
import CompletedOrderModal from "./CompletedOrderModal.jsx";

// Helper function to get minimum allowed date (4 days from today)
const getMinimumDate = () => {
  const today = new Date();
  today.setDate(today.getDate() + 4);
  return today;
};

// Helper function to format date
const formatDateToString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

function CustomerViewRequests() {
  const navigate = useNavigate();
  const { userData } = useUser();
  const [requests, setRequests] = useState([]);
  const [cancelledRequests, setCancelledRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("number");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notificationActionMenu, setNotificationActionMenu] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deleteToastMessage, setDeleteToastMessage] = useState("");
  const [showCompletedOrderModal, setShowCompletedOrderModal] = useState(false);
  const [selectedCompletedOrder, setSelectedCompletedOrder] = useState(null);

  const dropdownButtonRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const calendarRef = useRef(null);

  const getInitial = (username) => username.charAt(0).toUpperCase();

  useEffect(() => {
    if (requestStatusFilter === "cancelled") {
      fetchCancelledRequests();
    } else {
      fetchRequests();
    }
    fetchNotifications();

    // Listen for request cancellation events to refresh cancelled requests
    const handleRequestCancelled = () => {
      console.log("Request cancelled event received, refreshing...");
      if (requestStatusFilter === "cancelled") {
        fetchCancelledRequests();
      } else {
        // Also refetch active/completed to remove the cancelled request
        fetchRequests();
      }
    };

    window.addEventListener('requestCancelled', handleRequestCancelled);

    return () => {
      window.removeEventListener('requestCancelled', handleRequestCancelled);
    };
  }, [requestStatusFilter]);

  const handleViewCompletedOrder = (task) => {
    // Prepare order data for modal from task
    const orderData = {
      requestId: task.requestId,
      productName: task.productName,
      quantity: task.quantity,
      completedQuota: task.completedQuota || task.quantity,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      requesterName: task.requesterName || 'Unknown',
      dueDate: task.dueDate,
    };
    
    setSelectedCompletedOrder(orderData);
    setShowCompletedOrderModal(true);
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
      // Update local state immediately (optimistic update)
      const updatedNotifications = notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      setNotifications(updatedNotifications);
      const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
      setUnreadCount(newUnreadCount);
      
      // Mark as read on server (fire and forget, don't refetch)
      const response = await fetch(`http://localhost:8000/app/notifications/${notificationId}/read/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Update local state immediately (optimistic update)
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      setNotifications(updatedNotifications);
      const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
      setUnreadCount(newUnreadCount);
      
      setShowDeleteConfirmation(false);
      setNotificationToDelete(null);
      setDeleteToastMessage("Notification deleted successfully");
      
      // Delete on server (fire and forget, don't refetch)
      const response = await fetch(`http://localhost:8000/app/notifications/${notificationId}/delete/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleDeleteNotificationClick = (notificationId) => {
    setNotificationToDelete(notificationId);
    setShowDeleteConfirmation(true);
    setNotificationActionMenu(null);
  };

  const fetchRequests = async () => {
    try {
      // If not a customer, redirect appropriately
      if (userData && userData.role !== "customer") {
        navigate("/request");
        return;
      }

      setLoading(true);

      // For completed tab, fetch both active and completed to show 100% items from active requests
      const statusesToFetch = requestStatusFilter === "completed" 
        ? ["active", "completed"]
        : [requestStatusFilter];

      const allRequests = [];

      for (const status of statusesToFetch) {
        const requestsResponse = await fetch(
          `http://localhost:8000/app/customer/my-requests/?request_status=${status}&t=${Date.now()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store", // Force fresh data
          }
        );

        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          allRequests.push(...(Array.isArray(requestsData) ? requestsData : []));
        }
      }

      if (allRequests.length === 0 && statusesToFetch.length > 0 && !allRequests[0]) {
        setMessage("❌ Failed to load your requests");
        setTimeout(() => setMessage(""), 3000);
      }

      setRequests(allRequests);
    } catch (err) {
      console.error("Error:", err);
      setMessage("❌ Unable to load requests");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchCancelledRequests = async () => {
    try {
      // If not a customer, redirect appropriately
      if (userData && userData.role !== "customer") {
        navigate("/request");
        return;
      }

      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/app/customer/cancelled-requests/`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setMessage("❌ Failed to load cancelled requests");
        setTimeout(() => setMessage(""), 3000);
        setCancelledRequests([]);
        return;
      }

      const data = await response.json();
      setCancelledRequests(data.cancelled_requests || []);
    } catch (err) {
      console.error("Error:", err);
      setMessage("❌ Unable to load cancelled requests");
      setTimeout(() => setMessage(""), 3000);
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



  // Handle click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownMenuRef.current &&
        dropdownButtonRef.current &&
        !dropdownMenuRef.current.contains(event.target) &&
        !dropdownButtonRef.current.contains(event.target)
      ) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationDropdown]);

  // Auto-dismiss delete toast after 3 seconds
  useEffect(() => {
    if (deleteToastMessage) {
      const timer = setTimeout(() => {
        setDeleteToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteToastMessage]);

  const getStatusColor = (status) => {
    if (!status) return "#999";
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes("completed") || normalizedStatus.includes("✅"))
      return "#28a745";
    if (
      normalizedStatus.includes("progress") ||
      normalizedStatus.includes("⏳")
    )
      return "#ffc107";
    if (
      normalizedStatus.includes("started") ||
      normalizedStatus.includes("🚀")
    )
      return "#007bff";
    return "#6c757d";
  };

  const getStatusLabel = (status) => {
    if (!status) return "Not Started";
    if (status.includes("✅")) return "Completed";
    if (status.includes("⏳")) return "In Progress";
    if (status.includes("🚀")) return "Started";
    return "Not Started";
    if (status.includes("⏳")) return "In Progress";
    return "Not Started";
  };

  // Flatten products from all requests for table display
  const flattenedTasks = requestStatusFilter === "cancelled" 
    ? cancelledRequests.map((cancelled) => ({
        requestId: cancelled.request_id,
        productName: cancelled.product_name,
        quantity: cancelled.quantity,
        completedQuota: 0,
        defectCount: 0,
        status: "Cancelled",
        progress: 0,
        dueDate: cancelled.created_at,
        workers: [],
        cancelled_at: cancelled.cancelled_at,
        cancelled_by_name: cancelled.cancelled_by_name,
        cancellation_reason: cancelled.cancellation_reason,
      }))
    : requests.flatMap((request) => {
      // Backend already filters by request_status, no need to filter again

      // Handle both possible field names (request_products from API, product_details from older code)
      const products = request.request_products || request.product_details || [];
      
      return products.map((product) => {
        // Parse progress value - could be "35%" (from backend PST-01 weighted calculation)
        let progressValue = 0;
        if (typeof product.progress === 'string') {
          progressValue = parseFloat(product.progress.replace('%', '')) || 0;
        } else {
          progressValue = parseFloat(product.progress) || 0;
        }
        
        const requestId = request.RequestID || request.request_id;
        const dueDate = request.deadline || request.due_date;
        const createdAt = request.created_at; // Order created date
        const completedAt = product.completed_at; // Product completed date (from serializer)
        
        return {
          requestId: requestId,
          productName: product.product_name,
          quantity: product.quantity,
          completedQuota: product.completed_quota,
          defectCount: product.defect_count,
          status: product.task_status,
          progress: Math.min(Math.max(progressValue, 0), 100), // Ensure between 0-100
          dueDate: dueDate,
          workers: product.workers || [],
          created_at: createdAt,
          completed_at: completedAt
        };
      }).filter((product) => {
        // For active tab: exclude 100% complete items
        if (requestStatusFilter === "active") {
          return product.progress < 100;
        }
        // For completed tab: only show 100% complete items
        if (requestStatusFilter === "completed") {
          return product.progress === 100;
        }
        // For other tabs: show all
        return true;
      });
    });

  // Task status is now controlled by the top tabs only.
  const filteredTasks = flattenedTasks || [];
  
  // Filter by search term
  const finalTasks = filteredTasks.filter((task) => {
    const matchesSearch =
      task.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.requestId.toString().includes(searchTerm);
    return matchesSearch;
  });

  // Sort tasks based on sortBy and sortOrder
  const sortedTasks = useMemo(() => {
    const sorted = [...finalTasks];
    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        const dateA = new Date(a.deadline || 0);
        const dateB = new Date(b.deadline || 0);
        comparison = dateB - dateA;
      } else if (sortBy === "number") {
        const aId = parseInt(a.requestId) || 0;
        const bId = parseInt(b.requestId) || 0;
        comparison = bId - aId;
      } else if (sortBy === "name") {
        const nameA = (a.productName || "").toLowerCase();
        const nameB = (b.productName || "").toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [finalTasks, sortBy, sortOrder]);

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
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "15px", 
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: "6px",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
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
              onClick={() => {
                // If opening the dropdown, clear the badge visually
                if (!showNotificationDropdown) {
                  setUnreadCount(0);
                }
                setShowNotificationDropdown(!showNotificationDropdown);
              }}
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
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: "6px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
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
                {/* Notification Header with Filter */}
                <div style={{ borderBottom: "1px solid #eee" }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#333",
                    }}
                  >
                    Notifications
                  </div>
                  {/* Filter Tabs */}
                  <div
                    style={{
                      display: "flex",
                      borderTop: "1px solid #eee",
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    <button
                      onClick={() => setNotificationFilter("all")}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "none",
                        backgroundColor: notificationFilter === "all" ? "white" : "transparent",
                        color: notificationFilter === "all" ? "#1D6AB7" : "#666",
                        borderBottom: notificationFilter === "all" ? "2px solid #1D6AB7" : "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: notificationFilter === "all" ? "600" : "500",
                        transition: "all 0.2s",
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setNotificationFilter("unread")}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "none",
                        backgroundColor: notificationFilter === "unread" ? "white" : "transparent",
                        color: notificationFilter === "unread" ? "#1D6AB7" : "#666",
                        borderBottom: notificationFilter === "unread" ? "2px solid #1D6AB7" : "none",
                        borderLeft: "1px solid #eee",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: notificationFilter === "unread" ? "600" : "500",
                        transition: "all 0.2s",
                      }}
                    >
                      Unread
                    </button>
                    <button
                      onClick={() => setNotificationFilter("read")}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "none",
                        backgroundColor: notificationFilter === "read" ? "white" : "transparent",
                        color: notificationFilter === "read" ? "#1D6AB7" : "#666",
                        borderBottom: notificationFilter === "read" ? "2px solid #1D6AB7" : "none",
                        borderLeft: "1px solid #eee",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: notificationFilter === "read" ? "600" : "500",
                        transition: "all 0.2s",
                      }}
                    >
                      Read
                    </button>
                  </div>
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
                    {notifications
                      .filter((notification) => {
                        if (notificationFilter === "all") return true;
                        if (notificationFilter === "unread") return !notification.is_read;
                        if (notificationFilter === "read") return notification.is_read;
                        return true;
                      })
                      .map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #eee",
                          backgroundColor: notification.is_read ? "transparent" : "#f0f7ff",
                          cursor: "pointer",
                          position: "relative",
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
                                fontWeight: notification.is_read ? "400" : "700",
                                fontSize: "13px",
                                color: "#000",
                                marginBottom: "4px",
                              }}
                            >
                              {notification.title}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#222",
                                marginBottom: "4px",
                                lineHeight: "1.4",
                              }}
                            >
                              {notification.message}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#666",
                                marginTop: "6px",
                              }}
                            >
                              {new Date(notification.created_at).toLocaleDateString()}{" "}
                              {new Date(notification.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          {/* Action Menu Button (3 dots) */}
                          <div style={{ position: "relative" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotificationActionMenu(
                                  notificationActionMenu === notification.id ? null : notification.id
                                );
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                fontSize: "20px",
                                cursor: "pointer",
                                padding: "0",
                                color: "#999",
                                transition: "color 0.2s",
                              }}
                              onMouseEnter={(e) => (e.target.style.color = "#333")}
                              onMouseLeave={(e) => (e.target.style.color = "#999")}
                            >
                              ⋮
                            </button>
                            {/* Action Menu Dropdown */}
                            {notificationActionMenu === notification.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "28px",
                                  right: 0,
                                  backgroundColor: "white",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                  minWidth: "140px",
                                  zIndex: 1001,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleDeleteNotificationClick(notification.id)}
                                  style={{
                                    width: "100%",
                                    padding: "10px 16px",
                                    border: "none",
                                    background: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    color: "#dc3545",
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
                                  onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
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
                transition: "all 0.3s ease",
              }}
              title={userData.username}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
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
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f5f5";
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
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
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(220, 53, 69, 0.1)";
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <i className="bi bi-box-arrow-right me-2"></i>Logout
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
          {/* Left Side - Sorting Controls */}
          <div
            style={{
              display: "flex",
              gap: "15px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Sort By Dropdown */}
            <div>
              <select
                className="form-select form-select-sm"
                style={{ 
                  width: "180px", 
                  height: "38px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  verticalAlign: "middle",
                }}
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="date">Sort By: Date</option>
                <option value="number">Sort By: Number</option>
                <option value="name">Sort By: Name</option>
              </select>
            </div>

            {/* Sort Order Dropdown */}
            <div>
              <select
                className="form-select form-select-sm"
                style={{ 
                  width: "160px", 
                  height: "38px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  verticalAlign: "middle",
                }}
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="desc">Order: Descending</option>
                <option value="asc">Order: Ascending</option>
              </select>
            </div>
          </div>

          {/* Right Side - Search & Create Request Button */}
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
              placeholder="🔍 Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            

          </div>
        </div>

        {/* Request Status Tabs Bar */}
        <div
          style={{
            marginTop: "20px",
            marginBottom: "0",
            background: "linear-gradient(to right, #f8f9fa 0%, #f5f7fa 100%)",
            borderRadius: "12px 12px 0 0",
            border: "1px solid #dfe6f0",
            borderBottom: "none",
            padding: "12px 16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <style>{`
            @keyframes tabSlideIn {
              from {
                opacity: 0;
                transform: translateX(10px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            .request-status-tab {
              animation: tabSlideIn 0.3s ease-out;
            }
          `}</style>
          {[
            { value: "active", label: "In-Progress Order", color: "#F59E0B" },
            { value: "completed", label: "Completed Order", color: "#10B981" },
            { value: "cancelled", label: "Cancelled Order", color: "#EF4444" },
          ].map((tab) => (
            <button
              key={tab.value}
              className="request-status-tab"
              onClick={() => {
                setRequestStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "12px 24px",
                border: requestStatusFilter === tab.value ? "2px solid " + tab.color : "1px solid " + tab.color + "55",
                borderRadius: "8px",
                background: requestStatusFilter === tab.value
                  ? "linear-gradient(135deg, " + tab.color + " 0%, " + tab.color + "CC 100%)"
                  : "linear-gradient(135deg, " + tab.color + "22 0%, " + tab.color + "14 100%)",
                color: requestStatusFilter === tab.value ? "#ffffff" : tab.color,
                fontWeight: requestStatusFilter === tab.value ? "700" : "600",
                fontSize: "16px",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: requestStatusFilter === tab.value
                  ? "0 8px 18px " + tab.color + "55"
                  : "0 2px 6px " + tab.color + "22",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (requestStatusFilter !== tab.value) {
                  e.currentTarget.style.borderColor = tab.color + "88";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (requestStatusFilter !== tab.value) {
                  e.currentTarget.style.borderColor = tab.color + "55";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: message.includes("❌") ? "#dc3545" : "#ffc107",
              color: message.includes("❌") ? "white" : "#000",
              padding: "14px 20px",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 2000,
              animation: "slideInRight 0.3s ease-out",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            <span>{message}</span>
          </div>
        )}

        {/* Tasks Table with Animation */}
        <div style={{ animation: "fadeInUp 0.4s ease-out" }}>
          <style>{`
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
          {sortedTasks.length === 0 ? (
            <div
              className="alert alert-info"
              role="alert"
              style={{ marginTop: "20px" }}
            >
              {requestStatusFilter === "completed" ? (
                <>
                  <strong>No completed orders yet.</strong> Once tasks are finished,
                  they will appear here.
                </>
              ) : requestStatusFilter === "cancelled" ? (
                <>
                  <strong>No cancelled orders.</strong> Your orders will appear here if cancelled.
                </>
              ) : (
                <>
                  <strong>No orders assigned yet.</strong> Your admin will create and
                  assign orders to you.
                </>
              )}
            </div>
          ) : (
            <>
            {requestStatusFilter === "completed" && (
              <div style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "6px",
                padding: "12px",
                marginBottom: "15px",
                fontSize: "14px",
                color: "#166534"
              }}>
                💡 <strong>Tip:</strong> Click on any completed order to view the order receipt with full details, manufacturing steps, and quality information.
              </div>
            )}
            <table className="data-table">
            <thead>
              <tr>
                {requestStatusFilter === "cancelled" ? (
                  <>
                    <th>Issuance No.</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Cancelled Date</th>
                    <th>Cancelled By</th>
                    <th>Reason</th>
                  </>
                ) : (
                  <>
                    <th>Issuance No.</th>
                    <th>Product</th>
                    <th>Progress Bar</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Deadline Extension</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedTasks
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((task, idx) => (
                <tr 
                  key={idx}
                  onClick={() => {
                    if (requestStatusFilter !== "cancelled" && requestStatusFilter === "completed") {
                      handleViewCompletedOrder(task);
                    }
                  }}
                  style={{
                    cursor: requestStatusFilter === "completed" ? "pointer" : "default",
                    transition: "background-color 0.2s ease",
                    backgroundColor: requestStatusFilter === "completed" ? "rgba(16, 185, 129, 0.05)" : "transparent"
                  }}
                  onMouseEnter={(e) => {
                    if (requestStatusFilter === "completed") {
                      e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (requestStatusFilter === "completed") {
                      e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.05)";
                    }
                  }}
                >
                  {requestStatusFilter === "cancelled" ? (
                    <>
                      <td><strong>{task.requestId}</strong></td>
                      <td>{task.productName}</td>
                      <td>{task.quantity}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(task.cancelled_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td>{task.cancelled_by_name}</td>
                      <td 
                        title={task.cancellation_reason}
                        style={{ 
                          maxWidth: "200px", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {task.cancellation_reason}
                      </td>
                    </>
                  ) : (
                    <>
                      <td><strong>{task.requestId}</strong></td>
                      <td>{task.productName}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ 
                            backgroundColor: "#e0e0e0", 
                            borderRadius: "4px", 
                            width: "100px", 
                            height: "6px", 
                            overflow: "hidden" 
                          }}>
                            <div style={{ 
                              backgroundColor: "#1D6AB7", 
                              height: "100%", 
                              width: `${task.progress}%` 
                            }}></div>
                          </div>
                          {Math.round(task.progress)}%
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block",
                          backgroundColor: getStatusColor(task.status) + "20",
                          color: getStatusColor(task.status),
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: `1px solid ${getStatusColor(task.status)}`,
                        }}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "#666" }}>-</span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            </table>

            {/* Pagination Controls */}
            {Math.ceil(sortedTasks.length / itemsPerPage) > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "20px",
                padding: "15px",
                borderTop: "1px solid #e0e0e0",
                flexWrap: "wrap"
              }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 10px",
                    border: currentPage === 1 ? "1px solid #ddd" : "1px solid #1D6AB7",
                    backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                    color: currentPage === 1 ? "#999" : "#1D6AB7",
                    borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  ◀◀ First
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 10px",
                    border: currentPage === 1 ? "1px solid #ddd" : "1px solid #1D6AB7",
                    backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                    color: currentPage === 1 ? "#999" : "#1D6AB7",
                    borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  ◀ Previous
                </button>

                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {Array.from({ length: Math.ceil(sortedTasks.length / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => {
                      const maxPage = Math.ceil(sortedTasks.length / itemsPerPage);
                      if (maxPage <= 5) return true;
                      if (page === 1 || page === maxPage) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <div key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && <span style={{ color: "#999", padding: "0 4px" }}>...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          style={{
                            padding: "6px 10px",
                            border: currentPage === page ? "1px solid #1D6AB7" : "1px solid #ddd",
                            backgroundColor: currentPage === page ? "#1D6AB7" : "#fff",
                            color: currentPage === page ? "#fff" : "#333",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: currentPage === page ? "600" : "500",
                            fontSize: "12px",
                            minWidth: "32px"
                          }}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedTasks.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(sortedTasks.length / itemsPerPage)}
                  style={{
                    padding: "6px 10px",
                    border: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "1px solid #ddd" : "1px solid #1D6AB7",
                    backgroundColor: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "#f0f0f0" : "#fff",
                    color: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "#999" : "#1D6AB7",
                    borderRadius: "4px",
                    cursor: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  Next ▶
                </button>

                <button
                  onClick={() => setCurrentPage(Math.ceil(sortedTasks.length / itemsPerPage))}
                  disabled={currentPage === Math.ceil(sortedTasks.length / itemsPerPage)}
                  style={{
                    padding: "6px 10px",
                    border: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "1px solid #ddd" : "1px solid #1D6AB7",
                    backgroundColor: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "#f0f0f0" : "#fff",
                    color: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "#999" : "#1D6AB7",
                    borderRadius: "4px",
                    cursor: currentPage === Math.ceil(sortedTasks.length / itemsPerPage) ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  Last ▶▶
                </button>

                <span style={{ color: "#666", fontSize: "12px", marginLeft: "10px" }}>
                  Page {currentPage} of {Math.ceil(sortedTasks.length / itemsPerPage)}
                </span>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Delete Notification Confirmation Modal */}
      {showDeleteConfirmation && (
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
            zIndex: 2000,
          }}
          onClick={() => setShowDeleteConfirmation(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "30px",
              minWidth: "400px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: "15px", fontWeight: "600", color: "#333" }}>
              Delete Notification
            </h5>
            <p style={{ marginBottom: "20px", color: "#666" }}>
              Are you sure you want to delete this notification? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#e9ecef")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteNotification(notificationToDelete)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#c82333")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#dc3545")}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Toast Notification */}
      {deleteToastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#28a745",
            color: "white",
            padding: "14px 20px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 2001,
            animation: "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <span>✓</span>
          <span>{deleteToastMessage}</span>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

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

      {/* Completed Order Details Modal */}
      {showCompletedOrderModal && (
        <CompletedOrderModal 
          orderData={selectedCompletedOrder}
          onClose={() => setShowCompletedOrderModal(false)}
        />
      )}

    </div>
  );
}

export default CustomerViewRequests;
