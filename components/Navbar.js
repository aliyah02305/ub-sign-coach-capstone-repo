import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useModal } from './ModalContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { open } = useModal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollY = window.scrollY + 100;
      sections.forEach((sec) => {
        if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) {
          setActiveSection(sec.id);
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '#about', label: 'About' },
    { href: '#features', label: 'Features' },
    { href: '#technology', label: 'Technology' },
    { href: '#audience', label: 'Audience' },
    { href: '#sdg', label: 'SDG' },
  ];

  return (
    <>
      <nav className={styles.nav}>
        <Link href="#" className={styles.navLogo}>
          <div className={styles.navLogoIcon}>
            <img src="/ubbg.png" alt="UB Sign Coach Logo" />
          </div>
          <span className={styles.navBrand}>
            UB-<span>Sign Coach</span>
          </span>
        </Link>

        <ul className={styles.navLinks}>
          {navItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={`${styles.navLink} ${activeSection === item.href.slice(1) ? styles.navLinkActive : ''}`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <button className={styles.navCta} onClick={() => open('access')}>
          Access Platform
        </button>

        <button
          className={styles.navHamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <span className={mobileOpen ? styles.spanOpen1 : ''} />
          <span className={mobileOpen ? styles.spanOpen2 : ''} />
          <span className={mobileOpen ? styles.spanOpen3 : ''} />
        </button>
      </nav>

      {mobileOpen && (
        <div className={styles.navMobile}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <button
            className={styles.navCta}
            onClick={() => { open('access'); setMobileOpen(false); }}
          >
            Access Platform
          </button>
        </div>
      )}
    </>
  );
}
