import React, { useRef } from "react";
import "./CancellationReportModal.css";

function CancellationReportModal({ item, onClose }) {
  const reportRef = useRef(null);

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

  const formatDate = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getProgressPercentage = () => {
    const progress = item.cancellation_progress || {};
    const totalQuota = parseFloat(progress.total_quota) || 0;
    const completedQuota = parseFloat(progress.completed_quota) || 0;
    if (totalQuota === 0) return 0;
    return ((completedQuota / totalQuota) * 100).toFixed(1);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=800,width=1200");
    const reportContent = reportRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cancelled Purchase Order Report - ${item.request_id || "Draft"}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .report-content {
              padding: 40px;
              max-width: 900px;
              margin: 0 auto;
            }
            .header-section {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1d6ab7;
            }
            .report-title {
              font-size: 24px;
              font-weight: bold;
              color: #1d6ab7;
              margin-bottom: 10px;
            }
            .report-subtitle {
              font-size: 12px;
              color: #666;
            }
            .info-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #1d6ab7;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #d0d0d0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 200px 1fr;
              gap: 12px 20px;
              font-size: 13px;
            }
            .info-label {
              font-weight: 600;
              color: #1d6ab7;
            }
            .info-value {
              color: #333;
              word-break: break-word;
            }
            .progress-box {
              background-color: #f5f5f5;
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 15px;
              margin-top: 15px;
            }
            .progress-stat {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 13px;
            }
            .progress-stat-label {
              font-weight: 600;
              color: #1d6ab7;
            }
            .progress-stat-value {
              color: #333;
            }
            .progress-bar-container {
              width: 100%;
              height: 24px;
              background-color: #e0e0e0;
              border-radius: 4px;
              overflow: hidden;
              margin-top: 10px;
            }
            .progress-bar {
              height: 100%;
              background: linear-gradient(90deg, #1d6ab7 0%, #0d4a8f 100%);
              transition: width 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: 600;
            }
            .defects-warning {
              background-color: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 4px;
              padding: 10px;
              margin-top: 10px;
              color: #856404;
              font-size: 13px;
            }
            .reason-box {
              background-color: #f0f8ff;
              border-left: 4px solid #1d6ab7;
              padding: 15px;
              margin-top: 15px;
              border-radius: 4px;
            }
            .reason-label {
              font-weight: 600;
              color: #1d6ab7;
              margin-bottom: 8px;
            }
            .reason-text {
              color: #333;
              white-space: pre-wrap;
              line-height: 1.5;
              font-size: 13px;
            }
            .footer-section {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            .generated-date {
              margin-top: 10px;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .report-content {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-content">
            ${reportContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const completedQuota = parseFloat(item.cancellation_progress?.completed_quota) || 0;
  const totalQuota = parseFloat(item.cancellation_progress?.total_quota) || 0;
  const defects = parseFloat(item.cancellation_progress?.defects) || 0;
  const progressPercentage = getProgressPercentage();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at top, rgba(30, 58, 138, 0.32), rgba(2, 6, 23, 0.78))",
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
          maxWidth: "880px",
          background: "white",
          border: "1px solid rgba(29, 106, 183, 0.35)",
          borderRadius: "12px",
          boxShadow: "0 20px 45px rgba(29, 106, 183, 0.2)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header with title and buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(29, 106, 183, 0.25)",
            background: "linear-gradient(135deg, #e0efff 0%, #d5e9ff 100%)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h5
            style={{
              margin: 0,
              color: "#1d6ab7",
              fontSize: "1.1rem",
              fontWeight: "800",
              letterSpacing: "0.02em",
            }}
          >
            Cancelled Purchase Order Report
          </h5>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                border: "1px solid #1d6ab7",
                background: "#1d6ab7",
                color: "white",
                borderRadius: "6px",
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              title="Print this report"
            >
              <span>🖨️</span> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(29, 106, 183, 0.35)",
                background: "rgba(29, 106, 183, 0.1)",
                color: "#1d6ab7",
                width: "34px",
                height: "34px",
                borderRadius: "6px",
                fontSize: "20px",
                lineHeight: 1,
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div
          ref={reportRef}
          style={{
            padding: "30px",
            overflowY: "auto",
            flex: 1,
            backgroundColor: "white",
          }}
        >
          {/* Report Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "30px",
              paddingBottom: "20px",
              borderBottom: "3px solid #1d6ab7",
            }}
          >
            {/* Company Info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ flex: 1, textAlign: "left" }}>
                <img src="/Group 1.png" alt="WB Logo" style={{ width: "50px", height: "50px", objectFit: "contain" }} />
              </div>
              <div style={{ flex: 2, textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1d6ab7", marginBottom: "8px" }}>
                  CANCELLED PURCHASE ORDER REPORT
                </div>
              </div>
              <div style={{ flex: 1, textAlign: "right", fontSize: "10px", lineHeight: 1.4 }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1d6ab7" }}>WB Technologies Inc.</div>
                <div style={{ color: "#666" }}>B2, L11, Greenland Bulihan</div>
                <div style={{ color: "#666", fontSize: "9px", marginTop: "2px" }}>(02) 994.9971</div>
              </div>
            </div>
            
            <div style={{ fontSize: "12px", color: "#666" }}>
              Generated on {formatDateTime(new Date().toISOString())}
            </div>
          </div>

          {/* Order Information Section */}
          <div style={{ marginBottom: "25px" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#1d6ab7",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "1px solid #d0d0d0",
              }}
            >
              ORDER INFORMATION
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                gap: "12px 20px",
                fontSize: "13px",
              }}
            >
              <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                Issuance No.
              </span>
              <span style={{ color: "#333" }}>
                {item.issuance_no ? `#${item.issuance_no}` : (item.request_id ? `#${item.request_id}` : "Draft Order")}
              </span>

              {item.issuance_date && (
                <>
                  <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                    Issuance Date
                  </span>
                  <span style={{ color: "#333" }}>
                    {item.issuance_date ? formatDate(item.issuance_date) : "N/A"}
                  </span>
                </>
              )}

              <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                Product Name
              </span>
              <span style={{ color: "#333" }}>{item.product_name || "N/A"}</span>

              <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                Quantity Ordered
              </span>
              <span style={{ color: "#333" }}>
                {item.quantity || 0} units
              </span>

              <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                Deadline
              </span>
              <span style={{ color: "#333" }}>
                {item.deadline ? formatDate(item.deadline) : "N/A"}
              </span>

              <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                Cancelled By
              </span>
              <span style={{ color: "#333" }}>
                {item.cancelled_by_name || "System"}
              </span>

              <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                Cancelled Date
              </span>
              <span style={{ color: "#333" }}>
                {formatDateTime(item.updated_at)}
              </span>
            </div>
          </div>

          {/* Production Progress Section */}
          <div style={{ marginBottom: "25px" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#1d6ab7",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "1px solid #d0d0d0",
              }}
            >
              PRODUCTION PROGRESS AT TIME OF CANCELLATION
            </div>
            {item.cancellation_progress &&
            Object.keys(item.cancellation_progress).length > 0 ? (
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                    Production Rate:
                  </span>
                  <span style={{ color: "#333" }}>
                    <strong>{completedQuota}</strong> / <strong>{totalQuota}</strong>{" "}
                    units completed
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#1d6ab7" }}>
                    Completion Rate:
                  </span>
                  <span
                    style={{
                      color: "#333",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    {progressPercentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "28px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background:
                        "linear-gradient(90deg, #1d6ab7 0%, #0d4a8f 100%)",
                      width: `${progressPercentage}%`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "700",
                      transition: "width 0.3s ease",
                    }}
                  >
                    {progressPercentage > 10 && `${progressPercentage}%`}
                  </div>
                </div>

                {/* Defects Information */}
                {defects > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    {/* Check if we have detailed defect logs */}
                    {item.cancellation_progress?.defectLogs && item.cancellation_progress.defectLogs.length > 0 ? (
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#1d6ab7", marginBottom: "10px" }}>
                          Detailed Defect Breakdown:
                        </div>
                        <table style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "12px",
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb"
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #d0d0d0" }}>
                              <th style={{ padding: "8px", textAlign: "left", fontWeight: "600", color: "#333", borderRight: "1px solid #e5e7eb" }}>Defect Type</th>
                              <th style={{ padding: "8px", textAlign: "center", fontWeight: "600", color: "#333", width: "100px" }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.cancellation_progress.defectLogs.map((log, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "8px", color: "#555", borderRight: "1px solid #e5e7eb" }}>
                                  {log.defect_type && log.defect_type.charAt(0).toUpperCase() + log.defect_type.slice(1)}
                                </td>
                                <td style={{ padding: "8px", textAlign: "center", color: "#333", fontWeight: "500" }}>
                                  {log.defect_count || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: "4px",
                          padding: "10px",
                          color: "#856404",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>⚠</span>
                        <span>
                          <strong>{defects}</strong> defect(s) recorded during production
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "15px",
                  textAlign: "center",
                  color: "#999",
                  fontSize: "13px",
                }}
              >
                No production data available (Order was cancelled before
                production started)
              </div>
            )}
          </div>

          {/* Cancellation Reason Section */}
          <div style={{ marginBottom: "25px" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#1d6ab7",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "1px solid #d0d0d0",
              }}
            >
              CANCELLATION REASON
            </div>
            <div
              style={{
                backgroundColor: "#f0f8ff",
                border: "1px solid #1d6ab7",
                borderRadius: "6px",
                padding: "15px",
                color: "#333",
                lineHeight: "1.6",
                fontSize: "13px",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
              }}
            >
              {item.cancellation_reason || "No reason provided"}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "40px",
              paddingTop: "20px",
              borderTop: "1px solid #ddd",
              textAlign: "center",
              fontSize: "11px",
              color: "#999",
            }}
          >
            <div>This is an official record of the cancelled purchase order.</div>
            <div style={{ marginTop: "8px" }}>
              Generated: {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancellationReportModal;
