import { useCallback, useEffect, useMemo, useState } from "react";
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

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [user, setUser] = useState(getStoredUser);
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(token));
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");

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
    try {
      await logoutRequest();
    } catch {
      // Local logout should still happen if the network request fails.
    } finally {
      clearSession();
      showToast("Logged out successfully.");
    }
  };

  const greeting = useMemo(() => {
    if (!user) return "Spendflow";
    return user.name || user.username || "User";
  }, [user]);

  const handleGoHome = () => {
    setActiveView("dashboard");
  };

  const handleOpenManageAccount = () => {
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
          />
        ) : isAdmin ? (
          <AdminDashboard currentUser={user} showToast={showToast} />
        ) : (
          <UserDashboard
            currentUser={user}
            greeting={greeting}
            showToast={showToast}
          />
        )}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default App;
