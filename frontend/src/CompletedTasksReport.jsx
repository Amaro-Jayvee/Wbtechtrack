import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./PrintableReport.css";

function CompletedTasksReport() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({});

  // Load tasks from URL hash on component mount
  useEffect(() => {
    try {
      console.log("\n========================================");
      console.log("=== CompletedTasksReport LOADING ===");
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
          console.log("First task: " + data.tasks[0].product_name + 
            " (Quota: " + data.tasks[0].total_quota + 
            ", OT: " + data.tasks[0].ot_quota + 
            ", Defects: " + data.tasks[0].defect_count + ")");
        }
        
        setTasks(data.tasks);
        setFilters(data.filters || {});
        console.log("========================================\n");
        return;
      }
      
      // Method 2: localStorage (fallback)
      console.log("\n2. Checking localStorage...");
      const stored = localStorage.getItem('completedTasksReportData');
      if (stored) {
        const data = JSON.parse(stored);
        console.log("✓ Found in localStorage");
        setTasks(data.tasks);
        setFilters(data.filters || {});
        localStorage.removeItem('completedTasksReportData');
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

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "done") {
      return { bg: "#e0f2e0", color: "#22c55e" };
    }
    return { bg: "#f5f5f5", color: "#666" };
  };

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalTasks = tasks.length;
    
    return {
      totalTasks,
      generatedAt: filters.generatedAt || new Date().toLocaleString()
    };
  }, [tasks, filters]);

  const getDeadlineValue = (task) => {
    let deadline = null;
    
    if (task.due_date && task.due_date !== "-") {
      deadline = task.due_date;
    } 
    else if (task.deadline_extension && task.deadline_extension !== "-") {
      deadline = task.deadline_extension;
    }
    else if (task.deadline && task.deadline !== "-") {
      deadline = task.deadline;
    }
    else if (task.deadline_date && task.deadline_date !== "-") {
      deadline = task.deadline_date;
    }
    
    if (!deadline && task.steps && task.steps.length > 0) {
      const firstStep = task.steps[0];
      if (firstStep.due_date && firstStep.due_date !== "-") deadline = firstStep.due_date;
      else if (firstStep.deadline_extension && firstStep.deadline_extension !== "-") deadline = firstStep.deadline_extension;
      else if (firstStep.deadline && firstStep.deadline !== "-") deadline = firstStep.deadline;
    }
    
    if (deadline) {
      try {
        const dateObj = new Date(deadline);
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
    <div style={{
      padding: "40px",
      backgroundColor: "#fff",
      minHeight: "100vh"
    }}>
      {/* COMPANY HEADER */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
        paddingBottom: "20px",
        borderBottom: "3px solid #1d6ab7"
      }}>
        <div>
          <img 
            src="/Group 1.png" 
            alt="WB Technologies" 
            style={{ height: "50px", marginBottom: "10px" }}
          />
          <div style={{ color: "#1d6ab7", fontWeight: "bold", fontSize: "14px" }}>
            WB TECHNOLOGIES INC.
          </div>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>
            Quality Manufacturing & Production Services
          </div>
          <div style={{ color: "#999", fontSize: "10px", lineHeight: "1.4" }}>
            <div>123 Industrial Avenue, Metro Manila, Philippines</div>
            <div>Tel: +63-2-8123-4567 | Email: info@wbtechnologies.com</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "12px", color: "#666" }}>
          <div>Generated: {summary.generatedAt}</div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#999" }}>
            Report Type: Completed Tasks
          </div>
        </div>
      </div>

      {/* REPORT TITLE */}
      <div style={{
        textAlign: "center",
        marginBottom: "30px"
      }}>
        <h2 style={{
          color: "#1d6ab7",
          fontSize: "20px",
          fontWeight: "bold",
          margin: "0 0 8px 0"
        }}>
          COMPLETED TASKS REPORT
        </h2>
        <p style={{
          color: "#666",
          fontSize: "12px",
          margin: "0"
        }}>
          Summary of completed production tasks with quota and defect details
        </p>
      </div>

      {/* SUMMARY METRICS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "15px",
        marginBottom: "30px"
      }}>
        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #1d6ab7",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#1d6ab7",
            marginBottom: "5px"
          }}>
            {summary.totalTasks}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Total Tasks
          </div>
        </div>

        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #22c55e",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#22c55e",
            marginBottom: "5px"
          }}>
            {summary.totalTasks}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Completed
          </div>
        </div>

        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #d32f2f",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#d32f2f",
            marginBottom: "5px"
          }}>
            {tasks.reduce((sum, task) => sum + (task.defect_count || 0), 0)}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Total Defects
          </div>
        </div>

        <div style={{
          backgroundColor: "#f5f5f5",
          border: "2px solid #1d6ab7",
          borderRadius: "6px",
          padding: "15px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#1d6ab7",
            marginBottom: "5px"
          }}>
            {new Date().toLocaleDateString()}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#666",
            fontWeight: "500"
          }}>
            Report Date
          </div>
        </div>
      </div>

      {/* TASKS TABLE */}
      {tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <p>No completed tasks found</p>
        </div>
      ) : (
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "9px",
          marginBottom: "20px"
        }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #999" }}>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Issuance No.</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Product</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Status</th>
              <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Regular Quota</th>
              <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>OT Quota</th>
              <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Defect</th>
              <th style={{ padding: "8px", textAlign: "center", fontWeight: "bold", borderRight: "1px solid #ccc" }}>OT Defect</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderRight: "1px solid #ccc" }}>Deadline</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => {
              const statusColor = getStatusBadgeColor(task.task_status);
              const statusText = (task.task_status || "").toLowerCase() === "done" ? "Done" : "Unknown";
              
              return (
                <tr key={`${task.id}-${idx}`} style={{ borderBottom: "1px solid #ddd", backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontWeight: "600" }}>
                    {task.request_id || "N/A"}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc", fontSize: "8px" }}>
                    {task.product_name || "Unnamed"}
                  </td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #ccc" }}>
                    <span style={{
                      backgroundColor: statusColor.bg,
                      color: statusColor.color,
                      padding: "3px 6px",
                      borderRadius: "2px",
                      fontWeight: "600",
                      fontSize: "8px"
                    }}>
                      {statusText}
                    </span>
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc" }}>
                    {task.total_quota || 0}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc" }}>
                    {task.ot_quota || 0}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc", color: task.defect_count > 0 ? "#d32f2f" : "#666" }}>
                    {task.defect_count || 0}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #ccc", color: (task.ot_defect_count || 0) > 0 ? "#d32f2f" : "#666" }}>
                    {task.ot_defect_count || 0}
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
          <p style={{ margin: "4px 0" }}>Report Type: Completed Tasks | Confidential</p>
        </div>
      </div>
    </div>
  );
}

export default CompletedTasksReport;
