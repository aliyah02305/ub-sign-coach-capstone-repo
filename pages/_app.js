import { ModalProvider } from '../components/ModalContext';
import { AuthProvider } from '../components/AuthContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <ModalProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ModalProvider>
  );
} 