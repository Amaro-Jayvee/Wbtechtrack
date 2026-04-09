/**
 * PrintableReport Component - Professional Print Report with Graph Focus
 * 
 * Monthly production report template for managers with professional formatting.
 * 
 * Features:
 * - Company header with logo (same format as purchase order)
 * - Month/year selectors (hidden on print)
 * - Graph-focused data presentation with professional styling
 * - Summary metrics: Total Completed, Total Defects, Net Output
 * - Weekly production breakdown (bar chart data)
 * - Top 5 product movers with achievement percentages
 * - In-progress and cancelled orders summary
 * - Professional footer with generation timestamp
 * - Back to Dashboard button (hidden on print)
 * 
 * Data Sources:
 * - http://localhost:8000/app/reports/bar-chart/ → weekly statistics
 * - http://localhost:8000/app/reports/top-movers/ → top 5 products
 * - http://localhost:8000/app/product/ → in-progress tasks
 * - http://localhost:8000/app/cancelled-requests/ → cancelled orders
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PrintableReport.css";

function PrintableReport() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [includeArchived, setIncludeArchived] = useState(true);
  const [loading, setLoading] = useState(true);
  const [weeklyRows, setWeeklyRows] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalCompleted: 0,
    totalDefects: 0,
    totalOutput: 0,
    inProgressCount: 0,
    cancelledCount: 0,
    otCount: 0,
    otTotalQuota: 0,
    otTotalDefects: 0,
  });
  const [topMovers, setTopMovers] = useState([]);
  const [inProgressRows, setInProgressRows] = useState([]);
  const [cancelledRows, setCancelledRows] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, [month, year, includeArchived]);

  const isWithinSelectedMonth = (dateText) => {
    if (!dateText) return false;
    const dt = new Date(dateText);
    if (Number.isNaN(dt.getTime())) return false;
    return dt.getFullYear() === year && dt.getMonth() + 1 === month;
  };

  const sumDefectLogs = (logs) => {
    if (!Array.isArray(logs)) return 0;
    return logs.reduce((total, log) => total + (Number(log?.defect_count) || 0), 0);
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = `?month=${month}&year=${year}&include_archived=${includeArchived}`;

      const [barResponse, moversResponse, inProgressResponse, cancelledResponse] = await Promise.all([
        fetch(`http://localhost:8000/app/reports/bar-chart/${params}`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`http://localhost:8000/app/reports/top-movers/${params}&limit=5`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`http://localhost:8000/app/product/?include_completed=false&include_archived=${includeArchived}`, {
          method: "GET",
          credentials: "include",
        }),
        fetch("http://localhost:8000/app/cancelled-requests/", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      let totalCompleted = 0;
      let totalDefects = 0;
      let filteredInProgressRows = [];
      let filteredCancelledRows = [];
      let otTaskCount = 0;
      let otTotalQuota = 0;
      let otTotalDefects = 0;

      if (barResponse.ok) {
        const barData = await barResponse.json();
        const labels = Array.isArray(barData.labels) ? barData.labels : [];
        const productionData = Array.isArray(barData.data?.production) ? barData.data.production : [];
        const defectData = Array.isArray(barData.data?.defects) ? barData.data.defects : [];

        const weekBuckets = {
          1: { week: "Week 1", completed: 0, defects: 0 },
          2: { week: "Week 2", completed: 0, defects: 0 },
          3: { week: "Week 3", completed: 0, defects: 0 },
          4: { week: "Week 4", completed: 0, defects: 0 },
        };

        labels.forEach((label, idx) => {
          const matched = String(label).match(/\d+/);
          const weekNumber = matched ? parseInt(matched[0], 10) : idx + 1;
          const normalizedWeek = weekNumber > 4 ? 4 : weekNumber < 1 ? 1 : weekNumber;
          weekBuckets[normalizedWeek].completed += Number(productionData[idx]) || 0;
          weekBuckets[normalizedWeek].defects += Number(defectData[idx]) || 0;
        });

        const rows = [weekBuckets[1], weekBuckets[2], weekBuckets[3], weekBuckets[4]];

        totalCompleted = rows.reduce((sum, row) => sum + row.completed, 0);
        totalDefects = rows.reduce((sum, row) => sum + row.defects, 0);
        setWeeklyRows(rows);
      } else {
        setWeeklyRows([]);
      }

      if (moversResponse.ok) {
        const moversData = await moversResponse.json();
        const moverProducts = Array.isArray(moversData.products) ? moversData.products : [];
        const ranked = moverProducts.slice(0, 5).map((product, index) => {
          const quota = Number(product.total_quota) || 0;
          const achievement = totalCompleted > 0 ? (quota / totalCompleted) * 100 : 0;
          return {
            rank: index + 1,
            product_name: product.name || "N/A",
            completed_quota: quota,
            achievement_percentage: achievement,
          };
        });
        setTopMovers(ranked);
      } else {
        setTopMovers([]);
      }

      if (inProgressResponse.ok) {
        const stepRows = await inProgressResponse.json();
        const grouped = new Map();

        (Array.isArray(stepRows) ? stepRows : []).forEach((step) => {
          const rpId = step.request_product_id || step.request_product || `${step.request_id || "no-request"}-${step.product_name || "no-product"}`;

          if (!grouped.has(rpId)) {
            grouped.set(rpId, {
              request_id: step.request_id,
              product_name: step.product_name,
              due_date: step.deadline_extension || step.due_date,
              total_quota: Number(step.total_quota) || 0,
              completed_quota: 0,
              defects: 0,
              process_name: step.process_name,
              progress: Number(step.overall_progress) || 0,
              updated_at: step.updated_at,
              is_overtime: false,
              ot_quota: 0,
              ot_defects: 0,
            });
          }

          const current = grouped.get(rpId);
          const stepCompletedQuota = Number(step.completed_quota) || 0;
          const stepDefects = sumDefectLogs(step.defect_logs) || (Number(step.defect_count) || 0);

          current.completed_quota = Math.max(current.completed_quota, stepCompletedQuota);
          current.defects += stepDefects;

          // Track OT data
          if (step.is_overtime) {
            current.is_overtime = true;
            current.ot_quota = Math.max(current.ot_quota, Number(step.ot_quota) || 0);
            const stepOTDefects = sumDefectLogs(step.ot_defect_logs) || 0;
            current.ot_defects += stepOTDefects;
            
            otTaskCount += 1;
            otTotalQuota += Number(step.ot_quota) || 0;
            otTotalDefects += stepOTDefects;
          }

          if (step.overall_progress !== undefined && step.overall_progress !== null) {
            current.progress = Number(step.overall_progress) || current.progress;
          }

          if (!current.process_name && step.process_name) {
            current.process_name = step.process_name;
          }

          if (step.updated_at) {
            current.updated_at = step.updated_at;
          }
        });

        filteredInProgressRows = Array.from(grouped.values())
          .sort((a, b) => Number(a.request_id || 0) - Number(b.request_id || 0));

        setInProgressRows(filteredInProgressRows);
      } else {
        setInProgressRows([]);
      }

      if (cancelledResponse.ok) {
        const cancelledData = await cancelledResponse.json();
        filteredCancelledRows = Array.isArray(cancelledData.cancelled_requests)
          ? cancelledData.cancelled_requests.filter((row) => isWithinSelectedMonth(row.updated_at))
          : [];
        setCancelledRows(filteredCancelledRows);
      } else {
        setCancelledRows([]);
      }

      setSummaryData({
        totalCompleted,
        totalDefects,
        totalOutput: totalCompleted - totalDefects,
        inProgressCount: filteredInProgressRows.length,
        cancelledCount: filteredCancelledRows.length,
        otCount: otTaskCount,
        otTotalQuota: otTotalQuota,
        otTotalDefects: otTotalDefects,
      });
    } catch (err) {
      console.warn("Error fetching report data:", err);
      setWeeklyRows([]);
      setTopMovers([]);
      setInProgressRows([]);
      setCancelledRows([]);
      setSummaryData({
        totalCompleted: 0,
        totalDefects: 0,
        totalOutput: 0,
        inProgressCount: 0,
        cancelledCount: 0,
        otCount: 0,
        otTotalQuota: 0,
        otTotalDefects: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  
  const companyDetails = {
    name: "WB Technologies Inc.",
    tel: "(02) 994.9971",
    mobile: "0922 823 7874",
    address: "B2, L11, Greenland Bulihan Business Park",
    email: "wbtechnologiesinc@yahoo.com / worksbellphiles@yahoo.com",
  };

  const inProgressCount = inProgressRows.length;
  const cancelledCount = cancelledRows.length;
  const cancelledTotalQuantity = cancelledRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const cancelledWithIssuance = cancelledRows.filter((row) => !!row.request_id).length;
  const cancelledDraftOrders = cancelledRows.filter((row) => !row.request_id).length;
  const inProgressTotalQuantity = inProgressRows.reduce((sum, row) => sum + (Number(row.total_quota) || 0), 0);
  const inProgressCompletedQuantity = inProgressRows.reduce((sum, row) => sum + (Number(row.completed_quota) || 0), 0);
  const inProgressDefects = inProgressRows.reduce((sum, row) => sum + (Number(row.defects) || 0), 0);
  const inProgressAverageProgress = inProgressCount > 0
    ? (inProgressRows.reduce((sum, row) => sum + (Number(row.progress) || 0), 0) / inProgressCount)
    : 0;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Back Button (hidden on print) */}
      <div style={{
        no_print: true,
        position: "sticky",
        top: 0,
        padding: "15px",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #dee2e6",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000
      }}
      className="no-print"
      >
        <button 
          onClick={() => navigate(-1)} 
          style={{
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          ← Back to Dashboard
        </button>

        {/* Month/Year Selection */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontWeight: "bold", fontSize: "14px" }}>Month:</label>
            <select 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid #999" }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(year, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontWeight: "bold", fontSize: "14px" }}>Year:</label>
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid #999" }}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input 
              type="checkbox" 
              id="includeArchived"
              checked={includeArchived} 
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="includeArchived" style={{ fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
              Include Archived
            </label>
          </div>

          <button 
            onClick={handlePrint}
            style={{
              padding: "8px 16px",
              backgroundColor: "#1d6ab7",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Professional Print Report */}
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
            <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>WB Technologies Inc.</div>
            <div>B2, L11, Greenland Bulihan Business Park</div>
            <div>Tel: (02) 994.9971 | Mobile: 0922 823 7874</div>
            <div>Email: wbtechnologiesinc@yahoo.com</div>
            <div>worksbellphiles@yahoo.com</div>
          </div>
        </div>

        {/* TITLE */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7", marginBottom: "10px" }}>
            MONTHLY PRODUCTION REPORT
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            {monthName} {year} | Production Analytics & Performance Metrics
          </div>
        </div>

        {/* SUMMARY METRICS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
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
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Total Completed</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d6ab7" }}>{summaryData.totalCompleted}</div>
            <div style={{ fontSize: "9px", color: "#999", marginTop: "4px" }}>units</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Net Output</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#22c55e" }}>{summaryData.totalOutput}</div>
            <div style={{ fontSize: "9px", color: "#999", marginTop: "4px" }}>units</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Total Defects</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#d32f2f" }}>{summaryData.totalDefects}</div>
            <div style={{ fontSize: "9px", color: "#999", marginTop: "4px" }}>units</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>In Progress</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ff9800" }}>{inProgressCount}</div>
            <div style={{ fontSize: "9px", color: "#999", marginTop: "4px" }}>tasks</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            textAlign: "center",
            borderRadius: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>Cancelled</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#999" }}>{cancelledCount}</div>
            <div style={{ fontSize: "9px", color: "#999", marginTop: "4px" }}>orders</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Loading report data...
          </div>
        ) : (
          <>
            {/* WEEKLY PRODUCTION GRAPH */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#1d6ab7", marginBottom: "15px", fontSize: "13px", fontWeight: "bold" }}>
                📊 Weekly Production Breakdown
              </h3>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
                backgroundColor: "white"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #1d6ab7" }}>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: "bold" }}>Week</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", width: "100px" }}>Completed</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", width: "100px" }}>Defects</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", width: "80px" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRows.length === 0 ? (
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <td colSpan="4" style={{ padding: "10px", textAlign: "center", color: "#999" }}>
                        No production data for this period.
                      </td>
                    </tr>
                  ) : (
                    weeklyRows.map((row, idx) => {
                      const percentage = summaryData.totalCompleted > 0 
                        ? ((row.completed / summaryData.totalCompleted) * 100).toFixed(1)
                        : 0;
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                          <td style={{ padding: "10px" }}><strong>{row.week}</strong></td>
                          <td style={{ padding: "10px", textAlign: "center" }}>{row.completed}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>{row.defects}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <div style={{
                              backgroundColor: "#e0e0e0",
                              borderRadius: "3px",
                              height: "4px",
                              overflow: "hidden",
                              marginBottom: "2px"
                            }}>
                              <div style={{
                                backgroundColor: "#1d6ab7",
                                height: "100%",
                                width: `${percentage}%`
                              }}></div>
                            </div>
                            <span style={{ fontSize: "9px" }}>{percentage}%</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {weeklyRows.length > 0 && (
                    <tr style={{ backgroundColor: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #1d6ab7" }}>
                      <td style={{ padding: "10px" }}>TOTAL</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{summaryData.totalCompleted}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{summaryData.totalDefects}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TOP 5 PRODUCT MOVERS */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#1d6ab7", marginBottom: "15px", fontSize: "13px", fontWeight: "bold" }}>
                🏆 Top 5 Product Performers
              </h3>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
                backgroundColor: "white"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #1d6ab7" }}>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", width: "40px" }}>Rank</th>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: "bold" }}>Product Name</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", width: "80px" }}>Quota</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold", width: "100px" }}>Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {topMovers.length === 0 ? (
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <td colSpan="4" style={{ padding: "10px", textAlign: "center", color: "#999" }}>
                        No top movers available for this period.
                      </td>
                    </tr>
                  ) : (
                    topMovers.map((mover) => (
                      <tr 
                        key={mover.rank} 
                        style={{
                          borderBottom: "1px solid #ddd",
                          backgroundColor: mover.rank === 1 ? "#f0f7ff" : "white"
                        }}
                      >
                        <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>
                          {mover.rank === 1 ? "🥇" : mover.rank === 2 ? "🥈" : mover.rank === 3 ? "🥉" : mover.rank}
                        </td>
                        <td style={{ padding: "10px" }}>{mover.product_name}</td>
                        <td style={{ padding: "10px", textAlign: "center" }}>{mover.completed_quota}</td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <div style={{
                            backgroundColor: "#e0e0e0",
                            borderRadius: "3px",
                            height: "4px",
                            overflow: "hidden",
                            marginBottom: "2px"
                          }}>
                            <div style={{
                              backgroundColor: mover.achievement_percentage >= 100 ? "#22c55e" : "#1d6ab7",
                              height: "100%",
                              width: `${Math.min(mover.achievement_percentage, 100)}%`
                            }}></div>
                          </div>
                          <span style={{ fontSize: "9px", fontWeight: "bold" }}>
                            {mover.achievement_percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* IN-PROGRESS TASKS */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#1d6ab7", marginBottom: "15px", fontSize: "13px", fontWeight: "bold" }}>
                ⏳ In-Progress Production Tasks
              </h3>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
                backgroundColor: "white"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #1d6ab7" }}>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: "bold" }}>Metric</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>Total In-Progress Products</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{inProgressCount}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>Total Requested Quantity</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{inProgressTotalQuantity}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>Completed So Far</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{inProgressCompletedQuantity}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>In-Progress Defects</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#d32f2f" }}>{inProgressDefects}</td>
                  </tr>
                  <tr style={{ backgroundColor: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #1d6ab7" }}>
                    <td style={{ padding: "10px" }}>Average Progress</td>
                    <td style={{ padding: "10px", textAlign: "center" }}>{inProgressAverageProgress.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OVERTIME SUMMARY */}
            {summaryData.otCount > 0 && (
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#f59e0b", marginBottom: "15px", fontSize: "13px", fontWeight: "bold" }}>
                  ⏱️ Overtime (OT) Production Summary
                </h3>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                  backgroundColor: "white"
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#fef3c7", borderBottom: "2px solid #f59e0b" }}>
                      <th style={{ padding: "10px", textAlign: "left", fontWeight: "bold" }}>Metric</th>
                      <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "10px" }}>Tasks with Overtime Enabled</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#f59e0b" }}>{summaryData.otCount}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "10px" }}>Total OT Quota Completed</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{summaryData.otTotalQuota}</td>
                    </tr>
                    <tr style={{ backgroundColor: "#fff3cd", fontWeight: "bold", borderTop: "2px solid #f59e0b" }}>
                      <td style={{ padding: "10px" }}>OT-Related Defects</td>
                      <td style={{ padding: "10px", textAlign: "center", color: "#d32f2f" }}>{summaryData.otTotalDefects}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* CANCELLED ORDERS */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#1d6ab7", marginBottom: "15px", fontSize: "13px", fontWeight: "bold" }}>
                ❌ Cancelled Orders Summary
              </h3>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
                backgroundColor: "white"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #1d6ab7" }}>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: "bold" }}>Metric</th>
                    <th style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>Total Cancelled Orders</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{cancelledCount}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>Total Cancelled Quantity</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{cancelledTotalQuantity}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>Orders With Issuance No.</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold" }}>{cancelledWithIssuance}</td>
                  </tr>
                  <tr style={{ backgroundColor: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #1d6ab7" }}>
                    <td style={{ padding: "10px" }}>Draft Orders (No Issuance)</td>
                    <td style={{ padding: "10px", textAlign: "center" }}>{cancelledDraftOrders}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div style={{
              marginTop: "40px",
              paddingTop: "20px",
              borderTop: "1px solid #ddd",
              fontSize: "9px",
              color: "#999"
            }}>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Report Generated:</strong> {new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Document:</strong> Monthly Production Report | <strong>Company:</strong> WB Technologies Inc. | <strong>Status:</strong> Official
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PrintableReport;
