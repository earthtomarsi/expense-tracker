import { useState } from "react";

function AdminUsersPanel({ users, onCreateUser, onUpdateUser, onDeleteUser, onOpenDetails }) {
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "user"
  });
  const [drafts, setDrafts] = useState({});

  const updateDraft = (user, field, value) => {
    setDrafts((current) => ({
      ...current,
      [user.id]: {
        name: current[user.id]?.name ?? user.name,
        username: current[user.id]?.username ?? user.username,
        [field]: value
      }
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    await onCreateUser(newUser);
    setNewUser({ name: "", username: "", email: "", password: "", role: "user" });
  };

  return (
    <section className="admin-management-panel">
      <div className="admin-panel-heading">
        <div>
          <h4>Users</h4>
          <p>Admin can create users and update name or username.</p>
        </div>
        <span>{users.length} users</span>
      </div>

      <form className="admin-users-toolbar" onSubmit={handleCreate}>
        <input
          placeholder="Name"
          value={newUser.name}
          onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          placeholder="Username"
          value={newUser.username}
          onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
        />
        <input
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
        />
        <select
          value={newUser.role}
          onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button className="admin-secondary-btn" type="submit">Create</button>
      </form>

      <div className="expense-table-panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const draft = drafts[user.id] || {};
              return (
                <tr key={user.id}>
                  <td>
                    <input
                      value={draft.name ?? user.name}
                      onChange={(event) => updateDraft(user, "name", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={draft.username ?? user.username}
                      onChange={(event) => updateDraft(user, "username", event.target.value)}
                    />
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="table-action-btn"
                        type="button"
                        onClick={() => onUpdateUser(user.id, {
                          name: draft.name ?? user.name,
                          username: draft.username ?? user.username
                        })}
                      >
                        Save
                      </button>
                      <button className="table-action-btn secondary" type="button" onClick={() => onOpenDetails(user)}>
                        Details
                      </button>
                      <button className="delete-btn" type="button" onClick={() => onDeleteUser(user.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminUsersPanel;
