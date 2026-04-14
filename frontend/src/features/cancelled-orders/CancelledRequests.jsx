import React, { useState, useEffect, useMemo } from "react";
import SidebarLayout from "../../shared/components/SidebarLayout";
import CancellationReportModal from "./CancellationReportModal";
import "../../features/dashboard/Dashboard.css";
import { useUser } from "../../shared/context/UserContext.jsx";

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
  const [showReportMode, setShowReportMode] = useState(false);
  const [selectedCancelledIds, setSelectedCancelledIds] = useState(new Set());
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
        `/app/cancelled-requests/",
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

  // Reset pagination when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedRequests.slice(startIndex, endIndex);
  }, [sortedRequests, currentPage, itemsPerPage]);

  // Validate current page
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

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

  const handlePrintReport = () => {
    setShowReportMode(true);
  };

  const handleGenerateReport = () => {
    const selectedOrders = paginatedRequests.filter(order => selectedCancelledIds.has(order.id));
    
    // Prepare report data
    const reportData = {
      orders: selectedOrders,
      selectedCount: selectedCancelledIds.size,
      filters: {
        generatedAt: new Date().toLocaleString()
      }
    };
    
    // Encode as base64 and pass via URL hash
    const jsonStr = JSON.stringify(reportData);
    const encodedData = btoa(jsonStr);
    const reportUrl = `/cancelled-orders-report#data=${encodedData}`;
    
    console.log("Generating cancelled orders report with", selectedOrders.length, "orders");
    console.log("Encoded data size:", encodedData.length, "chars");
    
    // Open report in new tab
    const newTab = window.open(reportUrl, '_blank');
    if (newTab) {
      console.log("✓ Report tab opened successfully");
    } else {
      console.warn("✗ Failed to open report tab - popup may be blocked");
    }
    
    // Reset report mode
    setShowReportMode(false);
    setSelectedCancelledIds(new Set());
  };

  const handleCancelReport = () => {
    setShowReportMode(false);
    setSelectedCancelledIds(new Set());
  };

  const handleToggleCancelledOrder = (orderId) => {
    const newSelected = new Set(selectedCancelledIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedCancelledIds(newSelected);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all items on current page
      const allIds = new Set(selectedCancelledIds);
      paginatedRequests.forEach(item => allIds.add(item.id));
      setSelectedCancelledIds(allIds);
      console.log("✓ Selected all", paginatedRequests.length, "items on this page");
    } else {
      // Deselect all items on current page
      const newSelected = new Set(selectedCancelledIds);
      paginatedRequests.forEach(item => newSelected.delete(item.id));
      setSelectedCancelledIds(newSelected);
      console.log("✓ Deselected all on this page");
    }
  };

  const isAllSelectedOnPage = paginatedRequests.length > 0 && 
    paginatedRequests.every(item => selectedCancelledIds.has(item.id));

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
          {showReportMode && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleGenerateReport}
                disabled={selectedCancelledIds.size === 0}
                style={{
                  padding: "8px 16px",
                  backgroundColor: selectedCancelledIds.size > 0 ? "#22c55e" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: selectedCancelledIds.size > 0 ? "pointer" : "not-allowed"
                }}
              >
                Generate Report ({selectedCancelledIds.size})
              </button>
              <button
                onClick={handleCancelReport}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#999",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          )}
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

          <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "flex-end" }}>
            {!showReportMode && (
              <button
                onClick={handlePrintReport}
                style={{
                  padding: "0.375rem 0.75rem",
                  backgroundColor: "#1D6AB7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  height: "38px",
                  lineHeight: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap"
                }}
              >
                Print Report
              </button>
            )}
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control border-2"
              disabled={loading || showReportMode}
              style={{
                fontSize: "12px",
                minWidth: "200px",
                outline: "none",
                padding: "0.375rem 0.75rem",
                opacity: loading || showReportMode ? 0.6 : 1,
                cursor: loading || showReportMode ? "not-allowed" : "text"
              }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading">Loading cancelled requests...</div>
        ) : sortedRequests.length > 0 ? (
          <>
            <div style={{ overflowX: "auto", width: "100%", marginBottom: "20px" }}>
              <table className="data-table" style={{ tableLayout: "auto", width: "100%", minWidth: "1100px" }}>
                <thead>
                  <tr>
                    {showReportMode && (
                      <th style={{ width: "4%", minWidth: "40px", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={isAllSelectedOnPage}
                          onChange={handleSelectAll}
                          style={{ cursor: "pointer" }} 
                          title="Select all on this page"
                        />
                      </th>
                    )}
                    <th style={{ width: "10%", minWidth: "100px", textAlign: "left" }}>Issuance No.</th>
                    <th style={{ width: "18%", minWidth: "180px", textAlign: "left" }}>Product Name</th>
                    <th style={{ width: "7%", minWidth: "70px", textAlign: "center" }}>Quantity</th>
                    <th style={{ width: "12%", minWidth: "100px", textAlign: "center" }}>Progress @ Cancel</th>
                    <th style={{ width: "9%", minWidth: "85px", textAlign: "left" }}>Deadline</th>
                    <th style={{ width: "10%", minWidth: "90px", textAlign: "left" }}>Cancelled By</th>
                    <th style={{ width: "18%", minWidth: "150px", textAlign: "left" }}>Reason</th>
                    <th style={{ width: "6%", minWidth: "65px", textAlign: "center" }}>Log</th>
                    <th style={{ width: "10%", minWidth: "120px", textAlign: "left" }}>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((item) => (
                    <tr key={item.id}>
                      {showReportMode && (
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <input
                            type="checkbox"
                            checked={selectedCancelledIds.has(item.id)}
                            onChange={() => handleToggleCancelledOrder(item.id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                      )}
                      <td style={{ whiteSpace: "nowrap", fontWeight: "600", verticalAlign: "middle" }}>
                        {formatIssuanceLabel(item)}
                      </td>
                      <td style={{ verticalAlign: "middle" }} title={item.product_name || "N/A"}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.product_name || "N/A"}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>{item.quantity || 0}</td>
                      <td style={{ textAlign: "center", verticalAlign: "middle", fontSize: "13px" }}>
                        {item.cancellation_progress ? (
                          <div>
                            <div style={{ fontWeight: "600", color: "#1D6AB7" }}>
                              {item.cancellation_progress.completed_quota || 0} / {item.cancellation_progress.total_quota || 0}
                            </div>
                            <div style={{ fontSize: "11px", color: "#666" }}>
                              {item.cancellation_progress.total_quota > 0 
                                ? ((item.cancellation_progress.completed_quota / item.cancellation_progress.total_quota) * 100).toFixed(1)
                                : 0}%
                            </div>
                            {item.cancellation_progress.defects > 0 && (
                              <div style={{ fontSize: "11px", color: "#d32f2f", marginTop: "4px" }}>
                                Defects: {item.cancellation_progress.defects}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#999" }}>—</span>
                        )}
                      </td>
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
                            whiteSpace: "nowrap"
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
            </div>

            {/* Pagination Controls */}
            {sortedRequests.length > 0 && (
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
                {totalPages > 1 && (
                  <>
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
                  </>
                )}
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {totalPages > 1 && (
                    <>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
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
                    </>
                  )}
                </div>

                {totalPages > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        border: currentPage === totalPages ? "1px solid #ddd" : "1px solid #1D6AB7",
                        backgroundColor: currentPage === totalPages ? "#f0f0f0" : "#fff",
                        color: currentPage === totalPages ? "#999" : "#1D6AB7",
                        borderRadius: "4px",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "12px"
                      }}
                    >
                      Next ▶
                    </button>

                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        border: currentPage === totalPages ? "1px solid #ddd" : "1px solid #1D6AB7",
                        backgroundColor: currentPage === totalPages ? "#f0f0f0" : "#fff",
                        color: currentPage === totalPages ? "#999" : "#1D6AB7",
                        borderRadius: "4px",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "12px"
                      }}
                    >
                      Last ▶▶
                    </button>
                  </>
                )}
                <span style={{ color: "#666", fontSize: "12px", marginLeft: "10px" }}>
                  Page {currentPage} of {totalPages}
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

        {showLogModal && selectedLogItem && (
          <CancellationReportModal item={selectedLogItem} onClose={closeLogModal} />
        )}
      </div>
    </SidebarLayout>
  );
}

export default CancelledRequests;
