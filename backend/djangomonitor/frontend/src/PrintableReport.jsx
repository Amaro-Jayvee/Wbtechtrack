/**
 * PrintableReport Component
 * 
 * Monthly production report template for managers.
 * 
 * CRITICAL CHANGES (March 15, 2026):
 * - Removed SidebarLayout wrapper: Now renders as standalone component
 *   This eliminates dashboard header/sidebar injection in print output
 * - Added Back to Dashboard button: Uses React Router useNavigate() hook
 *   Allows users to return to dashboard from report view (hidden on print)
 * - Fixed scrollbar in print: CSS media query sets overflow: hidden on html/body
 *   Removes scrollbar from print preview and PDF output
 * - Enhanced signature section: Larger signature lines (200px, 2px border)
 *   Ballpen-friendly signing area with proper spacing
 * 
 * Features:
 * - Company header with logo
 * - Month/year selectors (hidden on print)
 * - Summary cards: Total Completed, Total Defects
 * - Weekly production breakdown table (manual entry rows)
 * - Top 5 product movers table (auto-populated from API)
 * - Notes/Comments section
 * - Signature section: Prepared by & Checked by
 * - Professional print styling: No dashboard UI elements
 * 
 * Data Sources:
 * - /app/reports/bar-chart/ → monthly statistics
 * - /app/reports/top-movers/ → top 5 products
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PrintableReport.css";

function PrintableReport() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [weeklyRows, setWeeklyRows] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalCompleted: 0,
    totalDefects: 0,
    totalOutput: 0,
    inProgressCount: 0,
    cancelledCount: 0,
  });
  const [topMovers, setTopMovers] = useState([]);
  const [inProgressRows, setInProgressRows] = useState([]);
  const [cancelledRows, setCancelledRows] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, [month, year]);

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
      const params = `?month=${month}&year=${year}&include_archived=false`;

      const [barResponse, moversResponse, inProgressResponse, cancelledResponse] = await Promise.all([
        fetch(`http://localhost:8000/app/reports/bar-chart/${params}`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`http://localhost:8000/app/reports/top-movers/${params}&limit=5`, {
          method: "GET",
          credentials: "include",
        }),
        fetch("http://localhost:8000/app/product/?include_completed=false&include_archived=false", {
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
            });
          }

          const current = grouped.get(rpId);
          const stepCompletedQuota = Number(step.completed_quota) || 0;
          const stepDefects = sumDefectLogs(step.defect_logs) || (Number(step.defect_count) || 0);

          current.completed_quota = Math.max(current.completed_quota, stepCompletedQuota);
          current.defects += stepDefects;

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
    <div className="printable-report-page">
      <div className="printable-report-container">
        {/* Back Button */}
        <div className="back-button-area">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back to Dashboard
          </button>
        </div>

        {/* Print Button */}
        <div className="print-button-area">
          <button onClick={handlePrint} className="print-btn">
            🖨️ Print Report
          </button>
        </div>

        {/* Month/Year Selection */}
        <div className="month-year-selector no-print">
          <div className="selector-group">
            <label>Month:</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(year, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="selector-group">
            <label>Year:</label>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
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
        </div>

        {/* Report Content */}
        <div className="report-content">
          {/* Header Section */}
          <div className="printable-header">
            <div className="printable-header-left"></div>
            <div className="printable-header-center">
              <h1 className="printable-company-name">{companyDetails.name}</h1>
                <p className="printable-company-info"><strong>Tel:</strong> {companyDetails.tel}</p>
                <p className="printable-company-info"><strong>Mobile:</strong> {companyDetails.mobile}</p>
                <p className="printable-company-info"><strong>Address:</strong> {companyDetails.address}</p>
                <p className="printable-company-info"><strong>Email:</strong> {companyDetails.email}</p>
            </div>
            <div className="printable-header-right">
              <img src="/Group 1.png" alt="Company Logo" className="printable-logo" />
            </div>
          </div>

          {/* Title Section */}
          <div className="report-title-section">
            <h2>System Summary Report</h2>
            <p className="report-subtitle">{monthName} {year}</p>
          </div>

          {/* Summary Line */}
          <div className="table-section">
            <h3>System Summary</h3>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Completed Quota</td>
                  <td>{summaryData.totalCompleted}</td>
                </tr>
                <tr>
                  <td>Total Defects</td>
                  <td>{summaryData.totalDefects}</td>
                </tr>
                <tr>
                  <td>Net Output</td>
                  <td>{summaryData.totalOutput}</td>
                </tr>
                <tr>
                  <td>In-Progress Task Products</td>
                  <td>{inProgressCount}</td>
                </tr>
                <tr>
                  <td>Cancelled Orders</td>
                  <td>{cancelledCount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: "20px" }}>Loading report data...</p>
          ) : (
            <>
              {/* Weekly Breakdown Table */}
              <div className="table-section">
                <h3>Weekly Production Breakdown</h3>
                <table className="production-table">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Completed Quota</th>
                      <th>Defects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyRows.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: "center" }}>No production data for this period.</td>
                      </tr>
                    )}
                    {weeklyRows.map((row) => (
                      <tr key={row.week}>
                        <td className="week-label">{row.week}</td>
                        <td>{row.completed}</td>
                        <td>{row.defects}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="week-label"><strong>Total</strong></td>
                      <td className="total-cell">{summaryData.totalCompleted}</td>
                      <td className="total-cell">{summaryData.totalDefects}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Top Movers Table */}
              <div className="table-section keep-together">
                <h3>Top 5 Product Movers</h3>
                <table className="production-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product Name</th>
                      <th>Monthly Quota</th>
                      <th>Defects</th>
                      <th>Achievement %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMovers.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center" }}>No top movers available for this period.</td>
                      </tr>
                    )}
                    {topMovers.map((mover) => (
                      <tr key={mover.rank} className={mover.rank === 1 ? "rank-1" : ""}>
                        <td className="rank-col">{mover.rank}</td>
                        <td>{mover.product_name}</td>
                        <td>{mover.completed_quota}</td>
                        <td>-</td>
                        <td>{mover.achievement_percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* In-Progress Task Status Table */}
              <div className="table-section">
                <h3>Task Status In Progress</h3>
                <table className="production-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total In-Progress Products</td>
                      <td>{inProgressCount}</td>
                    </tr>
                    <tr>
                      <td>Total Requested Quantity</td>
                      <td>{inProgressTotalQuantity}</td>
                    </tr>
                    <tr>
                      <td>Total Completed Quantity (Current Progress)</td>
                      <td>{inProgressCompletedQuantity}</td>
                    </tr>
                    <tr>
                      <td>Total Defects (In Progress)</td>
                      <td>{inProgressDefects}</td>
                    </tr>
                    <tr>
                      <td>Average Progress</td>
                      <td>{inProgressAverageProgress.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>

              </div>

              {/* Cancelled Orders Summary */}
              <div className="table-section">
                <h3>Cancelled Orders</h3>
                <table className="production-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Cancelled Orders</td>
                      <td>{cancelledCount}</td>
                    </tr>
                    <tr>
                      <td>Total Cancelled Quantity</td>
                      <td>{cancelledTotalQuantity}</td>
                    </tr>
                    <tr>
                      <td>Cancelled With Issuance No.</td>
                      <td>{cancelledWithIssuance}</td>
                    </tr>
                    <tr>
                      <td>Cancelled Order (No Issuance)</td>
                      <td>{cancelledDraftOrders}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="signature-section">
                <div className="signature-block">
                  <label>Prepared by:</label>
                  <div className="signature-line"></div>
                  <p className="signature-label">Name & Signature over Printed Name</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PrintableReport;
