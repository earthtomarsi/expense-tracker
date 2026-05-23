import { useMemo, useState } from "react";

const ROWS_PER_PAGE = 10;

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

function AdminActivityPanel({ activity }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [sort, setSort] = useState("time-desc");
  const [page, setPage] = useState(1);

  const actions = useMemo(() => {
    return [
      "All",
      ...new Set(
        activity
          .map((item) => getActionLabel(item.action))
          .filter(Boolean)
          .sort()
      )
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

        return [
          username,
          action,
          item.details,
          created
        ]
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
      <div className="admin-activity-card">
        <div className="admin-card-header admin-activity-header">
          <div>
            <h3>Activity</h3>
            <p>Review login, logout, expense, account, and admin actions.</p>
          </div>

          <span>{visibleActivity.length} {visibleActivity.length === 1 ? "record" : "records"}</span>
        </div>

        <div className="admin-activity-toolbar" aria-label="Admin activity controls">
          <div className="admin-activity-search">
            <input
              id="admin-activity-search"
              type="text"
              placeholder="Search activity"
              value={search}
              onChange={(event) =>
                resetToFirstPage(() => setSearch(event.target.value))
              }
            />
          </div>

          <div className="select-wrapper admin-activity-select">
            <select
              value={actionFilter}
              onChange={(event) =>
                resetToFirstPage(() => setActionFilter(event.target.value))
              }
            >
              {actions.map((action) => (
                <option key={action} value={action}>
                  Action: {action}
                </option>
              ))}
            </select>
            <span className="select-arrow">›</span>
          </div>

          <div className="select-wrapper admin-activity-select">
            <select
              value={sort}
              onChange={(event) =>
                resetToFirstPage(() => setSort(event.target.value))
              }
            >
              <option value="time-desc">Time: Most Recent</option>
              <option value="time-asc">Time: Oldest</option>
              <option value="username-asc">Username: A to Z</option>
              <option value="username-desc">Username: Z to A</option>
              <option value="action-asc">Action: A to Z</option>
              <option value="action-desc">Action: Z to A</option>
            </select>
            <span className="select-arrow">›</span>
          </div>

          <button className="toolbar-clear" type="button" onClick={clearControls}>
            Clear
          </button>
        </div>

        <div className="admin-table-shell">
          <table className="admin-table admin-activity-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Action</th>
                <th>Details</th>
                <th>Time</th>
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
                pageActivity.map((item, index) => (
                  <tr key={item.id || `${item.created_at}-${index}`}>
                    <td>{getUsername(item)}</td>
                    <td>
                      <span className={`admin-activity-action ${getActionClass(item.action)}`}>
                        {getActionLabel(item.action)}
                      </span>
                    </td>
                    <td>{item.details || "-"}</td>
                    <td>{formatDateTime(item.created_at || item.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer admin-activity-footer">
          <span className="page-indicator">
            {showingStart}-{showingEnd} of {visibleActivity.length}
          </span>

          <div className="table-pagination">
            <button
              className="page-btn"
              type="button"
              data-page-glyph="‹"
              aria-label="Previous activity page"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ‹
            </button>

            <button
              className="page-btn"
              type="button"
              data-page-glyph="›"
              aria-label="Next activity page"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminActivityPanel;
