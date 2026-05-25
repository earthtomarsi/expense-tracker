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

function getYAxisStep(maxValue) {
  if (maxValue <= 1000) return 100;
  if (maxValue <= 2500) return 250;
  if (maxValue <= 6000) return 500;
  if (maxValue <= 12000) return 1000;
  if (maxValue <= 30000) return 2500;
  return 5000;
}

function getYAxisMax(maxValue, step) {
  const safeMax = Math.max(Number(maxValue || 0), step * 3);
  return Math.ceil((safeMax * 1.12) / step) * step;
}

const MONTHLY_TOTAL_GREEN = "#4ade80";
const AVERAGE_TOTAL_AMBER = "#f59e0b";
// Keeps the first and last x-axis labels inside the plot without shrinking the chart shell.
const X_AXIS_EDGE_OFFSET = 16;

const monthlyTrendStatValueStyle = {
  fontSize: "1.15rem",
  lineHeight: 1.2,
  letterSpacing: "-0.02em"
};

function createMonthlyLineGradient(chart) {
  const { ctx, chartArea } = chart || {};
  if (!ctx || !chartArea) return MONTHLY_TOTAL_GREEN;

  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, "#58e37d");
  gradient.addColorStop(0.52, "#4adfa2");
  gradient.addColorStop(1, "#42d7b0");

  return gradient;
}

function traceSmoothLine(context, points) {
  if (!points.length) return;

  context.moveTo(points[0].x, points[0].y);

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

// Draw the Monthly Total fill manually so the line stays crisp while the fill has softened side edges.
function drawSoftMonthlyArea(context, chart, points) {
  const { chartArea } = chart;

  if (!chartArea || !points.length || typeof document === "undefined") return;

  const pixelRatio =
    chart.currentDevicePixelRatio ||
    (typeof window !== "undefined" ? window.devicePixelRatio : 1) ||
    1;

  const buffer = document.createElement("canvas");
  buffer.width = Math.ceil(chart.width * pixelRatio);
  buffer.height = Math.ceil(chart.height * pixelRatio);

  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) return;

  bufferContext.scale(pixelRatio, pixelRatio);

  bufferContext.save();

  bufferContext.beginPath();
  bufferContext.rect(
    chartArea.left - 22,
    chartArea.top - 34,
    chartArea.width + 44,
    chartArea.height + 70
  );
  bufferContext.clip();

  if ("filter" in bufferContext) {
    bufferContext.filter = "blur(3.2px)";
  }

  const fillGradient = bufferContext.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom
  );

  fillGradient.addColorStop(0, "rgba(77, 222, 131, 0.15)");
  fillGradient.addColorStop(0.42, "rgba(72, 221, 182, 0.075)");
  fillGradient.addColorStop(1, "rgba(72, 221, 182, 0)");

  bufferContext.globalAlpha = 0.96;
  bufferContext.fillStyle = fillGradient;
  bufferContext.beginPath();

  if (points.length === 1) {
    const point = points[0];
    const singlePointWidth = 18;

    bufferContext.moveTo(point.x - singlePointWidth, point.y);
    bufferContext.lineTo(point.x + singlePointWidth, point.y);
    bufferContext.lineTo(point.x + singlePointWidth, chartArea.bottom);
    bufferContext.lineTo(point.x - singlePointWidth, chartArea.bottom);
    bufferContext.closePath();
  } else {
    traceSmoothLine(bufferContext, points);

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    bufferContext.lineTo(lastPoint.x, chartArea.bottom);
    bufferContext.lineTo(firstPoint.x, chartArea.bottom);
    bufferContext.closePath();
  }

  bufferContext.fill();
  bufferContext.restore();

  bufferContext.save();
  bufferContext.globalCompositeOperation = "destination-in";

  const edgeMask = bufferContext.createLinearGradient(
    chartArea.left,
    0,
    chartArea.right,
    0
  );

  edgeMask.addColorStop(0, "rgba(0, 0, 0, 0)");
  edgeMask.addColorStop(0.055, "rgba(0, 0, 0, 1)");
  edgeMask.addColorStop(0.945, "rgba(0, 0, 0, 1)");
  edgeMask.addColorStop(1, "rgba(0, 0, 0, 0)");

  bufferContext.fillStyle = edgeMask;
  bufferContext.fillRect(
    chartArea.left - 24,
    chartArea.top - 40,
    chartArea.width + 48,
    chartArea.height + 82
  );

  bufferContext.restore();

  context.save();
  context.drawImage(buffer, 0, 0, chart.width, chart.height);
  context.restore();
}

// Render the custom fill before Chart.js draws the line and points.
const monthlySoftAreaPlugin = {
  id: "monthlySoftArea",
  beforeDatasetsDraw(chart) {
    const datasetIndex = chart.data.datasets.findIndex(
      (dataset) => dataset.id === "monthly-total"
    );

    if (datasetIndex < 0) return;

    const meta = chart.getDatasetMeta(datasetIndex);

    if (!meta || meta.hidden || !meta.data?.length) return;

    const points = meta.data
      .map((point) => ({
        x: point.x,
        y: point.y
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    drawSoftMonthlyArea(chart.ctx, chart, points);
  }
};

// Nudge only the first and last ticks inward; all other points keep the regular scale spacing.
const xAxisEdgeOffsetPlugin = {
  id: "xAxisEdgeOffset",

  beforeDatasetsUpdate(chart) {
    const xScale = chart.scales.x;
    const labelCount = chart.data.labels?.length || 0;

    if (!xScale || labelCount <= 1) return;

    if (!xScale.$originalGetPixelForValue) {
      xScale.$originalGetPixelForValue = xScale.getPixelForValue.bind(xScale);
    }

    if (!xScale.$originalGetPixelForTick && xScale.getPixelForTick) {
      xScale.$originalGetPixelForTick = xScale.getPixelForTick.bind(xScale);
    }

    const applyEdgeOffset = (pixel, index) => {
      if (index === 0) return pixel + X_AXIS_EDGE_OFFSET;
      if (index === labelCount - 1) return pixel - X_AXIS_EDGE_OFFSET;
      return pixel;
    };

    xScale.getPixelForValue = function patchedGetPixelForValue(value, index) {
      const pixel = xScale.$originalGetPixelForValue(value, index);
      const pointIndex = typeof index === "number" ? index : Number(value);

      return applyEdgeOffset(pixel, pointIndex);
    };

    if (xScale.$originalGetPixelForTick) {
      xScale.getPixelForTick = function patchedGetPixelForTick(index) {
        const pixel = xScale.$originalGetPixelForTick(index);

        return applyEdgeOffset(pixel, index);
      };
    }
  }
};

function MonthlyTrendPanel({ expenses = [] }) {
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

  // Flat reference line: average of the monthly totals currently shown in the chart.
  const averageTotalSpending = monthlyData.length
    ? totalSpending / monthlyData.length
    : 0;

  const highestMonth = monthlyData.reduce(
    (highest, item) => (item.total > highest.total ? item : highest),
    { label: "No data", total: 0 }
  );

  const highestChartValue = Math.max(
    averageTotalSpending,
    ...monthlyData.map((item) => Number(item.total || 0))
  );

  const yAxisStep = getYAxisStep(highestChartValue);
  const yAxisMax = getYAxisMax(highestChartValue, yAxisStep);

  useEffect(() => {
    if (!chartRef.current || monthlyData.length === 0) return undefined;

    const context = chartRef.current.getContext("2d");

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(context, {
      type: "line",
      plugins: [monthlySoftAreaPlugin, xAxisEdgeOffsetPlugin],
      data: {
        labels: monthlyData.map((item) => item.label),
        datasets: [
          {
            id: "monthly-total",
            label: "Monthly Total",
            data: monthlyData.map((item) => item.total),
            borderColor: (context) => createMonthlyLineGradient(context.chart),
            backgroundColor: "transparent",
            borderWidth: 2.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#ffffff",
            pointHoverBackgroundColor: "#ffffff",
            pointBorderColor: MONTHLY_TOTAL_GREEN,
            pointHoverBorderColor: MONTHLY_TOTAL_GREEN,
            pointBorderWidth: 2.1,
            pointHoverBorderWidth: 2.4,
            pointHitRadius: 8,
            tension: 0.36,
            clip: false,
            fill: false
          },
          {
            id: "monthly-average",
            label: "Average Total Spending",
            data: monthlyData.map(() => averageTotalSpending),
            borderColor: AVERAGE_TOTAL_AMBER,
            backgroundColor: "transparent",
            borderWidth: 2.4,
            borderDash: [6, 7],
            pointRadius: 0,
            pointHoverRadius: 0,
            pointBackgroundColor: "transparent",
            pointHoverBackgroundColor: "transparent",
            pointBorderColor: "transparent",
            pointHoverBorderColor: "transparent",
            pointBorderWidth: 0,
            pointHoverBorderWidth: 0,
            pointHitRadius: 12,
            tension: 0,
            clip: false,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
            right: 28,
            top: 2,
            bottom: 0
          }
        },
        interaction: {
          intersect: false,
          mode: "nearest"
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "#111827",
            displayColors: false,
            mode: "nearest",
            intersect: false,
            padding: 12,
            cornerRadius: 10,
            caretSize: 6,
            caretPadding: 8,
            titleMarginBottom: 8,
            titleFont: {
              family: "Inter",
              size: 11,
              weight: "700"
            },
            bodyFont: {
              family: "Inter",
              size: 11,
              weight: "500"
            },
            callbacks: {
              title: (items) => {
                const item = items?.[0];

                if (!item) return "";

                if (item.dataset.id === "monthly-average") {
                  return "Average Total Spending";
                }

                return item.label;
              },
              label: (context) => {
                if (context.dataset.id === "monthly-average") {
                  return formatCurrency(context.raw);
                }

                return `Monthly Total: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            offset: false,
            bounds: "ticks",
            grid: {
              display: false,
              drawBorder: false
            },
            border: {
              display: false
            },
            ticks: {
              color: "#647067",
              padding: 9,
              font: {
                family: "Inter",
                size: 11,
                weight: "400",
                lineHeight: 1.35
              }
            }
          },
          y: {
            beginAtZero: true,
            max: yAxisMax,
            afterFit: (scale) => {
              scale.width += 30;
            },
            grid: {
              color: "rgba(17, 24, 39, 0.08)",
              drawTicks: false,
              drawBorder: false
            },
            border: {
              display: false
            },
            ticks: {
              color: "#647067",
              padding: 18,
              stepSize: yAxisStep,
              autoSkip: false,
              font: {
                family: "Inter",
                size: 11,
                weight: "400",
                lineHeight: 1.35
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
  }, [monthlyData, averageTotalSpending, yAxisMax, yAxisStep]);

  return (
    <section id="monthly-trends" className="trend-section user-dashboard-panel" role="tabpanel">
      <div className="trend-inner">
        <div className="chart-container monthly-trend-card">
          <div className="trend-header">
            <div>
              <h3>Monthly Spending Trend</h3>
              <p>Track how your monthly spending changes against your average.</p>
            </div>
            <span className="chart-badge trend-badge">Monthly</span>
          </div>

          <div className="monthly-trend-summary">
            <div className="monthly-trend-stat">
              <span>Total Spending</span>
              <strong style={monthlyTrendStatValueStyle}>
                {formatCurrency(totalSpending)}
              </strong>
            </div>

            <div className="monthly-trend-stat">
              <span>Highest Month</span>
              <strong style={monthlyTrendStatValueStyle}>
                {highestMonth.total ? highestMonth.label : "No data"}
              </strong>
            </div>
          </div>

          <div className="monthly-chart-legend" aria-hidden="true">
            <span>
              <i className="monthly-legend-dot monthly-legend-dot-total"></i>
              Monthly Total
            </span>

            <span>
              <span
                className="monthly-legend-average-dashes"
                style={{
                  width: 22,
                  height: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto"
                }}
              >
                <svg width="22" height="4" viewBox="0 0 22 4" aria-hidden="true">
                  <line
                    x1="1"
                    y1="2"
                    x2="5"
                    y2="2"
                    stroke={AVERAGE_TOTAL_AMBER}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="9"
                    y1="2"
                    x2="13"
                    y2="2"
                    stroke={AVERAGE_TOTAL_AMBER}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="17"
                    y1="2"
                    x2="21"
                    y2="2"
                    stroke={AVERAGE_TOTAL_AMBER}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Average Total Spending
            </span>
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