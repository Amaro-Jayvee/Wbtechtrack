import React from "react";

function CancellationReasonModal({ 
  isOpen, 
  cancellationReason, 
  setCancellationReason, 
  taskData, 
  formData,
  onCancel, 
  onConfirm,
  showToast
}) {
  if (!isOpen) return null;

  // Calculate defect totals
  const totalDefects = formData.defectLogs.reduce((sum, log) => sum + (Number(log.defect_count) || 0), 0);
  const completionRate = taskData.total_quota > 0 ? ((formData.completed_quota / taskData.total_quota) * 100).toFixed(1) : 0;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          padding: "0",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          overflow: "auto",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "30px",
          borderBottom: "2px solid #1d6ab7",
          backgroundColor: "#f9fafb"
        }}>
          <img src="/Group 1.png" alt="WB Logo" style={{ width: "50px", height: "50px", objectFit: "contain" }} />
          <div style={{ textAlign: "right", fontSize: "10px", lineHeight: 1.4 }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "3px" }}>WB Technologies Inc.</div>
            <div>B2, L11, Greenland Bulihan Business Park</div>
            <div>Tel: (02) 994.9971 | Mobile: 0922 823 7874</div>
            <div>Email: wbtechnologiesinc@yahoo.com</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", padding: "20px 30px", backgroundColor: "#f0f9ff" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7", marginBottom: "5px" }}>
            CANCELLED PURCHASE ORDER REPORT
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>Production Progress at Time of Cancellation</div>
        </div>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {/* Product Info */}
          <div style={{ marginBottom: "25px" }}>
            <h4 style={{ color: "#1d6ab7", marginBottom: "12px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Product Information
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "13px" }}>
              <div>
                <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Product Name</div>
                <div style={{ color: "#333" }}>{taskData?.product_name || "N/A"}</div>
              </div>
              <div>
                <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Cancellation Date</div>
                <div style={{ color: "#333" }}>{new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>

          {/* Production Progress */}
          <div style={{ marginBottom: "25px" }}>
            <h4 style={{ color: "#1d6ab7", marginBottom: "12px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Production Progress
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", fontSize: "13px", marginBottom: "15px" }}>
              <div style={{ backgroundColor: "#f3f4f6", padding: "12px", borderRadius: "6px" }}>
                <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Production Rate</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>
                  {formData.completed_quota || 0} / {taskData?.total_quota || 0} units
                </div>
              </div>
              <div style={{ backgroundColor: "#f3f4f6", padding: "12px", borderRadius: "6px" }}>
                <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Completion Rate</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>{completionRate}%</div>
              </div>
              <div style={{ backgroundColor: "#f3f4f6", padding: "12px", borderRadius: "6px" }}>
                <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Total Defects</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#e02424" }}>{totalDefects}</div>
              </div>
            </div>
            {/* Progress Bar */}
            <div style={{ width: "100%", height: "24px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                width: `${completionRate}%`,
                height: "100%",
                backgroundColor: "#1d6ab7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "11px",
                fontWeight: "bold"
              }}>
                {completionRate}%
              </div>
            </div>
          </div>

          {/* Defects Table */}
          {formData.defectLogs && formData.defectLogs.length > 0 && (
            <div style={{ marginBottom: "25px" }}>
              <h4 style={{ color: "#1d6ab7", marginBottom: "12px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Defects Recorded
              </h4>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #1d6ab7" }}>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: "bold", color: "#333" }}>Defect Type</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#333", width: "120px" }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.defectLogs.map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px", color: "#555" }}>
                        {log.defect_type && log.defect_type.charAt(0).toUpperCase() + log.defect_type.slice(1)}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center", color: "#333", fontWeight: "bold" }}>
                        {log.defect_count || 0}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "#f9fafb", fontWeight: "bold", borderTop: "2px solid #1d6ab7" }}>
                    <td style={{ padding: "10px", color: "#333" }}>TOTAL DEFECTS</td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#e02424", fontSize: "14px" }}>{totalDefects}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cancellation Reason */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#1d6ab7", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Cancellation Reason *
            </label>
            <textarea
              autoFocus
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please explain why this product is being cancelled (e.g., customer request, material shortage, production issue, etc.)"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontFamily: "Arial, sans-serif",
                fontSize: "13px",
                lineHeight: "1.5",
                minHeight: "100px",
                boxSizing: "border-box",
                fontWeight: "400",
                outline: "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                resize: "vertical"
              }}
              onFocus={(e) => { e.target.style.borderColor = "#1d6ab7"; e.target.style.boxShadow = "0 0 0 3px rgba(29,106,183,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
            />
            {!cancellationReason && (
              <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#dc2626", fontWeight: "500" }}>
                ⚠️ Reason is required for accountability
              </p>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          justifyContent: "flex-end",
          padding: "20px 30px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb"
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px", 
              borderRadius: "6px",
              border: "1px solid #d1d5db", 
              background: "#f3f4f6",
              cursor: "pointer", 
              fontWeight: 600, 
              fontSize: "13px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = "#e5e7eb"; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = "#f3f4f6"; }}
          >
            Don't Cancel
          </button>
          <button
            onClick={() => {
              if (!cancellationReason.trim()) {
                showToast("Please provide a cancellation reason", "error");
                return;
              }
              onConfirm();
            }}
            disabled={!cancellationReason.trim()}
            style={{
              padding: "10px 24px", 
              borderRadius: "6px",
              border: "none", 
              background: cancellationReason.trim() ? "#dc2626" : "#d1d5db",
              color: "#fff", 
              cursor: cancellationReason.trim() ? "pointer" : "not-allowed", 
              fontWeight: 600, 
              fontSize: "13px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { if (cancellationReason.trim()) e.target.style.backgroundColor = "#b91c1c"; }}
            onMouseLeave={(e) => { if (cancellationReason.trim()) e.target.style.backgroundColor = "#dc2626"; }}
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancellationReasonModal;
