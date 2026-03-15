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
  const [reportData, setReportData] = useState(null);
  const [topMovers, setTopMovers] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, [month, year]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = `?month=${month}&year=${year}&include_archived=false`;
      
      const barResponse = await fetch(`http://localhost:8000/app/reports/bar-chart${params}`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!barResponse.ok) {
        console.warn("Bar chart endpoint not available, using template mode");
        setReportData(null);
        setTopMovers([]);
        setLoading(false);
        return;
      }
      
      const barData = await barResponse.json();
      const totalCompleted = barData.datasets?.find(d => d.label === "Completed")?.data?.reduce((a, b) => a + b, 0) || 0;
      const totalDefects = barData.datasets?.find(d => d.label === "Defects")?.data?.reduce((a, b) => a + b, 0) || 0;
      
      setReportData({
        total_completed: totalCompleted,
        total_defects: totalDefects,
        total_output: totalCompleted - totalDefects
      });
      
      try {
        const moversResponse = await fetch(`http://localhost:8000/app/reports/top-movers${params}&limit=5`, {
          method: "GET",
          credentials: "include",
        });
        
        if (moversResponse.ok) {
          const moversData = await moversResponse.json();
          setTopMovers(Array.isArray(moversData) ? moversData.slice(0, 5) : []);
        }
      } catch (err) {
        console.warn("Could not fetch top movers:", err);
      }
    } catch (err) {
      console.warn("Error fetching report data, showing template mode:", err);
      setReportData(null);
      setTopMovers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  
  const companyDetails = {
    name: "TechTrack Manufacturing",
    address: "1234 Industrial Way, San Francisco, CA 94105",
    phone: "+1 (555) 123-4567",
    email: "info@techtrack.com"
  };

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
              <p className="printable-company-info">{companyDetails.address}</p>
              <p className="printable-company-info">{companyDetails.phone} | {companyDetails.email}</p>
            </div>
            <div className="printable-header-right">
              <img src="/Group 1.png" alt="Company Logo" className="printable-logo" />
            </div>
          </div>

          {/* Title Section */}
          <div className="report-title-section">
            <h2>Monthly Production Report</h2>
            <p className="report-subtitle">{monthName} {year}</p>
          </div>

          {/* Summary Line */}
          <div className="summary-line">
            <div className="summary-item">
              <span className="label">Total Completed:</span>
              <span className="value">{reportData?.total_completed || ""}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Defects:</span>
              <span className="value">{reportData?.total_defects || ""}</span>
            </div>
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
                    <tr>
                      <td className="week-label">Week 1</td>
                      <td className="input-cell"></td>
                      <td className="input-cell"></td>
                    </tr>
                    <tr>
                      <td className="week-label">Week 2</td>
                      <td className="input-cell"></td>
                      <td className="input-cell"></td>
                    </tr>
                    <tr>
                      <td className="week-label">Week 3</td>
                      <td className="input-cell"></td>
                      <td className="input-cell"></td>
                    </tr>
                    <tr>
                      <td className="week-label">Week 4</td>
                      <td className="input-cell"></td>
                      <td className="input-cell"></td>
                    </tr>
                    <tr className="total-row">
                      <td className="week-label"><strong>Total</strong></td>
                      <td className="total-cell"></td>
                      <td className="total-cell"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Main Production Table */}
              <div className="table-section">
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
                    {[1, 2, 3, 4, 5].map((rank) => {
                      const mover = topMovers[rank - 1];
                      return (
                        <tr key={rank} className={rank === 1 ? "rank-1" : ""}>
                          <td className="rank-col">{rank}</td>
                          <td>{mover?.product_name || ""}</td>
                          <td>{mover?.completed_quota || ""}</td>
                          <td>{mover?.defect_count || ""}</td>
                          <td>{mover?.achievement_percentage ? `${mover.achievement_percentage.toFixed(1)}%` : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes Section */}
              <div className="notes-section">
                <label>Notes / Comments:</label>
                <div className="notes-box"></div>
              </div>

              {/* Footer - Signature Section */}
              <div className="signature-section">
                <div className="signature-block">
                  <label>Prepared by:</label>
                  <div className="signature-line"></div>
                  <p className="signature-label">Name & Date</p>
                </div>
                <div className="signature-block">
                  <label>Checked by:</label>
                  <div className="signature-line"></div>
                  <p className="signature-label">Name & Date</p>
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
