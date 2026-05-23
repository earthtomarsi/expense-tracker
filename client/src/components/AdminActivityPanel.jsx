import { useMemo, useState } from "react";

function AdminActivityPanel({ activity }) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("All");

  const actions = useMemo(() => {
    return ["All", ...new Set(activity.map((item) => item.action).filter(Boolean))];
  }, [activity]);

  const filteredActivity = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return activity.filter((item) => {
      if (action !== "All" && item.action !== action) return false;
      if (!normalizedSearch) return true;
      return [item.username, item.email, item.action, item.details]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [activity, search, action]);

  return (
    <section className="admin-management-panel">
      <div className="admin-panel-heading">
        <div>
          <h4>Activity</h4>
          <p>Review login, logout, expense, account, and admin actions.</p>
        </div>
        <span>{filteredActivity.length} records</span>
      </div>

      <div className="admin-activity-toolbar">
        <input
          placeholder="Search activity"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={action} onChange={(event) => setAction(event.target.value)}>
          {actions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="expense-table-panel">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivity.length === 0 ? (
              <tr>
                <td colSpan="4">No activity found</td>
              </tr>
            ) : (
              filteredActivity.map((item) => (
                <tr key={item.activityID || item.id}>
                  <td>{item.username || "-"}</td>
                  <td>{item.action}</td>
                  <td>{item.details || "-"}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminActivityPanel;
