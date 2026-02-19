import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";

function TaskDetailModal({ productProcessId, onClose, onSave }) {
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    completed_quota: 0,
    defect_count: 0,
    workers: [],
  });
  const [workers, setWorkers] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const workerDropdownRef = useRef(null);

  useEffect(() => {
    if (productProcessId) {
      console.log(`⚡ Step changed to productProcessId: ${productProcessId}`);
      console.log(`   Clearing old data...`);
      // Clear old data immediately to prevent stale data display
      setTaskData(null);
      setFormData({
        completed_quota: 0,
        defect_count: 0,
        workers: [],
      });
      setShowWorkerDropdown(false); // Reset dropdown state
      console.log(`   Fetching new step data...`);
      setLoading(true);
      fetchTaskDetail();
      fetchWorkers();
    }
  }, [productProcessId]);

  // Handle click outside worker dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (workerDropdownRef.current && !workerDropdownRef.current.contains(event.target)) {
        setShowWorkerDropdown(false);
      }
    };

    if (showWorkerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showWorkerDropdown]);

  const fetchTaskDetail = async () => {
    const currentProductId = productProcessId; // Capture current ID for race condition check
    setLoading(true);
    console.log(`🔄 fetchTaskDetail START for productProcessId: ${currentProductId}`);
    try {
      console.log(`📥 Fetching task detail for ID: ${productProcessId}`);
      
      const response = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      // Abort if productProcessId has changed (race condition check)
      if (currentProductId !== productProcessId) {
        console.log(`⚠️ Discarding response for deprecated product ID: ${currentProductId}`);
        return;
      }

      console.log(`📡 API Response Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Task data loaded:`, {
        id: data.id,
        step_order: data.step_order,
        process_name: data.process_name,
        completed_quota: data.completed_quota,
        defect_count: data.defect_count,
        total_quota: data.total_quota,
        workers: data.workers,
      });
      
      // Validate essential fields exist
      if (!data.id) {
        console.warn("⚠️ Warning: API response missing 'id' field");
      }
      
      setTaskData(data);
      console.log(`📋 Setting formData to API values:`, {
        completed_quota: data.completed_quota || 0,
        defect_count: data.defect_count || 0,
        workers: Array.isArray(data.workers) ? data.workers : [],
      });
      setFormData({
        completed_quota: data.completed_quota || 0,
        defect_count: data.defect_count || 0,
        workers: Array.isArray(data.workers) ? data.workers : [],
      });
    } catch (err) {
      console.error("❌ Error fetching task detail:", err);
      setTaskData(null);
    } finally {
      setLoading(false);
      console.log(`🔄 fetchTaskDetail END`);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/app/worker/?include_inactive=false",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error fetching workers:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For number inputs, handle leading zeros properly
    if (name === "completed_quota" || name === "defect_count") {
      let numValue;
      
      if (value === "" || value === "0") {
        numValue = 0;
      } else {
        numValue = parseInt(value, 10);
      }
      
      setFormData({
        ...formData,
        [name]: isNaN(numValue) ? 0 : numValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleAddWorker = (workerID) => {
    if (!formData.workers.includes(workerID)) {
      setFormData({
        ...formData,
        workers: [...formData.workers, workerID],
      });
      setShowWorkerDropdown(false);
    }
  };

  const handleRemoveWorker = (workerID) => {
    setFormData({
      ...formData,
      workers: formData.workers.filter((id) => id !== workerID),
    });
  };

  // Get list of available workers (not yet assigned)
  const getAvailableWorkers = () => {
    return workers.filter((w) => !formData.workers.includes(w.WorkerID));
  };

  // Get assigned worker objects
  const getAssignedWorkers = () => {
    return workers.filter((w) => formData.workers.includes(w.WorkerID));
  };

  const handleSave = async () => {
    if (!taskData) return;
    
    try {
      console.log(`📤 PATCH: /app/product/${productProcessId}/`, formData);
      
      const response = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const responseData = await response.json();
      console.log(`📨 Response (${response.status}):`, responseData);
      
      if (response.ok) {
        alert("✓ Changes saved successfully!");
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        // Close modal immediately
        onClose();
        
        // Call parent callback to refresh table (without auto-opening)
        if (onSave) {
          onSave();
        }
      } else {
        const errorMsg = responseData.detail || responseData.error || "Unknown error";
        console.error(`❌ Save failed:`, errorMsg);
        alert(`✗ Error saving changes:\n${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      alert("✗ Network error: " + err.message);
    }
  };

  const handleNext = async () => {
    if (!taskData) return;

    try {
      // Validate completion
      const totalRequired = taskData.total_quota || 0;
      if (formData.completed_quota < totalRequired) {
        alert(
          `⚠️ Cannot proceed!\n\nCompleted: ${formData.completed_quota}\nRequired: ${totalRequired}`
        );
        return;
      }

      // Validate that at least one worker is assigned
      if (!formData.workers || formData.workers.length === 0) {
        alert(
          `⚠️ Cannot proceed!\n\nYou must assign at least one worker to this step before moving to the next step.`
        );
        return;
      }

      console.log(`💾 Saving step ${taskData.step_order}/${taskData.total_steps}...`);
      console.log(`   Current data:`, formData);
      
      // Save current step with all data (quota, defects, workers)
      const saveResponse = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        console.error(`❌ Save error:`, errorData);
        throw new Error(errorData.detail || "Failed to save step");
      }

      const savedData = await saveResponse.json();
      console.log(`✅ Step ${taskData.step_order} saved successfully`);
      console.log(`   Saved data:`, {
        completed_quota: savedData.completed_quota,
        defect_count: savedData.defect_count,
        workers: savedData.workers,
        is_completed: savedData.is_completed
      });

      // Fetch all steps for this product to find the next one
      console.log(`🔍 Finding next step for product (request_product_id: ${taskData.request_product_id})`);
      
      const stepsResponse = await fetch(
        `http://localhost:8000/app/product/?include_archived=false`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!stepsResponse.ok) {
        throw new Error("Failed to fetch steps list");
      }

      const allSteps = await stepsResponse.json();
      
      // Filter steps for this product and sort by step_order
      const productSteps = allSteps
        .filter(step => 
          step.request_product_id === taskData.request_product_id && 
          !step.archived_at
        )
        .sort((a, b) => a.step_order - b.step_order);

      console.log(`📋 Total steps for this product: ${productSteps.length}`);
      productSteps.forEach((s, idx) => {
        console.log(`   [${idx}] Step ${s.step_order}: ${s.process_name} (ID: ${s.id}, Completed: ${s.is_completed})`);
      });
      
      // Find current step index
      const currentIndex = productSteps.findIndex(s => s.id === productProcessId);
      console.log(`📍 Current step index: ${currentIndex} (ID: ${productProcessId})`);
      
      const nextStep = productSteps[currentIndex + 1];

      if (nextStep) {
        console.log(`✅ Next step found: Step ${nextStep.step_order}/${nextStep.total_steps} - ${nextStep.process_name}`);
        alert(
          `✓ Step ${taskData.step_order} completed!\n\n` +
          `Step ${nextStep.step_order}: ${nextStep.process_name} is ready for editing.`
        );
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        // Close modal
        onClose();
        
        // Refresh table only (don't auto-open next step)
        if (onSave) {
          console.log(`🔄 Refreshing table after step completion`);
          onSave();
        }
      } else {
        console.log("✅ All steps completed for this product!");
        console.log(`📦 Archiving request product ID: ${taskData.request_product_id}`);
        
        // Archive the request product
        try {
          const archiveResponse = await fetch(
            `http://localhost:8000/app/request-products/${taskData.request_product_id}/`,
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ archived_at: new Date().toISOString() }),
            }
          );

          if (archiveResponse.ok) {
            console.log(`✅ Request product archived successfully`);
          } else {
            console.error(`⚠️ Failed to archive request product`);
          }
        } catch (archiveErr) {
          console.error(`❌ Error archiving request product:`, archiveErr);
        }
        
        alert(
          "🎉 All production steps completed!\n\n" +
          "This product has finished all required processes and is now archived."
        );
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        onClose();
        if (onSave) {
          onSave();
        }
      }
    } catch (err) {
      console.error("❌ Error in handleNext:", err);
      alert(`✗ Error: ${err.message}`);
    }
  };

  const handleRequestExtension = async () => {
    alert("Request Extension workflow not yet implemented");
  };

  const handleDelete = () => {
    if (!taskData) return;
    // Just show the confirmation modal
    setShowDeleteConfirmModal(true);
  };

  const performDelete = async () => {
    if (!taskData) return;

    try {
      console.log(`🗑️ Deleting ProductProcess ID: ${productProcessId}`);

      const response = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();
      console.log(`📨 Delete Response (${response.status}):`, responseData);

      if (response.ok) {
        alert(`✓ Step ${taskData.step_order} deleted successfully!`);
        
        // Close both modals
        setShowDeleteConfirmModal(false);
        onClose();
        
        // Refresh parent table
        if (onSave) {
          console.log(`🔄 Refreshing table after step deletion`);
          onSave();
        }
      } else {
        const errorMsg = responseData.detail || responseData.message || "Unknown error";
        console.error(`❌ Delete failed:`, errorMsg);
        alert(`✗ Error deleting step:\n${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      alert("✗ Network error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading task details...</div>
        </div>
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <p>❌ Task not found</p>
        </div>
      </div>
    );
  }

  // Safe calculation of progress
  const totalQty = taskData.total_quota || 1;
  const completed = formData.completed_quota || 0;
  const progress = Math.round((completed / totalQty) * 100);

  // Delete Confirmation Modal
  const DeleteConfirmModal = () => {
    if (!showDeleteConfirmModal) return null;

    return (
      <div 
        className="modal-overlay" 
        onClick={() => setShowDeleteConfirmModal(false)}
        style={{ zIndex: 9999, position: "fixed" }}
      >
        <div 
          className="modal-content" 
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "400px",
            backgroundColor: "#fff",
            borderLeft: "4px solid #dc3545"
          }}
        >
          <div className="modal-header" style={{ borderBottom: "1px solid #dee2e6" }}>
            <h3 style={{ margin: 0, color: "#dc3545" }}>⚠️ Delete Step {taskData.step_order}/{taskData.total_steps}</h3>
            <button 
              className="btn-close" 
              onClick={() => setShowDeleteConfirmModal(false)}
              style={{ position: "absolute", right: "15px", top: "15px" }}
            ></button>
          </div>

          <div className="modal-body" style={{ padding: "20px" }}>
            <p><strong>Process:</strong> {taskData.process_name}</p>
            <p><strong>Progress:</strong> {formData.completed_quota}/{taskData.total_quota}</p>
            <hr />
            <p style={{ color: "#dc3545", fontWeight: "bold" }}>
              ⚠️ This action cannot be undone.
            </p>
            <p>Are you sure you want to delete this step?</p>
          </div>

          <div style={{
            padding: "15px 20px",
            borderTop: "1px solid #dee2e6",
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end"
          }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                performDelete();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Task Information</h2>
          <div className="modal-actions">
            <button 
              className="btn-icon" 
              title="Add Worker"
              onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
            >
              + Add Worker
            </button>
            <button 
              className="btn-icon" 
              title="Delete Step"
              onClick={handleDelete}
              style={{ color: "#dc3545" }}
            >
              <i className="bi bi-trash"></i> Delete
            </button>
            <button className="btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Row 1: Product Name | Progress Bar */}
          <div className="task-row">
            <div className="task-section flex-2">
              <label className="section-label">Product Name</label>
              <input
                type="text"
                value={taskData.product_name || "—"}
                disabled
                className="input-text"
              />
            </div>
            <div className="task-section flex-1">
              <label className="section-label">Progress Bar</label>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Row 2: Process | Step Order | Start Date */}
          <div className="task-row">
            <div className="task-section flex-1">
              <label className="section-label">
                Process ({taskData.step_order || 0}/{taskData.total_steps || 0})
              </label>
              <input
                type="text"
                value={taskData.process_name || "—"}
                disabled
                className="input-text"
              />
            </div>
            <div className="task-section flex-1">
              <label className="section-label">
                Step Order ({taskData.step_order || 0}/{taskData.total_steps || 0})
              </label>
              <input
                type="text"
                value={`${taskData.step_order || 0}/${taskData.total_steps || 0}`}
                disabled
                className="input-text"
              />
            </div>
            <div className="task-section flex-1">
              <label className="section-label">Start Date</label>
              <input
                type="text"
                value={taskData.production_date_formatted || "—"}
                disabled
                className="input-text"
              />
            </div>
          </div>

          {/* Row 3: Workers | Due Date */}
          <div className="task-row">
            <div className="task-section flex-1" ref={workerDropdownRef}>
              <label className="section-label">Assign To</label>
              <div className="worker-tags">
                {getAssignedWorkers().length > 0 ? (
                  getAssignedWorkers().map((worker) => (
                    <span key={worker.WorkerID} className="worker-tag">
                      {`${worker.FirstName} ${worker.LastName}`}
                      <button
                        type="button"
                        className="worker-tag-remove"
                        onClick={() => handleRemoveWorker(worker.WorkerID)}
                        title="Remove worker"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No workers assigned</span>
                )}
              </div>
              
              {/* Worker dropdown */}
              {showWorkerDropdown && getAvailableWorkers().length > 0 && (
                <div className="worker-dropdown">
                  {getAvailableWorkers().map((worker) => (
                    <div
                      key={worker.WorkerID}
                      className="worker-dropdown-item"
                      onClick={() => handleAddWorker(worker.WorkerID)}
                    >
                      {`${worker.FirstName} ${worker.LastName}`}
                    </div>
                  ))}
                </div>
              )}
              {showWorkerDropdown && getAvailableWorkers().length === 0 && (
                <div className="worker-dropdown-empty">
                  All workers assigned
                </div>
              )}
            </div>
            <div className="task-section flex-1">
              <label className="section-label">Due Date</label>
              <input
                type="text"
                value={taskData.due_date || "—"}
                disabled
                className="input-text"
              />
            </div>
          </div>

          {/* Row 4: Outputs | Defects | Extension */}
          <div className="task-row">
            <div className="task-section flex-1">
              <label className="section-label">Completed Outputs</label>
              <div className="input-group">
                <input
                  type="number"
                  name="completed_quota"
                  value={formData.completed_quota}
                  onChange={handleInputChange}
                  className="input-text"
                  placeholder="0"
                  min="0"
                  max={taskData.total_quota}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value, 10) || 0;
                    setFormData({...formData, completed_quota: num});
                  }}
                />
                <span className="input-suffix">/ {taskData.total_quota || 0}</span>
              </div>
            </div>
            <div className="task-section flex-1">
              <label className="section-label">Defect Count</label>
              <input
                type="number"
                name="defect_count"
                value={formData.defect_count}
                onChange={handleInputChange}
                className="input-text"
                placeholder="0"
                min="0"
                onBlur={(e) => {
                  const num = parseInt(e.target.value, 10) || 0;
                  setFormData({...formData, defect_count: num});
                }}
              />
            </div>
            <div className="task-section flex-1 flex-center">
              <button 
                className="btn-orange"
                onClick={handleRequestExtension}
                style={{ marginTop: "24px" }}
              >
                Request Extension
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            className="btn-primary" 
            onClick={handleNext}
            disabled={
              formData.completed_quota < (taskData.total_quota || 0) || 
              !formData.workers || 
              formData.workers.length === 0
            }
            title={
              formData.completed_quota < (taskData.total_quota || 0)
                ? `Complete this step first: ${formData.completed_quota}/${taskData.total_quota}`
                : !formData.workers || formData.workers.length === 0
                  ? "Assign at least one worker before proceeding"
                  : "Proceed to next step"
            }
          >
            Next ({formData.completed_quota}/{taskData.total_quota || 0})
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-success" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
      <DeleteConfirmModal />
    </>
  );
}

export default TaskDetailModal;
