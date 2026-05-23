import { useEffect } from "react";

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div id="app-toast" className={`app-toast ${toast.type || "success"}`} aria-live="polite">
      <span className="app-toast-icon" aria-hidden="true">
        {toast.type === "error" ? "!" : "✓"}
      </span>
      <span id="app-toast-message" className="app-toast-message">
        {toast.message}
      </span>
      <button id="app-toast-close" className="app-toast-close" type="button" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export default Toast;
