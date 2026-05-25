import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const ROWS_PER_PAGE = 6;
const roleOptions = [
  ["All", "All"],
  ["admin", "Admin"],
  ["user", "User"]
];
const sortOptions = [
  ["name-asc", "Name: A to Z"],
  ["name-desc", "Name: Z to A"],
  ["username-asc", "Username: A to Z"],
  ["username-desc", "Username: Z to A"]
];

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

function createDraftMap(users) {
  return Object.fromEntries(users.map((user) => [String(user.id), createDraft(user)]));
}

function hasDraftChanged(user, draft) {
  if (!draft) return false;

  return (
    String(user.name || "") !== String(draft.name || "") ||
    String(user.username || "") !== String(draft.username || "")
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M10.5 5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm4.2 9.7L19 19" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="M5.5 7.75 10 12.25l4.5-4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M5 12.5 9.2 16.7 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M7 7 17 17M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function ToolbarSelect({ id, value, options, openMenu, setOpenMenu, onChange, prefix = "" }) {
  const isOpen = openMenu === id;
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || options[0]?.[1] || "Select";
  const currentLabel = prefix ? `${prefix}: ${selectedLabel}` : selectedLabel;

  return (
    <div className={`toolbar-menu admin-toolbar-menu ${isOpen ? "open" : ""}`}>
      <button
        className="toolbar-menu-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : id)}
      >
        <span className="toolbar-menu-label">{currentLabel}</span>
        <span className="toolbar-chevron" aria-hidden="true"><ChevronDownIcon /></span>
      </button>

      {isOpen && (
        <div className="toolbar-dropdown-panel admin-toolbar-dropdown-panel" role="listbox">
          {options.map(([optionValue, optionLabel]) => (
            <button
              key={optionValue}
              className={optionValue === value ? "toolbar-option active" : "toolbar-option"}
              type="button"
              role="option"
              aria-selected={optionValue === value}
              onClick={() => {
                onChange(optionValue);
                setOpenMenu(null);
              }}
            >
              {optionLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminUsersPanel({ users, currentUser, onUpdateUser, onDeleteUser, onOpenDetails }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [openMenu, setOpenMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!openMenu) return undefined;

    const handlePointerDown = (event) => {
      if (event.target.closest(".admin-toolbar-menu")) return;
      setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu]);

  useEffect(() => {
    if (!pendingDelete) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingDelete]);

  useEffect(() => {
    if (!isEditing) return;

    setDrafts((current) => {
      const next = { ...current };
      users.forEach((user) => {
        if (!next[String(user.id)]) next[String(user.id)] = createDraft(user);
      });
      return next;
    });
  }, [users, isEditing]);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...users]
      .filter((user) => {
        if (roleFilter !== "All" && user.role !== roleFilter) return false;

        if (!query) return true;

        return [user.name, user.username, user.email, user.role]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const aName = String(a.name || "").toLowerCase();
        const bName = String(b.name || "").toLowerCase();
        const aUsername = String(a.username || "").toLowerCase();
        const bUsername = String(b.username || "").toLowerCase();

        if (sort === "name-desc") return bName.localeCompare(aName);
        if (sort === "username-asc") return aUsername.localeCompare(bUsername) || aName.localeCompare(bName);
        if (sort === "username-desc") return bUsername.localeCompare(aUsername) || aName.localeCompare(bName);

        return aName.localeCompare(bName) || aUsername.localeCompare(bUsername);
      });
  }, [users, search, roleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const pageUsers = visibleUsers.slice(startIndex, endIndex);
  const showingStart = visibleUsers.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, visibleUsers.length);

  const resetToFirstPage = (callback) => {
    setPage(1);
    callback();
  };

  const startEdit = () => {
    setDrafts(createDraftMap(users));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDrafts({});
    setIsEditing(false);
  };

  const updateDraft = (userId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [String(userId)]: {
        ...(current[String(userId)] || {}),
        [field]: value
      }
    }));
  };

  const saveUserDraft = async (user) => {
    const draft = drafts[String(user.id)];
    if (!draft || !hasDraftChanged(user, draft)) return true;

    return onUpdateUser(user.id, {
      name: String(draft.name || "").trim(),
      username: String(draft.username || "").trim()
    });
  };

  const resetUserDraft = (user) => {
    setDrafts((current) => ({
      ...current,
      [String(user.id)]: createDraft(user)
    }));
  };

  const saveAllDrafts = async () => {
    const changedUsers = users.filter((user) => hasDraftChanged(user, drafts[String(user.id)]));

    if (changedUsers.length === 0) {
      cancelEdit();
      return;
    }

    setIsSaving(true);

    try {
      const results = await Promise.all(changedUsers.map((user) => saveUserDraft(user)));
      if (results.every(Boolean)) cancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("All");
    setSort("name-asc");
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const success = await onDeleteUser(pendingDelete.id);
    if (success) {
      setPendingDelete(null);
      setDrafts((current) => {
        const next = { ...current };
        delete next[String(pendingDelete.id)];
        return next;
      });
    }
  };

  return (
    <section className={`admin-users-panel ${isEditing ? "is-editing" : ""}`}>
      <div className="admin-users-toolbar admin-toolbar-grid" aria-label="Admin users controls">
        <div className="admin-search-field">
          <label className="sr-only" htmlFor="admin-user-search">Search users</label>
          <input
            id="admin-user-search"
            type="text"
            placeholder="Search users"
            value={search}
            onChange={(event) => resetToFirstPage(() => setSearch(event.target.value))}
          />
          <span className="admin-search-icon" aria-hidden="true"><SearchIcon /></span>
        </div>

        <ToolbarSelect
          id="role"
          value={roleFilter}
          options={roleOptions}
          prefix="Role"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(value) => resetToFirstPage(() => setRoleFilter(value))}
        />

        <ToolbarSelect
          id="sort"
          value={sort}
          options={sortOptions}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(value) => resetToFirstPage(() => setSort(value))}
        />

        <button className="toolbar-clear" type="button" onClick={clearFilters}>
          Clear
        </button>
      </div>

      <div className="admin-table-shell admin-users-table-shell">
        <table className={`admin-table admin-users-table ${isEditing ? "edit-mode" : ""}`}>
          <thead>
            <tr>
              <th><span className="th-text">Name</span></th>
              <th><span className="th-text">Username</span></th>
              <th><span className="th-text">Email</span></th>
              <th><span className="th-text">Role</span></th>
              <th><span className="th-text">Created</span></th>
              <th className="actions-header" aria-label="Actions"></th>
            </tr>
          </thead>

          <tbody>
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table-cell">
                  No users found
                </td>
              </tr>
            ) : (
              pageUsers.map((user) => {
                const isAdmin = user.role === "admin";
                const draft = drafts[String(user.id)] || createDraft(user);
                const userLabel = user.name || user.username || "User";
                const isCurrentUser = String(currentUser?.id ?? currentUser?.userID ?? "") === String(user.id);

                return (
                  <tr key={user.id} className={isEditing ? "admin-user-edit-row" : "admin-user-read-row"}>
                    <td className="admin-users-name-cell">
                      {isEditing ? (
                        <input
                          className="table-edit-input admin-table-edit-input"
                          aria-label={`Name for ${userLabel}`}
                          value={draft.name}
                          title={draft.name}
                          onChange={(event) => updateDraft(user.id, "name", event.target.value)}
                        />
                      ) : (
                        <button
                          className="admin-name-link admin-cell-text"
                          type="button"
                          title={userLabel}
                          onClick={() => onOpenDetails(user)}
                        >
                          {userLabel}
                        </button>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="table-edit-input admin-table-edit-input"
                          aria-label={`Username for ${userLabel}`}
                          value={draft.username}
                          title={draft.username}
                          onChange={(event) => updateDraft(user.id, "username", event.target.value)}
                        />
                      ) : (
                        <span className="admin-cell-text" title={user.username || "-"}>{user.username || "-"}</span>
                      )}
                    </td>

                    <td><span className="admin-cell-text" title={user.email || "-"}>{user.email || "-"}</span></td>

                    <td>
                      <span className={`admin-role-badge ${isAdmin ? "admin" : "user"}`}>
                        {user.role || "user"}
                      </span>
                    </td>

                    <td><span className="admin-cell-text" title={formatDate(user.created_at || user.createdAt)}>{formatDate(user.created_at || user.createdAt)}</span></td>

                    <td className="actions-cell">
                      <div className="row-actions" aria-label={`Actions for ${userLabel}`}>
                        {isEditing ? (
                          <>
                            <button
                              className="row-icon-btn cancel-row-btn"
                              type="button"
                              aria-label={`Reset changes for ${userLabel}`}
                              title="Reset row changes"
                              onClick={() => resetUserDraft(user)}
                            >
                              <XIcon />
                            </button>

                            <button
                              className="row-icon-btn save-row-btn"
                              type="button"
                              aria-label={`Save ${userLabel}`}
                              title="Save row changes"
                              onClick={() => saveUserDraft(user)}
                              disabled={isSaving}
                            >
                              <CheckIcon />
                            </button>

                            <button
                              className="row-icon-btn delete-row-btn"
                              type="button"
                              aria-label={`Remove ${userLabel}`}
                              title={isAdmin ? "Admin accounts are protected" : isCurrentUser ? "You cannot remove your own account here" : "Remove user"}
                              disabled={isAdmin || isCurrentUser}
                              onClick={() => setPendingDelete(user)}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        ) : (
                          <button
                            className="row-icon-btn edit-row-btn"
                            type="button"
                            aria-label={`Open ${userLabel} details`}
                            title="View user details"
                            onClick={() => onOpenDetails(user)}
                          >
                            <PencilIcon />
                          </button>
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

      <div className="admin-users-footer">
        <div className="expense-pagination admin-users-pagination" aria-label="Users pagination">
          <span>{showingStart}-{showingEnd} of {visibleUsers.length}</span>
          <button
            type="button"
            aria-label="Previous users page"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label="Next users page"
            disabled={safePage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="admin-users-edit-actions">
          {isEditing ? (
            <>
              <button className="table-action-btn primary" type="button" onClick={saveAllDrafts} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button className="table-action-btn secondary" type="button" onClick={cancelEdit} disabled={isSaving}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="table-action-btn primary" type="button" onClick={startEdit}>
                Edit
              </button>
              <button className="table-action-btn secondary" type="button" disabled>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {pendingDelete && createPortal(
        <div className="unsaved-changes-modal show delete-user-modal" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card delete-user-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            aria-describedby="delete-user-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close remove user confirmation"
              onClick={() => setPendingDelete(null)}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="delete-user-title">Remove User</h3>
              <p id="delete-user-message">
                Are you sure you want to remove <strong>{pendingDelete.name || pendingDelete.username}</strong>?
              </p>
              <p>This also removes their expenses.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button className="table-action-btn primary" type="button" onClick={() => setPendingDelete(null)}>
                Keep user
              </button>
              <button className="table-action-btn secondary" type="button" onClick={confirmDelete}>
                Remove user
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

export default AdminUsersPanel;
