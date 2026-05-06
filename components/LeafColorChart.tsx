
import React, { useState, useRef, useEffect } from 'react';
import { getLCCAnalysisSummary, analyzeLeafColorAI, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { Language } from '../types';
import { ToolGuideHeader } from './ToolGuideHeader';

interface LeafColorChartProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  lang: Language;
}

const VARIETY_DATA = [
  { name: "BRRI dhan28", threshold: 4 }, 
  { name: "BRRI dhan74", threshold: 4 }, 
  { name: "Local Variety", threshold: 4, type: "Local" },
  { name: "Manual Entry", threshold: 4, isManual: true }
];

const LCC_COLORS = [
  { id: 1, hex: "#D4E157", label: "Very Light" },
  { id: 2, hex: "#C0CA33", label: "Light Green" },
  { id: 3, hex: "#9E9D24", label: "Medium Green" },
  { id: 4, hex: "#827717", label: "Dark Green" },
  { id: 5, hex: "#33691E", label: "Very Dark" }
];

const LeafColorChart: React.FC<LeafColorChartProps> = ({ onAction, onShowFeedback, onBack, lang }) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); 
  const [progress, setProgress] = useState<number>(0);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [lccValue, setLccValue] = useState<number | null>(null);
  const [tsr, setTsr] = useState<number>(0);
  const [recommendation, setRecommendation] = useState<{ dose: string, text: string } | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedVariety, setSelectedVariety] = useState<string>(VARIETY_DATA[0].name);
  const [locationId, setLocationId] = useState<string>('');
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isListening, setIsListening] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLocationId(transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert(lang === 'bn' ? "ভয়েস ইনপুট সমর্থিত নয়।" : "Voice input not supported.");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const TR = {
    en: {
      title: "Digital Leaf Color Chart", subtitle: "Nitrogen management protocol based on IRRI standards.", capture: "1. Capture Leaf Image", camera: "Take Photo", gallery: "Gallery", analyze: "2. Analyze Leaf Color", statusWaiting: "Waiting for image...", statusRefining: "Refining image quality...", statusCalculating: "Calculating chlorophyll index...", statusAnalyzing: "Analyzing color spectrum...", statusFinalizing: "Generating trust score...", statusSuccess: "Analysis Complete!", lccLabel: "LCC Value", nRecLabel: "Recommended N Dose", tsrLabel: "Trust Score (TSR)", resultsTitle: "Analysis Results", saveTitle: "3. Save Analysis Data", locationPlaceholder: "Plot ID / Location", saveBtn: "Save Analysis Data", rec3: "Moderate deficiency. N top-dress required.", rec4: "Mild deficiency. Low dose N top-dress required.", rec5: "Adequate N. No top-dress needed.", toastCapture: "✅ Image captured.", toastAnalysis: "✅ Results ready.", toastSave: "💾 Saved successfully!", errorLowTsr: "Trust Score Low. Recapture in better light.", initialState: "Capture leaf to begin.", aiInsightTitle: "AI Expert Insight", aiLoading: "Thinking..."
    },
    bn: {
      title: "ডিজিটাল লিফ কালার চার্ট", subtitle: "IRRI প্রটোকল ভিত্তিক ইউরিয়া নির্ধারণী ডিজিটাল টুল।", capture: "১. পাতার ছবি তুলুন", camera: "ছবি তুলুন", gallery: "গ্যালারি", analyze: "২. রঙ বিশ্লেষণ করুন", statusWaiting: "ছবির জন্য অপেক্ষা করছে...", statusRefining: "ছবির মান যাচাই হচ্ছে...", statusCalculating: "ক্লোরোফিল ইনডেক্স গণনা হচ্ছে...", statusAnalyzing: "কালার স্পেকট্রাম বিশ্লেষণ চলছে...", statusFinalizing: "ট্রাস্ট স্কোর তৈরি হচ্ছে...", statusSuccess: "বিশ্লেষণ সম্পন্ন!", lccLabel: "এলসিসি মান", nRecLabel: "সুপারিশকৃত ইউরিয়া ডোজ", tsrLabel: "ট্রাস্ট স্কোর (TSR)", resultsTitle: "বিশ্লেষণ ফলাফল", locationPlaceholder: "স্থান বা প্লট আইডি", saveBtn: "বিশ্লেষণ সেভ করুন", rec3: "মাঝারি ঘাটতি। ইউরিয়া সার প্রয়োজন।", rec4: "সামান্য ঘাটতি। কম মাত্রায় ইউরিয়া প্রয়োজন।", rec5: "পর্যাপ্ত নাইট্রোজেন। সারের প্রয়োজন নেই।", toastCapture: "✅ ছবি তোলা হয়েছে।", toastAnalysis: "✅ ফলাফল প্রস্তুত।", toastSave: "💾 সংরক্ষিত হয়েছে!", errorLowTsr: "ট্রাস্ট স্কোর কম। ভালো আলোতে আবার চেষ্টা করুন।", initialState: "পাতা স্ক্যান করতে ছবি তুলুন।", aiInsightTitle: "এআই বিশেষজ্ঞ ইনসাইট", aiLoading: "প্রসেস হচ্ছে..."
    }
  };

  const t = TR[lang];

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setStep(1);
        setProgress(0);
        showToast(t.toastCapture, 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startAnalysis = async () => {
    if (!imageSrc) return;
    setStep(2);
    setProgress(10);
    setStatus(t.statusRefining);
    
    try {
      const analysisPromise = analyzeLeafColorAI(imageSrc, 'image/jpeg');
      
      await new Promise(r => setTimeout(r, 800));
      setProgress(35);
      setStatus(t.statusCalculating);
      
      await new Promise(r => setTimeout(r, 1200));
      setProgress(70);
      setStatus(t.statusAnalyzing);
      
      const analysisResult = await analysisPromise;
      
      await new Promise(r => setTimeout(r, 800));
      setProgress(90);
      setStatus(t.statusFinalizing);
      
      const lcc = analysisResult.lccValue;
      const confidence = analysisResult.confidence;
      
      setLccValue(lcc);
      setTsr(confidence);
      
      let dose = "0 kg/ha";
      let text = t.rec5;
      if (lcc <= 3) { dose = "35-40 kg/ha"; text = t.rec3; }
      else if (lcc === 4) { dose = "15-20 kg/ha"; text = t.rec4; }
      
      setRecommendation({ dose, text });
      setProgress(100);
      setStatus(t.statusSuccess);
      setStep(3);
      showToast(t.toastAnalysis, 'success');

      setIsAiLoading(true);
      const insight = await getLCCAnalysisSummary(lcc, confidence, dose, lang);
      setAiInsight(insight || null);
      if (insight) playTTS(insight);
    } catch (e) {
      console.error("LCC analysis failed", e);
      showToast("Analysis failed.", 'error');
      resetAnalysis();
    } finally {
      setIsAiLoading(false);
    }

    if (onAction) onAction();
  };

  const playTTS = async (text: string) => {
    if (isPlaying) { stopTTS(); return; }
    try {
      setIsPlaying(true);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const cleanText = text.replace(/[*#_~]/g, '');
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

  const handleSaveData = async () => {
    if (tsr < 60) return showToast(t.errorLowTsr, 'error');
    setIsSaving(true);
    try {
      const audioToSave = aiInsight ? await generateSpeech(aiInsight.replace(/[*#_~]/g, '')) : undefined;
      window.dispatchEvent(new CustomEvent('agritech_save_report', {
        detail: {
          type: 'LCC Analysis',
          title: `${selectedVariety} - ${locationId || 'Manual'}`,
          content: aiInsight || `LCC: ${lccValue}, N-Dose: ${recommendation?.dose}`,
          audioBase64: audioToSave,
          icon: '🍃',
          imageUrl: imageSrc
        }
      }));
      showToast(t.toastSave, 'success');
      if (onShowFeedback) onShowFeedback();
    } catch {
      showToast("Save failed", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetAnalysis = () => {
    setImageSrc(null);
    setStep(0);
    setLccValue(null);
    setRecommendation(null);
    setAiInsight(null);
    stopTTS();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      <ToolGuideHeader 
        title={t.title}
        subtitle={t.subtitle}
        protocol="IRRI / BRRI LCC-v2"
        source="Integrated Nitrogen Management"
        lang={lang}
        onBack={onBack || (() => {})}
        icon="🍃"
        themeColor="emerald"
        guideSteps={lang === 'bn' ? [
          "মাঝখানের ১টি সতেজ ধানের পাতার ছবি নিন।",
          "সরাসরি কড়া রোদে ছবি তুলবেন না, দিনের আলোতে নিন।",
          "এআই আপনার পাতার রঙ ইনডেক্স করে নাইট্রোজেন ডোজ দেবে।",
          "ফলাফলটি সেভ করে ভবিষ্যতে ব্যবহারের জন্য রাখুন।"
        ] : [
          "Capture 1 fresh leaf from the middle of the plant.",
          "Avoid direct harsh sunlight, use natural daylight.",
          "AI indexes leaf color and suggests nitrogen dosage.",
          "Save the results for future reference."
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
           <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                 <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] mr-2">1</span>
                 {t.capture}
              </h3>
              
              <div className="aspect-square w-full rounded-[2.5rem] bg-slate-50 border-4 border-dashed border-slate-200 overflow-hidden relative group">
                {imageSrc ? (
                  <img src={imageSrc} className="w-full h-full object-cover animate-fade-in" alt="Leaf" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                     <span className="text-6xl mb-4">📸</span>
                     <p className="text-xs font-bold text-center px-8 opacity-60">{t.initialState}</p>
                  </div>
                )}
                <input type="file" ref={cameraInputRef} capture="environment" accept="image/*" className="hidden" onChange={handleCapture} />
                <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleCapture} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                 <button onClick={() => cameraInputRef.current?.click()} className="bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    {t.camera}
                 </button>
                 <button onClick={() => galleryInputRef.current?.click()} className="bg-emerald-50 text-emerald-600 border border-emerald-100 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                    {t.gallery}
                 </button>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">LCC Color Reference (IRRI)</h4>
              <div className="flex w-full h-12 rounded-xl overflow-hidden shadow-inner border border-slate-100">
                 {LCC_COLORS.map(c => (
                   <div key={c.id} className="flex-1 group relative cursor-help" style={{ backgroundColor: c.hex }}>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/40">{c.id}</div>
                   </div>
                 ))}
              </div>
              <p className="text-[8px] font-bold text-slate-400 mt-2 text-center">Standard Color Panels (Index 1-5)</p>
           </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
           <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-xl border border-slate-100 h-full flex flex-col">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center">
                 <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] mr-2">2</span>
                 {t.analyze}
              </h3>

              {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in py-12">
                   <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl mb-8 animate-bounce">🧬</div>
                   <h4 className="text-2xl font-black text-slate-800 mb-6">Leaf Image Ready</h4>
                   <button onClick={startAnalysis} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Start Analysis</button>
                </div>
              )}

              {step === 2 && (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                   <div className="relative w-40 h-40 mb-10">
                      <svg className="w-full h-full transform -rotate-90">
                         <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                         <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (progress / 100) * 440} className="text-emerald-600 transition-all duration-500" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                         <span className="text-3xl font-black text-slate-800">{progress}%</span>
                      </div>
                   </div>
                   <p className="text-lg font-black text-slate-800 tracking-tight text-center">{status}</p>
                </div>
              )}

              {step === 3 && lccValue && (
                <div className="animate-fade-in flex-1">
                   <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                      <h4 className="text-2xl font-black text-slate-800">{t.resultsTitle}</h4>
                      <button onClick={resetAnalysis} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:text-rose-600 transition-all">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-3">{t.lccLabel}</p>
                         <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl text-white shadow-xl ${
                           lccValue <= 2 ? 'bg-amber-400' : lccValue <= 4 ? 'bg-emerald-500' : 'bg-green-700'
                         }`}>{lccValue}</div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-3">{t.tsrLabel}</p>
                         <div className="text-4xl font-black text-blue-600">{tsr}%</div>
                      </div>
                   </div>

                   <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl mb-8 relative overflow-hidden">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">{t.nRecLabel}</p>
                      <h5 className="text-4xl font-black mb-4">{recommendation?.dose}</h5>
                      <p className="text-lg font-medium text-slate-300 leading-relaxed italic border-l-4 border-emerald-500 pl-6">
                        &quot;{recommendation?.text}&quot;
                      </p>
                   </div>

                   <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 relative mb-10">
                      <div className="flex justify-between items-center mb-6">
                         <h4 className="text-xl font-black text-slate-800">{t.aiInsightTitle}</h4>
                         <button onClick={() => aiInsight && playTTS(aiInsight)} className={`p-4 rounded-full shadow-lg ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-emerald-600'}`}>
                            {isPlaying ? '🔇' : '🔊'}
                         </button>
                      </div>
                      {isAiLoading ? (
                        <div className="flex items-center space-x-3 py-6">
                           <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                           <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t.aiLoading}</p>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{aiInsight}</p>
                      )}
                   </div>

                   <div className="mt-10 pt-10 border-t border-slate-100 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={selectedVariety} onChange={(e) => setSelectedVariety(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:border-emerald-500 outline-none">
                           {VARIETY_DATA.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                        </select>
                        <div className="relative">
                          <input type="text" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder={t.locationPlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 font-bold text-slate-700 outline-none focus:border-emerald-500 shadow-inner" />
                          <button onClick={toggleListening} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>🎙️</button>
                        </div>
                      </div>

                      <button onClick={handleSaveData} disabled={tsr < 60 || isSaving} className="w-full bg-[#0A8A1F] text-white py-6 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 disabled:bg-slate-200 flex items-center justify-center space-x-3">
                         {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>{t.saveBtn}</span>}
                      </button>
                   </div>
                </div>
              )}

              {step === 0 && (
                 <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 py-20">
                    <div className="text-8xl mb-8">🍃</div>
                    <p className="font-black text-slate-400 uppercase tracking-widest">{t.statusWaiting}</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-bounce flex items-center border-2 ${
          toast.type === 'success' ? 'bg-white border-emerald-500 text-emerald-600' : 'bg-white border-rose-500 text-rose-600'
        }`}>
           <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
};

export default LeafColorChart;
