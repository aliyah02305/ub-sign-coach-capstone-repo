import React, { useRef, useEffect, useState } from "react";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import * as cam from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

// Newer builds export HAND_CONNECTIONS directly; older ones expose it on Hands.
const CONNECTIONS = HAND_CONNECTIONS || Hands.HAND_CONNECTIONS;

function CameraView({ onResults }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const onResultsRef = useRef(onResults);

  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Always keep the callback ref up to date
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Start MediaPipe + camera only after user allows camera access
  useEffect(() => {
    if (!cameraAllowed) return;

    setIsLoading(true);
    setError(null);

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (!canvasRef.current || !videoRef.current) return;

      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const ctx = canvasRef.current.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, videoWidth, videoHeight);
      ctx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

      if (results.multiHandLandmarks?.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
          });
          drawLandmarks(ctx, landmarks, {
            color: "#FF0000",
            lineWidth: 2,
          });
          // Landmarks are passed through in raw (unmirrored) camera space.
          // The mirroring below is display-only.
          if (onResultsRef.current) {
            onResultsRef.current(landmarks);
          }
        }
      }

      ctx.restore();
      setIsLoading(false);
    });

    const startCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });

        const camera = new cam.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        await camera.start();
      } catch (err) {
        console.error("Camera error:", err);
        setError(
          err.name === "NotAllowedError"
            ? "Camera permission was denied. Please allow camera access in your browser settings and try again."
            : `Camera error: ${err.message}`
        );
        setCameraAllowed(false);
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, [cameraAllowed]);

  // ─── Placeholder (before permission) ─────────────────────────────────────────
  if (!cameraAllowed) {
    return (
      <div style={styles.placeholder}>
        <div style={styles.cameraIconWrapper}>
          <svg
            width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="#a78bfa" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>

        <p style={styles.placeholderTitle}>Camera Preview</p>
        <p style={styles.placeholderSub}>
          Your camera feed will appear here during a live session
        </p>

        {error && <p style={styles.errorText}>{error}</p>}

        <button
          style={styles.allowBtn}
          onClick={() => setCameraAllowed(true)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(109,40,217,0.85)")}
        >
          Allow Camera Access
        </button>
      </div>
    );
  }

  // ─── Live camera view ─────────────────────────────────────────────────────────
  return (
    <div style={styles.liveWrapper}>
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <canvas ref={canvasRef} style={styles.canvas} />

      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Initialising hand tracking…</p>
        </div>
      )}

      {!isLoading && (
        <div style={styles.liveBadge}>
          <span style={styles.liveDot} />
          LIVE
        </div>
      )}

      <button
        style={styles.stopBtn}
        onClick={() => {
          if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
          }
          setCameraAllowed(false);
        }}
      >
        ✕ Stop Camera
      </button>
    </div>
  );
}

const styles = {
  placeholder: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "12px", width: "100%", height: "100%",
    minHeight: "280px", background: "rgba(255,255,255,0.03)",
    borderRadius: "12px", padding: "32px", boxSizing: "border-box", textAlign: "center",
  },
  cameraIconWrapper: {
    width: "80px", height: "80px", borderRadius: "16px",
    background: "rgba(167,139,250,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px",
  },
  placeholderTitle: { margin: 0, fontSize: "16px", fontWeight: 600, color: "#e2e8f0" },
  placeholderSub: { margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "240px", lineHeight: 1.5 },
  errorText: {
    margin: 0, fontSize: "12px", color: "#f87171", maxWidth: "280px", lineHeight: 1.4,
    background: "rgba(248,113,113,0.1)", padding: "8px 12px", borderRadius: "8px",
  },
  allowBtn: {
    marginTop: "8px", padding: "10px 22px", border: "none", borderRadius: "8px",
    background: "rgba(109,40,217,0.85)", color: "#fff", fontSize: "14px",
    fontWeight: 600, cursor: "pointer", transition: "background 0.2s",
  },
  liveWrapper: {
    position: "relative", width: "100%", borderRadius: "12px",
    overflow: "hidden", background: "#000", lineHeight: 0,
  },
  // scaleX(-1) mirrors the video and the hand overlay together (display only)
  canvas: {
    width: "100%",
    maxWidth: "100%",
    display: "block",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  loadingOverlay: {
    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "12px",
    background: "rgba(10,10,20,0.8)",
  },
  spinner: {
    width: "36px", height: "36px", borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#7c3aed",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { margin: 0, color: "#94a3b8", fontSize: "13px" },
  liveBadge: {
    position: "absolute", top: "12px", left: "12px", display: "flex",
    alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)", color: "#fff", fontSize: "11px", fontWeight: 700,
    letterSpacing: "0.08em", padding: "4px 10px", borderRadius: "20px",
  },
  liveDot: {
    width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444",
    display: "inline-block", animation: "pulse 1.4s ease-in-out infinite",
  },
  stopBtn: {
    position: "absolute", bottom: "12px", right: "12px", padding: "6px 14px",
    border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px",
    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
    color: "#e2e8f0", fontSize: "12px", fontWeight: 600, cursor: "pointer",
  },
};

if (typeof document !== "undefined" && !document.getElementById("cameraview-keyframes")) {
  const style = document.createElement("style");
  style.id = "cameraview-keyframes";
  style.textContent = `
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  `;
  document.head.appendChild(style);
}

export default CameraView;