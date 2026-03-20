import React, { useState, useEffect, useMemo } from "react";
import SidebarLayout from "./SidebarLayout";
import "./Dashboard.css";
import { useUser } from "./UserContext.jsx";

function CancelledRequests() {
  const { userData } = useUser();
  const [cancelledRequests, setCancelledRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("updated");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLogItem, setSelectedLogItem] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCancelledRequests();

    // Listen for request cancellation events from RequestList
    const handleRequestCancelled = () => {
      console.log("Request cancelled event received, refreshing list...");
      fetchCancelledRequests();
    };

    window.addEventListener('requestCancelled', handleRequestCancelled);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('requestCancelled', handleRequestCancelled);
    };
  }, []);

  const fetchCancelledRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/app/cancelled-requests/`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setCancelledRequests(data.cancelled_requests || []);
    } catch (err) {
      console.error("Error fetching cancelled requests:", err);
      setCancelledRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedRequests = useMemo(() => {
    const filtered = cancelledRequests.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        searchTerm === "" ||
        String(item.request_id || "").toLowerCase().includes(searchLower) ||
        item.product_name?.toLowerCase().includes(searchLower) ||
        item.cancelled_by_name?.toLowerCase().includes(searchLower) ||
        item.deadline?.toLowerCase().includes(searchLower) ||
        item.cancellation_reason?.toLowerCase().includes(searchLower) ||
        item.cancellation_log?.toLowerCase().includes(searchLower)
      );
    });

    const sorted = [...filtered];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "updated") {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        compareValue = dateA - dateB;
      } else if (sortBy === "deadline") {
        const dateA = new Date(a.deadline || 0).getTime();
        const dateB = new Date(b.deadline || 0).getTime();
        compareValue = dateA - dateB;
      } else if (sortBy === "name") {
        const nameA = (a.product_name || "").toLowerCase();
        const nameB = (b.product_name || "").toLowerCase();
        compareValue = nameA.localeCompare(nameB);
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [cancelledRequests, searchTerm, sortBy, sortOrder]);

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatIssuanceLabel = (item) => {
    if (item.request_id) {
      return `#${item.request_id}`;
    }
    return String(item.id || "").startsWith("draft-") ? "Cancelled Order" : "Unknown Issuance";
  };

  const getCleanLogDetails = (item) => {
    const rawLog = (item.cancellation_log || "").trim();
    if (!rawLog) return "—";

    const reasonMarker = "Reason:";
    const markerIndex = rawLog.lastIndexOf(reasonMarker);
    if (markerIndex === -1) {
      return rawLog;
    }

    const reasonFromLog = rawLog.slice(markerIndex + reasonMarker.length).trim();
    const reasonFromField = (item.cancellation_reason || "").trim();

    if (!reasonFromField || reasonFromLog.toLowerCase() === reasonFromField.toLowerCase()) {
      return rawLog.slice(0, markerIndex).trim().replace(/[.\s]+$/, "");
    }

    return rawLog;
  };

  const openLogModal = (item) => {
    setSelectedLogItem(item);
    setShowLogModal(true);
  };

  const closeLogModal = () => {
    setShowLogModal(false);
    setSelectedLogItem(null);
  };

  return (
    <SidebarLayout>
      <div style={{ padding: "20px" }}>
        {/* Filter and Search Section */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          flexWrap: "wrap", 
          alignItems: "flex-end",
          marginBottom: "0px",
          marginTop: "30px"
        }}>
          <div style={{ minWidth: "130px", display: "flex", flexDirection: "column" }}>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select border-2 fw-500"
              disabled={loading}
              style={{ 
                opacity: loading ? 0.6 : 1, 
                cursor: loading ? "not-allowed" : "pointer", 
                padding: "0.375rem 0.75rem",
                fontSize: "12px"
              }}
            >
              <option value="updated">Sort By: Last Update</option>
              <option value="deadline">Sort By: Deadline</option>
              <option value="name">Sort By: Product Name</option>
            </select>
          </div>

          <div style={{ minWidth: "165px", display: "flex", flexDirection: "column" }}>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select border-2 fw-500"
              disabled={loading}
              style={{ 
                opacity: loading ? 0.6 : 1, 
                cursor: loading ? "not-allowed" : "pointer", 
                padding: "0.375rem 0.75rem",
                fontSize: "12px"
              }}
            >
              <option value="desc">Order: Descending</option>
              <option value="asc">Order: Ascending</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control border-2"
              disabled={loading}
              style={{
                fontSize: "12px",
                minWidth: "200px",
                outline: "none",
                padding: "0.375rem 0.75rem",
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "text"
              }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading">Loading cancelled requests...</div>
        ) : sortedRequests.length > 0 ? (
          <>
            <table className="data-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "120px", textAlign: "left" }}>Issuance No.</th>
                  <th style={{ width: "210px", textAlign: "left" }}>Product Name</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Quantity</th>
                  <th style={{ width: "95px", textAlign: "left" }}>Deadline</th>
                  <th style={{ width: "105px", textAlign: "left" }}>Cancelled By</th>
                  <th style={{ width: "210px", textAlign: "left" }}>Reason</th>
                  <th style={{ width: "75px", textAlign: "center" }}>Log</th>
                  <th style={{ width: "170px", textAlign: "left" }}>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: "600", verticalAlign: "middle" }}>
                      {formatIssuanceLabel(item)}
                    </td>
                    <td style={{ verticalAlign: "middle" }} title={item.product_name || "N/A"}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.product_name || "N/A"}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>{item.quantity || 0}</td>
                    <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      {item.deadline
                        ? new Date(item.deadline).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })
                        : "N/A"}
                    </td>
                    <td style={{ verticalAlign: "middle" }}>{item.cancelled_by_name || "—"}</td>
                    <td style={{ verticalAlign: "middle" }}>
                      <div 
                        style={{ 
                          maxWidth: "100%", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }} 
                        title={item.cancellation_reason}
                      >
                        {item.cancellation_reason || "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        onClick={() => openLogModal(item)}
                        style={{
                          border: "1px solid #0d6efd",
                          color: "#0d6efd",
                          backgroundColor: "#fff",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "3px 8px",
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "#666", verticalAlign: "middle" }}>
                      {formatDateTime(item.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {Math.ceil(sortedRequests.length / itemsPerPage) > 1 && (
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
                    border: currentPage === 1 ? "1px solid #ddd" : "1px solid #dc3545",
                    backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                    color: currentPage === 1 ? "#999" : "#dc3545",
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
                    border: currentPage === 1 ? "1px solid #ddd" : "1px solid #dc3545",
                    backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                    color: currentPage === 1 ? "#999" : "#dc3545",
                    borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  ◀ Previous
                </button>

                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {Array.from({ length: Math.ceil(sortedRequests.length / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => {
                      const maxPage = Math.ceil(sortedRequests.length / itemsPerPage);
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
                            border: currentPage === page ? "1px solid #dc3545" : "1px solid #ddd",
                            backgroundColor: currentPage === page ? "#dc3545" : "#fff",
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
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedRequests.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(sortedRequests.length / itemsPerPage)}
                  style={{
                    padding: "6px 10px",
                    border: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "1px solid #ddd" : "1px solid #dc3545",
                    backgroundColor: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "#f0f0f0" : "#fff",
                    color: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "#999" : "#dc3545",
                    borderRadius: "4px",
                    cursor: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  Next ▶
                </button>

                <button
                  onClick={() => setCurrentPage(Math.ceil(sortedRequests.length / itemsPerPage))}
                  disabled={currentPage === Math.ceil(sortedRequests.length / itemsPerPage)}
                  style={{
                    padding: "6px 10px",
                    border: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "1px solid #ddd" : "1px solid #dc3545",
                    backgroundColor: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "#f0f0f0" : "#fff",
                    color: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "#999" : "#dc3545",
                    borderRadius: "4px",
                    cursor: currentPage === Math.ceil(sortedRequests.length / itemsPerPage) ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "12px"
                  }}
                >
                  Last ▶▶
                </button>


              {showLogModal && selectedLogItem && (
                <div
                  onClick={closeLogModal}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "radial-gradient(circle at top, rgba(30, 58, 138, 0.32), rgba(2, 6, 23, 0.78))",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1050,
                    padding: "16px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      maxWidth: "760px",
                      background: "linear-gradient(135deg, #eef7ff 0%, #dceeff 100%)",
                      border: "1px solid rgba(29, 106, 183, 0.35)",
                      borderRadius: "14px",
                      boxShadow: "0 20px 45px rgba(29, 106, 183, 0.2)",
                      overflow: "hidden",
                      maxHeight: "75vh",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid rgba(29, 106, 183, 0.25)", background: "linear-gradient(135deg, #e0efff 0%, #d5e9ff 100%)", position: "sticky", top: 0, zIndex: 10 }}>
                      <h5 style={{ margin: 0, color: "#1d6ab7", fontSize: "1.05rem", fontWeight: "800", letterSpacing: "0.02em" }}>Cancellation Log Details</h5>
                      <button
                        type="button"
                        onClick={closeLogModal}
                        style={{ border: "1px solid rgba(29, 106, 183, 0.35)", background: "rgba(29, 106, 183, 0.1)", color: "#1d6ab7", width: "34px", height: "34px", borderRadius: "9px", fontSize: "19px", lineHeight: 1, cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ padding: "18px", overflowY: "auto", flex: 1 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: "12px", columnGap: "12px", fontSize: "0.93rem", color: "#1e40af" }}>
                        <strong style={{ color: "#1d6ab7" }}>Issuance No.</strong>
                        <span>{formatIssuanceLabel(selectedLogItem)}</span>

                        <strong style={{ color: "#1d6ab7" }}>Product Name</strong>
                        <span>{selectedLogItem.product_name || "N/A"}</span>

                        <strong style={{ color: "#1d6ab7" }}>Quantity</strong>
                        <span>{selectedLogItem.quantity || 0}</span>

                        <strong style={{ color: "#1d6ab7" }}>Deadline</strong>
                        <span>
                          {selectedLogItem.deadline
                            ? new Date(selectedLogItem.deadline).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })
                            : "N/A"}
                        </span>

                        <strong style={{ color: "#1d6ab7" }}>Cancelled By</strong>
                        <span>{selectedLogItem.cancelled_by_name || "—"}</span>

                        <strong style={{ color: "#1d6ab7" }}>Reason</strong>
                        <span>{selectedLogItem.cancellation_reason || "—"}</span>

                        <strong style={{ color: "#1d6ab7" }}>Last Update</strong>
                        <span>{formatDateTime(selectedLogItem.updated_at)}</span>

                        <strong style={{ color: "#1d6ab7" }}>Log Details</strong>
                        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, background: "rgba(29, 106, 183, 0.08)", border: "1px solid rgba(29, 106, 183, 0.2)", borderRadius: "10px", padding: "10px 12px", color: "#1e40af" }}>
                          {getCleanLogDetails(selectedLogItem)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                <span style={{ color: "#666", fontSize: "12px", marginLeft: "10px" }}>
                  Page {currentPage} of {Math.ceil(sortedRequests.length / itemsPerPage)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="no-data">
            {searchTerm ? (
              <>
                <i className="bi bi-search" style={{ fontSize: "2rem", color: "#ccc" }}></i>
                <p>No cancelled requests found matching "{searchTerm}"</p>
              </>
            ) : (
              <>
                <i className="bi bi-x-circle" style={{ fontSize: "2rem", color: "#ccc" }}></i>
                <p>No cancelled requests yet</p>
              </>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

export default CancelledRequests;
