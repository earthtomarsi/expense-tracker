import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import AddExpensePanel from "./AddExpensePanel.jsx";
import ExpenseHistoryPanel from "./ExpenseHistoryPanel.jsx";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense
} from "../services/api.js";

const MonthlyTrendPanel = lazy(() => import("./MonthlyTrendPanel.jsx"));

const initialFilters = {
  search: "",
  category: "All",
  month: "",
  sort: "date-desc"
};

function sortExpenses(expenses, sort) {
  return [...expenses].sort((a, b) => {
    if (sort === "date-desc") return new Date(b.date) - new Date(a.date);
    if (sort === "date-asc") return new Date(a.date) - new Date(b.date);
    if (sort === "amount-asc") return Number(a.amount) - Number(b.amount);
    if (sort === "amount-desc") return Number(b.amount) - Number(a.amount);
    if (sort === "name-asc") return a.expenseName.localeCompare(b.expenseName);
    if (sort === "name-desc") return b.expenseName.localeCompare(a.expenseName);
    return 0;
  });
}


const categoryPalette = {
  Bills: "#fbbf24",
  Transport: "#38bdf8",
  Shopping: "#fb7185",
  Food: "#4ade80",
  Leisure: "#a78bfa"
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
}

function getCategoryColor(category, index) {
  const fallback = ["#fbbf24", "#38bdf8", "#fb7185", "#4ade80", "#a78bfa"];
  return categoryPalette[category] || fallback[index % fallback.length];
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
  ].join(" ");
}

function DonutChart({ entries, total }) {
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, side: "right" });
  const radius = 78;
  const strokeWidth = 24;
  const gapAngle = entries.length > 1 ? 20 : 0;

  if (!entries.length || !total) {
    return (
      <div className="donut-chart" aria-label="No category data">
        <svg viewBox="0 0 220 220" role="img" aria-hidden="true">
          <circle className="donut-empty-track" cx="110" cy="110" r={radius} fill="none" strokeWidth={strokeWidth} />
        </svg>
        <div className="donut-chart-hole">
          <strong>$0</strong>
          <span>Total</span>
        </div>
      </div>
    );
  }

  const availableAngle = 360 - gapAngle * entries.length;
  let cursor = 0;
  const segments = entries.map((entry) => {
    const percentage = entry.total / total;
    const angle = Math.max(0.01, percentage * availableAngle);
    const startAngle = cursor + gapAngle / 2;
    const endAngle = startAngle + angle;
    cursor = endAngle + gapAngle / 2;

    return {
      ...entry,
      startAngle,
      endAngle,
      path: describeArc(110, 110, radius, startAngle, endAngle)
    };
  });

  return (
    <div className="donut-chart" aria-label="Category breakdown chart">
      <svg viewBox="0 0 220 220" role="img" aria-label="Category spending breakdown">
        <circle className="donut-track" cx="110" cy="110" r={radius} fill="none" strokeWidth={strokeWidth} />
        {segments.map((entry) => (
          hoveredEntry?.category === entry.category ? (
            <path
              key={`${entry.category}-outline`}
              className="donut-segment-outline"
              d={entry.path}
              fill="none"
              strokeWidth={strokeWidth + 8}
              strokeLinecap="round"
            />
          ) : null
        ))}
        {segments.map((entry) => (
          <path
            key={entry.category}
            className="donut-segment"
            d={entry.path}
            fill="none"
            stroke={entry.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            onMouseEnter={() => setHoveredEntry(entry)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.closest(".donut-chart").getBoundingClientRect();
              const relativeX = event.clientX - rect.left;
              const side = relativeX < rect.width / 2 ? "left" : "right";
              setTooltipPosition({
                x: side === "left" ? relativeX - 148 : relativeX + 14,
                y: event.clientY - rect.top - 8,
                side
              });
            }}
            onMouseLeave={() => setHoveredEntry(null)}
          />
        ))}
      </svg>

      <div className="donut-chart-hole">
        <strong>{formatCompactCurrency(total)}</strong>
        <span>Total</span>
      </div>

      {hoveredEntry && (
        <div
          className={`donut-tooltip ${tooltipPosition.side}`}
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
          role="tooltip"
        >
          <strong>{hoveredEntry.category}</strong>
          <span><i style={{ backgroundColor: hoveredEntry.color }} />{formatCurrency(hoveredEntry.total)} · {hoveredEntry.percentage}%</span>
        </div>
      )}
    </div>
  );
}

function UserDashboard({ greeting, showToast }) {
  const [activeTab, setActiveTab] = useState("add");
  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [highlightedExpenseId, setHighlightedExpenseId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    const nextExpenses = await getExpenses();
    setExpenses(nextExpenses);
    return nextExpenses;
  }, []);

  useEffect(() => {
    loadExpenses()
      .catch((error) => showToast(error.message, "error"))
      .finally(() => setIsLoading(false));
  }, [loadExpenses, showToast]);

  useEffect(() => {
    if (activeTab !== "history") return undefined;

    const scrollTimer = window.setTimeout(() => {
      document.getElementById("expense-history")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 180);

    let highlightTimer;

    if (highlightedExpenseId) {
      highlightTimer = window.setTimeout(() => {
        setHighlightedExpenseId(null);
      }, 2600);
    }

    return () => {
      window.clearTimeout(scrollTimer);
      if (highlightTimer) window.clearTimeout(highlightTimer);
    };
  }, [activeTab, highlightedExpenseId]);


  useEffect(() => {
    if (activeTab !== "trends") return undefined;

    const scrollTimer = window.setTimeout(() => {
      document.getElementById("monthly-trends")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 180);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [activeTab]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return sortExpenses(
      expenses.filter((expense) => {
        if (filters.category !== "All" && expense.category !== filters.category) return false;
        if (filters.month && !String(expense.date || "").startsWith(filters.month)) return false;

        if (
          normalizedSearch &&
          !String(expense.expenseName || "").toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }

        return true;
      }),
      filters.sort
    );
  }, [expenses, filters]);

  const categoryTotals = useMemo(() => {
    return expenses.reduce((totals, expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount || 0);
      return totals;
    }, {});
  }, [expenses]);

  const totalSpending = useMemo(
    () => expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0),
    [expenses]
  );

  const categoryEntries = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([category, total], index) => ({
        category,
        total,
        color: getCategoryColor(category, index),
        percentage: totalSpending ? Math.round((total / totalSpending) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [categoryTotals, totalSpending]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const handleSubmitExpense = async (payload) => {
    try {
      const previousIds = new Set(expenses.map((expense) => String(expense.id)));
      const createdExpense = await createExpense(payload);
      const nextExpenses = await loadExpenses();
      const createdId = createdExpense?.id || createdExpense?.expense?.id || createdExpense?.expenseId || createdExpense?.insertId || null;
      const addedExpense = nextExpenses.find((expense) => String(expense.id) === String(createdId))
        || nextExpenses.find((expense) => !previousIds.has(String(expense.id))
          && String(expense.expenseName || "").trim() === payload.expenseName
          && String(expense.category || "") === payload.category
          && String(expense.date || "").slice(0, 10) === payload.date
          && Number(expense.amount) === Number(payload.amount))
        || nextExpenses[0];

      setFilters(initialFilters);
      setHighlightedExpenseId(addedExpense?.id || createdId || null);
      setActiveTab("history");
      showToast("Expense added successfully.");
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  };

  const handleUpdateExpense = async (id, payload) => {
    try {
      await updateExpense(id, payload);
      await loadExpenses();
      showToast("Expense updated successfully.");
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);
      await loadExpenses();
      showToast("Expense deleted successfully.");
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  };

  return (
    <section className="add expense-hero">
      <div className="hero-copy">
        <h2>Hi {greeting}, ready to track today’s spending?</h2>
        <p className="hero-subtext">
          Add expenses quickly, see where your money goes, and track spending patterns over time.
        </p>
      </div>

      <div className="hero-cards user-dashboard-tabs" role="tablist" aria-label="Expense dashboard views">
        {[
          ["add", "＋", "Add Expense", "Log new expenses without breaking your flow."],
          ["history", "◌", "Expense History", "Review and filter your logged expenses."],
          ["trends", "↗", "Monthly Trend", "Track how your spending changes."]
        ].map(([tab, icon, title, text]) => (
          <button
            key={tab}
            className={activeTab === tab ? "hero-card user-dashboard-tab active" : "hero-card user-dashboard-tab"}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            <span className="hero-card-icon" aria-hidden="true">{icon}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="status-message">Loading expenses...</div>
      ) : (
        <div className="user-dashboard-workspace" data-active-tab={activeTab}>
          {activeTab === "add" && (
            <AddExpensePanel
              key="new-expense"
              editingExpense={null}
              onCancelEdit={() => {}}
              onSubmit={handleSubmitExpense}
              showToast={showToast}
            />
          )}

          {activeTab === "history" && (
            <>
              <ExpenseHistoryPanel
                expenses={filteredExpenses}
                filters={filters}
                onFilterChange={updateFilter}
                onClearFilters={clearFilters}
                highlightedExpenseId={highlightedExpenseId}
                onUpdate={handleUpdateExpense}
                onDelete={handleDeleteExpense}
                showToast={showToast}
              />

              <div className="summary-section expense-summary-section">
                <h3>Summary</h3>
                <div className="summary-grid expense-summary-grid">
                  <div className="summary-left">
                    <div className="total-card">
                      <p>Total Spending</p>
                      <h2>{formatCurrency(totalSpending)}</h2>
                    </div>

                    <div className="category-breakdown">
                      {categoryEntries.length === 0 ? (
                        <div className="category-item">
                          <span>No category data yet</span>
                          <span>$0.00</span>
                        </div>
                      ) : (
                        categoryEntries.map((entry) => (
                          <div className="category-item" key={entry.category}>
                            <span>{entry.category}</span>
                            <span>{formatCurrency(entry.total)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="category-chart-card">
                    <div className="category-chart-heading">
                      <div>
                        <h4>Category Breakdown</h4>
                        <p>{formatCurrency(totalSpending)} total across {categoryEntries.length} categories</p>
                      </div>
                      <span>Overview</span>
                    </div>

                    <div className="category-chart-layout">
                      <DonutChart entries={categoryEntries} total={totalSpending} />

                      <div className="category-chart-list">
                        <p>CATEGORIES</p>
                        {categoryEntries.length === 0 ? (
                          <div className="category-chart-row empty">No category data yet</div>
                        ) : (
                          categoryEntries.map((entry) => (
                            <div className="category-chart-row" key={entry.category}>
                              <span className="category-dot" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                              <div>
                                <strong>{entry.category}</strong>
                                <small>{formatCurrency(entry.total)}</small>
                              </div>
                              <b>{entry.percentage}%</b>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "trends" && (
            <Suspense fallback={<div className="status-message">Loading monthly trend...</div>}>
              <MonthlyTrendPanel expenses={expenses} />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
}

export default UserDashboard;
