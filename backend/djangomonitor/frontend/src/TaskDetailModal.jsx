import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import ExtensionRequestModal from "./ExtensionRequestModal";

function TaskDetailModal({ productProcessId, onClose, onSave }) {
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCompletedView, setIsCompletedView] = useState(false);
  const [completedProductData, setCompletedProductData] = useState(null);
  const [formData, setFormData] = useState({
    completed_quota: 0,
    defect_count: 0,
    workers: [],
  });
  const [workers, setWorkers] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [nextStepInfo, setNextStepInfo] = useState(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [requestProductId, setRequestProductId] = useState(null);
  const [extensionRequestMade, setExtensionRequestMade] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // 'success' | 'error'
  const workerDropdownRef = useRef(null);

  useEffect(() => {
    if (productProcessId) {
      // Check if productProcessId is a number (step) or object (completed product)
      const isObject = typeof productProcessId === 'object' && productProcessId !== null;
      
      if (isObject) {
        console.log(`📋 Viewing completed task: ${productProcessId.product_name}`);
        setIsCompletedView(true);
        setCompletedProductData(productProcessId);
        setTaskData(null);
        setFormData({
          completed_quota: productProcessId.total_quota || 0,
          defect_count: productProcessId.defect_count || 0,
          workers: productProcessId.worker_names || [],
        });
        setNextStepInfo(null); // Clear next step info when viewing completed task
        setLoading(false);
      } else {
        console.log(`⚡ Step changed to productProcessId: ${productProcessId}`);
        setIsCompletedView(false);
        setCompletedProductData(null);
        // Clear old data immediately to prevent stale data display
        setTaskData(null);
        setFormData({
          completed_quota: 0,
          defect_count: 0,
          workers: [],
        });
        setNextStepInfo(null); // Clear next step info when loading new step
        console.log(`   Fetching new step data...`);
        setLoading(true);
        fetchTaskDetail();
      }
    }
  }, [productProcessId]);

  // Auto-dismiss success toast after 3 seconds
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

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
        request_product_id: data.request_product_id,
        step_order: data.step_order,
        process_name: data.process_name,
        completed_quota: data.completed_quota,
        defect_count: data.defect_count,
        total_quota: data.total_quota,
        workers: data.workers,
        worker_names: data.worker_names,
      });
      
      // Validate essential fields exist
      if (!data.id) {
        console.warn("⚠️ Warning: API response missing 'id' field");
      }
      
      // Check if workers field is returned
      if (!Array.isArray(data.workers)) {
        console.warn("⚠️ Warning: API response missing or invalid 'workers' field. Got:", typeof data.workers, data.workers);
      }
      
      // Debug: Check PST-01 detection
      console.log(`🔍 TaskData received - is_pst_01: ${data.is_pst_01}, process_number: ${data.process_number}, process_name: ${data.process_name}`);
      
      setTaskData(data);
      setRequestProductId(data.request_product_id);
      
      // Check if an extension has already been requested
      if (data.extension_status && data.extension_status !== 'none') {
        setExtensionRequestMade(true);
      } else {
        setExtensionRequestMade(false);
      }
      
      const workersArray = Array.isArray(data.workers) ? data.workers : [];
      console.log(`📋 Setting formData to API values:`, {
        completed_quota: data.completed_quota || 0,
        defect_count: data.defect_count || 0,
        workers: workersArray,
        workers_count: workersArray.length
      });
      setFormData({
        completed_quota: data.completed_quota || 0,
        defect_count: data.defect_count || 0,
        workers: workersArray,
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
        "http://localhost:8000/app/worker/",
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
    console.log(`➕ Adding worker ${workerID} to formData.workers`);
    console.log(`   Before: ${formData.workers.length} workers:`, formData.workers);
    
    if (!formData.workers.includes(workerID)) {
      const updatedWorkers = [...formData.workers, workerID];
      setFormData({
        ...formData,
        workers: updatedWorkers,
      });
      console.log(`   After: ${updatedWorkers.length} workers:`, updatedWorkers);
      setShowWorkerDropdown(false);
    } else {
      console.log(`   ⚠️ Worker ${workerID} already in list`);
    }
  };

  const handleRemoveWorker = (workerID) => {
    console.log(`➖ Removing worker ${workerID} from formData.workers`);
    console.log(`   Before: ${formData.workers.length} workers:`, formData.workers);
    const updatedWorkers = formData.workers.filter((id) => id !== workerID);
    setFormData({
      ...formData,
      workers: updatedWorkers,
    });
    console.log(`   After: ${updatedWorkers.length} workers:`, updatedWorkers);
  };

  // Get list of available workers (not yet assigned)
  const getAvailableWorkers = () => {
    return workers
      .filter((w) => !formData.workers.includes(w.WorkerID))
      .filter((w) => w.is_active); // Only show active workers for new assignments
  };

  // Get assigned worker objects
  const getAssignedWorkers = () => {
    return workers.filter((w) => formData.workers.includes(w.WorkerID));
  };

  const handleSave = async () => {
    if (!taskData) return;
    
    // Validate that completed_quota is not decreased
    if (formData.completed_quota < taskData.completed_quota) {
      setErrorMessage(
        `❌ Cannot decrease completed quota!\n\nPrevious: ${taskData.completed_quota}\nNew: ${formData.completed_quota}\n\nCompleted quota can only stay the same or increase.`
      );
      setShowErrorModal(true);
      return;
    }
    
    // Validate that defect_count is not decreased
    if (formData.defect_count < taskData.defect_count) {
      setErrorMessage(
        `❌ Cannot decrease defect count!\n\nPrevious: ${taskData.defect_count}\nNew: ${formData.defect_count}\n\nDefect count can only stay the same or increase.`
      );
      setShowErrorModal(true);
      return;
    }
    
    try {
      console.log(`📤 PATCH: /app/product/${productProcessId}/`);
      console.log(`   Sending formData:`, {
        completed_quota: formData.completed_quota,
        defect_count: formData.defect_count,
        workers: formData.workers,
        workers_count: formData.workers.length,
        worker_ids: formData.workers
      });
      
      const response = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed_quota: formData.completed_quota,
            defect_count: formData.defect_count,
            workers: formData.workers  // Ensure workers is explicitly sent
          }),
        }
      );

      const responseData = await response.json();
      console.log(`Response (${response.status}):`, responseData);
      
      if (response.ok) {
        console.log("Save successful - showing toast");
        
        // Show the success toast WHILE modal is still visible
        setToastMessage("Your progress has been saved successfully.");
        setShowSuccessToast(true);
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        // Close the modal after a short delay to let user see the toast
        setTimeout(() => {
          onClose();
          
          // Wait slightly longer before refreshing to ensure DB has updated is_completed status
          setTimeout(() => {
            console.log("🔄 Refreshing task list after save...");
            if (onSave) {
              onSave();
            }
          }, 300); // Wait 300ms for DB to fully update
        }, 1500);
      } else {
        const errorMsg = responseData.detail || responseData.error || JSON.stringify(responseData);
        console.error(`Save failed:`, errorMsg);
        setErrorMessage(`Error saving changes: ${errorMsg}`);
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error("Network error:", err);
      setErrorMessage("Network error: " + err.message);
      setShowErrorModal(true);
    }
  };

  const handleNext = async () => {
    if (!taskData) return;

    try {
      // For PST-01 (withdrawal), skip quota and worker validation
      if (!taskData.is_pst_01) {
        // Validate completion
        const totalRequired = taskData.total_quota || 0;
        if (formData.completed_quota < totalRequired) {
          setErrorMessage(
            `Cannot proceed to the next step.\n\nCompleted: ${formData.completed_quota}\nRequired: ${totalRequired}`
          );
          setShowErrorModal(true);
          return;
        }

        // Workers are optional - production decided all workers are flexible
      }

      console.log(`💾 Saving step ${taskData.step_order}/${taskData.total_steps}...`);
      console.log(`   Current data:`, {
        completed_quota: formData.completed_quota,
        defect_count: formData.defect_count,
        workers: formData.workers,
        workers_count: formData.workers.length,
        is_pst_01: taskData.is_pst_01
      });
      
      // Prepare save data
      const saveData = {
        completed_quota: formData.completed_quota,
        defect_count: formData.defect_count,
        workers: formData.workers
      };
      
      // For PST-01, mark as completed immediately since no quota tracking needed
      if (taskData.is_pst_01) {
        saveData.is_completed = true;
        console.log(`   ✅ PST-01 detected - marking step as completed`);
      }
      
      console.log(`📤 Sending PATCH request with data:`, saveData);
      
      // Save current step with all data (quota, defects, workers)
      const saveResponse = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(saveData),
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        console.error(`❌ Save error:`, errorData);
        throw new Error(errorData.detail || "Failed to save step");
      }

      const savedData = await saveResponse.json();
      console.log(`Step ${taskData.step_order} saved successfully`);
      console.log(`   Saved data:`, {
        completed_quota: savedData.completed_quota,
        defect_count: savedData.defect_count,
        workers: savedData.workers,
        worker_names: savedData.worker_names,
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

      // Show success toast WHILE modal is still visible
      if (nextStep) {
        console.log(`Next step found: Step ${nextStep.step_order}/${nextStep.total_steps} - ${nextStep.process_name}`);
        setToastMessage(`Step completed! Moving to: ${nextStep.process_name}`);
        setShowSuccessToast(true);
      } else {
        console.log("All steps completed for this product!");
        setToastMessage("All production steps completed! This product is ready for delivery.");
        setShowSuccessToast(true);
      }
      
      // Refresh notifications  
      window.dispatchEvent(new Event('refreshNotifications'));
      
      // Call parent callback IMMEDIATELY to refresh table (don't wait)
      console.log(`🔄 Calling onSave callback to refresh parent data immediately`);
      if (onSave) {
        console.log(`✅ onSave callback invoked`);
        onSave();
      } else {
        console.warn(`⚠️ onSave callback not provided`);
      }
      
      // Show success toast for 1.5 seconds, then close modal
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error in handleNext:", err);
      setErrorMessage(`Error: ${err.message}`);
      setShowErrorModal(true);
    }
  };

  const handleRequestExtension = async () => {
    if (!taskData || !taskData.request_product_id) {
      setErrorMessage("Unable to request extension: Missing product data");
      setShowErrorModal(true);
      return;
    }
    console.log("Opening extension request modal for request_product_id:", taskData.request_product_id);
    setShowExtensionModal(true);
  };

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setShowSuccessToast(true);
  };

  const handleDelete = async () => {
    if (!taskData) return;
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirmModal(false);
    await performDelete();
  };

  const handleArchiveRequest = async () => {
    if (!completedProductData) return;

    // Archive only this specific product (RequestProduct), not entire issuance
    const requestProductId = completedProductData.request_product_id || completedProductData.id;
    if (!requestProductId) {
      showToast("Cannot identify product to archive", "error");
      return;
    }

    try {
      console.log(`📦 Archiving product #${requestProductId}...`);

      const response = await fetch(
        `/app/request-products/${requestProductId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived_at: new Date().toISOString() }),
        }
      );

      const responseData = await response.json();
      console.log(`📨 Archive Response (${response.status}):`, responseData);

      if (response.ok) {
        showToast("Product archived successfully!", "success");
        onClose();
        if (onSave) onSave();
      } else {
        const errorMsg = responseData.detail || responseData.error || JSON.stringify(responseData);
        console.error(`❌ Archive failed:`, errorMsg);
        showToast(`Error archiving product: ${errorMsg}`, "error");
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      showToast("Network error: " + err.message, "error");
    }
  };

  const performDelete = async () => {
    const requestProductId = taskData?.request_product_id;
    console.log(`🗑️ performDelete called - requestProductId: ${requestProductId}`);
    
    if (!requestProductId) {
      console.error(`❌ Missing requestProductId:`, taskData);
      showToast("Cannot identify product to delete", "error");
      return;
    }

    try {
      const productName = taskData?.product_name || `Product #${requestProductId}`;
      console.log(`📤 Sending DELETE request for: ${productName} (ID: ${requestProductId})`);
      console.log(`   URL: /app/request-products/${requestProductId}/`);
      console.log(`   Payload: { archived_at: "${new Date().toISOString()}" }`);
      
      const archiveRes = await fetch(`/app/request-products/${requestProductId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived_at: new Date().toISOString() }),
      });

      console.log(`📨 Response received - Status: ${archiveRes.status}`);
      console.log(`   Content-Type: ${archiveRes.headers.get('content-type')}`);
      
      let archiveData;
      try {
        archiveData = await archiveRes.json();
        console.log(`   Response body:`, archiveData);
      } catch (parseErr) {
        console.error(`❌ Failed to parse response JSON:`, parseErr);
        console.log(`   Raw response:`, await archiveRes.text());
        showToast("Server error: Invalid response format", "error");
        return;
      }

      if (!archiveRes.ok) {
        const errorMsg = archiveData?.error || archiveData?.detail || archiveData?.message || "Unknown error";
        console.error(`❌ DELETE FAILED (${archiveRes.status}): ${errorMsg}`);
        console.error(`   Full response:`, archiveData);
        showToast(`❌ Error deleting product: ${errorMsg}`, "error");
        return;
      }

      console.log(`✅ Product ${requestProductId} deleted successfully!`);
      console.log(`   Archive data:`, archiveData);
      
      showToast("✅ Product deleted successfully! Check Archived Requests in Settings.", "success");
      
      // Refresh parent table and close modal AFTER showing toast
      setTimeout(() => {
        if (onSave) {
          console.log(`🔄 Refreshing table after deletion`);
          onSave();
        }
        onClose();
      }, 800);

    } catch (err) {
      console.error(`❌ Network/Exception error in performDelete:`, err);
      console.error(`   Error message: ${err.message}`);
      console.error(`   Error stack:`, err.stack);
      showToast(`❌ Network error: ${err.message}`, "error");
    }
  };

  // Delete Confirmation Modal
  const DeleteConfirmModal = () => {
    if (!showDeleteConfirmModal) return null;

    return (
      <div
        onClick={() => setShowDeleteConfirmModal(false)}
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
            maxWidth: "420px",
            width: "90%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            borderTop: "4px solid #dc3545",
          }}
        >
          <h4 style={{ margin: "0 0 12px", color: "#dc3545", fontWeight: 700 }}>
            Delete Product - Confirm
          </h4>
          <div style={{ 
            backgroundColor: "#fff3cd", 
            border: "1px solid #ffc107", 
            borderRadius: "6px", 
            padding: "12px", 
            marginBottom: "16px",
            fontSize: "14px"
          }}>
            <strong>Issuance #:</strong> {taskData?.request_id}<br/>
            <strong>Product:</strong> {taskData?.product_name}<br/>
            <strong>ProductID:</strong> {taskData?.request_product_id}
          </div>
          <p style={{ margin: "0 0 24px", color: "#444", fontSize: "15px" }}>
            Are you sure you want to delete <strong>{taskData?.product_name}</strong> from <strong>Issuance #{taskData?.request_id}</strong>?
            {taskData?.request_id && (
              <>
                <br/><span style={{ fontSize: "13px", color: "#666" }}>
                  ⚠️ Only this product will be deleted. Other products in Issuance #{taskData?.request_id} will not be affected.
                </span>
              </>
            )}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              style={{
                padding: "8px 20px", borderRadius: "6px",
                border: "1px solid #ccc", background: "#f5f5f5",
                cursor: "pointer", fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: "8px 20px", borderRadius: "6px",
                border: "none", background: "#dc3545",
                color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    );
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

  // Completed task view
  if (isCompletedView && completedProductData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px" }}>
          <div className="modal-header" style={{ borderBottom: "1px solid #dee2e6", backgroundColor: "#d4edda" }}>
            <h3 style={{ margin: 0, color: "#155724" }}>Task Summary</h3>
            <button 
              className="btn-close" 
              onClick={onClose}
              style={{ position: "absolute", right: "15px", top: "15px" }}
            >✕</button>
          </div>

          <div className="modal-body" style={{ padding: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ color: "#1D6AB7", marginBottom: "15px" }}>Issuance No. #{completedProductData.request_id}</h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
                <div>
                  <label style={{ fontWeight: "600", color: "#333" }}>Product Name</label>
                  <p style={{ fontSize: "14px", color: "#666" }}>{completedProductData.product_name}</p>
                </div>
                
                <div>
                  <label style={{ fontWeight: "600", color: "#333" }}>Total Quota</label>
                  <p style={{ fontSize: "16px", color: "#1D6AB7", fontWeight: "600" }}>{completedProductData.total_quota} units</p>
                </div>
                
                <div>
                  <label style={{ fontWeight: "600", color: "#333" }}>Total Defects</label>
                  <p style={{ fontSize: "14px", color: "#666" }}>{completedProductData.defect_count || 0}</p>
                </div>
                
                <div>
                  <label style={{ fontWeight: "600", color: "#333" }}>Completed Date</label>
                  <p style={{ fontSize: "14px", color: "#666" }}>{completedProductData.completed_at || "N/A"}</p>
                </div>
              </div>

              {/* Steps Breakdown */}
              {completedProductData.steps && completedProductData.steps.length > 0 && (
                <div>
                  <h5 style={{ color: "#1D6AB7", marginBottom: "15px", fontSize: "15px" }}>Steps Completed</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {completedProductData.steps.map((step, idx) => (
                      <div 
                        key={idx}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          padding: "15px",
                          backgroundColor: "#f9f9f9"
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "15px", marginBottom: "10px" }}>
                          <div>
                            <label style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>Step {step.step_order}/{completedProductData.total_steps}</label>
                            <p style={{ fontSize: "14px", color: "#666", margin: "5px 0 0 0" }}>{step.process_name}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>Quota</label>
                            <p style={{ fontSize: "14px", color: "#1D6AB7", fontWeight: "600", margin: "5px 0 0 0" }}>{step.completed_quota}/{step.total_quota} units</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>Defects</label>
                            <p style={{ fontSize: "14px", color: "#666", margin: "5px 0 0 0" }}>{step.defect_count || 0}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>Workers</label>
                            {step.workers && step.workers.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                                {step.workers.map((worker, widx) => (
                                  <span key={widx} style={{
                                    backgroundColor: "#1D6AB7",
                                    color: "white",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    fontSize: "11px"
                                  }}>
                                    {worker}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: "12px", color: "#999", margin: "5px 0 0 0" }}>—</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", borderLeft: "4px solid #1D6AB7" }}>
                <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#666" }}>
                  <strong>Total Steps Completed:</strong> {completedProductData.total_steps}
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                  <strong>Status:</strong> <span style={{ color: "#155724", fontWeight: "600" }}>Completed</span>
                </p>
              </div>
            </div>
          </div>

          <div style={{ 
            padding: "15px 20px", 
            borderTop: "1px solid #dee2e6", 
            display: "flex", 
            justifyContent: "space-between"
          }}>
            <button 
              className="btn btn-warning"
              onClick={handleArchiveRequest}
              style={{ backgroundColor: "#ff9800", borderColor: "#ff9800" }}
            >
              📦 Archive
            </button>
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
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
  // For PST-01, use overall_progress from backend; otherwise calculate based on current step
  let progress = 0;
  
  if (taskData?.is_pst_01 && taskData?.overall_progress !== undefined) {
    // PST-01: use overall progress calculated by backend
    progress = taskData.overall_progress;
  } else if (taskData?.overall_progress !== undefined) {
    // Use overall progress if available
    progress = taskData.overall_progress;
  } else {
    // Fallback: calculate based on current step position
    const totalQty = taskData?.total_quota || 1;
    const completed = formData.completed_quota || 0;
    const currentStep = taskData?.step_order || 1;
    const totalSteps = taskData?.total_steps || 1;
    const maxProgressForStep = (currentStep / totalSteps) * 100;
    const progressInStep = Math.min((completed / totalQty) * maxProgressForStep, maxProgressForStep);
    progress = Math.round(progressInStep);
  }



  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ backgroundColor: "#9BC284", color: "white", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: "600" }}>Task Information</h2>
          <div className="modal-actions" style={{ display: "flex", gap: "10px" }}>
            <button 
              className="btn-icon" 
              title="Delete this product and all its steps"
              onClick={handleDelete}
              style={{ color: "white", backgroundColor: "#dc3545", border: "1px solid #c82333", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.95rem", fontWeight: "500", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#c82333";
                e.target.style.borderColor = "#bd2130";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#dc3545";
                e.target.style.borderColor = "#c82333";
              }}
            >
              Delete
            </button>
            <button className="btn-close" onClick={onClose} style={{ color: "white", fontSize: "2rem", background: "none", border: "none", cursor: "pointer" }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Next Step Information */}
          {nextStepInfo && (
            <div style={{
              padding: "15px 16px",
              marginBottom: "20px",
              backgroundColor: "#e3f2fd",
              borderLeft: "4px solid #1D6AB7",
              borderRadius: "4px",
              color: "#0d47a1",
              fontSize: "14px",
              lineHeight: "1.6"
            }}>
              <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                Next Step: {nextStepInfo.name}
              </div>
              <div style={{ fontSize: "13px", color: "#1565c0", marginBottom: "8px" }}>
                Step {nextStepInfo.stepNumber} of {nextStepInfo.totalSteps}
              </div>
              <div style={{ fontSize: "13px", color: "#1565c0" }}>
                The next step is now ready for processing. Please proceed when you are ready.
              </div>
            </div>
          )}
          
          {/* Row 0: Issuance No. | Requester Name */}
          <div className="task-row">
            <div className="task-section flex-1">
              <label className="section-label">Issuance No.</label>
              <input
                type="text"
                value={taskData.request_id || "—"}
                disabled
                className="input-text"
              />
            </div>
            <div className="task-section flex-1">
              <label className="section-label">Requester</label>
              <input
                type="text"
                value={taskData.requester_name || "—"}
                disabled
                className="input-text"
              />
            </div>
          </div>

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

          {/* Row 2: Process Number | Process Name | Start Date */}
          <div className="task-row">
            <div className="task-section" style={{ flex: "0 0 22%" }}>
              <label className="section-label" style={{ fontSize: "12px", whiteSpace: "nowrap", lineHeight: "1.3" }}>
                Part/Process Number
              </label>
              <input
                type="text"
                value={taskData.process_number || "—"}
                disabled
                className="input-text"
                style={{ fontWeight: "600", fontSize: "14px", backgroundColor: "#f0f8ff" }}
              />
            </div>
            <div className="task-section" style={{ flex: "1" }}>
              <label className="section-label" style={{ fontSize: "12px" }}>
                Process Name/Operation Description
              </label>
              <input
                type="text"
                value={taskData.process_name || "—"}
                disabled
                className="input-text"
                style={{ fontWeight: "500", fontSize: "14px" }}
              />
            </div>
            <div className="task-section" style={{ flex: "0 0 18%" }}>
              <label className="section-label" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>Start Date</label>
              <input
                type="text"
                value={taskData.production_date_formatted || "—"}
                disabled
                className="input-text"
              />
            </div>
          </div>

          {/* Row 3: Outputs | Defects | Extension OR PST-01 Message */}
          {taskData?.is_pst_01 ? (
            // PST-01: Show info message without quota/defect fields
            <div className="task-row" style={{ alignItems: 'stretch' }}>
              <div 
                style={{
                  flex: 1,
                  padding: '15px 16px',
                  backgroundColor: '#e3f2fd',
                  borderLeft: '4px solid #1D6AB7',
                  borderRadius: '4px',
                  color: '#0d47a1',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                    ✓ Withdrawal Process (PST-01)
                  </div>
                  <div style={{ fontSize: '13px', color: '#1565c0' }}>
                    This is an automatic withdrawal step. No quota tracking required. Simply click "Next" to proceed to the next process.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Other processes: Show quota/defect fields
            <div className="task-row">
              <div className="task-section flex-1">
                <label className="section-label">Completed Outputs</label>
                <div className="input-group">
                  <input
                    type="number"
                    name="completed_quota"
                    value={formData.completed_quota || ""}
                    onChange={handleInputChange}
                    className="input-text"
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
                  value={formData.defect_count || ""}
                  onChange={handleInputChange}
                  className="input-text"
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
                disabled={extensionRequestMade}
                style={{ 
                  marginTop: "24px",
                  padding: "0.5rem 1rem",
                  width: "140px",
                  opacity: extensionRequestMade ? 0.6 : 1,
                  cursor: extensionRequestMade ? 'not-allowed' : 'pointer',
                  backgroundColor: extensionRequestMade ? '#ccc' : '#ff9800',
                  border: extensionRequestMade ? 'none' : '2px solid #ff9800',
                  color: extensionRequestMade ? '#999' : 'white',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
                title={extensionRequestMade ? "Extension request already submitted" : "Request a deadline extension"}
                onMouseEnter={(e) => {
                  if (!extensionRequestMade) {
                    e.target.style.backgroundColor = '#f57c00';
                    e.target.style.borderColor = '#e65100';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!extensionRequestMade) {
                    e.target.style.backgroundColor = '#ff9800';
                    e.target.style.borderColor = '#ff9800';
                  }
                }}
              >
                {extensionRequestMade ? (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    Extension Requested
                  </>
                ) : (
                  "Request Extension"
                )}
              </button>
              </div>
            </div>
          )}

          {/* Row 4: Due Date */}
          <div className="task-row">
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
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {taskData?.is_pst_01 ? (
            // PST-01: Simple Next button without validation
            <button 
              className="btn-primary" 
              onClick={handleNext}
              style={{ padding: '0.5rem 1.5rem', fontSize: '15px', fontWeight: '600' }}
              title="This is PST-01 (Withdrawal). Click Next to proceed to the next process."
            >
              <i className="bi bi-arrow-right me-2"></i>
              Next Step
            </button>
          ) : (
            // Other processes: Require quota completion
            <button 
              className="btn-primary" 
              onClick={handleNext}
              disabled={
                formData.completed_quota < (taskData.total_quota || 0)
              }
              title={
                formData.completed_quota < (taskData.total_quota || 0)
                  ? `Complete this step first: ${formData.completed_quota}/${taskData.total_quota}`
                  : "Proceed to next step"
              }
            >
              Next ({formData.completed_quota}/{taskData.total_quota || 0})
            </button>
          )}
          <button className="btn-secondary" onClick={onClose} style={{ backgroundColor: "#dc3545", borderColor: "#c82333", color: "white" }}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={
              !taskData || 
              formData.completed_quota < taskData.completed_quota || 
              formData.defect_count < taskData.defect_count
            }
            style={{
              opacity: (!taskData || formData.completed_quota < taskData.completed_quota || formData.defect_count < taskData.defect_count) ? 0.5 : 1,
              cursor: (!taskData || formData.completed_quota < taskData.completed_quota || formData.defect_count < taskData.defect_count) ? 'not-allowed' : 'pointer'
            }}
            title={
              formData.completed_quota < taskData.completed_quota 
                ? `Quota cannot decrease (was ${taskData.completed_quota})` 
                : formData.defect_count < taskData.defect_count 
                ? `Defects cannot decrease (was ${taskData.defect_count})`
                : 'Save changes'
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>

    {/* Success Modal */}
    {showSuccessModal && (
      <div 
        className="modal-backdrop fade show" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 2050,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: 0.6 
        }}
      ></div>
    )}
    {showSuccessModal && (
      <div 
        className={`modal show`}
        tabIndex="-1" 
        role="dialog" 
        aria-hidden="false"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 2060,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent'
        }}
      >
        <div className="modal-dialog modal-dialog-centered" role="document" style={{ zIndex: 2060 }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderTop: "4px solid #28a745" }}>
            <div className="modal-body text-center" style={{ padding: "45px 35px" }}>
              <div style={{
                fontSize: "56px",
                color: "#28a745",
                marginBottom: "20px",
                fontWeight: "bold"
              }}>
                <i className="bi bi-check-circle-fill"></i>
              </div>
              <h4 style={{ marginBottom: "16px", color: "#1D6AB7", fontWeight: "700", fontSize: "22px" }}>
                Update Successful
              </h4>
              <p style={{ color: "#555", marginBottom: "0", lineHeight: "1.8", whiteSpace: "pre-wrap", fontSize: "15px" }}>
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Error Modal */}
    {showErrorModal && (
      <div className="modal-backdrop fade show" style={{ zIndex: 2050 }}></div>
    )}
    <div 
      className={`modal fade ${showErrorModal ? "show d-block" : ""}`} 
      tabIndex="-1" 
      role="dialog" 
      aria-hidden={!showErrorModal}
      style={{ zIndex: 2060 }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-body text-center" style={{ padding: "40px 30px" }}>
            <div style={{
              fontSize: "48px",
              color: "#dc3545",
              marginBottom: "16px"
            }}>
              <i className="bi bi-exclamation-circle"></i>
            </div>
            <h5 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>
              Error
            </h5>
            <p style={{ color: "#666", marginBottom: "0", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {errorMessage}
            </p>
          </div>
          <div className="modal-footer border-top bg-light">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowErrorModal(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
    {showErrorModal && (
      <style>{`.modal-backdrop { position: fixed; top: 0; left: 0; z-index: 1050; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); }`}</style>
    )}

    {/* Delete Confirmation Modal */}
    <DeleteConfirmModal />

    {/* Toast Notification */}
    {showSuccessToast && (
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: toastType === "error" ? "#dc3545" : "#28a745",
          color: "white",
          padding: "16px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          zIndex: 9999,
          animation: "slideIn 0.3s ease-in-out forwards",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontWeight: "500",
          fontSize: "14px"
        }}
      >
        <i className={`bi bi-${toastType === "error" ? "x-circle-fill" : "check-circle-fill"}`}></i>
        {toastMessage}
      </div>
    )}
    <style>{`
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `}</style>

    {/* Extension Request Modal */}
    {showExtensionModal && requestProductId && taskData && (
      <ExtensionRequestModal
        taskData={taskData}
        requestProductId={requestProductId}
        onClose={() => setShowExtensionModal(false)}
        onSuccess={() => {
          setExtensionRequestMade(true);
          setShowExtensionModal(false);
          // Refresh task data after extension request
          window.dispatchEvent(new Event('refreshNotifications'));
        }}
      />
    )}
    </>
  );
}

export default TaskDetailModal;
