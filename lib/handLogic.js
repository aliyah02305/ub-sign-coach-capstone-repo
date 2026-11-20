const REF = 0.2; // typical wrist->middle-MCP length; rule thresholds are tuned for this

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const handSize = (lm) => dist(lm[0], lm[9]) || 1e-6;

const angleAt = (a, b, c) => {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const cos = (v1x * v2x + v1y * v2y) / ((Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)) || 1e-6);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};

const fingerState = (lm, mcp, pip, dip, tip) => {
  const angle = (angleAt(lm[mcp], lm[pip], lm[dip]) + angleAt(lm[pip], lm[dip], lm[tip])) / 2;
  // reach = how far the tip is from the wrist compared with its own knuckle.
  // Separates a curled finger from a curved one even when it points at the camera.
  const reach = dist(lm[tip], lm[0]) / (dist(lm[mcp], lm[0]) || 1e-6);
  if (reach < 1.2) return "X";
  return angle >= 155 && reach >= 1.4 ? "S" : "C";
};

export const fingerStates = (lm) => ({
  i: fingerState(lm, 5, 6, 7, 8),
  m: fingerState(lm, 9, 10, 11, 12),
  r: fingerState(lm, 13, 14, 15, 16),
  p: fingerState(lm, 17, 18, 19, 20),
});

const LS_KEY = "ub-sign-samples-v1";
export const KNN_CONFIG = { k: 5, maxDist: 1.5, minShare: 0.5 };

let fileSamples = [];
let localSamples = [];
let merged = [];
let loadStarted = false;

const rebuild = () => { merged = fileSamples.concat(localSamples); };

const ensureLoaded = () => {
  if (loadStarted || typeof window === "undefined") return;
  loadStarted = true;
  try {
    const ls = window.localStorage.getItem(LS_KEY);
    if (ls) localSamples = JSON.parse(ls);
  } catch (e) { /* ignore */ }
  rebuild();
  fetch("/sign-samples.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((d) => { if (Array.isArray(d)) { fileSamples = d; rebuild(); } })
    .catch(() => {});
};

const persist = () => {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(localSamples)); } catch (e) { /* ignore */ }
};

export const toFeatures = (lm, mirror = false) => {
  const hs = handSize(lm);
  const w = lm[0];
  const v = [];
  for (let i = 1; i < 21; i++) {
    const x = (lm[i].x - w.x) / hs;
    const y = (lm[i].y - w.y) / hs;
    v.push(mirror ? -x : x, y);
  }
  return v;
};

const euclid = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
};

export const addSample = (label, lm) => {
  ensureLoaded();
  localSamples.push({ l: label, v: toFeatures(lm).map((n) => Math.round(n * 1000) / 1000) });
  rebuild();
  persist();
};

export const clearSamples = (label) => {
  ensureLoaded();
  localSamples = label ? localSamples.filter((s) => s.l !== label) : [];
  if (!label) fileSamples = [];
  else fileSamples = fileSamples.filter((s) => s.l !== label);
  rebuild();
  persist();
};

export const getSampleCounts = () => {
  ensureLoaded();
  const c = {};
  for (const s of merged) c[s.l] = (c[s.l] || 0) + 1;
  return c;
};

export const exportSamples = () => JSON.stringify(merged);

export const importSamples = (json) => {
  const d = typeof json === "string" ? JSON.parse(json) : json;
  if (Array.isArray(d)) { localSamples = localSamples.concat(d); rebuild(); persist(); }
};

const classifyKnn = (lm) => {
  ensureLoaded();
  if (merged.length < 5) return null;
  const q = toFeatures(lm);
  const qm = toFeatures(lm, true); // so a left hand matches samples recorded with a right hand
  const scored = merged.map((s) => ({ l: s.l, d: Math.min(euclid(s.v, q), euclid(s.v, qm)) }));
  scored.sort((a, b) => a.d - b.d);
  const top = scored.slice(0, KNN_CONFIG.k);
  if (top[0].d > KNN_CONFIG.maxDist) return null;
  const votes = {};
  let total = 0;
  for (const t of top) {
    const w = 1 / (t.d + 0.05);
    votes[t.l] = (votes[t.l] || 0) + w;
    total += w;
  }
  const [best, weight] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  return weight / total >= KNN_CONFIG.minShare ? best : null;
};

// ───────────────────────── STATIC SIGNS (rules) ─────────────────────────
const classifyRules = (lm) => {
  const hs = handSize(lm);
  const d = (i, j) => (dist(lm[i], lm[j]) / hs) * REF; // distance-invariant

  const st = fingerStates(lm);
  const indexUp = st.i === "S";
  const middleUp = st.m === "S";
  const ringUp = st.r === "S";
  const pinkyUp = st.p === "S";
  // thumb away from the palm – works at any hand angle (the old x-only check failed when the hand was rotated)
  const thumbOut = (Math.abs(lm[4].x - lm[2].x) / hs) * REF > 0.08 || d(4, 5) > 0.12;
  const thumbUp = lm[4].y < lm[3].y;
  const gap = d(8, 12); // index–middle tip gap

  const states = [st.i, st.m, st.r, st.p];
  const straightCount = states.filter((s) => s === "S").length;
  const curvedCount = states.filter((s) => s === "C").length;
  const closedCount = states.filter((s) => s === "X").length;

  const vx = lm[9].x - lm[0].x;
  const vy = lm[9].y - lm[0].y;
  const pointsSide = Math.abs(vx) > Math.abs(vy);

  const onlyIndex = indexUp && !middleUp && !ringUp && !pinkyUp;
  const indexMiddle = indexUp && middleUp && !ringUp && !pinkyUp;

  const indexPointsDown = (lm[8].y - lm[5].y) / hs > 0.25;

  if (indexPointsDown && onlyIndex && thumbOut) return "Q";
  if (indexPointsDown && indexMiddle && thumbOut) return "P";
  if (pointsSide && onlyIndex && thumbOut) return "G";
  if (pointsSide && indexMiddle && gap <= 0.06) return "H";

  if (closedCount === 0 && curvedCount >= 3 && straightCount <= 1) {
    return d(4, 8) < 0.05 ? "O" : "C";
  }

  if (onlyIndex && thumbOut) return "L";
  if (!indexUp && !middleUp && !ringUp && pinkyUp && thumbOut) return "Y";
  if (onlyIndex && !thumbOut) return "D";
  if (indexUp && middleUp && ringUp && pinkyUp && !thumbOut) return "B";

  if (indexMiddle && thumbOut) return gap > 0.06 ? "K" : "H";
  if (indexMiddle && !thumbOut) {
    const crossed = (lm[8].x - lm[12].x) * (lm[5].x - lm[9].x) < 0;
    if (crossed) return "R";
    return gap > 0.06 ? "V" : "U";
  }

  if (indexUp && middleUp && ringUp && !pinkyUp && !thumbOut) return "W";
  if (!indexUp && middleUp && ringUp && pinkyUp && !thumbOut) return "F";
  if (!indexUp && !middleUp && !ringUp && pinkyUp && !thumbOut) return "I";

  if (straightCount === 0) {
    // E: thumb tucked UNDER the curled fingers (thumb tip lower on screen than the fingertips).
    // Must come before T, A and S, otherwise S catches it (thumb tip is also close to the index tip).
    // Tune these two numbers with the "E-debug" console log if E is still hard to detect.
    const tipsY = (lm[8].y + lm[12].y + lm[16].y + lm[20].y) / 4;
    const thumbBelowTips = (lm[4].y - tipsY) / hs; // > 0 = thumb sits below the fingertips
    if (thumbBelowTips > 0.05 && d(4, 8) < 0.09 && !thumbUp) return "E";

    // T: thumb tip pokes up between the index and middle fingers (near BOTH of their middle joints).
    // Must come before A and S, otherwise they catch it first.
    if (d(4, 6) < 0.06 && d(4, 10) < 0.06) return "T";
    if (thumbOut) return "A";
    if (st.i === "C" && st.m === "X" && st.r === "X" && st.p === "X") return "X";
    if (d(4, 8) < 0.07) return "S";
    if (d(4, 16) < 0.08) return "M";
    if (d(4, 12) < 0.08) return "N";
    if (!thumbUp) return "E";
  }

  return null;
};


export const classifyNumber = (lm) => {
  if (!lm || lm.length < 21) return null;
  const hs = handSize(lm);
  const d = (i, j) => (dist(lm[i], lm[j]) / hs) * REF;
  const st = fingerStates(lm);
  const [i, m, r, p] = [st.i, st.m, st.r, st.p].map((x) => x === "S");
  const thumbOut = (Math.abs(lm[4].x - lm[2].x) / hs) * REF > 0.08 || d(4, 5) > 0.12;
  const TOUCH = 0.07;

  // 6–9: three fingers up, thumb touches the fourth finger
  if (i && m && r && !p && d(4, 20) < TOUCH) return "SIX";
  if (i && m && !r && p && d(4, 16) < TOUCH) return "SEVEN";
  if (i && !m && r && p && d(4, 12) < TOUCH) return "EIGHT";
  if (!i && m && r && p && d(4, 8) < TOUCH) return "NINE";

  if (i && !m && !r && !p && !thumbOut) return "ONE";
  if (i && m && !r && !p && !thumbOut) return "TWO";
  if (i && m && !r && !p && thumbOut) return "THREE";
  if (i && m && r && p && !thumbOut) return "FOUR";
  if (i && m && r && p && thumbOut) return "FIVE";
  return null;
};

const straightFingers = (lm) => {
  const st = fingerStates(lm);
  return [st.i, st.m, st.r, st.p].filter((x) => x === "S").length;
};

const thumbIsOut = (lm) => {
  const hs = handSize(lm);
  const d = (i, j) => (dist(lm[i], lm[j]) / hs) * REF;
  return (Math.abs(lm[4].x - lm[2].x) / hs) * REF > 0.08 || d(4, 5) > 0.12;
};

const TWO_HAND_NUMBERS = { 6: "SIX", 7: "SEVEN", 8: "EIGHT", 9: "NINE", 10: "TEN" };

export const classifyTwoHandNumber = (hands) => {
  if (!Array.isArray(hands) || hands.length < 2) return null;
  const [a, b] = hands;
  if (!a || !b || a.length < 21 || b.length < 21) return null;

  const ca = straightFingers(a);
  const cb = straightFingers(b);
  const [big, small] = ca >= cb ? [a, b] : [b, a];

  if (straightFingers(big) < 4) return null;        // one hand must be an open palm
  let n = straightFingers(small);
  if (n === 4 && thumbIsOut(small)) n = 5;
  if (n < 1) return null;
  return TWO_HAND_NUMBERS[5 + n] || null;
};

// Static letter only (trained samples first, rules as fallback). Used by the trainer page.
export const detectStaticSign = (lm) => {
  if (!lm || lm.length < 21) return null;
  return classifyKnn(lm) || classifyRules(lm);
};

// ───────────────────────── PUBLIC API (drop-in) ─────────────────────────
const HIT_HOLD_MS = 800;
let lastHit = null;

// Clear motion state – call when the target letter changes (optional but recommended).
export const resetMotion = () => {
  lastHit = null;
  defaultTracker.reset();
  defaultTracker.cooldownUntil = 0;
};

export const detectCurrentSign = (lm) => {
  if (!lm || lm.length < 21) return null;
  const now = performance.now();
  const motion = defaultTracker.update(lm, now);
  if (motion.sign) lastHit = { sign: motion.sign, t: now };
  if (lastHit && now - lastHit.t < HIT_HOLD_MS) return lastHit.sign;
  return detectStaticSign(lm);
};

const NUMBER_ALIAS = { ONE: ["D"], TWO: ["V"], FOUR: ["B"] };

export const detectSign = (landmarks, targetSign) => {
  if (typeof targetSign === "string" && targetSign.length > 1) {
    if (!landmarks || landmarks.length < 21) return false;
    // motion words (TEN) must be traced, so they go through the tracker
    if (isMotionSign(targetSign)) return detectCurrentSign(landmarks) === targetSign;
    return (
      classifyKnn(landmarks) === targetSign ||
      classifyNumber(landmarks) === targetSign ||
      (NUMBER_ALIAS[targetSign] || []).includes(detectStaticSign(landmarks))
    );
  }
  return detectCurrentSign(landmarks) === targetSign;
};

export const SUPPORTED_SIGNS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];

export const SIGN_GROUPS = [
  {
    key: "greetings", label: "Greetings",
    words: [
      ["HELLO", "Hello"], ["GOOD_MORNING", "Good morning"], ["GOOD_AFTERNOON", "Good afternoon"],
      ["GOOD_EVENING", "Good evening"], ["HOW_ARE_YOU", "How are you?"], ["NICE_TO_MEET_YOU", "Nice to meet you"],
      ["THANK_YOU", "Thank you"], ["PLEASE", "Please"], ["SORRY", "Sorry"], ["GOODBYE", "Goodbye"],
    ],
  },
  {
    key: "numbers", label: "Numbers",
    words: [
      ["ONE", "One"], ["TWO", "Two"], ["THREE", "Three"], ["FOUR", "Four"], ["FIVE", "Five"],
      ["SIX", "Six"], ["SEVEN", "Seven"], ["EIGHT", "Eight"], ["NINE", "Nine"], ["TEN", "Ten"],
      ["TWENTY", "Twenty"], ["THIRTY", "Thirty"], ["FORTY", "Forty"], ["FIFTY", "Fifty"],
      ["SIXTY", "Sixty"], ["SEVENTY", "Seventy"], ["EIGHTY", "Eighty"], ["NINETY", "Ninety"],
      ["ONE_HUNDRED", "One hundred"],
    ],
  },
  {
    key: "family", label: "Family",
    words: [
      ["MOTHER", "Mother"], ["FATHER", "Father"], ["SISTER", "Sister"], ["BROTHER", "Brother"],
      ["GRANDMOTHER", "Grandmother"], ["GRANDFATHER", "Grandfather"], ["AUNT", "Aunt"], ["UNCLE", "Uncle"],
      ["COUSIN", "Cousin"], ["BABY", "Baby"], ["FAMILY", "Family"], ["FRIEND", "Friend"],
    ],
  },
];

export const WORD_SIGNS = SIGN_GROUPS.flatMap((g) =>
  g.words.map(([code, label]) => ({ code, label, group: g.key }))
);

// Letters + words together (useful for the trainer page list)
export const ALL_SIGNS = [...SUPPORTED_SIGNS, ...WORD_SIGNS.map((w) => w.code)];

export const signLabel = (code) =>
  WORD_SIGNS.find((w) => w.code === code)?.label || `Sign ${code}`;

export const pushToTrail = (trail, point, maxLength = 40) => {
  const updated = [...trail, point];
  if (updated.length > maxLength) updated.shift();
  return updated;
};

function prepare(trail) {
  const s = trail.reduce((a, p) => a + p.s, 0) / trail.length;
  let start = 0;
  for (let i = 1; i < trail.length; i++) {
    if (Math.hypot(trail[i].x - trail[0].x, trail[i].y - trail[0].y) / s > 0.15) {
      start = Math.max(0, i - 1);
      break;
    }
  }
  const t = trail.slice(start);
  const o = t[0];
  return t.map((p) => ({ x: (p.x - o.x) / s, y: (p.y - o.y) / s, t: p.t }));
}

export const detectJMotion = (trail, hookDirection = "any") => {
  if (trail.length < 8) return false;
  const p = prepare(trail);
  if (p.length < 8) return false;

  const end = p[p.length - 1];
  const len = Math.hypot(end.x, end.y);
  if (len < 0.5) return false;

  let k = 0;
  let best = -1;
  for (let i = 0; i < p.length; i++) {
    const dd = Math.abs(p[i].x * end.y - p[i].y * end.x) / len;
    if (dd > best) { best = dd; k = i; }
  }
  const e = p[k];

  const dx1 = e.x, dy1 = e.y;                       // stroke 1: down
  const dx2 = end.x - e.x, dy2 = end.y - e.y;       // stroke 2: hook

  const downStroke = dy1 > 0.5 && Math.abs(dx1) < 0.6 * dy1;
  const hook = Math.abs(dx2) > 0.3 && dy2 <= 0.6 * Math.abs(dx2) && dy2 >= -1.2 * Math.abs(dx2);
  const dirOk =
    hookDirection === "any" || (hookDirection === "left" ? dx2 < 0 : dx2 > 0);

  return best > 0.2 && downStroke && hook && dirOk;
};

// "Z": index traces  →  then ↙ diagonal  then →  (or the mirror image)
export const detectZMotion = (trail) => {
  if (trail.length < 10) return false;
  const p = prepare(trail);
  if (p.length < 10) return false;
  const n = p.length;

  for (const dir of [1, -1]) {
    // A = end of stroke 1 (furthest along dir in the first 70%)
    let a = 0;
    for (let i = 0; i < Math.ceil(n * 0.7); i++) if (dir * p[i].x > dir * p[a].x) a = i;
    // B = end of the diagonal (furthest back after A)
    let b = a;
    for (let i = a; i < n; i++) if (dir * p[i].x < dir * p[b].x) b = i;

    const O = p[0], A = p[a], B = p[b], E = p[n - 1];
    const s1x = dir * (A.x - O.x), s1y = A.y - O.y;
    const s2x = dir * (B.x - A.x), s2y = B.y - A.y;
    const s3x = dir * (E.x - B.x), s3y = E.y - B.y;

    if (
      s1x > 0.4 && Math.abs(s1y) < 0.5 * s1x &&   // top bar
      s2x < -0.3 && s2y > 0.3 &&                  // diagonal down-back
      s3x > 0.4 && Math.abs(s3y) < 0.5 * s3x      // bottom bar
    ) return true;
  }
  return false;
};


const fingerFlags = (lm) => {
  const s = fingerStates(lm);
  return { i: s.i === "S", m: s.m === "S", r: s.r === "S", p: s.p === "S" };
};

export const HANDSHAPES = {
  pinky: (f) => f.p && !f.i && !f.m && !f.r,
  index: (f) => f.i && !f.m && !f.r && !f.p,
  indexMiddle: (f) => f.i && f.m && !f.r && !f.p,
  open: (f) => f.i && f.m && f.r && f.p,
  fist: (f) => !f.i && !f.m && !f.r && !f.p,
};

// thumb pointing clearly UP (tip above its own joint and well above the index knuckle)
const isThumbsUp = (lm) => {
  const hs = handSize(lm);
  return (lm[3].y - lm[4].y) / hs > 0.25 && (lm[5].y - lm[4].y) / hs > 0.4;
};

// Left-right shake: the tracked point swings one way, then back, at least `minTurns` times.
export const detectShakeMotion = (trail, { minSwing = 0.25, minTurns = 2, maxVertical = 0.8 } = {}) => {
  if (trail.length < 10) return false;
  const s = trail.reduce((a, p) => a + p.s, 0) / trail.length;
  const xs = trail.map((p) => p.x / s);
  const ys = trail.map((p) => p.y / s);
  if (Math.max(...ys) - Math.min(...ys) > maxVertical) return false; // moving around, not shaking

  let last = xs[0], dir = 0, turns = 0;
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - last;
    if (dir >= 0 && dx < -minSwing) { if (dir === 1) turns++; dir = -1; last = xs[i]; }
    else if (dir <= 0 && dx > minSwing) { if (dir === -1) turns++; dir = 1; last = xs[i]; }
    else if (dir === 1 && xs[i] > last) last = xs[i];
    else if (dir === -1 && xs[i] < last) last = xs[i];
  }
  return turns >= minTurns;
};

export const MOTION_SIGNS = {
  J: { tip: 20, shape: "pinky", detect: (trail, o) => detectJMotion(trail, o.hookDirection) },
  Z: { tip: 8, shape: "index", detect: (trail) => detectZMotion(trail) },
  TEN: {
    tip: 4,
    shape: (f, lm) => !f.i && !f.m && !f.r && !f.p && isThumbsUp(lm), // fist + thumb up
    detect: (trail) => detectShakeMotion(trail),
  },
};

export const SEQUENCE_CONFIG = {
  windowMs: 2000,
  minStartMs: 120,
  minFistMs: 80,
  maxGapMs: 1000,
  minDirSweep: 0.15,
  strictDirection: true,
};

export const SEQUENCE_SIGNS = {
  TWENTY:      { start: "ONE",   dir: "right" },
  THIRTY:      { start: "THREE", dir: "left" },
  FORTY:       { start: "FOUR",  dir: "left" },
  FIFTY:       { start: "FIVE",  dir: "left" },
  SIXTY:       { start: "SIX",   dir: "left" },
  SEVENTY:     { start: "SEVEN", dir: "left" },
  EIGHTY:      { start: "EIGHT", dir: "left" },
  NINETY:      { start: "NINE",  dir: "left" },
  ONE_HUNDRED: { start: "ONE",   dir: "left" },
};

export const isMotionSign = (letter) => letter in MOTION_SIGNS || letter in SEQUENCE_SIGNS;

const sequenceDigit = (lm) => {
  const f = fingerFlags(lm);
  if (f.i && !f.m && !f.r && !f.p) return "ONE";   // index lang (may thumb man o wala)
  const n = classifyNumber(lm);
  if (n) return n;
  const k = (f.i ? "i" : "") + (f.m ? "m" : "") + (f.r ? "r" : "") + (f.p ? "p" : "");
  return { imr: "SIX", imp: "SEVEN", irp: "EIGHT", mrp: "NINE" }[k] || null;
};

const isFistShape = (lm) => {
  const st = fingerStates(lm);
  return ![st.i, st.m, st.r, st.p].includes("S") && !isThumbsUp(lm);
};

const dirOk = (dir, dx) =>
  !SEQUENCE_CONFIG.strictDirection || !dir || (dir === "left" ? dx < 0 : dx > 0);

// hist entries: { t, x, y, s, digit, fist }   (x is mirrored, like the other trails)
const readSequence = (hist, now) => {
  const C = SEQUENCE_CONFIG;
  const n = hist.length;
  if (n < 4 || !hist[n - 1].fist) return null; // must END as a fist

  let i = n - 1;
  while (i >= 0 && hist[i].fist) i--;          // i = last frame before the fist
  const fistStart = i + 1;
  if (i < 0 || now - hist[fistStart].t < C.minFistMs) return null;

  while (i >= 0 && !hist[i].digit) i--;        // skip in-between shapes
  if (i < 0 || hist[fistStart].t - hist[i].t > C.maxGapMs) return null;

  const digit = hist[i].digit;
  let first = i;
  for (let k = i - 1; k >= 0; k--) {
    if (hist[k].digit === digit) first = k;
    else if (hist[k].digit || hist[k].fist) break; // another number or an earlier fist: stop
  }

  const a = hist[first];
  const b = hist[n - 1];
  if (hist[i].t - a.t < C.minStartMs) return null; // digit was not held long enough

  const s = (a.s + b.s) / 2;
  const dx = (b.x - a.x) / s;
  const dy = (b.y - a.y) / s;

  const sameStart = Object.keys(SEQUENCE_SIGNS).filter(
    (k) => SEQUENCE_SIGNS[k].start === digit
  );
  if (!sameStart.length) return null;

  // 30–90: iisa lang ang sign na nagsisimula sa numerong ito, kaya hindi na kailangan ng direksyon
  if (sameStart.length === 1) return sameStart[0];

  // 20 at 100 (parehong nagsisimula sa "1"): direksyon lang ang pagkakaiba
  if (Math.abs(dx) < C.minDirSweep) return null;
  return sameStart.find((k) => dirOk(SEQUENCE_SIGNS[k].dir, dx)) || null;
};

// ---- template matching for any extra moving letter ----
const resample = (pts, n) => {
  const lens = [0];
  for (let i = 1; i < pts.length; i++)
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lens[lens.length - 1];
  if (total < 1e-6) return null;
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (j < pts.length - 2 && lens[j + 1] < target) j++;
    const seg = lens[j + 1] - lens[j] || 1e-6;
    const f = Math.min(1, Math.max(0, (target - lens[j]) / seg));
    out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * f, y: pts[j].y + (pts[j + 1].y - pts[j].y) * f });
  }
  return { pts: out, total };
};

// path = [[0,0],[x,y],...] in HAND-SIZE units, y positive = DOWN, x positive = RIGHT (as on screen)
export const matchTemplate = (trail, path, { mirrorOk = false, tolerance = 0.1, n = 24 } = {}) => {
  if (trail.length < 8) return false;
  let p = prepare(trail);
  const last = p[p.length - 1];
  let cut = p.length;
  while (cut > 2 && Math.hypot(p[cut - 2].x - last.x, p[cut - 2].y - last.y) < 0.05) cut--;
  p = p.slice(0, cut); // drop the "resting" tail after the stroke
  if (p.length < 6) return false;

  const u = resample(p, n);
  const t = resample(path.map(([x, y]) => ({ x, y })), n);
  if (!u || !t) return false;
  if (Math.abs(u.total / t.total - 1) > 0.4) return false; // unfinished or way too long

  // errors are measured relative to the template's own length, so small and big letters behave the same
  const ok = (tp) => {
    const mean = tp.reduce((a, q, i) => a + Math.hypot(q.x - u.pts[i].x, q.y - u.pts[i].y), 0) / n;
    const endErr = Math.hypot(tp[n - 1].x - u.pts[n - 1].x, tp[n - 1].y - u.pts[n - 1].y);
    return mean / t.total < tolerance && endErr / t.total < 0.2;
  };
  const cands = [t.pts];
  if (mirrorOk) cands.push(t.pts.map((q) => ({ x: -q.x, y: q.y })));
  return cands.some(ok);
};

export const defineMotionSign = (letter, { tip, shape, path, mirrorOk = false, tolerance = 0.1 }) => {
  MOTION_SIGNS[letter] = {
    tip,
    shape,
    detect: (trail) => matchTemplate(trail, path, { mirrorOk, tolerance }),
  };
};

export const trailToPath = (trail, points = 12) => {
  const p = prepare(trail);
  const r = resample(p, points);
  return r ? r.pts.map((q) => [Math.round(q.x * 100) / 100, Math.round(q.y * 100) / 100]) : [];
};

const makePoint = (lm, tip, prev, now) => {
  const raw = { x: 1 - lm[tip].x, y: lm[tip].y }; // mirror so direction matches the screen
  const sm = prev ? { x: prev.x + 0.5 * (raw.x - prev.x), y: prev.y + 0.5 * (raw.y - prev.y) } : raw;
  return { ...sm, s: handSize(lm), t: now };
};

// Records the path of one fingertip so you can capture a template for a new letter.
export class MotionRecorder {
  constructor(tip = 8) { this.tip = tip; this.trail = []; }
  push(lm, now = performance.now()) { this.trail.push(makePoint(lm, this.tip, this.trail[this.trail.length - 1], now)); }
  finish() { const path = trailToPath(this.trail); this.trail = []; return path; }
}

export class MotionSignTracker {
  constructor({ windowMs = 1600, graceMs = 500, cooldownMs = 900, hookDirection = "any" } = {}) {
    this.windowMs = windowMs;
    this.graceMs = graceMs;
    this.cooldownMs = cooldownMs;
    this.hookDirection = hookDirection;
    this.cooldownUntil = 0;
    this.reset();
  }

  reset() { this.state = {}; this.seq = []; }

  updateSequences(lm, now) {
    if (!lm || lm.length < 21) return null;
    const e = {
      t: now,
      x: 1 - lm[9].x,   // palm centre, mirrored
      y: lm[9].y,
      s: handSize(lm),
      digit: sequenceDigit(lm),
      fist: isFistShape(lm),
    };

    const last = this.seq[this.seq.length - 1];
    if (last && last.t === now) this.seq[this.seq.length - 1] = e;
    else this.seq.push(e);
    while (this.seq.length && now - this.seq[0].t > SEQUENCE_CONFIG.windowMs) this.seq.shift();
    return readSequence(this.seq, now);
  }

  update(lm, now = performance.now()) {
    if (now < this.cooldownUntil) return { sign: null, candidate: null, trail: [] };

    const flags = lm && lm.length >= 21 ? fingerFlags(lm) : null;
    let candidate = null;

    for (const [letter, def] of Object.entries(MOTION_SIGNS)) {
      const armed = flags && (typeof def.shape === "function" ? def.shape(flags, lm) : HANDSHAPES[def.shape](flags));
      let st = this.state[letter];

      if (!armed) {
        if (st && now - st.last > this.graceMs) delete this.state[letter];
        continue;
      }
      if (st && now - st.last > this.graceMs) st = undefined; // hand was gone for a while: start fresh
      if (!st) st = this.state[letter] = { trail: [], last: now };
      st.last = now;
      st.trail.push(makePoint(lm, def.tip, st.trail[st.trail.length - 1], now));
      while (st.trail.length && now - st.trail[0].t > this.windowMs) st.trail.shift();
      candidate = candidate || letter;

      if (def.detect(st.trail, this)) {
        const trail = st.trail;
        this.reset();
        this.cooldownUntil = now + this.cooldownMs;
        return { sign: letter, candidate: letter, trail };
      }
    }

    const seq = this.updateSequences(lm, now);
    if (seq) {
      this.reset();
      this.cooldownUntil = now + this.cooldownMs;
      return { sign: seq, candidate: seq, trail: [] };
    }

    return { sign: null, candidate, trail: candidate ? this.state[candidate].trail : [] };
  }
}


// One shared tracker for detectCurrentSign / detectSign
const defaultTracker = new MotionSignTracker();

// Optional: use your own tracker instance instead of the shared one.
export const isTargetMatched = (landmarks, target, tracker, now = performance.now()) => {
  if (isMotionSign(target)) return tracker.update(landmarks, now).sign === target;
  return detectSign(landmarks, target);
};