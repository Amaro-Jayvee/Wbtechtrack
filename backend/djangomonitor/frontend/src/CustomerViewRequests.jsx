import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Request.css";
import { useUser } from "./UserContext.jsx";

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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notificationActionMenu, setNotificationActionMenu] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deleteToastMessage, setDeleteToastMessage] = useState("");

  // Create Request Modal state
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [createRequestLoading, setCreateRequestLoading] = useState(false);
  const [createRequestMessage, setCreateRequestMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    product: "",
    quantity: "",
    deadline: "",
  });
  const [products, setProducts] = useState([]);
  const [configuredProducts, setConfiguredProducts] = useState([]);
  const [newProductIds, setNewProductIds] = useState(new Set());
  const [addedProducts, setAddedProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  const [showProductCalendars, setShowProductCalendars] = useState({});

  const pollIntervalRef = useRef(null);
  const dropdownButtonRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const calendarRef = useRef(null);

  const getInitial = (username) => username.charAt(0).toUpperCase();

  useEffect(() => {
    fetchRequests();
    fetchNotifications();

    // Poll for new requests every 2 seconds (more frequent updates)
    pollIntervalRef.current = setInterval(() => {
      fetchRequests();
      fetchNotifications();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
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

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:8000/app/notifications/${notificationId}/delete/`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        fetchNotifications();
        setShowDeleteConfirmation(false);
        setNotificationToDelete(null);
        setDeleteToastMessage("Notification deleted successfully");
      }
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

      // Fetch customer's assigned requests with cache busting
      const requestsResponse = await fetch(
        `http://localhost:8000/app/customer/my-requests/?t=${Date.now()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store", // Force fresh data
        }
      );

      if (!requestsResponse.ok) {
        setMessage("❌ Failed to load your requests");
        setTimeout(() => setMessage(""), 3000);
        setRequests([]);
        return;
      }

      const requestsData = await requestsResponse.json();
      setRequests(Array.isArray(requestsData) ? [...requestsData] : []);
    } catch (err) {
      console.error("Error:", err);
      setMessage("❌ Unable to load requests");
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

  // Create Request handlers
  const fetchProductsForCreateRequest = async () => {
    try {
      const [productsRes, configuredRes] = await Promise.all([
        fetch("http://localhost:8000/app/prodname/", {
          method: "GET",
          credentials: "include",
        }),
        fetch("http://localhost:8000/app/configured-products/", {
          method: "GET",
          credentials: "include",
        }).catch(() => ({ ok: false })),
      ]);

      const productsData = await productsRes.json();
      setProducts(Array.isArray(productsData) ? productsData : []);

      if (configuredRes.ok) {
        const configuredData = await configuredRes.json();
        const processedData = Array.isArray(configuredData) ? configuredData : [];
        const latestIds = new Set(processedData.slice(-3).map(p => p.id)); // Mark last 3 as new
        setConfiguredProducts(processedData);
        setNewProductIds(latestIds);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleCreateRequestClick = () => {
    setShowCreateRequestModal(true);
    fetchProductsForCreateRequest();
    setAddedProducts([]);
    setFormData({ product: "", quantity: "", deadline: "" });
    setCreateRequestMessage("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addProductToRequest = () => {
    if (!formData.product || !formData.quantity || !formData.deadline) {
      setCreateRequestMessage("⚠️ Please fill all fields");
      return;
    }

    // Check if it's a configured product
    const configuredProduct = configuredProducts.find(p => p.id === formData.product);
    if (configuredProduct) {
      const newProduct = {
        product: configuredProduct.id,
        product_name: configuredProduct.prodName,
        quantity: parseInt(formData.quantity),
        deadline_extension: formData.deadline,
        processes: configuredProduct.processes,
      };
      setAddedProducts([...addedProducts, newProduct]);
      setCreateRequestMessage(`✓ Added "${configuredProduct.prodName}" to request`);
      setFormData({ ...formData, product: "", quantity: "", deadline: "" });
      setTimeout(() => setCreateRequestMessage(""), 3000);
      return;
    }

    // Check database product
    const productObj = products.find(p => p.ProdID == formData.product);
    if (!productObj) {
      setCreateRequestMessage("⚠️ Product not found");
      return;
    }

    const newProduct = {
      product: parseInt(formData.product),
      product_name: productObj.prodName,
      quantity: parseInt(formData.quantity),
      deadline_extension: formData.deadline,
    };

    if (addedProducts.some(p => p.product === newProduct.product && !p.processes)) {
      setCreateRequestMessage("⚠️ This product is already added");
      return;
    }

    setAddedProducts([...addedProducts, newProduct]);
    setFormData({ ...formData, product: "", quantity: "", deadline: "" });
    setCreateRequestMessage("");
  };

  const removeProduct = (index) => {
    setAddedProducts(addedProducts.filter((_, i) => i !== index));
  };

  const updateProductQuantity = (index, quantity) => {
    const updated = [...addedProducts];
    updated[index].quantity = parseInt(quantity) || 0;
    setAddedProducts(updated);
  };

  const updateProductDeadline = (index, deadline) => {
    const updated = [...addedProducts];
    updated[index].deadline_extension = deadline;
    setAddedProducts(updated);
  };

  const handleSubmitCreateRequest = async () => {
    if (addedProducts.length === 0) {
      setCreateRequestMessage("⚠️ Please add at least one product");
      return;
    }

    const invalidProducts = addedProducts.filter(p => !p.quantity || !p.deadline_extension);
    if (invalidProducts.length > 0) {
      setCreateRequestMessage("⚠️ All products must have quantity and deadline");
      return;
    }

    setCreateRequestLoading(true);
    try {
      const submissionProducts = addedProducts.map(product => ({
        product: product.product,
        quantity: product.quantity,
        deadline_extension: product.deadline_extension,
      }));

      const requestPayload = {
        requester: userData.id, // Use logged in user ID as requester
        products: submissionProducts,
        deadline: addedProducts[0]?.deadline_extension || new Date().toISOString().split("T")[0],
      };

      const response = await fetch("http://localhost:8000/app/request/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccessModal(true);
        setFormData({ product: "", quantity: "", deadline: "" });
        setAddedProducts([]);
        setTimeout(() => {
          setShowSuccessModal(false);
          setShowCreateRequestModal(false);
          checkAuthAndFetchRequests();
        }, 2000);
      } else {
        let errorMessage = "Failed to create request";
        if (data.detail) errorMessage = data.detail;
        else if (data.error) errorMessage = data.error;
        setCreateRequestMessage(`✗ Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      setCreateRequestMessage("✗ Error submitting request");
    } finally {
      setCreateRequestLoading(false);
    }
  };

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownMenuRef.current &&
        dropdownButtonRef.current &&
        !dropdownMenuRef.current.contains(event.target) &&
        !dropdownButtonRef.current.contains(event.target)
      ) {
        setShowProductDropdown(false);
      }
      
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowDeadlineCalendar(false);
      }
    };

    if (showProductDropdown || showDeadlineCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProductDropdown, showDeadlineCalendar]);

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
  const flattenedTasks = requests.flatMap((request) => {
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
      };
    });
  });

  // Filter tasks
  const filteredTasks = flattenedTasks.filter((task) => {
    if (statusFilter === "all") return true;
    
    const normalizedStatus = task.status.toLowerCase();
    const normalizedFilter = statusFilter.toLowerCase();
    
    // Handle status filters specifically to avoid substring matching issues
    if (normalizedFilter === "not-started") {
      // Match "⚪ not started", "🕒 not started"
      return normalizedStatus.includes("not started");
    }
    
    if (normalizedFilter === "started") {
      // Match "🚀 started" only, NOT "not started"
      return normalizedStatus.includes("🚀") && normalizedStatus.includes("started");
    }
    
    // Handle other filters
    return normalizedStatus.includes(normalizedFilter);
  }) || [];
  
  // Filter by search term
  const finalTasks = filteredTasks.filter((task) => {
    const matchesSearch =
      task.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.requestId.toString().includes(searchTerm);
    return matchesSearch;
  });

  // Sort tasks by Issuance No. (RequestID) in descending order
  const sortedTasks = [...finalTasks].sort((a, b) => {
    const aId = parseInt(a.requestId) || 0;
    const bId = parseInt(b.requestId) || 0;
    return bId - aId; // Descending order (highest first)
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
          {/* Left Side - Status Filter */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Status Dropdown */}
            <div>
              <select
                className="form-select form-select-sm"
                style={{ 
                  width: "150px", 
                  height: "38px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  verticalAlign: "middle",
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="progress">In Progress</option>
                <option value="started">Started</option>
                <option value="not-started">Not Started</option>
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
            
            {/* Create Request Button */}
            <button
              className="btn btn-success btn-sm"
              onClick={handleCreateRequestClick}
              style={{ height: "38px", whiteSpace: "nowrap" }}
            >
              <i className="bi bi-plus-lg me-1"></i> Create Request
            </button>
          </div>
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

        {/* Tasks Table */}
        {sortedTasks.length === 0 ? (
          <div
            className="alert alert-info"
            role="alert"
            style={{ marginTop: "20px" }}
          >
            <strong>No tasks assigned yet.</strong> Your admin will create and
            assign tasks to you.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Issuance No.</th>
                <th>Tasks</th>
                <th>Progress Bar</th>
                <th>Due Date</th>
                <th>Status (Product)</th>
                <th>Deadline Extension</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task, idx) => (
                <tr key={idx}>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

      {/* Create Request Modal */}
      {showCreateRequestModal && (
        <div 
          className="modal-overlay" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 9999,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)"
          }} 
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateRequestModal(false); }}
        >
          <div 
            className="modal-dialog" 
            style={{ 
              backgroundColor: "white", 
              borderRadius: "12px", 
              maxWidth: "900px", 
              width: "95%", 
              maxHeight: "90vh", 
              overflow: "visible",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
              position: "relative"
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="modal-header" 
              style={{ 
                backgroundColor: "transparent",
                padding: "2rem 2.5rem",
                borderBottom: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <h2 
                className="modal-title" 
                style={{ 
                  color: "#1a1a1a",
                  marginBottom: 0,
                  fontSize: "1.8rem",
                  fontWeight: "600",
                  letterSpacing: "-0.5px"
                }}
              >
                Create Request
              </h2>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowCreateRequestModal(false)}
                aria-label="Close"
                style={{ 
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  color: "#666",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e9ecef";
                  e.currentTarget.style.color = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f5f5";
                  e.currentTarget.style.color = "#666";
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitCreateRequest(); }}>
              <div className="modal-body" style={{ padding: "0 2.5rem 2rem 2.5rem", maxHeight: "calc(90vh - 200px)", overflowY: "auto", overflowX: "visible" }}>
                {/* Alert Message */}
                {createRequestMessage && (
                  <div 
                    className={`alert ${createRequestMessage.includes("✓") ? "alert-success" : "alert-danger"} mb-4`} 
                    role="alert"
                    style={{
                      borderRadius: "8px",
                      border: "none",
                      padding: "1rem 1.25rem",
                      fontSize: "0.95rem"
                    }}
                  >
                    {createRequestMessage}
                  </div>
                )}

                {/* Products Section */}
                <h6 
                  className="text-uppercase fw-700 text-muted small mb-3" 
                  style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}
                >
                  <i className="bi bi-box-seam-fill me-2"></i> Add Products with Quantity & Deadline
                </h6>
                <div className="row g-3 mb-4" style={{ overflow: "visible" }}>
                  <div className="col-md-5">
                    <label htmlFor="product" className="form-label fw-600 mb-2" style={{ fontSize: "0.95rem", color: "#333" }}>
                      Product Name
                    </label>
                    <div style={{ position: "relative" }}>
                      <button
                        ref={dropdownButtonRef}
                        type="button"
                        className="form-control text-start d-flex justify-content-between align-items-center"
                        onClick={() => setShowProductDropdown(!showProductDropdown)}
                        style={{
                          backgroundColor: "white",
                          color: formData.product ? "#1a1a1a" : "#999",
                          padding: "0.65rem 1rem",
                          cursor: "pointer",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "0.95rem",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#bbb"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#ddd"}
                      >
                        <span>
                          {formData.product
                            ? configuredProducts.find(p => p.id === formData.product)?.prodName ||
                              products.find(p => p.ProdID == formData.product)?.prodName ||
                              "-- Select Product --"
                            : "-- Select Product --"}
                        </span>
                        <i className={`bi bi-chevron-${showProductDropdown ? 'up' : 'down'}`}></i>
                      </button>

                      {showProductDropdown && (
                        <div
                          ref={dropdownMenuRef}
                          className="product-dropdown-menu"
                        >
                          {products.map((p) => (
                            <button
                              key={`db-${p.ProdID}`}
                              type="button"
                              className={`dropdown-item ${formData.product == p.ProdID ? "active" : ""}`}
                              onClick={() => {
                                setFormData({ ...formData, product: p.ProdID });
                                setShowProductDropdown(false);
                              }}
                            >
                              {p.prodName}
                            </button>
                          ))}

                          {configuredProducts
                            .filter((cp) => !products.some((p) => p.prodName === cp.prodName))
                            .map((p) => (
                              <button
                                key={`config-${p.id}`}
                                type="button"
                                className={`dropdown-item ${formData.product === p.id ? "active" : ""}`}
                                onClick={() => {
                                  setFormData({ ...formData, product: p.id });
                                  setShowProductDropdown(false);
                                }}
                              >
                                {p.prodName}
                                {newProductIds.has(p.id) && (
                                  <span style={{ marginLeft: "8px", color: "#22863a", fontSize: "0.85rem", fontWeight: "600" }}>
                                    ✨ NEW
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-2">
                    <label htmlFor="quantity" className="form-label fw-600 mb-2" style={{ fontSize: "0.95rem", color: "#333" }}>
                      Quantity
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleFormChange}
                      placeholder="0"
                      min="1"
                      className="form-control"
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "0.65rem 1rem",
                        fontSize: "0.95rem",
                        transition: "all 0.2s ease"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#999"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#ddd"}
                    />
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="deadline" className="form-label fw-600 mb-2" style={{ fontSize: "0.95rem", color: "#333" }}>
                      Deadline
                    </label>
                    <div className="calendar-container" ref={calendarRef}>
                      <button
                        type="button"
                        className="form-control date-input-btn"
                        onClick={() => setShowDeadlineCalendar(!showDeadlineCalendar)}
                        style={{
                          textAlign: 'left',
                          backgroundColor: 'white',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          padding: "0.65rem 1rem",
                          fontSize: "0.95rem",
                          color: formData.deadline ? "#1a1a1a" : "#999",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#bbb"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#ddd"}
                      >
                        <span>{formData.deadline ? formatDateToString(formData.deadline) : 'Select deadline...'}</span>
                        <i className={`bi bi-calendar3 ${showDeadlineCalendar ? 'rotate-calendar' : ''}`}></i>
                      </button>
                      {showDeadlineCalendar && (
                        <div className="calendar-popup">
                          <Calendar
                            value={formData.deadline ? new Date(formData.deadline) : null}
                            onChange={(date) => {
                              setFormData({ ...formData, deadline: formatDateToString(date) });
                              setShowDeadlineCalendar(false);
                            }}
                            minDate={getMinimumDate()}
                            tileDisabled={({ date }) => date < getMinimumDate()}
                            className="custom-calendar"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-2 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn w-100"
                      onClick={addProductToRequest}
                      disabled={createRequestLoading}
                      style={{
                        padding: "0.65rem 1.5rem",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: createRequestLoading ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        fontSize: "0.95rem",
                        opacity: createRequestLoading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!createRequestLoading) e.currentTarget.style.backgroundColor = "#0056b3";
                      }}
                      onMouseLeave={(e) => {
                        if (!createRequestLoading) e.currentTarget.style.backgroundColor = "#007bff";
                      }}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Add
                    </button>
                  </div>
                </div>

                {/* Products List Section */}
                {addedProducts.length > 0 && (
                  <>
                    <div className="border-top my-4" style={{ borderColor: "#f0f0f0" }}></div>
                    <h6 
                      className="text-uppercase fw-700 text-muted small mb-3"
                      style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}
                    >
                      <i className="bi bi-list-check text-info me-2"></i>
                      Products Added <span className="badge bg-info" style={{ fontSize: "0.7rem" }}>{addedProducts.length}</span>
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-hover mb-0" style={{ fontSize: "0.95rem" }}>
                        <thead className="table-light" style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #f0f0f0" }}>
                          <tr>
                            <th className="fw-700" style={{ color: "#666", paddingTop: "1rem", paddingBottom: "1rem" }}>Product</th>
                            <th className="fw-700" style={{ color: "#666", paddingTop: "1rem", paddingBottom: "1rem" }}>Quantity</th>
                            <th className="fw-700" style={{ color: "#666", paddingTop: "1rem", paddingBottom: "1rem" }}>Deadline</th>
                            <th className="fw-700 text-center" style={{ color: "#666", paddingTop: "1rem", paddingBottom: "1rem", width: "80px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {addedProducts.map((product, index) => (
                            <tr key={index} className="align-middle" style={{ borderBottom: "1px solid #f0f0f0" }}>
                              <td className="fw-500" style={{ color: "#333", paddingTop: "1rem", paddingBottom: "1rem" }}>{product.product_name}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  style={{ width: "80px" }}
                                  value={product.quantity || ""}
                                  onChange={(e) => updateProductQuantity(index, e.target.value)}
                                  placeholder="Qty"
                                  min="1"
                                />
                              </td>
                              <td>
                                <div className="calendar-container-sm">
                                  <button
                                    type="button"
                                    className="form-control form-control-sm date-input-btn"
                                    onClick={() => setShowProductCalendars({ ...showProductCalendars, [index]: !showProductCalendars[index] })}
                                    style={{
                                      width: "120px",
                                      textAlign: 'left',
                                      backgroundColor: 'white',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '0.35rem 0.5rem'
                                    }}
                                  >
                                    <span style={{ fontSize: '0.8rem' }}>{product.deadline_extension ? formatDateToString(product.deadline_extension) : 'Pick'}</span>
                                    <i className="bi bi-calendar3" style={{ fontSize: '0.85rem' }}></i>
                                  </button>
                                  {showProductCalendars[index] && (
                                    <div className="calendar-popup-sm">
                                      <Calendar
                                        value={product.deadline_extension ? new Date(product.deadline_extension) : null}
                                        onChange={(date) => {
                                          updateProductDeadline(index, formatDateToString(date));
                                          setShowProductCalendars({ ...showProductCalendars, [index]: false });
                                        }}
                                        minDate={getMinimumDate()}
                                        tileDisabled={({ date }) => date < getMinimumDate()}
                                        className="custom-calendar"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeProduct(index)}
                                  disabled={createRequestLoading}
                                  title="Remove this product"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div 
                className="modal-footer" 
                style={{ 
                  padding: "2rem 2.5rem",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "1rem",
                  backgroundColor: "#fafafa"
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCreateRequestModal(false)}
                  disabled={createRequestLoading}
                  style={{
                    padding: "0.625rem 1.5rem",
                    border: "1px solid #ddd",
                    backgroundColor: "white",
                    color: "#666",
                    borderRadius: "6px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontSize: "0.95rem"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#ccc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                    e.currentTarget.style.borderColor = "#ddd";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRequestLoading || addedProducts.length === 0}
                  style={{
                    padding: "0.625rem 2rem",
                    backgroundColor: createRequestLoading || addedProducts.length === 0 ? "#ccc" : "#1a1a1a",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: createRequestLoading || addedProducts.length === 0 ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                  onMouseEnter={(e) => {
                    if (!createRequestLoading && addedProducts.length > 0) {
                      e.currentTarget.style.backgroundColor = "#333";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!createRequestLoading && addedProducts.length > 0) {
                      e.currentTarget.style.backgroundColor = "#1a1a1a";
                    }
                  }}
                >
                  {createRequestLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "14px", height: "14px" }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle"></i>
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="modal d-block"
          style={{ 
            backgroundColor: "rgba(0, 0, 0, 0.5)", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title"><i className="bi bi-check-circle me-2"></i>Request Created Successfully</h5>
              </div>
              <div className="modal-body">
                <p>Your request has been submitted successfully.</p>
                <p>You will see it in your request list shortly.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerViewRequests;
