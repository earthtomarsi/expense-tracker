import { useEffect, useState } from "react";
import { getCurrentUser, updateAccount, updatePassword } from "../services/api.js";

function createProfileState(user) {
  return {
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || ""
  };
}

function ManageAccountPanel({ currentUser, onUserUpdate, showToast }) {
  const [profile, setProfile] = useState(() => createProfileState(currentUser));
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setProfile(createProfileState(currentUser));
  }, [currentUser]);

  const updateProfileField = (field, value) => {
    setProfileError("");
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updatePasswordField = (field, value) => {
    setPasswordError("");
    setPasswords((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: String(profile.name || "").trim(),
      username: String(profile.username || "").trim(),
      email: String(profile.email || "").trim()
    };

    if (!payload.name) {
      setProfileError("Name is required.");
      return;
    }

    if (!payload.username) {
      setProfileError("Username is required.");
      return;
    }

    if (!payload.email) {
      setProfileError("Email is required.");
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateAccount(payload);

      const refreshedUser = await getCurrentUser();

      onUserUpdate?.(refreshedUser);
      setProfile(createProfileState(refreshedUser));
      showToast?.("Account updated successfully.");
    } catch (error) {
      setProfileError(error.message || "Could not update account.");
      showToast?.(error.message || "Could not update account.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      currentPassword: String(passwords.currentPassword || ""),
      newPassword: String(passwords.newPassword || "")
    };

    if (!payload.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!payload.newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (payload.newPassword.length < 6) {
      setPasswordError("Use at least 6 characters.");
      return;
    }

    if (payload.currentPassword === payload.newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setIsSavingPassword(true);

    try {
      await updatePassword(payload);

      setPasswords({
        currentPassword: "",
        newPassword: ""
      });

      showToast?.("Password updated successfully.");
    } catch (error) {
      setPasswordError(error.message || "Could not update password.");
      showToast?.(error.message || "Could not update password.", "error");
    } finally {
      setIsSavingPassword(false);
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

          {profileError && (
            <div className="status-message error manage-account-error">
              {profileError}
            </div>
          )}

          <div className="manage-account-fields">
            <label className="manage-account-field">
              <span>Name</span>
              <input
                value={profile.name}
                onChange={(event) => updateProfileField("name", event.target.value)}
              />
            </label>

            <label className="manage-account-field">
              <span>Username</span>
              <input
                value={profile.username}
                onChange={(event) => updateProfileField("username", event.target.value)}
              />
            </label>

            <label className="manage-account-field">
              <span>Email</span>
              <input
                type="email"
                value={profile.email}
                onChange={(event) => updateProfileField("email", event.target.value)}
              />
            </label>

            <label className="manage-account-field">
              <span>Role</span>
              <input className="readonly-field" value={currentUser?.role || ""} readOnly />
            </label>
          </div>

          <div className="manage-account-actions">
            <button className="table-action-btn" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>

        <form className="manage-account-section" onSubmit={handlePasswordSubmit}>
          <div className="manage-account-section-header">
            <h4>Password</h4>
            <p>Enter your current password before choosing a new one.</p>
          </div>

          {passwordError && (
            <div className="status-message error manage-account-error">
              {passwordError}
            </div>
          )}

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
            <button className="table-action-btn" type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default ManageAccountPanel;
