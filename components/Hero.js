import { useModal } from './ModalContext';
import styles from './Hero.module.css';

export default function Hero() {
  const { open } = useModal();

  return (
    <section className={styles.hero}>
      <div className={styles.heroBgGrid} />
      <div className={styles.heroGlow} />

      <div className={styles.heroContent}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          UB CCELL &middot; FSL Interpreter Program
        </div>
        <h1>
          AI-Powered <em>Sign Language</em> Learning Coach
        </h1>
        <p className={styles.heroSub}>
          A curriculum-aligned gesture validator and dynamic proficiency tracker for Filipino Sign
          Language learners at the University of Batangas – CCELL.
        </p>
        <div className={styles.heroActions}>
          <button className="btn-primary" onClick={() => open('access')}>
            Get Started
          </button>
          <a className="btn-outline" href="#about">
            Learn More
          </a>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <div className={styles.heroCard}>
          <div className={styles.hcLabel}>Live Gesture Analysis</div>
          <div className={styles.hcGesture}>
            <div className={styles.hcRow}>
              <span className={`${styles.hcDot} ${styles.green}`} />
              <div className={styles.hcBarWrap}>
                <div className={styles.hcBar} style={{ width: '0%', background: '#4caf82' }} />
              </div>
              <span className={styles.hcVal}>0%</span>
            </div>
            <div className={styles.hcRow}>
              <span className={`${styles.hcDot} ${styles.gold}`} />
              <div className={styles.hcBarWrap}>
                <div className={styles.hcBar} style={{ width: '0%', background: '#c8a84b' }} />
              </div>
              <span className={styles.hcVal}>0%</span>
            </div>
            <div className={styles.hcRow}>
              <span className={`${styles.hcDot} ${styles.gray}`} />
              <div className={styles.hcBarWrap}>
                <div className={styles.hcBar} style={{ width: '0%', background: 'rgba(255,255,255,0.18)' }} />
              </div>
              <span className={styles.hcVal}>0%</span>
            </div>
          </div>
          <div className={styles.hcScore}>
            <span className={styles.hcScoreLabel}>Proficiency Score</span>
            <span className={styles.hcScoreVal}>0.00</span>
          </div>
        </div>
      </div>
    </section>
  );
}
