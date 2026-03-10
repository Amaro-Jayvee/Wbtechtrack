import React, { useState, useEffect, useMemo } from "react";
import SidebarLayout from "./SidebarLayout";
import "./Dashboard.css";
import { useUser } from "./UserContext.jsx";

function CancelledRequests() {
  const { userData } = useUser();
  const [cancelledRequests, setCancelledRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
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
        `/app/cancelled-requests/`,
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
        item.request_id?.toString().includes(searchLower) ||
        item.requester_name?.toLowerCase().includes(searchLower) ||
        item.product_name?.toLowerCase().includes(searchLower) ||
        item.cancellation_reason?.toLowerCase().includes(searchLower)
      );
    });

    const sorted = [...filtered];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "date") {
        const dateA = new Date(a.cancelled_at || 0);
        const dateB = new Date(b.cancelled_at || 0);
        compareValue = dateB - dateA;
      } else if (sortBy === "number") {
        compareValue = (b.request_id || 0) - (a.request_id || 0);
      } else if (sortBy === "name") {
        const nameA = (a.product_name || "").toLowerCase();
        const nameB = (b.product_name || "").toLowerCase();
        compareValue = nameA.localeCompare(nameB);
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [cancelledRequests, searchTerm, sortBy, sortOrder]);

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
              <option value="date">Sort By: Date</option>
              <option value="number">Sort By: Number</option>
              <option value="name">Sort By: Name</option>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Issuance No.</th>
                  <th>Requester</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Cancelled Date</th>
                  <th>Cancelled By</th>
                  <th>Reason</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontWeight: "600",
                          whiteSpace: "nowrap"
                        }}>
                          ✕ CANCELLED
                        </span>
                        {item.request_id}
                      </div>
                    </td>
                    <td>{item.requester_name || "—"}</td>
                    <td>{item.product_name || "N/A"}</td>
                    <td>{item.quantity || 0}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {item.cancelled_at 
                        ? new Date(item.cancelled_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : "N/A"}
                    </td>
                    <td>{item.cancelled_by_name || "—"}</td>
                    <td>
                      <div 
                        style={{ 
                          maxWidth: "300px", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }} 
                        title={item.cancellation_reason}
                      >
                        {item.cancellation_reason || "—"}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "#666" }}>
                      {item.updated_at 
                        ? new Date(item.updated_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {sortedRequests.length > itemsPerPage && (
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
