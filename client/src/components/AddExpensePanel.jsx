import { useState } from "react";

const emptyForm = {
  expenseName: "",
  amount: "",
  category: "Food",
  date: "",
  description: ""
};

function AddExpensePanel({ editingExpense, onCancelEdit, onSubmit }) {
  const [form, setForm] = useState(() => {
    if (editingExpense) {
      return {
      expenseName: editingExpense.expenseName || editingExpense.title || "",
      amount: String(editingExpense.amount || ""),
      category: editingExpense.category || "Food",
      date: editingExpense.date || "",
      description: editingExpense.description || ""
      };
    }

    return emptyForm;
  });

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      amount: Number(form.amount)
    });

    if (!editingExpense) {
      setForm(emptyForm);
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
            <button id="add-btn" type="submit">
              {editingExpense ? "Save Expense" : "Add Expense"}
            </button>
            {editingExpense && (
              <button className="table-action-btn secondary" type="button" onClick={onCancelEdit}>
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
