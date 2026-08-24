import { useCallback, useEffect } from 'react';
import { View } from '../types';

interface UseNavigationReturn {
  handleNavigate: (view: View) => void;
}

export const useNavigation = (
  setCurrentView: React.Dispatch<React.SetStateAction<View>>,
  stopSpeech: () => void,
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>
): UseNavigationReturn => {
  const handleNavigate = useCallback((view: View) => {
    stopSpeech();
    setCurrentView(view);
    setIsDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stopSpeech, setCurrentView, setIsDrawerOpen]);

  useEffect(() => {
    const onGlobalNav = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      handleNavigate(e.detail as View);
    };
    window.addEventListener('agritech_navigate', onGlobalNav);
    return () => window.removeEventListener('agritech_navigate', onGlobalNav);
  }, [handleNavigate]);

  return { handleNavigate };
};
