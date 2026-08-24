import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface UseUserProgressReturn {
  user: User;
  updateUser: (updates: Partial<User>) => void;
  handleAction: (xp: number) => void;
}

export const useUserProgress = (defaultUser: User): UseUserProgressReturn => {
  const [user, setUser] = useState<User>(defaultUser);
  const [sessionXpGain, setSessionXpGain] = useState(0);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  const handleAction = useCallback((xp: number) => {
    setSessionXpGain(prev => prev + xp);
    setUser(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        xp: prev.progress.xp + xp,
        level: Math.floor((prev.progress.xp + xp) / 500) + 1
      }
    }));
  }, []);

  return { user, updateUser, handleAction };
};
