import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import SidebarLayout from "../../shared/components/SidebarLayout";
import "./Dashboard.css";

// Custom plugin to display labels on pie chart (only for pie charts)
const pieChartLabelsPlugin = {
  id: 'pieLabels',
  afterDatasetsDraw(chart) {
    // Only apply to pie charts
    if (chart.config.type !== 'pie') {
      return;
    }
    
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta.hidden) {
        meta.data.forEach((datapoint, index) => {
          const value = dataset.data[index];
          // Skip drawing labels for zero or very small values
          if (value <= 0) {
            return;
          }
          
          const { x, y } = datapoint.tooltipPosition();
          const total = dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${percentage}%`, x, y);
        });
      }
    });
  },
};

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, pieChartLabelsPlugin);

function Dashboard() {
  const navigate = useNavigate();
  const [barData, setBarData] = useState(null);
  const [pieData, setPieData] = useState(null);
  const [topMovers, setTopMovers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState({ day: "", dateText: "" });
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Set current date with day name and date text separated
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const dateOnly = today.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    setCurrentDate({ day: dayName, dateText: dateOnly });

    fetchReports();
  }, [selectedMonth, selectedYear]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = `?month=${selectedMonth}&year=${selectedYear}&include_archived=true`;

      // Fetch bar chart data
      const barRes = await fetch(`http://localhost:8000/app/reports/bar-chart/${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (barRes.ok) {
        const barData = await barRes.json();
        setBarData(barData);
      } else {
        console.error("[Dashboard] Bar chart fetch failed:", barRes.status);
      }

      // Fetch pie chart data
      const pieRes = await fetch(`http://localhost:8000/app/reports/pie-chart/${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (pieRes.ok) {
        const pieData = await pieRes.json();
        setPieData(pieData);
      } else {
        console.error("[Dashboard] Pie chart fetch failed:", pieRes.status);
      }

      // Fetch top movers data
      const moversRes = await fetch(`http://localhost:8000/app/reports/top-movers/${params}&limit=5`, {
        method: "GET",
        credentials: "include",
      });
      if (moversRes.ok) {
        const moversData = await moversRes.json();
        setTopMovers(moversData);
      } else {
        console.error("[Dashboard] Top movers fetch failed:", moversRes.status);
      }

      // Fetch debug data
      const debugRes = await fetch(`http://localhost:8000/app/reports/debug/${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (debugRes.ok) {
        // Debug data logged successfully
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    navigate("/printable-report");
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 15,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            if (context.length > 0) {
              return context[0].label; // Week number
            }
            return '';
          },
          afterTitle: function(context) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              if (barData && barData.products && barData.products[dataIndex]) {
                const products = barData.products[dataIndex];
                return 'Products: ' + products.join(', ');
              }
            }
            return '';
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 100,
          precision: 0,
          callback: function(value) {
            return Number.isInteger(value) ? value : '';
          }
        },
      },
    },
  };

  return (
    <SidebarLayout>
      <div className="dashboard-wrapper">
        {/* Header with Date and Download */}
        <div className="dashboard-top-bar">
          <div className="dashboard-date">
            <p>
              <span className="day-name">{currentDate.day}</span>
              <span className="date-text">, {currentDate.dateText}</span>
            </p>
          </div>
          <button className="btn btn-success" onClick={handleDownloadReport}>
            <i className="bi bi-printer" style={{ marginRight: "8px" }}></i>
            Print Report
          </button>
        </div>

        {/* Filter Controls */}
        <div className="dashboard-filter-bar">
          <div className="filter-controls">
            {/* Month Dropdown */}
            <div className="filter-group">
              <label htmlFor="month-select" className="filter-label">Month</label>
              <select
                id="month-select"
                className="filter-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Year Dropdown */}
            <div className="filter-group">
              <label htmlFor="year-select" className="filter-label">Year</label>
              <select
                id="year-select"
                className="filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>


          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
            Loading reports...
          </div>
        ) : (
          <div className="dashboard-reports-container">
            {/* Left Column - Large Chart */}
            <div className="dashboard-left-column">
              {/* Production & Defect Overview */}
              <div className="report-card report-card-large">
                <h3>Production & Defect Overview by Week</h3>
                {barData && barData.labels && barData.labels.length > 0 ? (
                  <div style={{ height: "300px" }}>
                    <Bar
                      data={{
                        labels: barData.labels,
                        datasets: [
                          {
                            label: "Production",
                            data: barData.data.production,
                            backgroundColor: "#003f7f",
                            borderColor: "#003f7f",
                            borderWidth: 0,
                            barThickness: 30,
                          },
                          {
                            label: "Defect",
                            data: barData.data.defects,
                            backgroundColor: "#6fa8dc",
                            borderColor: "#6fa8dc",
                            borderWidth: 0,
                            barThickness: 30,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "30px" }}>No data available</p>
                )}
              </div>

              {/* Top Movers */}
              <div className="report-card report-card-large">
                <h3>Top Movers This Month</h3>
                {topMovers && topMovers.products && topMovers.products.length > 0 ? (
                  <div className="top-movers-wrapper">
                    {(() => {
                      const total = topMovers.products.reduce((sum, p) => sum + p.total_quota, 0);
                      const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"];
                      
                      return (
                        <>
                          <div className="top-movers-chart">
                            <Pie
                              data={{
                                labels: topMovers.products.map((p) => p.name),
                                datasets: [
                                  {
                                    data: topMovers.products.map((p) => p.total_quota),
                                    backgroundColor: topMovers.products.map((_, i) => colors[i % colors.length]),
                                    borderColor: "#fff",
                                    borderWidth: 2,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    display: false,
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label(context) {
                                        const value = context.parsed || 0;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${value} (${percentage}%)`;
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          </div>
                          
                          {/* Top 5 Products Legend */}
                          <div style={{ marginTop: "18px" }}>
                            {topMovers.products.slice(0, 5).map((product, index) => (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px' }}>
                                <span style={{ backgroundColor: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"][index], width: 12, height: 12, display: 'inline-block', borderRadius: 2 }}></span>
                                <span style={{ fontWeight: 500, fontSize: 13, color: '#555', flex: 1 }}>{index + 1}. {product.name}</span>
                                <span style={{ fontWeight: 600, fontSize: 12, color: '#1d6ab7' }}>{product.total_quota}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "30px" }}>No data available</p>
                )}
              </div>
            </div>

            {/* Right Column - Pie Chart and Legend */}
            <div className="dashboard-right-column">
              {/* Production Percentages */}
              <div className="report-card report-card-medium">
                <h3 style={{ marginBottom: "20px" }}>Production Percentages Report</h3>
              {pieData && pieData.labels && pieData.data && pieData.data.length > 0 ? (
                <>
                  {(() => {
                    const normalizedPieLabels = pieData.labels;

                    return (
                      <>
                  <div className="pie-chart-wrapper">
                    <Pie
                      data={{
                        labels: normalizedPieLabels,
                        datasets: [
                          {
                            data: pieData.percentages,
                            backgroundColor: ["#4A90E2", "#2FCC71", "#E74C3C"],
                            borderColor: ["#fff", "#fff", "#fff"],
                            borderWidth: 3,
                            hoverOffset: 8,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: {
                              boxWidth: 14,
                              padding: 15,
                              font: { size: 13, weight: "600" },
                              color: "#333",
                            },
                          },
                          tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            padding: 12,
                            titleFont: { size: 14, weight: "bold" },
                            bodyFont: { size: 13 },
                            borderColor: "#ddd",
                            borderWidth: 1,
                            callbacks: {
                              label(context) {
                                const label = context.label || "";
                                const dataIndex = context.dataIndex;
                                const rawValue = pieData.data[dataIndex] || 0;
                                const percentage = pieData.percentages[dataIndex] || 0;
                                return `${label}: ${rawValue} units (${percentage}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>

                  {/* Production Stats Summary */}
                  <div className="pie-stats-summary">
                    <div className="stat-item" style={{ borderLeft: "4px solid #4A90E2" }}>
                      <div className="stat-label">In Progress</div>
                      <div className="stat-value">{pieData.data[0] || 0}</div>
                      <div className="stat-percent">{pieData.percentages[0] || 0}%</div>
                    </div>
                    <div className="stat-item" style={{ borderLeft: "4px solid #2FCC71" }}>
                      <div className="stat-label">Completed</div>
                      <div className="stat-value">{pieData.data[1] || 0}</div>
                      <div className="stat-percent">{pieData.percentages[1] || 0}%</div>
                    </div>
                    <div className="stat-item" style={{ borderLeft: "4px solid #E74C3C" }}>
                      <div className="stat-label">Cancelled</div>
                      <div className="stat-value">{pieData.data[2] || 0}</div>
                      <div className="stat-percent">{pieData.percentages[2] || 0}%</div>
                    </div>
                  </div>

                  <div className="pie-total-info">
                    <span>Total Units: </span>
                    <strong>{pieData.total}</strong>
                  </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <p style={{ color: "#999", textAlign: "center", padding: "30px" }}>
                  No data available
                </p>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

export default Dashboard;
