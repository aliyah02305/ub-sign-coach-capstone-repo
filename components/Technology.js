import styles from './Technology.module.css';

const techStack = [
  { tag: 'Computer Vision', title: 'Hand Tracking', pills: ['MediaPipe Hands', '21-Point Skeleton'] },
  { tag: 'Machine Learning', title: 'Classification', pills: ['TensorFlow', 'Scikit-learn'] },
  { tag: 'Generative AI', title: 'Sign Engine', pills: ['LLM API', 'Text-to-Sign'] },
  { tag: 'Frontend', title: 'Interface Layer', pills: ['React.js', 'Next.js', 'WebRTC'] },
  { tag: 'Backend / API', title: 'Server Layer', pills: ['Python FastAPI', 'Node.js'] },
  { tag: 'Database', title: 'Data Persistence', pills: ['PostgreSQL', 'Firebase Auth'] },
  { tag: 'Realtime', title: 'Live Data Sync', pills: ['Firebase RT DB', 'WebSocket'] },
  { tag: 'Deployment', title: 'Cloud Hosting', pills: ['AWS', 'Scalable Infra'] },
];

export default function Technology() {
  return (
    <section className={styles.techSection} id="technology">
      <div className="section-label" style={{ color: 'var(--gold-light)' }}>
        Technology Stack
      </div>
      <h2 style={{ color: 'var(--white)' }}>Built on Modern Infrastructure</h2>
      <p className="section-intro" style={{ color: 'rgba(255,255,255,0.48)' }}>
        A robust, cloud-native architecture powering real-time gesture recognition and learning
        analytics at scale.
      </p>

      <div className={styles.techGrid}>
        {techStack.map((item) => (
          <div key={item.title} className={styles.techCard}>
            <div className={styles.tcTag}>{item.tag}</div>
            <div className={styles.tcTitle}>{item.title}</div>
            <div className={styles.tcPills}>
              {item.pills.map((pill) => (
                <span key={pill} className={styles.pill}>
                  {pill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
