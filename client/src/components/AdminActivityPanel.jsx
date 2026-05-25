import { useEffect, useMemo, useState } from "react";

const ROWS_PER_PAGE = 10;
const sortOptions = [
  ["time-desc", "Time: Most Recent"],
  ["time-asc", "Time: Oldest"],
  ["username-asc", "Username: A to Z"],
  ["username-desc", "Username: Z to A"],
  ["action-asc", "Action: A to Z"],
  ["action-desc", "Action: Z to A"]
];

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getUsername(item) {
  return item.username || item.name || item.email || "Unknown";
}

function getActionLabel(action) {
  return String(action || "UNKNOWN")
    .trim()
    .replace(/_/g, " ")
    .toUpperCase();
}

function getActionClass(action) {
  const normalized = getActionLabel(action).toLowerCase().replace(/\s+/g, "-");

  if (normalized.includes("login")) return "login";
  if (normalized.includes("logout")) return "logout";
  if (normalized.includes("register")) return "register";
  if (normalized.includes("delete")) return "delete";
  if (normalized.includes("update")) return "update";
  if (normalized.includes("create") || normalized.includes("add")) return "create";

  return "default";
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

function ToolbarSelect({ id, value, options, openMenu, setOpenMenu, onChange, prefix = "" }) {
  const isOpen = openMenu === id;
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || options[0]?.[1] || "Select";
  const currentLabel = prefix ? `${prefix}: ${selectedLabel}` : selectedLabel;

  return (
    <div className={`toolbar-menu admin-toolbar-menu ${isOpen ? "open" : ""}`}>
      <button
        className="toolbar-menu-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : id)}
      >
        <span className="toolbar-menu-label">{currentLabel}</span>
        <span className="toolbar-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>

      {isOpen && (
        <div className="toolbar-dropdown-panel admin-toolbar-dropdown-panel" role="listbox">
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

function AdminActivityPanel({ activity }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [sort, setSort] = useState("time-desc");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    if (!openMenu) return undefined;

    const handlePointerDown = (event) => {
      if (event.target.closest(".admin-toolbar-menu")) return;
      setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu]);

  const actionOptions = useMemo(() => {
    return [
      ["All", "All"],
      ...Array.from(
        new Set(
          activity
            .map((item) => getActionLabel(item.action))
            .filter(Boolean)
            .sort()
        )
      ).map((action) => [action, action])
    ];
  }, [activity]);

  const visibleActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...activity]
      .filter((item) => {
        const action = getActionLabel(item.action);
        const username = getUsername(item);
        const created = formatDateTime(item.created_at || item.createdAt);

        if (actionFilter !== "All" && action !== actionFilter) return false;

        if (!query) return true;

        return [username, action, item.details, created]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const aUsername = getUsername(a).toLowerCase();
        const bUsername = getUsername(b).toLowerCase();
        const aAction = getActionLabel(a.action).toLowerCase();
        const bAction = getActionLabel(b.action).toLowerCase();
        const aTime = new Date(a.created_at || a.createdAt || 0).getTime() || 0;
        const bTime = new Date(b.created_at || b.createdAt || 0).getTime() || 0;

        if (sort === "time-asc") return aTime - bTime || aUsername.localeCompare(bUsername);
        if (sort === "username-asc") return aUsername.localeCompare(bUsername) || bTime - aTime;
        if (sort === "username-desc") return bUsername.localeCompare(aUsername) || bTime - aTime;
        if (sort === "action-asc") return aAction.localeCompare(bAction) || bTime - aTime;
        if (sort === "action-desc") return bAction.localeCompare(aAction) || bTime - aTime;

        return bTime - aTime || aUsername.localeCompare(bUsername);
      });
  }, [activity, search, actionFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleActivity.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const pageActivity = visibleActivity.slice(startIndex, endIndex);

  const resetToFirstPage = (callback) => {
    setPage(1);
    callback();
  };

  const clearControls = () => {
    setSearch("");
    setActionFilter("All");
    setSort("time-desc");
    setPage(1);
  };

  const showingStart = visibleActivity.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, visibleActivity.length);

  return (
    <section className="admin-activity-panel">
      <div className="admin-activity-toolbar admin-toolbar-grid" aria-label="Admin activity controls">
        <div className="admin-search-field">
          <label className="sr-only" htmlFor="admin-activity-search">Search activity</label>
          <input
            id="admin-activity-search"
            type="text"
            placeholder="Search activity"
            value={search}
            onChange={(event) => resetToFirstPage(() => setSearch(event.target.value))}
          />
          <span className="admin-search-icon" aria-hidden="true"><SearchIcon /></span>
        </div>

        <ToolbarSelect
          id="action"
          value={actionFilter}
          options={actionOptions}
          prefix="Action"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(value) => resetToFirstPage(() => setActionFilter(value))}
        />

        <ToolbarSelect
          id="time-sort"
          value={sort}
          options={sortOptions}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(value) => resetToFirstPage(() => setSort(value))}
        />

        <button className="toolbar-clear" type="button" onClick={clearControls}>
          Clear
        </button>
      </div>

      <div className="admin-table-shell admin-activity-table-shell">
        <table className="admin-table admin-activity-table">
          <thead>
            <tr>
              <th><span className="th-text">Username</span></th>
              <th><span className="th-text">Action</span></th>
              <th><span className="th-text">Details</span></th>
              <th><span className="th-text">Time</span></th>
            </tr>
          </thead>

          <tbody>
            {pageActivity.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-table-cell">
                  No activity found.
                </td>
              </tr>
            ) : (
              pageActivity.map((item, index) => {
                const username = getUsername(item);
                const details = item.details || "-";
                const time = formatDateTime(item.created_at || item.createdAt);

                return (
                  <tr key={item.id || `${item.created_at}-${index}`}>
                    <td><span className="admin-cell-text" title={username}>{username}</span></td>
                    <td>
                      <span className={`admin-activity-action ${getActionClass(item.action)}`}>
                        {getActionLabel(item.action)}
                      </span>
                    </td>
                    <td><span className="admin-cell-text" title={details}>{details}</span></td>
                    <td><span className="admin-cell-text" title={time}>{time}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="expense-pagination admin-activity-pagination" aria-label="Activity pagination">
        <span>{showingStart}-{showingEnd} of {visibleActivity.length}</span>
        <button
          type="button"
          aria-label="Previous activity page"
          disabled={safePage <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          aria-label="Next activity page"
          disabled={safePage >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}

export default AdminActivityPanel;
