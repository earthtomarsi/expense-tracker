function Header({ user, onLogout }) {
  const displayName = user?.name || user?.username || "Log in";

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
          <div className="profile">
            <div className="profile-info">
              <div
                className="username-wrapper"
                role="button"
                tabIndex="0"
                aria-expanded="false"
                aria-controls="dropdown"
              >
                <span className="username">{displayName}</span>
                <span className="arrow">›</span>
              </div>

              <div id="dropdown" className="dropdown">
                <button id="logout-btn" className="logout-btn" type="button" onClick={onLogout}>
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
