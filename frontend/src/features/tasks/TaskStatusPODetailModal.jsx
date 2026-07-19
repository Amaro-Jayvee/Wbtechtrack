import React from "react";

function TaskStatusPODetailModal({
  po,
  products,
  filterStatus,
  onClose,
  onOpenProduct
}) {
  if (!po) return null;

  const title = filterStatus === "done" ? "PO - Completed Products" : "PO - In-Progress Products";

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          maxWidth: "1100px",
          width: "92%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          className="modal-header"
          style={{
            backgroundColor: "#1D6AB7",
            color: "white",
            padding: "16px 20px",
            borderBottom: "2px solid rgba(255,255,255,0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
              Issuance No: <span style={{ fontWeight: 700 }}>{po.request_id}</span> • Requester: {po.requester_name || "—"}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: 28,
              lineHeight: 1,
              cursor: "pointer",
              padding: 0
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: 16, overflowY: "auto" }}>
          <div style={{ marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: "#f5f8ff", border: "1px solid #dbe7ff", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#4b5563" }}>Deadline</div>
              <div style={{ fontWeight: 800, color: "#1D6AB7" }}>{po.deadline || "—"}</div>
            </div>
            <div style={{ background: "#f5f8ff", border: "1px solid #dbe7ff", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#4b5563" }}>Products</div>
              <div style={{ fontWeight: 800, color: "#111827" }}>{products.length}</div>
            </div>
            <div style={{ background: "#f5f8ff", border: "1px solid #dbe7ff", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#4b5563" }}>Overall Progress</div>
              <div style={{ fontWeight: 800, color: "#1D6AB7" }}>{po.overall_progress || "0%"}</div>
            </div>
          </div>

          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Product Name</th>
                <th>Progress / Status</th>
                {filterStatus === "done" ? (
                  <>
                    <th>Total Defects</th>
                    <th>Completed Date</th>
                  </>
                ) : (
                  <>
                    <th>Quota (Done / Total)</th>
                    <th>Defect Count</th>
                  </>
                )}
                <th>Last Update</th>
                <th style={{ width: 90, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const completedQuota = p.completed_quota || 0;
                return (
                  <tr key={p.request_product_id || p.id}>
                    <td style={{ fontWeight: 700 }}>
                      {p.product_name || "N/A"}
                    </td>
                    <td>
                      {filterStatus === "done" ? (
                        <span style={{ color: "#16a34a", fontWeight: 800 }}>✓ Done</span>
                      ) : p.is_pst_01 ? (
                        <span style={{ color: "#1D6AB7", fontWeight: 800 }}>✓ Withdrawal</span>
                      ) : (
                        <span>
                          <span style={{ fontWeight: 800 }}>{p.progress || "0%"}</span>
                        </span>
                      )}
                    </td>

                    {filterStatus === "done" ? (
                      <>
                        <td>{p.defect_count || 0}</td>
                        <td>{p.completed_at || "N/A"}</td>
                      </>
                    ) : (
                      <>
                        <td>
                          {completedQuota} / {p.total_quota || 0}
                        </td>
                        <td>{p.defect_count || 0}</td>
                      </>
                    )}

                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "#666" }}>
                      {p.updated_at ? new Date(p.updated_at).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : "N/A"}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button className="actions-menu-btn" title="Edit" onClick={() => onOpenProduct(p)}>
                        ⋯
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TaskStatusPODetailModal;