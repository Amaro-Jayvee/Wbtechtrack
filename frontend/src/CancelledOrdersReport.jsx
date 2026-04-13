import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./PrintableReport.css";

function CancelledOrdersReport() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({});

  // Load orders from URL hash on component mount
  useEffect(() => {
    try {
      console.log("\n========================================");
      console.log("=== CancelledOrdersReport LOADING ===");
      console.log("========================================");
      
      // Method 1: URL Hash (PRIMARY - most reliable)
      console.log("\n1. Checking URL hash...");
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const encodedData = params.get('data');
      
      if (encodedData) {
        console.log("✓ Found encoded data in URL hash");
        const jsonStr = atob(encodedData);
        const data = JSON.parse(jsonStr);
        
        console.log("✓ Decoded and parsed successfully");
        console.log("Orders: " + data.orders.length);
        
        if (data.orders.length > 0) {
          console.log("First order: " + data.orders[0].product_name);
        }
        
        setOrders(data.orders);
        setFilters(data.filters || {});
        console.log("========================================\n");
        return;
      }
      
      // Method 2: localStorage (fallback)
      console.log("\n2. Checking localStorage...");
      const stored = localStorage.getItem('cancelledOrdersReportData');
      if (stored) {
        const data = JSON.parse(stored);
        console.log("✓ Found in localStorage");
        setOrders(data.orders);
        setFilters(data.filters || {});
        localStorage.removeItem('cancelledOrdersReportData');
        console.log("========================================\n");
        return;
      }
      
      // Method 3: React Router state (fallback)
      console.log("\n3. Checking React Router state...");
      if (location.state?.orders) {
        console.log("✓ Found in location.state");
        setOrders(location.state.orders);
        setFilters(location.state.filters || {});
        console.log("========================================\n");
        return;
      }
      
      console.log("✗ No data found in any source");
      setOrders([]);
      console.log("========================================\n");
      
    } catch (error) {
      console.error("✗ Error loading data:", error);
      setOrders([]);
    }
  }, [location]);

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "cancelled") {
      return { bg: "#ffe0e0", color: "#d32f2f" };
    }
    return { bg: "#f5f5f5", color: "#666" };
  };

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalOrders = orders.length;
    
    return {
      totalOrders,
      generatedAt: filters.generatedAt || new Date().toLocaleString()
    };
  }, [orders, filters]);

  return (
    <div style={{
      padding: "40px",
      backgroundColor: "#fff",
      minHeight: "100vh"
    }}>
      {/* COMPANY HEADER */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
        paddingBottom: "20px",
        borderBottom: "3px solid #1d6ab7"
      }}>
        <div>
          <img 
            src="/Group 1.png" 
            alt="WB Technologies" 
            style={{ height: "50px", marginBottom: "10px" }}
          />
          <div style={{ color: "#1d6ab7", fontWeight: "bold", fontSize: "14px" }}>
            WB TECHNOLOGIES INC.
          </div>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>
            Quality Manufacturing & Production Services
          </div>
          <div style={{ color: "#999", fontSize: "10px", lineHeight: "1.4" }}>
            <div>123 Industrial Avenue, Metro Manila, Philippines</div>
            <div>Tel: +63-2-8123-4567 | Email: info@wbtechnologies.com</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "12px", color: "#666" }}>
          <div>Generated: {summary.generatedAt}</div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#999" }}>
            Report Type: Cancelled Orders
          </div>
        </div>
      </div>

      {/* REPORT TITLE */}
      <div style={{
        textAlign: "center",
        marginBottom: "30px"
      }}>
        <h2 style={{
          color: "#1d6ab7",
          fontSize: "20px",
          fontWeight: "bold",
          margin: "0 0 8px 0"
        }}>
          CANCELLED ORDERS REPORT
        </h2>
        <p style={{
          color: "#666",
          fontSize: "12px",
          margin: "0"
        }}>
          Summary of cancelled purchase orders
        </p>
      </div>

      {/* SUMMARY METRICS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "15px",
        marginBottom: "30px"
      }}>
        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #1d6ab7",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#1d6ab7",
            marginBottom: "5px"
          }}>
            {summary.totalOrders}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Total Orders
          </div>
        </div>

        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #d32f2f",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#d32f2f",
            marginBottom: "5px"
          }}>
            {summary.totalOrders}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Cancelled
          </div>
        </div>

        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #999",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#999",
            marginBottom: "5px"
          }}>
            {orders.reduce((sum, order) => sum + (order.quantity || 0), 0)}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Total Quantity
          </div>
        </div>

        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #1d6ab7",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#1d6ab7",
            marginBottom: "5px"
          }}>
            {new Date().toLocaleDateString()}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Report Date
          </div>
        </div>
      </div>

      {/* ORDERS TABLE */}
      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <p>No cancelled orders found</p>
        </div>
      ) : (
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px",
          marginBottom: "20px"
        }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #999" }}>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Issuance No.</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Product</th>
              <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Quantity</th>
              <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Progress @ Cancel</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Deadline</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Cancelled By</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Reason</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Cancelled Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const statusColor = getStatusBadgeColor("cancelled");
              const progressValue = order.cancellation_progress 
                ? ((order.cancellation_progress.completed_quota || 0) / (order.cancellation_progress.total_quota || 1) * 100).toFixed(1)
                : 0;
              
              return (
                <tr key={`${order.id}-${idx}`} style={{ borderBottom: "1px solid #ddd", backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontWeight: "600" }}>
                    {order.request_id ? `#${order.request_id}` : "N/A"}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontSize: "9px" }}>
                    {order.product_name || "Unnamed"}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc" }}>
                    {order.quantity || 0}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc" }}>
                    {order.cancellation_progress ? (
                      <div>
                        <div style={{ fontWeight: "600", color: "#1d6ab7" }}>
                          {order.cancellation_progress.completed_quota || 0} / {order.cancellation_progress.total_quota || 0}
                        </div>
                        <div style={{ fontSize: "9px", color: "#666" }}>
                          {progressValue}%
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc" }}>
                    {order.deadline
                      ? new Date(order.deadline).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : "N/A"}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc" }}>
                    {order.cancelled_by_name || "—"}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontSize: "9px" }}>
                    {order.cancellation_reason || "—"}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    {order.updated_at ? new Date(order.updated_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* FOOTER WITH SIGNATURES */}
      <div style={{
        marginTop: "60px",
        paddingTop: "40px",
        borderTop: "2px solid #1d6ab7",
        fontSize: "10px",
        color: "#333"
      }}>
        {/* Signature Section */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "30px",
          marginBottom: "20px"
        }}>
          {/* Generated By */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "50px", marginBottom: "8px" }}></div>
            <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
              <div style={{ fontWeight: "600", fontSize: "10px" }}>Generated By</div>
            </div>
          </div>

          {/* Date */}
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600" }}>
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div style={{ fontWeight: "600", fontSize: "10px" }}>Date</div>
          </div>

          {/* Approved By */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "50px", marginBottom: "8px" }}></div>
            <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
              <div style={{ fontWeight: "600", fontSize: "10px" }}>Approved By</div>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div style={{
          textAlign: "center",
          marginTop: "30px",
          paddingTop: "15px",
          borderTop: "1px solid #ddd",
          fontSize: "9px",
          color: "#999"
        }}>
          <p style={{ margin: "4px 0" }}>This is an automated report generated by TechTrack Management System</p>
          <p style={{ margin: "4px 0" }}>Report Type: Cancelled Purchase Orders | Confidential</p>
        </div>
      </div>
    </div>
  );
}

export default CancelledOrdersReport;
