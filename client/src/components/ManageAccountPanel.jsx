import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentUser, login, updateAccount, updatePassword } from "../services/api.js";

const maskedPasswordValue = "••••••••";

function isValidEmailFormat(value) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(value || "").trim());
}

function getEmailValidationMessage(value) {
  const email = String(value || "").trim();

  if (/[^A-Za-z0-9._%+\-@]/.test(email)) {
    return "Email can only include letters, numbers, and . _ % + -";
  }

  return "Please enter a valid email";
}

function getEmailLiveError(value) {
  const email = String(value || "").trim();

  if (!email) return "";
  if (isValidEmailFormat(email)) return "";

  return getEmailValidationMessage(email);
}

function getEmailSaveError(value) {
  const email = String(value || "").trim();

  if (!email) return "Email is required.";
  if (isValidEmailFormat(email)) return "";

  return getEmailValidationMessage(email);
}

function getNewPasswordLiveError(newPassword, currentPassword) {
  const value = String(newPassword || "");

  if (!value) return "";
  if (value.length < 6) return "Use at least 6 characters.";
  if (currentPassword && currentPassword === value) {
    return "New password must be different from current password.";
  }

  return "";
}

function getNewPasswordSaveError(newPassword, currentPassword) {
  const value = String(newPassword || "");

  if (!value) return "Please enter a new password.";

  return getNewPasswordLiveError(value, currentPassword);
}

function getPasswordFieldErrorsFromApiError(error) {
  const apiFieldErrors = error?.fieldErrors || error?.data?.fieldErrors || {};
  const nextFieldErrors = {};

  if (apiFieldErrors.currentPassword) {
    nextFieldErrors.currentPassword = String(apiFieldErrors.currentPassword);
  }

  if (apiFieldErrors.newPassword) {
    nextFieldErrors.newPassword = String(apiFieldErrors.newPassword);
  }

  if (Object.keys(nextFieldErrors).length > 0) {
    return nextFieldErrors;
  }

  const message = String(error?.message || error?.error || "").trim();
  const normalizedMessage = message.toLowerCase();

  if (/new password|at least|characters/.test(normalizedMessage)) {
    return { newPassword: message || "Use at least 6 characters." };
  }

  if (/wrong|incorrect|invalid|current password|password/.test(normalizedMessage)) {
    return { currentPassword: message || "Password is incorrect." };
  }

  return { currentPassword: message || "Password is incorrect." };
}

function getProfileFieldErrorFromApiError(error) {
  const message = String(error?.message || "");

  if (/password/i.test(message)) return null;

  const apiFieldErrors = error?.fieldErrors || error?.data?.fieldErrors || {};
  const nextFieldErrors = {};

  if (apiFieldErrors.name) nextFieldErrors.name = String(apiFieldErrors.name);
  if (apiFieldErrors.username) nextFieldErrors.username = String(apiFieldErrors.username);
  if (apiFieldErrors.email) nextFieldErrors.email = String(apiFieldErrors.email);

  if (Object.keys(nextFieldErrors).length > 0) {
    return nextFieldErrors;
  }

  if (/email/i.test(message)) return { email: message };
  if (/username|user name/i.test(message)) return { username: message };
  if (/\bname\b/i.test(message)) return { name: message };

  return null;
}

function createProfileState(user) {
  return {
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || ""
  };
}

function normalizeProfile(profile) {
  return {
    name: String(profile.name || "").trim(),
    username: String(profile.username || "").trim(),
    email: String(profile.email || "").trim()
  };
}

function profilesMatch(firstProfile, secondProfile) {
  return JSON.stringify(normalizeProfile(firstProfile)) === JSON.stringify(normalizeProfile(secondProfile));
}

function formatLastUpdated(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  return `Last updated ${formatted}`;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5.5c-5.9 0-9.4 5.6-9.9 6.5.5.9 4 6.5 9.9 6.5s9.4-5.6 9.9-6.5c-.5-.9-4-6.5-9.9-6.5Zm0 9.4a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z" />
    </svg>
  );
}

function ManageAccountPanel({ currentUser, onUserUpdate, showToast, onNavigateHome, onLogout }) {
  const initialProfile = useMemo(() => createProfileState(currentUser), [currentUser]);
  const [profile, setProfile] = useState(() => createProfileState(currentUser));
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordEditorOpen, setIsPasswordEditorOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(
    currentUser?.updatedAt || currentUser?.updated_at || currentUser?.lastUpdated || currentUser?.last_updated || ""
  );
  const pendingLeaveActionRef = useRef(null);

  useEffect(() => {
    setProfile(createProfileState(currentUser));
    setLastUpdatedAt(
      currentUser?.updatedAt || currentUser?.updated_at || currentUser?.lastUpdated || currentUser?.last_updated || ""
    );
  }, [currentUser]);

  const isProfileDirty = useMemo(
    () => isEditing && !profilesMatch(profile, initialProfile),
    [isEditing, profile, initialProfile]
  );

  const hasUnsavedChanges = isEditing;
  const canOpenPasswordEditor = isEditing && !isPasswordEditorOpen && !isSavingPassword;
  const lastUpdatedLabel = formatLastUpdated(lastUpdatedAt);
  const isPasswordFieldEnabled = isEditing && isPasswordEditorOpen;

  useEffect(() => {
    if (!showUnsavedModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showUnsavedModal]);

  useEffect(() => {
    if (!hasUnsavedChanges || showUnsavedModal) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, showUnsavedModal]);

  useEffect(() => {
    if (!hasUnsavedChanges || showUnsavedModal) return undefined;

    const handlePotentialNavigation = (event) => {
      const target = event.target;

      if (
        target.closest(".manage-account-panel") ||
        target.closest(".unsaved-changes-modal") ||
        target.closest(".app-toast")
      ) {
        return;
      }

      if (target.closest("#brand-home")) {
        pendingLeaveActionRef.current = onNavigateHome;
      } else if (target.closest("#logout-btn")) {
        pendingLeaveActionRef.current = onLogout;
      } else {
        pendingLeaveActionRef.current = null;
      }

      event.preventDefault();
      event.stopPropagation();
      setShowUnsavedModal(true);
    };

    document.addEventListener("pointerdown", handlePotentialNavigation, true);
    document.addEventListener("click", handlePotentialNavigation, true);

    return () => {
      document.removeEventListener("pointerdown", handlePotentialNavigation, true);
      document.removeEventListener("click", handlePotentialNavigation, true);
    };
  }, [hasUnsavedChanges, showUnsavedModal, onNavigateHome, onLogout]);

  const resetEdits = () => {
    setProfile(createProfileState(currentUser));
    setPasswords({ currentPassword: "", newPassword: "" });
    setFieldErrors({});
    setIsPasswordEditorOpen(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  const updateProfileField = (field, value) => {
    if (!isEditing) return;

    setProfile((current) => ({ ...current, [field]: value }));

    if (field === "email") {
      setFieldErrors((current) => ({ ...current, email: getEmailLiveError(value) }));
      return;
    }

    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const updatePasswordField = (field, value) => {
    if (!isPasswordFieldEnabled) return;

    setPasswords((current) => {
      const nextPasswords = { ...current, [field]: value };

      setFieldErrors((errors) => {
        if (field === "newPassword") {
          return {
            ...errors,
            newPassword: getNewPasswordLiveError(value, nextPasswords.currentPassword)
          };
        }

        return {
          ...errors,
          currentPassword: "",
          newPassword: nextPasswords.newPassword
            ? getNewPasswordLiveError(nextPasswords.newPassword, value)
            : errors.newPassword
        };
      });

      return nextPasswords;
    });
  };

  const startEditing = () => {
    setIsEditing(true);
    setFieldErrors({});
  };

  const cancelEditing = () => {
    resetEdits();
    setIsEditing(false);
  };

  const leaveWithoutSaving = () => {
    const pendingLeaveAction = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;

    resetEdits();
    setIsEditing(false);
    setShowUnsavedModal(false);
    pendingLeaveAction?.();
  };

  const openPasswordEditor = () => {
    if (!canOpenPasswordEditor) return;

    setIsPasswordEditorOpen(true);
    setFieldErrors((current) => ({
      ...current,
      currentPassword: "",
      newPassword: ""
    }));
  };

  const validateProfile = () => {
    const payload = normalizeProfile(profile);
    const nextFieldErrors = {};

    if (!payload.name) nextFieldErrors.name = "Name is required.";
    if (!payload.username) nextFieldErrors.username = "Username is required.";

    const emailError = getEmailSaveError(payload.email);
    if (emailError) nextFieldErrors.email = emailError;

    return { payload, nextFieldErrors };
  };

  const validatePasswordOnSave = () => {
    const payload = {
      currentPassword: String(passwords.currentPassword || ""),
      newPassword: String(passwords.newPassword || "")
    };
    const nextFieldErrors = {};

    if (!payload.currentPassword) {
      nextFieldErrors.currentPassword = "Please enter your current password.";
    }

    const newPasswordError = getNewPasswordSaveError(payload.newPassword, payload.currentPassword);
    if (newPasswordError) nextFieldErrors.newPassword = newPasswordError;

    return { payload, nextFieldErrors };
  };

  const verifyCurrentPasswordForValidation = async (currentPassword) => {
    const loginIdentifier = currentUser?.email || currentUser?.username;

    if (!loginIdentifier || !currentPassword) return "";

    try {
      const loginResponse = await login({
        login: loginIdentifier,
        password: currentPassword
      });

      if (loginResponse?.success === false || loginResponse?.error) {
        return "Password is incorrect.";
      }

      return "";
    } catch {
      return "Password is incorrect.";
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!isEditing) {
      startEditing();
      return;
    }

    const { payload: profilePayload, nextFieldErrors: profileFieldErrors } = validateProfile();
    const passwordValidation = isPasswordEditorOpen ? validatePasswordOnSave() : null;
    const nextFieldErrors = {
      ...profileFieldErrors,
      ...(passwordValidation?.nextFieldErrors || {})
    };

    if (Object.values(nextFieldErrors).some(Boolean)) {
      if (
        isPasswordEditorOpen &&
        passwordValidation?.payload.currentPassword &&
        !passwordValidation.nextFieldErrors.currentPassword
      ) {
        const currentPasswordError = await verifyCurrentPasswordForValidation(
          passwordValidation.payload.currentPassword
        );

        if (currentPasswordError) {
          nextFieldErrors.currentPassword = currentPasswordError;
        }
      }

      setFieldErrors(nextFieldErrors);
      showToast?.("Some fields are invalid. Please fix the highlighted fields.", "error");
      return;
    }

    const shouldUpdatePassword = isPasswordEditorOpen;

    setIsSavingProfile(true);
    setIsSavingPassword(shouldUpdatePassword);

    try {
      if (isProfileDirty) {
        await updateAccount(profilePayload);
      }

      if (shouldUpdatePassword && passwordValidation) {
        try {
          const passwordResponse = await updatePassword(passwordValidation.payload);

          if (passwordResponse?.success === false || passwordResponse?.error) {
            throw new Error(
              passwordResponse?.message || passwordResponse?.error || "Password is incorrect."
            );
          }
        } catch (passwordError) {
          const passwordFieldErrors = getPasswordFieldErrorsFromApiError(passwordError);
          const currentPasswordMessage =
            passwordFieldErrors.currentPassword || passwordError?.message || "Password is incorrect.";

          setFieldErrors((current) => ({
            ...current,
            ...passwordFieldErrors,
            currentPassword: currentPasswordMessage
          }));

          requestAnimationFrame(() => {
            document.getElementById("manage-account-current-password")?.focus();
          });

          showToast?.(
            passwordError.message || "Please fix the highlighted password fields.",
            "error"
          );
          return;
        }
      }

      const refreshedUser = await getCurrentUser();

      onUserUpdate?.(refreshedUser);
      setProfile(createProfileState(refreshedUser));
      setPasswords({ currentPassword: "", newPassword: "" });
      setIsPasswordEditorOpen(false);
      setLastUpdatedAt(
        refreshedUser?.updatedAt ||
        refreshedUser?.updated_at ||
        refreshedUser?.lastUpdated ||
        refreshedUser?.last_updated ||
        new Date().toISOString()
      );
      setFieldErrors({});
      setIsEditing(false);
      showToast?.(
        shouldUpdatePassword ? "Account and password updated successfully." : "Account updated successfully."
      );
    } catch (error) {
      const message = error.message || "Could not save account changes.";
      const profileFieldError = getProfileFieldErrorFromApiError(error);

      if (profileFieldError) {
        setFieldErrors((current) => ({ ...current, ...profileFieldError }));
      } else {
        setFieldErrors((current) => ({ ...current, email: message }));
      }

      showToast?.(message, "error");
    } finally {
      setIsSavingProfile(false);
      setIsSavingPassword(false);
    }
  };

  return (
    <section
      className={`manage-account-panel${isPasswordEditorOpen ? " password-edit-mode" : ""}`}
    >
      <div className="manage-account-card">
        <div className="manage-account-heading">
          <div>
            <h3>Manage Account</h3>
            <p>Manage your account details and password.</p>
          </div>
          {lastUpdatedLabel ? (
            <span className="chart-badge trend-badge manage-account-updated-kicker">{lastUpdatedLabel}</span>
          ) : null}
        </div>

        <form className="manage-account-section" onSubmit={handleProfileSubmit} noValidate>
          <div className="manage-account-section-header">
            <h4>Account details</h4>
          </div>

          <div className="manage-account-fields">
            <label className={`manage-account-field${fieldErrors.name ? " has-error" : ""}`}>
              <span>Name</span>
              <span className="manage-account-input-wrap">
                <input
                  id="manage-account-name"
                  value={profile.name}
                  disabled={!isEditing}
                  className={fieldErrors.name ? "error" : ""}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(event) => updateProfileField("name", event.target.value)}
                />
              </span>
              <small className="error-text">{fieldErrors.name || ""}</small>
            </label>

            <label className={`manage-account-field${fieldErrors.username ? " has-error" : ""}`}>
              <span>Username</span>
              <span className="manage-account-input-wrap">
                <input
                  id="manage-account-username"
                  value={profile.username}
                  disabled={!isEditing}
                  className={fieldErrors.username ? "error" : ""}
                  aria-invalid={Boolean(fieldErrors.username)}
                  onChange={(event) => updateProfileField("username", event.target.value)}
                />
              </span>
              <small className="error-text">{fieldErrors.username || ""}</small>
            </label>

            <label className={`manage-account-field${fieldErrors.email ? " has-error" : ""}`}>
              <span>Email</span>
              <span className="manage-account-input-wrap">
                <input
                  id="manage-account-email"
                  type="email"
                  value={profile.email}
                  disabled={!isEditing}
                  className={fieldErrors.email ? "error" : ""}
                  aria-invalid={Boolean(fieldErrors.email)}
                  onChange={(event) => updateProfileField("email", event.target.value)}
                />
              </span>
              <small className="error-text">{fieldErrors.email || ""}</small>
            </label>
          </div>

          <div className="manage-account-password-group" aria-label="Password settings">
            <h4>Password</h4>
          </div>

          <div className="manage-account-fields manage-account-password-fields">
            <label className={`manage-account-field${fieldErrors.currentPassword ? " has-error" : ""}`}>
              <span>Current password</span>
              <span className="manage-account-input-wrap">
                <input
                  id="manage-account-current-password"
                  type={showCurrentPassword && isPasswordFieldEnabled ? "text" : "password"}
                  value={isPasswordFieldEnabled ? passwords.currentPassword : maskedPasswordValue}
                  disabled={!isPasswordFieldEnabled}
                  placeholder={isPasswordFieldEnabled ? "" : maskedPasswordValue}
                  className={fieldErrors.currentPassword ? "error" : ""}
                  aria-invalid={Boolean(fieldErrors.currentPassword)}
                  aria-describedby="manage-account-current-password-error"
                  onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
                />
                <button
                  className={`manage-account-password-visibility${showCurrentPassword ? " active" : ""}${!isPasswordFieldEnabled ? " inactive" : ""}`}
                  type="button"
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  disabled={!isPasswordFieldEnabled}
                  onClick={() => setShowCurrentPassword((current) => !current)}
                >
                  <EyeIcon />
                </button>
              </span>
              <small
                id="manage-account-current-password-error"
                className="error-text"
                role={fieldErrors.currentPassword ? "alert" : undefined}
              >
                {fieldErrors.currentPassword || ""}
              </small>
            </label>

            {isPasswordEditorOpen ? (
              <label
                className={`manage-account-field manage-account-new-password-field${fieldErrors.newPassword ? " has-error" : ""}`}
              >
                <span>New password</span>
                <span className="manage-account-input-wrap">
                  <input
                    id="manage-account-new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwords.newPassword}
                    disabled={!isPasswordFieldEnabled}
                    className={fieldErrors.newPassword ? "error" : ""}
                    aria-invalid={Boolean(fieldErrors.newPassword)}
                    onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                  />
                  <button
                    className={`manage-account-password-visibility${showNewPassword ? " active" : ""}${!isPasswordFieldEnabled ? " inactive" : ""}`}
                    type="button"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    disabled={!isPasswordFieldEnabled}
                    onClick={() => setShowNewPassword((current) => !current)}
                  >
                    <EyeIcon />
                  </button>
                </span>
                <small className="error-text">{fieldErrors.newPassword || ""}</small>
              </label>
            ) : (
              <div className="manage-account-password-reveal manage-account-password-reveal-inline">
                <button
                  className={`table-action-btn secondary${!isEditing ? " inactive" : ""}`}
                  type="button"
                  disabled={!canOpenPasswordEditor}
                  onClick={openPasswordEditor}
                >
                  Update password
                </button>
              </div>
            )}
          </div>

          <div className="manage-account-actions">
            <div className="manage-account-action-group">
              <button
                className="table-action-btn manage-account-primary"
                type="submit"
                disabled={isSavingProfile || isSavingPassword}
              >
                {!isEditing ? "Edit" : isSavingProfile || isSavingPassword ? "Saving..." : "Save"}
              </button>

              <button
                className={`table-action-btn secondary manage-account-secondary${!isEditing ? " inactive" : ""}`}
                type="button"
                disabled={!isEditing || isSavingProfile || isSavingPassword}
                onClick={cancelEditing}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>

      {showUnsavedModal && createPortal(
        <div className="unsaved-changes-modal show" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-account-title"
            aria-describedby="unsaved-account-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close unsaved changes confirmation"
              onClick={() => {
                pendingLeaveActionRef.current = null;
                setShowUnsavedModal(false);
              }}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="unsaved-account-title">Unsaved changes</h3>
              <p id="unsaved-account-message">Are you sure you want to leave this page?</p>
              <p>Your changes will be lost.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button
                className="table-action-btn primary"
                type="button"
                onClick={() => {
                  pendingLeaveActionRef.current = null;
                  setShowUnsavedModal(false);
                }}
              >
                Keep editing
              </button>

              <button
                className="table-action-btn secondary"
                type="button"
                onClick={leaveWithoutSaving}
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

export default ManageAccountPanel;
