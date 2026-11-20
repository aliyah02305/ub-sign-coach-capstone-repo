import { useModal } from './ModalContext';
import styles from './CTAStrip.module.css';

export default function CTAStrip() {
  const { open } = useModal();

  return (
    <div className={styles.ctaStrip}>
      <div className={styles.ctaStripText}>
        <h3>Ready to Start Learning FSL?</h3>
        <p>Join UB CCELL learners practicing Filipino Sign Language with AI-powered feedback.</p>
      </div>
      <div className={styles.ctaStripActions}>
        <button className="btn-navy" onClick={() => open('access')}>
          Access Platform
        </button>
        <button className="btn-ghost-navy" onClick={() => open('contact')}>
          Contact Us
        </button>
      </div>
    </div>
  );
}
