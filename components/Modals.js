import { useState } from 'react';
import { useModal } from './ModalContext';
import { useAuth } from './AuthContext';
import styles from './Modals.module.css';

function ModalWrapper({ id, children }) {
  const { openModal, close } = useModal();
  const isOpen = openModal === id;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) close();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.modalClose} onClick={close}>&times;</button>
        {children}
      </div>
    </div>
  );
}

function AccessModal() {
  const { open } = useModal();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <ModalWrapper id="access">
      <h3>Access Platform</h3>
      <p className={styles.modalSub}>
        Sign in to your UB-Sign Coach account to continue your FSL learning journey.
      </p>

      {error && <p className={styles.modalError}>{error}</p>}

      <div className={styles.formGroup}>
        <label>University Email</label>
        <input
          type="email"
          placeholder="yourname@ub.edu.ph"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
      </div>

      <p className={styles.modalHint}>
        💡 Try: <code>student@ub.edu.ph</code> or <code>admin@ub.edu.ph</code> (any 6+ char password)
      </p>

      <button className={styles.modalBtn} onClick={handleLogin} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className={styles.modalDivider}>— or —</div>

      <button
        className={styles.modalBtn}
        style={{ background: '#f7f5f0', color: '#0a1628', border: '1px solid #ddd8ce' }}
        onClick={() => open('register')}
      >
        Create an Account
      </button>

      <p className={styles.modalLink}><a href="#">Forgot your password?</a></p>
    </ModalWrapper>
  );
}

function RegisterModal() {
  const { open } = useModal();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', level: '', password: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.level || !form.password) {
      setError('Please fill in all fields.'); return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.'); return;
    }
    setLoading(true);
    setError('');
    const result = await register(form.name, form.email, form.level, form.password);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <ModalWrapper id="register">
      <h3>Create Account</h3>
      <p className={styles.modalSub}>
        Register as a UB CCELL FSL learner to start practicing with AI-powered feedback.
      </p>

      {error && <p className={styles.modalError}>{error}</p>}

      <div className={styles.formGroup}>
        <label>Full Name</label>
        <input type="text" placeholder="Juan dela Cruz" value={form.name} onChange={set('name')} />
      </div>
      <div className={styles.formGroup}>
        <label>University Email</label>
        <input type="email" placeholder="yourname@ub.edu.ph" value={form.email} onChange={set('email')} />
      </div>
      <div className={styles.formGroup}>
        <label>FSL Program</label>
        <select value={form.level} onChange={set('level')}>
          <option value="">Account Type</option>
          <option value="Student">Student</option>
          <option value="staff">UB Faculty</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <div className={styles.formGroup}>
        <label>Password</label>
        <input type="password" placeholder="Create a password (6+ characters)" value={form.password} onChange={set('password')} />
      </div>

      {/* Terms & Privacy Policy */}
      <div className={styles.termsGroup}>
        <input
          type="checkbox"
          id="agreeTerms"
          checked={agreedToTerms}
          onChange={e => setAgreedToTerms(e.target.checked)}
        />
        <label htmlFor="agreeTerms">
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </label>
      </div>

      <button
        className={styles.modalBtn}
        onClick={handleRegister}
        disabled={loading || !agreedToTerms}
        style={{ opacity: agreedToTerms ? 1 : 0.5 }}
      >
        {loading ? 'Registering…' : 'Register'}
      </button>

      <p className={styles.modalLink}>
        Already have an account?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); open('access'); }}>Sign in</a>
      </p>
    </ModalWrapper>
  );
}

function ContactModal() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', msg: '' });
  const [sent, setSent] = useState(false);
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleContact = () => {
    if (!form.name || !form.email || !form.subject || !form.msg) {
      alert('Please fill in all fields.'); return;
    }
    setSent(true);
  };

  return (
    <ModalWrapper id="contact">
      <h3>Contact Us</h3>
      <p className={styles.modalSub}>
        Reach out to the UB-Sign Coach development team or UB CCELL for inquiries.
      </p>

      {sent ? (
        <div className={styles.successMsg}>
          ✅ Message sent! We'll get back to you within 1–2 business days.
        </div>
      ) : (
        <>
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input type="text" placeholder="Your name" value={form.name} onChange={set('name')} />
          </div>
          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input type="email" placeholder="your@email.com" value={form.email} onChange={set('email')} />
          </div>
          <div className={styles.formGroup}>
            <label>Subject</label>
            <select value={form.subject} onChange={set('subject')}>
              <option value="">Select a topic</option>
              <option value="enroll">Enrollment Inquiry</option>
              <option value="tech">Technical Support</option>
              <option value="partner">Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Message</label>
            <textarea placeholder="Your message..." rows={3} value={form.msg} onChange={set('msg')} />
          </div>
          <button className={styles.modalBtn} onClick={handleContact}>Send Message</button>
        </>
      )}
    </ModalWrapper>
  );
}

export default function Modals() {
  return (
    <>
      <AccessModal />
      <RegisterModal />
      <ContactModal />
    </>
  );
}