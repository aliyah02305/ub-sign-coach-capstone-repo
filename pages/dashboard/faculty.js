import { auth } from '../../lib/firebase';
import ReportModal from '../../components/ReportModal';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/AuthContext';
import { SUPPORTED_SIGNS, WORD_SIGNS, SIGN_GROUPS, signLabel } from '../../lib/handLogic';
import styles from '../../styles/FacultyDashboard.module.css';


// ─── STATIC DATA (these are NOT in the database yet) ─────────────────────────


const SETTINGS_INIT = {
  batchName: 'Batch 2026',
  program: 'UB CCELL FSL Program',
  allowSelfEnroll: true,
  emailNotifs: true,
  weeklyReport: true,
  alertThreshold: 3,
  timezone: 'Asia/Manila',
};

const today = new Date();
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const initials = (name = '') => name.split(' ').map(n => n[0]).join('').slice(0, 2);
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';


// ─── DATA FROM THE DATABASE ──────────────────────────────────────────────────
// Reads /api/students, /api/modules, /api/notifications, /api/analytics and refreshes every 30s.

function useFacultyData(uid) {
  const [state, setState] = useState({
    students: [], modules: [], alerts: [], analytics: null, loading: true, error: null,
  });

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const q = `?uid=${encodeURIComponent(uid)}`;
      const get = (name) => fetch(`/api/${name}${q}`).then((r) => {
        if (!r.ok) throw new Error(`${name} (${r.status})`);
        return r.json();
      });
      const [students, modules, alerts, analytics] = await Promise.all([
        get('students'), get('modules'), get('notifications'), get('analytics'),
      ]);
      setState({ students, modules, alerts, analytics, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [uid]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const setAlerts = (fn) => setState((s) => ({ ...s, alerts: fn(s.alerts) }));
  return { ...state, reload: load, setAlerts };
}


// ─── SECTION COMPONENTS ───────────────────────────────────────────────────────

function OverviewSection({ user, students, analytics }) {
  const total       = students.length;
  const avgProgress = total ? Math.round(students.reduce((s, x) => s + x.progress, 0) / total) : 0;
  const atRisk      = students.filter(s => s.status === 'at-risk').length;

  const stats = [
    { icon: '👥', value: String(total),                          label: 'Total Students',    delta: 'Enrolled learners' },
    { icon: '📈', value: avgProgress + '%',                      label: 'Avg Progress',      delta: 'Signs completed' },
    { icon: '🎯', value: String(analytics?.sessionsThisMonth ?? 0), label: 'Practice Sessions', delta: 'This month' },
    { icon: '⚠️', value: String(atRisk),                         label: 'At-Risk Students',  delta: 'Need attention' },
  ];

  const completionRates = ['FSL 1', 'FSL 2'].map((lvl) => {
    const list = students.filter(s => s.level === lvl);
    return {
      label: lvl === 'FSL 1' ? 'FSL Level 1' : 'FSL Level 2',
      pct: list.length ? Math.round(list.reduce((a, s) => a + s.progress, 0) / list.length) : 0,
    };
  });

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "Faculty";
  return (
    <>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Welcome, {firstName}!</h2>
          <p className={styles.welcomeSub}>UB CCELL FSL Program — Batch 2026</p>
        </div>
        <span className={styles.bannerDecor}></span>
      </section>

      <div className={styles.statsRow}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statCardAccent} />
            <div className={styles.statIcon}>{s.icon}</div>
            <div>
              <p className={styles.statValue}>{s.value}</p>
              <p className={styles.statLabel}>{s.label}</p>
              <p className={styles.statDelta}>{s.delta}</p>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Student Progress</h2>
          <div className={styles.sectionHeaderRight}>
            <span className={styles.enrolledBadge}>Enrolled {students.length}</span>
          </div>
        </div>
        <div className={styles.studentGrid}>
          {students.slice(0, 6).map((s) => (
            <StudentCard key={s.id} s={s} />
          ))}
          {students.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No students yet.</p>}
        </div>
      </section>

      <section className={styles.completionSection}>
        <h2 className={styles.sectionTitle}>Completion Rate</h2>
        <div className={styles.completionGrid}>
          {completionRates.map((b, i) => (
            <div key={i} className={styles.completionCard}>
              <div className={styles.completionLabelRow}>
                <span>{b.label}</span>
                <span className={styles.completionPct}>{b.pct}%</span>
              </div>
              <div className={styles.completionBar}>
                <div className={styles.completionFill} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}


function StudentCard({ s }) {
  return (
    <div className={`${styles.studentCard} ${styles[`card_${s.status}`]}`}>
      <div className={styles.cardTop}>
        <div className={styles.miniAvatar}>
          {initials(s.name)}
        </div>
        <span className={`${styles.statusPill} ${styles[s.status]}`}>
          {s.status === 'active' ? '● Active' : s.status === 'at-risk' ? '⚠ At Risk' : '○ Inactive'}
        </span>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.studentName}>{s.name}</p>
        <p className={styles.studentEmail}>{s.email}</p>
        <span className={styles.levelTag}>{s.level}</span>
      </div>
      <div className={styles.cardFooter}>
        <div className={styles.progressRow}>
          <div className={styles.miniBar}>
            <div className={styles.miniFill} style={{ width: `${s.progress}%` }} />
          </div>
          <span className={styles.progressPct}>{s.progress}%</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.lastSeen}>{s.lastSeen}</span>
        </div>
      </div>
    </div>
  );
}


function StudentsSection({ students }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const cardBase = {
    background: 'rgba(253,251,247,0.85)',
    borderRadius: '12px',
    border: '1px solid rgba(232,224,212,0.65)',
    overflow: 'hidden',
    boxShadow: '0 1px 0 rgba(255,255,255,0.80) inset, 0 2px 8px rgba(44,24,16,0.05)',
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ fontSize:18, marginBottom:2 }}>All Students</h2>
          <p style={{ fontSize:14, color:'var(--muted)', margin:0 }}>{filtered.length} students found</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['all','active','inactive','at-risk'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding:'5px 14px', borderRadius:999, border:'1.5px solid', cursor:'pointer', fontSize:13, fontWeight:600,
                background:   filter===f ? 'var(--gold)'   : 'rgba(253,251,247,0.70)',
                color:        filter===f ? '#4A0F1A'        : 'var(--muted)',
                borderColor:  filter===f ? 'var(--gold)'   : 'var(--border)',
                boxShadow:    filter===f ? '0 2px 8px rgba(201,147,58,0.25)' : 'none',
              }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
          <input className={styles.searchInput} placeholder="🔍 Search students…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={cardBase}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'rgba(247,244,238,0.90)', borderBottom:'1.5px solid rgba(232,224,212,0.80)' }}>
              {['Student','Email','Level','Progress','Score','Last Seen','Status'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'var(--bark)', fontSize:13, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
                style={{
                  borderBottom:'1px solid rgba(232,224,212,0.60)',
                  cursor:'pointer',
                  background: selected?.id === s.id
                    ? 'rgba(201,147,58,0.08)'
                    : i%2===0 ? 'rgba(253,251,247,0.60)' : 'rgba(247,244,238,0.50)',
                  transition:'background 0.15s',
                }}>
                <td style={{ padding:'10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(145deg, #E8B86D, #C9933A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#4A0F1A', flexShrink:0, boxShadow:'0 2px 6px rgba(201,147,58,0.30)' }}>
                      {initials(s.name)}
                    </div>
                    <span style={{ fontWeight:600, color:'var(--bark)' }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{s.email}</td>
                <td style={{ padding:'10px 14px' }}><span className={styles.levelTag}>{s.level}</span></td>
                <td style={{ padding:'10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:70, height:5, background:'var(--border)', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ width:`${s.progress}%`, height:'100%', background:'linear-gradient(90deg, #E8B86D, #C9933A)', borderRadius:999 }} />
                    </div>
                    <span style={{ fontWeight:700, fontSize:13, color:'var(--bark)' }}>{s.progress}%</span>
                  </div>
                </td>
                <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{s.lastSeen}</td>
                <td style={{ padding:'10px 14px' }}>
                  <span className={`${styles.statusPill} ${styles[s.status]}`}>
                    {s.status === 'active' ? '● Active' : s.status === 'at-risk' ? '⚠ At Risk' : '○ Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding:20, textAlign:'center', color:'var(--muted)' }}>No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ marginTop:20, background:'rgba(253,251,247,0.88)', backdropFilter:'blur(8px)', borderRadius:'var(--radius)', border:'1.5px solid rgba(201,147,58,0.35)', padding:20, boxShadow:'0 1px 0 rgba(255,255,255,0.80) inset, 0 4px 20px rgba(44,24,16,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(145deg, #E8B86D, #C9933A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#4A0F1A', boxShadow:'0 4px 12px rgba(201,147,58,0.35)' }}>
                {initials(selected.name)}
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--bark)' }}>{selected.name}</h3>
                <p style={{ margin:'2px 0 0', fontSize:14, color:'var(--muted)' }}>{selected.email}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--muted)' }}>×</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { label:'Level',       value: selected.level },
              { label:'Progress',    value: selected.progress+'%' },
              { label:'Modules',     value: selected.modules+' done' },
              { label:'Status',      value: selected.status },
              { label:'Joined',      value: selected.joined },
              { label:'Last Active', value: selected.lastSeen },
            ].map(item => (
              <div key={item.label} style={{ background:'rgba(247,244,238,0.80)', borderRadius:'var(--radius-sm)', padding:'10px 14px', border:'1px solid rgba(232,224,212,0.65)' }}>
                <p style={{ margin:0, fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--muted)', fontWeight:700 }}>{item.label}</p>
                <p style={{ margin:'4px 0 0', fontSize:14, fontWeight:700, color:'var(--bark)' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── MODULES (connected to curriculum_syllabus / module_activities) ───────────

const modalInput = {
  width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--bark)',
  background: 'rgba(247,244,238,0.80)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const modalLabel = {
  display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
};

function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(44,24,16,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:width, maxHeight:'85vh', overflowY:'auto', background:'#FDFBF7', borderRadius:14, padding:24, boxShadow:'0 20px 60px rgba(44,24,16,0.35)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--bark)' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--muted)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const smallBtn = {
  width: 30, height: 30, flexShrink: 0, borderRadius: 8, cursor: 'pointer',
  border: '1.5px solid var(--border)', background: 'rgba(247,244,238,0.80)',
  color: 'var(--muted)', fontSize: 14, fontWeight: 700, lineHeight: 1, padding: 0,
};

const chipBtn = {
  padding:'5px 10px', borderRadius:8, border:'1.5px solid var(--border)', background:'none',
  cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--muted)',
};

const ALL_CODES = [...SUPPORTED_SIGNS, ...WORD_SIGNS.map(w => w.code)];

// Tabs of the "Add activity" picker: letters + every word group (+ custom, handled in the form)
const PICKER_TABS = [
  ...SIGN_GROUPS.map(g => ({ key: g.key, label: g.label, items: g.words.map(([code, label]) => ({ code, label })) })),
  { key: 'letters', label: 'Letters A–Z', items: SUPPORTED_SIGNS.map(c => ({ code: c, label: c })) },
];
const PICKER_ITEMS = Object.fromEntries(PICKER_TABS.flatMap(t => t.items).map(i => [i.code, i]));

// Opens on the tab that matches the module title
const guessTab = (title = '') => {
  const t = title.toLowerCase();
  if (/number|count/.test(t)) return 'numbers';
  if (/famil|relation/.test(t)) return 'family';
  if (/alphabet|letter/.test(t)) return 'letters';
  return 'greetings';
};

function ModuleFormModal({ mode, module, onClose, onSave }) {
  const [form, setForm] = useState({
    title:       module?.title || '',
    description: module?.description || '',
    level:       module?.level || 'FSL 1',
    status:      module?.status || 'draft',
  });

  // Activities = the signs (letters or words) the student must perform to complete this module
  const [activities, setActivities] = useState(
    (module?.activities || []).map(a => ({
      _key: `a${a.activityId}`,
      activityId: a.activityId,
      title: a.title || '',
      expectedGesture: a.expectedGesture,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const usedGestures = () => new Set(activities.map(a => String(a.expectedGesture).toUpperCase()));

  // ── Single "Add activity" picker ──
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState('greetings');
  const [picked, setPicked] = useState([]);
  const [customName, setCustomName] = useState('');

  const togglePicker = () => {
    if (!pickerOpen) { setTab(guessTab(form.title)); setPicked([]); setCustomName(''); }
    setPickerOpen(o => !o);
  };

  const pushActivities = (items) =>
    setActivities(list => [
      ...list,
      ...items.map((it, i) => ({
        _key: `n${Date.now()}-${i}`, activityId: null, title: it.title ?? '', expectedGesture: it.code,
      })),
    ]);

  const togglePick = (code) =>
    setPicked(p => p.includes(code) ? p.filter(c => c !== code) : [...p, code]);

  const tabItems = (PICKER_TABS.find(t => t.key === tab)?.items) || [];
  const selectAllInTab = () => {
    const used = usedGestures();
    const codes = tabItems.map(i => i.code).filter(c => !used.has(c));
    setPicked(p => Array.from(new Set([...p, ...codes])));
  };
  const clearTab = () => {
    const codes = new Set(tabItems.map(i => i.code));
    setPicked(p => p.filter(c => !codes.has(c)));
  };

  const addPicked = () => {
    const used = usedGestures();
    const items = picked
      .filter(c => !used.has(c))
      .map(c => ({ code: c, title: SUPPORTED_SIGNS.includes(c) ? '' : PICKER_ITEMS[c]?.label || '' }));
    if (!items.length) return;
    pushActivities(items);
    setPicked([]);
    setPickerOpen(false);
  };

  const addCustom = () => {
    const name = customName.trim();
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
    if (!code) return;
    if (usedGestures().has(code)) return setErr('That activity is already in the list.');
    setErr('');
    pushActivities([{ code, title: name.slice(0, 150) }]);
    setCustomName('');
  };

  const updateActivity = (key, patch) =>
    setActivities(list => list.map(a => a._key === key ? { ...a, ...patch } : a));

  const removeActivity = (key) =>
    setActivities(list => list.filter(a => a._key !== key));

  const moveActivity = (key, dir) =>
    setActivities(list => {
      const i = list.findIndex(a => a._key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const submit = async () => {
    if (!form.title.trim()) return setErr('Title is required.');
    if (form.status === 'published' && activities.length === 0) {
      return setErr('Add at least one activity before publishing.');
    }
    setSaving(true);
    setErr('');
    try {
      await onSave({
        ...form,
        activities: activities.map(a => ({
          activityId: a.activityId,
          title: a.title.trim() || signLabel(a.expectedGesture),
          expectedGesture: a.expectedGesture,
        })),
      });
    } catch (e) {
      setErr(e.message || 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <Modal title={mode === 'edit' ? 'Edit Module' : 'Add Module'} onClose={onClose} width={640}>
      <div style={{ marginBottom:14 }}>
        <label style={modalLabel}>Title</label>
        <input value={form.title} onChange={set('title')} style={modalInput} placeholder="e.g. Greetings & Introductions" />
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={modalLabel}>Description</label>
        <textarea value={form.description} onChange={set('description')} rows={3} style={{ ...modalInput, resize:'vertical' }} />
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <label style={modalLabel}>Level</label>
          <select value={form.level} onChange={set('level')} style={modalInput}>
            <option>FSL 1</option>
            <option>FSL 2</option>
          </select>
        </div>
        <div style={{ flex:1 }}>
          <label style={modalLabel}>Status</label>
          <select value={form.status} onChange={set('status')} style={modalInput}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* ── Activities ── */}
      <div style={{ marginBottom:14, padding:14, borderRadius:12, border:'1.5px solid var(--border)', background:'rgba(247,244,238,0.55)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
          <label style={{ ...modalLabel, marginBottom:0 }}>Activities ({activities.length})</label>
          <button type="button" onClick={togglePicker}
            style={{ padding:'5px 14px', borderRadius:8, border:'none', background: pickerOpen ? 'rgba(201,147,58,0.25)' : 'var(--gold)', cursor:'pointer', fontSize:12, fontWeight:700, color:'#4A0F1A' }}>
            {pickerOpen ? '✕ Close' : '+ Add activity'}
          </button>
        </div>
        <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>
          Each activity is a sign (letter or word) the student must perform on camera. The student completes the module only after finishing every activity, in any order.
        </p>

        {pickerOpen && (
          <div style={{ margin:'0 0 12px', padding:12, borderRadius:10, border:'1.5px solid var(--gold)', background:'#FDFBF7' }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {[...PICKER_TABS, { key:'custom', label:'+ Custom' }].map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  style={{ padding:'4px 12px', borderRadius:999, border:'1.5px solid', cursor:'pointer', fontSize:12, fontWeight:700,
                    background: tab===t.key ? 'var(--gold)' : 'transparent',
                    color: tab===t.key ? '#4A0F1A' : 'var(--muted)',
                    borderColor: tab===t.key ? 'var(--gold)' : 'var(--border)' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'custom' ? (
              <div>
                <p style={{ margin:'0 0 8px', fontSize:12, color:'var(--muted)' }}>
                  Type any word or phrase for this module (e.g. "Good night"). Record its sign in the trainer using the same name.
                </p>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={customName} onChange={e => setCustomName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                    placeholder="Activity name" style={{ ...modalInput, padding:'6px 10px' }} />
                  <button type="button" onClick={addCustom}
                    style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'var(--gold)', cursor:'pointer', fontSize:12, fontWeight:700, color:'#4A0F1A', flexShrink:0 }}>
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>Tap to select, then press "Add selected".</span>
                  <span style={{ display:'flex', gap:10 }}>
                    <button type="button" onClick={selectAllInTab} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--gold)', padding:0 }}>Select all</button>
                    <button type="button" onClick={clearTab} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--muted)', padding:0 }}>Clear</button>
                  </span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:150, overflowY:'auto' }}>
                  {tabItems.map(it => {
                    const used = usedGestures().has(it.code);
                    const on = picked.includes(it.code);
                    return (
                      <button key={it.code} type="button" disabled={used} onClick={() => togglePick(it.code)}
                        style={{ padding:'5px 12px', borderRadius:8, border:'1.5px solid', fontSize:13, fontWeight:600,
                          cursor: used ? 'default' : 'pointer', opacity: used ? 0.45 : 1,
                          background: on ? 'var(--gold)' : 'rgba(247,244,238,0.80)',
                          color: on ? '#4A0F1A' : 'var(--bark)',
                          borderColor: on ? 'var(--gold)' : 'var(--border)' }}>
                        {used ? '✓ ' : ''}{it.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                  <button type="button" onClick={addPicked} disabled={picked.filter(c => !usedGestures().has(c)).length === 0}
                    style={{ padding:'6px 16px', borderRadius:8, border:'none', background:'var(--gold)', cursor:'pointer', fontSize:12, fontWeight:700, color:'#4A0F1A',
                      opacity: picked.filter(c => !usedGestures().has(c)).length === 0 ? 0.5 : 1 }}>
                    Add selected ({picked.filter(c => !usedGestures().has(c)).length})
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activities.length === 0 && (
          <p style={{ margin:'8px 0', fontSize:13, color:'var(--muted)', textAlign:'center' }}>No activities yet. Add at least one to publish this module.</p>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:260, overflowY:'auto', paddingRight:2 }}>
          {activities.map((a, i) => (
            <div key={a._key} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:22, textAlign:'center', fontSize:12, fontWeight:700, color:'var(--muted)', flexShrink:0 }}>{i + 1}</span>
              <select
                value={a.expectedGesture}
                onChange={e => {
                  const code = e.target.value;
                  const patch = { expectedGesture: code };
                  // keep the title in sync if it was empty or still the auto label of the previous sign
                  if (!a.title.trim() || a.title === signLabel(a.expectedGesture)) {
                    patch.title = WORD_SIGNS.some(w => w.code === code) ? signLabel(code) : '';
                  }
                  updateActivity(a._key, patch);
                }}
                style={{ ...modalInput, width:170, flexShrink:0, padding:'6px 8px' }}
                title="Sign the student must perform"
              >
                {!ALL_CODES.includes(a.expectedGesture) &&
                  <option value={a.expectedGesture}>{a.expectedGesture}</option>}
                <optgroup label="Words">
                  {WORD_SIGNS.map(w => <option key={w.code} value={w.code}>{w.label}</option>)}
                </optgroup>
                <optgroup label="Letters">
                  {SUPPORTED_SIGNS.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              </select>
              <input
                value={a.title}
                onChange={e => updateActivity(a._key, { title: e.target.value })}
                placeholder={signLabel(a.expectedGesture)}
                style={{ ...modalInput, padding:'6px 10px' }}
              />
              <button type="button" style={smallBtn} onClick={() => moveActivity(a._key, -1)} disabled={i === 0} title="Move up">↑</button>
              <button type="button" style={smallBtn} onClick={() => moveActivity(a._key, 1)} disabled={i === activities.length - 1} title="Move down">↓</button>
              <button type="button" style={{ ...smallBtn, color:'var(--danger)' }} onClick={() => removeActivity(a._key)} title="Remove">✕</button>
            </div>
          ))}
        </div>

        {mode === 'edit' && (
          <p style={{ margin:'10px 0 0', fontSize:12, color:'var(--warning)' }}>
            Removing an activity also removes the students' saved results for that activity.
          </p>
        )}
      </div>

      {err && <p style={{ color:'var(--danger)', fontSize:14, margin:'0 0 12px' }}>{err}</p>}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onClose} style={{ padding:'8px 16px', background:'none', border:'1.5px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontWeight:600, color:'var(--muted)' }}>Cancel</button>
        <button onClick={submit} disabled={saving} className={styles.enrollBtn}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function ModuleViewModal({ module, onClose }) {
  return (
    <Modal title={module.title} onClose={onClose}>
      <p style={{ margin:'0 0 4px', fontSize:14, color:'var(--muted)' }}>
        {module.level} · {module.status === 'published' ? 'Published' : 'Draft'} · Updated {fmtDate(module.updatedAt)}
      </p>
      {module.description && <p style={{ margin:'8px 0 14px', fontSize:14, color:'var(--bark)' }}>{module.description}</p>}
      <h4 style={{ margin:'14px 0 8px', fontSize:14, color:'var(--bark)' }}>Activities ({module.activities.length})</h4>
      {module.activities.length === 0 ? (
        <p style={{ fontSize:14, color:'var(--muted)' }}>No activities yet.</p>
      ) : (
        <ol style={{ margin:0, paddingLeft:20, fontSize:14, color:'var(--bark)', lineHeight:1.7 }}>
          {module.activities.map(a => (
            <li key={a.activityId}>{a.title} <span style={{ color:'var(--gold)', fontWeight:700 }}>· {a.expectedGesture}</span></li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

function ModulesSection({ modules, loading, onView, onEdit }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? modules : modules.filter(m => m.status === filter || m.level === filter);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ fontSize:18, marginBottom:2 }}>FSL Modules</h2>
          <p style={{ fontSize:14, color:'var(--muted)', margin:0 }}>{modules.length} total modules</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['all','FSL 1','FSL 2','published','draft'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding:'5px 14px', borderRadius:999, border:'1.5px solid', cursor:'pointer', fontSize:14, fontWeight:600,
                background:  filter===f ? 'var(--gold)'  : 'rgba(253,251,247,0.70)',
                color:       filter===f ? '#4A0F1A'       : 'var(--muted)',
                borderColor: filter===f ? 'var(--gold)'  : 'var(--border)',
                boxShadow:   filter===f ? '0 2px 8px rgba(201,147,58,0.25)' : 'none',
              }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && modules.length === 0 && <p style={{ color:'var(--muted)' }}>Loading modules…</p>}
      {!loading && filtered.length === 0 && <p style={{ color:'var(--muted)' }}>No modules found.</p>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16 }}>
        {filtered.map(m => (
          <div key={m.id}
            style={{ background:'rgba(253,251,247,0.82)', backdropFilter:'blur(6px)', borderRadius:'var(--radius)', border:'1px solid rgba(232,224,212,0.65)', overflow:'hidden', boxShadow:'0 1px 0 rgba(255,255,255,0.78) inset, 0 2px 8px rgba(44,24,16,0.05)', transition:'box-shadow 0.2s, transform 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 1px 0 rgba(255,255,255,0.78) inset, 0 4px 16px rgba(201,147,58,0.12), 0 10px 28px rgba(44,24,16,0.08)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 0 rgba(255,255,255,0.78) inset, 0 2px 8px rgba(44,24,16,0.05)';e.currentTarget.style.transform='none'}}>
            <div style={{ height:4, background: m.level==='FSL 1' ? 'linear-gradient(90deg, #E8B86D, #C9933A)' : 'linear-gradient(90deg, #A83245, #7B1E2B)' }} />
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <span className={styles.levelTag}>{m.level}</span>
                <span style={{ fontSize:14, fontWeight:700, padding:'2px 8px', borderRadius:999,
                  background: m.status==='published' ? 'rgba(123,30,43,0.10)' : 'rgba(138,92,26,0.10)',
                  color:      m.status==='published' ? 'var(--success)'        : 'var(--warning)' }}>
                  {m.status === 'published' ? '● Published' : '◌ Draft'}
                </span>
              </div>
              <h3 style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color:'var(--bark)' }}>{m.title}</h3>
              <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--muted)' }}>Updated {fmtDate(m.updatedAt)}</p>
              <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                <div style={{ fontSize:13, color:'var(--muted)' }}>📖 {m.lessons} Activities</div>
                <div style={{ fontSize:13, color:'var(--muted)' }}>👥 {m.enrolled} Enrolled</div>
              </div>
              <div style={{ marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, marginBottom:4 }}>
                  <span style={{ color:'var(--muted)' }}>Completion</span>
                  <span style={{ color:'var(--gold)' }}>{m.completion}%</span>
                </div>
                <div style={{ height:5, background:'var(--border)', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ width:`${m.completion}%`, height:'100%', background:'linear-gradient(90deg, #E8B86D, #C9933A)', borderRadius:999 }} />
                </div>
              </div>
            </div>
            <div style={{ borderTop:'1px solid rgba(232,224,212,0.65)', padding:'10px 16px', display:'flex', gap:8 }}>
              <button onClick={() => onView(m)} style={{ flex:1, padding:'6px 0', background:'rgba(201,147,58,0.10)', color:'var(--gold)', border:'none', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer' }}>View</button>
              <button onClick={() => onEdit(m)} style={{ flex:1, padding:'6px 0', background:'rgba(247,244,238,0.80)', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function AnalyticsSection({ analytics }) {
  if (!analytics) return <p style={{ color:'var(--muted)' }}>Loading analytics…</p>;

  const { weekly, moduleCompletion, levelBreakdown, topStudents, sessionsThisMonth, avgAccuracy, completionRate } = analytics;
  const maxActive = Math.max(1, ...weekly.counts);

  const panelStyle = {
    background: 'rgba(253,251,247,0.80)',
    backdropFilter: 'blur(8px)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    border: '1px solid rgba(232,224,212,0.65)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.72) inset, 0 2px 8px rgba(44,24,16,0.05)',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 className={styles.sectionTitle} style={{ fontSize:19, marginBottom:4 }}>Analytics Overview</h2>
        <p style={{ fontSize:14, color:'var(--muted)', margin:0 }}>Batch 2026 · {monthNames[today.getMonth()]} {today.getFullYear()}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { icon:'🎯', label:'Practice Sessions', value: sessionsThisMonth,       sub:'this month' },
          { icon:'✅', label:'Avg Accuracy',      value: avgAccuracy+'%',          sub:'this month' },
          { icon:'📚', label:'Completion Rate',   value: completionRate+'%',       sub:'all students' },
        ].map((c,i) => (
          <div key={i} style={panelStyle}>
            <div style={{ fontSize:22, marginBottom:8 }}>{c.icon}</div>
            <p style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--bark)' }}>{c.value}</p>
            <p style={{ margin:'2px 0 0', fontSize:14, color:'var(--muted)' }}>{c.label} · {c.sub}</p>
          </div>
        ))}
      </div>

      <div style={panelStyle}>
        <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700, color:'var(--bark)' }}>Weekly Active Students</h3>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:120 }}>
          {weekly.counts.map((v,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--bark)' }}>{v}</span>
              <div style={{ width:'100%', borderRadius:'6px 6px 0 0', background:'linear-gradient(180deg, #EDD8B8, #D4A574)', height:`${(v/maxActive)*90}px`, transition:'height 0.3s', minHeight:4, boxShadow:'0 -2px 6px rgba(212,165,116,0.20) inset, 0 2px 6px rgba(212,165,116,0.22)' }} />
              <span style={{ fontSize:13, color:'var(--muted)' }}>{weekly.labels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={panelStyle}>
          <h3 style={{ margin:'0 0 14px', fontSize:16, fontWeight:700, color:'var(--bark)' }}>Module Completion</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {moduleCompletion.map((m,i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, marginBottom:4 }}>
                  <span style={{ color:'var(--muted)', fontWeight:600 }}>{m.label}</span>
                  <span style={{ color:'var(--gold)', fontWeight:700 }}>{m.pct}%</span>
                </div>
                <div style={{ height:6, background:'var(--border)', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ width:`${m.pct}%`, height:'100%', background:'linear-gradient(90deg, #E8B86D, #C9933A)', borderRadius:999 }} />
                </div>
              </div>
            ))}
            {moduleCompletion.length === 0 && <p style={{ margin:0, fontSize:14, color:'var(--muted)' }}>No modules yet.</p>}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={panelStyle}>
            <h3 style={{ margin:'0 0 12px', fontSize:16, fontWeight:700, color:'var(--bark)' }}>Level Breakdown</h3>
            <div style={{ display:'flex', gap:16 }}>
              {levelBreakdown.map((l,i) => (
                <div key={i} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background: i===0 ? 'linear-gradient(145deg, #D4A574, #C9933A)' : 'linear-gradient(145deg, #A83245, #7B1E2B)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#fff', margin:'0 auto 6px', boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>{l.count}</div>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--muted)' }}>{l.level}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...panelStyle, flex:1 }}>
  <h3 style={{ margin:'0 0 2px', fontSize:15, fontWeight:700, color:'var(--bark)' }}>Top Students</h3>
  <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--muted)' }}>
    Score = 50% completion + 50% accuracy
  </p>

  <div style={{ maxHeight:260, overflowY:'auto', paddingRight:4 }}>
    {/* column headers */}
    <div style={{ position:'sticky', top:0, zIndex:1, background:'#FDFBF7', display:'flex', alignItems:'center', gap:10, padding:'0 0 6px', marginBottom:8, borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--muted)' }}>
      <span style={{ flex:1 }}>Student</span>
      <span style={{ width:58, textAlign:'right' }}>Accuracy</span>
      <span style={{ width:70, textAlign:'right' }}>Completion</span>
      <span style={{ width:44, textAlign:'right' }}>Score</span>
    </div>

    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {topStudents.map((s, i) => (
        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:14, fontWeight:800, width:26, color: i===0?'var(--gold)':i===1?'var(--muted)':i===2?'#A67C52':'var(--muted)' }}>
            #{s.rank ?? i + 1}
          </span>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg, #E8B86D, #C9933A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#4A0F1A', flexShrink:0 }}>
            {initials(s.name)}
          </div>
          <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:600, color:'var(--bark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {s.name}
          </span>
          <span style={{ width:58, textAlign:'right', fontSize:13, fontWeight:600, color: s.accuracy > 0 ? 'var(--bark)' : 'var(--muted)' }}
                title={s.accuracy > 0 ? 'Average gesture accuracy' : 'No accuracy data yet'}>
            {s.accuracy > 0 ? `${s.accuracy}%` : '—'}
          </span>
          <span style={{ width:70, textAlign:'right', fontSize:13, fontWeight:600, color:'var(--bark)' }}>
            {s.completion}%
          </span>
          <span style={{ width:44, textAlign:'right', fontSize:14, fontWeight:800, color:'var(--gold)' }}>
            {s.score}
          </span>
        </div>
      ))}
      {topStudents.length === 0 && <p style={{ margin:0, fontSize:14, color:'var(--muted)' }}>No students yet.</p>}
      </div>   
    </div>     
   </div>       
  </div>         
</div>           
  </div>             
  );
}

// ─── ALERTS (connected to notification) ───────────────────────────────────────
function AlertsSection({ alerts, onMarkRead, onMarkAll }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? alerts : filter === 'unread' ? alerts.filter(a=>!a.read) : alerts.filter(a=>a.type===filter);
  const typeIcon   = { warning:'⚠️', info:'ℹ️', success:'✅' };
  const typeBg     = { warning:'rgba(138,92,26,0.07)', info:'rgba(123,30,43,0.07)', success:'rgba(123,30,43,0.07)' };
  const typeBorder = { warning:'var(--warning)', info:'var(--info)', success:'var(--success)' };
  const iconOf   = (t) => typeIcon[t]   || '🔄';
  const bgOf     = (t) => typeBg[t]     || 'rgba(138,92,26,0.07)';
  const borderOf = (t) => typeBorder[t] || 'var(--warning)';

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ fontSize:20, marginBottom:2 }}>Alerts & Notifications</h2>
          <p style={{ fontSize:15, color:'var(--muted)', margin:0 }}>{alerts.filter(a=>!a.read).length} unread</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['all','unread','warning','info','success'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding:'5px 14px', borderRadius:999, border:'1.5px solid', cursor:'pointer', fontSize:13, fontWeight:600,
                background:  filter===f ? 'var(--gold)'  : 'rgba(253,251,247,0.70)',
                color:       filter===f ? '#4A0F1A'       : 'var(--muted)',
                borderColor: filter===f ? 'var(--gold)'  : 'var(--border)',
                boxShadow:   filter===f ? '0 2px 8px rgba(201,147,58,0.25)' : 'none',
              }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
          <button onClick={onMarkAll}
            style={{ padding:'5px 14px', borderRadius:999, border:'1.5px solid var(--border)', cursor:'pointer', fontSize:13, fontWeight:600, background:'rgba(253,251,247,0.70)', color:'var(--muted)' }}>
            Mark all read
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.length === 0 && <p style={{ color:'var(--muted)' }}>No alerts.</p>}
        {filtered.map(a => (
          <div key={a.id} style={{ background: a.read ? 'rgba(253,251,247,0.60)' : typeBg[a.type], backdropFilter:'blur(6px)', borderRadius:'var(--radius)', border:'1px solid rgba(232,224,212,0.60)', borderLeft:`4px solid ${typeBorder[a.type]}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, opacity: a.read ? 0.65 : 1, transition:'opacity 0.2s', boxShadow:'0 1px 0 rgba(255,255,255,0.70) inset, 0 2px 6px rgba(44,24,16,0.04)' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{typeIcon[a.type]}</span>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:14, fontWeight: a.read?500:700, color:'var(--bark)' }}>{a.msg}</p>
              <p style={{ margin:'2px 0 0', fontSize:13, color:'var(--muted)' }}>{a.time}</p>
            </div>
            {!a.read && (
              <button onClick={() => onMarkRead(a.id)}
                style={{ padding:'5px 12px', background:'none', border:'1.5px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--muted)', whiteSpace:'nowrap' }}>
                Mark read
              </button>
            )}
            {a.read && <span style={{ fontSize:13, color:'var(--muted)', whiteSpace:'nowrap' }}>Read</span>}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── SETTINGS ────────────────────────────────────────────────────────────────
function SettingsSection({ user }) {
  const { updateUser } = useAuth();

  const [profileForm, setProfileForm]   = useState({ name: user.name, avatar: user.avatar });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [form, setForm]                 = useState(SETTINGS_INIT);
  const [saved, setSaved]               = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordMsg, setPasswordMsg]   = useState('');

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      updateUser({ avatarUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = () => {
    updateUser({ name: profileForm.name });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordSave = () => {
    if (!passwordForm.current) return setPasswordMsg('Enter your current password.');
    if (passwordForm.newPass.length < 6) return setPasswordMsg('New password must be at least 6 characters.');
    if (passwordForm.newPass !== passwordForm.confirm) return setPasswordMsg('Passwords do not match.');
    setPasswordMsg('✅ Password changed successfully!');
    setPasswordForm({ current: '', newPass: '', confirm: '' });
    setTimeout(() => setPasswordMsg(''), 3000);
  };

  const panelStyle = {
    background: 'rgba(253,251,247,0.82)',
    backdropFilter: 'blur(8px)',
    borderRadius: 'var(--radius)',
    border: '1px solid rgba(232,224,212,0.65)',
    padding: 24,
    boxShadow: '0 1px 0 rgba(255,255,255,0.75) inset, 0 2px 8px rgba(44,24,16,0.05)',
    marginBottom: 20,
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 15,
    color: 'var(--bark)',
    background: 'rgba(247,244,238,0.80)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--muted)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const field = (label, key, type = 'text', options = null) => (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {type === 'checkbox' ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form[key]} onChange={set(key)} style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: 'var(--bark)' }}>{form[key] ? 'Enabled' : 'Disabled'}</span>
        </label>
      ) : type === 'select' ? (
        <select value={form[key]} onChange={set(key)} style={inputStyle}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={set(key)} style={inputStyle} />
      )}
    </div>
  );

  return (
    <div>
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--bark)' }}>👤 Faculty Profile</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gold)' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(145deg, #E8B86D, #C9933A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#4A0F1A', border: '3px solid var(--gold)', boxShadow: '0 4px 12px rgba(201,147,58,0.35)' }}>
                {profileForm.avatar}
              </div>
            )}
            <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--surface)', boxShadow: '0 2px 6px rgba(201,147,58,0.40)' }}>
              <span style={{ fontSize: 14, color: '#4A0F1A', lineHeight: 1 }}>✎</span>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--bark)' }}>{profileForm.name}</p>
            <p style={{ margin: '2px 0 8px', fontSize: 14, color: 'var(--muted)' }}>Faculty · UB CCELL FSL Program</p>
            <label htmlFor="avatar-upload" style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}>Change photo</label>
          </div>
        </div>

        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <label style={labelStyle}>Full Name</label>
          <input type="text" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            {profileSaved && <span style={{ padding: '9px 0', fontSize: 14, color: 'var(--success)', fontWeight: 700 }}>✅ Profile updated!</span>}
            <button onClick={handleProfileSave} className={styles.enrollBtn}>Save Profile</button>
          </div>
        </div>

        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--bark)' }}>🔒 Change Password</h3>
        {[
          { label: 'Current Password',     key: 'current' },
          { label: 'New Password',         key: 'newPass' },
          { label: 'Confirm New Password', key: 'confirm' },
        ].map(({ label, key }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{label}</label>
            <input type="password" value={passwordForm[key]} onChange={e => setPasswordForm(f => ({ ...f, [key]: e.target.value }))} placeholder="••••••••" style={inputStyle} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {passwordMsg && (
            <span style={{ fontSize: 14, fontWeight: 600, color: passwordMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{passwordMsg}</span>
          )}
          <button onClick={handlePasswordSave} className={styles.enrollBtn}>Change Password</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ ...panelStyle, marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: 'var(--bark)' }}>📋 Program Settings</h3>
          {field('Batch Name', 'batchName')}
          {field('Program Name', 'program')}
          {field('Timezone', 'timezone', 'select', ['Asia/Manila', 'UTC', 'America/New_York'])}
          {field('Alert Threshold (days inactive)', 'alertThreshold', 'number')}
        </div>
        <div style={{ ...panelStyle, marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: 'var(--bark)' }}>🔔 Notification Preferences</h3>
          {field('Email Notifications', 'emailNotifs', 'checkbox')}
          {field('Weekly Reports', 'weeklyReport', 'checkbox')}
          {field('Allow Self-Enrollment', 'allowSelfEnroll', 'checkbox')}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {saved && <span style={{ padding: '9px 20px', fontSize: 14, color: 'var(--success)', fontWeight: 700 }}>✅ Saved!</span>}
        <button onClick={handleSave} className={styles.enrollBtn}>Save Changes</button>
      </div>
    </div>
  );
}


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showReport, setShowReport] = useState(false);
  const [moduleModal, setModuleModal] = useState(null); // { mode: 'add' | 'edit' | 'view', module? }
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear,  setCalYear]  = useState(today.getFullYear());

  const uid = user?.uid || auth?.currentUser?.uid;
  const { students, modules, alerts, analytics, loading, error, reload, setAlerts } = useFacultyData(uid);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role === 'student') { router.push('/dashboard/student'); return; }
    if (user.role === 'admin')   { router.push('/dashboard/admin');   return; }
  }, [user]);

  if (!user) return null;

  const unread = alerts.filter(a => !a.read).length;

  const navItems = [
    { icon: '🏠', label: 'Overview',    key: 'overview' },
    { icon: '👥', label: 'Students',    key: 'students' },
    { icon: '📚', label: 'Modules',     key: 'modules' },
    { icon: '📊', label: 'Analytics',   key: 'analytics' },
    { icon: '🔔', label: 'Alerts',      key: 'alerts', badge: unread },
    { icon: '⚙️', label: 'Settings',    key: 'settings' },
  ];

  const levelCount = new Set(modules.map(m => m.level)).size;
  const pageTitles = {
    overview:    { title: 'Faculty Overview',   sub: 'UB CCELL FSL Program — Batch 2026' },
    students:    { title: 'Students',            sub: `${students.length} enrolled learners` },
    modules:     { title: 'FSL Modules',         sub: `${modules.length} modules across ${levelCount} level${levelCount === 1 ? '' : 's'}` },
    analytics:   { title: 'Analytics',           sub: 'Performance & engagement insights' },
    alerts:      { title: 'Alerts',                                                       },
    settings:    { title: 'Settings',            sub: 'Program & notification preferences' },
  };

  const { title, sub } = pageTitles[activeTab];

  // ── notification actions ──
  const patchNotifications = (body) =>
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...body }),
    });
  const markRead = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    patchNotifications({ id });
  };
  const markAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    patchNotifications({ all: true });
  };

  // ── module actions (form now also carries the module's activities) ──
  const saveModule = async (form) => {
    const editing = moduleModal?.mode === 'edit';
    const res = await fetch('/api/modules', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, id: editing ? moduleModal.module.id : undefined, ...form }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Request failed');
    }
    setModuleModal(null);
    reload();
  };

  const prevMonth = () => { if (calMonth===0) { setCalMonth(11); setCalYear(y=>y-1); } else setCalMonth(m=>m-1); };
  const nextMonth = () => { if (calMonth===11) { setCalMonth(0); setCalYear(y=>y+1); } else setCalMonth(m=>m+1); };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);
  const calDays     = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  return (
    <div className={styles.shell}>

      {/* ── Left Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <img
            src="/ubbg.png"
            alt="UB Logo"
            style={{ width:90, height:90, borderRadius:9, objectFit:"cover", flexShrink:0 }} />
          <div>
            <p className={styles.brandName}>Sign Coach</p>
            <p className={styles.brandSub}>Faculty Portal</p>
          </div>
        </div>

        <nav className={styles.sideNav}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${activeTab === item.key ? styles.navActive : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className={`${styles.navIconWrap} ${activeTab === item.key ? styles.navIconWrapActive : ''}`}>
                {item.icon}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge > 0 && activeTab !== item.key && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
              {activeTab === item.key && <span className={styles.navActiveDot} />}
            </button>
          ))}
          <button className={styles.navItem} onClick={() => setShowReport(true)}>
  <span className={styles.navIconWrap}>🚩</span>
  <span className={styles.navLabel}>Report an Issue</span>
</button>
        </nav>

        <div className={styles.sideUser}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" style={{ width:45, height:45, borderRadius:"50%", objectFit:"cover" }} />
            : <div className={styles.userAvatar}>{user.avatar || 'MS'}</div>
          }
          <div className={styles.userInfo}>
            <p className={styles.userName} style={{ fontSize: '16px' }}>{user.name}</p>
            <p className={styles.userRole} style={{ fontSize: '16px' }}>Faculty</p>
          </div>
          <button className={styles.logoutBtn} onClick={logout} title="Sign out">↪</button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className={styles.mainArea}>
        <header className={styles.topBar}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSub}>{sub}</p>
          </div>
        </header>

        <div className={styles.contentRow}>
          <main className={styles.main}>
            {error && (
              <div style={{ background:'rgba(168,50,69,0.10)', border:'1px solid var(--danger)', color:'var(--danger)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <span>Could not load data from the database ({error}).</span>
                <button onClick={reload} style={{ padding:'4px 12px', borderRadius:8, border:'1px solid var(--danger)', background:'none', color:'var(--danger)', cursor:'pointer', fontWeight:600 }}>Retry</button>
              </div>
            )}

            {activeTab === 'overview'    && <OverviewSection user={user} students={students} analytics={analytics} />}
            {activeTab === 'students'    && <StudentsSection students={students} />}
            {activeTab === 'modules'     && (
              <ModulesSection
                modules={modules}
                loading={loading}
                onView={(m) => setModuleModal({ mode: 'view', module: m })}
                onEdit={(m) => setModuleModal({ mode: 'edit', module: m })}
              />
            )}
            {activeTab === 'analytics'   && <AnalyticsSection analytics={analytics} />}
            {activeTab === 'alerts'      && <AlertsSection alerts={alerts} onMarkRead={markRead} onMarkAll={markAllRead} />}
            {activeTab === 'settings'    && <SettingsSection user={user} />}
          </main>

          {activeTab === 'overview' && (
            <aside className={styles.rightSidebar}>
              <section className={styles.sideCard}>
                <h3 className={styles.sideCardTitle}>🔔 Alerts</h3>
                <ul className={styles.alertList}>
                  {alerts.filter(a => !a.read).map((a) => (
                    <li key={a.id} className={`${styles.alertItem} ${styles[`alert_${a.type}`]}`}>
                      <p className={styles.alertMsg}>{a.msg}</p>
                      <p className={styles.alertTime}>{a.time}</p>
                    </li>
                  ))}
                  {unread === 0 && <li className={styles.alertItem}><p className={styles.alertMsg}>No new alerts</p></li>}
                </ul>
              </section>

              <section className={styles.sideCard}>
                <div className={styles.calHeader}>
                  <span className={styles.calIcon}>📅</span>
                  <h3 className={styles.sideCardTitle}>Calendar</h3>
                </div>
                <div className={styles.calNav}>
                  <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
                  <span className={styles.calMonthLabel}>{monthNames[calMonth]} {calYear}</span>
                  <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
                </div>
                <div className={styles.calGrid}>
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <span key={i} className={styles.calDayName}>{d}</span>
                  ))}
                  {calDays.map((d, i) => (
                    <span key={i} className={`${styles.calDay} ${d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear()?styles.calToday:''} ${!d?styles.calEmpty:''}`}>
                      {d || ''}
                    </span>
                  ))}
                </div>
              </section>

              <section className={styles.sideCard}>
                <div className={styles.sideCardTitleRow}>
                  <h3 className={styles.sideCardTitle}>To-do</h3>
                  <button className={styles.addBtn}>+</button>
                </div>
                <ul className={styles.todoList}>
                  <li className={styles.todoItem}>📌 Upload FSL Level 2 module</li>
                  <li className={styles.todoItem}>📌 Send weekly report</li>
                  <li className={styles.todoItem}>📌 Schedule assessment — Batch 2026</li>
                </ul>
              </section>
            </aside>
          )}
        </div>
      </div>

      {(moduleModal?.mode === 'add' || moduleModal?.mode === 'edit') && (
        <ModuleFormModal
          key={moduleModal.module?.id || 'new'}
          mode={moduleModal.mode}
          module={moduleModal.module}
          onClose={() => setModuleModal(null)}
          onSave={saveModule}
        />
      )}
      {moduleModal?.mode === 'view' && (
        <ModuleViewModal module={moduleModal.module} onClose={() => setModuleModal(null)} />
      )}

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        role="faculty"
        user={{
          uid:   auth?.currentUser?.uid,
          name:  user.name,
          email: user.email || auth?.currentUser?.email,
        }}
      />
    </div>
  );
}