import Head from 'next/head';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Features from '../components/Features';
import Technology from '../components/Technology';
import Audience from '../components/Audience';
import SDG from '../components/SDG';
import CTAStrip from '../components/CTAStrip';
import Footer from '../components/Footer';
import Modals from '../components/Modals';

export default function Home() {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>UB-Sign Coach | AI-Powered FSL Learning Platform</title>
        <meta
          name="description"
          content="A curriculum-aligned gesture validator and dynamic proficiency tracker for Filipino Sign Language learners at the University of Batangas – CCELL."
        />
      </Head>

      <Navbar />
      <Modals />
      <main>
        <Hero />
        <About />
        <Features />
        <Technology />
        <Audience />
        <SDG />
        <CTAStrip />
      </main>
      <Footer />
    </>
  );
}