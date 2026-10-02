import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [openModal, setOpenModal] = useState(null);

  const open = useCallback((id) => {
    setOpenModal(id);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }, []);

  const close = useCallback(() => {
    setOpenModal(null);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, open, close }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
