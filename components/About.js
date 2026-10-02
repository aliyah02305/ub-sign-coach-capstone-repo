import styles from './About.module.css';

const highlights = [
  {
    title: 'Real-Time Feedback',
    text: 'Instant biomechanical analysis of gestures during practice — no waiting for the next class session.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: 'Curriculum-Aligned',
    text: 'Mapped directly to the official FSL Level 1 and Level 2 curriculum of UB CCELL.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: 'Proficiency Tracking',
    text: 'Dynamic progress dashboards visualize learning milestones and skill growth over time.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: 'Generative AI Engine',
    text: 'LLM-based text-to-sign engine that dynamically constructs signs for an immersive learning environment.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
];

export default function About() {
  return (
    <section className="section" id="about">
      <div className={styles.aboutGrid}>
        <div className={styles.aboutText}>
          <div className="section-label">About the Project</div>
          <h2>Bridging the FSL Feedback Gap</h2>
          <p>
            UB-Sign Coach is a specialized AI-powered interactive learning framework designed to
            augment the Filipino Sign Language Interpreter Program at the University of Batangas –
            Center for Continuing Education and Life-long Learning (CCELL).
          </p>
          <p>
            While traditional FSL classes are conducted on a weekly modular basis, adult learners
            often face a "feedback gap" during self-practice outside classroom hours. This platform
            transforms a standard webcam into an intelligent, gamified Digital Coach that listens
            to your hand orientations, finger placements, and movement transitions.
          </p>
          <p>
            Utilizing MediaPipe's 21-point Hand Landmark Tracking, the application provides
            real-time biomechanical analysis compared against the standardized FSL Level 1 and
            Level 2 curriculum of UB CCELL.
          </p>
        </div>

        <div className={styles.aboutHighlights}>
          {highlights.map((item) => (
            <div key={item.title} className={styles.highlightItem}>
              <div className={styles.hiIcon}>{item.icon}</div>
              <div>
                <div className={styles.hiTitle}>{item.title}</div>
                <div className={styles.hiText}>{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
