import Link from 'next/link';
import { useModal } from './ModalContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { open } = useModal();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div>
          <div className={styles.footerBrandName}>
            UB-<span>Sign Coach</span>
          </div>
          <p className={styles.footerDesc}>
            An AI-powered Filipino Sign Language learning framework for UB CCELL — bridging the
            feedback gap for adult FSL learners.
          </p>
          <div className={styles.footerSdgs}>
            <span className={styles.footerSdgBadge}>SDG 4</span>
            <span className={styles.footerSdgBadge}>SDG 10</span>
            <span className={styles.footerSdgBadge}>SDG 17</span>
          </div>
        </div>

        <div>
          <div className={styles.footerColTitle}>Platform</div>
          <ul className={styles.footerColLinks}>
            <li><a href="#about">About</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#technology">Technology</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); open('access'); }}>Login</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); open('access'); }}>Register</a></li>
          </ul>
        </div>

        <div>
          <div className={styles.footerColTitle}>Program</div>
          <ul className={styles.footerColLinks}>
            <li><a href="#">FSL Level 1</a></li>
            <li><a href="#">FSL Level 2</a></li>
            <li><a href="#audience">Target Users</a></li>
            <li><a href="#sdg">SDG Goals</a></li>
          </ul>
        </div>

        <div>
          <div className={styles.footerColTitle}>University</div>
          <ul className={styles.footerColLinks}>
            <li>
              <a href="https://www.ub.edu.ph" target="_blank" rel="noopener noreferrer">
                University of Batangas
              </a>
            </li>
            <li><a href="#">UB CCELL</a></li>
            <li><a href="#">FSL Interpreter Program</a></li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); open('contact'); }}>
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span className={styles.footerCopy}>&copy; 2025 UB-Sign Coach &mdash; Capstone Project</span>
        <span className={styles.footerInstitution}>
          University of Batangas &middot; CCELL &middot; Filipino Sign Language Program
        </span>
      </div>
    </footer>
  );
}
