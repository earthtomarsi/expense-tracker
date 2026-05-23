const categories = ["All", "Food", "Transport", "Bills", "Leisure", "Shopping"];

function ExpenseHistoryPanel({
  expenses,
  filters,
  onFilterChange,
  onEdit,
  onDelete
}) {
  return (
    <div id="expense-history" className="table-section user-dashboard-panel" role="tabpanel">
      <div className="table-header">
        <div className="table-title-group">
          <div>
            <h3>Expense History</h3>
            <p>Search, filter, sort, and manage your logged expenses.</p>
          </div>
        </div>

        <div className="table-toolbar" aria-label="Expense history controls">
          <div className="table-search">
            <label className="sr-only" htmlFor="expense-search">
              Search expense titles
            </label>
            <input
              id="expense-search"
              type="text"
              placeholder="Search by title"
              value={filters.search}
              onChange={(event) => onFilterChange("search", event.target.value)}
            />
          </div>

          <div className="select-wrapper">
            <select
              value={filters.category}
              onChange={(event) => onFilterChange("category", event.target.value)}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>

          <input
            type="month"
            value={filters.month}
            onChange={(event) => onFilterChange("month", event.target.value)}
          />

          <div className="select-wrapper">
            <select value={filters.sort} onChange={(event) => onFilterChange("sort", event.target.value)}>
              <option value="date-desc">Date: Most Recent</option>
              <option value="date-asc">Date: Oldest</option>
              <option value="amount-asc">Amount: Low to High</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>

          <button className="toolbar-clear" type="button" onClick={() => onFilterChange("month", "")}>
            Clear
          </button>
        </div>
      </div>

      <div className="expense-table-panel">
        <table id="expense-table">
          <thead>
            <tr>
              <th><span className="th-text">Title</span></th>
              <th><span className="th-text">Amount</span></th>
              <th><span className="th-text">Category</span></th>
              <th><span className="th-text">Date</span></th>
              <th><span className="th-text">Description</span></th>
              <th className="actions-header" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="6" id="empty-state">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.expenseName}</td>
                  <td>${Number(expense.amount).toFixed(2)}</td>
                  <td>{expense.category}</td>
                  <td>{expense.date}</td>
                  <td>{expense.description || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="table-action-btn" type="button" onClick={() => onEdit(expense)}>
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        type="button"
                        onClick={() => onDelete(expense.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExpenseHistoryPanel;
