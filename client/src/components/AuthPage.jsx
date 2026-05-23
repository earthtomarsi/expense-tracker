import { useState } from "react";
import { login, register } from "../services/api.js";

function AuthPage({ onAuthSuccess, showToast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        const result = await login({
          login: form.username || form.email,
          password: form.password
        });
        onAuthSuccess(result);
        return;
      }

      await register({
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password
      });

      const result = await login({
        login: form.username || form.email,
        password: form.password
      });
      onAuthSuccess(result);
      showToast("Account created successfully.");
    } catch (submitError) {
      setError(submitError.message);
      showToast(submitError.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-copy">
        <p className="auth-kicker">Spendflow</p>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>
          Track expenses, review spending patterns, and manage your account from one dashboard.
        </p>
      </div>

      <div className="auth-card">
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            type="button"
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            type="button"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Marsi"
              />
            </label>
          )}

          <label>
            {mode === "login" ? "Email or username" : "Username"}
            <input
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder={mode === "login" ? "admin or admin@example.com" : "marsi"}
              autoComplete="username"
            />
          </label>

          {mode === "register" && (
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="marsi@example.com"
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="password123"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AuthPage;
