import { useState } from "react";

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function createEmptyForm() {
  return {
    expenseName: "",
    amount: "",
    category: "Food",
    date: getTodayLocalDate(),
    description: ""
  };
}

function AddExpensePanel({ editingExpense, onCancelEdit, onSubmit }) {
  const [form, setForm] = useState(() => {
    if (editingExpense) {
      return {
        expenseName: editingExpense.expenseName || editingExpense.title || "",
        amount: String(editingExpense.amount || ""),
        category: editingExpense.category || "Food",
        date: editingExpense.date || getTodayLocalDate(),
        description: editingExpense.description || ""
      };
    }

    return createEmptyForm();
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const updateField = (field, value) => {
    setFormError("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      expenseName: String(form.expenseName || "").trim(),
      category: String(form.category || "Food").trim(),
      amount: Number(form.amount),
      date: String(form.date || "").trim(),
      description: String(form.description ?? "").trim()
    };

    if (!payload.expenseName) {
      setFormError("Please enter an expense title.");
      return;
    }

    if (!payload.amount || Number.isNaN(payload.amount) || payload.amount <= 0) {
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }

    if (!payload.date) {
      setFormError("Please select a date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await onSubmit(payload);

      if (success && !editingExpense) {
        setForm(createEmptyForm());
      }
    } catch (error) {
      setFormError(error.message || "Could not save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="add-expense" className="quick-expense-panel user-dashboard-panel" role="tabpanel">
      <div className="quick-expense-header">
        <div>
          <h3>{editingExpense ? "Edit expense" : "Add expense"}</h3>
          <p>Fill in the details below to update your spending history.</p>
        </div>
      </div>

      {formError && (
        <div className="status-message error add-expense-error">
          {formError}
        </div>
      )}

      <form className="container" onSubmit={handleSubmit}>
        <div className="input-section">
          <div className="input-row">
            <div className="field-group">
              <label className="sr-only" htmlFor="expenseName">
                Expense title
              </label>
              <input
                id="expenseName"
                placeholder="Title"
                value={form.expenseName}
                onChange={(event) => updateField("expenseName", event.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="sr-only" htmlFor="amount">
                Expense amount
              </label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="sr-only" htmlFor="category">
                Expense category
              </label>
              <div className="select-wrapper">
                <select
                  id="category"
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                >
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Bills</option>
                  <option>Leisure</option>
                  <option>Shopping</option>
                </select>
                <span className="select-arrow">›</span>
              </div>
            </div>

            <div className="field-group date-field-group">
              <label className="sr-only" htmlFor="date">
                Expense date
              </label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
                required
              />
            </div>

            <div className="field-group description-group">
              <label className="sr-only" htmlFor="description">
                Expense description
              </label>
              <input
                id="description"
                maxLength="70"
                placeholder="(optional)"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
              <div className="desc-info">
                <small>{form.description.length}/70</small>
              </div>
            </div>
          </div>

          <div className="button-section">
            <button id="add-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingExpense
                  ? "Save Expense"
                  : "Add Expense"}
            </button>

            {editingExpense && (
              <button
                className="table-action-btn secondary"
                type="button"
                onClick={onCancelEdit}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default AddExpensePanel;
