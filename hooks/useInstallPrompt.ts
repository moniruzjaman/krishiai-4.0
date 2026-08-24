import { useState, useEffect } from 'react';

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  return installPrompt;
};
