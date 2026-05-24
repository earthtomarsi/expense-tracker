import { useEffect, useRef, useState } from "react";

function Header({ user, onHome, onManageAccount, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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

  const handleManageAccountClick = () => {
    closeProfileMenu();
    onManageAccount?.();
  };

  const handleLogoutClick = async () => {
    closeProfileMenu();
    await onLogout?.();
  };


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
    <header className={`header-full${isScrolled ? " is-scrolled" : ""}`}>
      <div className="header-left">
        <button
          id="brand-home"
          className="logo logo-clickable logo-button"
          type="button"
          onClick={onHome}
        >
          Spend<span className="f">ƒ</span>low
        </button>
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
                  className="logout-btn"
                  type="button"
                  onClick={handleManageAccountClick}
                >
                  Manage Account
                </button>
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
