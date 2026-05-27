import { useEffect } from "react";

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast, onClose]);

  if (!toast) return null;

  const toastType = toast.type || "success";

  return (
    <div
      id="app-toast"
      className={`app-toast show ${toastType}`}
      aria-live={toastType === "error" ? "assertive" : "polite"}
      role="status"
    >
      <span className="app-toast-icon" aria-hidden="true"></span>
      <span id="app-toast-message" className="app-toast-message">
        <span className="app-toast-body">{toast.message}</span>
      </span>
      <button id="app-toast-close" className="app-toast-close" type="button" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export default Toast;
