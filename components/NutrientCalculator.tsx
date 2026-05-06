
import React, { useState, useRef, useEffect } from 'react';
import { detectCurrentAEZDetails, getStoredLocation } from '../services/locationService';
import { getAIPlantNutrientAdvice, generateSpeech } from '../services/geminiService';
import { CROPS_BY_CATEGORY } from '../constants';
import { User, SavedReport, View, Language } from '../types';
import ShareDialog from './ShareDialog';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';
import { ToolGuideHeader } from './ToolGuideHeader';

interface NutrientCalculatorProps {
  user?: User;
  onBack?: () => void;
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  onNavigate?: (view: View) => void;
  lang: Language;
}

const NUTRIENT_TOUR: TourStep[] = [
  { title: "সার ক্যালকুলেটর", content: "সঠিক পরিমাণে সার প্রয়োগ করে চাষের খরচ কমান এবং পরিবেশ রক্ষা করুন।", position: 'center' },
  { targetId: "nutrient-form-container", title: "তথ্য প্রদান", content: "আপনার ফসল, জমির মাপ এবং মাটি পরীক্ষা (ঐচ্ছিক) এর তথ্য দিন।", position: 'bottom' }
];

const NutrientCalculator: React.FC<NutrientCalculatorProps> = ({ onBack, onAction, onSaveReport, onShowFeedback, lang }) => {
  const [crop, setCrop] = useState('ধান');
  const [aez, setAez] = useState('অঞ্চল নির্বাচন করুন');
  const [currentLoc, setCurrentLoc] = useState<{lat: number, lng: number} | null>(null);
  const [soil] = useState('মাঝারি উর্বরতা');
  const [unit, setUnit] = useState<'bigha' | 'decimal'>('bigha');
  const [areaSize, setAreaSize] = useState<number>(33);
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeListeningId, setActiveListeningId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const { playSpeech, isSpeaking, speechEnabled } = useSpeech();
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const nutrientLoadingSteps = lang === 'bn' ? [ 
    "BARC Fertilizer Recommendation Guide 2024 লোড হচ্ছে...", 
    "আঞ্চলিক AEZ সয়েল প্রোফাইল বিশ্লেষণ করা হচ্ছে...", 
    "ফসলের পুষ্টি চাহিদা এবং সারের মাত্রা সমন্বয় হচ্ছে...", 
    "ইউরিয়া, টিএসপি এবং এমওপি এর বৈজ্ঞানিক মাত্রা গণনা চলছে..." 
  ] : [
    "Loading BARC Fertilizer Guide 2024...",
    "Analyzing regional AEZ soil characteristics...",
    "Syncing crop nutritional requirements...",
    "Calculating scientific Urea/TSP/MOP dosage..."
  ];

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_nutrient');
    if (!tourDone) setShowTour(true);
    const saved = getStoredLocation();
    if (saved) setCurrentLoc({lat: saved.lat, lng: saved.lng});
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const transcript = event.results[0][0].transcript;
        if (activeListeningId === 'crop') {
          const allCrops = Object.values(CROPS_BY_CATEGORY).flat();
          const found = allCrops.find(c => transcript.includes(c));
          if (found) setCrop(found);
        } else if (activeListeningId === 'areaSize') {
          const num = parseFloat(transcript.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) setAreaSize(num);
        }
      };
      recognitionRef.current.onend = () => { setIsListening(false); setActiveListeningId(null); };
    }
  }, [activeListeningId]);

  const toggleListening = (id: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening && activeListeningId === id) recognitionRef.current.stop();
    else { setActiveListeningId(id); recognitionRef.current.start(); }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % nutrientLoadingSteps.length), 2200);
    return () => clearInterval(interval);
  }, [isLoading, nutrientLoadingSteps.length]);

  const handleDetectAEZ = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectCurrentAEZDetails(true);
      setAez(`AEZ ${detected.id}: ${detected.name}`);
      const loc = getStoredLocation();
      if (loc) setCurrentLoc({lat: loc.lat, lng: loc.lng});
    } catch { alert('লোকেশন পাওয়া যায়নি।'); } finally { setIsDetecting(false); }
  };

  const calculateNutrientsAI = async () => {
    setIsLoading(true); setAdvice(null); setLoadingStep(0);
    try {
      const result = await getAIPlantNutrientAdvice(crop, aez, soil, areaSize, unit, lang);
      setAdvice(result || null);
      if (speechEnabled && result) playSpeech(result);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch { alert("পরামর্শ তৈরি করতে সমস্যা হয়েছে।"); } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (advice && onSaveReport) {
      setIsSaving(true);
      try {
        const audioBase64 = await generateSpeech(advice.replace(/[*#_~]/g, ''));
        onSaveReport({ type: 'Fertilizer', title: `${crop} - সার সুপারিশমালা`, content: advice, audioBase64, icon: '⚖️' });
        alert("অডিওসহ রিপোর্ট সেভ হয়েছে!");
      } catch {
        onSaveReport({ type: 'Fertilizer', title: `${crop} - সার সুপারিশমালা`, content: advice, icon: '⚖️' });
        alert("রিপোর্ট সেভ হয়েছে");
      } finally { setIsSaving(false); }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen pb-32 font-sans">
      {showTour && <GuidedTour steps={NUTRIENT_TOUR} tourKey="nutrient" onClose={() => setShowTour(false)} />}
      {isShareOpen && advice && (
        <ShareDialog 
          isOpen={isShareOpen} 
          onClose={() => setIsShareOpen(false)} 
          title={`Fertilizer Recommendation: ${crop}`} 
          content={advice} 
        />
      )}
      
      <ToolGuideHeader 
        title={lang === 'bn' ? 'সার ক্যালকুলেটর (BARC)' : 'Fertilizer Calculator (BARC)'}
        subtitle={lang === 'bn' ? 'জমির মাপ ও উর্বরতা অনুযায়ী সারের সঠিক বৈজ্ঞানিক মাত্রা।' : 'Precise scientific fertilizer dosage based on land size and soil fertility.'}
        protocol="BARC-FRG-2024"
        source="Bangladesh Agricultural Research Council"
        lang={lang}
        onBack={onBack || (() => {})}
        icon="⚖️"
        themeColor="emerald"
        guideSteps={lang === 'bn' ? [
          "তালিকায় থাকা ফসলগুলো থেকে আপনার চাষকৃত ফসল নির্বাচন করুন।",
          "জমির পরিমাণ লিখে একক (বিঘা বা শতাংশ) বেছে নিন।",
          "নির্ভুল ফলাফলের জন্য অঞ্চল (AEZ) শনাক্তকরণ বাটনটি ব্যবহার করুন।",
          "পরামর্শ জেনারেট করে প্রয়োজনীয় ইউরিয়া, টিএসপি ও এমওপি সারের মাত্রা জানুন।"
        ] : [
          "Select your cultivated crop from the provided list.",
          "Enter land area and select the unit (Bigha or Decimal).",
          "Use the AEZ detection button for higher scientific accuracy.",
          "Generate advisory to calculate required Urea, TSP, and MOP dosages."
        ]}
      />

      {/* Floating Status Toast */}
      {isLoading && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-bounce-in w-full max-w-xs md:max-w-sm px-4">
           <div className="bg-slate-900/95 text-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col space-y-4 border border-emerald-500/30 backdrop-blur-md">
              <div className="flex items-center space-x-4">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-lg">⚖️</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">BARC Fertilizer Logic v3.0</p>
                  <h4 className="text-sm font-bold truncate transition-all duration-500">{nutrientLoadingSteps[loadingStep]}</h4>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-1 px-1 py-0.5">
                 {[0,1,2,3].map(i => (
                   <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= loadingStep ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-white/5'}`}></div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div id="nutrient-form-container" className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 space-y-6 relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div>
              <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">ফসলের নাম</label><button onClick={() => toggleListening('crop')} className={`p-2 rounded-xl transition-all ${isListening && activeListeningId === 'crop' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div>
              <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-bold text-gray-800 shadow-inner">
                {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
               <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">জমির পরিমাণ</label><button onClick={() => toggleListening('areaSize')} className={`p-2 rounded-xl transition-all ${isListening && activeListeningId === 'areaSize' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div>
               <div className="flex gap-2">
                  <input type="number" value={areaSize} onChange={(e) => setAreaSize(parseFloat(e.target.value))} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-bold text-gray-800 shadow-inner" />
                  <div className="flex bg-slate-100 p-1 rounded-2xl"><button onClick={() => setUnit('bigha')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${unit === 'bigha' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>বিঘা</button><button onClick={() => setUnit('decimal')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${unit === 'decimal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>শতাংশ</button></div>
               </div>
            </div>
            <div id="nutrient-aez-info">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">অঞ্চল (AEZ) ও অবস্থান</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="text" readOnly value={aez} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-600 shadow-inner" />
                  <button onClick={handleDetectAEZ} disabled={isDetecting} className="bg-blue-50 text-blue-600 px-6 rounded-2xl border border-blue-100 active:scale-95 transition flex items-center justify-center">
                    <span>{isDetecting ? '...' : '📍'}</span>
                  </button>
                </div>
                {currentLoc && (
                  <p className="px-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">GPS Coords: {currentLoc.lat.toFixed(5)}, {currentLoc.lng.toFixed(5)}</p>
                )}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center space-x-3"><div className="text-xl">📜</div><p className="text-[9px] font-black text-blue-700 uppercase leading-relaxed">BARC-2024 নির্দেশিকা অনুযায়ী বৈজ্ঞানিক প্রোটোকল।</p></div>
            <button onClick={calculateNutrientsAI} disabled={isLoading} className="w-full bg-[#0A8A1F] text-white font-black py-6 rounded-[2rem] shadow-2xl transition-all active:scale-95 flex justify-center items-center text-xl">{isLoading ? 'প্রসেস হচ্ছে...' : 'পরামর্শ জেনারেট করুন'}</button>
          </div>
        </div>

        <div className="flex flex-col space-y-6 min-h-[400px]">
          {isLoading ? (
            <div className="bg-white rounded-[3rem] p-12 text-center shadow-2xl border border-emerald-50 flex flex-col items-center justify-center space-y-10 animate-fade-in h-full relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
               <div className="relative">
                  <div className="w-24 h-24 border-[10px] border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">⚖️</div>
               </div>
               <div className="space-y-4 max-w-xs w-full">
                  <h3 className="text-xl font-black text-slate-800 transition-all duration-500">{loadingStep < nutrientLoadingSteps.length ? nutrientLoadingSteps[loadingStep] : "প্রসেস হচ্ছে..."}</h3>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                     <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${((loadingStep + 1) / nutrientLoadingSteps.length) * 100}%` }}></div>
                  </div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-60">BARC-2024 Digital Mapping Active</p>
               </div>
            </div>
          ) : advice ? (
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl animate-fade-in relative overflow-hidden flex-1 border-4 border-emerald-500/30">
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 relative z-10">
                <div><h3 className="text-xl font-black tracking-tight">অ্যাডভাইজরি রিপোর্ট</h3><div className="flex gap-2 mt-1"><span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">BARC-2024</span><span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">Verified</span></div></div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsShareOpen(true)} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 shadow-xl border border-white/10"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                    <button onClick={() => playSpeech(advice)} className={`p-4 rounded-full shadow-2xl transition-all ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-emerald-600'}`}>{isSpeaking ? '🔇' : '🔊'}</button>
                </div>
              </div>
              <div className="prose prose-invert max-w-none font-medium leading-relaxed whitespace-pre-wrap text-slate-300 text-lg">{advice}</div>
              <div className="mt-10 pt-8 border-t border-white/10 flex flex-col md:flex-row gap-4 items-center">
                 <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 w-full">সেভ (অডিওসহ)</button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-[3rem] p-12 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-6 h-full opacity-60"><span className="text-6xl">⚖️</span><p className="font-black text-gray-400">রিপোর্ট জেনারেট করতে বাম পাশের তথ্যগুলো পূরণ করুন</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutrientCalculator;
