import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./react.css";
import AuthPage from "./components/AuthPage.jsx";
import Header from "./components/Header.jsx";
import Toast from "./components/Toast.jsx";
import UserDashboard from "./components/UserDashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import ManageAccountPanel from "./components/ManageAccountPanel.jsx";
import { getCurrentUser, logout as logoutRequest, setAuthToken } from "./services/api.js";

const TOKEN_STORAGE_KEY = "spendflowToken";
const USER_STORAGE_KEY = "spendflowUser";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

// App owns session state and routes users between auth, dashboard, admin, and account views.
function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [user, setUser] = useState(getStoredUser);
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(token));
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [adminEditGuard, setAdminEditGuard] = useState({
    isEditing: false,
    hasUnsavedChanges: false,
    discard: null,
    keepEditing: null
  });
  const [pendingAdminNavigation, setPendingAdminNavigation] = useState(null);

  const isAdmin = user?.role === "admin";

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const saveSession = (nextToken, nextUser) => {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setActiveView("dashboard");
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setAuthToken("");
    setToken("");
    setUser(null);
    setActiveView("dashboard");
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  useEffect(() => {
    if (!token) {
      setIsLoadingSession(false);
      return undefined;
    }

    setAuthToken(token);

    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!isMounted) return;
        setUser(currentUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!isMounted) return;
        clearSession();
      })
      .finally(() => {
        if (isMounted) setIsLoadingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAuthSuccess = ({ token: nextToken, user: nextUser }) => {
    saveSession(nextToken, nextUser);
    showToast(`Welcome, ${nextUser.name || nextUser.username}.`);
  };

  const handleUserUpdate = (nextUser) => {
    const mergedUser = { ...user, ...nextUser };
    setUser(mergedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
  };

  const handleLogout = async () => {
    if (requestAdminGuardedNavigation(async () => {
      try {
        await logoutRequest();
      } catch {
        // Local logout should still happen if the network request fails.
      } finally {
        clearSession();
        showToast("Logged out successfully.");
      }
    })) return;

    try {
      await logoutRequest();
    } catch {
      // Local logout should still happen if the network request fails.
    } finally {
      clearSession();
      showToast("Logged out successfully.");
    }
  };

  useEffect(() => {
    if (!adminEditGuard?.isEditing) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [adminEditGuard?.isEditing]);

  const keepEditingAdminChanges = () => {
    setPendingAdminNavigation(null);
    adminEditGuard?.keepEditing?.();
  };

  const leaveAdminChanges = () => {
    const action = pendingAdminNavigation;
    adminEditGuard?.discard?.();
    setPendingAdminNavigation(null);
    action?.();
  };

  const requestAdminGuardedNavigation = (action) => {
    if (user?.role === "admin" && activeView === "dashboard" && adminEditGuard?.isEditing) {
      setPendingAdminNavigation(() => action);
      return true;
    }

    return false;
  };

  const scrollToPageTop = () => {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  };

  const greeting = useMemo(() => {
    if (!user) return "Spendflow";
    return user.name || user.username || "User";
  }, [user]);

  const handleGoHome = () => {
    if (user?.role === "admin" && activeView === "dashboard") {
      scrollToPageTop();
      return;
    }

    if (requestAdminGuardedNavigation(() => setActiveView("dashboard"))) return;
    setActiveView("dashboard");

    if (user?.role === "admin") {
      scrollToPageTop();
    }
  };

  const handleOpenManageAccount = () => {
    if (requestAdminGuardedNavigation(() => setActiveView("manage-account"))) return;
    setActiveView("manage-account");
  };

  if (isLoadingSession) {
    return (
      <>
        <Header
          user={user}
          onHome={handleGoHome}
          onManageAccount={handleOpenManageAccount}
          onLogout={handleLogout}
        />
        <main>
          <div className="status-message">Loading your Spendflow session...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        user={user}
        onHome={handleGoHome}
        onManageAccount={handleOpenManageAccount}
        onLogout={handleLogout}
      />

      <main>
        {!user ? (
          <AuthPage onAuthSuccess={handleAuthSuccess} showToast={showToast} />
        ) : activeView === "manage-account" ? (
          <ManageAccountPanel
            currentUser={user}
            onUserUpdate={handleUserUpdate}
            showToast={showToast}
            onNavigateHome={handleGoHome}
            onLogout={handleLogout}
          />
        ) : isAdmin ? (
          <AdminDashboard currentUser={user} showToast={showToast} onAdminEditStateChange={setAdminEditGuard} />
        ) : (
          <UserDashboard
            currentUser={user}
            greeting={greeting}
            showToast={showToast}
          />
        )}
      </main>

      {pendingAdminNavigation && createPortal(
        <div className="unsaved-changes-modal show admin-app-unsaved-modal" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
          <div
            className="unsaved-changes-dialog-card admin-app-unsaved-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-app-unsaved-title"
            aria-describedby="admin-app-unsaved-message"
          >
            <button
              className="unsaved-changes-close-btn"
              type="button"
              aria-label="Close unsaved changes confirmation"
              onClick={keepEditingAdminChanges}
            >
              ×
            </button>

            <div className="unsaved-changes-icon" aria-hidden="true">!</div>

            <div className="unsaved-changes-copy">
              <h3 id="admin-app-unsaved-title">Unsaved changes</h3>
              <p id="admin-app-unsaved-message">Are you sure you want to leave this page?</p>
              <p>Your user edits will be lost.</p>
            </div>

            <div className="unsaved-changes-actions">
              <button className="table-action-btn primary" type="button" onClick={keepEditingAdminChanges}>
                Keep editing
              </button>
              <button className="table-action-btn secondary" type="button" onClick={leaveAdminChanges}>
                Leave without saving
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default App;
