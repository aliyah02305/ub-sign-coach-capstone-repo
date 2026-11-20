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
        <em>Sign Language</em> Learning Coach
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
    </section>
  );
}
