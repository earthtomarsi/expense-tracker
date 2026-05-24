import { useCallback, useEffect, useMemo, useState } from "react";
import AddExpensePanel from "./AddExpensePanel.jsx";
import ExpenseHistoryPanel from "./ExpenseHistoryPanel.jsx";
import MonthlyTrendPanel from "./MonthlyTrendPanel.jsx";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense
} from "../services/api.js";

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

  const totalSpending = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const handleSubmitExpense = async (payload) => {
    try {
      const createdExpense = await createExpense(payload);
      const nextExpenses = await loadExpenses();
      const newExpenseId = createdExpense?.id || nextExpenses?.[0]?.id || null;

      setFilters(initialFilters);
      setHighlightedExpenseId(newExpenseId);
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
              />

              <div className="summary-section">
                <h3>Summary</h3>
                <div className="summary-grid">
                  <div className="summary-left">
                    <div className="total-card">
                      <p>Total Spending</p>
                      <h2>${totalSpending.toFixed(2)}</h2>
                    </div>

                    <div className="category-breakdown">
                      {Object.entries(categoryTotals).length === 0 ? (
                        <div className="category-item">
                          <span>No category data yet</span>
                          <span>$0.00</span>
                        </div>
                      ) : (
                        Object.entries(categoryTotals).map(([category, total]) => (
                          <div className="category-item" key={category}>
                            <span>{category}</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "trends" && <MonthlyTrendPanel expenses={expenses} />}
        </div>
      )}
    </section>
  );
}

export default UserDashboard;
