import React, { useState } from "react";
import "./CompletedOrderModal.css";

function CompletedOrderModal({ orderData, onClose }) {
  const [showPrint, setShowPrint] = useState(false);

  if (!orderData) return null;

  const {
    requestId,
    productName,
    quantity,
    completedAt,
    createdAt,
    requesterName,
    completedQuota,
    dueDate
  } = orderData;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString, fieldName = 'date') => {
    if (!dateString) {
      console.warn(`[CompletedOrderModal] Missing date for ${fieldName}:`, dateString);
      return "Not recorded";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`[CompletedOrderModal] Invalid date for ${fieldName}:`, dateString);
        return "Invalid date";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (err) {
      console.error(`[CompletedOrderModal] Error formatting ${fieldName}:`, err);
      return "Error parsing date";
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
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
        zIndex: 9999,
        padding: "20px"
      }}
    >
      <div
        className="modal-dialog completed-order-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "900px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)"
        }}
      >
        {/* Header - Hide on Print */}
        <div
          className="no-print"
          style={{
            backgroundColor: "#1D6AB7",
            padding: "20px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #1a5a9b"
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 5px 0", fontSize: "22px" }}>Order Completed</h2>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Request #{requestId}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "28px",
              cursor: "pointer",
              padding: "0",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="completed-order-content"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px",
            backgroundColor: "white"
          }}
        >
          {/* Print Header - Show only on Print */}
          <div className="print-only" style={{ marginBottom: "30px", paddingBottom: "20px", borderBottom: "2px solid #333" }}>
            <h1 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "700" }}>ORDER COMPLETION RECEIPT</h1>
            <p style={{ margin: "5px 0", fontSize: "12px", color: "#555" }}>
              Document Date: {formatDate(new Date())}
            </p>
          </div>

          {/* Order Information Table */}
          <table className="order-details-table" style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "30px",
            border: "1px solid #999"
          }}>
            <tbody>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", width: "30%", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Request Number</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>{requestId}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Product Name</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>{productName}</td>
              </tr>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Customer</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>{requesterName || "Unknown"}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Quantity Ordered</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>{quantity} units</td>
              </tr>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Quantity Completed</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999", fontWeight: "600", color: completedQuota >= quantity ? "#10B981" : "#f97316" }}>
                  {completedQuota} / {quantity} units
                </td>
              </tr>
            </tbody>
          </table>

          {/* Timeline Information Table */}
          <h3 style={{ fontSize: "14px", fontWeight: "700", marginTop: "30px", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Order Timeline
          </h3>
          <table className="timeline-table" style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "30px",
            border: "1px solid #999"
          }}>
            <tbody>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", width: "30%", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Order Created</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>{formatDate(createdAt, 'createdAt')}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Order Completed</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999", fontWeight: "600", color: "#10B981" }}>{formatDate(completedAt, 'completedAt')}</td>
              </tr>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Due Date</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>
                  {dueDate ? formatDate(dueDate, 'dueDate') : "No deadline set"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Product Information Section */}
          <h3 style={{ fontSize: "14px", fontWeight: "700", marginTop: "30px", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Product Summary
          </h3>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "30px",
            border: "1px solid #999"
          }}>
            <tbody>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", width: "30%", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Product</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999" }}>{productName}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Order Quantity</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999", fontWeight: "600", color: "#1D6AB7" }}>{quantity} units</td>
              </tr>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "10px", fontWeight: "600", borderRight: "1px solid #999", borderBottom: "1px solid #999" }}>Total Completed</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #999", fontWeight: "600", color: "#10B981" }}>{completedQuota} units ({quantity > 0 ? Math.round((completedQuota / quantity) * 100) : 0}%)</td>
              </tr>
            </tbody>
          </table>

          {/* Success Message */}
          <div
            style={{
              backgroundColor: "#dcfce7",
              borderRadius: "4px",
              padding: "15px",
              border: "1px solid #86efac",
              textAlign: "center",
              marginTop: "30px"
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "#166534", fontWeight: "600" }}>
              Order completed successfully on {completedAt ? formatDate(completedAt, 'completedAt') : 'the scheduled date'}.
            </p>
          </div>

          {/* Signature Section - Print Only */}
          <div className="print-only" style={{ marginTop: "50px", paddingTop: "30px", borderTop: "1px solid #999" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", textAlign: "center", padding: "30px 20px 0" }}>
                    <div style={{ borderBottom: "2px solid #000", height: "40px", marginBottom: "10px" }}></div>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Production Manager</p>
                  </td>
                  <td style={{ width: "50%", textAlign: "center", padding: "30px 20px 0" }}>
                    <div style={{ borderBottom: "2px solid #000", height: "40px", marginBottom: "10px" }}></div>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>Received By</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer - Hide on Print */}
        <div
          className="no-print"
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "15px 30px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            gap: "10px"
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#2563eb")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#3b82f6")}
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#d1d5db")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#e5e7eb")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompletedOrderModal;
