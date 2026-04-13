import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./TaskStatusReport.css";

function TaskStatusReport() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({});

  // Load tasks from URL hash on component mount
  useEffect(() => {
    try {
      console.log("\n========================================");
      console.log("=== TaskStatusReport LOADING ===");
      console.log("========================================");
      
      // Method 1: URL Hash (PRIMARY - most reliable)
      console.log("\n1. Checking URL hash...");
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const encodedData = params.get('data');
      
      if (encodedData) {
        console.log("✓ Found encoded data in URL hash");
        const jsonStr = atob(encodedData);
        const data = JSON.parse(jsonStr);
        
        console.log("✓ Decoded and parsed successfully");
        console.log("Tasks: " + data.tasks.length);
        
        if (data.tasks.length > 0) {
          console.log("First task: " + data.tasks[0].product_name);
        }
        
        setTasks(data.tasks);
        setFilters(data.filters || {});
        console.log("========================================\n");
        return;
      }
      
      // Method 2: localStorage (fallback)
      console.log("\n2. Checking localStorage...");
      const stored = localStorage.getItem('taskStatusReportData');
      if (stored) {
        const data = JSON.parse(stored);
        console.log("✓ Found in localStorage");
        setTasks(data.tasks);
        setFilters(data.filters || {});
        localStorage.removeItem('taskStatusReportData');
        console.log("========================================\n");
        return;
      }
      
      // Method 3: React Router state (fallback)
      console.log("\n3. Checking React Router state...");
      if (location.state?.tasks) {
        console.log("✓ Found in location.state");
        setTasks(location.state.tasks);
        setFilters(location.state.filters || {});
        console.log("========================================\n");
        return;
      }
      
      console.log("✗ No data found in any source");
      setTasks([]);
      console.log("========================================\n");
      
    } catch (error) {
      console.error("✗ Error loading data:", error);
      setTasks([]);
    }
  }, [location]);



  // Get active tasks (no grouping, just filter)
  const activeTasks = useMemo(() => {
    const inProgressTasks = tasks.filter(t => (t.task_status || "").toLowerCase() === "in-progress");
    // Sort by issuance number
    return inProgressTasks.sort((a, b) => (a.request_id || 0) - (b.request_id || 0));
  }, [tasks]);

  // Calculate summary metrics (active tasks only)
  const summary = useMemo(() => {
    const inProgressTasks = tasks.filter(t => (t.task_status || "").toLowerCase() === "in-progress");
    const totalTasks = inProgressTasks.length;
    
    return {
      totalTasks,
      inProgress: totalTasks,
      completionRate: "0.0"
    };
  }, [tasks]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeColor = (taskStatus) => {
    const statusLower = (taskStatus || "").toLowerCase();
    const colors = {
      "in-progress": { bg: "#e3f2fd", color: "#1D6AB7" },
      "done": { bg: "#e8f5e9", color: "#2e7d32" }
    };
    return colors[statusLower] || colors["in-progress"];
  };

  const getDeadlineValue = (task) => {
    // Try multiple sources for deadline 
    // Priority: use_date first (actual deadline), then deadline_extension if not dash, then others
    let deadline = null;
    
    // Check due_date first (has real date)
    if (task.due_date && task.due_date !== "-") {
      deadline = task.due_date;
    } 
    // Then check deadline_extension if it's not a dash
    else if (task.deadline_extension && task.deadline_extension !== "-") {
      deadline = task.deadline_extension;
    }
    // Then check deadline
    else if (task.deadline && task.deadline !== "-") {
      deadline = task.deadline;
    }
    // Then check deadline_date
    else if (task.deadline_date && task.deadline_date !== "-") {
      deadline = task.deadline_date;
    }
    
    // If not found and task has steps, check steps
    if (!deadline && task.steps && task.steps.length > 0) {
      const firstStep = task.steps[0];
      if (firstStep.due_date && firstStep.due_date !== "-") deadline = firstStep.due_date;
      else if (firstStep.deadline_extension && firstStep.deadline_extension !== "-") deadline = firstStep.deadline_extension;
      else if (firstStep.deadline && firstStep.deadline !== "-") deadline = firstStep.deadline;
    }
    
    if (deadline) {
      try {
        const dateObj = new Date(deadline);
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
          return "—";
        }
        return dateObj.toLocaleDateString();
      } catch (e) {
        return "—";
      }
    }
    
    return "—";
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Print Controls */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        padding: "15px 40px",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #dee2e6",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        zIndex: 1000
      }}>
        <button
          onClick={handlePrint}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1D6AB7",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500"
          }}
        >
          🖨️ Print Report
        </button>
      </div>

      {/* Report Content */}
      <div style={{
        fontFamily: "Arial, sans-serif",
        padding: "40px",
        backgroundColor: "white",
        color: "#333",
        lineHeight: 1.6
      }}>
        
        {/* HEADER */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "2px solid #1d6ab7"
        }}>
          <img src="/Group 1.png" alt="WB Logo" style={{ width: "60px", height: "60px", objectFit: "contain" }} />
          <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.4 }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>WB TECHNOLOGIES INC.</div>
            <div>123 Industrial Avenue, Metro Manila, Philippines</div>
            <div>Tel: +63-2-8123-4567 | Email: info@wbtechnologies.com</div>
          </div>
        </div>

        {/* TITLE */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7", marginBottom: "10px" }}>
            ACTIVE TASK STATUS REPORT
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
            (In-Progress & Completed Tasks)
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            Generated: {filters.generatedAt || new Date().toLocaleString()}
          </div>
        </div>

        {/* SUMMARY METRICS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "30px",
          fontSize: "11px"
        }}>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Total Tasks</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7" }}>{summary.totalTasks}</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>In-Progress</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7" }}>{summary.inProgress}</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>In-Progress Tasks</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7" }}>{summary.inProgress}</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Report Status</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#558b2f" }}>Active</div>
          </div>
        </div>

        {/* TASKS TABLE */}
        {activeTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
            <p>No active tasks found</p>
          </div>
        ) : (
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "10px",
            marginBottom: "20px"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #999" }}>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Issuance No.</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Product</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Status</th>
                <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Progress</th>
                <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Completed Quota</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Deadline</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {activeTasks.map((task, idx) => {
                const statusColor = getStatusBadgeColor(task.task_status);
                const statusLower = (task.task_status || "").toLowerCase();
                const statusText = statusLower === "in-progress" ? "In-Progress" : statusLower === "done" ? "Done" : "Unknown";
                const progressValue = task.progress ? parseInt(task.progress) : ((task.completed_quota || 0) / (task.total_quota || 1) * 100).toFixed(1);
                return (
                  <tr key={`${task.id}-${idx}`} style={{ borderBottom: "1px solid #ddd", backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontWeight: "600" }}>{task.request_id || "N/A"}</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontSize: "9px" }}>{task.product_name || "Unnamed"}</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc" }}>
                      <span style={{
                        backgroundColor: statusColor.bg,
                        color: statusColor.color,
                        padding: "3px 6px",
                        borderRadius: "2px",
                        fontWeight: "600",
                        fontSize: "9px"
                      }}>
                        {statusText}
                      </span>
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc" }}>
                      {progressValue}%
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc" }}>
                      {task.completed_quota || 0} / {task.total_quota || 0}
                    </td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc" }}>
                      {getDeadlineValue(task)}
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      {task.updated_at ? new Date(task.updated_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* FOOTER WITH SIGNATURES */}
        <div style={{
          marginTop: "60px",
          paddingTop: "40px",
          borderTop: "2px solid #1d6ab7",
          fontSize: "10px",
          color: "#333"
        }}>
          {/* Signature Section */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "30px",
            marginBottom: "20px"
          }}>
            {/* Generated By */}
            <div style={{ textAlign: "center" }}>
              <div style={{ height: "50px", marginBottom: "8px" }}></div>
              <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
                <div style={{ fontWeight: "600", fontSize: "10px" }}>Generated By</div>
              </div>
            </div>

            {/* Date */}
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600" }}>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div style={{ fontWeight: "600", fontSize: "10px" }}>Date</div>
            </div>

            {/* Approved By */}
            <div style={{ textAlign: "center" }}>
              <div style={{ height: "50px", marginBottom: "8px" }}></div>
              <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
                <div style={{ fontWeight: "600", fontSize: "10px" }}>Approved By</div>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <div style={{
            textAlign: "center",
            marginTop: "30px",
            paddingTop: "15px",
            borderTop: "1px solid #ddd",
            fontSize: "9px",
            color: "#999"
          }}>
            <p style={{ margin: "4px 0" }}>This is an automated report generated by TechTrack Management System</p>
            <p style={{ margin: "4px 0" }}>Report Type: Active Task Status | Confidential</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskStatusReport;
