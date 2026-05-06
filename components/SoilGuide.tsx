
import React, { useState, useRef, useEffect } from 'react';
import { interpretSoilReportAI, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { SavedReport } from '../types';

interface SoilGuideProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
}

const SoilGuide: React.FC<SoilGuideProps> = ({ onAction, onShowFeedback, onBack, onSaveReport }) => {
  const [activeMode, setActiveMode] = useState<'guide' | 'interpret' | 'labs'>('guide');
  const [inputs, setInputs] = useState({ ph: '', n: '', p: '', k: '' });
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListeningField, setIsListeningField] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => {};
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const value = transcript.match(/\d+(\.\d+)?/)?.[0] || transcript;
        if (isListeningField) {
          setInputs(prev => ({ ...prev, [isListeningField]: value }));
        }
      };
      recognitionRef.current.onerror = () => setIsListeningField(null);
      recognitionRef.current.onend = () => setIsListeningField(null);
    }
  }, [isListeningField]);

  const steps = [
    { title: 'সঠিক সরঞ্জাম', desc: 'একটি পরিষ্কার খন্তা বা সয়েল অগার এবং একটি প্লাস্টিকের বালতি নিন।', icon: '🛠️' },
    { title: 'জমি প্রস্তুতি', desc: 'জমির উপরিভাগের লতাপাতা বা আগাছা সরিয়ে ফেলুন।', icon: '🧹' },
    { title: 'নমুনা সংগ্রহ', desc: 'জমির ১০-১২টি জায়গা থেকে ৬-৯ ইঞ্চি গভীরতায় ইংরেজি ‘V’ অক্ষরের মতো গর্ত করে মাটি সংগ্রহ করুন।', icon: '🚜' },
    { title: 'মিশ্রণ ও রোদে শুকানো', desc: 'সব নমুনা মিশিয়ে ছায়ায় শুকিয়ে নিন এবং পাথর বা শিকড় ফেলে দিন।', icon: '☀️' },
    { title: 'লেবেলিং', desc: '৫০০ গ্রাম মাটি একটি প্যাকেটে ভরে নাম, জমির দাগ নম্বর ও তারিখ লিখে ল্যাবে পাঠান।', icon: '🏷️' },
  ];

  const labs = [
    { name: 'SRDI প্রধান কার্যালয়', location: 'খামারবাড়ি, ঢাকা', phone: '০২-৯১১১০২৩' },
    { name: 'বিভাগীয় গবেষণাগার', location: 'রাজশাহী', phone: '০৭২১-৭৬১৫১৮' },
    { name: 'বিভাগীয় গবেষণাগার', location: 'খুলনা', phone: '০৪১-৭৬২০৭৫' },
    { name: 'বিভাগীয় গবেষণাগার', location: 'কুমিল্লা', phone: '০৮১-৬৪৫৭৩' },
  ];

  const toggleListening = (field: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListeningField === field) {
      recognitionRef.current.stop();
    } else {
      setIsListeningField(field);
      recognitionRef.current.start();
    }
  };

  const handleInterpret = async () => {
    if (!inputs.ph || !inputs.n) {
      alert("কমপক্ষে pH এবং নাইট্রোজেন এর মান দিন।");
      return;
    }
    setIsLoading(true);
    setAdvice(null);

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    try {
      const result = await interpretSoilReportAI(inputs);
      setAdvice(result || null);
      
      if (result) {
        playTTS(result);
      }

      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (error) {
      alert("রিপোর্ট বিশ্লেষণ করতে সমস্যা হয়েছে।");
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
          type: 'Soil Lab Analysis',
          title: `মাটি পরীক্ষা রিপোর্ট - ${new Date().toLocaleDateString('bn-BD')}`,
          content: advice,
          audioBase64,
          icon: '🚜'
        });
        alert("অডিওসহ রিপোর্টটি প্রোফাইলে সংরক্ষিত হয়েছে!");
      } catch (e) {
        onSaveReport({
          type: 'Soil Lab Analysis',
          title: `মাটি পরীক্ষা রিপোর্ট - ${new Date().toLocaleDateString('bn-BD')}`,
          content: advice,
          icon: '🚜'
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
    } catch (error) {
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
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-32 font-sans">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => { onBack?.(); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800 leading-tight">মাটি পরীক্ষা ও গাইড</h1>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">SRDI Official Standards</p>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-8 border border-gray-100 sticky top-4 z-40">
        <button onClick={() => setActiveMode('guide')} className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition ${activeMode === 'guide' ? 'bg-[#0A8A1F] text-white shadow-xl' : 'text-gray-500'}`}>নির্দেশিকা</button>
        <button onClick={() => setActiveMode('interpret')} className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition ${activeMode === 'interpret' ? 'bg-[#0A8A1F] text-white shadow-xl' : 'text-gray-500'}`}>রিপোর্ট বিশ্লেষণ</button>
        <button onClick={() => setActiveMode('labs')} className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition ${activeMode === 'labs' ? 'bg-[#0A8A1F] text-white shadow-xl' : 'text-gray-500'}`}>নিকটস্থ ল্যাব</button>
      </div>

      {activeMode === 'guide' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start space-x-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">{step.icon}</div>
              <div>
                <h3 className="font-black text-slate-800 mb-1">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeMode === 'interpret' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 mb-6">ল্যাব রিপোর্ট ডাটা ইনপুট দিন</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <SoilInput label="pH" value={inputs.ph} isListening={isListeningField === 'ph'} onVoice={() => toggleListening('ph')} onChange={(v: string) => setInputs({...inputs, ph: v})} />
              <SoilInput label="Nitrogen (%)" value={inputs.n} isListening={isListeningField === 'n'} onVoice={() => toggleListening('n')} onChange={(v: string) => setInputs({...inputs, n: v})} />
              <SoilInput label="Phosphorus" value={inputs.p} isListening={isListeningField === 'p'} onVoice={() => toggleListening('p')} onChange={(v: string) => setInputs({...inputs, p: v})} />
              <SoilInput label="Potassium" value={inputs.k} isListening={isListeningField === 'k'} onVoice={() => toggleListening('k')} onChange={(v: string) => setInputs({...inputs, k: v})} />
            </div>
            <button 
              onClick={handleInterpret} 
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-lg disabled:bg-slate-300"
            >
              {isLoading ? 'বিশ্লেষণ চলছে...' : 'রিপোর্ট বিশ্লেষণ করুন'}
            </button>
          </div>

          {advice && (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl animate-fade-in border-t-[12px] border-emerald-600">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-slate-800">বিশেষজ্ঞ পরামর্শ</h3>
                <div className="flex items-center space-x-2">
                    <button onClick={() => playTTS()} className={`p-4 rounded-full shadow-lg ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
                    {isPlaying ? '🔊' : '🔈'}
                    </button>
                    <button onClick={handleSaveReport} disabled={isSaving} className="p-4 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all active:scale-90 disabled:opacity-50" title="সেভ করুন">
                        {isSaving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                    </button>
                </div>
              </div>
              <div className="prose prose-slate max-w-none text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                {advice}
              </div>
            </div>
          )}
        </div>
      )}

      {activeMode === 'labs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {labs.map((lab, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 text-lg mb-2">{lab.name}</h3>
              <p className="text-sm text-slate-500 mb-1">📍 {lab.location}</p>
              <p className="text-sm font-bold text-emerald-600">📞 {lab.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SoilInput = ({ label, value, onChange, onVoice, isListening }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="মান দিন"
        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 pr-10 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
      />
      <button 
        onClick={onVoice}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-300 hover:text-emerald-500'}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
      </button>
    </div>
  </div>
);

export default SoilGuide;
