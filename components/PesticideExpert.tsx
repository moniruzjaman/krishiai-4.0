
import React, { useState, useEffect, useRef } from 'react';
import { 
  getPesticideExpertAdvice, 
  analyzePesticideMixing, 
  generateSpeech, 
  getLiveWeather,
  requestPesticidePrecisionParameters,
  performDeepPesticideAudit,
  getAISprayAdvisory
} from '../services/geminiService';
import { queryQwenVL } from '../services/huggingfaceService';
import { GroundingChunk, WeatherData, SavedReport, Language } from '../types';
import { getStoredLocation } from '../services/locationService';
import DynamicPrecisionForm from './DynamicPrecisionForm';
import { useSpeech } from '../App';
import { ToolGuideHeader } from './ToolGuideHeader';
import { CROPS_BY_CATEGORY } from '../constants';

interface PesticideExpertProps {
  onBack?: () => void;
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onNavigate?: (view: any) => void;
  lang: Language;
}

const PesticideExpert: React.FC<PesticideExpertProps> = ({ onBack, onAction, onSaveReport, lang }) => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'search' | 'mixing'>('advisor');
  const [query, setQuery] = useState('');
  const [sprayCrop, setSprayCrop] = useState('ধান');
  const [sprayPest, setSprayPest] = useState('');
  const [advice, setAdvice] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [precisionFields, setPrecisionFields] = useState<any[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeListeningId, setActiveListeningId] = useState<string | null>(null);

  const [mixingItems, setMixingItems] = useState<{ id: string, text: string }[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);

  const { playSpeech, stopSpeech, isSpeaking } = useSpeech();
  const recognitionRef = useRef<any>(null);

  const loadingMessages = lang === 'bn' ? [ 
    "বালাইনাশক ডাটাবেস অনুসন্ধান করা হচ্ছে...", 
    "আবহাওয়া প্রেক্ষাপট যাচাই হচ্ছে...", 
    "DAE প্রটোকল বিশ্লেষণ চলছে...",
    "IRAC/FRAC মিক্সিং স্ট্যান্ডার্ড মেলানো হচ্ছে..."
  ] : [
    "Searching National Pesticide Database...",
    "Validating real-time weather constraints...",
    "Consulting DAE dosage & safety protocols...",
    "Verifying IRAC/FRAC compatibility standards..."
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % loadingMessages.length), 2000);
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
    const loadWeather = async () => {
      const loc = getStoredLocation();
      if (loc) {
        try {
          const data = await getLiveWeather(loc.lat, loc.lng);
          setWeather(data);
        } catch (e) {
          console.error("Failed to load weather in PesticideExpert", e);
        }
      }
    };
    loadWeather();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const transcript = event.results[0][0].transcript;
        if (activeListeningId === 'query') setQuery(transcript);
        if (activeListeningId === 'sprayPest') setSprayPest(transcript);
        if (activeListeningId?.startsWith('mix-')) {
          const id = activeListeningId.replace('mix-', '');
          setMixingItems(prev => prev.map(p => p.id === id ? { ...p, text: transcript } : p));
        }
      };
      recognitionRef.current.onend = () => { setIsListening(false); setActiveListeningId(null); };
    }
  }, [activeListeningId]);

  const toggleListening = (id: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening && activeListeningId === id) recognitionRef.current.stop();
    else { 
      setActiveListeningId(id); 
      recognitionRef.current.start(); 
    }
  };

  const handleAdvisorSubmit = async () => {
    if (!sprayPest.trim()) return alert("পোকা বা রোগের নাম লিখুন।");
    setIsLoading(true); setAdvice(null);
    try {
      const prompt = `Spray decision for ${sprayPest} on ${sprayCrop}. Weather: ${JSON.stringify(weather)}. NO INTRO.`;
      const qwenRes = await queryQwenVL(prompt, undefined, lang);
      if (qwenRes) {
        setAdvice({ text: qwenRes, groundingChunks: [] });
        playSpeech(qwenRes);
      } else {
        const result = await getAISprayAdvisory(sprayCrop, sprayPest, weather!, lang);
        setAdvice(result);
        if (result.text) playSpeech(result.text);
      }
      if (onAction) onAction();
    } catch { alert("Error generating advisory."); } finally { setIsLoading(false); }
  };

  const handleSearchSubmit = async (precision: boolean = false) => {
    if (!query.trim()) return;
    setIsLoading(true); setAdvice(null);
    try {
      if (precision) {
        const fields = await requestPesticidePrecisionParameters(query, lang);
        setPrecisionFields(fields);
        setIsLoading(false);
      } else {
        const prompt = `Official DAE dosage for pesticide: ${query}. NO INTRO.`;
        const qwenRes = await queryQwenVL(prompt, undefined, lang);
        if (qwenRes) {
          setAdvice({ text: qwenRes, groundingChunks: [] });
          playSpeech(qwenRes);
        } else {
          const result = await getPesticideExpertAdvice(query, lang);
          setAdvice(result);
          if (result.text) playSpeech(result.text);
        }
        if (onAction) onAction();
        setIsLoading(false);
      }
    } catch (err) { setIsLoading(false); }
  };

  const handleMixingAnalysis = async () => {
    const validItems = mixingItems.filter(item => item.text.trim());
    if (validItems.length < 2) return alert("কমপক্ষে ২ টি বালাইনাশক যুক্ত করুন।");
    
    setIsLoading(true); setAdvice(null);
    try {
      const prompt = `Analyze chemical mixing safety for: ${validItems.map(i => i.text).join(', ')}. NO INTRO.`;
      const qwenRes = await queryQwenVL(prompt, undefined, lang);
      if (qwenRes) {
        setAdvice({ text: qwenRes, groundingChunks: [] });
        playSpeech(qwenRes);
      } else {
        const result = await analyzePesticideMixing(validItems, weather || undefined, lang);
        setAdvice({ text: result.text, groundingChunks: result.groundingChunks });
        if (result.text) playSpeech(result.text);
      }
      if (onAction) onAction();
    } catch (err) { alert("Analysis failed."); } finally { setIsLoading(false); }
  };

  const handlePrecisionSubmit = async (dynamicData: Record<string, string>) => {
    setIsLoading(true);
    try {
      const prompt = `Final Spray Audit for ${query} with dynamic inputs: ${JSON.stringify(dynamicData)}. NO INTRO.`;
      const qwenRes = await queryQwenVL(prompt, undefined, lang);
      if (qwenRes) {
        setAdvice({ text: qwenRes, groundingChunks: [] });
        playSpeech(qwenRes);
      } else {
        const result = await performDeepPesticideAudit(query, dynamicData, lang);
        setAdvice(result);
        if (result.text) playSpeech(result.text);
      }
      setPrecisionFields(null);
      if (onAction) onAction();
    } catch (e) { alert("Audit Failed."); } finally { setIsLoading(false); }
  };

  const handleSaveReportToProfile = async () => {
    if (advice && onSaveReport) {
      setIsSaving(true);
      try {
        const audioBase64 = await generateSpeech(advice.text);
        onSaveReport({ type: 'Pesticide Report', title: `Spray Advice: ${sprayPest || query}`, content: advice.text, audioBase64, icon: '🧪' });
        alert("সংরক্ষিত হয়েছে!");
      } catch (e) {
        onSaveReport({ type: 'Pesticide Report', title: 'Pesticide Advice', content: advice.text, icon: '🧪' });
        alert("Saved");
      } finally { setIsSaving(false); }
    }
  };

  const formatResultContent = (text: string) => {
    const parts = text.split(/(\[.*?\]:?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.includes(']')) {
        return <span key={i} className="block mt-8 mb-3 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest border border-rose-100">{part.replace(/[[\]:]/g, '')}</span>;
      }
      return <span key={i} className="leading-relaxed opacity-90">{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-32 font-sans text-slate-900">
      <ToolGuideHeader 
        title={lang === 'bn' ? 'বালাইনাশক বিশেষজ্ঞ' : 'Pesticide Expert'}
        subtitle={lang === 'bn' ? 'IRAC/FRAC মিক্সিং স্ট্যান্ডার্ড এবং DAE ২০২৬ প্রটোকল অনুসৃত।' : 'Governed by IRAC/FRAC mixing standards and DAE 2026 spray protocols.'}
        protocol="DAE-IRAC-FRAC-BD"
        source="Official National Spray Protocol"
        lang={lang}
        onBack={onBack || (() => {})}
        icon="🧪"
        themeColor="rose"
        guideSteps={lang === 'bn' ? ["ফসলের নাম ও পোকা/রোগ লিখুন।", "আবহাওয়া দেখে এআই আপনাকে স্প্রে করার সঠিক সময় জানাবে।", "বিষের মিক্সিং চেক করে ঝুঁকি এড়ান।"] : ["Enter crop and pest/disease.", "AI tells you the safe spray time based on weather.", "Check chemical mixing safety."]}
      />

      {/* Floating Status Toast */}
      {isLoading && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-bounce-in w-full max-w-xs md:max-w-sm px-4">
           <div className="bg-slate-900/95 text-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col space-y-4 border border-rose-500/30 backdrop-blur-md">
              <div className="flex items-center space-x-4">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-lg">🔬</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">DAE-Integrated AI Engine</p>
                  <h4 className="text-sm font-bold truncate transition-all duration-500">{loadingMessages[loadingStep]}</h4>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-1 px-1 py-0.5">
                 {[0,1,2,3].map(i => (
                   <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= loadingStep ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-white/5'}`}></div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-8 border border-slate-200 overflow-x-auto scrollbar-hide print:hidden">
        <button onClick={() => { setActiveTab('advisor'); stopSpeech(); setAdvice(null); setPrecisionFields(null); }} className={`flex-1 min-w-[120px] px-4 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${activeTab === 'advisor' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-400'}`}>{lang === 'bn' ? 'স্প্রে গাইড' : 'Spray Advisor'}</button>
        <button onClick={() => { setActiveTab('mixing'); stopSpeech(); setAdvice(null); setPrecisionFields(null); }} className={`flex-1 min-w-[120px] px-4 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${activeTab === 'mixing' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-400'}`}>{lang === 'bn' ? 'মিক্সিং চেক' : 'Mixing Check'}</button>
        <button onClick={() => { setActiveTab('search'); stopSpeech(); setAdvice(null); setPrecisionFields(null); }} className={`flex-1 min-w-[120px] px-4 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${activeTab === 'search' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-400'}`}>{lang === 'bn' ? 'ডোজ সার্চ' : 'Dosage Search'}</button>
      </div>

      {precisionFields && !isLoading && !advice && (
        <DynamicPrecisionForm fields={precisionFields} lang={lang} onSubmit={handlePrecisionSubmit} isLoading={isLoading} toolProtocol="DAE-IRAC-FRAC-BD" />
      )}

      {activeTab === 'advisor' && !advice && !isLoading && (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">ফসলের নাম</label>
                <select value={sprayCrop} onChange={(e) => setSprayCrop(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-rose-600 outline-none">
                  {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">পোকা বা রোগের নাম</label><button onClick={() => toggleListening('sprayPest')} className={`p-2 rounded-xl transition-all ${isListening && activeListeningId === 'sprayPest' ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400'}`}>🎙️</button></div>
                <input type="text" value={sprayPest} onChange={(e) => setSprayPest(e.target.value)} placeholder="যেমন: মাজরা পোকা" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-rose-600 outline-none" />
              </div>
           </div>
           <button onClick={handleAdvisorSubmit} className="w-full bg-rose-600 text-white font-black py-6 rounded-3xl shadow-xl active:scale-95 transition-all text-xl">স্প্রে সিদ্ধান্ত জানুন</button>
        </div>
      )}

      {activeTab === 'mixing' && !advice && !isLoading && (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 space-y-4">
           <p className="text-sm font-bold text-slate-500 mb-4 px-4">কমপক্ষে ২ টি বালাইনাশকের নাম লিখুন যা আপনি একসাথে মিশাতে চান।</p>
           {mixingItems.map((item, idx) => (
             <div key={item.id} className="relative">
                <input type="text" value={item.text} onChange={(e) => setMixingItems(prev => prev.map(p => p.id === item.id ? { ...p, text: e.target.value } : p))} placeholder={`বালাইনাশক ${idx+1} এর নাম...`} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 pr-14 font-bold focus:border-rose-600 outline-none" />
                <button onClick={() => toggleListening(`mix-${item.id}`)} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl ${isListening && activeListeningId === `mix-${item.id}` ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-300'}`}>🎙️</button>
             </div>
           ))}
           <button onClick={() => setMixingItems([...mixingItems, { id: Date.now().toString(), text: '' }])} className="text-rose-600 font-black text-xs uppercase tracking-widest px-4">+ আরও যুক্ত করুন</button>
           <button onClick={handleMixingAnalysis} className="w-full bg-rose-600 text-white font-black py-6 rounded-3xl shadow-xl mt-6">মিক্সিং অ্যানালাইজার শুরু করুন</button>
        </div>
      )}

      {activeTab === 'search' && !advice && !isLoading && (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="বালাইনাশকের ব্র্যান্ড বা জেনেরিক নাম..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 pr-14 font-bold focus:border-rose-600 outline-none shadow-inner" />
                <button onClick={() => toggleListening('query')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening && activeListeningId === 'query' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400'}`}>🎙️</button>
              </div>
              <button onClick={() => handleSearchSubmit(true)} className="bg-rose-600 text-white font-black px-10 py-4 rounded-2xl shadow-lg active:scale-95">অডিট শুরু করুন</button>
           </div>
        </div>
      )}

      {advice && !isLoading && (
        <div className="bg-white rounded-[4rem] p-10 md:p-14 shadow-2xl border-[12px] border-slate-900 mt-8 relative overflow-hidden flex flex-col">
           <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
              <h3 className="text-3xl font-black tracking-tight text-slate-900">বিশেষজ্ঞ অ্যাডভাইজরি</h3>
              <div className="flex items-center space-x-2">
                 <button onClick={handleSaveReportToProfile} disabled={isSaving} className="p-4 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shadow-sm">
                    {isSaving ? '...' : 'Save'}
                 </button>
                 <button onClick={() => playSpeech(advice.text)} className={`p-4 rounded-full shadow-xl transition-all ${isSpeaking ? 'bg-rose-500 animate-pulse' : 'bg-rose-600 text-white'}`}>🔊</button>
              </div>
           </div>
           <div className="prose prose-slate max-w-none font-medium leading-relaxed text-xl whitespace-pre-wrap text-slate-800">
              {formatResultContent(advice.text)}
           </div>

           <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 opacity-60">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-400">Primary Engine</span>
                  <span className="text-[10px] font-bold text-slate-700">Qwen/Qwen3-VL-8B</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-400">Version</span>
                  <span className="text-[10px] font-bold text-slate-700">v2.1.0-BD</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-400">Protocol</span>
                  <span className="text-[10px] font-bold text-slate-700">IRAC/FRAC-2026</span>
                </div>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">National Spray Integrity Protocol v3.0</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default PesticideExpert;
