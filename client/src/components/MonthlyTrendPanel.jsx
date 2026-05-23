function getMonthKey(date) {
  return String(date || "").slice(0, 7);
}

function MonthlyTrendPanel({ expenses }) {
  const monthlyTotals = expenses.reduce((totals, expense) => {
    const month = getMonthKey(expense.date);
    if (!month) return totals;
    totals[month] = (totals[month] || 0) + Number(expense.amount || 0);
    return totals;
  }, {});

  const entries = Object.entries(monthlyTotals).sort(([a], [b]) => a.localeCompare(b));
  const highest = Math.max(...entries.map(([, total]) => total), 1);

  return (
    <section id="monthly-trends" className="trend-section user-dashboard-panel" role="tabpanel">
      <div className="trend-inner">
        <div className="chart-container">
          <div className="trend-header">
            <div>
              <h3>Monthly Spending Trend</h3>
              <p>Track how your monthly spending changes month by month.</p>
            </div>
            <span className="chart-badge trend-badge">Monthly</span>
          </div>

          <div className="category-breakdown">
            {entries.length === 0 ? (
              <p>No monthly data yet.</p>
            ) : (
              entries.map(([month, total]) => (
                <div className="category-item" key={month}>
                  <span>{month}</span>
                  <span>${total.toFixed(2)}</span>
                  <div
                    aria-hidden="true"
                    style={{
                      width: `${Math.max((total / highest) * 100, 6)}%`,
                      height: "8px",
                      borderRadius: "999px",
                      background: "linear-gradient(90deg, #58E66F, #48DDB6)"
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MonthlyTrendPanel;
