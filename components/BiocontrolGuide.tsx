
import React, { useState, useRef, useEffect } from 'react';
import { getBiocontrolExpertAdvice, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { SavedReport } from '../types';

interface BiocontrolGuideProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
}

const BiocontrolGuide: React.FC<BiocontrolGuideProps> = ({ onAction, onShowFeedback, onBack, onSaveReport }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        setQuery(prev => prev + ' ' + event.results[0][0].transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট আপনার ব্রাউজারে সমর্থিত নয়।");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const categories = [
    { id: 'all', label: 'সব', icon: '🌱' },
    { id: 'macrobial', label: 'ম্যাক্রোবায়াল', icon: '🐞' },
    { id: 'microbial', label: 'মাইক্রোবায়াল', icon: '🔬' },
    { id: 'natural', label: 'প্রাকৃতিক', icon: '🍃' },
  ];

  const content = [
    {
      id: 'macrobial-1',
      category: 'macrobial',
      title: 'শিকারি পোকা (Predators)',
      desc: 'লেডিবার্ড বিটল ও লেসউইং এফিড ও সাদা মাছি দমনে অত্যন্ত কার্যকর।',
      image: 'https://images.unsplash.com/photo-1558547434-2e21b18361b7?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 'microbial-1',
      category: 'microbial',
      title: 'Bt বায়োপেস্টিসাইড',
      desc: 'Bacillus thuringiensis (BT) লেদা পোকা দমনে আন্তর্জাতিকভাবে স্বীকৃত।',
      image: 'https://images.unsplash.com/photo-1581093196277-9f608ebab48f?auto=format&fit=crop&q=80&w=400'
    }
  ];

  const handleAskExpert = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setAdvice(null);

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    try {
      const result = await getBiocontrolExpertAdvice(query);
      setAdvice(result || null);
      
      if (result) {
        playTTS(result);
      }

      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch {
      alert("তথ্য সংগ্রহ করতে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (advice && onSaveReport) {
      setIsSaving(true);
      try {
        const audioBase64 = await generateSpeech(advice.replace(/[*#_~]/g, ''));
        onSaveReport({
          type: 'Biocontrol Guide',
          title: `জৈবিক দমন - ${query}`,
          content: advice,
          audioBase64,
          icon: '🐞'
        });
        alert("অডিওসহ জৈবিক দমন রিপোর্ট সংরক্ষিত হয়েছে!");
      } catch {
        onSaveReport({
          type: 'Biocontrol Guide',
          title: `জৈবিক দমন - ${query}`,
          content: advice,
          icon: '🐞'
        });
        alert("রিপোর্ট সংরক্ষিত হয়েছে!");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || advice;
    if (!textToSpeak) return;

    if (isPlaying && !textOverride) { 
        stopTTS(); 
        return; 
    }

    try {
      stopTTS();
      setIsPlaying(true);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const cleanText = textToSpeak.replace(/[*#_~]/g, '');
      const base64Audio = await generateSpeech(cleanText);
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch {
      setIsPlaying(false);
    }
  };

  const stopTTS = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen pb-32 font-sans">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => { onBack?.(); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800">জৈবিক দমন বিশেষজ্ঞ</h1>
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full inline-block border border-green-100">Safe Farming Advisor</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 mb-12">
        <h2 className="text-xl font-black text-gray-800 mb-2">নির্দিষ্ট পোকার জৈবিক সমাধান খুঁজুন</h2>
        <p className="text-sm text-gray-400 font-medium mb-8 uppercase tracking-widest">AI Expert Advisor</p>
        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 relative">
             <input 
               type="text" 
               value={query} 
               onChange={(e) => setQuery(e.target.value)}
               placeholder="যেমন: ধানের মাজরা পোকা..." 
               className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-5 px-8 pr-16 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-black text-xl text-gray-700 shadow-inner"
               onKeyDown={(e) => e.key === 'Enter' && handleAskExpert()}
             />
             <button 
               onClick={toggleListening}
               className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}
               title="ভয়েস ইনপুট"
             >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             </button>
           </div>
           <button onClick={handleAskExpert} disabled={isLoading} className="bg-gray-900 text-white font-black px-12 py-5 rounded-2xl shadow-2xl active:scale-95 transition-all text-lg disabled:bg-gray-300">
             {isLoading ? 'খুঁজছে...' : 'বিশেষজ্ঞের মত'}
           </button>
        </div>
      </div>

      {advice && (
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl animate-fade-in border-4 border-green-500/30 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16"></div>
          <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4 relative z-10">
             <h3 className="font-black text-gray-800 text-xl">প্রাকৃতিক দমন পদ্ধতি</h3>
             <div className="flex items-center space-x-2">
                <button onClick={() => playTTS()} className={`p-4 rounded-full shadow-2xl transition-all ${isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-[#0A8A1F] text-white'}`}>
                    {isPlaying ? '🔊' : '🔈'}
                </button>
                <button onClick={handleSaveReport} disabled={isSaving} className="p-4 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all active:scale-90 disabled:opacity-50" title="সেভ করুন">
                    {isSaving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                </button>
             </div>
          </div>
          <div className="prose prose-slate max-w-none text-gray-700 font-medium leading-relaxed whitespace-pre-wrap first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-[#0A8A1F]">
            {advice}
          </div>
        </div>
      )}

      <div className="flex overflow-x-auto space-x-2 mb-8 pb-4 scrollbar-hide">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center space-x-3 px-8 py-4 rounded-2xl whitespace-nowrap text-sm font-black transition-all ${activeCategory === cat.id ? 'bg-[#0A8A1F] text-white shadow-xl scale-105' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {content.map((item) => (
          <div key={item.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-50 group hover:shadow-xl transition-all">
            <div className="h-56 overflow-hidden">
               <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-gray-800 text-xl mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BiocontrolGuide;
