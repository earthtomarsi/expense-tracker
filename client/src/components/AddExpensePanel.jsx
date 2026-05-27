import { useEffect, useMemo, useRef, useState } from "react";

const categories = ["Food", "Transport", "Bills", "Leisure", "Shopping"];
const fullMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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

function getAmountLiveError(value) {
  const amountValue = String(value || "").trim();

  if (!amountValue) return "";

  const amount = parseAmount(amountValue);

  if (!Number.isFinite(amount)) return "Please enter a valid amount.";
  if (amount <= 0) return "Amount must be greater than 0.";

  return "";
}

function getAmountSaveError(value) {
  const amountValue = String(value || "").trim();

  if (!amountValue) return "Amount is required.";

  return getAmountLiveError(amountValue);
}

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInputDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return String(value || "");
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function parseDisplayDateInput(value) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return { date: parsed, iso: toInputDate(parsed) };
}

function normalizeDateForApi(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return value;
  return parseDisplayDateInput(value)?.iso || "";
}

function buildCalendarDays(visibleDate) {
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function validateDate(value) {
  if (!value) return "Please select a date.";

  const normalized = normalizeDateForApi(value);
  if (!normalized) return "Please use a valid date.";

  const selected = new Date(`${normalized}T00:00:00`);
  const today = new Date(`${getTodayLocalDate()}T00:00:00`);
  const selectedYear = Number(String(normalized).slice(0, 4));

  if (Number.isNaN(selected.getTime())) return "Please use a valid date.";
  if (selectedYear > getCurrentYear()) return `Year cannot be after ${getCurrentYear()}`;
  if (selected > today) return "Please use a valid date.";

  return "";
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M7 4v3M17 4v3M5 9h14M6.5 6h11A1.5 1.5 0 0 1 19 7.5v10A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6Z" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="M5.5 7.75 10 12.25l4.5-4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryDropdown({ value, isOpen, onToggle, onChange }) {
  return (
    <div className={`add-expense-category-menu ${isOpen ? "open" : ""}`}>
      <button
        className="add-expense-category-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span id="add-expense-category-label">{value}</span>
        <span className="toolbar-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>

      {isOpen && (
        <div className="add-expense-category-panel" role="listbox">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={category === value ? "add-expense-category-option active" : "add-expense-category-option"}
              onClick={() => onChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function getDisplayDateSegments(value) {
  const raw = String(value || "");

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return {
      month: raw.slice(5, 7),
      day: raw.slice(8, 10),
      year: raw.slice(0, 4)
    };
  }

  const [month = "", day = "", year = ""] = raw.split("/");
  return {
    month: month.replace(/\D/g, "").slice(0, 2),
    day: day.replace(/\D/g, "").slice(0, 2),
    year: year.replace(/\D/g, "").slice(0, 4)
  };
}

function combineDateSegments(segments) {
  if (!segments.month && !segments.day && !segments.year) return "";
  return `${segments.month}/${segments.day}/${segments.year}`;
}

function SegmentedDateInput({ value, onChange, onCommit, inputIdPrefix = "add-expense-date" }) {
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const yearRef = useRef(null);
  const segments = getDisplayDateSegments(value);

  const commitIfComplete = () => {};

  const updateSegment = (segment, rawValue) => {
    const maxLength = segment === "year" ? 4 : 2;
    const cleanValue = rawValue.replace(/\D/g, "").slice(0, maxLength);
    const nextSegments = { ...segments, [segment]: cleanValue };

    onChange(combineDateSegments(nextSegments));

    if (segment === "month" && cleanValue.length === 2) dayRef.current?.focus();
    if (segment === "day" && cleanValue.length === 2) yearRef.current?.focus();
    // Keep the manually typed MM/DD/YYYY value visible while typing.
    // The value is normalized only when the form is submitted or when a calendar day is clicked.
  };

  const handleKeyDown = (event, segment) => {
    if (event.key !== "Backspace") return;

    if (segment === "day" && !segments.day) {
      event.preventDefault();
      monthRef.current?.focus();
    }

    if (segment === "year" && !segments.year) {
      event.preventDefault();
      dayRef.current?.focus();
    }
  };

  const handleBlur = () => {};

  return (
    <div className="date-segment-group" aria-label="Expense date">
      <input
        id={`${inputIdPrefix}-month`}
        ref={monthRef}
        className="date-segment-input date-month-segment"
        type="text"
        inputMode="numeric"
        placeholder="MM"
        aria-label="Month"
        value={segments.month}
        maxLength={2}
        onChange={(event) => updateSegment("month", event.target.value)}
        onBlur={handleBlur}
      />
      <span className="date-segment-divider" aria-hidden="true">/</span>
      <input
        ref={dayRef}
        className="date-segment-input date-day-segment"
        type="text"
        inputMode="numeric"
        placeholder="DD"
        aria-label="Day"
        value={segments.day}
        maxLength={2}
        onChange={(event) => updateSegment("day", event.target.value)}
        onKeyDown={(event) => handleKeyDown(event, "day")}
        onBlur={handleBlur}
      />
      <span className="date-segment-divider" aria-hidden="true">/</span>
      <input
        ref={yearRef}
        className="date-segment-input date-year-segment"
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        aria-label="Year"
        value={segments.year}
        maxLength={4}
        onChange={(event) => updateSegment("year", event.target.value)}
        onKeyDown={(event) => handleKeyDown(event, "year")}
        onBlur={handleBlur}
      />
    </div>
  );
}

function DatePickerField({ value, isOpen, onToggle, onChange, onClose, hasError }) {
  const todayValue = getTodayLocalDate();
  const today = useMemo(() => parseDateValue(todayValue), [todayValue]);
  const selectedDate = useMemo(() => parseDateValue(value) || parseDisplayDateInput(value)?.date || null, [value]);
  const [visibleDate, setVisibleDate] = useState(() => selectedDate || today || new Date());

  useEffect(() => {
    if (isOpen) setVisibleDate(selectedDate || today || new Date());
  }, [isOpen, selectedDate, today, todayValue]);

  const visibleDays = buildCalendarDays(visibleDate);
  const visibleMonth = visibleDate.getMonth();

  return (
    <div className={`date-input-shell ${isOpen ? "open" : ""}`}>
      <div className={`add-date-trigger ${hasError ? "error" : ""}`}>
        <SegmentedDateInput value={value} onChange={onChange} onCommit={onChange} />
        <button
          className="date-icon-btn"
          type="button"
          aria-label="Open calendar"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <CalendarIcon />
        </button>
      </div>

      {isOpen && (
        <div className="date-picker-panel add-date-picker-panel" role="dialog" aria-label="Choose expense date">
          <div className="date-picker-header">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleDate(new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1))}><ChevronLeftIcon /></button>
            <span>{fullMonths[visibleDate.getMonth()]} {visibleDate.getFullYear()}</span>
            <button type="button" aria-label="Next month" onClick={() => setVisibleDate(new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1))}><ChevronRightIcon /></button>
          </div>

          <div className="date-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="date-picker-grid">
            {visibleDays.map((day) => {
              const dayValue = toInputDate(day);
              const isSelected = normalizeDateForApi(value) === dayValue;
              const isToday = today && toInputDate(today) === dayValue;
              const isOutside = day.getMonth() !== visibleMonth;
              const isDisabled = Boolean(today && day > today);

              return (
                <button
                  key={dayValue}
                  type="button"
                  className={["date-day", isSelected ? "selected" : "", isToday ? "today" : "", isOutside ? "outside" : ""].filter(Boolean).join(" ")}
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(dayValue);
                    onClose();
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-picker-actions">
            <button
              type="button"
              onClick={() => {
                onChange(getTodayLocalDate());
                onClose();
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddExpensePanel({ editingExpense, onCancelEdit, onSubmit, showToast }) {
  const [openControl, setOpenControl] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!openControl) return undefined;

    const handlePointerDown = (event) => {
      if (event.target.closest(".add-expense-category-menu, .date-input-shell")) return;
      setOpenControl(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openControl]);

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
      return getAmountLiveError(value);
    }

    if (field === "date") {
      return validateDate(value);
    }

    return "";
  };

  const updateField = (field, value) => {
    setFormError("");
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "amount") {
      setFieldErrors((current) => ({
        ...current,
        amount: getAmountLiveError(value)
      }));
      return;
    }

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

    const amountError = getAmountSaveError(form.amount);

    if (amountError) {
      errors.amount = amountError;
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
      date: normalizeDateForApi(form.date),
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
                aria-describedby="amount-error"
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
              {fieldErrors.amount && (
                <small id="amount-error" className="field-help error" role="alert">
                  {fieldErrors.amount}
                </small>
              )}
            </div>

            <div className="field-group add-category-field-group">
              <label className="sr-only" htmlFor="add-expense-category-label">
                Expense category
              </label>
              <CategoryDropdown
                value={form.category}
                isOpen={openControl === "category"}
                onToggle={() => setOpenControl((current) => current === "category" ? null : "category")}
                onChange={(value) => {
                  updateField("category", value);
                  setOpenControl(null);
                }}
              />
            </div>

            <div className={`field-group date-field-group${fieldErrors.date ? " has-error" : ""}`}>
              <label className="sr-only" htmlFor="add-expense-date-trigger">
                Expense date
              </label>
              <DatePickerField
                value={form.date}
                hasError={Boolean(fieldErrors.date)}
                isOpen={openControl === "date"}
                onToggle={() => setOpenControl((current) => current === "date" ? null : "date")}
                onChange={(value) => updateField("date", value)}
                onClose={() => setOpenControl(null)}
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
