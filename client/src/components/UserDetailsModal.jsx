function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function UserDetailsModal({ user, activity = [], onClose }) {
  if (!user) return null;

  return (
    <div className="confirmation-backdrop user-details-backdrop" role="presentation">
      <div
        className="confirmation-dialog user-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
      >
        <button
          className="modal-x-button"
          type="button"
          aria-label="Close user details"
          onClick={onClose}
        >
          ×
        </button>

        <div className="user-details-header">
          <div>
            <p className="admin-kicker">User details</p>
            <h3 id="user-details-title">{user.name || user.username || "User"}</h3>
            <p>{user.email || "No email available"}</p>
          </div>

          <span className={`admin-role-badge ${user.role === "admin" ? "admin" : "user"}`}>
            {user.role || "user"}
          </span>
        </div>

        <div className="user-details-grid">
          <div>
            <span>Name</span>
            <strong>{user.name || "-"}</strong>
          </div>

          <div>
            <span>Username</span>
            <strong>{user.username || "-"}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{user.email || "-"}</strong>
          </div>

          <div>
            <span>Created</span>
            <strong>{formatDateTime(user.created_at || user.createdAt)}</strong>
          </div>
        </div>

        <div className="user-details-activity">
          <div className="user-details-section-heading">
            <h4>Recent activity</h4>
            <p>Latest recorded actions for this account.</p>
          </div>

          {activity.length === 0 ? (
            <div className="empty-table-cell">No activity recorded for this user.</div>
          ) : (
            <div className="admin-table-shell">
              <table className="admin-table user-details-activity-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {activity.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.action || "-"}</td>
                      <td>{item.details || "-"}</td>
                      <td>{formatDateTime(item.created_at || item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;
