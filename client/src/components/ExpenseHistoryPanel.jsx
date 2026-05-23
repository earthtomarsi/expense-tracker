import { useEffect, useState } from "react";

const categories = ["All", "Food", "Transport", "Bills", "Leisure", "Shopping"];
const editableCategories = ["Food", "Transport", "Bills", "Leisure", "Shopping"];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function createDraft(expense) {
  return {
    expenseName: expense.expenseName || "",
    amount: String(expense.amount ?? ""),
    category: expense.category || "Food",
    date: expense.date || "",
    description: expense.description || ""
  };
}

function ExpenseHistoryPanel({
  expenses,
  filters,
  onFilterChange,
  onClearFilters,
  highlightedExpenseId,
  onUpdate,
  onDelete
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!editingId) return;

    const stillExists = expenses.some((expense) => String(expense.id) === String(editingId));

    if (!stillExists) {
      setEditingId(null);
      setDraft(null);
    }
  }, [expenses, editingId]);

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setDraft(createDraft(expense));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveEdit = async (expense) => {
    if (!draft) return;

    const success = await onUpdate(expense.id, {
      ...draft,
      amount: Number(draft.amount)
    });

    if (success) {
      setEditingId(null);
      setDraft(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const success = await onDelete(pendingDelete.id);

    if (success) {
      setPendingDelete(null);
    }
  };

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

          <button className="toolbar-clear" type="button" onClick={onClearFilters}>
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
              expenses.map((expense) => {
                const isEditing = String(editingId) === String(expense.id);
                const isHighlighted =
                  highlightedExpenseId && String(highlightedExpenseId) === String(expense.id);
                const rowClassName = [
                  isEditing ? "selected-edit-row" : "",
                  isHighlighted ? "recently-added-row" : ""
                ].filter(Boolean).join(" ");

                return (
                  <tr key={expense.id} className={rowClassName}>
                    <td className="title-cell">
                      {isEditing ? (
                        <input
                          className="table-edit-input"
                          value={draft.expenseName}
                          onChange={(event) => updateDraft("expenseName", event.target.value)}
                        />
                      ) : (
                        expense.expenseName
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="table-edit-input amount-edit-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={draft.amount}
                          onChange={(event) => updateDraft("amount", event.target.value)}
                        />
                      ) : (
                        formatCurrency(expense.amount)
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <select
                          className="table-edit-input"
                          value={draft.category}
                          onChange={(event) => updateDraft("category", event.target.value)}
                        >
                          {editableCategories.map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      ) : (
                        expense.category
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="table-edit-input date-edit-input"
                          type="date"
                          value={draft.date}
                          onChange={(event) => updateDraft("date", event.target.value)}
                        />
                      ) : (
                        expense.date
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="table-edit-input"
                          maxLength="70"
                          value={draft.description}
                          onChange={(event) => updateDraft("description", event.target.value)}
                        />
                      ) : (
                        expense.description || "-"
                      )}
                    </td>

                    <td>
                      <div className="row-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="table-action-btn"
                              type="button"
                              onClick={() => saveEdit(expense)}
                            >
                              Save
                            </button>
                            <button
                              className="table-action-btn secondary"
                              type="button"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="table-action-btn"
                              type="button"
                              onClick={() => startEdit(expense)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-btn"
                              type="button"
                              onClick={() => setPendingDelete(expense)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pendingDelete && (
        <div className="confirmation-backdrop" role="presentation">
          <div
            className="confirmation-dialog delete-confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-expense-title"
            aria-describedby="delete-expense-message"
          >
            <div className="confirmation-icon" aria-hidden="true">!</div>

            <h3 id="delete-expense-title">Delete expense?</h3>

            <p id="delete-expense-message">
              This will permanently remove <strong>{pendingDelete.expenseName}</strong> from your expense history.
            </p>

            <div className="confirmation-actions">
              <button
                className="table-action-btn secondary"
                type="button"
                onClick={() => setPendingDelete(null)}
              >
                Keep expense
              </button>

              <button
                className="delete-btn"
                type="button"
                onClick={confirmDelete}
              >
                Delete expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseHistoryPanel;
