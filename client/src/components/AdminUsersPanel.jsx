import { useMemo, useState } from "react";

const roleFilters = ["All", "admin", "user"];

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function createDraft(user) {
  return {
    name: user.name || "",
    username: user.username || ""
  };
}

function AdminUsersPanel({ users, onUpdateUser, onDeleteUser, onOpenDetails }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sort, setSort] = useState("name-asc");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...users]
      .filter((user) => {
        if (roleFilter !== "All" && user.role !== roleFilter) return false;

        if (!query) return true;

        return [
          user.name,
          user.username,
          user.email,
          user.role
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const aName = String(a.name || "").toLowerCase();
        const bName = String(b.name || "").toLowerCase();
        const aUsername = String(a.username || "").toLowerCase();
        const bUsername = String(b.username || "").toLowerCase();

        if (sort === "name-desc") return bName.localeCompare(aName);
        if (sort === "username-asc") return aUsername.localeCompare(bUsername);
        if (sort === "username-desc") return bUsername.localeCompare(aUsername);

        return aName.localeCompare(bName);
      });
  }, [users, search, roleFilter, sort]);

  const startEdit = (user) => {
    setEditingId(user.id);
    setDraft(createDraft(user));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveEdit = async (user) => {
    if (!draft) return;

    await onUpdateUser(user.id, {
      name: draft.name.trim(),
      username: draft.username.trim()
    });

    setEditingId(null);
    setDraft(null);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("All");
    setSort("name-asc");
  };

  return (
    <section className="admin-users-panel">
      <div className="admin-users-header">
        <div>
          <h3>Users</h3>
          <p>Review registered accounts and manage permitted user details.</p>
        </div>
      </div>

      <div className="admin-users-toolbar" aria-label="Admin users controls">
        <input
          id="admin-user-search"
          type="text"
          placeholder="Search users"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          {roleFilters.map((role) => (
            <option key={role} value={role}>
              Role: {role === "All" ? "All" : role}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
          <option value="username-asc">Username: A to Z</option>
          <option value="username-desc">Username: Z to A</option>
        </select>

        <button className="toolbar-clear" type="button" onClick={clearFilters}>
          Clear
        </button>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table admin-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th className="actions-header" aria-label="Actions"></th>
            </tr>
          </thead>

          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table-cell">
                  No users found
                </td>
              </tr>
            ) : (
              visibleUsers.map((user) => {
                const isEditing = String(editingId) === String(user.id);
                const isAdmin = user.role === "admin";

                return (
                  <tr key={user.id}>
                    <td>
                      {isEditing ? (
                        <input
                          className="table-edit-input"
                          value={draft.name}
                          onChange={(event) => updateDraft("name", event.target.value)}
                        />
                      ) : (
                        <button
                          className="admin-name-link"
                          type="button"
                          onClick={() => onOpenDetails(user)}
                        >
                          {user.name || "-"}
                        </button>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="table-edit-input"
                          value={draft.username}
                          onChange={(event) => updateDraft("username", event.target.value)}
                        />
                      ) : (
                        user.username || "-"
                      )}
                    </td>

                    <td>{user.email || "-"}</td>

                    <td>
                      <span className={`admin-role-badge ${isAdmin ? "admin" : "user"}`}>
                        {user.role || "user"}
                      </span>
                    </td>

                    <td>{formatDate(user.created_at || user.createdAt)}</td>

                    <td>
                      <div className="row-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="table-action-btn"
                              type="button"
                              onClick={() => saveEdit(user)}
                            >
                              Save
                            </button>

                            <button
                              className="table-action-btn secondary"
                              type="button"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="table-action-btn"
                              type="button"
                              onClick={() => startEdit(user)}
                            >
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              type="button"
                              onClick={() => onDeleteUser(user.id)}
                              disabled={isAdmin}
                              title={isAdmin ? "Admin accounts are protected" : "Delete user"}
                            >
                              Delete
                            </button>
                          </>
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
    </section>
  );
}

export default AdminUsersPanel;
