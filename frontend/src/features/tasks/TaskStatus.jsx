import React, { useState, useEffect, useMemo } from "react";
import SidebarLayout from "../../shared/components/SidebarLayout";
import TaskDetailModal from "./TaskDetailModal";
import TaskStatusPODetailModal from "./TaskStatusPODetailModal";
import QuotaDefectModal from "./QuotaDefectModal";
import AdminRequestApproval from "../accounts/AdminRequestApproval";
import "../../features/dashboard/Dashboard.css";
import { useUser } from "../../shared/context/UserContext.jsx";
import { apiCall } from "../../shared/utils/csrfUtils.js";

function TaskStatus() {
  const { userData } = useUser();
  const [requestProducts, setRequestProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("in-progress");
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [showQuotaDefectModal, setShowQuotaDefectModal] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [sortBy, setSortBy] = useState("number"); // "date", "number", "name"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"
  const [partForm, setPartForm] = useState({
    part_name: "",
    processes: [{ process_names: [""] }]
  });
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [addProductMessage, setAddProductMessage] = useState("");
  const [toastType, setToastType] = useState("info"); // 'success' or 'error'
  const [selectedProcessIndex, setSelectedProcessIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReportMode, setShowReportMode] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
  const itemsPerPage = 10;

  // NEW: Selected PO for detail view (inline, not modal)
  const [selectedPOView, setSelectedPOView] = useState(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [saveConfirmMessage, setSaveConfirmMessage] = useState("");
  const [pendingSaveRefresh, setPendingSaveRefresh] = useState(false);

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
      const payload = {
        product_name: partForm.part_name,
        processes: partForm.processes.flatMap((proc) =>
          proc.process_names
            .filter(name => name.trim() !== "")
            .map(process_name => ({
              process_name: process_name
            }))
        )
      };

      if (payload.processes.length === 0) {
        setAddProductMessage("Please add at least one process/operation");
        setAddProductLoading(false);
        return;
      }

      const response = await apiCall("/app/create-product-with-processes/", {
        method: "POST",
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
      
      if (status === "done") {
        params.append("include_completed", "true");
      } else {
        params.append("include_completed", "false");
      }
      
      params.append("include_archived", "false");
      params.append("t", Date.now());

      const response = await apiCall(
        `/app/product/?${params.toString()}`,
        {
          method: "GET",
        }
      );

      let steps = await response.json();
      
      // Group steps by request_id to create aggregated PO rows
      const poMap = {};
      
      steps.forEach(step => {
        const key = step.request_id;
        if (!poMap[key]) {
          poMap[key] = {
            request_id: key || step.request_product_id,
            requester_name: step.requester_name,
            deadline: step.due_date,
            products: [],
            all_steps: [],
            is_completed: false,
            total_products: 0,
            completed_products_count: 0,
            total_finished_quantity: 0,
            total_quota_sum: 0,
            total_defect_count: 0,
          };
        }
        
        // Track product names (deduplicate by request_product_id)
        const existingProduct = poMap[key].products.find(p => p.request_product_id === step.request_product_id);
        if (!existingProduct) {
          poMap[key].products.push({
            request_product_id: step.request_product_id,
            product_name: step.product_name,
            total_quota: step.total_quota,
            completed_quota: step.completed_quota,
            defect_count: step.defect_count || 0,
            overall_progress: step.overall_progress || 0,
            is_completed: step.request_product_completed_at !== null && step.request_product_completed_at !== undefined,
            completed_at: step.request_product_completed_at,
            updated_at: step.updated_at,
            is_pst_01: step.is_pst_01,
            steps: [],
            firstStepId: null,
            finished_quantity: step.finished_quantity || 0,
          });
          poMap[key].total_products++;
          poMap[key].total_quota_sum += (step.total_quota || 0);
        }
        
        // Add step to the product
        const targetProduct = poMap[key].products.find(p => p.request_product_id === step.request_product_id);
        if (targetProduct) {
          targetProduct.steps.push(step);
          if (!targetProduct.firstStepId) {
            targetProduct.firstStepId = step.id;
          }
        }
        
        poMap[key].all_steps.push(step);
      });
      
      // Convert to array and calculate aggregated progress for each PO
      let aggregatedData = Object.values(poMap).map(po => {
        let completedCount = 0;
        let totalDefects = 0;
        let totalFinishedQty = 0;
        
        // Process each product within the PO
        po.products = po.products.map(product => {
          // Sort steps by step_order
          product.steps.sort((a, b) => a.step_order - b.step_order);
          
          const totalSteps = product.steps.length;
          const completedSteps = product.steps.filter(s => s.is_completed).length;
          
          // Use the new cascade-based overall_progress from backend
          // This represents: finished_quantity / original_product_quota
          let progressPercent = 0;
          if (product.steps.length > 0 && product.steps[0].overall_progress !== undefined) {
            progressPercent = product.steps[0].overall_progress;
          } else {
            // Fallback: use finished_quantity / total_quota
            const finishedQty = product.finished_quantity || 0;
            const totalQty = product.total_quota || 1;
            progressPercent = Math.min(Math.round((finishedQty / totalQty) * 100), 100);
          }
          
          // Calculate defects (sum across all steps)
          const productDefects = product.steps.reduce((sum, step) => {
            return sum + (step.defect_count || 0);
          }, 0);
          
          // Get updated_at from last step
          const lastStep = product.steps[product.steps.length - 1];
          
          if (product.is_completed) completedCount++;
          totalDefects += productDefects;
          totalFinishedQty += (product.finished_quantity || 0);
          
          return {
            ...product,
            progress: `${progressPercent}%`,
            completed_steps: completedSteps,
            total_steps: totalSteps,
            defect_count: productDefects,
            updated_at: lastStep?.updated_at || product.updated_at,
          };
        });
        
        // Calculate overall PO status using the new formula:
        // Project Progress = Sum(finished_quantity) / Sum(total_quota)
        po.completed_products_count = completedCount;
        po.total_defect_count = totalDefects;
        po.total_finished_quantity = totalFinishedQty;
        po.is_completed = completedCount === po.total_products && po.total_products > 0;
        
        // Project progress = sum of finished products / sum of quotas
        const projectProgress = po.total_quota_sum > 0 
          ? Math.round((totalFinishedQty / po.total_quota_sum) * 100)
          : 0;
        po.overall_progress = `${projectProgress}%`;
        
        // Get overall deadline/updated_at
        po.updated_at = po.all_steps.length > 0
          ? po.all_steps.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]?.updated_at
          : null;
        
        po.task_status = po.is_completed ? "done" : "in-progress";
        
        // Get deadline from the first product's due_date
        po.deadline = po.products[0]?.steps[0]?.due_date || null;
        
        return po;
      });
      
      // Apply status filter
      if (status === "in-progress") {
        aggregatedData = aggregatedData.filter(item => 
          item.task_status === "in-progress"
        );
      } else if (status === "done") {
        aggregatedData = aggregatedData.filter(item => 
          item.is_completed === true
        );
      }
      
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
    setSelectedPOView(null); // Go back to main view when filter changes
    fetchTaskStatus(e.target.value);
  };

  const sortedRequestProducts = useMemo(() => {
    const filtered = requestProducts.filter((po) =>
      searchTerm === "" ||
      (po.request_id && po.request_id.toString().includes(searchTerm)) ||
      (po.products && po.products.some(p => p.product_name && p.product_name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (po.requester_name && po.requester_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        const dateA = new Date(a.deadline || a.updated_at || 0);
        const dateB = new Date(b.deadline || b.updated_at || 0);
        comparison = dateB - dateA;
      } else if (sortBy === "number") {
        comparison = (b.request_id || 0) - (a.request_id || 0);
      } else if (sortBy === "name") {
        const nameA = (a.requester_name || "").toLowerCase();
        const nameB = (b.requester_name || "").toLowerCase();
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

  // NEW: Handle clicking on a PO row to view its detail inline
  const handleOpenPODetail = (po) => {
    setSelectedPOView(po);
  };

  // NEW: Handle back button to return to main table
  const handleBackToMain = () => {
    setSelectedPOView(null);
  };

  const handleOpenProductTask = (product) => {
    setSelectedProductForEdit(product);
    setShowQuotaDefectModal(true);
  };

  const handleCloseQuotaDefect = () => {
    setShowQuotaDefectModal(false);
    setSelectedProductForEdit(null);
  };

  const handleQuotaDefectSave = async () => {
    try {
      await fetchTaskStatus(filterStatus);
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
    setShowQuotaDefectModal(false);
    setSelectedProductForEdit(null);
    // Show confirmation popup after save and refresh
    setSaveConfirmMessage("✅ Progress saved successfully!");
    setShowSaveConfirmModal(true);
  };

  const handlePrintReport = () => {
    setShowReportMode(true);
    setSelectedRequestIds(new Set());
  };

  const handlePrintCompletedTasksReport = () => {
    setShowReportMode(true);
    setSelectedRequestIds(new Set());
  };

  const handleGenerateCompletedTasksReport = () => {
    try {
      if (selectedRequestIds.size === 0) {
        alert("Please select at least one completed PO to generate report");
        return;
      }
      
      const selectedCompletedPOs = paginatedData.filter(po => selectedRequestIds.has(po.request_id));
      
      if (selectedCompletedPOs.length === 0) {
        alert("No completed POs found in selection");
        return;
      }
      
      const reportData = {
        tasks: selectedCompletedPOs,
        selectedCount: selectedCompletedPOs.length,
        filters: {
          generatedAt: new Date().toLocaleString(),
          reportType: "Completed Tasks"
        }
      };
      
      const jsonStr = JSON.stringify(reportData);
      const encodedData = btoa(jsonStr);
      
      const reportUrl = `/completed-tasks-report#data=${encodedData}`;
      
      const newTab = window.open(reportUrl, '_blank');
      if (!newTab) {
        alert("Could not open report tab. Please check if popups are blocked.");
      }
      
      setShowReportMode(false);
      setSelectedRequestIds(new Set());
      
    } catch (error) {
      console.error("ERROR in handleGenerateCompletedTasksReport:", error);
      alert(`Error generating report: ${error.message}`);
    }
  };

  const handleRequestCheckboxChange = (requestId) => {
    const newSelected = new Set(selectedRequestIds);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequestIds(newSelected);
  };

  const handleSelectAllRequests = (checked) => {
    if (checked) {
      setSelectedRequestIds(new Set(paginatedData.map(p => p.request_id)));
    } else {
      setSelectedRequestIds(new Set());
    }
  };

  const handleGenerateReport = () => {
    try {
      if (selectedRequestIds.size === 0) {
        alert("Please select at least one PO to generate report");
        return;
      }
      
      const selectedPOs = paginatedData.filter(po => selectedRequestIds.has(po.request_id));
      
      if (selectedPOs.length === 0) {
        alert("No POs found in selection");
        return;
      }
      
      const reportData = {
        tasks: selectedPOs,
        selectedCount: selectedRequestIds.size,
        filters: {
          generatedAt: new Date().toLocaleString(),
          reportType: "Active Tasks"
        }
      };
      
      const jsonStr = JSON.stringify(reportData);
      const encodedData = btoa(jsonStr);
      
      const reportUrl = `/task-status-report#data=${encodedData}`;
      
      const newTab = window.open(reportUrl, '_blank');
      if (!newTab) {
        alert("Failed to open report tab. Please check if popups are blocked.");
      }
      
      setShowReportMode(false);
      setSelectedRequestIds(new Set());
      
    } catch (error) {
      console.error("ERROR in handleGenerateReport:", error);
      alert(`Error generating report: ${error.message}`);
    }
  };

  const handleCancelReport = () => {
    setShowReportMode(false);
    setSelectedRequestIds(new Set());
  };

  // Helper to format product names list
  const formatProductNames = (products) => {
    if (!products || products.length === 0) return "—";
    return products.map(p => p.product_name).join(", ");
  };

  return (
    <SidebarLayout>
      <div className="content">
        {/* Admin Request Approval View */}
        {userData.role === "admin" && (
          <AdminRequestApproval />
        )}

        {/* Production Manager Project Status View */}
        {userData.role !== "admin" && (
          <>
            {!selectedPOView ? (
              <>
            {/* MAIN VIEW - PO List Table */}
            {/* Filter and Controls Bar */}
            <div className="mb-4 d-flex align-items-end gap-3" style={{ marginTop: "30px" }}>
          <div style={{ minWidth: "140px", display: "flex", flexDirection: "column" }}>
            <label className="fw-600 text-muted small mb-2 d-block">
              <i className="bi bi-funnel me-2"></i>Project Status Filter
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
              <option value="name">Sort By: Requester</option>
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
                      disabled={selectedRequestIds.size === 0}
                      className="btn fw-600"
                      style={{ 
                        minWidth: "170px", 
                        padding: "0.375rem 0.75rem", 
                        backgroundColor: selectedRequestIds.size === 0 ? "#ccc" : "#28a745", 
                        color: "white", 
                        border: "none", 
                        fontSize: "12px",
                        cursor: selectedRequestIds.size === 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      <i className="bi bi-check-circle me-2"></i>Generate Report ({selectedRequestIds.size})
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

        {/* PO List Table */}
        {loading ? (
          <div className="loading">Loading project status...</div>
        ) : sortedRequestProducts.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  {showReportMode && (
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedRequestIds.size === paginatedData.length && paginatedData.length > 0}
                        onChange={(e) => handleSelectAllRequests(e.target.checked)}
                      />
                    </th>
                  )}
                  <th>Issuance No.</th>
                  <th>Requester</th>
                  <th>Products</th>
                  {filterStatus === "done" ? (
                    <>
                      <th>Completed Products</th>
                      <th>Total Defects</th>
                      <th>Latest Completed</th>
                    </>
                  ) : (
                    <>
                      <th>Progress</th>
                      <th>Finished Product</th>
                      <th>Defect Count</th>
                    </>
                  )}
                  <th>Deadline</th>
                  <th>Last Update</th>
                  <th style={{ textAlign: "center", width: "50px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((po) => {
                  const completedProducts = po.products.filter(p => p.is_completed).length;
                  const totalProducts = po.products.length;
                  const productList = formatProductNames(po.products);
                  
                  return (
                  <tr 
                    key={po.request_id}
                    onClick={() => handleOpenPODetail(po)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f7ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}
                  >
                    {showReportMode && (
                      <td style={{ width: "40px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedRequestIds.has(po.request_id)}
                          onChange={() => handleRequestCheckboxChange(po.request_id)}
                        />
                      </td>
                    )}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#1D6AB7", fontWeight: "600" }}>{po.request_id}</span>
                      </div>
                    </td>
                    <td>{po.requester_name || "—"}</td>
                    <td style={{ maxWidth: "250px" }}>
                      <div style={{ 
                        display: "-webkit-box", 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: "vertical", 
                        overflow: "hidden",
                        fontSize: "13px",
                        fontWeight: "500",
                        lineHeight: "1.3"
                      }}>
                        {productList}
                      </div>
                    </td>
                    {filterStatus === "done" ? (
                      <>
                        <td style={{ fontWeight: "600" }}>
                          {completedProducts}/{totalProducts}
                        </td>
                        <td>{po.total_defect_count || 0}</td>
                        <td>
                          {po.products
                            .filter(p => p.completed_at)
                            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]?.completed_at || "N/A"}
                        </td>
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
                                width: `${Math.min(parseFloat(po.overall_progress) || 0, 100)}%`
                              }}></div>
                            </div>
                            {po.overall_progress || "0%"}
                          </div>
                        </td>
                        <td style={{ fontWeight: "600" }}>
                          {completedProducts}/{totalProducts}
                        </td>
                        <td>{po.total_defect_count || 0}</td>
                      </>
                    )}
                    <td style={{ whiteSpace: "nowrap" }}>{po.deadline || "N/A"}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "#666" }}>
                      {po.updated_at 
                        ? new Date(po.updated_at).toLocaleString('en-US', {
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
                        onClick={(e) => { e.stopPropagation(); handleOpenPODetail(po); }}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                )})}
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
              <span>No {filterStatus === "done" ? "completed" : "in-progress"} POs match your search.</span>
            ) : (
              <>No {filterStatus === "done" ? "completed" : "in-progress"} POs found. {filterStatus !== "done" && "Create a request to start tracking production."}</>
            )}
          </div>
        )}
        </>
        ) : (
          <>
            {/* DETAIL VIEW - Individual Products for Selected PO */}
            <div style={{ marginBottom: "20px", marginTop: "30px" }}>
              {/* PO Header */}
              <div style={{
                background: "linear-gradient(135deg, #1D6AB7, #1557a0)",
                color: "white",
                borderRadius: "10px",
                padding: "20px 24px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}>
                <div>
                  <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>Issuance Detail</div>
                  <div style={{ fontSize: "22px", fontWeight: 800 }}>
                    Issuance No. {selectedPOView.request_id}
                  </div>
                  <div style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>
                    Requester: {selectedPOView.requester_name || "—"} 
                    <span style={{ marginLeft: "20px" }}>
                      Deadline: <strong>{selectedPOView.deadline || "N/A"}</strong>
                    </span>
                    <span style={{ marginLeft: "20px" }}>
                      Products: <strong>{selectedPOView.products.length}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>Overall Progress</div>
                  <div style={{ fontSize: "26px", fontWeight: 800 }}>
                    {selectedPOView.overall_progress || "0%"}
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    {filterStatus === "done" ? (
                      <>
                        <th>Status</th>
                        <th>Defects</th>
                        <th>Completed Date</th>
                      </>
                    ) : (
                      <>
                        <th>Progress</th>
                        <th>Finished Product</th>
                        <th>Defect Count</th>
                        <th>Current Step</th>
                      </>
                    )}
                    <th>Last Update</th>
                    <th style={{ textAlign: "center", width: "70px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPOView.products || []).map((product) => (
                    <tr key={product.request_product_id || product.id}>
                      <td style={{ fontWeight: 700 }}>{product.product_name || "N/A"}</td>
                      {filterStatus === "done" ? (
                        <>
                          <td><span style={{ color: "#16a34a", fontWeight: 800 }}>✓ Done</span></td>
                          <td>{product.defect_count || 0}</td>
                          <td>{product.completed_at || "N/A"}</td>
                        </>
                      ) : (
                        <>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ 
                                backgroundColor: "#e0e0e0", 
                                borderRadius: "4px", 
                                width: "80px", 
                                height: "6px", 
                                overflow: "hidden" 
                              }}>
                                <div style={{ 
                                  backgroundColor: product.is_pst_01 ? "#52A374" : "#1D6AB7", 
                                  height: "100%", 
                                  width: `${Math.min(parseFloat(product.progress) || 0, 100)}%`
                                }}></div>
                              </div>
                              {product.progress || "0%"}
                            </div>
                          </td>
                          <td>
                            {product.is_pst_01 ? (
                              <span style={{ color: "#52A374", fontWeight: 600 }}>✓ Withdrawal</span>
                            ) : (
                              <span style={{ fontWeight: 700, color: "#16a34a" }}>
                                {product.finished_quantity || 0}/{product.total_quota || 0}
                              </span>
                            )}
                          </td>
                          <td>{product.defect_count || 0}</td>
                          <td style={{ fontSize: "0.85rem", color: "#555" }}>
                            {product.steps && product.steps.length > 0 ? (
                              <>
                                <span style={{ fontWeight: 500 }}>
                                  {product.steps.find(s => !s.is_completed)?.process_name || product.steps[product.steps.length - 1]?.process_name || "—"}
                                </span>
                                <span style={{ color: "#888", marginLeft: "6px", fontSize: "0.8rem" }}>
                                  ({(product.steps.findIndex(s => !s.is_completed) + 1 || product.steps.length)}/{product.steps.length})
                                </span>
                              </>
                            ) : "—"}
                          </td>
                        </>
                      )}
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "#666" }}>
                        {product.updated_at 
                          ? new Date(product.updated_at).toLocaleString('en-US', {
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
                          title="Edit quota"
                          onClick={() => handleOpenProductTask(product)}
                        >
                          ⋯
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Finished Product Row */}
                  {(selectedPOView.products || []).map((product) => {
                    const finishedQty = product.finished_quantity || 0;
                    const finishedDefects = product.defect_count || 0;
                    if (finishedQty === 0) return null;
                    return (
                      <tr key={`finished-${product.request_product_id || product.id}`} style={{ backgroundColor: "#f0fdf4" }}>
                        <td style={{ fontWeight: 700, color: "#16a34a" }}>
                          ✓ Finished Product
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: "#16a34a" }}>
                            {Math.round((finishedQty / (product.total_quota || 1)) * 100)}%
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>
                            {finishedQty}/{product.total_quota || 0}
                          </span>
                        </td>
                        <td>{finishedDefects}</td>
                        <td colSpan={2} style={{ fontSize: "0.85rem", color: "#555" }}>
                          Completed and packed units
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Back Button */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                <button
                  onClick={handleBackToMain}
                  className="btn fw-600"
                  style={{
                    padding: "10px 40px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <i className="bi bi-arrow-left"></i> Back to Project Status
                </button>
              </div>
            </div>
          </>
        )}
            </>
        )}
      </div>
      
      {/* Quota Defect Modal */}
      {showQuotaDefectModal && selectedProductForEdit && (
        <QuotaDefectModal
          product={selectedProductForEdit}
          onClose={handleCloseQuotaDefect}
          onSave={handleQuotaDefectSave}
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

      {/* Save Confirmation Modal */}
      {showSaveConfirmModal && (
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
      {showSaveConfirmModal && (
        <div 
          className="modal show"
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
                  Save Successful
                </h4>
                <p style={{ color: "#555", marginBottom: "0", lineHeight: "1.8", fontSize: "15px" }}>
                  {saveConfirmMessage}
                </p>
                <p style={{ color: "#888", fontSize: "13px", marginTop: "12px" }}>
                  The table has been updated with the latest data.
                </p>
              </div>
              <div className="modal-footer border-0 bg-light justify-content-center pb-4">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowSaveConfirmModal(false)}
                  style={{ padding: "10px 40px", fontSize: "15px", fontWeight: "600" }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
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