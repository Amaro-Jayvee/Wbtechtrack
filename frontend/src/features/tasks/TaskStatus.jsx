import React, { useState, useEffect, useMemo } from "react";
import SidebarLayout from "../../shared/components/SidebarLayout";
import TaskDetailModal from "./TaskDetailModal";
import AdminRequestApproval from "../accounts/AdminRequestApproval";
import "../../features/dashboard/Dashboard.css";
import { useUser } from "../../shared/context/UserContext.jsx";

function TaskStatus() {
  const { userData } = useUser();
  const [requestProducts, setRequestProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("in-progress");
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [sortBy, setSortBy] = useState("number"); // "date", "number", "name"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"
  const [partForm, setPartForm] = useState({
    part_name: "",
    processes: [{ process_name: "" }]
  });
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [addProductMessage, setAddProductMessage] = useState("");
  const [toastType, setToastType] = useState("info"); // 'success' or 'error'
  const [selectedProcessIndex, setSelectedProcessIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReportMode, setShowReportMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTaskStatus(filterStatus);
  }, []);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (addProductMessage) {
      const timer = setTimeout(() => {
        setAddProductMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [addProductMessage]);

  const handleAddProductClick = () => {
    setShowAddProductModal(true);
    setPartForm({ part_name: "", processes: [{ process_names: [""] }] });
    setAddProductMessage("");
    setSelectedProcessIndex(0);
  };

  const handleAddProductFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "part_name") {
      setPartForm(prev => ({ ...prev, part_name: value }));
    }
  };

  const handleProcessNameChange = (processIndex, nameIndex, value) => {
    setPartForm(prev => {
      const newProcesses = [...prev.processes];
      const newProcessNames = [...newProcesses[processIndex].process_names];
      newProcessNames[nameIndex] = value;
      newProcesses[processIndex] = { ...newProcesses[processIndex], process_names: newProcessNames };
      return { ...prev, processes: newProcesses };
    });
  };

  const handleAddProcessName = (processIndex) => {
    setPartForm(prev => {
      const newProcesses = [...prev.processes];
      newProcesses[processIndex] = {
        ...newProcesses[processIndex],
        process_names: [...newProcesses[processIndex].process_names, ""]
      };
      return { ...prev, processes: newProcesses };
    });
  };

  const handleRemoveProcessName = (processIndex, nameIndex) => {
    setPartForm(prev => {
      const newProcesses = [...prev.processes];
      newProcesses[processIndex] = {
        ...newProcesses[processIndex],
        process_names: newProcesses[processIndex].process_names.filter((_, i) => i !== nameIndex)
      };
      return { ...prev, processes: newProcesses };
    });
  };

  const handleAddProcess = () => {
    setPartForm(prev => ({
      ...prev,
      processes: [...prev.processes, { process_names: [""] }]
    }));
  };

  const handleRemoveProcess = (index) => {
    setPartForm(prev => ({
      ...prev,
      processes: prev.processes.filter((_, i) => i !== index)
    }));
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    setAddProductLoading(true);
    setAddProductMessage("");

    try {
      // Create the product with all its processes in one call
      const payload = {
        product_name: partForm.part_name,
        processes: partForm.processes.flatMap((proc) =>
          proc.process_names
            .filter(name => name.trim() !== "") // Filter out empty names
            .map(process_name => ({
              process_name: process_name
            }))
        )
      };

      // Validate that we have at least one process
      if (payload.processes.length === 0) {
        setAddProductMessage("Please add at least one process/operation");
        setAddProductLoading(false);
        return;
      }

      const response = await fetch("http://localhost:8000/app/create-product-with-processes/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create product with processes");
      }

      const data = await response.json();
      setToastType("success");
      setAddProductMessage(`Product/Part "${partForm.part_name}" created successfully!`);
      setPartForm({ part_name: "", processes: [{ process_names: [""] }] });
      
      setTimeout(() => {
        setShowAddProductModal(false);
        setAddProductMessage("");
      }, 2000);
    } catch (err) {
      console.error("Error adding product:", err);
      setToastType("error");
      setAddProductMessage(`Failed to create product: ${err.message}`);
    } finally {
      setAddProductLoading(false);
    }
  }

  const fetchTaskStatus = async (status = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // For "done" filter, show completed items; for "in-progress" show non-completed
      if (status === "done") {
        params.append("include_completed", "true");
      } else {
        params.append("include_completed", "false");
      }
      
      // Exclude archived products (those with archived_at set on RequestProduct)
      params.append("include_archived", "false");
      
      // Add cache-busting parameter to force fresh data
      params.append("t", Date.now());

      // Fetch ProductProcess (steps) data
      const response = await fetch(
        `http://localhost:8000/app/product/?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      let steps = await response.json();
      
      // Group steps by request_product_id to create aggregated product rows
      const productMap = {};
      
      steps.forEach(step => {
        const key = step.request_product_id;
        if (!productMap[key]) {
          productMap[key] = {
            id: key,
            request_id: step.request_id,
            requester_name: step.requester_name,
            product_name: step.product_name,
            request_product_id: key,
            total_quota: step.total_quota,
            due_date: step.due_date,
            deadline_extension: step.deadline_extension,
            archived_at: step.request_product_archived_at,
            steps: [],
            firstStepId: null,
          };
        }
        productMap[key].steps.push(step);
      });
      
      // Convert to array and calculate aggregated progress for each product
      let aggregatedData = Object.values(productMap).map(product => {
        // Sort steps by step_order
        product.steps.sort((a, b) => a.step_order - b.step_order);
        
        // Get first step ID (for opening modal)
        product.firstStepId = product.steps[0]?.id;
        
        // Calculate step counts
        const totalSteps = product.steps.length;
        const completedSteps = product.steps.filter(s => s.is_completed).length;
        
        // Find first incomplete step (current step being worked on)
        const currentStep = product.steps.find(s => !s.is_completed) || product.steps[totalSteps - 1];
        
        // Use overall_progress from backend if available, otherwise calculate
        let progressPercent = 0;
        
        if (product.steps.length > 0 && product.steps[0].overall_progress !== undefined) {
          // Use backend's calculated overall_progress
          progressPercent = product.steps[0].overall_progress;

        } else {
          // Fallback to old calculation method
          // Calculate progress of current step (how much of the quota is done)
          const currentStepProgress = currentStep 
            ? (currentStep.completed_quota || 0) / (currentStep.total_quota || 1)
            : 0;
          
          // Progress = (fully completed steps + progress in current step) / total steps
          progressPercent = Math.round(((completedSteps + currentStepProgress) / totalSteps) * 100);
        }
        
        // Check if task is completed
        const isCompleted = product.steps[0]?.request_product_completed_at !== null && product.steps[0]?.request_product_completed_at !== undefined;
        
        // For completed tasks, aggregate ALL steps data; for in-progress, show current step only
        let displayData = {};
        if (isCompleted) {
          // Sum defects from all steps using defect_logs array (new) or fallback to defect_count (old)
          const totalDefects = product.steps.reduce((sum, step) => {
            const stepDefects = step.defect_logs && step.defect_logs.length > 0
              ? step.defect_logs.reduce((logSum, log) => logSum + (log.defect_count || 0), 0)
              : (step.defect_count || 0);
            return sum + stepDefects;
          }, 0);
          
          // Sum OT quota and OT defects from all steps
          const totalOTQuota = product.steps.reduce((sum, step) => sum + (step.ot_quota || 0), 0);
          const totalOTDefects = product.steps.reduce((sum, step) => {
            const stepOTDefects = step.ot_defect_logs && step.ot_defect_logs.length > 0
              ? step.ot_defect_logs.reduce((logSum, log) => logSum + (log.defect_count || 0), 0)
              : 0;
            return sum + stepOTDefects;
          }, 0);
          
          // Collect all unique defect types from all steps (from defect_logs array)
          const defectTypes = new Set();
          product.steps.forEach(step => {
            // First, collect from new defect_logs array
            if (step.defect_logs && step.defect_logs.length > 0) {
              step.defect_logs.forEach(log => {
                defectTypes.add(log.defect_type);
              });
            }
            // Fallback to old defect_type field for backward compatibility
            if (step.defect_type) {
              defectTypes.add(step.defect_type);
            }
          });
          
          // Collect all unique OT defect types from all steps
          const otDefectTypes = new Set();
          product.steps.forEach(step => {
            if (step.ot_defect_logs && step.ot_defect_logs.length > 0) {
              step.ot_defect_logs.forEach(log => {
                otDefectTypes.add(log.defect_type);
              });
            }
          });
          
          // Collect all unique workers from all steps
          const allWorkers = new Set();
          product.steps.forEach(step => {
            if (step.worker_names && Array.isArray(step.worker_names)) {
              step.worker_names.forEach(name => allWorkers.add(name));
            }
          });
          
          // Create steps breakdown for modal display
          const stepsBreakdown = product.steps.map(step => ({
            step_order: step.step_order,
            process_name: step.process_name,
            total_quota: step.total_quota,
            completed_quota: step.completed_quota,
            defect_count: step.defect_count,
            defect_type: step.defect_type,
            defect_description: step.defect_description,
            defect_logs: step.defect_logs || [],
            is_overtime: step.is_overtime || false,
            ot_quota: step.ot_quota || 0,
            ot_defect_logs: step.ot_defect_logs || [],
            workers: step.worker_names || [],
            is_pst_01: step.is_pst_01
          }));
          
          displayData = {
            completed_summary: `${product.total_quota}/${product.total_quota}`,
            defect_count: totalDefects,
            defect_types: Array.from(defectTypes),
            ot_quota: totalOTQuota,
            ot_defect_count: totalOTDefects,
            ot_defect_types: Array.from(otDefectTypes),
            worker_names: Array.from(allWorkers),
            process_name: `All Steps (${totalSteps})`,
            updated_at: product.steps[totalSteps - 1]?.updated_at || "—",
            completed_at: product.steps[0]?.request_product_completed_at,
            steps: stepsBreakdown
          };
        } else {
          // Show current step's information
          const isPST01 = currentStep?.is_pst_01;
          
          // Calculate current step defects from defect_logs array (new) or fallback to defect_count (old)
          const currentStepDefects = currentStep && currentStep.defect_logs && currentStep.defect_logs.length > 0
            ? currentStep.defect_logs.reduce((sum, log) => sum + (log.defect_count || 0), 0)
            : (currentStep?.defect_count || 0);
          
          displayData = {
            completed_summary: isPST01 
              ? `✓ Withdrawal` 
              : `${currentStep?.completed_quota || 0}/${product.total_quota}`,
            defect_count: currentStepDefects,
            worker_names: currentStep?.worker_names || [],
            process_name: currentStep?.process_name || "—",
            updated_at: currentStep?.updated_at || "—",
            is_pst_01: isPST01
          };
        }
        
        return {
          ...product,
          ...displayData,
          total_steps: totalSteps,
          completed_steps: completedSteps,
          progress: `${progressPercent}%`,
          step_order: currentStep?.step_order || totalSteps,
          task_status: completedSteps === totalSteps ? "done" : "in-progress",
          is_completed: isCompleted
        };
      });
      
      // Apply status filter
      if (status === "in-progress") {
        aggregatedData = aggregatedData.filter(item => 
          item.task_status === "in-progress"
        );
      } else if (status === "done") {
        // When showing "Done", only show completed items
        aggregatedData = aggregatedData.filter(item => 
          item.is_completed === true
        );
      }
      // For "all", show everything that came from the API (respecting include_completed param)
      
      setRequestProducts(aggregatedData);
    } catch (err) {
      console.error("Error fetching task status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset pagination when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sortBy, sortOrder, searchTerm]);

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    fetchTaskStatus(e.target.value);
  };

  const sortedRequestProducts = useMemo(() => {
    const filtered = requestProducts.filter((product) =>
      searchTerm === "" ||
      product.request_id.toString().includes(searchTerm) ||
      (product.product_name && product.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        const dateA = new Date(a.due_date || a.updated_at || 0);
        const dateB = new Date(b.due_date || b.updated_at || 0);
        comparison = dateB - dateA;
      } else if (sortBy === "number") {
        comparison = (b.request_id || 0) - (a.request_id || 0);
      } else if (sortBy === "name") {
        const nameA = (a.product_name || "").toLowerCase();
        const nameB = (b.product_name || "").toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [requestProducts, searchTerm, sortBy, sortOrder]);

  // Calculate paginated data
  const totalPages = Math.ceil(sortedRequestProducts.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedRequestProducts.slice(startIndex, endIndex);
  }, [sortedRequestProducts, currentPage, itemsPerPage]);

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleOpenTaskDetail = (product) => {
    if (product.is_completed) {
      // For completed tasks, pass the product data directly (aggregated view)
      setSelectedTaskId(product);
    } else {
      // For in-progress tasks, find the first incomplete step
      const stepToOpen = product.steps.find(s => !s.is_completed) || product.steps[product.steps.length - 1];
      setSelectedTaskId(stepToOpen?.id);
    }
    setShowTaskDetailModal(true);
  };

  const handleCloseTaskDetail = () => {
    setShowTaskDetailModal(false);
    setSelectedTaskId(null);
  };

  const handleTaskSave = async (nextStepId) => {
    
    // Refresh the task list
    await fetchTaskStatus(filterStatus);
    
    // If there's a next step, auto-open it
    if (nextStepId) {
      setTimeout(() => {
        handleOpenTaskDetail(nextStepId);
      }, 300);
    } else {
      // Close modal if no next step
      setShowTaskDetailModal(false);
      setSelectedTaskId(null);
    }
  };

  const handlePrintReport = () => {
    // Only for In-Progress
    setShowReportMode(true);
    setSelectedTaskIds(new Set());
  };

  // NEW: Dedicated handler for Completed Tasks Report
  const handlePrintCompletedTasksReport = () => {
    console.log("=== PRINT COMPLETED TASKS REPORT CLICKED ===");
    console.log("Current filterStatus:", filterStatus);
    console.log("Current paginatedData:", paginatedData.length, "tasks");
    console.log("First few tasks:", paginatedData.slice(0, 2).map(t => ({id: t.id, status: t.task_status, product: t.product_name})));
    
    setShowReportMode(true);
    setSelectedTaskIds(new Set());
  };

  // NEW: Dedicated handler for generating Completed Tasks Report
  const handleGenerateCompletedTasksReport = () => {
    try {
      console.log("\n========================================");
      console.log("=== GENERATE COMPLETED TASKS REPORT ===");
      console.log("========================================");
      
      if (selectedTaskIds.size === 0) {
        alert("Please select at least one completed task to generate report");
        return;
      }
      
      // Filter selected tasks
      const selectedCompletedTasks = paginatedData.filter(task => selectedTaskIds.has(task.id));
      
      console.log("Selected tasks:", selectedCompletedTasks.length);
      
      if (selectedCompletedTasks.length === 0) {
        alert("No completed tasks found in selection");
        return;
      }
      
      // Create report data
      const reportData = {
        tasks: selectedCompletedTasks,
        selectedCount: selectedCompletedTasks.length,
        filters: {
          generatedAt: new Date().toLocaleString(),
          reportType: "Completed Tasks"
        }
      };
      
      // Encode as base64 for URL
      const jsonStr = JSON.stringify(reportData);
      const encodedData = btoa(jsonStr);
      console.log("✓ Data encoded (size: " + encodedData.length + " bytes)");
      
      // Open new tab WITH data in URL hash
      const reportUrl = `/completed-tasks-report#data=${encodedData}`;
      console.log("→ Opening new tab with URL hash data");
      
      const newTab = window.open(reportUrl, '_blank');
      if (!newTab) {
        console.error("✗ Failed to open new tab - popup may be blocked");
        alert("Could not open report tab. Please check if popups are blocked.");
      } else {
        console.log("✓ New tab opened successfully");
      }
      
      // Reset UI
      setShowReportMode(false);
      setSelectedTaskIds(new Set());
      console.log("✓ Report mode reset");
      console.log("========================================\n");
      
    } catch (error) {
      console.error("✗ ERROR in handleGenerateCompletedTasksReport:", error);
      alert(`Error generating report: ${error.message}`);
    }
  };

  const handleTaskCheckboxChange = (taskId) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const handleSelectAllTasks = (checked) => {
    if (checked) {
      setSelectedTaskIds(new Set(paginatedData.map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const handleGenerateReport = () => {
    try {
      console.log("=== GENERATE IN-PROGRESS REPORT ===");
      
      if (selectedTaskIds.size === 0) {
        alert("Please select at least one task to generate report");
        return;
      }
      
      const selectedTasks = paginatedData.filter(task => selectedTaskIds.has(task.id));
      
      console.log("Selected tasks:", selectedTasks.length);
      
      if (selectedTasks.length === 0) {
        alert("No tasks found in selection");
        return;
      }
      
      // Create report data
      const reportData = {
        tasks: selectedTasks,
        selectedCount: selectedTaskIds.size,
        filters: {
          generatedAt: new Date().toLocaleString(),
          reportType: "Active Tasks"
        }
      };
      
      // Encode as base64 for URL
      const jsonStr = JSON.stringify(reportData);
      const encodedData = btoa(jsonStr);
      console.log("✓ Data encoded (size: " + encodedData.length + " bytes)");
      
      // Open new tab WITH data in URL hash
      const reportUrl = `/task-status-report#data=${encodedData}`;
      console.log("→ Opening new tab with URL hash data");
      
      const newTab = window.open(reportUrl, '_blank');
      if (!newTab) {
        console.error("✗ Failed to open new tab - popup may be blocked");
        alert("Failed to open report tab. Please check if popups are blocked.");
      } else {
        console.log("✓ New tab opened successfully");
      }
      
      // Reset report mode
      setShowReportMode(false);
      setSelectedTaskIds(new Set());
      console.log("✓ Report generation completed");
      
    } catch (error) {
      console.error("✗ ERROR in handleGenerateReport:", error);
      alert(`Error generating report: ${error.message}`);
    }
  };

  const handleCancelReport = () => {
    setShowReportMode(false);
    setSelectedTaskIds(new Set());
  };

  return (
    <SidebarLayout>
      <div className="content">
        {/* Admin Request Approval View */}
        {userData.role === "admin" && (
          <AdminRequestApproval />
        )}

        {/* Production Manager Task Status View */}
        {userData.role !== "admin" && (
          <>
            {/* Filter and Controls Bar */}
            <div className="mb-4 d-flex align-items-end gap-3" style={{ marginTop: "30px" }}>
          <div style={{ minWidth: "140px", display: "flex", flexDirection: "column" }}>
            <label className="fw-600 text-muted small mb-2 d-block">
              <i className="bi bi-funnel me-2"></i>Task Status Filter
              {loading && (
                <span className="ms-2" style={{ fontSize: "12px", fontWeight: "400", color: "#6c757d" }}>Loading...</span>
              )}
            </label>
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="form-select border-2 fw-500"
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", padding: "0.375rem 0.75rem", fontSize: "12px" }}
            >
              <option value="in-progress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </div>
          
          <div style={{ minWidth: "130px", display: "flex", flexDirection: "column" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select border-2 fw-500"
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", padding: "0.375rem 0.75rem", fontSize: "12px" }}
            >
              <option value="date">Sort By: Date</option>
              <option value="number">Sort By: Number</option>
              <option value="name">Sort By: Name</option>
            </select>
          </div>

          <div style={{ minWidth: "165px", display: "flex", flexDirection: "column" }}>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="form-select border-2 fw-500"
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", padding: "0.375rem 0.75rem", fontSize: "12px" }}
            >
              <option value="desc">Order: Descending</option>
              <option value="asc">Order: Ascending</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "flex-end" }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control border-2"
              style={{
                fontSize: "12px",
                minWidth: "200px",
                outline: "none",
                padding: "0.375rem 0.75rem"
              }}
            />
            
            {(userData.role === "admin" || userData.role === "production_manager") && (
              <>
                <button
                  onClick={handleAddProductClick}
                  className="btn fw-600"
                  style={{ minWidth: "170px", padding: "0.375rem 0.75rem", backgroundColor: "#52A374", color: "white", border: "none", fontSize: "12px" }}
                >
                  <i className="bi bi-plus-circle me-2"></i>Add Product/Part
                </button>
                
                {/* UNIFIED PRINT REPORT BUTTON - SAME FOR BOTH TABS */}
                <button
                  onClick={filterStatus === "done" ? handlePrintCompletedTasksReport : handlePrintReport}
                  className="btn fw-600"
                  style={{ minWidth: "170px", padding: "0.375rem 0.75rem", backgroundColor: "#1D6AB7", color: "white", border: "none", fontSize: "12px" }}
                >
                  <i className="bi bi-file-earmark-pdf me-2"></i>Print Report
                </button>
                
                {showReportMode && (
                  <>
                    <button
                      onClick={filterStatus === "done" ? handleGenerateCompletedTasksReport : handleGenerateReport}
                      disabled={selectedTaskIds.size === 0}
                      className="btn fw-600"
                      style={{ 
                        minWidth: "170px", 
                        padding: "0.375rem 0.75rem", 
                        backgroundColor: selectedTaskIds.size === 0 ? "#ccc" : "#28a745", 
                        color: "white", 
                        border: "none", 
                        fontSize: "12px",
                        cursor: selectedTaskIds.size === 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      <i className="bi bi-check-circle me-2"></i>Generate Report ({selectedTaskIds.size})
                    </button>
                    <button
                      onClick={handleCancelReport}
                      className="btn fw-600"
                      style={{ minWidth: "170px", padding: "0.375rem 0.75rem", backgroundColor: "#999", color: "white", border: "none", fontSize: "12px" }}
                    >
                      <i className="bi bi-x-circle me-2"></i>Cancel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading">Loading task status...</div>
        ) : sortedRequestProducts.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  {showReportMode && (
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTaskIds.size === paginatedData.length && paginatedData.length > 0}
                        onChange={(e) => handleSelectAllTasks(e.target.checked)}
                      />
                    </th>
                  )}
                  <th>Issuance No.</th>
                  <th>Requester</th>
                  <th>Product Name</th>
                  {filterStatus === "done" ? (
                    <>
                      <th>Total Completed Quota</th>
                      <th>Total Defects</th>
                      <th>Completed Date</th>
                    </>
                  ) : (
                    <>
                      <th>Progress</th>
                      <th>Completed Quota</th>
                      <th>Defect Count</th>
                    </>
                  )}
                  <th>Due Date</th>
                  <th>Deadline Extension</th>
                  <th>Last Update</th>
                  <th style={{ textAlign: "center", width: "50px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                <tr key={item.id}>
                  {showReportMode && (
                    <td style={{ width: "40px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTaskIds.has(item.id)}
                        onChange={() => handleTaskCheckboxChange(item.id)}
                      />
                    </td>
                  )}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {item.request_id}
                      {item.restored_at && (
                        <span style={{
                          backgroundColor: "#28a745",
                          color: "white",
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontWeight: "600",
                          whiteSpace: "nowrap"
                        }}>
                          🔄 RESTORED
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{item.requester_name || "—"}</td>
                  <td>{item.product_name || "N/A"}</td>
                  {filterStatus === "done" ? (
                    <>
                      <td>{item.completed_summary || `0/${item.total_quota}`}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ fontWeight: "600" }}>{item.defect_count || 0}</div>
                          {item.defect_types && item.defect_types.length > 0 && (
                            <div style={{ fontSize: "0.85em", color: "#666" }}>
                              {item.defect_types.map(type => {
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
                      </td>
                      <td>{item.completed_at || "N/A"}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ 
                            backgroundColor: "#e0e0e0", 
                            borderRadius: "4px", 
                            width: "100px", 
                            height: "6px", 
                            overflow: "hidden" 
                          }}>
                            <div style={{ 
                              backgroundColor: "#1D6AB7", 
                              height: "100%", 
                              width: `${Math.min(parseFloat(item.progress) || 0, 100)}%`
                            }}></div>
                          </div>
                          {item.progress || "0%"}
                        </div>
                      </td>
                      <td>
                        {item.is_pst_01 ? (
                          <div style={{ textAlign: "center", color: "#1D6AB7", fontWeight: "600" }}>
                            ✓ Withdrawal
                          </div>
                        ) : (
                          <div style={{ textAlign: "center" }}>
                            {item.completed_summary ? item.completed_summary.split("/")[0] : "0"}/{item.total_quota}
                          </div>
                        )}
                      </td>
                      <td>{item.defect_count || 0}</td>
                    </>
                  )}
                  <td style={{ whiteSpace: "nowrap" }}>{item.due_date || "N/A"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{item.deadline_extension || "N/A"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "#666" }}>
                    {item.updated_at 
                      ? new Date(item.updated_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : "N/A"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button 
                      className="actions-menu-btn" 
                      title="View details"
                      onClick={() => handleOpenTaskDetail(item)}
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>

            {/* Pagination Controls */}
            {sortedRequestProducts.length > 0 && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "20px",
                padding: "15px",
                borderTop: "1px solid #e0e0e0",
                flexWrap: "wrap"
              }}>
                {totalPages > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 10px",
                        border: currentPage === 1 ? "1px solid #ddd" : "1px solid #1D6AB7",
                        backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                        color: currentPage === 1 ? "#999" : "#1D6AB7",
                        borderRadius: "4px",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "12px"
                      }}
                    >
                      ◀◀ First
                    </button>

                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 10px",
                        border: currentPage === 1 ? "1px solid #ddd" : "1px solid #1D6AB7",
                        backgroundColor: currentPage === 1 ? "#f0f0f0" : "#fff",
                        color: currentPage === 1 ? "#999" : "#1D6AB7",
                        borderRadius: "4px",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "12px"
                      }}
                    >
                      ◀ Previous
                    </button>
                  </>
                )}

                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {totalPages > 1 && (
                    <>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, idx, arr) => (
                          <div key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && <span style={{ color: "#999", padding: "0 4px" }}>...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              style={{
                                padding: "6px 10px",
                                border: currentPage === page ? "1px solid #1D6AB7" : "1px solid #ddd",
                                backgroundColor: currentPage === page ? "#1D6AB7" : "#fff",
                                color: currentPage === page ? "#fff" : "#333",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: currentPage === page ? "600" : "500",
                                fontSize: "12px",
                                minWidth: "32px"
                              }}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                    </>
                  )}
                </div>

                {totalPages > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        border: currentPage === totalPages ? "1px solid #ddd" : "1px solid #1D6AB7",
                        backgroundColor: currentPage === totalPages ? "#f0f0f0" : "#fff",
                        color: currentPage === totalPages ? "#999" : "#1D6AB7",
                        borderRadius: "4px",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "12px"
                      }}
                    >
                      Next ▶
                    </button>

                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        border: currentPage === totalPages ? "1px solid #ddd" : "1px solid #1D6AB7",
                        backgroundColor: currentPage === totalPages ? "#f0f0f0" : "#fff",
                        color: currentPage === totalPages ? "#999" : "#1D6AB7",
                        borderRadius: "4px",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "12px"
                      }}
                    >
                      Last ▶▶
                    </button>
                  </>
                )}

                <span style={{ color: "#666", fontSize: "12px", marginLeft: "10px" }}>
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="no-data">
            {searchTerm ? (
              <span>No {filterStatus === "done" ? "completed" : "in-progress"} tasks match your search.</span>
            ) : (
              <>No {filterStatus === "done" ? "completed" : "in-progress"} tasks found. {filterStatus !== "done" && "Create a request to start tracking production."}</>
            )}
          </div>
        )}
            </>
        )}
      </div>
      {showTaskDetailModal && selectedTaskId && (
        <TaskDetailModal 
          productProcessId={selectedTaskId}
          onClose={handleCloseTaskDetail}
          onSave={handleTaskSave}
        />
      )}

      {/* Toast Notification */}
      {addProductMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: toastType === "success" ? "#d4edda" : "#f8d7da",
          color: toastType === "success" ? "#155724" : "#721c24",
          padding: "16px 24px",
          borderRadius: "6px",
          border: `1px solid ${toastType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 10000,
          maxWidth: "400px",
          animation: "slideIn 0.3s ease-out",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          fontWeight: "500"
        }}>
          <span style={{ fontSize: "18px" }}>
            {toastType === "success" ? "✓" : "✕"}
          </span>
          <span>{addProductMessage}</span>
        </div>
      )}

      {/* Add CSS for toast animation */}
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

      {/* Add Product/Part Modal */}
      {showAddProductModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="modal-dialog" style={{ backgroundColor: "white", borderRadius: "8px", maxWidth: "600px", width: "90%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ backgroundColor: "#52A374", padding: "1.5rem", borderBottom: "2px solid #fff", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "1rem" }}>
              <h5 className="modal-title" style={{ color: "white", marginBottom: 0, flex: 1 }}>Add Product/Part</h5>
              <button 
                type="button" 
                onClick={() => setShowAddProductModal(false)}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: "white", 
                  fontSize: "2rem", 
                  cursor: "pointer", 
                  padding: "0", 
                  width: "2rem", 
                  height: "2rem", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  flexShrink: 0
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddProductSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="modal-body" style={{ padding: "1.5rem", overflowY: "auto", flex: 1, minHeight: "0", maxHeight: "calc(90vh - 200px)" }}>
                <div className="mb-3">
                  <label className="form-label fw-600">Product Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="part_name"
                    placeholder="e.g., Bracket-Muffler-1697"
                    value={partForm.part_name}
                    onChange={handleAddProductFormChange}
                    required
                  />
                  <small className="text-muted">The product name customers will choose from in requests</small>
                </div>

                <div style={{ borderTop: "2px solid #e9ecef", paddingTop: "1rem", marginTop: "1.5rem" }}>
                  <label className="form-label fw-600">Production Processes</label>
                  
                  {/* Two Column Layout */}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", height: "400px", border: "1px solid #e9ecef", borderRadius: "4px", overflow: "hidden" }}>
                    
                    {/* Left Column - Process List */}
                    <div style={{ flex: "0 0 180px", backgroundColor: "#f8f9fa", borderRight: "2px solid #52A374", overflowY: "auto", padding: "0.5rem" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#666", marginBottom: "0.5rem", paddingLeft: "0.5rem" }}>Processes</div>
                      {partForm.processes.map((process, processIndex) => (
                        <div key={processIndex} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedProcessIndex(processIndex)}
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              backgroundColor: selectedProcessIndex === processIndex ? "#52A374" : "white",
                              color: selectedProcessIndex === processIndex ? "white" : "#333",
                              border: `2px solid #52A374`,
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontWeight: selectedProcessIndex === processIndex ? "600" : "400",
                              fontSize: "0.875rem",
                              transition: "all 0.2s"
                            }}
                          >
                            Process {processIndex + 1}
                          </button>
                          {partForm.processes.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                handleRemoveProcess(processIndex);
                                setSelectedProcessIndex(Math.max(0, selectedProcessIndex - 1));
                              }}
                              style={{ padding: "0.375rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleAddProcess}
                        style={{ width: "calc(100% - 1rem)", marginTop: "0.5rem", marginLeft: "0.5rem" }}
                      >
                        <i className="bi bi-plus me-1"></i>Add
                      </button>
                    </div>

                    {/* Right Column - Process Details for Selected Process */}
                    <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
                      {partForm.processes[selectedProcessIndex] && (
                        <div>
                          {/* Process Names/Operations */}
                          <label className="form-label fw-600" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                            <i className="bi bi-wrench me-2"></i>Process/Operation Descriptions
                          </label>
                          {partForm.processes[selectedProcessIndex].process_names.map((processName, nameIndex) => (
                            <div key={nameIndex} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g., Blanking, Bending, Forming, Welding"
                                value={processName}
                                onChange={(e) => handleProcessNameChange(selectedProcessIndex, nameIndex, e.target.value)}
                                required
                                style={{ fontSize: "0.875rem" }}
                              />
                              {partForm.processes[selectedProcessIndex].process_names.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveProcessName(selectedProcessIndex, nameIndex)}
                                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleAddProcessName(selectedProcessIndex)}
                            style={{ width: "100%", marginTop: "0.5rem" }}
                          >
                            <i className="bi bi-plus me-1"></i>Add Operation
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ backgroundColor: "#f8f9fa", padding: "1rem", borderTop: "2px solid #dee2e6", display: "flex", gap: "10px", justifyContent: "flex-end", position: "sticky", bottom: 0, zIndex: 999, flexShrink: 0 }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setShowAddProductModal(false)}
                  style={{ flex: "1", padding: "0.5rem 1rem", backgroundColor: "#e9ecef", color: "#333", border: "1px solid #dee2e6" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn" 
                  disabled={addProductLoading}
                  style={{ flex: "1", padding: "0.5rem 1rem", backgroundColor: "#007bff", color: "white", border: "none" }}
                >
                  {addProductLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default TaskStatus;
