import { useEffect, useState } from "react";
import { signLabel } from "../lib/handLogic";

// Reference picture of the sign the student must perform.
// Images live in  public/signs/  and are named  <CODE>-sign.<ext>
//   A-sign.jpg, B-sign.jpg, C-sign.png, HELLO-sign.jpg, THANK_YOU-sign.png, ONE-sign.jpg ...
// The component tries several extensions, so mixed .jpg / .png files are fine.
const EXTS = ["jpg", "png", "PNG", "jpeg", "webp"];

const GOLD = "#9d7507";
const MAROON = "#6B1A28";

export default function SignGuide({ sign }) {
  const [extIdx, setExtIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(true);

  // new target sign -> start over with the first extension
  useEffect(() => {
    setExtIdx(0);
    setFailed(false);
  }, [sign]);

  if (!sign) return null;

  const src = `/signs/${sign}-sign.${EXTS[extIdx]}`;
  const onError = () => {
    if (extIdx < EXTS.length - 1) setExtIdx(extIdx + 1);
    else setFailed(true);
  };

  // collapsed: small pill so the student can bring the guide back
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 5,
          padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}
      >
         Show guide
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute", top: 12, right: 12, zIndex: 5, width: 138,
        background: "rgba(255,255,255,0.97)", borderRadius: 14, overflow: "hidden",
        border: "1px solid rgba(229,193,108,0.9)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        lineHeight: 1.3, fontFamily: "inherit",
      }}
    >
      {/* header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 8px 6px 10px", background: "#FDF6E2", borderBottom: "1px solid rgba(229,193,108,0.7)",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD }}>
          Sign guide
        </span>
        <button
          onClick={() => setOpen(false)}
          title="Hide guide"
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            fontSize: 16, lineHeight: 1, color: "#8C6D73", padding: "0 2px", fontFamily: "inherit",
          }}
        >×</button>
      </div>

      {/* picture */}
      <div style={{
        height: 156, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff", padding: 6, boxSizing: "border-box",
      }}>
        {failed ? (
          <div style={{ textAlign: "center", color: "#8C6D73", fontSize: 11, padding: "0 6px" }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>🖐️</div>
            No guide image yet
          </div>
        ) : (
          <img
            key={src}
            src={src}
            alt={signLabel(sign)}
            onError={onError}
            draggable={false}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
          />
        )}
      </div>

      {/* label */}
      <div style={{
        padding: "6px 8px", textAlign: "center", background: "#FDF6E2",
        borderTop: "1px solid rgba(229,193,108,0.7)",
        fontSize: 12, fontWeight: 700, color: MAROON,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {signLabel(sign)}
      </div>
    </div>
  );
}