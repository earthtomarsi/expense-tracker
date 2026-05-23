import { useState } from "react";
import { updateAccount, updatePassword } from "../services/api.js";

function ManageAccountPanel({ currentUser, onUserUpdate, showToast }) {
  const [profile, setProfile] = useState({
    name: currentUser.name || "",
    username: currentUser.username || "",
    email: currentUser.email || ""
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: ""
  });

  const updateProfileField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updatePasswordField = (field, value) => {
    setPasswords((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    try {
      const updatedUser = await updateAccount(profile);
      onUserUpdate(updatedUser);
      showToast("Account updated successfully.");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    try {
      await updatePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      showToast("Password updated successfully.");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <section className="manage-account-panel">
      <div className="manage-account-card">
        <div className="manage-account-heading">
          <h3>Manage Account</h3>
          <p>Update your profile details and password.</p>
        </div>

        <form className="manage-account-section" onSubmit={handleProfileSubmit}>
          <div className="manage-account-section-header">
            <h4>Profile</h4>
            <p>Role cannot be changed from this screen.</p>
          </div>
          <div className="manage-account-fields">
            <label className="manage-account-field">
              <span>Name</span>
              <input value={profile.name} onChange={(event) => updateProfileField("name", event.target.value)} />
            </label>
            <label className="manage-account-field">
              <span>Username</span>
              <input value={profile.username} onChange={(event) => updateProfileField("username", event.target.value)} />
            </label>
            <label className="manage-account-field">
              <span>Email</span>
              <input type="email" value={profile.email} onChange={(event) => updateProfileField("email", event.target.value)} />
            </label>
            <label className="manage-account-field">
              <span>Role</span>
              <input className="readonly-field" value={currentUser.role} readOnly />
            </label>
          </div>
          <div className="manage-account-actions">
            <button className="table-action-btn" type="submit">Save profile</button>
          </div>
        </form>

        <form className="manage-account-section" onSubmit={handlePasswordSubmit}>
          <div className="manage-account-section-header">
            <h4>Password</h4>
            <p>Enter your current password before choosing a new one.</p>
          </div>
          <div className="manage-account-fields">
            <label className="manage-account-field">
              <span>Current password</span>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
              />
            </label>
            <label className="manage-account-field">
              <span>New password</span>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(event) => updatePasswordField("newPassword", event.target.value)}
              />
            </label>
          </div>
          <div className="manage-account-actions">
            <button className="table-action-btn" type="submit">Update password</button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ManageAccountPanel;
