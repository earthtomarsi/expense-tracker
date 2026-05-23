import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";

function getMonthKey(date) {
  return String(date || "").slice(0, 7);
}

function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;

  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function MonthlyTrendPanel({ expenses }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const monthlyData = useMemo(() => {
    const totals = expenses.reduce((result, expense) => {
      const month = getMonthKey(expense.date);
      if (!month) return result;

      result[month] = (result[month] || 0) + Number(expense.amount || 0);
      return result;
    }, {});

    return Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month,
        label: formatMonthLabel(month),
        total
      }));
  }, [expenses]);

  const totalSpending = monthlyData.reduce((sum, item) => sum + item.total, 0);
  const highestMonth = monthlyData.reduce(
    (highest, item) => (item.total > highest.total ? item : highest),
    { label: "No data", total: 0 }
  );

  useEffect(() => {
    if (!chartRef.current || monthlyData.length === 0) return undefined;

    const context = chartRef.current.getContext("2d");

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const gradient = context.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, "rgba(77, 222, 131, 0.24)");
    gradient.addColorStop(1, "rgba(72, 221, 182, 0.02)");

    chartInstanceRef.current = new Chart(context, {
      type: "line",
      data: {
        labels: monthlyData.map((item) => item.label),
        datasets: [
          {
            label: "Monthly spending",
            data: monthlyData.map((item) => item.total),
            borderColor: "#2ecc71",
            backgroundColor: gradient,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#2ecc71",
            pointBorderWidth: 3,
            tension: 0.36,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "#111827",
            padding: 12,
            titleFont: {
              family: "Inter",
              size: 13,
              weight: "700"
            },
            bodyFont: {
              family: "Inter",
              size: 13
            },
            callbacks: {
              label: (context) => `Spending: ${formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: "#7B857F",
              font: {
                family: "Inter"
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(17, 24, 39, 0.08)"
            },
            ticks: {
              color: "#7B857F",
              font: {
                family: "Inter"
              },
              callback: (value) => `$${value}`
            }
          }
        }
      }
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [monthlyData]);

  return (
    <section id="monthly-trends" className="trend-section user-dashboard-panel" role="tabpanel">
      <div className="trend-inner">
        <div className="chart-container monthly-trend-card">
          <div className="trend-header">
            <div>
              <h3>Monthly Spending Trend</h3>
              <p>Track how your spending changes month by month.</p>
            </div>
            <span className="chart-badge trend-badge">Monthly</span>
          </div>

          <div className="monthly-trend-summary">
            <div className="monthly-trend-stat">
              <span>Total tracked</span>
              <strong>{formatCurrency(totalSpending)}</strong>
            </div>
            <div className="monthly-trend-stat">
              <span>Highest month</span>
              <strong>{highestMonth.total ? highestMonth.label : "No data"}</strong>
            </div>
          </div>

          <div className="monthly-chart-shell">
            {monthlyData.length === 0 ? (
              <div className="monthly-empty-state">
                <p>No monthly data yet.</p>
                <span>Add expenses with dates to generate your spending trend.</span>
              </div>
            ) : (
              <canvas ref={chartRef} aria-label="Monthly spending trend chart" role="img"></canvas>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MonthlyTrendPanel;
