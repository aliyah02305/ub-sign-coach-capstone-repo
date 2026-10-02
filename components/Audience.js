import styles from './Audience.module.css';

const audiences = [
  {
    type: 'Primary Users',
    variant: 'primary',
    title: 'UB CCELL FSL Enrollees',
    text: 'Level 1 and Level 2 adult learners who practice independently between weekly modular sessions, seeking real-time feedback and structured progress tracking aligned with their coursework.',
  },
  {
    type: 'Secondary Users',
    variant: 'secondary',
    title: 'UB Faculty and Staff',
    text: 'University faculty, staff, and non-teaching personnel pursuing basic FSL proficiency in support of an inclusive Smart Campus initiative at the University of Batangas.',
  },
  {
    type: 'Future Users',
    variant: 'future',
    title: 'Deaf Community Members',
    text: 'Deaf community members seeking a self-paced digital learning companion fully aligned with Philippine FSL educational standards and frameworks.',
  },
];

export default function Audience() {
  return (
    <section className="section" id="audience">
      <div className="section-label">Target Audience</div>
      <h2>Who This Platform Serves</h2>
      <p className="section-intro">
        Designed with three distinct user groups in mind, from immediate learners to future
        community members.
      </p>

      <div className={styles.audienceGrid}>
        {audiences.map((a) => (
          <div key={a.title} className={`${styles.audienceCard} ${styles[a.variant]}`}>
            <div className={styles.acType}>{a.type}</div>
            <div className={styles.acTitle}>{a.title}</div>
            <div className={styles.acText}>{a.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
