import { useState } from "react";

const CATEGORIES = [
  "Bug / App problem",
  "Wrong lesson content",
  "AI feedback problem",
  "Camera / Hand detection issue",
  "Other",
];

export default function ReportModal({ open, onClose, user, role = "student" }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setCategory(CATEGORIES[0]);
    setMessage("");
    setError("");
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    if (!message.trim()) {
      setError("Please describe the problem.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user?.uid || user?.email,
          name: user?.name,
          email: user?.email,
          role,
          category,
          message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, padding: 28,
          width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <h3 style={{ margin: "8px 0", color: "#3a0d1c" }}>Report sent</h3>
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              Thank you! Your report was submitted to the admin.
            </p>
            <button onClick={handleClose} style={primaryBtn}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#3a0d1c" }}>🚩 Report an Issue</h3>
              <button onClick={handleClose} style={closeBtn} aria-label="Close">✕</button>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>
              Tell us what went wrong so we can fix it.
            </p>

            {error && <div style={errorBox}>{error}</div>}

            <label style={labelStyle}>CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label style={labelStyle}>DESCRIPTION</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the problem..."
              rows={5}
              maxLength={2000}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Sending..." : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700,
  letterSpacing: 1, color: "#374151", margin: "16px 0 6px",
};
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box",
};
const primaryBtn = {
  width: "100%", marginTop: 20, padding: "12px 16px", border: "none",
  borderRadius: 10, background: "#9a6f0a", color: "#fff",
  fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const closeBtn = {
  border: "none", background: "#f3f4f6", borderRadius: "50%",
  width: 30, height: 30, cursor: "pointer", fontSize: 14,
};
const errorBox = {
  background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
  padding: "10px 12px", borderRadius: 10, fontSize: 13, marginTop: 12,
};