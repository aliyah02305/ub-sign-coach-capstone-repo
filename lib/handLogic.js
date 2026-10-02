 console.log("HANDLOGIC FILE VERSION: 2");

// Helper: is finger extended?
const isUp = (landmarks, tip, pip) => landmarks[tip].y < landmarks[pip].y;

// Helper: euclidean distance between two landmarks
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Detect which sign is currently being shown
export const detectCurrentSign = (landmarks) => {
  if (!landmarks || landmarks.length < 21) return null;

  const indexUp  = isUp(landmarks, 8, 6);
  const middleUp = isUp(landmarks, 12, 10);
  const ringUp   = isUp(landmarks, 16, 14);
  const pinkyUp  = isUp(landmarks, 20, 18);
  const thumbOut = Math.abs(landmarks[4].x - landmarks[2].x) > 0.08;
  const thumbUp  = landmarks[4].y < landmarks[3].y;

  // distances used for pinch / curl / wrap detection
  const thumbToIndexTip  = dist(landmarks[4], landmarks[8]);
  const thumbToMiddleTip = dist(landmarks[4], landmarks[12]);
  const thumbToRingTip   = dist(landmarks[4], landmarks[16]);
  const thumbToPinkyTip  = dist(landmarks[4], landmarks[20]);
  const indexMiddleGap   = dist(landmarks[8], landmarks[12]);

  // "L" - index + thumb out, rest down
  if (indexUp && thumbOut && !middleUp && !ringUp && !pinkyUp) return "L";

  // "Y" - pinky + thumb out, rest down
  if (!indexUp && !middleUp && !ringUp && pinkyUp && thumbOut) return "Y";

  // "D" - index up, middle + ring + pinky curled, thumb touches middle
  if (indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut) return "D";

  // "B" - all four fingers up, thumb tucked
  if (indexUp && middleUp && ringUp && pinkyUp && !thumbOut) return "B";

  // "E" - all fingers curled, thumb tucked under
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut && !thumbUp) return "E";

  // "A" - all fingers curled into fist, thumb to side
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbOut) return "A";

  // "S" - fist, thumb wrapped ACROSS front of fingers (not to the side)
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut && thumbToIndexTip < 0.07) return "S";

  // "T" - fist, thumb tucked between index and middle
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut && thumbToIndexTip < 0.09 && thumbToMiddleTip < 0.09) return "T";

  // "M" - fist, thumb tucked under index+middle+ring
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbToRingTip < 0.08) return "M";

  // "N" - fist, thumb tucked under index+middle only
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbToMiddleTip < 0.08) return "N";

  // "O" - fingers curved, fingertips touching thumb (circle shape)
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbToIndexTip < 0.05) return "O";

  // "C" - curved hand, fingers half-bent, NOT fully touching thumb like O
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbToIndexTip >= 0.05 && thumbToIndexTip < 0.12) return "C";

  // "F" - index + thumb touch, middle + ring + pinky up
  if (!indexUp && middleUp && ringUp && pinkyUp && !thumbOut) return "F";

  // "I" - only pinky up
  if (!indexUp && !middleUp && !ringUp && pinkyUp && !thumbOut) return "I";

  // "K" - index + middle up (spread apart), thumb out between them
  if (indexUp && middleUp && !ringUp && !pinkyUp && thumbOut && indexMiddleGap > 0.06) return "K";

  // "V" - index + middle up, thumb in, ring + pinky down
  if (indexUp && middleUp && !ringUp && !pinkyUp && !thumbOut) return "V";

  // "U" - index + middle up, close together, thumb tucked
  if (indexUp && middleUp && !ringUp && !pinkyUp && !thumbOut && indexMiddleGap <= 0.06) return "U";

  // "R" - index + middle up and CROSSED (middle over index)
  if (indexUp && middleUp && !ringUp && !pinkyUp && landmarks[12].x < landmarks[8].x) return "R";

  // "H" - index + middle up, together, sideways orientation (thumb out)
  if (indexUp && middleUp && !ringUp && !pinkyUp && thumbOut && indexMiddleGap <= 0.06) return "H";

  // "W" - index + middle + ring up, pinky down
  if (indexUp && middleUp && ringUp && !pinkyUp && !thumbOut) return "W";

  // "G" - index up only, pointing sideways, thumb out and parallel to index
  if (indexUp && !middleUp && !ringUp && !pinkyUp && thumbOut && thumbUp) return "G";

  // "Q" - similar to G but pointing downward
  if (indexUp && !middleUp && !ringUp && !pinkyUp && thumbOut && !thumbUp) return "Q";

  // "P" - similar to K but pointing downward
  if (indexUp && middleUp && !ringUp && !pinkyUp && thumbOut && !thumbUp) return "P";

  // "X" - index hooked/bent (tip below pip but not fully curled), rest down
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut &&
      dist(landmarks[8], landmarks[5]) > dist(landmarks[6], landmarks[5])) return "X";

  return null; // Unknown
};

// Check if detected sign matches target
export const detectSign = (landmarks, targetSign) => {
  const detected = detectCurrentSign(landmarks);
  return detected === targetSign;
};

// All supported STATIC signs (J and Z require motion tracking, not included here)
export const SUPPORTED_SIGNS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

// ---- MOTION-BASED DETECTION FOR J AND Z ----
// J and Z aren't static handshapes — they require tracing a path.
// We track the relevant fingertip's position over the last ~20 frames
// and check if that trail matches the expected shape.

// Call this every frame to build a short trail of points (keeps it capped in length)
export const pushToTrail = (trail, point, maxLength = 20) => {
  const updated = [...trail, point];
  if (updated.length > maxLength) updated.shift();
  return updated;
};

// "J" — starts in the "I" handshape (only pinky up), pinky traces a
// downward hook: drops down, then curves sideways.
export const detectJMotion = (trail) => {
  if (trail.length < 10) return false;
  const start = trail[0];
  const end = trail[trail.length - 1];
  const mid = trail[Math.floor(trail.length / 2)];

  const droppedDown    = end.y - start.y > 0.08;
  const curvedSideways = Math.abs(end.x - start.x) > 0.05;
  const bentPath        = Math.abs(mid.x - start.x) < Math.abs(end.x - start.x) * 0.6;

  return droppedDown && curvedSideways && bentPath;
};

// "Z" — index finger points, traces a zigzag: right, diagonal, right again.
export const detectZMotion = (trail) => {
  if (trail.length < 12) return false;
  let directionChanges = 0;
  let lastDirection = null;

  for (let i = 1; i < trail.length; i++) {
    const dx = trail[i].x - trail[i - 1].x;
    if (Math.abs(dx) < 0.005) continue; // ignore jitter
    const direction = dx > 0 ? "right" : "left";
    if (lastDirection && direction !== lastDirection) directionChanges++;
    lastDirection = direction;
  }
  return directionChanges >= 2;
};