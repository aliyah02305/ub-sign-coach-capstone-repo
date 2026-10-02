import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/AuthContext';
import styles from '../../styles/FacultyDashboard.module.css';


// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const ALL_STUDENTS = [
  { id: 1, name: 'Aliyah', email: '2302731@ub.edu.ph', level: 'FSL 1', progress: 0, streak: 0, lastSeen: '2h ago',  status: 'active',   joined: 'May 18, 2026', modules: 8, score: 0 },
  { id: 2, name: 'Lance',  email: '2301252@ub.edu.ph', level: 'FSL 1', progress: 0, streak: 0, lastSeen: '1h ago',  status: 'active',   joined: 'May 18, 2026', modules: 5, score: 0 },
  { id: 3, name: 'Zach',   email: '2301194@ub.edu.ph', level: 'FSL 1', progress: 0, streak: 0, lastSeen: '1d ago',  status: 'inactive', joined: 'May 18, 2026', modules: 2, score: 0 },
];

const MODULES = [
  { id: 1, title: 'Greetings & Introductions', level: 'FSL 1', lessons: 6, enrolled: 3, completion: 0, status: 'published', updated: 'May 10, 2025' },
  { id: 2, title: 'Numbers & Counting',         level: 'FSL 1', lessons: 5, enrolled: 3, completion: 0, status: 'published', updated: 'May 8,  2025' },
];

const ASSESSMENTS = [
  { id: 1, title: 'Greetings Practice Test',  level: 'FSL 1', type: 'Test', due: 'May 27, 2026', submitted: 0, total: 6, avgScore: 0, status: 'open' },
  { id: 2, title: 'Numbers Sign Recognition', level: 'FSL 1', type: 'Quiz', due: 'Jun 1,  2026', submitted: 0, total: 6, avgScore: 0, status: 'open' },
];

const ALERTS = [
  { id: 1, type: 'warning', msg: 'Ana Lim has not logged in for 3 days',        time: '1h ago',    read: false },
  { id: 2, type: 'info',    msg: 'New enrollment: Rosa Flores (FSL Level 1)',    time: '3h ago',    read: false },
  { id: 3, type: 'success', msg: 'Maria Santos completed Greetings module',      time: '5h ago',    read: false },
  { id: 4, type: 'warning', msg: '3 students missed their weekly practice goal', time: 'Yesterday', read: false },
  { id: 5, type: 'info',    msg: 'Jessa Tan submitted Greetings Practice Test',  time: '2d ago',    read: true  },
];

const ANALYTICS = {
  weeklyActive: [3, 5, 4, 6, 5, 7, 6],
  moduleCompletion: [
    { label: 'Greetings', pct: 0 },
    { label: 'Numbers',   pct: 0 },
  ],
  levelBreakdown: [
    { level: 'FSL 1', count: 6 },
    { level: 'FSL 2', count: 4 },
  ],
  topStudents: ALL_STUDENTS.slice().sort((a, b) => b.score - a.score).slice(0, 5),
  avgSessionMin: 0,
  totalHours: 0,
  completionRate: 0,
};

const SETTINGS_INIT = {
  batchName: 'Batch 2026',
  program: 'UB CCELL FSL Program',
  allowSelfEnroll: true,
  emailNotifs: true,
  weeklyReport: true,
  alertThreshold: 3,
  timezone: 'Asia/Manila',
};

const stats = [
  { icon: '👥', value: ALL_STUDENTS.length.toString(),                                                                         label: 'Total Students',  delta: '+3 this week' },
  { icon: '📈', value: Math.round(ALL_STUDENTS.reduce((s, x) => s + x.progress, 0) / ALL_STUDENTS.length) + '%',              label: 'Avg Progress',    delta: '+5% vs last week' },
  { icon: '⏱️', value: ANALYTICS.totalHours.toString(),                                                                        label: 'Practice Hours',  delta: 'This month' },
  { icon: '⚠️', value: ALL_STUDENTS.filter(s => s.status === 'at-risk').length.toString(),                                    label: 'At-Risk Students',delta: 'Need attention' },
];

const navItems = [
  { icon: '🏠', label: 'Overview',    key: 'overview' },
  { icon: '👥', label: 'Students',    key: 'students' },
  { icon: '📚', label: 'Modules',     key: 'modules' },
  { icon: '📊', label: 'Analytics',   key: 'analytics' },
  { icon: '📝', label: 'Assessments', key: 'assessments' },
  { icon: '🔔', label: 'Alerts',      key: 'alerts', badge: ALERTS.filter(a => !a.read).length },
  { icon: '⚙️', label: 'Settings',    key: 'settings' },
];

const today = new Date();
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];


// ─── SECTION COMPONENTS ───────────────────────────────────────────────────────

function OverviewSection({ user, students }) {
  const completionRates = [
    { label: 'FSL Level 1', pct: 0 },
    { label: 'FSL Level 2', pct: 0 },
  ];

  return (
    <>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Welcome, {user.name}!</h2>
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
          {students.slice(0, 6).map((s, i) => (
            <StudentCard key={i} s={s} />
          ))}
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
          {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
          <span className={styles.streakCell}>🔥 {s.streak}d streak</span>
          <span className={styles.lastSeen}>{s.lastSeen}</span>
        </div>
      </div>
    </div>
  );
}


function StudentsSection() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = ALL_STUDENTS.filter(s => {
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
              {['Student','Email','Level','Progress','Streak','Score','Last Seen','Status'].map(h => (
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
                      {s.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
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
                <td style={{ padding:'10px 14px', color:'var(--muted)' }}>🔥 {s.streak}d</td>
                <td style={{ padding:'10px 14px', fontWeight:700, color: s.score>=80?'var(--success)':s.score>=60?'var(--warning)':'var(--muted)' }}>{s.score}</td>
                <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{s.lastSeen}</td>
                <td style={{ padding:'10px 14px' }}>
                  <span className={`${styles.statusPill} ${styles[s.status]}`}>
                    {s.status === 'active' ? '● Active' : s.status === 'at-risk' ? '⚠ At Risk' : '○ Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ marginTop:20, background:'rgba(253,251,247,0.88)', backdropFilter:'blur(8px)', borderRadius:'var(--radius)', border:'1.5px solid rgba(201,147,58,0.35)', padding:20, boxShadow:'0 1px 0 rgba(255,255,255,0.80) inset, 0 4px 20px rgba(44,24,16,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(145deg, #E8B86D, #C9933A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#4A0F1A', boxShadow:'0 4px 12px rgba(201,147,58,0.35)' }}>
                {selected.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
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
              { label:'Score',       value: selected.score+'/100' },
              { label:'Streak',      value: selected.streak+'d 🔥' },
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


function ModulesSection() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? MODULES : MODULES.filter(m => m.status === filter || m.level === filter);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ fontSize:18, marginBottom:2 }}>FSL Modules</h2>
          <p style={{ fontSize:14, color:'var(--muted)', margin:0 }}>{MODULES.length} total modules</p>
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
              <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--muted)' }}>Updated {m.updated}</p>
              <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                <div style={{ fontSize:13, color:'var(--muted)' }}>📖 {m.lessons} Lessons</div>
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
              <button style={{ flex:1, padding:'6px 0', background:'rgba(201,147,58,0.10)', color:'var(--gold)', border:'none', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer' }}>View</button>
              <button style={{ flex:1, padding:'6px 0', background:'rgba(247,244,238,0.80)', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function AnalyticsSection() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const maxActive = Math.max(...ANALYTICS.weeklyActive);

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
        <p style={{ fontSize:14, color:'var(--muted)', margin:0 }}>Batch 2026 · May 2026</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { icon:'⏱️', label:'Avg Session',    value: ANALYTICS.avgSessionMin+'min', sub:'per student' },
          { icon:'🎯', label:'Completion Rate', value: ANALYTICS.completionRate+'%',  sub:'all modules' },
          { icon:'📚', label:'Total Hours',     value: ANALYTICS.totalHours+'h',      sub:'this month' },
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
          {ANALYTICS.weeklyActive.map((v,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--bark)' }}>{v}</span>
              <div style={{ width:'100%', borderRadius:'6px 6px 0 0', background:'linear-gradient(180deg, #EDD8B8, #D4A574)', height:`${(v/maxActive)*90}px`, transition:'height 0.3s', minHeight:4, boxShadow:'0 -2px 6px rgba(212,165,116,0.20) inset, 0 2px 6px rgba(212,165,116,0.22)' }} />
              <span style={{ fontSize:13, color:'var(--muted)' }}>{days[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={panelStyle}>
          <h3 style={{ margin:'0 0 14px', fontSize:16, fontWeight:700, color:'var(--bark)' }}>Module Completion</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {ANALYTICS.moduleCompletion.map((m,i) => (
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
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={panelStyle}>
            <h3 style={{ margin:'0 0 12px', fontSize:16, fontWeight:700, color:'var(--bark)' }}>Level Breakdown</h3>
            <div style={{ display:'flex', gap:16 }}>
              {ANALYTICS.levelBreakdown.map((l,i) => (
                <div key={i} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background: i===0 ? 'linear-gradient(145deg, #D4A574, #C9933A)' : 'linear-gradient(145deg, #A83245, #7B1E2B)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#fff', margin:'0 auto 6px', boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>{l.count}</div>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--muted)' }}>{l.level}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...panelStyle, flex:1 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:15, fontWeight:700, color:'var(--bark)' }}>Top Students</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {ANALYTICS.topStudents.map((s,i) => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:14, fontWeight:800, color: i===0?'var(--gold)':i===1?'var(--muted)':i===2?'#A67C52':'var(--muted)', width:16 }}>#{i+1}</span>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg, #E8B86D, #C9933A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#4A0F1A' }}>
                    {s.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--bark)' }}>{s.name}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:'var(--gold)' }}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function AssessmentsSection() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? ASSESSMENTS : ASSESSMENTS.filter(a => a.status === filter);
  const statusBg   = { open:'rgba(123,30,43,0.10)',  closed:'rgba(138,126,116,0.10)', upcoming:'rgba(123,30,43,0.10)' };
  const statusText = { open:'var(--success)',          closed:'var(--muted)',           upcoming:'var(--info)' };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <p style={{ fontSize:16, color:'var(--muted)', margin:0 }}>{ASSESSMENTS.length} assessments total</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['all','open','upcoming','closed'].map(f => (
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

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map(a => (
          <div key={a.id} style={{ background:'rgba(253,251,247,0.82)', backdropFilter:'blur(6px)', borderRadius:'var(--radius)', border:'1px solid rgba(232,224,212,0.65)', padding:'16px 20px', boxShadow:'0 1px 0 rgba(255,255,255,0.78) inset, 0 2px 8px rgba(44,24,16,0.05)', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                <span className={styles.levelTag}>{a.level}</span>
                <span style={{ fontSize:14, background:'rgba(138,126,116,0.12)', color:'var(--muted)', padding:'2px 7px', borderRadius:999, fontWeight:700 }}>{a.type}</span>
              </div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--bark)' }}>{a.title}</h3>
              <p style={{ margin:'2px 0 0', fontSize:14, color:'var(--muted)' }}>Due: {a.due}</p>
            </div>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ margin:0, fontSize:19, fontWeight:800, color:'var(--bark)' }}>{a.submitted}/{a.total}</p>
                <p style={{ margin:0, fontSize:13, color:'var(--muted)' }}>Submitted</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ margin:0, fontSize:19, fontWeight:800, color: a.avgScore>=80?'var(--success)':a.avgScore>=60?'var(--warning)':a.avgScore===0?'var(--muted)':'var(--danger)' }}>{a.avgScore || '–'}</p>
                <p style={{ margin:0, fontSize:13, color:'var(--muted)' }}>Avg Score</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:700, padding:'4px 10px', borderRadius:999, background:statusBg[a.status], color:statusText[a.status] }}>
                {a.status.charAt(0).toUpperCase()+a.status.slice(1)}
              </span>
              <button style={{ padding:'6px 14px', background:'rgba(201,147,58,0.10)', color:'var(--gold)', border:'none', borderRadius:'var(--radius-sm)', fontSize:14, fontWeight:600, cursor:'pointer' }}>View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function AlertsSection() {
  const [alerts, setAlerts] = useState(ALERTS);
  const [filter, setFilter] = useState('all');
  const markRead    = (id) => setAlerts(prev => prev.map(a => a.id===id ? {...a, read:true} : a));
  const markAllRead = ()   => setAlerts(prev => prev.map(a => ({...a, read:true})));
  const filtered = filter === 'all' ? alerts : filter === 'unread' ? alerts.filter(a=>!a.read) : alerts.filter(a=>a.type===filter);
  const typeIcon   = { warning:'⚠️', info:'ℹ️', success:'✅' };
  const typeBg     = { warning:'rgba(138,92,26,0.07)', info:'rgba(123,30,43,0.07)', success:'rgba(123,30,43,0.07)' };
  const typeBorder = { warning:'var(--warning)', info:'var(--info)', success:'var(--success)' };

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
          <button onClick={markAllRead}
            style={{ padding:'5px 14px', borderRadius:999, border:'1.5px solid var(--border)', cursor:'pointer', fontSize:13, fontWeight:600, background:'rgba(253,251,247,0.70)', color:'var(--muted)' }}>
            Mark all read
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(a => (
          <div key={a.id} style={{ background: a.read ? 'rgba(253,251,247,0.60)' : typeBg[a.type], backdropFilter:'blur(6px)', borderRadius:'var(--radius)', border:'1px solid rgba(232,224,212,0.60)', borderLeft:`4px solid ${typeBorder[a.type]}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, opacity: a.read ? 0.65 : 1, transition:'opacity 0.2s', boxShadow:'0 1px 0 rgba(255,255,255,0.70) inset, 0 2px 6px rgba(44,24,16,0.04)' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{typeIcon[a.type]}</span>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:14, fontWeight: a.read?500:700, color:'var(--bark)' }}>{a.msg}</p>
              <p style={{ margin:'2px 0 0', fontSize:13, color:'var(--muted)' }}>{a.time}</p>
            </div>
            {!a.read && (
              <button onClick={() => markRead(a.id)}
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
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear,  setCalYear]  = useState(today.getFullYear());

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role === 'student') { router.push('/dashboard/student'); return; }
    if (user.role === 'admin')   { router.push('/dashboard/admin');   return; }
  }, [user]);

  if (!user) return null;

  const pageTitles = {
    overview:    { title: 'Faculty Overview',   sub: 'UB CCELL FSL Program — Batch 2026' },
    students:    { title: 'Students',            sub: `${ALL_STUDENTS.length} enrolled learners` },
    modules:     { title: 'FSL Modules',         sub: `${MODULES.length} modules across 3 levels` },
    analytics:   { title: 'Analytics',           sub: 'Performance & engagement insights' },
    assessments: { title: 'Assessments',                                                  },
    alerts:      { title: 'Alerts',                                                       },
    settings:    { title: 'Settings',            sub: 'Program & notification preferences' },
  };

  const { title, sub } = pageTitles[activeTab];

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
            style={{ width:90, height:90, borderRadius:"50%", objectFit:"contain", flexShrink:0 }}
          />
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
          {activeTab === 'students' && (
            <button className={styles.enrollBtn} onClick={() => setActiveTab('students')}>+ Enroll Student</button>
          )}
          {activeTab === 'modules' && (
            <button className={styles.enrollBtn} onClick={() => {}}>+ Add Module</button>
          )}
        </header>

        <div className={styles.contentRow}>
          <main className={styles.main}>
            {activeTab === 'overview'    && <OverviewSection user={user} students={ALL_STUDENTS} />}
            {activeTab === 'students'    && <StudentsSection />}
            {activeTab === 'modules'     && <ModulesSection />}
            {activeTab === 'analytics'   && <AnalyticsSection />}
            {activeTab === 'assessments' && <AssessmentsSection />}
            {activeTab === 'alerts'      && <AlertsSection />}
            {activeTab === 'settings'    && <SettingsSection user={user} />}
          </main>

          {activeTab === 'overview' && (
            <aside className={styles.rightSidebar}>
              <section className={styles.sideCard}>
                <h3 className={styles.sideCardTitle}>🔔 Alerts</h3>
                <ul className={styles.alertList}>
                  {ALERTS.filter(a => !a.read).map((a, i) => (
                    <li key={i} className={`${styles.alertItem} ${styles[`alert_${a.type}`]}`}>
                      <p className={styles.alertMsg}>{a.msg}</p>
                      <p className={styles.alertTime}>{a.time}</p>
                    </li>
                  ))}
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
    </div>
  );
}