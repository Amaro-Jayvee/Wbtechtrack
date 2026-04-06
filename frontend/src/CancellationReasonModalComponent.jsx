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

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          padding: "32px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          borderTop: "4px solid #E01818",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", color: "#E01818", fontSize: "18px", fontWeight: "700" }}>
          ⚠️ Cancel Product Request
        </h3>
        <p style={{ margin: "0 0 20px 0", color: "#666", fontSize: "14px", lineHeight: "1.5" }}>
          You are about to cancel <strong>{taskData?.product_name}</strong>. Please provide a reason for the cancellation.
        </p>
        
        {/* Progress Summary */}
        <div style={{
          backgroundColor: "#f5f5f5",
          padding: "16px",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "13px",
          borderLeft: "4px solid #1D6AB7"
        }}>
          <p style={{ margin: "0 0 8px 0", fontWeight: "600", color: "#333" }}>📊 Progress Before Cancellation:</p>
          <ul style={{ margin: "0", paddingLeft: "20px", color: "#555" }}>
            <li>Completed: {formData.completed_quota || 0} / {taskData.total_quota || 0} units</li>
            <li>Progress: {taskData.total_quota > 0 ? ((formData.completed_quota / taskData.total_quota) * 100).toFixed(1) : 0}%</li>
            <li>Defects Recorded: {formData.defectLogs.reduce((sum, log) => sum + (Number(log.defect_count) || 0), 0)}</li>
          </ul>
        </div>

        {/* Cancellation Reason Input */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333", fontSize: "14px" }}>
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
              border: "1px solid #ddd",
              fontFamily: "Arial, sans-serif",
              fontSize: "13px",
              lineHeight: "1.5",
              minHeight: "100px",
              boxSizing: "border-box",
              fontWeight: "500",
              outline: "none",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease"
            }}
            onFocus={(e) => { e.target.style.borderColor = "#1D6AB7"; e.target.style.boxShadow = "0 0 0 3px rgba(29,106,183,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#ddd"; e.target.style.boxShadow = "none"; }}
          />
          {!cancellationReason && (
            <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#d32f2f", fontWeight: "500" }}>
              ⚠️ Reason is required for accountability
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px", borderRadius: "6px",
              border: "1px solid #ddd", background: "#f5f5f5",
              cursor: "pointer", fontWeight: 500, fontSize: "14px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = "#e0e0e0"; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = "#f5f5f5"; }}
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
              padding: "10px 24px", borderRadius: "6px",
              border: "none", background: cancellationReason.trim() ? "#E01818" : "#ccc",
              color: "#fff", cursor: cancellationReason.trim() ? "pointer" : "not-allowed", 
              fontWeight: 600, fontSize: "14px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { if (cancellationReason.trim()) e.target.style.backgroundColor = "#A01010"; }}
            onMouseLeave={(e) => { if (cancellationReason.trim()) e.target.style.backgroundColor = "#E01818"; }}
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancellationReasonModal;
