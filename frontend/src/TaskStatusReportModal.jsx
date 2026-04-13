import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function TaskStatusReportModal({ isOpen, onClose, allTasks, selectedTaskIds }) {
  const navigate = useNavigate();
  const [selectedTasks, setSelectedTasks] = useState(new Set(selectedTaskIds));

  const handleTaskToggle = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTasks(new Set(allTasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleGenerateReport = () => {
    const tasksToInclude = allTasks.filter(task => selectedTasks.has(task.id));

    navigate("/task-status-report", {
      state: {
        tasks: tasksToInclude,
        selectedCount: selectedTasks.size,
        filters: {
          generatedAt: new Date().toLocaleString()
        }
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        padding: "30px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
      }}>
        <h3 style={{ marginTop: 0, color: "#1D6AB7", fontSize: "20px", marginBottom: "20px" }}>
          Select Tasks for Report
        </h3>

        {/* Select All Checkbox */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          marginBottom: "15px",
          fontWeight: "600",
          cursor: "pointer"
        }}>
          <input 
            type="checkbox" 
            checked={selectedTasks.size === allTasks.length && allTasks.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            style={{ cursor: "pointer", width: "18px", height: "18px" }}
          />
          <label style={{ cursor: "pointer", margin: 0, flex: 1 }}>
            Select All Tasks ({selectedTasks.size}/{allTasks.length})
          </label>
        </div>

        {/* Tasks Checklist */}
        <div style={{
          border: "1px solid #ddd",
          borderRadius: "4px",
          maxHeight: "350px",
          overflowY: "auto",
          marginBottom: "20px"
        }}>
          {allTasks.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
              No tasks available
            </div>
          ) : (
            allTasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  borderBottom: idx < allTasks.length - 1 ? "1px solid #eee" : "none",
                  cursor: "pointer",
                  backgroundColor: selectedTasks.has(task.id) ? "#e3f2fd" : "transparent",
                  transition: "background-color 0.2s"
                }}
                onClick={() => handleTaskToggle(task.id)}
              >
                <input 
                  type="checkbox" 
                  checked={selectedTasks.has(task.id)}
                  onChange={() => handleTaskToggle(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: "pointer", width: "18px", height: "18px" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", fontSize: "13px" }}>
                    #{task.id} - {task.part_name || "Unnamed"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#666" }}>
                    Status: {task.status === "in-progress" ? "In-Progress" : task.status === "completed" ? "Completed" : "Cancelled"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "1px solid #ddd",
              backgroundColor: "#f0f0f0",
              color: "#333",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "13px"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={selectedTasks.size === 0}
            style={{
              padding: "8px 16px",
              border: "none",
              backgroundColor: selectedTasks.size === 0 ? "#ccc" : "#1D6AB7",
              color: "#fff",
              borderRadius: "4px",
              cursor: selectedTasks.size === 0 ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "13px"
            }}
          >
            Generate Report ({selectedTasks.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskStatusReportModal;
