import React, { useState, useEffect } from "react";
import SidebarLayout from "./SidebarLayout";
import TaskDetailModal from "./TaskDetailModal";
import "./Dashboard.css";

function TaskStatus() {
  const [requestProducts, setRequestProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("in-progress");
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    updated_from: "",
    updated_to: "",
  });
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    fetchTaskStatus(filterStatus, dateFilter);
  }, []);

  const fetchTaskStatus = async (status = "all", dateFilters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // For "Done" filter, show archived items; otherwise show non-archived
      if (status === "done") {
        params.append("include_archived", "true");
      } else {
        params.append("include_archived", "false");
      }
      
      if (dateFilters.updated_from) {
        params.append("updated_from", dateFilters.updated_from);
      }
      if (dateFilters.updated_to) {
        params.append("updated_to", dateFilters.updated_to);
      }

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
        
        // Calculate aggregated progress
        const totalSteps = product.steps.length;
        const completedSteps = product.steps.filter(s => s.is_completed).length;
        const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        
        // Find first incomplete step (current step being worked on)
        const currentStep = product.steps.find(s => !s.is_completed) || product.steps[totalSteps - 1];
        
        // Show current step's completed quota progress (not summed across steps)
        const currentStepCompletedQuota = currentStep?.completed_quota || 0;
        
        return {
          ...product,
          total_steps: totalSteps,
          completed_steps: completedSteps,
          progress: `${progressPercent}%`,
          completed_summary: `${currentStepCompletedQuota}/${product.total_quota}`,
          step_order: currentStep?.step_order || totalSteps,
          defect_count: currentStep?.defect_count || 0,
          process_name: currentStep?.process_name || "—",
          task_status: completedSteps === totalSteps ? "done" : "in-progress"
        };
      });
      
      // Apply status filter
      if (status === "in-progress") {
        aggregatedData = aggregatedData.filter(item => 
          item.task_status === "in-progress"
        );
      } else if (status === "done") {
        // When showing "Done", only show archived items
        aggregatedData = aggregatedData.filter(item => 
          item.archived_at !== null
        );
      }
      // For "all", show everything that came from the API (respecting include_archived param)
      
      console.log("📊 Loaded aggregated product data:", aggregatedData);
      setRequestProducts(aggregatedData);
    } catch (err) {
      console.error("Error fetching task status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    fetchTaskStatus(e.target.value, dateFilter);
  };

  const handleDateRangeApply = () => {
    fetchTaskStatus(filterStatus, dateFilter);
    setShowDateRangePicker(false);
  };

  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    setDateFilter({ ...dateFilter, [name]: value });
  };

  const handleOpenTaskDetail = (product) => {
    // Find the first incomplete step, or last step if all complete
    const stepToOpen = product.steps.find(s => !s.is_completed) || product.steps[product.steps.length - 1];
    console.log(`📂 Opening task detail for product: ${product.product_name}, step: ${stepToOpen?.step_order}`);
    setSelectedTaskId(stepToOpen?.id);
    setShowTaskDetailModal(true);
  };

  const handleCloseTaskDetail = () => {
    console.log("📁 Closing task detail modal");
    setShowTaskDetailModal(false);
    setSelectedTaskId(null);
  };

  const handleTaskSave = async (nextStepId) => {
    console.log(`💾 Task saved. Next step ID: ${nextStepId}`);
    
    // Refresh the task list
    await fetchTaskStatus(filterStatus, dateFilter);
    
    // If there's a next step, auto-open it
    if (nextStepId) {
      console.log(`🔄 Auto-opening next step: ${nextStepId}`);
      setTimeout(() => {
        handleOpenTaskDetail(nextStepId);
      }, 300);
    } else {
      // Close modal if no next step
      setShowTaskDetailModal(false);
      setSelectedTaskId(null);
    }
  };

  return (
    <SidebarLayout>
      <div className="content">
        {/* Filter and Controls Bar */}
        <div className="mb-4 d-flex align-items-center gap-3">
          <div style={{ minWidth: "280px" }}>
            <label className="fw-600 text-muted small mb-2 d-block">
              <i className="bi bi-funnel me-2"></i>Task Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="form-select border-2 fw-500"
            >
              <option value="in-progress">In Progress</option>
              <option value="done">Completed</option>
              <option value="all">All Tasks</option>
            </select>
          </div>

          <button
            className="btn btn-outline-secondary btn-sm mt-4"
            onClick={() => setShowDateRangePicker(!showDateRangePicker)}
            title="Filter by date range"
          >
            <i className="bi bi-calendar3 me-2"></i>Date Range
          </button>

          {showDateRangePicker && (
            <div className="p-3 bg-light rounded border" style={{ minWidth: "300px" }}>
              <div className="d-flex gap-2 align-items-end">
                <div style={{ flex: 1 }}>
                  <label className="small fw-600 mb-1 d-block">From</label>
                  <input
                    type="date"
                    name="updated_from"
                    value={dateFilter.updated_from}
                    onChange={handleDateInputChange}
                    className="form-control"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="small fw-600 mb-1 d-block">To</label>
                  <input
                    type="date"
                    name="updated_to"
                    value={dateFilter.updated_to}
                    onChange={handleDateInputChange}
                    className="form-control"
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDateRangeApply}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading">Loading task status...</div>
        ) : requestProducts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Product Name</th>
                {filterStatus === "done" ? (
                  <>
                    <th>Total Completed Quota</th>
                    <th>Total Defects</th>
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
                <th style={{ textAlign: "center", width: "50px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requestProducts.map((item) => (
                <tr key={item.id}>
                  <td>{item.request_id}</td>
                  <td>{item.product_name || "N/A"}</td>
                  {filterStatus === "done" ? (
                    <>
                      <td>{item.completed_steps > 0 ? Math.round((item.completed_steps / item.total_steps) * item.total_quota) : 0}/{item.total_quota}</td>
                      <td>{item.steps.reduce((sum, s) => sum + (s.defect_count || 0), 0)}</td>
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
                              width: item.progress ? item.progress.replace("%", "") + "%" : "0%" 
                            }}></div>
                          </div>
                          {item.progress || "0%"}
                        </div>
                      </td>
                      <td>
                        <div style={{ textAlign: "center" }}>
                          {item.completed_summary ? item.completed_summary.split("/")[0] : "0"}/{item.total_quota}
                        </div>
                      </td>
                      <td>{item.defect_count || 0}</td>
                    </>
                  )}
                  <td>{item.due_date || "N/A"}</td>
                  <td>{item.deadline_extension || "N/A"}</td>
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
        ) : (
          <div className="no-data">No {filterStatus === "done" ? "completed" : "in-progress"} tasks found. {filterStatus !== "done" && "Create a request to start tracking production."}</div>
        )}
      </div>

      {/* Task Detail Modal */}
      {showTaskDetailModal && selectedTaskId && (
        <TaskDetailModal 
          productProcessId={selectedTaskId}
          onClose={handleCloseTaskDetail}
          onSave={handleTaskSave}
        />
      )}
    </SidebarLayout>
  );
}

export default TaskStatus;
