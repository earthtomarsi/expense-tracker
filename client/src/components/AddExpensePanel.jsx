import { useMemo, useState } from "react";

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function getCurrentYear() {
  return new Date().getFullYear();
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

function parseAmount(value) {
  const normalized = String(value || "")
    .replace(/[$,\s]/g, "")
    .trim();

  if (!normalized) return NaN;

  return Number(normalized);
}

function formatAmount(value) {
  const amount = parseAmount(value);

  if (!Number.isFinite(amount) || amount <= 0) return value;

  return amount.toFixed(2);
}

function validateDate(value) {
  if (!value) return "Please select a date.";

  const selected = new Date(`${value}T00:00:00`);
  const today = new Date(`${getTodayLocalDate()}T00:00:00`);
  const selectedYear = Number(String(value).slice(0, 4));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return "Please use a valid date.";
  if (Number.isNaN(selected.getTime())) return "Please use a valid date.";
  if (selectedYear > getCurrentYear()) return `Year cannot be after ${getCurrentYear()}`;
  if (selected > today) return "Please use a valid date.";

  return "";
}

function AddExpensePanel({ editingExpense, onCancelEdit, onSubmit, showToast }) {
  const today = useMemo(() => getTodayLocalDate(), []);

  const [form, setForm] = useState(() => {
    if (editingExpense) {
      return {
        expenseName: editingExpense.expenseName || editingExpense.title || "",
        amount: editingExpense.amount ? Number(editingExpense.amount).toFixed(2) : "",
        category: editingExpense.category || "Food",
        date: editingExpense.date || getTodayLocalDate(),
        description: editingExpense.description || ""
      };
    }

    return createEmptyForm();
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getFieldError = (field, value) => {
    if (field === "expenseName" && !String(value || "").trim()) {
      return "Please enter an expense title.";
    }

    if (field === "amount") {
      const amount = parseAmount(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        return "Please enter a valid amount greater than 0.";
      }
    }

    if (field === "date") {
      return validateDate(value);
    }

    return "";
  };

  const updateField = (field, value) => {
    setFormError("");
    setForm((current) => ({ ...current, [field]: value }));

    setFieldErrors((current) => {
      if (!current[field] && field !== "date") return current;

      const nextError = getFieldError(field, value);
      return { ...current, [field]: nextError };
    });
  };

  const showValidationError = () => {
    const message = "Some fields are invalid. Please fix the highlighted fields.";
    setFormError(message);
    showToast?.(message, "error");
  };

  const validateForm = () => {
    const errors = {};
    const expenseName = String(form.expenseName || "").trim();
    const amount = parseAmount(form.amount);
    const dateError = validateDate(form.date);

    if (!expenseName) {
      errors.expenseName = "Please enter an expense title.";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "Please enter a valid amount greater than 0.";
    }

    if (dateError) {
      errors.date = dateError;
    }

    setFieldErrors(errors);

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      amount
    };
  };

  const handleAmountBlur = () => {
    if (!form.amount) return;

    const amount = parseAmount(form.amount);

    if (Number.isFinite(amount) && amount > 0) {
      setForm((current) => ({ ...current, amount: amount.toFixed(2) }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validateForm();

    if (!validation.isValid) {
      showValidationError();
      return;
    }

    const payload = {
      expenseName: String(form.expenseName || "").trim(),
      category: String(form.category || "Food").trim(),
      amount: Number(validation.amount.toFixed(2)),
      date: String(form.date || "").trim(),
      description: String(form.description ?? "").trim()
    };

    setIsSubmitting(true);

    try {
      const success = await onSubmit(payload);

      if (success && !editingExpense) {
        setForm(createEmptyForm());
        setFieldErrors({});
        setFormError("");
      }
    } catch (error) {
      const message = error.message || "Could not save expense.";
      setFormError(message);
      showToast?.(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const descriptionLength = String(form.description || "").length;
  const hasDescriptionWarning = descriptionLength >= 70;

  return (
    <div id="add-expense" className="quick-expense-panel user-dashboard-panel" role="tabpanel">
      <div className="quick-expense-header">
        <div>
          <h3>{editingExpense ? "Edit expense" : "Add expense"}</h3>
          <p>Fill in the details below to update your spending history.</p>
        </div>
      </div>

      <form className="container add-expense-form" onSubmit={handleSubmit} noValidate>
        <div className="input-section">
          <div className="input-row">
            <div className={`field-group${fieldErrors.expenseName ? " has-error" : ""}`}>
              <label className="sr-only" htmlFor="expenseName">
                Expense title
              </label>
              <input
                id="expenseName"
                placeholder="Title"
                value={form.expenseName}
                aria-invalid={Boolean(fieldErrors.expenseName)}
                onChange={(event) => updateField("expenseName", event.target.value)}
                onBlur={(event) => {
                  if (fieldErrors.expenseName) {
                    setFieldErrors((current) => ({
                      ...current,
                      expenseName: getFieldError("expenseName", event.target.value)
                    }));
                  }
                }}
              />
              {fieldErrors.expenseName && <small className="field-help error">{fieldErrors.expenseName}</small>}
            </div>

            <div className={`field-group amount-field-group${fieldErrors.amount ? " has-error" : ""}`}>
              <label className="sr-only" htmlFor="expense-amount">
                Expense amount
              </label>
              <span className="currency-prefix" aria-hidden="true">$</span>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                aria-invalid={Boolean(fieldErrors.amount)}
                onChange={(event) => updateField("amount", event.target.value)}
                onBlur={(event) => {
                  handleAmountBlur();
                  if (fieldErrors.amount) {
                    setFieldErrors((current) => ({
                      ...current,
                      amount: getFieldError("amount", event.target.value)
                    }));
                  }
                }}
              />
              {fieldErrors.amount && <small className="field-help error">{fieldErrors.amount}</small>}
            </div>

            <div className="field-group">
              <label className="sr-only" htmlFor="category">
                Expense category
              </label>
              <div className="select-wrapper add-expense-select-wrapper">
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
                <span className="select-arrow" aria-hidden="true">›</span>
              </div>
            </div>

            <div className={`field-group date-field-group${fieldErrors.date ? " has-error" : ""}`}>
              <label className="sr-only" htmlFor="add-expense-date">
                Expense date
              </label>
              <input
                id="add-expense-date"
                type="date"
                max={today}
                value={form.date}
                aria-invalid={Boolean(fieldErrors.date)}
                onChange={(event) => updateField("date", event.target.value)}
                onBlur={(event) => {
                  setFieldErrors((current) => ({
                    ...current,
                    date: getFieldError("date", event.target.value)
                  }));
                }}
              />
              {fieldErrors.date && <small className="field-help error">{fieldErrors.date}</small>}
            </div>

            <div className={`field-group description-group${hasDescriptionWarning ? " has-warning" : ""}`}>
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
                <small className="desc-limit-message">
                  {hasDescriptionWarning ? "Max 70 characters" : ""}
                </small>
                <small className="desc-counter">{descriptionLength}/70</small>
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
