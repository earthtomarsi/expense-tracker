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
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([getAdminUsers(), getAdminActivity()])
      .then(([nextUsers, nextActivity]) => {
        if (!isMounted) return;
        setUsers(nextUsers);
        setActivity(nextActivity);
      })
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
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleUpdateUser = async (id, payload) => {
    try {
      const updated = await updateAdminUser(id, payload);
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? updated : user))
      );
      showToast("User updated successfully.");
      await loadAdminData();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await deleteAdminUser(id);
      setUsers((current) => current.filter((user) => user.id !== id));
      showToast("User deleted successfully.");
      await loadAdminData();
    } catch (error) {
      showToast(error.message, "error");
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

  return (
    <section className="admin-profile-panel">
      <div className="admin-profile-header">
        <div>
          <p className="admin-kicker">Admin dashboard</p>
          <h3>Welcome, {currentUser.name || currentUser.username}</h3>
          <p>Manage user accounts and review system activity.</p>
        </div>
      </div>

      <div className="admin-overview-grid">
        <div className="admin-overview-card">
          <span className="admin-overview-label">Total users</span>
          <strong>{users.length}</strong>
          <small>registered accounts</small>
        </div>

        <div className="admin-overview-card">
          <span className="admin-overview-label">Admin users</span>
          <strong>{adminUsersCount}</strong>
          <small>administrator accounts</small>
        </div>

        <div className="admin-overview-card">
          <span className="admin-overview-label">Regular users</span>
          <strong>{regularUsersCount}</strong>
          <small>standard accounts</small>
        </div>

        <div className="admin-overview-card">
          <span className="admin-overview-label">Activity events</span>
          <strong>{activity.length}</strong>
          <small>audit records</small>
        </div>
      </div>

      <div className="admin-management-tabs">
        {[
          ["users", "Users", "Manage accounts"],
          ["activity", "Activity", "Audit log"]
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
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onOpenDetails={openUserDetails}
            />
          )}

          {activeTab === "activity" && <AdminActivityPanel activity={activity} />}
        </div>
      )}

      <UserDetailsModal
        user={selectedUser}
        activity={selectedUserActivity}
        onClose={() => {
          setSelectedUser(null);
          setSelectedUserActivity([]);
        }}
      />
    </section>
  );
}

export default AdminDashboard;
