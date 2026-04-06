import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import ExtensionRequestModal from "./ExtensionRequestModal";
import TaskHistoryModal from "./TaskHistoryModal";
import CancellationReasonModalComponent from "./CancellationReasonModalComponent";

function TaskDetailModal({ productProcessId, onClose, onSave }) {
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCompletedView, setIsCompletedView] = useState(false);
  const [completedProductData, setCompletedProductData] = useState(null);
  const [formData, setFormData] = useState({
    completed_quota: 0,
    ot_quota: 0,
    defectLogs: [{ defect_type: '', defect_count: 0 }],
    ot_defectLogs: [{ defect_type: '', defect_count: 0 }],
    workers: [],
    is_overtime: false,
  });
  const [workers, setWorkers] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState(''); // Reason for cancellation
  const [showCancellationReasonModal, setShowCancellationReasonModal] = useState(false); // Modal for entering reason

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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showOTConfirmModal, setShowOTConfirmModal] = useState(false);
  const [otCheckboxPending, setOtCheckboxPending] = useState(false);
  const [saveCount, setSaveCount] = useState(0); // Track save attempts for accountability
  const [hasAlreadyBeenSaved, setHasAlreadyBeenSaved] = useState(false); // Persistent marker from backend (regular quota save)
  const [hasOTBeenSaved, setHasOTBeenSaved] = useState(false); // Persistent marker for OT save
  const [showSaveReminderModal, setShowSaveReminderModal] = useState(false); // One-time save reminder after successful save
  const [saveReminderType, setSaveReminderType] = useState('regular'); // 'regular' | 'ot'
  const workerDropdownRef = useRef(null);

  useEffect(() => {
    if (productProcessId) {
      // Check if productProcessId is a number (step) or object (completed product)
      const isObject = typeof productProcessId === 'object' && productProcessId !== null;
      
      if (isObject) {
        setIsCompletedView(true);
        setCompletedProductData(productProcessId);
        setTaskData(null);
        setFormData({
          completed_quota: productProcessId.total_quota || 0,
          defectLogs: (productProcessId.defect_logs && productProcessId.defect_logs.length > 0) 
            ? productProcessId.defect_logs.map(log => ({ defect_type: log.defect_type, defect_count: log.defect_count }))
            : [{ defect_type: '', defect_count: 0 }],
          workers: productProcessId.worker_names || [],
        });
        setNextStepInfo(null); // Clear next step info when viewing completed task
        setLoading(false);
      } else {
        setIsCompletedView(false);
        setCompletedProductData(null);
        // Clear old data immediately to prevent stale data display
        setTaskData(null);
        setFormData({
          completed_quota: 0,
          defectLogs: [{ defect_type: '', defect_count: 0 }],
          workers: [],
        });
        setNextStepInfo(null); // Clear next step info when loading new step
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
    try {
      const response = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      // Abort if productProcessId has changed (race condition check)
      if (currentProductId !== productProcessId) {
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Validate essential fields exist
      if (!data.id) {
        console.warn("⚠️ Warning: API response missing 'id' field");
      }
      
      // Check if workers field is returned
      if (!Array.isArray(data.workers)) {
        console.warn("⚠️ Warning: API response missing or invalid 'workers' field. Got:", typeof data.workers, data.workers);
      }
      
      setTaskData(data);
      setRequestProductId(data.request_product_id);
      
      // Check if task has already been saved (persistent across sessions)
      if (data.quota_updated_at && data.quota_updated_by) {
        setHasAlreadyBeenSaved(true);
        setSaveCount(1); // Mark as already saved
      } else {
        setHasAlreadyBeenSaved(false);
        setSaveCount(0);
      }
      
      // Check if OT has already been saved (if is_overtime is true when task loads, OT was previously saved)
      if (data.is_overtime === true) {
        setHasOTBeenSaved(true);
      } else {
        setHasOTBeenSaved(false);
      }
      
      // Check if an extension has already been requested
      if (data.extension_status && data.extension_status !== 'none') {
        setExtensionRequestMade(true);
      } else {
        setExtensionRequestMade(false);
      }
      
      const workersArray = Array.isArray(data.workers) ? data.workers : [];
      setFormData({
        completed_quota: data.completed_quota || 0,
        ot_quota: data.ot_quota || 0,
        defectLogs: (data.defect_logs && data.defect_logs.length > 0) 
          ? data.defect_logs.map(log => ({ defect_type: log.defect_type, defect_count: log.defect_count }))
          : [{ defect_type: '', defect_count: 0 }],
        ot_defectLogs: (data.ot_defect_logs && data.ot_defect_logs.length > 0) 
          ? data.ot_defect_logs.map(log => ({ defect_type: log.defect_type, defect_count: log.defect_count }))
          : [{ defect_type: '', defect_count: 0 }],
        workers: workersArray,
        is_overtime: data.is_overtime || false,
      });
    } catch (err) {
      console.error("❌ Error fetching task detail:", err);
      setTaskData(null);
    } finally {
      setLoading(false);
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
    if (name === "completed_quota") {
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
      const updatedWorkers = [...formData.workers, workerID];
      setFormData({
        ...formData,
        workers: updatedWorkers,
      });
      setShowWorkerDropdown(false);
    }
  };

  const handleRemoveWorker = (workerID) => {
    const updatedWorkers = formData.workers.filter((id) => id !== workerID);
    setFormData({
      ...formData,
      workers: updatedWorkers,
    });
  };

  // Get list of available workers (not yet assigned)
  const getAvailableWorkers = () => {
    return workers
      .filter((w) => !formData.workers.includes(w.WorkerID))
      .filter((w) => w.is_active); // Only show active workers for new assignments
  };

  // Defect Log management functions
  const addDefectLog = () => {
    setFormData({
      ...formData,
      defectLogs: [...formData.defectLogs, { defect_type: '', defect_count: 0 }],
    });
  };

  const removeDefectLog = (index) => {
    // Always keep at least one row
    if (formData.defectLogs.length > 1) {
      const updated = formData.defectLogs.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        defectLogs: updated,
      });
    }
  };

  const updateDefectLog = (index, field, value) => {
    const updated = [...formData.defectLogs];
    if (field === 'defect_count') {
      updated[index][field] = parseInt(value, 10) || 0;
    } else {
      updated[index][field] = value;
    }
    setFormData({
      ...formData,
      defectLogs: updated,
    });
  };

  // OT Defect Handlers
  const addOTDefectLog = () => {
    setFormData({
      ...formData,
      ot_defectLogs: [...formData.ot_defectLogs, { defect_type: '', defect_count: 0 }],
    });
  };

  const removeOTDefectLog = (index) => {
    if (formData.ot_defectLogs.length > 1) {
      const updated = formData.ot_defectLogs.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        ot_defectLogs: updated,
      });
    }
  };

  const updateOTDefectLog = (index, field, value) => {
    const updated = [...formData.ot_defectLogs];
    if (field === 'defect_count') {
      updated[index][field] = parseInt(value, 10) || 0;
    } else {
      updated[index][field] = value;
    }
    setFormData({
      ...formData,
      ot_defectLogs: updated,
    });
  };

  // OT Modal Handler
  const handleOTCheckboxClick = (e) => {
    e.preventDefault();
    setOtCheckboxPending(!otCheckboxPending);
    if (!otCheckboxPending) {
      // Checkbox being enabled  
      setShowOTConfirmModal(true);
    } else {
      // Checkbox being disabled
      setFormData({
        ...formData,
        is_overtime: false,
        ot_quota: 0,
        ot_defectLogs: [{ defect_type: '', defect_count: 0 }],
      });
    }
  };

  const confirmOT = () => {
    setShowOTConfirmModal(false);
    setFormData({
      ...formData,
      is_overtime: true,
    });
  };

  const cancelOT = () => {
    setShowOTConfirmModal(false);
    setOtCheckboxPending(false);
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
    
    // Validate that defect logs are consistent - if defect_count > 0, defect_type must be selected
    const hasDefectsWithoutType = formData.defectLogs.some(log => log.defect_count > 0 && !log.defect_type);
    if (hasDefectsWithoutType) {
      setErrorMessage(
        `❌ Please select a defect type!\n\nEach defect count must have a corresponding defect type selected.\n\nPlease select defect types before saving.`
      );
      setShowErrorModal(true);
      return;
    }
    
    // Validate OT defect logs if OT is enabled
    if (formData.is_overtime) {
      const hasOTDefectsWithoutType = formData.ot_defectLogs.some(log => log.defect_count > 0 && !log.defect_type);
      if (hasOTDefectsWithoutType) {
        setErrorMessage(
          `❌ Please select an OT defect type!\n\nEach OT defect count must have a corresponding defect type selected.\n\nPlease select defect types before saving.`
        );
        setShowErrorModal(true);
        return;
      }
    }
    
    try {
      // Filter out empty defect logs (no type selected) and prepare for sending
      const validDefectLogs = formData.defectLogs.filter(log => log.defect_type);
      const validOTDefectLogs = formData.is_overtime ? formData.ot_defectLogs.filter(log => log.defect_type) : [];

      // Prepare save payload with OT data
      const savePayload = {
        completed_quota: formData.completed_quota,
        ot_quota: formData.is_overtime ? formData.ot_quota : 0,
        defect_logs: validDefectLogs,
        ot_defect_logs: validOTDefectLogs,
        is_overtime: formData.is_overtime,
        workers: formData.workers
      };

      const response = await fetch(
        `http://localhost:8000/app/product/${productProcessId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(savePayload),
        }
      );

      const responseData = await response.json();
      
      if (response.ok) {
        // Determine save type: regular quota save or OT save
        const isSavingOT = formData.is_overtime && !taskData.is_overtime; // Newly enabling OT
        
        if (isSavingOT) {
          // Mark OT as saved
          setHasOTBeenSaved(true);
          setSaveReminderType('ot');
        } else {
          // Regular quota save
          setHasAlreadyBeenSaved(true);
          setSaveCount(prevCount => prevCount + 1);
          setSaveReminderType('regular');
        }
        
        // Show the one-time save reminder modal
        setShowSaveReminderModal(true);
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
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
      
      // Validate that defect logs are consistent - if defect_count > 0, defect_type must be selected
      const hasDefectsWithoutType = formData.defectLogs.some(log => log.defect_count > 0 && !log.defect_type);
      if (hasDefectsWithoutType) {
        setErrorMessage(
          `❌ Please select a defect type!\n\nEach defect count must have a corresponding defect type selected.\n\nPlease select defect types before proceeding.`
        );
        setShowErrorModal(true);
        return;
      }

      // Filter out empty defect logs (no type selected) and prepare for sending
      const validDefectLogs = formData.defectLogs.filter(log => log.defect_type);
      const validOTDefectLogs = formData.is_overtime ? formData.ot_defectLogs.filter(log => log.defect_type) : [];

      // Prepare save data
      const saveData = {
        completed_quota: formData.completed_quota,
        ot_quota: formData.is_overtime ? formData.ot_quota : 0,
        defect_logs: validDefectLogs,
        ot_defect_logs: validOTDefectLogs,
        is_overtime: formData.is_overtime,
        workers: formData.workers
      };
      
      // For PST-01, mark as completed immediately since no quota tracking needed
      if (taskData.is_pst_01) {
        saveData.is_completed = true;
      }
      
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

      // Fetch all steps for this product to find the next one
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

      // Find current step index
      const currentIndex = productSteps.findIndex(s => s.id === productProcessId);
      
      const nextStep = productSteps[currentIndex + 1];

      // Show success toast WHILE modal is still visible
      if (nextStep) {
        setToastMessage(`Step completed! Moving to: ${nextStep.process_name}`);
        setShowSuccessToast(true);
      } else {
        setToastMessage("All production steps completed! This product is ready for delivery.");
        setShowSuccessToast(true);
      }
      
      // Refresh notifications  
      window.dispatchEvent(new Event('refreshNotifications'));
      
      // Call parent callback IMMEDIATELY to refresh table (don't wait)
      if (onSave) {
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
    setShowExtensionModal(true);
  };

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setShowSuccessToast(true);
  };

  const handleDelete = async () => {
    if (!taskData) return;
    setCancellationReason(''); // Reset reason
    setShowCancellationReasonModal(true); // Show reason modal instead of confirm
  };

  const confirmDelete = async () => {
    setShowDeleteConfirmModal(false);
    await performDelete();
  };

  const handlePrintCompletedTask = (data) => {
    // Create new window for printing
    const printWindow = window.open('', '_blank');
    
    // Build steps HTML
    let stepsHTML = '';
    if (data?.steps && data.steps.length > 0) {
      stepsHTML = data.steps.map((step, idx) => {
        const isPST01 = step.is_pst_01 || (step.process_name && step.process_name.toUpperCase().includes("WITHDRAWAL"));
        if (isPST01) {
          return `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; padding-left: 0; text-align: left;">Step ${step.step_order}: ${step.process_name}</td><td style="padding: 8px; text-align: center;">✓ Completed</td><td style="padding: 8px; text-align: center;">N/A</td></tr>`;
        } else {
          const defects = step.defect_logs && step.defect_logs.length > 0 
            ? step.defect_logs.reduce((sum, log) => sum + log.defect_count, 0)
            : (step.defect_count || 0);
          return `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; padding-left: 0; text-align: left;">Step ${step.step_order}: ${step.process_name}</td><td style="padding: 8px; text-align: center;">${step.completed_quota}/${step.total_quota}</td><td style="padding: 8px; text-align: center;">${defects}</td></tr>`;
        }
      }).join('');
    } else {
      stepsHTML = '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #999;">No steps data</td></tr>';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Task Completion Report ${data?.request_id}</title>
        <style>
          * { margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: white; padding: 40px; color: #333; line-height: 1.6; }
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; background: white; color: #333; line-height: 1.6;">
          
          <!-- HEADER -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1d6ab7;">
            <img src="/Group 1.png" alt="WB Logo" style="width: 60px; height: 60px; object-fit: contain;" />
            <div style="text-align: right; font-size: 9px; line-height: 1.4;">
              <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">WB Technologies Inc.</div>
              <div>B2, L11, Greenland Bulihan Business Park</div>
              <div>Tel: (02) 994.9971 | Mobile: 0922 823 7874</div>
              <div>Email: wbtechnologiesinc@yahoo.com</div>
              <div>worksbellphiles@yahoo.com</div>
            </div>
          </div>

          <!-- TITLE -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 18px; font-weight: bold; color: #1d6ab7; margin-bottom: 10px;">TASK COMPLETION REPORT</div>
            <div style="font-size: 12px; color: #666;">Production Status Summary</div>
          </div>

          <!-- TASK DETAILS -->
          <div style="margin-bottom: 30px; font-size: 11px; display: table; width: 100%;">
            <div style="display: table-row; margin-bottom: 15px;">
              <div style="display: table-cell; width: 50%; padding-bottom: 12px;">
                <div style="font-weight: bold; color: #666;">Issuance Number</div>
                <div style="font-size: 12px;">${data?.request_id || 'N/A'}</div>
              </div>
              <div style="display: table-cell; width: 50%; padding-bottom: 12px;">
                <div style="font-weight: bold; color: #666;">Product Name</div>
                <div style="font-size: 12px;">${data?.product_name || 'N/A'}</div>
              </div>
            </div>
            <div style="display: table-row; margin-bottom: 15px;">
              <div style="display: table-cell; width: 50%; padding-bottom: 12px;">
                <div style="font-weight: bold; color: #666;">Customer</div>
                <div style="font-size: 12px;">${data?.requester_name || 'N/A'}</div>
              </div>
              <div style="display: table-cell; width: 50%; padding-bottom: 12px;">
                <div style="font-weight: bold; color: #666;">Completion Date</div>
                <div style="font-size: 12px;">${data?.completed_at || 'N/A'}</div>
              </div>
            </div>
          </div>

          <!-- SUMMARY -->
          <div style="margin-bottom: 30px; display: table; width: 100%; font-size: 11px;">
            <div style="display: table-row; margin-bottom: 12px;">
              <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #f5f5f5; border: 1px solid #ddd; border-right: none;">
                <div style="font-weight: bold; color: #666;">Total Quota</div>
                <div style="font-size: 14px; font-weight: bold; color: #1d6ab7;">${data?.total_quota || 0} units</div>
              </div>
              <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #f5f5f5; border: 1px solid #ddd; border-right: none;">
                <div style="font-weight: bold; color: #666;">Total Defects</div>
                <div style="font-size: 14px; font-weight: bold; color: #d32f2f;">${data?.defect_count || 0}</div>
              </div>
              <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #f5f5f5; border: 1px solid #ddd;">
                <div style="font-weight: bold; color: #666;">Status</div>
                <div style="font-size: 14px; font-weight: bold; color: #22c55e;">✓ Completed</div>
              </div>
            </div>
          </div>

          <!-- STEPS -->
          <div style="margin-bottom: 30px; margin-left: 0;">
            <h3 style="color: #1d6ab7; margin-bottom: 15px; font-size: 13px;">Production Steps</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-left: 0;">
              <thead>
                <tr style="background-color: #f5f5f5; border-bottom: 2px solid #1d6ab7;">
                  <th style="padding: 8px; text-align: left; font-weight: bold; padding-left: 0;">Step & Process</th>
                  <th style="padding: 8px; text-align: center; font-weight: bold; width: 100px;">Quota</th>
                  <th style="padding: 8px; text-align: center; font-weight: bold; width: 80px;">Defects</th>
                </tr>
              </thead>
              <tbody>
                ${stepsHTML}
              </tbody>
            </table>
          </div>

          <!-- FOOTER -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 9px; color: #999;">
            <div style="margin-bottom: 8px;">
              <strong>Report Generated:</strong> ${new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            <div>
              <strong>Status:</strong> Task completed and documented by WB Technologies Inc.
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
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
      const response = await fetch(
        `http://localhost:8000/app/request-products/${requestProductId}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived_at: new Date().toISOString() }),
        }
      );

      const responseData = await response.json();

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
    
    if (!requestProductId) {
      showToast("Cannot identify product to delete", "error");
      return;
    }

    try {
      const productName = taskData?.product_name || `Product #${requestProductId}`;
      
      // Capture current progress before cancellation
      const progressBeforeCancel = {
        completed_quota: formData.completed_quota || 0,
        total_quota: taskData.total_quota || 0,
        defects: formData.defectLogs.reduce((sum, log) => sum + (Number(log.defect_count) || 0), 0),
        estimated_total_defects: (taskData.total_quota && formData.completed_quota) ? 
          Math.ceil((formData.defectLogs.reduce((sum, log) => sum + (Number(log.defect_count) || 0), 0) / formData.completed_quota) * taskData.total_quota) : 0
      };
      
      console.log("🔍 [DEBUG] Cancelling product with progress data:", {
        requestProductId,
        productName,
        formDataCompletedQuota: formData.completed_quota,
        taskDataCompletedQuota: taskData.completed_quota,
        taskDataTotalQuota: taskData.total_quota,
        progressBeforeCancel
      });
      
      const archiveRes = await fetch(`http://localhost:8000/app/request-products/${requestProductId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: 'cancelled', 
          cancellation_reason: cancellationReason || 'Cancelled by production manager',
          cancellation_progress: progressBeforeCancel // Send progress data
        }),
      });
      
      let archiveData;
      try {
        archiveData = await archiveRes.json();
      } catch (parseErr) {
        console.error(`❌ Failed to parse response JSON:`, parseErr);
        showToast("Server error: Invalid response format", "error");
        return;
      }

      if (!archiveRes.ok) {
        const errorMsg = archiveData?.error || archiveData?.detail || archiveData?.message || "Unknown error";
        showToast(`❌ Error cancelling product: ${errorMsg}`, "error");
        return;
      }

      showToast("✅ Request cancelled successfully! The cancellation reason and progress have been recorded.", "success");
      
      // Refresh parent table and close modal AFTER showing toast
      setTimeout(() => {
        if (onSave) {
          onSave();
        }
        onClose();
      }, 800);

    } catch (err) {
      console.error(`❌ Network/Exception error in performDelete:`, err);
      showToast(`❌ Network error: ${err.message}`, "error");
    }
  };

  // Cancellation reason modal handlers
  const handleCancelReasonModal = () => {
    setShowCancellationReasonModal(false);
  };

  const handleConfirmCancellation = () => {
    if (!cancellationReason.trim()) {
      showToast("Please provide a cancellation reason", "error");
      return;
    }
    setShowCancellationReasonModal(false);
    performDelete();
  };

  // Delete Confirmation Modal (kept for backward compatibility)
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
            borderTop: "4px solid #E01818",
          }}
        >
          <p style={{ margin: "0 0 24px", color: "#333", fontSize: "16px", lineHeight: "1.6" }}>
            Are you sure you want to cancel this product <strong>{taskData?.product_name}</strong>?
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              style={{
                padding: "10px 24px", borderRadius: "6px",
                border: "1px solid #ddd", background: "#f5f5f5",
                cursor: "pointer", fontWeight: 500, fontSize: "14px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = "#e0e0e0"; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = "#f5f5f5"; }}
            >
              No
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: "10px 24px", borderRadius: "6px",
                border: "none", background: "#E01818",
                color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "14px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = "#A01010"; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = "#E01818"; }}
            >
              Yes
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
          <div className="modal-header" style={{ 
            borderBottom: "2px solid #155724", 
            backgroundColor: "#d4edda",
            padding: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 100,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}>
            <h3 style={{ 
              margin: 0, 
              color: "#155724",
              fontSize: "1.25rem",
              fontWeight: "600",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "default"
            }} 
            onMouseEnter={(e) => {
              e.target.style.color = "#0d3f1a";
              e.target.style.transform = "translateX(2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#155724";
              e.target.style.transform = "translateX(0)";
            }}>
              Task Summary
            </h3>
            <button 
              className="btn-close" 
              onClick={onClose}
              style={{ 
                position: "relative", 
                right: "0",
                top: "0",
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#155724",
                cursor: "pointer",
                padding: "4px 8px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.color = "#0d3f1a";
                e.target.style.transform = "scale(1.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#155724";
                e.target.style.transform = "scale(1)";
              }}
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
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    <div style={{ fontWeight: "600" }}>{completedProductData.defect_count || 0}</div>
                    {completedProductData.defect_types && completedProductData.defect_types.length > 0 && (
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                        Types: {completedProductData.defect_types.map(type => {
                          const typeLabels = {
                            'dimension': 'Dimension',
                            'thickness': 'Thickness',
                            'rush': 'Rush',
                            'other': 'Other'
                          };
                          return typeLabels[type] || type;
                        }).join(', ')}
                      </div>
                    )}
                  </div>
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
                    {completedProductData.steps.map((step, idx) => {
                      // Check if this is a PST-01 (Withdrawal) step
                      // Use is_pst_01 from API if available, or check process_name for "WITHDRAWAL"
                      const isPST01 = step.is_pst_01 || (step.process_name && step.process_name.toUpperCase().includes("WITHDRAWAL"));
                      
                      return (
                        <div 
                          key={idx}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "15px",
                            backgroundColor: isPST01 ? "#e3f2fd" : "#f9f9f9"
                          }}
                        >
                          {isPST01 ? (
                            // PST-01 Layout: Only show step name and completed status (no quota, no defects)
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "10px" }}>
                              <div>
                                <label style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>Step {step.step_order}/{completedProductData.total_steps}</label>
                                <p style={{ fontSize: "14px", color: "#666", margin: "5px 0 0 0" }}>{step.process_name}</p>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontWeight: "600", color: "#333", fontSize: "13px" }}>Status</label>
                                <span style={{ 
                                  display: "inline-block",
                                  backgroundColor: "#4CAF50", 
                                  color: "white", 
                                  padding: "4px 12px", 
                                  borderRadius: "12px", 
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  width: "fit-content"
                                }}>
                                  ✓ Completed
                                </span>
                              </div>
                            </div>
                          ) : (
                            // Regular step layout: Show quota and defects
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "10px" }}>
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
                                <div style={{ fontSize: "14px", color: "#666", margin: "5px 0 0 0" }}>
                                  <div>
                                    {step.defect_logs && step.defect_logs.length > 0 
                                      ? step.defect_logs.reduce((sum, log) => sum + log.defect_count, 0)
                                      : (step.defect_count || 0)
                                    }
                                  </div>
                                  {step.defect_logs && step.defect_logs.length > 0 ? (
                                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                                      {step.defect_logs.map((log, idx) => {
                                        const typeLabels = {
                                          'dimension': 'Dimension',
                                          'thickness': 'Thickness',
                                          'rush': 'Rush',
                                          'other': 'Other'
                                        };
                                        return (
                                          <div key={idx}>
                                            {typeLabels[log.defect_type] || log.defect_type}: {log.defect_count}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : step.defect_type && (
                                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                                      {(() => {
                                        const typeLabels = {
                                          'dimension': 'Dimension',
                                          'thickness': 'Thickness',
                                          'rush': 'Rush',
                                          'other': 'Other'
                                        };
                                        return typeLabels[step.defect_type] || step.defect_type;
                                      })()}
                                      {step.defect_description && step.defect_type === 'other' && (
                                        <span>: {step.defect_description}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
            justifyContent: "space-between",
            gap: "10px"
          }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className="btn btn-primary"
                onClick={() => handlePrintCompletedTask(completedProductData)}
                style={{ backgroundColor: "#1d6ab7", borderColor: "#1d6ab7" }}
              >
                🖨️ Print Report
              </button>
              <button 
                className="btn btn-warning"
                onClick={handleArchiveRequest}
                style={{ backgroundColor: "#ff9800", borderColor: "#ff9800" }}
              >
                📦 Archive
              </button>
            </div>
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
        <div className="modal-header" style={{ backgroundColor: "#46E63E", color: "white", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: "600" }}>Task Information</h2>
          <button className="btn-close" onClick={onClose} style={{ color: "#ffffff", fontSize: "2.5rem", background: "none", border: "none", cursor: "pointer", padding: "0", lineHeight: "1", textShadow: "0 0 2px rgba(0,0,0,0.1)", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.target.style.color = "#f0f0f0"; e.target.style.textShadow = "0 0 4px rgba(0,0,0,0.2)"; }} onMouseLeave={(e) => { e.target.style.color = "#ffffff"; e.target.style.textShadow = "0 0 2px rgba(0,0,0,0.1)"; }}>
            ×
          </button>
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
          
          {/* Row 0: Product # | Customer | Start Date (Consolidated Header) */}
          <div className="task-row">
            <div className="task-section" style={{ flex: "1" }}>
              <label className="section-label">Product #</label>
              <input
                type="text"
                value={taskData.request_id || "—"}
                disabled
                className="input-text"
              />
            </div>
            <div className="task-section" style={{ flex: "1" }}>
              <label className="section-label">Customer</label>
              <input
                type="text"
                value={taskData.requester_name || "—"}
                disabled
                className="input-text"
              />
            </div>
            <div className="task-section" style={{ flex: "1" }}>
              <label className="section-label">Start Date</label>
              <input
                type="text"
                value={taskData.production_date_formatted || "—"}
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

          {/* Row 2: Process Name/Operation Description */}
          <div className="task-row">
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
            <>
              {/* Row: Completed Outputs + Last Update */}
              <div className="task-row">
                <div className="task-section" style={{ flex: "0 0 45%" }}>
                  <label className="section-label">Completed Outputs (Add to Current)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                      <span style={{ color: "#666" }}>Previous:</span>
                      <span style={{ fontWeight: "600", color: "#1D6AB7" }}>{taskData.completed_quota || 0}</span>
                      <span style={{ color: "#666" }}>+</span>
                      <div className="input-group" style={{ flex: 1, minWidth: "80px" }}>
                        <input
                          type="number"
                          name="completed_quota"
                          value={formData.completed_quota > (taskData.completed_quota || 0) ? formData.completed_quota - (taskData.completed_quota || 0) : ""}
                          onChange={(e) => {
                            const addAmount = parseInt(e.target.value, 10) || 0;
                            const previousQuota = taskData.completed_quota || 0;
                            const newTotal = previousQuota + addAmount;
                            const cappedTotal = Math.min(newTotal, taskData.total_quota);
                            
                            // If completed quota increases and OT quota would exceed remaining, auto-adjust OT
                            const remainingAfter = (taskData.total_quota || 0) - cappedTotal;
                            let adjustedOTQuota = formData.ot_quota;
                            if (formData.ot_quota > remainingAfter) {
                              adjustedOTQuota = Math.max(0, remainingAfter);
                            }
                            
                            setFormData({
                              ...formData, 
                              completed_quota: cappedTotal,
                              ot_quota: adjustedOTQuota
                            });
                          }}
                          className="input-text"
                          min="0"
                          max={taskData.total_quota - (taskData.completed_quota || 0)}
                          placeholder="0"
                          style={{ textAlign: "center" }}
                        />
                      </div>
                      <span style={{ color: "#666" }}>=</span>
                      <span style={{ fontWeight: "700", color: formData.completed_quota >= taskData.total_quota ? "#28a745" : "#333" }}>
                        {formData.completed_quota || 0}
                      </span>
                      <span style={{ color: "#999" }}>/ {taskData.total_quota || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="task-section" style={{ flex: "0 0 50%" }}>
                  <label className="section-label">Last Update</label>
                  <input
                    type="text"
                    value={
                      taskData.quota_updated_at 
                        ? `${new Date(taskData.quota_updated_at).toLocaleString()} by ${taskData.quota_updated_by_name || 'Unknown'} - ${taskData.completed_quota}/${taskData.total_quota}`
                        : 'No updates yet'
                    }
                    disabled
                    className="input-text"
                    style={{ fontSize: "0.85rem", color: "#666" }}
                  />
                </div>
              </div>

              {/* Row: Defect Logs - Multiple Defects */}
              <div className="task-section">
                <label className="section-label">Add type of defect</label>
                
                {/* Defect entries */}
                {formData.defectLogs.map((log, index) => (
                  <div key={index} className="task-row" style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: index < formData.defectLogs.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                    <div className="task-section flex-1">
                      <select
                        value={log.defect_type || ""}
                        onChange={(e) => updateDefectLog(index, 'defect_type', e.target.value)}
                        className="input-text"
                        style={{ cursor: "pointer" }}
                      >
                        <option value="">Select defect type</option>
                        <option value="dimension">Dimension problem</option>
                        <option value="thickness">Thickness problem</option>
                        <option value="rush">Rush problem</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    {log.defect_type && (
                      <div className="task-section flex-1">
                        <input
                          type="number"
                          value={log.defect_count || ""}
                          onChange={(e) => updateDefectLog(index, 'defect_count', e.target.value)}
                          className="input-text"
                          min="0"
                          placeholder="Count"
                        />
                      </div>
                    )}
                    
                    {formData.defectLogs.length > 1 && (
                      <button
                        onClick={() => removeDefectLog(index)}
                        style={{
                          background: 'transparent',
                          color: '#E01818',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginLeft: '8px',
                          minWidth: 'auto',
                          height: '38px',
                          fontSize: '24px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: '1',
                          alignSelf: 'flex-end'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'rgba(224, 24, 24, 0.1)';
                          e.target.style.color = '#A01010';
                          e.target.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#E01818';
                          e.target.style.transform = 'scale(1)';
                        }}
                        title="Remove defect"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Add defect button - only shown if first defect type is selected */}
                {formData.defectLogs[0]?.defect_type && (
                  <button
                    onClick={addDefectLog}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontSize: '14px'
                    }}
                  >
                    + Add Defect Type
                  </button>
                )}
              </div>

              {/* Row: Defect Last Update */}
              {taskData.defect_updated_at && (
                <div className="task-row">
                  <div className="task-section flex-1">
                    <label className="section-label">Defect Last Update</label>
                    <input
                      type="text"
                      value={`${new Date(taskData.defect_updated_at).toLocaleString()} by ${taskData.defect_updated_by_name || 'Unknown'}`}
                      disabled
                      className="input-text"
                      style={{ fontSize: "0.85rem", color: "#666" }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Row 4: Due Date and Request Extension */}
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
            <div className="task-section flex-1" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <button 
                className="btn-orange"
                onClick={handleRequestExtension}
                disabled={extensionRequestMade}
                style={{ 
                  padding: "0.65rem 1.5rem",
                  width: "100%",
                  opacity: extensionRequestMade ? 0.6 : 1,
                  cursor: extensionRequestMade ? 'not-allowed' : 'pointer',
                  backgroundColor: extensionRequestMade ? '#ccc' : '#ff9800',
                  border: extensionRequestMade ? 'none' : '2px solid #ff9800',
                  color: extensionRequestMade ? '#999' : 'white',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  borderRadius: '4px'
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
                  <>
                    <i className="bi bi-calendar-event me-1"></i>
                    Request Extension
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Row 5: Extended Deadline (only if approved) */}
          {taskData.deadline_extension && (
            <div className="task-row">
              <div className="task-section flex-1">
                <label className="section-label">Extended Deadline</label>
                <input
                  type="text"
                  value={taskData.deadline_extension || "—"}
                  disabled
                  className="input-text"
                  style={{ backgroundColor: "#fff3cd" }}
                />
              </div>
            </div>
          )}

          {/* Divider Line */}
          {taskData.deadline_extension && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              margin: '20px 0',
              paddingBottom: '15px'
            }}>
              <div style={{
                width: '85%',
                height: '2px',
                backgroundColor: '#1D6AB7',
                borderRadius: '1px'
              }}></div>
            </div>
          )}

          {/* Row 6: OT (Overtime) Checkbox */}
          {taskData.deadline_extension && (
            <div className="task-row">
              <div className="task-section flex-1">
                <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_overtime}
                    onChange={handleOTCheckboxClick}
                    disabled={formData.is_overtime && hasOTBeenSaved} // Once OT saved, cannot toggle off
                    style={{ width: '18px', height: '18px', cursor: formData.is_overtime && hasOTBeenSaved ? 'not-allowed' : 'pointer' }}
                    title={formData.is_overtime && hasOTBeenSaved ? "OT has been saved for this task and cannot be changed" : "Enable Overtime tracking for this task"}
                  />
                  <span>Enable Overtime (OT)</span>
                </label>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '6px', marginBottom: '4px' }}>
                  ℹ️ Check this box if this task includes overtime work. Different rates and reporting apply.
                </p>
                {!formData.is_overtime ? (
                  <p style={{ fontSize: '12px', color: '#d32f2f', fontWeight: '600', margin: '0' }}>
                    ⚠️ WARNING: OT can only be added ONCE per task. Choose carefully.
                  </p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#1976d2', fontWeight: '600', margin: '0' }}>
                    ✓ Overtime is ENABLED. Please fill in OT quota and defects below.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Row 7: OT Quota and OT Defects (only if OT enabled) */}
          {formData.is_overtime && (
            <div style={{ padding: '15px', backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', marginBottom: '15px' }}>
              <h6 style={{ color: '#f57f17', marginBottom: '15px', fontWeight: '600' }}>⏱️ Overtime Details</h6>
              
              {/* OT Quota */}
              <div className="task-row" style={{ marginBottom: '15px' }}>
                <div className="task-section flex-1">
                  <label className="section-label">OT Completed Quota</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                    <input
                      type="number"
                      value={formData.ot_quota || ""}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10) || 0;
                        // Calculate remaining quota: total - already completed
                        const remainingQuota = (taskData.total_quota || 0) - (formData.completed_quota || 0);
                        // Cap OT quota to not exceed remaining quota
                        const cappedValue = Math.min(Math.max(0, value), remainingQuota);
                        setFormData({ ...formData, ot_quota: cappedValue });
                      }}
                      className="input-text"
                      min="0"
                      max={(taskData.total_quota || 0) - (formData.completed_quota || 0)}
                      placeholder="0"
                      style={{ textAlign: "center", flex: 1 }}
                    />
                    <span style={{ color: "#666" }}>units</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#ff9800", marginTop: "6px", fontWeight: "500" }}>
                    Available: {Math.max(0, (taskData.total_quota || 0) - (formData.completed_quota || 0))} units remaining
                  </div>
                </div>
              </div>

              {/* OT Defects */}
              <div className="task-section">
                <label className="section-label">OT Defect Types</label>
                
                {formData.ot_defectLogs.map((log, index) => (
                  <div key={index} className="task-row" style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: index < formData.ot_defectLogs.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                    <div className="task-section flex-1">
                      <select
                        value={log.defect_type || ""}
                        onChange={(e) => updateOTDefectLog(index, 'defect_type', e.target.value)}
                        className="input-text"
                        style={{ cursor: "pointer" }}
                      >
                        <option value="">Select defect type</option>
                        <option value="dimension">Dimension problem</option>
                        <option value="thickness">Thickness problem</option>
                        <option value="rush">Rush problem</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    {log.defect_type && (
                      <div className="task-section flex-1">
                        <input
                          type="number"
                          value={log.defect_count || ""}
                          onChange={(e) => updateOTDefectLog(index, 'defect_count', e.target.value)}
                          className="input-text"
                          min="0"
                          placeholder="Count"
                        />
                      </div>
                    )}
                    
                    {formData.ot_defectLogs.length > 1 && (
                      <button
                        onClick={() => removeOTDefectLog(index)}
                        style={{
                          background: 'transparent',
                          color: '#E01818',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginLeft: '8px',
                          minWidth: 'auto',
                          height: '38px',
                          fontSize: '24px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: '1',
                          alignSelf: 'flex-end'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'rgba(224, 24, 24, 0.1)';
                          e.target.style.color = '#A01010';
                          e.target.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#E01818';
                          e.target.style.transform = 'scale(1)';
                        }}
                        title="Remove OT defect"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.ot_defectLogs[0]?.defect_type && (
                  <button
                    onClick={addOTDefectLog}
                    style={{
                      background: '#ff9800',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontSize: '14px'
                    }}
                  >
                    + Add OT Defect Type
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', padding: '12px 20px', borderTop: '1px solid #e0e0e0', alignItems: 'center', flexShrink: 0, justifyContent: 'space-between' }}>
          {/* Left Side: Log History */}
          <button 
            className="btn-icon" 
            title="View update history"
            onClick={() => setShowHistoryModal(true)}
            style={{ color: "white", backgroundColor: "#1D6AB7", border: "1px solid #155a9c", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.95rem", fontWeight: "500", transition: "all 0.2s ease" }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#155a9c";
              e.target.style.borderColor = "#104a82";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#1D6AB7";
              e.target.style.borderColor = "#155a9c";
            }}
          >
            <i className="bi bi-clock-history" style={{ marginRight: "6px" }}></i>
            Log History
          </button>
          
          {/* Right Side: Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {taskData?.is_pst_01 ? (
            // PST-01: Simple Next button without validation
            <button 
              className="btn-primary" 
              onClick={handleNext}
              style={{ padding: '0.5rem 1.5rem', fontSize: '15px', fontWeight: '600', margin: 0 }}
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
              style={{ margin: 0 }}
              title={
                formData.completed_quota < (taskData.total_quota || 0)
                  ? `Complete this step first: ${formData.completed_quota}/${taskData.total_quota}`
                  : "Proceed to next step"
              }
            >
              Next ({formData.completed_quota}/{taskData.total_quota || 0})
            </button>
          )}
          <button 
            className="btn-icon" 
            title="Cancel this product request"
            onClick={handleDelete}
            style={{ color: "white", backgroundColor: "#E01818", border: "1px solid #C01515", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.95rem", fontWeight: "500", transition: "all 0.2s ease" }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#C01515";
              e.target.style.borderColor = "#A01010";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#E01818";
              e.target.style.borderColor = "#C01515";
            }}
          >
            Cancel Request
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={
              !taskData || 
              formData.completed_quota < taskData.completed_quota || 
              formData.defect_count < taskData.defect_count ||
              (formData.is_overtime ? hasOTBeenSaved : hasAlreadyBeenSaved)
            }
            style={{
              margin: 0,
              opacity: (!taskData || formData.completed_quota < taskData.completed_quota || formData.defect_count < taskData.defect_count || (formData.is_overtime ? hasOTBeenSaved : hasAlreadyBeenSaved)) ? 0.5 : 1,
              cursor: (!taskData || formData.completed_quota < taskData.completed_quota || formData.defect_count < taskData.defect_count || (formData.is_overtime ? hasOTBeenSaved : hasAlreadyBeenSaved)) ? 'not-allowed' : 'pointer',
              position: 'relative'
            }}
            title={
              formData.is_overtime && hasOTBeenSaved
                ? `⛔ OT has already been saved once. One-time OT save rule for accountability.` 
                : !formData.is_overtime && hasAlreadyBeenSaved
                ? `⛔ This task has already been saved once. One-time save rule: Only one save per task for accountability.` 
                : formData.completed_quota < taskData.completed_quota 
                ? `Quota cannot decrease (was ${taskData.completed_quota})` 
                : formData.defect_count < taskData.defect_count 
                ? `Defects cannot decrease (was ${taskData.defect_count})`
                : formData.is_overtime 
                ? '💾 Save OT changes (⚠️ WARNING: Can only save ONE TIME for OT)'
                : '💾 Save changes (⚠️ WARNING: Can only save ONE TIME per task for accountability)'
            }
          >
            Save {(hasAlreadyBeenSaved && !formData.is_overtime) && <span style={{ marginLeft: '6px' }}>✓ (Saved)</span>}
            {(hasOTBeenSaved && formData.is_overtime) && <span style={{ marginLeft: '6px' }}>✓ (OT Saved)</span>}
          </button>
          </div>
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

    {/* Cancellation Reason Modal */}
    <CancellationReasonModalComponent 
      isOpen={showCancellationReasonModal}
      cancellationReason={cancellationReason}
      setCancellationReason={setCancellationReason}
      taskData={taskData}
      formData={formData}
      onCancel={handleCancelReasonModal}
      onConfirm={handleConfirmCancellation}
      showToast={showToast}
    />

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

    {/* Task History Modal */}
    {showHistoryModal && requestProductId && (
      <TaskHistoryModal
        requestProductId={requestProductId}
        productName={taskData?.product_name || completedProductData?.product_name}
        onClose={() => setShowHistoryModal(false)}
      />
    )}

    {/* OT Confirmation Modal */}
    {showOTConfirmModal && (
      <div className="modal-overlay" onClick={cancelOT}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
          <div style={{
            padding: "20px",
            borderBottom: "2px solid #ff9800",
            backgroundColor: "#fff8e1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{ margin: 0, color: "#f57f17", fontSize: "18px", fontWeight: "600" }}>
              ⏱️ Overtime Confirmation
            </h3>
            <button
              className="btn-close"
              onClick={cancelOT}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#f57f17",
                cursor: "pointer",
                padding: "0"
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: "25px" }}>
            <div style={{ backgroundColor: "#fff3e0", padding: "16px", borderRadius: "6px", marginBottom: "20px", borderLeft: "4px solid #ff9800" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#333", fontWeight: "600" }}>
                ⚠️ Important Notice
              </p>
              <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "13px", color: "#555", lineHeight: "1.8" }}>
                <li>You are enabling <strong>Overtime (OT)</strong> tracking for this task</li>
                <li>OT quota will be tracked separately from regular quota</li>
                <li>OT defects will be reported differently for payroll and accounting</li>
                <li><strong>✏️ Once enabled and saved, OT details cannot be changed</strong></li>
              </ul>
            </div>

            <div style={{ backgroundColor: "#ffebee", padding: "16px", borderRadius: "6px", marginBottom: "20px", borderLeft: "4px solid #d32f2f" }}>
              <p style={{ margin: "0", fontSize: "13px", color: "#c62828", lineHeight: "1.6", fontWeight: "600" }}>
                🔒 ONE-TIME OT RULE: OT can only be added once per task. Please verify all OT details before confirming.
              </p>
            </div>

            <div style={{ backgroundColor: "#e3f2fd", padding: "16px", borderRadius: "6px", marginBottom: "20px", borderLeft: "4px solid #1D6AB7" }}>
              <p style={{ margin: "0", fontSize: "13px", color: "#1565c0", lineHeight: "1.6" }}>
                <strong>📊 Complete Record includes:</strong> Regular Quota + OT Quota + OT Defects
              </p>
            </div>

            <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
              Are you sure you want to enable Overtime tracking for this task? Different rates and reporting rules will apply, and this action cannot be reversed.
            </p>
          </div>

          <div style={{ padding: "15px 25px", display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #e0e0e0" }}>
            <button
              onClick={cancelOT}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background: "white",
                color: "#333",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f5f5f5";
                e.target.style.borderColor = "#999";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.borderColor = "#ddd";
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmOT}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                background: "#ff9800",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f57f17";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ff9800";
              }}
            >
              Enable OT Tracking
            </button>
          </div>
        </div>
      </div>
    )}

    {/* One-Time Save Reminder Modal */}
    {showSaveReminderModal && (
      <div className="modal-overlay" onClick={() => {}} style={{ zIndex: 3000 }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
          <div style={{
            padding: "25px",
            borderBottom: "3px solid #22c55e",
            backgroundColor: "#f0fdf4",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{ margin: 0, color: "#15803d", fontSize: "20px", fontWeight: "700" }}>
              ✅ Save Successful
            </h3>
          </div>

          <div style={{ padding: "30px" }}>
            <div style={{ 
              backgroundColor: "#dcfce7", 
              padding: "18px", 
              borderRadius: "8px", 
              marginBottom: "25px", 
              borderLeft: "5px solid #22c55e",
              borderRight: "5px solid #22c55e"
            }}>
              <p style={{ margin: "0", fontSize: "15px", color: "#166534", fontWeight: "600" }}>
                {saveReminderType === 'ot' 
                  ? 'Your Overtime work has been saved successfully!' 
                  : 'Your production updates have been saved successfully!'}
              </p>
            </div>

            <div style={{ 
              backgroundColor: "#fef2f2", 
              padding: "18px", 
              borderRadius: "8px", 
              marginBottom: "25px", 
              borderLeft: "5px solid #dc2626"
            }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#991b1b", fontWeight: "700" }}>
                ⛔ IMPORTANT: One-Time {saveReminderType === 'ot' ? 'OT' : ''} Save Rule
              </p>
              <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "14px", color: "#7f1d1d", lineHeight: "1.8" }}>
                <li>
                  <strong>This was your ONE AND ONLY {saveReminderType === 'ot' ? 'OT save' : 'save'}</strong> 
                  {saveReminderType === 'ot' ? ' for overtime work' : ' for this task'}
                </li>
                <li>You <strong>cannot save {saveReminderType === 'ot' ? 'OT' : ''} again</strong> for this {saveReminderType === 'ot' ? 'task' : 'task'}</li>
                <li>The save button will remain disabled</li>
                <li>This ensures accountability and data integrity</li>
              </ul>
            </div>
          </div>

          <div style={{ 
            padding: "20px 30px", 
            display: "flex", 
            gap: "12px", 
            justifyContent: "flex-end", 
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb"
          }}>
            <button
              onClick={() => {
                setShowSaveReminderModal(false);
                // Close the modal after a short delay
                setTimeout(() => {
                  onClose();
                  
                  // Wait slightly longer before refreshing to ensure DB has updated is_completed status
                  setTimeout(() => {
                    if (onSave) {
                      onSave();
                    }
                  }, 300); // Wait 300ms for DB to fully update
                }, 500);
              }}
              style={{
                padding: "12px 28px",
                borderRadius: "6px",
                border: "none",
                background: "#22c55e",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "15px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#16a34a";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#22c55e";
              }}
            >
              Understood - Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default TaskDetailModal;
