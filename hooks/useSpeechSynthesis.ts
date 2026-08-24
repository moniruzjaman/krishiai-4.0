import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';

interface UseSpeechSynthesisReturn {
  playSpeech: (text: string) => void;
  stopSpeech: () => void;
  isSpeaking: boolean;
  speechEnabled: boolean;
  setSpeechEnabled: (enabled: boolean) => void;
  handleSpeechConsent: (enabled: boolean) => void;
}

export const useSpeechSynthesis = (lang: Language): UseSpeechSynthesisReturn => {
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const playSpeech = useCallback((text: string) => {
    if (!speechEnabled || !window.speechSynthesis || !text) return;
    
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    setTimeout(() => {
      const cleanText = text.replace(/[*#_~]/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      utterance.rate = 0.95; 
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetLang = lang === 'bn' ? 'bn' : 'en';
      const preferredVoice = voices.find(v => v.lang.toLowerCase().includes(targetLang));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
          console.warn("Native Speech Warning:", event.error);
        }
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  }, [speechEnabled, lang]);

  const handleSpeechConsent = useCallback((enabled: boolean) => {
    setSpeechEnabled(enabled);
    localStorage.setItem('agritech_speech_consent', enabled.toString());
    if (enabled) {
      playSpeech(lang === 'bn' ? "ভয়েস সার্ভিস চালু করা হয়েছে। আপনাকে ধন্যবাদ।" : "Voice service enabled. Thank you.");
    }
  }, [playSpeech, lang]);

  return {
    playSpeech,
    stopSpeech,
    isSpeaking,
    speechEnabled,
    setSpeechEnabled,
    handleSpeechConsent
  };
};
