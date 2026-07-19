import React, { useState, useEffect } from "react";
import { apiCall } from "../../shared/utils/csrfUtils.js";

function QuotaDefectModal({ product, onClose, onSave }) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [quota, setQuota] = useState(0);
  const [defectLogs, setDefectLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("steps"); // "steps" or "finished"

  // Finished product state
  const [finishedQuantity, setFinishedQuantity] = useState(0);

  const steps = product.steps || [];
  const selectedStep = steps[selectedStepIndex];
  const totalQuota = product.total_quota || 0;

  // Each step has min=0, max=totalQuota (independent from other steps)
  const currentStepMin = 0;
  const currentStepTotal = totalQuota;

  // Get last step's total completed (for finished product validation)
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const lastStepTotal = lastStep
    ? (parseInt(lastStep.completed_quota) || 0) + (parseInt(lastStep.ot_quota) || 0)
    : 0;

  useEffect(() => {
    if (steps.length === 0) return;
    setSelectedStepIndex(0);
    const step = steps[0];
    setQuota(step.completed_quota || 0);
    if (step.defect_logs && step.defect_logs.length > 0) {
      setDefectLogs(step.defect_logs);
    } else {
      setDefectLogs([{ defect_type: "", defect_count: 0 }]);
    }
    // Initialize finished quantity from the last step's finished_quantity
    const last = steps[steps.length - 1];
    setFinishedQuantity(last?.finished_quantity || 0);
  }, [product]);

  useEffect(() => {
    if (!selectedStep) return;
    setQuota(selectedStep.completed_quota || 0);
    if (selectedStep.defect_logs && selectedStep.defect_logs.length > 0) {
      setDefectLogs(selectedStep.defect_logs);
    } else {
      setDefectLogs([{ defect_type: "", defect_count: 0 }]);
    }
    setError("");
  }, [selectedStepIndex]);

  const handleDefectLogChange = (index, field, value) => {
    setDefectLogs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addDefectRow = () => {
    setDefectLogs(prev => [...prev, { defect_type: "", defect_count: 0 }]);
  };

  const removeDefectRow = (index) => {
    setDefectLogs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    console.log("[QuotaDefectModal] ========== SAVE CLICKED ==========");
    console.log("[QuotaDefectModal] activeTab:", activeTab);

    // Handle Finished Product save
    if (activeTab === "finished") {
      const enteredFinishedQty = parseInt(finishedQuantity) || 0;

      // Validation: finished quantity must not exceed last step's total completed
      if (lastStep && enteredFinishedQty > lastStepTotal) {
        const errMsg = `Finished product quantity (${enteredFinishedQty}) cannot exceed the last step's total completed quota (${lastStepTotal}).`;
        console.error("[QuotaDefectModal] Validation failed:", errMsg);
        setError(errMsg);
        return;
      }

      if (!lastStep) {
        const errMsg = "No steps available to save finished product.";
        setError(errMsg);
        return;
      }

      setSaving(true);
      setError("");

      try {
        const payload = {
          finished_quantity: enteredFinishedQty,
        };

        console.log("[QuotaDefectModal] Sending PATCH to:", `/app/product/${lastStep.id}/`);
        console.log("[QuotaDefectModal] Payload:", payload);

        const response = await apiCall(`/app/product/${lastStep.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        console.log("[QuotaDefectModal] Response status:", response.status);
        const responseData = await response.json();
        console.log("[QuotaDefectModal] Response data:", responseData);

        if (!response.ok) {
          console.error("[QuotaDefectModal] Response not OK:", responseData);
          throw new Error(responseData.error || responseData.detail || "Failed to save finished product");
        }

        console.log("[QuotaDefectModal] Save successful, calling onSave");
        onSave && onSave();
      } catch (err) {
        console.error("[QuotaDefectModal] Save error:", err);
        setError(`Save failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Handle regular step quota save
    if (!selectedStep) {
      const errMsg = "No step selected";
      console.error("[QuotaDefectModal]", errMsg);
      setError(errMsg);
      return;
    }

    const enteredQuota = parseInt(quota) || 0;
    console.log("[QuotaDefectModal] enteredQuota:", enteredQuota, "currentStepMin:", currentStepMin, "currentStepTotal:", currentStepTotal);

    if (enteredQuota < currentStepMin) {
      const errMsg = `Cannot reduce quota below ${currentStepMin}.`;
      console.error("[QuotaDefectModal] Validation failed:", errMsg);
      setError(errMsg);
      return;
    }

    if (enteredQuota > currentStepTotal) {
      const errMsg = `Invalid quota: ${enteredQuota} exceeds maximum allowed ${currentStepTotal} for this step.`;
      console.error("[QuotaDefectModal] Validation failed:", errMsg);
      setError(errMsg);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        completed_quota: enteredQuota,
        defect_logs: defectLogs.filter(log => log.defect_type && log.defect_count > 0),
      };

      console.log("[QuotaDefectModal] Sending PATCH to:", `/app/product/${selectedStep.id}/`);
      console.log("[QuotaDefectModal] Payload:", payload);

      const response = await apiCall(`/app/product/${selectedStep.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      console.log("[QuotaDefectModal] Response status:", response.status);
      const responseData = await response.json();
      console.log("[QuotaDefectModal] Response data:", responseData);

      if (!response.ok) {
        console.error("[QuotaDefectModal] Response not OK:", responseData);
        throw new Error(responseData.error || responseData.detail || "Failed to save");
      }

      console.log("[QuotaDefectModal] Save successful, calling onSave");
      onSave && onSave();
    } catch (err) {
      console.error("[QuotaDefectModal] Save error:", err);
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = totalQuota > 0 ? Math.round((quota / totalQuota) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: "#1D6AB7", color: "white", padding: "16px 20px", borderBottom: "2px solid rgba(255,255,255,0.35)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Edit Quota & Defect</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
              Product: <span style={{ fontWeight: 700 }}>{product.product_name || "N/A"}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 28, lineHeight: 1, cursor: "pointer", padding: 0 }} aria-label="Close">×</button>
        </div>

        <div className="modal-body" style={{ padding: 20, overflowY: "auto" }}>
          {saving && (
            <div style={{ backgroundColor: "#d1ecf1", color: "#0c5460", padding: "12px 16px", borderRadius: "6px", marginBottom: "15px", border: "1px solid #bee5eb", fontWeight: 600 }}>
              💾 Saving...
            </div>
          )}

          {/* Tab Selector: Steps | Final Product */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            <button
              onClick={() => setActiveTab("steps")}
              style={{
                flex: 1,
                padding: "10px 12px",
                backgroundColor: activeTab === "steps" ? "#1D6AB7" : "#f0f0f0",
                color: activeTab === "steps" ? "white" : "#333",
                border: `2px solid ${activeTab === "steps" ? "#1D6AB7" : "#ddd"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: activeTab === "steps" ? 700 : 500,
                fontSize: "12px",
                textAlign: "center"
              }}
            >
              <div>Production Steps</div>
              <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "2px" }}>Quota & Defects</div>
            </button>
            <button
              onClick={() => setActiveTab("finished")}
              style={{
                flex: 1,
                padding: "10px 12px",
                backgroundColor: activeTab === "finished" ? "#52A374" : "#f0f0f0",
                color: activeTab === "finished" ? "white" : "#333",
                border: `2px solid ${activeTab === "finished" ? "#52A374" : "#ddd"}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: activeTab === "finished" ? 700 : 500,
                fontSize: "12px",
                textAlign: "center"
              }}
            >
              <div>Final Product</div>
              <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "2px" }}>Packed Units</div>
            </button>
          </div>

          {activeTab === "steps" && (
            <>
              {/* Step Selector Bar */}
              {steps.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#374151" }}>Select Step to Edit</label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {steps.map((step, idx) => {
                      const isActive = idx === selectedStepIndex;
                      const stepQuota = step.completed_quota || 0;
                      const isStepCompleted = step.is_completed;
                      return (
                        <button
                          key={step.id}
                          onClick={() => {
                            if (!isStepCompleted) {
                              setSelectedStepIndex(idx);
                            }
                          }}
                          disabled={saving}
                          style={{
                            flex: 1,
                            minWidth: "100px",
                            padding: "10px 12px",
                            backgroundColor: isActive ? "#1D6AB7" : isStepCompleted ? "#e8f5e9" : "#f0f0f0",
                            color: isActive ? "white" : isStepCompleted ? "#2e7d32" : "#333",
                            border: `2px solid ${isActive ? "#1D6AB7" : isStepCompleted ? "#a5d6a7" : "#ddd"}`,
                            borderRadius: "6px",
                            cursor: saving || isStepCompleted ? "not-allowed" : "pointer",
                            fontWeight: isActive ? 700 : isStepCompleted ? 600 : 500,
                            fontSize: "12px",
                            transition: "all 0.2s",
                            textAlign: "center",
                            opacity: isStepCompleted && !isActive ? 0.7 : 1
                          }}
                        >
                          <div>Step {idx + 1}</div>
                          <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "2px" }}>{step.process_name || `Step ${idx + 1}`}</div>
                          <div style={{ fontSize: "10px", marginTop: "2px", fontWeight: 600 }}>
                            {isStepCompleted ? `✅ ${stepQuota}/${totalQuota}` : `${stepQuota}/${totalQuota}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Step Info */}
              {selectedStep && (
                <>
                  <div style={{ backgroundColor: selectedStep.is_completed ? "#f0fdf4" : "#f5f8ff", border: `1px solid ${selectedStep.is_completed ? "#bbf7d0" : "#dbe7ff"}`, borderRadius: 8, padding: "14px 16px", marginBottom: "18px" }}>
                    <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 6 }}>Currently Editing</div>
                    <div style={{ fontWeight: 800, color: selectedStep.is_completed ? "#16a34a" : "#1D6AB7", fontSize: 16 }}>{selectedStep.process_name || `Step ${selectedStepIndex + 1}`}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Status: {selectedStep.is_completed ? "✅ Completed - Locked" : "⏳ In Progress"}</div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Progress</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1D6AB7" }}>{progressPercent}%</span>
                    </div>
                    <div style={{ backgroundColor: "#e0e0e0", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ backgroundColor: "#1D6AB7", height: "100%", width: `${Math.min(progressPercent, 100)}%`, transition: "width 0.3s" }}></div>
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{quota} / {totalQuota} units</div>
                  </div>

                  {/* Quota Input */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Completed Quota</label>
                    <input
                      type="number"
                      min={0}
                      max={totalQuota}
                      value={quota}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val < 0) {
                          setError("⚠️ Value cannot be negative.");
                        } else if (val > totalQuota && totalQuota > 0) {
                          setError(`⚠️ Cannot exceed ${totalQuota} for this product.`);
                        } else {
                          setError("");
                        }
                        setQuota(e.target.value);
                      }}
                      onBlur={() => {
                        const val = parseInt(quota) || 0;
                        if (val > totalQuota && totalQuota > 0) {
                          setError(`⚠️ Invalid quota: ${val} exceeds maximum ${totalQuota} for this product.`);
                        }
                      }}
                      disabled={saving || selectedStep.is_completed}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: error ? "2px solid #dc3545" : "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: saving || selectedStep.is_completed ? 0.6 : 1,
                        backgroundColor: error ? "#fff5f5" : selectedStep.is_completed ? "#f0fdf4" : "white",
                        cursor: selectedStep.is_completed ? "not-allowed" : "text"
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                      Allowed range: 0 - {totalQuota} units
                      {selectedStep.is_completed && (
                        <span style={{ color: "#16a34a", fontWeight: 600, marginLeft: "8px" }}>
                          ✅ Step is completed and locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Defect Logs - hide inputs when step is completed */}
                  {selectedStep.is_completed ? (
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Defect Logs</label>
                      <div style={{ fontSize: 12, color: "#666", padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: 6 }}>
                        Total Defects: {defectLogs.reduce((sum, log) => sum + (parseInt(log.defect_count) || 0), 0)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Defect Logs</label>
                        <button type="button" onClick={addDefectRow} disabled={saving} style={{ padding: "4px 10px", fontSize: 12, backgroundColor: "#e9ecef", border: "1px solid #ced4da", borderRadius: 4, cursor: saving ? "not-allowed" : "pointer" }}>+ Add</button>
                      </div>
                      {defectLogs.map((log, index) => (
                        <div key={index} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                          <select value={log.defect_type} onChange={(e) => handleDefectLogChange(index, "defect_type", e.target.value)} disabled={saving} style={{ flex: 1, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13 }}>
                            <option value="">Select type...</option>
                            <option value="dimension">Dimension problem</option>
                            <option value="thickness">Thickness problem</option>
                            <option value="rush">Rush problem</option>
                            <option value="other">Other</option>
                          </select>
                          <input type="number" min={0} value={log.defect_count} onChange={(e) => handleDefectLogChange(index, "defect_count", e.target.value)} disabled={saving} placeholder="Count" style={{ width: 70, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13 }} />
                          {defectLogs.length > 1 && (
                            <button type="button" onClick={() => removeDefectRow(index)} disabled={saving} style={{ padding: "6px 8px", backgroundColor: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 4, cursor: saving ? "not-allowed" : "pointer" }}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "finished" && (
            <>
              {/* Finished Product Section */}
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 16px", marginBottom: "18px" }}>
                <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 6 }}>Finished Product</div>
                <div style={{ fontWeight: 800, color: "#16a34a", fontSize: 16 }}>
                  ✓ Finished Product
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Enter the quantity of fully finished products that passed all production steps.
                </div>
              </div>

              {/* Finished Quantity Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Finished Product Quantity</label>
                <input
                  type="number"
                  min={0}
                  max={totalQuota}
                  value={finishedQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val < 0) {
                      setError("⚠️ Value cannot be negative.");
                    } else if (lastStep && val > lastStepTotal) {
                      setError(`⚠️ Finished quantity (${val}) exceeds last step's total (${lastStepTotal}).`);
                    } else {
                      setError("");
                    }
                    setFinishedQuantity(e.target.value);
                  }}
                  onBlur={() => {
                    const val = parseInt(finishedQuantity) || 0;
                    if (lastStep && val > lastStepTotal) {
                      setError(`⚠️ Finished quantity (${val}) exceeds last step's completed quota (${lastStepTotal}).`);
                    }
                  }}
                  disabled={saving}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: error ? "2px solid #dc3545" : "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: saving ? 0.6 : 1,
                    backgroundColor: error ? "#fff5f5" : "white"
                  }}
                />
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                  {lastStep ? (
                    <>Allowed range: 0 - {lastStepTotal} units (last step's completed quota)</>
                  ) : (
                    <>No steps available</>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ padding: "14px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, justifyContent: "flex-end", backgroundColor: "#f9fafb", flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #cbd5e1", backgroundColor: "white", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 18px", borderRadius: 6, border: "none", backgroundColor: saving ? "#94a3b8" : "#1D6AB7", color: "white", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13 }}>{saving ? "Saving..." : "Save"}</button>
        </div>

        {/* Error Popup Modal */}
        {error && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }} onClick={() => setError("")}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px 28px", maxWidth: "400px", width: "90%", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
              <h3 style={{ color: "#721c24", marginBottom: "12px", fontSize: "18px", fontWeight: 700 }}>Invalid Input</h3>
              <p style={{ color: "#333", fontSize: "14px", marginBottom: "20px", lineHeight: 1.5 }}>{error}</p>
              <button onClick={() => setError("")} style={{ padding: "8px 24px", borderRadius: 6, border: "none", backgroundColor: "#dc3545", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>OK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuotaDefectModal;