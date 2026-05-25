import { useEffect, useState } from "react";
import AdminActivityPanel from "./AdminActivityPanel.jsx";
import AdminUsersPanel from "./AdminUsersPanel.jsx";
import UserDetailsModal from "./UserDetailsModal.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivity,
  getAdminUserActivity,
  getAdminUsers,
  updateAdminUser
} from "../services/api.js";

function formatLastLogin(value) {
  if (!value) return "Last login: Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `Last login: ${value}`;

  return `Last login: ${date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function AdminDashboard({ currentUser, showToast }) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const adminUsersCount = users.filter((user) => user.role === "admin").length;
  const regularUsersCount = users.filter((user) => user.role !== "admin").length;

  const loadAdminData = async () => {
    const [nextUsers, nextActivity] = await Promise.all([
      getAdminUsers(),
      getAdminActivity()
    ]);

    setUsers(nextUsers);
    setActivity(nextActivity);

    return [nextUsers, nextActivity];
  };

  useEffect(() => {
    let isMounted = true;

    loadAdminData()
      .catch((error) => {
        if (isMounted) showToast(error.message, "error");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleCreateUser = async (payload) => {
    try {
      const created = await createAdminUser(payload);
      setUsers((current) => [created, ...current]);
      showToast("User created successfully.");
      await loadAdminData();
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  };

  const handleUpdateUser = async (id, payload) => {
    try {
      const updated = await updateAdminUser(id, payload);

      setUsers((current) =>
        current.map((user) => (String(user.id) === String(updated.id) ? updated : user))
      );

      setSelectedUser((current) =>
        current && String(current.id) === String(updated.id)
          ? { ...current, ...updated }
          : current
      );

      showToast("User updated successfully.");
      await loadAdminData();
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await deleteAdminUser(id);
      setUsers((current) => current.filter((user) => String(user.id) !== String(id)));
      setSelectedUser((current) => (current && String(current.id) === String(id) ? null : current));
      showToast("User removed successfully.");
      await loadAdminData();
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  };

  const openUserDetails = async (user) => {
    try {
      const userActivity = await getAdminUserActivity(user.id);
      setSelectedUser(user);
      setSelectedUserActivity(userActivity);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const displayName = currentUser.name || currentUser.username || "Admin";

  return (
    <section className="admin-profile-panel">
      <div className="admin-summary-card">
        <div className="admin-profile-header">
          <div>
            <p className="admin-kicker">Admin dashboard</p>
            <h3>Hi {displayName}, here's today's account overview.</h3>
            <p>Edit existing user accounts and review login, logout, and CRUD activity.</p>
          </div>

          <span className="admin-last-login-pill">
            {formatLastLogin(currentUser.last_login || currentUser.lastLogin || currentUser.updated_at || currentUser.updatedAt)}
          </span>
        </div>

        <div className="admin-overview-grid">
          <div className="admin-overview-card">
            <span className="admin-overview-label">Total users</span>
            <strong>{users.length}</strong>
            <small>Across all roles</small>
          </div>

          <div className="admin-overview-card">
            <span className="admin-overview-label">Admins</span>
            <strong>{adminUsersCount}</strong>
            <small>Can manage accounts</small>
          </div>

          <div className="admin-overview-card">
            <span className="admin-overview-label">Regular users</span>
            <strong>{regularUsersCount}</strong>
            <small>Expense tracking accounts</small>
          </div>

          <div className="admin-overview-card">
            <span className="admin-overview-label">Activity events</span>
            <strong>{activity.length}</strong>
            <small>Logged user actions</small>
          </div>
        </div>
      </div>

      <section className="admin-management-card">
        <div className="admin-card-header">
          <div>
            <h3>User administration</h3>
            <p>Review user accounts and activity across Spendflow.</p>
          </div>
        </div>

        <div className="admin-management-tabs">
          {[
            ["users", "Users", `${users.length} ${users.length === 1 ? "count" : "counts"}`],
            ["activity", "User activity", `${activity.length} ${activity.length === 1 ? "event" : "events"}`]
          ].map(([tab, label, subLabel]) => (
            <button
              key={tab}
              className={activeTab === tab ? "admin-management-tab active" : "admin-management-tab"}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              <span>{label}</span>
              <small>{subLabel}</small>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="status-message">Loading admin data...</div>
        ) : (
          <div className="admin-management-workspace">
            {activeTab === "users" && (
              <AdminUsersPanel
                users={users}
                currentUser={currentUser}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onOpenDetails={openUserDetails}
              />
            )}

            {activeTab === "activity" && <AdminActivityPanel activity={activity} />}
          </div>
        )}
      </section>

      <UserDetailsModal
        user={selectedUser}
        activity={selectedUserActivity}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onClose={() => {
          setSelectedUser(null);
          setSelectedUserActivity([]);
        }}
      />
    </section>
  );
}

export default AdminDashboard;
