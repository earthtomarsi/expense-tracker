import { useEffect, useRef, useState } from "react";

function Header({ user, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);
  const displayName = user?.name || user?.username || "Log in";

  const closeProfileMenu = () => {
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((currentValue) => !currentValue);
  };

  const handleProfileKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleProfileMenu();
    }

    if (event.key === "Escape") {
      closeProfileMenu();
    }
  };

  const handleLogoutClick = async () => {
    closeProfileMenu();
    await onLogout();
  };

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const handleDocumentClick = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        closeProfileMenu();
      }
    };

    const handleDocumentKeyDown = (event) => {
      if (event.key === "Escape") {
        closeProfileMenu();
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="header-full">
      <div className="header-left">
        <h1 id="brand-home" className="logo logo-clickable">
          Spend<span className="f">ƒ</span>low
        </h1>
        <p>Track your spending</p>
      </div>

      <div className="header-right">
        {user && (
          <div
            ref={profileRef}
            className={`profile${isProfileMenuOpen ? " menu-open" : ""}`}
          >
            <div className="profile-info">
              <div
                className={`username-wrapper${isProfileMenuOpen ? " active" : ""}`}
                role="button"
                tabIndex="0"
                aria-expanded={isProfileMenuOpen}
                aria-controls="dropdown"
                onClick={toggleProfileMenu}
                onKeyDown={handleProfileKeyDown}
              >
                <span className="username">{displayName}</span>
                <span className="arrow">›</span>
              </div>

              <div id="dropdown" className="dropdown">
                <button
                  id="logout-btn"
                  className="logout-btn"
                  type="button"
                  onClick={handleLogoutClick}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;