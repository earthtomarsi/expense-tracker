import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ROWS_PER_PAGE = 10;

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

function getActionLabel(action) {
  return String(action || "UNKNOWN")
    .trim()
    .replace(/_/g, " ")
    .toUpperCase();
}

function getActionClass(action) {
  const normalized = getActionLabel(action).toLowerCase().replace(/\s+/g, "-");

  if (normalized.includes("login")) return "login";
  if (normalized.includes("logout")) return "logout";
  if (normalized.includes("register")) return "register";
  if (normalized.includes("delete")) return "delete";
  if (normalized.includes("update")) return "update";
  if (normalized.includes("create") || normalized.includes("add")) return "create";

  return "default";
}

function createDraft(user) {
  return {
    name: user?.name || "",
    username: user?.username || ""
  };
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M4 7h16M10 11v6M14 11v6M6.5 7l.8 13h9.4l.8-13M9 7l.8-2h4.4l.8 2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The details modal has its own edit guard so closing or paginating never drops draft changes silently.
function UserDetailsModal({ user, activity = [], currentUser, onClose, onUpdateUser, onDeleteUser, onEditStateChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => createDraft(user));
  const [page, setPage] = useState(1);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null);
  const saveActionsRef = useRef(null);

  const hasUnsavedChanges = Boolean(user && isEditing && (
    String(user.name || "") !== String(draft.name || "") ||
    String(user.username || "") !== String(draft.username || "")
  ));

  useEffect(() => {
    setDraft(createDraft(user));
    setIsEditing(false);
    setPage(1);
    setShowRemoveConfirm(false);
    setIsSaving(false);
  }, [user]);

  useEffect(() => {
    if (!showRemoveConfirm) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showRemoveConfirm]);

  useEffect(() => {
    if (!isEditing) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestGuardedLeave(() => {
        cancelEdit();
        onClose?.();
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, onClose]);

  const totalPages = Math.max(1, Math.ceil(activity.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const pageActivity = useMemo(
    () => activity.slice(startIndex, endIndex),
    [activity, startIndex, endIndex]
  );
  const showingStart = activity.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, activity.length);

  const userLabel = user?.name || user?.username || "User";
  const isAdminProfile = user?.role === "admin";
  const isCurrentUser = String(currentUser?.id ?? currentUser?.userID ?? "") === String(user?.id ?? "");
  const canRemoveUser = isEditing && !isAdminProfile && !isCurrentUser;

  const highlightSaveButton = () => {
    const saveButton = document.getElementById("admin-user-detail-save-btn");
    const target = saveActionsRef.current || saveButton;

    target?.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      if (!saveButton) return;
      saveButton.classList.add("table-action-attention");
      saveButton.focus({ preventScroll: true });
      window.setTimeout(() => {
        saveButton.classList.remove("table-action-attention");
      }, 1600);
    }, 420);
  };

  const keepEditing = () => {
    setPendingLeaveAction(null);
    highlightSaveButton();
  };

  const requestGuardedLeave = (leaveAction) => {
    if (!isEditing) {
      leaveAction?.();
      return;
    }

    setPendingLeaveAction(() => leaveAction);
  };


  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const cancelEdit = () => {
    setDraft(createDraft(user));
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!isEditing) return;

    setIsSaving(true);

    try {
      const success = await onUpdateUser?.(user.id, {
        name: String(draft.name || "").trim(),
        username: String(draft.username || "").trim(),
        email: user.email || "",
        role: user.role || "user"
      });

      if (success) setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemoveUser = async () => {
    if (!canRemoveUser || !user) return;

    const success = await onDeleteUser?.(user.id);
    if (success) {
      setShowRemoveConfirm(false);
      onClose?.();
    }
  };

  useEffect(() => {
    onEditStateChange?.({
      isEditing: Boolean(user && isEditing),
      hasUnsavedChanges,
      discard: cancelEdit,
      keepEditing
    });
  }, [hasUnsavedChanges, isEditing, onEditStateChange, user?.id]);

  useEffect(() => {
    return () => {
      onEditStateChange?.({
        isEditing: false,
        hasUnsavedChanges: false,
        discard: null,
        keepEditing: null
      });
    };
  }, [onEditStateChange]);


  useEffect(() => {
    window.__spendflowAdminDetailEditGuard = {
      isEditing: Boolean(user && isEditing),
      hasUnsavedChanges,
      discard: cancelEdit,
      keepEditing
    };

    return () => {
      window.__spendflowAdminDetailEditGuard = null;
    };
  }, [hasUnsavedChanges, isEditing, user?.id]);

  if (!user) return null;

  return (
    <div
      className="confirmation-backdrop user-details-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        requestGuardedLeave(() => {
          cancelEdit();
          onClose?.();
        });
      }}
    >
      <div
        className={`confirmation-dialog user-details-modal ${isEditing ? "is-editing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
      >
        <button
          className="modal-x-button"
          type="button"
          aria-label="Close user details"
          onClick={() => requestGuardedLeave(() => {
            cancelEdit();
            onClose?.();
          })}
        >
          ×
        </button>

        <div className="user-details-header">
          <div>
            <h3 id="user-details-title">{userLabel}</h3>
            <p>Review this user's account details and recent activity.</p>
          </div>

          <button
            className="user-details-remove-btn"
            type="button"
            disabled={!canRemoveUser}
            title={
              isAdminProfile
                ? "Admin accounts are protected"
                : !isEditing
                  ? "Turn on edit mode to remove users"
                  : isCurrentUser
                    ? "You cannot remove your own account here"
                    : "Remove user"
            }
            onClick={() => {
              if (!canRemoveUser) return;
              setShowRemoveConfirm(true);
            }}
          >
            <TrashIcon />
            Remove user
          </button>
        </div>

        <div className="user-details-form-card">
          <div className="user-details-field">
            <label htmlFor="user-details-name">Name</label>
            <input
              id="user-details-name"
              value={isEditing ? draft.name : user.name || "-"}
              readOnly={!isEditing}
              disabled={!isEditing}
              onChange={(event) => updateDraft("name", event.target.value)}
            />
          </div>

          <div className="user-details-field">
            <label htmlFor="user-details-username">Username</label>
            <input
              id="user-details-username"
              value={isEditing ? draft.username : user.username || "-"}
              readOnly={!isEditing}
              disabled={!isEditing}
              onChange={(event) => updateDraft("username", event.target.value)}
            />
          </div>

          <div className="user-details-field">
            <label htmlFor="user-details-email">Email</label>
            <input id="user-details-email" value={user.email || "-"} readOnly disabled />
          </div>

          <div className="user-details-field">
            <label htmlFor="user-details-role">Role</label>
            <input id="user-details-role" value={user.role || "user"} readOnly disabled />
          </div>

          <div className="user-details-actions" ref={saveActionsRef}>
            {isEditing ? (
              <>
                <button id="admin-user-detail-save-btn" className="table-action-btn primary" type="button" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
                <button id="admin-user-detail-cancel-btn" className="table-action-btn secondary" type="button" onClick={cancelEdit} disabled={isSaving}>
                  Cancel
                </button>
              </>
            ) : (
              <button id="admin-user-detail-edit-btn" className="table-action-btn primary" type="button" onClick={() => setIsEditing(true)}>
                Edit user
              </button>
            )}
          </div>
        </div>

        <div className="user-details-activity">
          <div className="user-details-section-heading">
            <h4>User activity</h4>

            {activity.length > 0 && (
              <div className="expense-pagination user-details-activity-pagination" aria-label="User activity pagination">
                <span>{showingStart}-{showingEnd} of {activity.length}</span>
                <button
                  type="button"
                  aria-label="Previous user activity page"
                  disabled={safePage <= 1}
                  onClick={() => requestGuardedLeave(() => {
                    cancelEdit();
                    setPage((current) => Math.max(1, current - 1));
                  })}
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  aria-label="Next user activity page"
                  disabled={safePage >= totalPages}
                  onClick={() => requestGuardedLeave(() => {
                    cancelEdit();
                    setPage((current) => Math.min(totalPages, current + 1));
                  })}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            )}
          </div>

          {activity.length === 0 ? (
            <div className="empty-table-cell">No activity recorded for this user.</div>
          ) : (
            <div className="admin-table-shell user-details-activity-shell">
              <table className="admin-table user-details-activity-table">
                <thead>
                  <tr>
                    <th><span className="th-text">Action</span></th>
                    <th><span className="th-text">Details</span></th>
                    <th><span className="th-text">Time</span></th>
                  </tr>
                </thead>

                <tbody>
                  {pageActivity.map((item, index) => {
                    const details = item.details || "-";
                    const time = formatDateTime(item.created_at || item.createdAt);

                    return (
                      <tr key={item.id || index}>
                        <td>
                          <span className={`admin-activity-action ${getActionClass(item.action)}`}>
                            {getActionLabel(item.action)}
                          </span>
                        </td>
                        <td><span className="admin-cell-text" title={details}>{details}</span></td>
                        <td><span className="admin-cell-text" title={time}>{time}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pendingLeaveAction && createPortal(
        <div className="unsaved-changes-modal show user-details-unsaved-modal" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card user-details-unsaved-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-unsaved-title"
            aria-describedby="user-details-unsaved-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close unsaved changes confirmation"
              onClick={keepEditing}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="user-details-unsaved-title">Unsaved changes</h3>
              <p id="user-details-unsaved-message">Are you sure you want to leave this user profile?</p>
              <p>Your changes will be lost.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button className="table-action-btn primary" type="button" onClick={keepEditing}>
                Keep editing
              </button>
              <button
                className="table-action-btn secondary"
                type="button"
                onClick={() => {
                  const action = pendingLeaveAction;
                  setPendingLeaveAction(null);
                  action?.();
                }}
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showRemoveConfirm && createPortal(
        <div className="unsaved-changes-modal show delete-user-modal" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card delete-user-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-user-title"
            aria-describedby="remove-user-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close remove user confirmation"
              onClick={() => setShowRemoveConfirm(false)}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="remove-user-title">Remove User</h3>
              <p id="remove-user-message">Are you sure you want to remove {userLabel}?</p>
              <p>This also removes their expenses.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button className="table-action-btn primary" type="button" onClick={() => setShowRemoveConfirm(false)}>
                Keep user
              </button>
              <button className="table-action-btn secondary" type="button" onClick={confirmRemoveUser}>
                Remove user
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default UserDetailsModal;
