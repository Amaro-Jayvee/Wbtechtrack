import React, { useState, useEffect } from "react";
import SidebarLayout from "./SidebarLayout";
import "./Dashboard.css";

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    fetchAccounts(filterStatus);
  }, [filterStatus]);

  const fetchAccounts = async (status = "all") => {
    setLoading(true);
    try {
      const url = new URL("http://localhost:8000/app/users/");
      url.searchParams.append("status", status);
      
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAccounts(data);
      } else if (data.results) {
        setAccounts(data.results);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === "Active" || status === true) return "status-active";
    if (status === "Pending" || status === "pending") return "status-pending";
    return "status-inactive";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
  };

  const handleApproveQuick = async (username) => {
    try {
      const response = await fetch("http://localhost:8000/app/verify/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });
      
      if (response.ok) {
        fetchAccounts(filterStatus);
      }
    } catch (err) {
      console.error("Error verifying user:", err);
    }
  };

  const openUserModal = (account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
    setModalMessage("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(null);
    setModalMessage("");
    setModalLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedAccount) return;
    
    setModalLoading(true);
    setModalMessage("");
    
    try {
      const response = await fetch("http://localhost:8000/app/verify/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: selectedAccount.username }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setModalMessage("Account approved successfully!");
        setTimeout(() => {
          closeModal();
          fetchAccounts(filterStatus);
        }, 1500);
      } else {
        setModalMessage(data.detail || "Error approving account");
      }
    } catch (err) {
      console.error("Error approving user:", err);
      setModalMessage("Error approving account");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedAccount) return;
    
    if (!window.confirm(`Are you sure you want to decline ${selectedAccount.full_name}'s account?`)) {
      return;
    }
    
    setModalLoading(true);
    setModalMessage("");
    
    try {
      const response = await fetch("http://localhost:8000/app/decline/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: selectedAccount.username }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setModalMessage("Account declined successfully!");
        setTimeout(() => {
          closeModal();
          fetchAccounts(filterStatus);
        }, 1500);
      } else {
        setModalMessage(data.detail || "Error declining account");
      }
    } catch (err) {
      console.error("Error declining user:", err);
      setModalMessage("Error declining account");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <h1 className="page-title">Accounts</h1>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="table-filters">
          <p className="filter-label">Showing pending signups awaiting approval</p>
        </div>
      </div>

      <div className="table-container">
        {/* Table */}
        {loading ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#999" }}>
            Loading accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#999" }}>
            No accounts found
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company Name</th>
                <th>Email Address</th>
                <th>Contact Number</th>
                <th>Date Created</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, index) => (
                <tr key={index}>
                  <td>{account.full_name || "-"}</td>
                  <td>{account.company_name || "-"}</td>
                  <td>{account.user__email || account.email || "-"}</td>
                  <td>{account.contact_number || "-"}</td>
                  <td>{formatDate(account.created_at)}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(
                        account.is_verified
                      )}`}
                    >
                      {account.is_verified ? "Active" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <div className="action-menu">
                      {!account.is_verified && (
                        <button
                          className="action-btn"
                          onClick={() => openUserModal(account)}
                          title="View Details"
                        >
                          •••
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Profile Modal */}
      {isModalOpen && selectedAccount && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* General Information */}
              <div className="modal-section">
                <h3>General Information</h3>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={selectedAccount.full_name || ""} readOnly />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" value={selectedAccount.company_name || ""} readOnly />
                </div>
              </div>

              {/* Personal Contact Information */}
              <div className="modal-section">
                <h3>Personal Contact Information</h3>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={selectedAccount.email || selectedAccount.user__email || ""} readOnly />
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input type="text" value={selectedAccount.contact_number || ""} readOnly />
                </div>
              </div>

              {/* Messages */}
              {modalMessage && (
                <div className={`modal-message ${modalMessage.includes("Error") ? "error" : "success"}`}>
                  {modalMessage}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                className="btn-approve"
                onClick={handleApprove}
                disabled={modalLoading}
              >
                {modalLoading ? "Processing..." : "Approve"}
              </button>
              <button
                className="btn-decline"
                onClick={handleDecline}
                disabled={modalLoading}
              >
                {modalLoading ? "Processing..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default Accounts;
