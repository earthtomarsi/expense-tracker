import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const categories = ["All", "Food", "Transport", "Bills", "Leisure", "Shopping"];
const editableCategories = ["Food", "Transport", "Bills", "Leisure", "Shopping"];
const sortOptions = [
  ["date-desc", "Most Recent"],
  ["date-asc", "Oldest"],
  ["amount-asc", "Low to High"],
  ["amount-desc", "High to Low"],
  ["name-asc", "A to Z"],
  ["name-desc", "Z to A"]
];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const pageSize = 10;

const expenseHistoryEllipsisStyles = `
.expense-table-panel {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

#expense-table {
  table-layout: fixed;
  width: 100%;
  min-width: 980px;
}

#expense-table th,
#expense-table td {
  min-width: 0;
}

#expense-table th:nth-child(1),
#expense-table .title-cell {
  width: 18%;
}

#expense-table th:nth-child(2),
#expense-table .amount-cell {
  width: 13%;
}

#expense-table th:nth-child(3),
#expense-table .category-cell {
  width: 14%;
}

#expense-table th:nth-child(4),
#expense-table .date-cell {
  width: 16%;
}

#expense-table th:nth-child(5),
#expense-table .description-cell {
  width: 27%;
}

#expense-table th:nth-child(6),
#expense-table .actions-cell {
  width: 88px;
  min-width: 88px;
}

#expense-table .cell-text {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#expense-table .table-edit-input,
#expense-table .amount-edit-input {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#expense-table .table-amount-input,
#expense-table .category-edit-menu,
#expense-table .category-edit-trigger,
#expense-table .table-date-picker,
#expense-table .table-date-trigger,
#expense-table .date-segment-group {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

#expense-table .table-amount-input input {
  min-width: 0;
}

#expense-table .category-edit-trigger span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#expense-table .date-segment-input {
  min-width: 0;
}
`;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function normalizeDateForInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function parseDateValue(value) {
  const normalized = normalizeDateForInput(value);
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInputDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "";
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

function SegmentedDateInput({ value, onChange, inputIdPrefix = "table-date" }) {
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const yearRef = useRef(null);
  const segments = getDisplayDateSegments(value);

  const updateSegment = (segment, rawValue) => {
    const maxLength = segment === "year" ? 4 : 2;
    const cleanValue = rawValue.replace(/\D/g, "").slice(0, maxLength);
    const nextSegments = { ...segments, [segment]: cleanValue };

    onChange(combineDateSegments(nextSegments));

    if (segment === "month" && cleanValue.length === 2) dayRef.current?.focus();
    if (segment === "day" && cleanValue.length === 2) yearRef.current?.focus();
    // Keep the manually typed MM/DD/YYYY value visible while typing.
    // The value is normalized only when saving or when a calendar day is clicked.
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

function normalizeDraftDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return value;
  return parseDisplayDateInput(value)?.iso || "";
}

function formatMonthLabel(value) {
  if (!value) return "Month";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || !months[monthIndex]) return "Month";
  return `${months[monthIndex]} ${year}`;
}

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function getCurrentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function createDraft(expense) {
  return {
    expenseName: expense.expenseName || "",
    amount: String(expense.amount ?? ""),
    category: expense.category || "Food",
    date: normalizeDateForInput(expense.date),
    description: expense.description || ""
  };
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

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M5 12.5 9.2 16.7 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M7 7 17 17M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M4 7h16M10 11v6M14 11v6M6.5 7l.8 13h9.4l.8-13M9 7l.8-2h4.4l.8 2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M5 7h14M8 12h8M10 17h4" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}


function SortIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M8 5v14M8 19l-3-3M8 19l3-3M16 19V5M16 5l-3 3M16 5l3 3" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M7 4v3M17 4v3M5 9h14M6.5 6h11A1.5 1.5 0 0 1 19 7.5v10A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6Z" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M10.5 5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm4.2 9.7L19 19" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
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

function ToolbarSelect({ id, icon, label, value, options, openMenu, setOpenMenu, onChange }) {
  const isOpen = openMenu === id;
  const currentLabel = options.find(([optionValue]) => optionValue === value)?.[1] || label;

  return (
    <div className={`toolbar-menu ${isOpen ? "open" : ""}`}>
      <button
        className="toolbar-menu-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : id)}
      >
        {icon && <span className="toolbar-menu-icon" aria-hidden="true">{icon}</span>}
        <span className="toolbar-menu-label">{currentLabel}</span>
        <span className="toolbar-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>

      {isOpen && (
        <div className={`toolbar-dropdown-panel ${id}-menu-panel`} role="listbox">
          {options.map(([optionValue, optionLabel]) => (
            <button
              key={optionValue}
              className={optionValue === value ? "toolbar-option active" : "toolbar-option"}
              type="button"
              role="option"
              aria-selected={optionValue === value}
              onClick={() => {
                onChange(optionValue);
                setOpenMenu(null);
              }}
            >
              {optionLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthPicker({ value, openMenu, setOpenMenu, onChange }) {
  const currentYear = new Date().getFullYear();
  const currentMonthValue = getCurrentMonthValue();
  const [visibleYear, setVisibleYear] = useState(value ? Number(value.split("-")[0]) : currentYear);
  const [selectedViaThisMonth, setSelectedViaThisMonth] = useState(false);
  const isOpen = openMenu === "month";

  useEffect(() => {
    if (value) setVisibleYear(Number(value.split("-")[0]));
    if (value !== currentMonthValue) setSelectedViaThisMonth(false);
  }, [value, currentMonthValue]);

  return (
    <div className={`toolbar-menu month-toolbar-menu ${isOpen ? "open" : ""}`}>
      <button
        className="toolbar-menu-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : "month")}
      >
        <span className="toolbar-menu-icon" aria-hidden="true"><CalendarIcon /></span>
        <span className="toolbar-menu-label">{formatMonthLabel(value)}</span>
        <span className="toolbar-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>

      {isOpen && (
        <div className="month-picker-panel" role="dialog" aria-label="Choose expense month">
          <div className="month-picker-header">
            <button type="button" aria-label="Previous year" onClick={() => setVisibleYear((year) => year - 1)}><ChevronLeftIcon /></button>
            <strong>{visibleYear}</strong>
            <button type="button" aria-label="Next year" onClick={() => setVisibleYear((year) => year + 1)}><ChevronRightIcon /></button>
          </div>

          <button
            className={selectedViaThisMonth && value === currentMonthValue ? "this-month-btn selected" : "this-month-btn"}
            type="button"
            onClick={() => {
              setSelectedViaThisMonth(true);
              onChange(getCurrentMonthValue());
              setOpenMenu(null);
            }}
          >
            This month
          </button>

          <div className="month-grid">
            {months.map((month, index) => {
              const monthValue = `${visibleYear}-${String(index + 1).padStart(2, "0")}`;
              const isSelected = value === monthValue;
              return (
                <button
                  key={month}
                  className={["month-option", isSelected ? "selected" : ""].filter(Boolean).join(" ")}
                  type="button"
                  onClick={() => {
                    setSelectedViaThisMonth(false);
                    onChange(monthValue);
                    setOpenMenu(null);
                  }}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryEditSelect({ value, isOpen, onToggle, onChange, hasError }) {
  return (
    <div className={`category-edit-menu ${isOpen ? "open" : ""}`}>
      <button
        className={`category-edit-trigger ${hasError ? "has-error" : ""}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{value}</span>
        <span className="category-edit-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>

      {isOpen && (
        <div className="category-edit-panel" role="listbox">
          {editableCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={category === value ? "category-edit-option active" : "category-edit-option"}
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


function DateEditPicker({ value, isOpen, onToggle, onChange, onClose, hasError }) {
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
    <div className={`table-date-picker ${isOpen ? "open" : ""}`}>
      <div className={`table-date-trigger ${hasError ? "has-error" : ""}`}>
        <SegmentedDateInput value={value} onChange={onChange} />
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
        <div className="date-picker-panel table-date-picker-panel" role="dialog" aria-label="Choose expense date">
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
              const isSelected = normalizeDraftDate(value) === dayValue;
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

function validateDraft(draft) {
  const errors = {};
  const trimmedTitle = draft.expenseName.trim();
  const amount = Number(draft.amount);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedDate = normalizeDraftDate(draft.date);
  const enteredDate = normalizedDate ? new Date(`${normalizedDate}T00:00:00`) : null;

  if (!trimmedTitle) errors.expenseName = "Title is required";
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Amount must be a valid number greater than 0";
  if (!editableCategories.includes(draft.category)) errors.category = "Please choose a category";
  if (!normalizedDate || Number.isNaN(enteredDate?.getTime()) || enteredDate > today) {
    errors.date = "Please use a valid date.";
  }
  if (draft.description.length > 70) errors.description = "Description must be 70 characters or less";

  return errors;
}

function ExpenseHistoryPanel({
  expenses,
  filters,
  onFilterChange,
  onClearFilters,
  highlightedExpenseId,
  onUpdate,
  onDelete,
  showToast
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState(null);
  const [openDatePickerId, setOpenDatePickerId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!openMenu && !openCategoryMenuId && !openDatePickerId) return undefined;

    const handlePointerDown = (event) => {
      if (event.target.closest(".toolbar-menu, .category-edit-menu, .table-date-picker")) return;
      setOpenMenu(null);
      setOpenCategoryMenuId(null);
      setOpenDatePickerId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu, openCategoryMenuId, openDatePickerId]);

  useEffect(() => {
    if (!editingId) return;

    const stillExists = expenses.some((expense) => String(expense.id) === String(editingId));

    if (!stillExists) {
      setEditingId(null);
      setDraft(null);
      setFieldErrors({});
      setOpenCategoryMenuId(null);
      setOpenDatePickerId(null);
    }
  }, [expenses, editingId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.category, filters.month, filters.sort]);

  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedExpenses = useMemo(
    () => expenses.slice(pageStart, pageStart + pageSize),
    [expenses, pageStart]
  );
  const rangeStart = expenses.length ? pageStart + 1 : 0;
  const rangeEnd = Math.min(pageStart + pageSize, expenses.length);

  useEffect(() => {
    if (!highlightedExpenseId) return;
    const highlightedIndex = expenses.findIndex((expense) => String(expense.id) === String(highlightedExpenseId));
    if (highlightedIndex >= 0) {
      setCurrentPage(Math.floor(highlightedIndex / pageSize) + 1);
    }
  }, [highlightedExpenseId, expenses]);

  useEffect(() => {
    if (!highlightedExpenseId) return undefined;
    const timer = window.setTimeout(() => {
      document.querySelector(`#expense-table tr.recently-added-row`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [highlightedExpenseId, safePage]);

  useEffect(() => {
    if (!pendingDelete && !showUnsavedModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingDelete, showUnsavedModal]);

  useEffect(() => {
    if (!editingId || pendingDelete || showUnsavedModal) return undefined;

    const shouldIgnoreTarget = (target) => Boolean(
      target.closest(".selected-edit-row, .unsaved-changes-modal, .date-picker-panel, .category-edit-panel")
    );

    const handlePotentialNavigation = (event) => {
      if (shouldIgnoreTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      setShowUnsavedModal(true);
    };

    document.addEventListener("pointerdown", handlePotentialNavigation, true);
    document.addEventListener("click", handlePotentialNavigation, true);

    return () => {
      document.removeEventListener("pointerdown", handlePotentialNavigation, true);
      document.removeEventListener("click", handlePotentialNavigation, true);
    };
  }, [editingId, pendingDelete, showUnsavedModal]);

  useEffect(() => {
    if (!editingId) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editingId]);

  const scrollEditingRowIntoView = () => {
    document.querySelector("#expense-table tr.selected-edit-row")?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  };


  const startEdit = (expense) => {
    setEditingId(expense.id);
    setDraft(createDraft(expense));
    setFieldErrors({});
    setOpenCategoryMenuId(null);
    setOpenDatePickerId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setFieldErrors({});
    setOpenCategoryMenuId(null);
    setOpenDatePickerId(null);
    setShowUnsavedModal(false);
  };

  const updateDraft = (field, value) => {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      setFieldErrors(validateDraft(next));
      return next;
    });
  };

  const saveEdit = async (expense) => {
    if (!draft) return;

    const nextErrors = validateDraft(draft);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showToast?.(nextErrors.amount || nextErrors.date || nextErrors.expenseName || "Please fix the highlighted fields.", "error");
      return;
    }

    const success = await onUpdate(expense.id, {
      ...draft,
      expenseName: draft.expenseName.trim(),
      amount: Number(draft.amount),
      date: normalizeDraftDate(draft.date)
    });

    if (success) {
      setEditingId(null);
      setDraft(null);
      setFieldErrors({});
      setOpenCategoryMenuId(null);
      setOpenDatePickerId(null);
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
    <div id="expense-history" className="table-section user-dashboard-panel" role="tabpanel" ref={panelRef}>
      <style>{expenseHistoryEllipsisStyles}</style>
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
            <span className="table-search-icon" aria-hidden="true"><SearchIcon /></span>
          </div>

          <ToolbarSelect
            id="category"
            icon={<FilterIcon />}
            label="All"
            value={filters.category}
            options={categories.map((category) => [category, category])}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={(value) => onFilterChange("category", value)}
          />

          <MonthPicker
            value={filters.month}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={(value) => onFilterChange("month", value)}
          />

          <ToolbarSelect
            id="sort"
            icon={<SortIcon />}
            label="Most Recent"
            value={filters.sort}
            options={sortOptions}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={(value) => onFilterChange("sort", value)}
          />

          <button className="toolbar-clear" type="button" onClick={onClearFilters}>
            Clear
          </button>
        </div>
      </div>

      <div className="expense-table-panel">
        <table id="expense-table" className={editingId ? "row-edit-mode" : ""}>
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
            {paginatedExpenses.length === 0 ? (
              <tr>
                <td colSpan="6" id="empty-state">
                  No expenses found
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((expense) => {
                const isEditing = String(editingId) === String(expense.id);
                const isHighlighted =
                  highlightedExpenseId && String(highlightedExpenseId) === String(expense.id);
                const rowClassName = [
                  isEditing ? "selected-edit-row" : "",
                  isHighlighted ? "recently-added-row" : ""
                ].filter(Boolean).join(" ");
                const descriptionText = expense.description || "No description";

                return (
                  <tr key={expense.id} className={rowClassName}>
                    <td className={`title-cell editable ${isEditing && fieldErrors.expenseName ? "has-error" : ""} ${isEditing ? "editing" : "locked"}`}>
                      {isEditing ? (
                        <input
                          className="table-edit-input"
                          aria-label="Expense title"
                          title={draft.expenseName}
                          value={draft.expenseName}
                          onChange={(event) => updateDraft("expenseName", event.target.value)}
                        />
                      ) : (
                        <span className="cell-text" title={expense.expenseName}>{expense.expenseName}</span>
                      )}
                    </td>

                    <td className={`amount-cell editable ${isEditing && fieldErrors.amount ? "has-error" : ""} ${isEditing ? "editing" : "locked"}`}>
                      {isEditing ? (
                        <div className={`table-amount-input ${fieldErrors.amount ? "has-error" : ""}`} aria-label="Expense amount">
                          <span aria-hidden="true">$</span>
                          <input
                            className="amount-edit-input"
                            type="text"
                            inputMode="decimal"
                            value={draft.amount}
                            onChange={(event) => updateDraft("amount", event.target.value)}
                          />
                        </div>
                      ) : (
                        <span className="cell-text">{formatCurrency(expense.amount)}</span>
                      )}
                    </td>

                    <td className={`category-cell editable ${isEditing && fieldErrors.category ? "has-error" : ""} ${isEditing ? "editing" : "locked"}`}>
                      {isEditing ? (
                        <CategoryEditSelect
                          value={draft.category}
                          hasError={Boolean(fieldErrors.category)}
                          isOpen={String(openCategoryMenuId) === String(expense.id)}
                          onToggle={() => {
                            setOpenDatePickerId(null);
                            setOpenCategoryMenuId((current) => String(current) === String(expense.id) ? null : expense.id);
                          }}
                          onChange={(value) => {
                            updateDraft("category", value);
                            setOpenCategoryMenuId(null);
                          }}
                        />
                      ) : (
                        <span className="cell-text">{expense.category}</span>
                      )}
                    </td>

                    <td className={`date-cell editable ${isEditing && fieldErrors.date ? "has-error" : ""} ${isEditing ? "editing" : "locked"}`}>
                      {isEditing ? (
                        <DateEditPicker
                          value={draft.date}
                          hasError={Boolean(fieldErrors.date)}
                          isOpen={String(openDatePickerId) === String(expense.id)}
                          onToggle={() => {
                            setOpenCategoryMenuId(null);
                            setOpenDatePickerId((current) => String(current) === String(expense.id) ? null : expense.id);
                          }}
                          onChange={(value) => updateDraft("date", value)}
                          onClose={() => setOpenDatePickerId(null)}
                        />
                      ) : (
                        <span className="cell-text">{formatDateDisplay(expense.date)}</span>
                      )}
                    </td>

                    <td className={`description-cell editable ${isEditing && fieldErrors.description ? "has-error" : ""} ${isEditing ? "editing" : "locked"}`}>
                      {isEditing ? (
                        <input
                          className="table-edit-input description-edit-input"
                          aria-label="Expense description"
                          maxLength="70"
                          placeholder="No description"
                          title={draft.description || "No description"}
                          value={draft.description}
                          onChange={(event) => updateDraft("description", event.target.value)}
                        />
                      ) : (
                        <span className={`cell-text ${expense.description ? "" : "placeholder-text"}`} title={descriptionText}>{descriptionText}</span>
                      )}
                    </td>

                    <td className="actions-cell">
                      <div className="row-actions" aria-label={`Actions for ${expense.expenseName}`}>
                        {isEditing ? (
                          <>
                            <button
                              className="row-icon-btn cancel-row-btn"
                              type="button"
                              aria-label="Cancel row editing"
                              title="Cancel changes"
                              onClick={cancelEdit}
                            >
                              <XIcon />
                            </button>
                            <button
                              className="row-icon-btn save-row-btn"
                              type="button"
                              aria-label="Save row changes"
                              title="Save changes"
                              onClick={() => saveEdit(expense)}
                            >
                              <CheckIcon />
                            </button>
                            <button
                              className="row-icon-btn delete-row-btn"
                              type="button"
                              aria-label="Delete expense"
                              title="Delete expense"
                              onClick={() => setPendingDelete(expense)}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        ) : (
                          <button
                            className="row-icon-btn edit-row-btn"
                            type="button"
                            aria-label={`Edit ${expense.expenseName}`}
                            title="Edit expense"
                            onClick={() => startEdit(expense)}
                          >
                            <PencilIcon />
                          </button>
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

      {expenses.length > 0 && (
        <div className="expense-pagination" aria-label="Expense pagination">
          <span>{rangeStart}-{rangeEnd} of {expenses.length}</span>
          <button
            type="button"
            aria-label="Previous page"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}

      {pendingDelete && createPortal(
        <div className="unsaved-changes-modal show delete-expense-modal" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card delete-expense-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-expense-title"
            aria-describedby="delete-expense-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close delete confirmation"
              onClick={() => setPendingDelete(null)}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="delete-expense-title">Delete expense?</h3>
              <p id="delete-expense-message">
                Are you sure you want to remove <strong>{pendingDelete.expenseName}</strong>?
              </p>
              <p id="delete-expense-warning">This also removes it from your expense history.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button
                className="table-action-btn primary"
                type="button"
                onClick={() => setPendingDelete(null)}
              >
                Keep expense
              </button>

              <button
                className="table-action-btn secondary"
                type="button"
                onClick={confirmDelete}
              >
                Delete expense
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showUnsavedModal && createPortal(
        <div className="unsaved-changes-modal show" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-expense-title"
            aria-describedby="unsaved-expense-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close unsaved changes confirmation"
              onClick={() => {
                setShowUnsavedModal(false);
                scrollEditingRowIntoView();
              }}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="unsaved-expense-title">Unsaved changes</h3>
              <p id="unsaved-expense-message">Are you sure you want to leave this row?</p>
              <p>Your changes will be lost.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button
                className="table-action-btn primary"
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  scrollEditingRowIntoView();
                }}
              >
                Keep editing
              </button>

              <button
                className="table-action-btn secondary"
                type="button"
                onClick={() => {
                  cancelEdit();
                  setShowUnsavedModal(false);
                }}
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ExpenseHistoryPanel;
