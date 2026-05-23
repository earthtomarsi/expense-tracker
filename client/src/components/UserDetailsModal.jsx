function UserDetailsModal({ user, activity, onClose }) {
  if (!user) return null;

  return (
    <div className="confirmation-backdrop" role="presentation">
      <div className="confirmation-dialog" role="dialog" aria-modal="true">
        <div className="admin-card-header">
          <div>
            <h4>{user.name}</h4>
            <p>{user.username} · {user.email}</p>
          </div>
          <span>{user.role}</span>
        </div>

        <div className="expense-table-panel">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Details</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td colSpan="3">No activity for this user yet.</td>
                </tr>
              ) : (
                activity.map((item) => (
                  <tr key={item.activityID || item.id}>
                    <td>{item.action}</td>
                    <td>{item.details || "-"}</td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="confirmation-actions">
          <button className="table-action-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;
