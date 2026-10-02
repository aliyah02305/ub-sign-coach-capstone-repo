import styles from './Features.module.css';

const features = [
  {
    num: '01',
    title: 'Hand Landmark Detection',
    text: "MediaPipe's 21-point skeletal tracking captures precise hand structure including finger placements and palm orientation in real time via your webcam.",
  },
  {
    num: '02',
    title: 'Gesture Classification',
    text: 'TensorFlow and Scikit-learn classifiers identify and validate sign gestures against the standardized FSL curriculum database with high accuracy.',
  },
  {
    num: '03',
    title: 'Dynamic Sign Generation',
    text: 'Generative AI constructs signs dynamically, creating an interactive and engaging experience far beyond static video tutorials.',
  },
  {
    num: '04',
    title: 'Proficiency Dashboard',
    text: 'Learners track progress through personalized dashboards showing accuracy rates, completion milestones, and skill growth over time.',
  },
  {
    num: '05',
    title: 'Webcam Integration',
    text: 'WebRTC-powered interface transforms any standard webcam into a real-time sign language validator — no special hardware required.',
  },
  {
    num: '06',
    title: 'Gamified Learning',
    text: 'Points, levels, and progress milestones keep adult learners motivated and engaged throughout their FSL journey between modular sessions.',
  },
];

export default function Features() {
  return (
    <section className="section section-alt" id="features">
      <div className="section-label">Core Features</div>
      <h2>What UB-Sign Coach Offers</h2>
      <p className="section-intro">
        Six integrated capabilities that work together to create a complete self-paced FSL learning
        environment.
      </p>

      <div className={styles.featuresGrid}>
        {features.map((f) => (
          <div key={f.num} className={styles.featureCard}>
            <div className={styles.fcNum}>{f.num}</div>
            <div className={styles.fcTitle}>{f.title}</div>
            <div className={styles.fcText}>{f.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
