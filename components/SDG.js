import styles from './SDG.module.css';

const sdgs = [
  {
    num: '4',
    title: 'Quality Education',
    text: 'Expanding access to high-quality, technology-enhanced language education for adult learners in the Philippines through an AI-powered adaptive platform.',
  },
  {
    num: '10',
    title: 'Reduced Inequalities',
    text: 'Bridging communication gaps between the hearing and Deaf communities by democratizing access to FSL learning tools and resources for all.',
  },
  {
    num: '17',
    title: 'Partnerships for the Goals',
    text: 'Fostering collaboration between academic institutions, technology providers, and the Deaf community to achieve inclusive education outcomes.',
  },
];

export default function SDG() {
  return (
    <section className={styles.sdgSection} id="sdg">
      <div className="section-label" style={{ color: 'var(--gold-light)' }}>
        Sustainable Development Goals
      </div>
      <h2 style={{ color: 'var(--white)' }}>Aligned with Global Goals</h2>

      <div className={styles.sdgGrid}>
        {sdgs.map((s) => (
          <div key={s.num} className={styles.sdgCard}>
            <div className={styles.sdgNum}>{s.num}</div>
            <div>
              <div className={styles.sdgTitle}>{s.title}</div>
              <div className={styles.sdgText}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
