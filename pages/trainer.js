// pages/trainer.js
// Record hand-sign samples for letters, numbers and words, test the detection, and export
// public/sign-samples.json. Open it at http://localhost:3000/trainer (faculty / admin only).
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthContext';
import {
  SUPPORTED_SIGNS,
  SIGN_GROUPS,
  signLabel,
  addSample,
  clearSamples,
  getSampleCounts,
  exportSamples,
  importSamples,
  detectStaticSign,
  detectSign,
  classifyNumber,
  classifyTwoHandNumber,
} from '../lib/handLogic';

const CameraView = dynamic(() => import('../components/CameraView'), { ssr: false });

const TARGET_SAMPLES = 30;   // samples taken per recording
const GOOD_COUNT = 20;       // "enough" samples for one sign
const CAPTURE_MS = 120;      // time between samples
const COUNTDOWN = 3;         // seconds to get your hand ready

// SIX–TEN are detected by counting fingers on two hands (no samples needed)
const TWO_HAND_SIGNS = new Set(['SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']);

// J and Z are motion signs (tracked by the motion tracker), so they don't need static samples.
const LETTERS = SUPPORTED_SIGNS.filter((s) => s !== 'J' && s !== 'Z');

const TABS = [
  ...SIGN_GROUPS.map((g) => ({ key: g.key, label: g.label, items: g.words.map(([code, label]) => ({ code, label })) })),
  { key: 'letters', label: 'Letters', items: LETTERS.map((c) => ({ code: c, label: c })) },
];
const KNOWN = new Set(TABS.flatMap((t) => t.items.map((i) => i.code)));

const gold = '#C9933A';
const maroon = '#7B1E2B';

export default function Trainer() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('greetings');
  const [selected, setSelected] = useState(null);       // code of the sign being recorded
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState(null);           // { phase: 'countdown'|'recording', value }
  const [detected, setDetected] = useState({ letter: null, number: null, match: false, hand: false });
  const [customName, setCustomName] = useState('');
  const [customCodes, setCustomCodes] = useState([]);
  const [msg, setMsg] = useState('');

  const lmRef = useRef(null);       // latest landmarks (first hand)
  const handsRef = useRef([]);      // latest landmarks of ALL visible hands
  const seenRef = useRef(0);        // when a hand was last seen
  const timerRef = useRef(null);
  const selectedRef = useRef(null);
  const detectedKey = useRef('');

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // faculty / admin only
  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role === 'student') router.push('/dashboard/student');
  }, [user]);

  const refresh = useCallback(() => setCounts({ ...getSampleCounts() }), []);
  useEffect(() => {
    refresh();
    // sign-samples.json loads asynchronously, so refresh again shortly after
    const t = setTimeout(refresh, 1200);
    return () => { clearTimeout(t); stopTimer(); };
  }, [refresh]);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // ── camera callbacks ──
  const onHands = useCallback((all) => {
    handsRef.current = all || [];
  }, []);

  const onResults = useCallback((lm) => {
    lmRef.current = lm;
    seenRef.current = performance.now();

    const target = selectedRef.current;
    const all = handsRef.current;
    const letter = detectStaticSign(lm);
    // two hands visible -> try 6–10 first, otherwise 0–5 on the first hand
    const number = classifyTwoHandNumber(all) || classifyNumber(lm);
    let match = false;
    if (target) match = target.length > 1 ? detectSign(lm, target, all) : letter === target;

    // only re-render when something changed
    const key = `${letter}|${number}|${match}`;
    if (key !== detectedKey.current) {
      detectedKey.current = key;
      setDetected({ letter, number, match, hand: true });
    }
  }, []);

  const onHandLost = useCallback(() => {
    lmRef.current = null;
    handsRef.current = [];
    if (detectedKey.current !== 'lost') {
      detectedKey.current = 'lost';
      setDetected({ letter: null, number: null, match: false, hand: false });
    }
  }, []);

  // ── recording ──
  const startRecording = (code) => {
    stopTimer();
    setMsg('');
    let n = COUNTDOWN;
    setStatus({ phase: 'countdown', value: n });

    timerRef.current = setInterval(() => {
      n -= 1;
      if (n > 0) { setStatus({ phase: 'countdown', value: n }); return; }

      stopTimer();
      let taken = 0;
      setStatus({ phase: 'recording', value: 0 });
      timerRef.current = setInterval(() => {
        const fresh = lmRef.current && performance.now() - seenRef.current < 300;
        if (fresh) {
          addSample(code, lmRef.current);
          taken += 1;
          setStatus({ phase: 'recording', value: taken });
          if (taken % 5 === 0) refresh();
        }
        if (taken >= TARGET_SAMPLES) {
          stopTimer();
          setStatus(null);
          refresh();
          setMsg(`✅ Recorded ${TARGET_SAMPLES} samples for ${signLabel(code).replace('Sign ', '')}.`);
        }
      }, CAPTURE_MS);
    }, 1000);
  };

  const cancelRecording = () => { stopTimer(); setStatus(null); refresh(); };

  const pick = (code) => {
    if (status) return;
    setSelected(code);
    setMsg('');
  };

  const clearOne = (code) => {
    if (!confirm(`Delete all samples of "${code}"?`)) return;
    clearSamples(code);
    refresh();
  };

  const clearAll = () => {
    if (!confirm('Delete ALL samples (including the ones loaded from sign-samples.json for this session)?')) return;
    clearSamples();
    refresh();
  };

  // ── export / import ──
  const doExport = () => {
    const blob = new Blob([exportSamples()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sign-samples.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('⬇️ Downloaded sign-samples.json. Put it in the "public" folder of your project, then refresh.');
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSamples(reader.result);
        refresh();
        setMsg('✅ Imported. (Tip: if public/sign-samples.json is already loaded, importing the same file adds duplicates.)');
      } catch {
        setMsg('❌ That file is not a valid sign-samples.json.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── custom signs ──
  const addCustom = () => {
    const name = customName.trim();
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
    if (!code) return;
    if (!customCodes.includes(code) && !KNOWN.has(code)) setCustomCodes((c) => [...c, code]);
    setCustomName('');
    setTab('custom');
    setSelected(code);
  };

  if (!user) return null;

  // signs that have samples but are not in the lists (e.g. custom activities from the faculty page)
  const extraCodes = Array.from(new Set([
    ...customCodes,
    ...Object.keys(counts).filter((c) => !KNOWN.has(c)),
  ]));
  const tabs = [...TABS, { key: 'custom', label: 'Custom', items: extraCodes.map((c) => ({ code: c, label: signLabel(c).replace('Sign ', '') })) }];
  const current = tabs.find((t) => t.key === tab) || tabs[0];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const countColor = (n = 0) => (n >= GOOD_COUNT ? '#16a34a' : n >= 10 ? '#d97706' : n > 0 ? '#dc2626' : '#94a3b8');
  const isTwoHand = selected && TWO_HAND_SIGNS.has(selected);

  const btn = (primary) => ({
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700,
    border: primary ? 'none' : '1.5px solid #d6cdbf',
    background: primary ? gold : '#fff', color: primary ? '#4A0F1A' : '#6b5d52',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EE', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#2C1810' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: maroon }}>Sign Trainer</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b5d52' }}>
              {total} samples recorded · aim for {GOOD_COUNT}–{TARGET_SAMPLES}+ per sign
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ ...btn(false), display: 'inline-block' }}>
              Import JSON
              <input type="file" accept="application/json" onChange={doImport} style={{ display: 'none' }} />
            </label>
            <button style={btn(true)} onClick={doExport}>⬇ Export sign-samples.json</button>
            <button style={{ ...btn(false), color: '#b91c1c' }} onClick={clearAll}>Clear all</button>
            <button style={btn(false)} onClick={() => router.push('/dashboard/faculty')}>← Back</button>
          </div>
        </div>

        {msg && (
          <div style={{ background: '#fff', border: `1.5px solid ${gold}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 14 }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 20 }}>
          {/* ── LEFT: camera + controls ── */}
          <div>
            <div style={{ background: '#1f1410', borderRadius: 14, padding: 10 }}>
              <CameraView onResults={onResults} onHands={onHands} onHandLost={onHandLost} maxHands={2} />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d4', padding: 16, marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#8a7e74', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Selected sign
              </p>
              <p style={{ margin: '4px 0 12px', fontSize: 22, fontWeight: 800, color: maroon }}>
                {selected ? signLabel(selected).replace('Sign ', '') : 'Pick a sign from the list →'}
                {selected && <span style={{ fontSize: 13, color: '#8a7e74', fontWeight: 600 }}> · label: {selected}</span>}
              </p>

              {isTwoHand && (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8a7e74', lineHeight: 1.5 }}>
                  ✋✋ This sign uses <b>both hands</b> and is detected by counting fingers (5+1, 5+2, …).
                  No recording needed — just show both hands below to test it.
                </p>
              )}

              {status?.phase === 'countdown' && (
                <p style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: '#d97706' }}>
                  Get ready… {status.value}
                </p>
              )}
              {status?.phase === 'recording' && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                    ● Recording {status.value}/{TARGET_SAMPLES} — hold the sign, move your hand slightly
                  </p>
                  <div style={{ height: 8, background: '#eee6d8', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${(status.value / TARGET_SAMPLES) * 100}%`, height: '100%', background: '#dc2626', transition: 'width 0.1s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!status ? (
                  <button disabled={!selected || !detected.hand || isTwoHand}
                    style={{ ...btn(true), opacity: !selected || !detected.hand || isTwoHand ? 0.5 : 1 }}
                    onClick={() => startRecording(selected)}>
                    ● Record {TARGET_SAMPLES} samples
                  </button>
                ) : (
                  <button style={btn(false)} onClick={cancelRecording}>Stop</button>
                )}
                {selected && !status && (counts[selected] || 0) > 0 && (
                  <button style={{ ...btn(false), color: '#b91c1c' }} onClick={() => clearOne(selected)}>
                    Delete samples of {selected}
                  </button>
                )}
              </div>
              {!detected.hand && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#8a7e74' }}>
                  Start the camera and show your hand to enable recording.
                </p>
              )}
            </div>

            {/* live test */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d4', padding: 16, marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#8a7e74', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Live test
              </p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8, fontSize: 15 }}>
                <span>Detected letter / trained sign: <b>{detected.letter || '—'}</b></span>
                <span>Number rule (0–10): <b>{detected.number || '—'}</b></span>
              </div>
              {selected && (
                <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 700, color: detected.match ? '#16a34a' : '#8a7e74' }}>
                  {detected.match ? `✅ Matches ${selected}` : `Not matching ${selected} yet`}
                </p>
              )}
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#8a7e74', lineHeight: 1.5 }}>
                After recording, show the sign again here. If it does not match, record more samples with a bit of
                variation (distance, angle, left/right hand).
              </p>
            </div>
          </div>

          {/* ── RIGHT: sign list ── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d4', padding: 16, alignSelf: 'start' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, border: '1.5px solid',
                    background: tab === t.key ? gold : 'transparent',
                    color: tab === t.key ? '#4A0F1A' : '#6b5d52',
                    borderColor: tab === t.key ? gold : '#d6cdbf',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'custom' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
                  placeholder="New sign name (e.g. Good night)"
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #d6cdbf', borderRadius: 8, fontSize: 14 }} />
                <button style={btn(true)} onClick={addCustom}>Add</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {current.items.length === 0 && (
                <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 14, color: '#8a7e74' }}>
                  No custom signs yet. Add one above. Use the same name as the activity on the faculty page.
                </p>
              )}
              {current.items.map((it) => {
                const n = counts[it.code] || 0;
                const on = selected === it.code;
                const two = TWO_HAND_SIGNS.has(it.code);
                return (
                  <button key={it.code} onClick={() => pick(it.code)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: status ? 'default' : 'pointer',
                      border: `2px solid ${on ? gold : '#e8e0d4'}`,
                      background: on ? 'rgba(201,147,58,0.12)' : '#FDFBF7',
                    }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2C1810' }}>{it.label}</div>
                    {two ? (
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: '#16a34a' }}>✋✋ Two-hand rule</div>
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: countColor(n) }}>
                        {n} sample{n === 1 ? '' : 's'}{n >= GOOD_COUNT ? ' ✓' : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '14px 0 0', fontSize: 12, color: '#8a7e74', lineHeight: 1.5 }}>
              J and Z are not listed because they are motion signs. Samples are saved in this browser
              automatically; export them to share with the students' computers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}