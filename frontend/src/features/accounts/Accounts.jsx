import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../shared/components/SidebarLayout";
import { useUser } from "../../shared/context/UserContext.jsx";
import "../../features/dashboard/Dashboard.css";

function Accounts() {
  const navigate = useNavigate();
  const { userData } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  
  // Pending signups state
  const [pendingSignups, setPendingSignups] = useState([]);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedSignup, setSelectedSignup] = useState(null);
  const [signupActionLoading, setSignupActionLoading] = useState(false);
  const [signupActionMessage, setSignupActionMessage] = useState("");
  const [signupReviewNotes, setSignupReviewNotes] = useState("");
  
  // Active account detail state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState("active"); // "active" or "pending"
  
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    full_name: "",
    company_name: "",
    contact_number: ""
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  // Fetch active accounts
  useEffect(() => {
    // Redirect production managers away from accounts page
    if (userData.role === "production_manager") {
      navigate("/task-status");
    }
    fetchAccounts();
    fetchPendingSignups();
  }, [userData.role, navigate]);

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response = await fetch("/app/users/?status=active", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(Array.isArray(data) ? data : data.results || []);
      } else {
        console.error("Failed to fetch accounts:", response.status);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchPendingSignups = async () => {
    setSignupsLoading(true);
    try {
      const response = await fetch("/app/pending-signups/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingSignups(Array.isArray(data) ? data : data.results || []);
      } else {
        console.error("Failed to fetch pending signups:", response.status);
      }
    } catch (err) {
      console.error("Error fetching pending signups:", err);
    } finally {
      setSignupsLoading(false);
    }
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMessage("");

    try {
      const response = await fetch("/app/create-customer/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateMessage("Customer account created successfully! Welcome email has been sent.");
        setCreateForm({
          username: "",
          email: "",
          full_name: "",
          company_name: "",
          contact_number: ""
        });
        setShowCreateModal(false);
        setShowSuccessModal(true);
        
        setTimeout(() => {
          setShowSuccessModal(false);
          setCreateMessage("");
          fetchAccounts(); // Refresh accounts list
        }, 3000);
      } else {
        setCreateMessage(`Error: ${data.error || "Failed to create account"}`);
      }
    } catch (err) {
      console.error("Error creating customer:", err);
      setCreateMessage("Network error: Failed to create account");
    } finally {
      setCreateLoading(false);
    }
  };

  const closeModal = () => {
    if (!createLoading) {
      setShowCreateModal(false);
      setCreateMessage("");
      setCreateForm({
        username: "",
        email: "",
        full_name: "",
        company_name: "",
        contact_number: ""
      });
    }
  };

  const openSignupModal = (signup) => {
    setSelectedSignup(signup);
    setSignupReviewNotes("");
    setSignupActionMessage("");
    setShowSignupModal(true);
  };

  const openAccountModal = (account) => {
    setSelectedAccount(account);
    setShowAccountModal(true);
  };

  const closeAccountModal = () => {
    setShowAccountModal(false);
    setSelectedAccount(null);
  };

  const closeSignupModal = () => {
    if (!signupActionLoading) {
      setShowSignupModal(false);
      setSelectedSignup(null);
      setSignupReviewNotes("");
      setSignupActionMessage("");
    }
  };

  const handleApproveSignup = async () => {
    if (!selectedSignup) return;
    
    setSignupActionLoading(true);
    setSignupActionMessage("");
    try {
      const response = await fetch(`/app/signups/${selectedSignup.id}/approve/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ review_notes: signupReviewNotes }),
      });

      const data = await response.json();

      if (response.ok) {
        setSignupActionMessage(`✅ Signup approved! Account created for ${data.username}`);
        setTimeout(() => {
          closeSignupModal();
          fetchPendingSignups();
          fetchAccounts();
        }, 2000);
      } else {
        setSignupActionMessage(`❌ Error: ${data.detail || "Failed to approve signup"}`);
      }
    } catch (err) {
      console.error("Error approving signup:", err);
      setSignupActionMessage("❌ Network error: Failed to approve signup");
    } finally {
      setSignupActionLoading(false);
    }
  };

  const handleDeclineSignup = async () => {
    if (!selectedSignup) return;
    
    setSignupActionLoading(true);
    setSignupActionMessage("");
    try {
      const response = await fetch(`/app/signups/${selectedSignup.id}/decline/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ review_notes: signupReviewNotes }),
      });

      const data = await response.json();

      if (response.ok) {
        setSignupActionMessage(`✅ Signup declined. Notification would be sent to ${data.username}`);
        setTimeout(() => {
          closeSignupModal();
          fetchPendingSignups();
        }, 2000);
      } else {
        setSignupActionMessage(`❌ Error: ${data.detail || "Failed to decline signup"}`);
      }
    } catch (err) {
      console.error("Error declining signup:", err);
      setSignupActionMessage("❌ Network error: Failed to decline signup");
    } finally {
      setSignupActionLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="container-lg py-5">

        {/* Tab Buttons */}
        <div className="row mb-4">
          <div className="col-md-12">
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={() => {
                  setViewMode("active");
                  fetchAccounts();
                }}
                style={{
                  backgroundColor: viewMode === "active" ? "#1D6AB7" : "#f0f0f0",
                  color: viewMode === "active" ? "white" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: viewMode === "active" ? "0 2px 8px rgba(29, 106, 183, 0.2)" : "none"
                }}
                onMouseEnter={(e) => viewMode !== "active" && (e.target.style.backgroundColor = "#e0e0e0")}
                onMouseLeave={(e) => viewMode !== "active" && (e.target.style.backgroundColor = "#f0f0f0")}
              >
                Active Accounts
              </button>
              {userData.role === "admin" && (
                <button
                  onClick={() => {
                    setViewMode("pending");
                    fetchPendingSignups();
                  }}
                  style={{
                    backgroundColor: viewMode === "pending" ? "#1D6AB7" : "#f0f0f0",
                    color: viewMode === "pending" ? "white" : "#333",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: viewMode === "pending" ? "0 2px 8px rgba(29, 106, 183, 0.2)" : "none",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => viewMode !== "pending" && (e.target.style.backgroundColor = "#e0e0e0")}
                  onMouseLeave={(e) => viewMode !== "pending" && (e.target.style.backgroundColor = "#f0f0f0")}
                >
                  Pending Signup Requests
                  {pendingSignups.length > 0 && (
                    <span style={{
                      backgroundColor: "#ff6b6b",
                      color: "white",
                      borderRadius: "50%",
                      padding: "2px 8px",
                      marginLeft: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      display: "inline-block",
                      minWidth: "24px",
                      textAlign: "center"
                    }}>
                      {pendingSignups.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Accounts Table */}
        {viewMode === "active" && (
          <div className="row">
            <div className="col-md-12">
              <div 
                className="card shadow-lg border-0"
                style={{
                  borderTop: "4px solid #1D6AB7",
                  borderRadius: "12px"
                }}
              >
                <div className="card-body p-4">
                  {accountsLoading ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div className="spinner-border" role="status" style={{ color: "#1D6AB7" }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : accounts.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Full Name</th>
                            <th>Company</th>
                            <th>Contact</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account, idx) => (
                            <tr 
                              key={idx}
                              onClick={() => openAccountModal(account)}
                              style={{
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                backgroundColor: "transparent"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f8ff"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <td style={{ whiteSpace: "nowrap" }}>{account.username}</td>
                              <td>{account.email}</td>
                              <td>{account.full_name || "-"}</td>
                              <td>{account.company_name || "-"}</td>
                              <td>{account.contact_number || "-"}</td>
                              <td>
                                <span style={{
                                  display: "inline-block",
                                  backgroundColor: account.is_active ? "#d4edda" : "#f8d7da",
                                  color: account.is_active ? "#155724" : "#721c24",
                                  padding: "4px 12px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  border: account.is_active ? "1px solid #155724" : "1px solid #721c24"
                                }}>
                                  {account.is_active ? "Active" : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
                      <p style={{ fontSize: "16px" }}>No active accounts yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Signups Table */}
        {viewMode === "pending" && userData.role === "admin" && (
          <div className="row">
            <div className="col-md-12">
              <div 
                className="card shadow-lg border-0"
                style={{
                  borderTop: "4px solid #1D6AB7",
                  borderRadius: "12px"
                }}
              >
                <div className="card-body p-4">
                  {signupsLoading ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div className="spinner-border" role="status" style={{ color: "#1D6AB7" }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : pendingSignups.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Full Name</th>
                            <th>Company</th>
                            <th>Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingSignups.map((signup, idx) => (
                            <tr 
                              key={idx}
                              onClick={() => openSignupModal(signup)}
                              style={{
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                backgroundColor: "transparent"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f8ff"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <td style={{ whiteSpace: "nowrap" }}>{signup.username}</td>
                              <td>{signup.email}</td>
                              <td>{signup.full_name || "-"}</td>
                              <td>{signup.company_name || "-"}</td>
                              <td>{new Date(signup.created_at).toLocaleDateString()}</td>
                              <td>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSignupModal(signup);
                                  }}
                                  style={{
                                    backgroundColor: "transparent",
                                    color: "#333",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    padding: "6px 10px",
                                    fontSize: "18px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: "32px",
                                    minHeight: "32px",
                                    transition: "all 0.3s ease"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#f0f0f0";
                                    e.target.style.borderColor = "#1D6AB7";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "transparent";
                                    e.target.style.borderColor = "#ddd";
                                  }}
                                >
                                  ...
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
                      <p style={{ fontSize: "16px" }}>No pending signup requests. All signups have been reviewed!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signup Review Modal */}
      {showSignupModal && selectedSignup && userData.role === "admin" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease"
          }}
        >
          <div
            className="card shadow-lg border-0"
            style={{
              borderRadius: "12px",
              width: "520px",
              maxWidth: "90%",
              maxHeight: "85vh",
              overflow: "hidden",
              animation: "slideUp 0.3s ease",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header border-0 p-4" style={{ 
              borderBottom: "none",
              backgroundColor: "#EBF4FF",
              background: "linear-gradient(135deg, #EBF4FF 0%, #F5FAFF 100%)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "#1D6AB7", fontWeight: "700", fontSize: "20px" }}>Review Signup Request</h3>
                <button
                  onClick={closeSignupModal}
                  disabled={signupActionLoading}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "28px",
                    color: "#1D6AB7",
                    cursor: signupActionLoading ? "not-allowed" : "pointer",
                    opacity: signupActionLoading ? 0.5 : 1,
                    padding: "0",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => !signupActionLoading && (e.target.style.color = "#0d4a7f")}
                  onMouseLeave={(e) => !signupActionLoading && (e.target.style.color = "#1D6AB7")}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="card-body p-4" style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ backgroundColor: "#fff3cd", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#856404" }}>
                  <strong>Note:</strong> Review the information below. Approve to create the account or decline to reject the signup.
                </p>
              </div>

              {/* Signup Details */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Username</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    {selectedSignup.username}
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Email</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    {selectedSignup.email}
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Full Name</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    {selectedSignup.full_name}
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Company</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    {selectedSignup.company_name}
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Contact Number</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    {selectedSignup.contact_number}
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Role</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    <span style={{
                      textTransform: "capitalize",
                      backgroundColor: "#e3f2fd",
                      color: "#1976d2",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {selectedSignup.role}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "5px" }}>Submitted On</label>
                  <div style={{ padding: "10px 12px", backgroundColor: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
                    {new Date(selectedSignup.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", color: "#333", marginBottom: "8px" }}>Review Notes</label>
                <textarea
                  value={signupReviewNotes}
                  onChange={(e) => setSignupReviewNotes(e.target.value)}
                  disabled={signupActionLoading}
                  placeholder="Add notes for your decision (optional)"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    minHeight: "80px"
                  }}
                />
              </div>

              {signupActionMessage && (
                <div
                  className={`alert ${signupActionMessage.includes("✅") ? "alert-success" : "alert-danger"}`}
                  role="alert"
                  style={{
                    marginBottom: "15px",
                    borderRadius: "8px"
                  }}
                >
                  {signupActionMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleDeclineSignup}
                  disabled={signupActionLoading}
                  style={{
                    flex: 1,
                    backgroundColor: "#f8d7da",
                    color: "#721c24",
                    border: "1px solid #f5c6cb",
                    borderRadius: "8px",
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: signupActionLoading ? "not-allowed" : "pointer",
                    opacity: signupActionLoading ? 0.5 : 1,
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => !signupActionLoading && (e.target.style.backgroundColor = "#f5c6cb")}
                  onMouseLeave={(e) => !signupActionLoading && (e.target.style.backgroundColor = "#f8d7da")}
                >
                  {signupActionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    "Decline"
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeSignupModal}
                  disabled={signupActionLoading}
                  style={{
                    flex: 1,
                    backgroundColor: "#f0f0f0",
                    color: "#333",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: signupActionLoading ? "not-allowed" : "pointer",
                    opacity: signupActionLoading ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveSignup}
                  disabled={signupActionLoading}
                  style={{
                    flex: 1,
                    backgroundColor: signupActionLoading ? "#a0b4d1" : "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: signupActionLoading ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(40, 167, 69, 0.2)"
                  }}
                  onMouseEnter={(e) => !signupActionLoading && (e.target.style.backgroundColor = "#218838")}
                  onMouseLeave={(e) => !signupActionLoading && (e.target.style.backgroundColor = "#28a745")}
                >
                  {signupActionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    "Approve"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Detail Modal */}
      {showAccountModal && selectedAccount && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
              animation: "slideUp 0.3s ease"
            }}
          >
            <h2 style={{ color: "#1D6AB7", marginBottom: "20px", fontSize: "22px" }}>
              Account Details
            </h2>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>Username:</label>
              <p style={{ margin: "5px 0", color: "#666" }}>{selectedAccount.username}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>Email:</label>
              <p style={{ margin: "5px 0", color: "#666" }}>{selectedAccount.email}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>Full Name:</label>
              <p style={{ margin: "5px 0", color: "#666" }}>{selectedAccount.full_name || "-"}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>Company:</label>
              <p style={{ margin: "5px 0", color: "#666" }}>{selectedAccount.company_name || "-"}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>Contact Number:</label>
              <p style={{ margin: "5px 0", color: "#666" }}>{selectedAccount.contact_number || "-"}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}>Status:</label>
              <p style={{ margin: "5px 0" }}>
                <span style={{
                  display: "inline-block",
                  backgroundColor: selectedAccount.is_active ? "#d4edda" : "#f8d7da",
                  color: selectedAccount.is_active ? "#155724" : "#721c24",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: selectedAccount.is_active ? "1px solid #155724" : "1px solid #721c24"
                }}>
                  {selectedAccount.is_active ? "Active" : "Inactive"}
                </span>
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={closeAccountModal}
                style={{
                  flex: 1,
                  backgroundColor: "#f0f0f0",
                  color: "#333",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#e0e0e0"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#f0f0f0"}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </SidebarLayout>
  );
}

export default Accounts;
