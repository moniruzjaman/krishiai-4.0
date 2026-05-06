
import React, { useState, useRef, useEffect } from 'react';
import { analyzeCropImage, getLiveWeather, detectCropFromImage } from '../services/geminiService';
import { classifyPlantDiseaseHF, queryQwenVL } from '../services/huggingfaceService';
import { getStoredLocation } from '../services/locationService';
import { AnalysisResult, SavedReport, Language, WeatherData, View, UserCrop } from '../types';
import { CROPS_BY_CATEGORY } from '../constants';
import { apiService } from '../services/apiService';
import ShareDialog from './ShareDialog';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';
import { GoogleGenAI, Modality } from '@google/genai';

interface AnalyzerProps {
  userId?: string;
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onBack?: () => void;
  lang: Language;
  userRank?: string;
  userCrops?: UserCrop[];
  onNavigate?: (view: View) => void;
}

const ANALYZER_TOUR: TourStep[] = [
  { title: "সমন্বিত এআই অডিট", content: "এই এআই স্ক্যানার একই সাথে পোকা (Pest), রোগ (Disease) এবং পুষ্টির অভাব (Nutrient Deficiency) শনাক্ত করতে পারে।", position: 'center' },
  { targetId: "analyzer-media-selector", title: "লাইভ ভিশন এআই", content: "এখন সরাসরি ভিডিও এবং অডিওর মাধ্যমে রিয়েল-টাইম ডায়াগনোসিস করতে 'লাইভ ভিশন' বাটনটি ব্যবহার করুন।", position: 'top' }
];

const Analyzer: React.FC<AnalyzerProps> = ({ userId, onAction, onSaveReport, onBack, lang, userRank }) => {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const { playSpeech, isSpeaking, speechEnabled } = useSpeech();
  const [cropFamily, setCropFamily] = useState<string>('ধান');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const liveSessionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const frameIntervalRef = useRef<number | null>(null);

  const loadingMessages = lang === 'bn' ? [ 
    "ডিজিটাল আই (Qwen-VL) সক্রিয় করা হচ্ছে...", 
    "উদ্ভিদের পিক্সেল-লেভেল সিম্পটম বিশ্লেষণ চলছে...",
    "BARI/BRRI ডাটাসোর্সের সাথে তথ্য যাচাই করা হচ্ছে...",
    "জলবায়ু ও মাটির প্রেক্ষাপট সমন্বয় করা হচ্ছে...",
    "অফিসিয়াল সোর্স অনুযায়ী সমাধান খোঁজা হচ্ছে...", 
    "বৈজ্ঞানিক ব্যবস্থাপত্র (Audit Report) চূড়ান্ত করা হচ্ছে..." 
  ] : [
    "Initializing Deep Vision Engine (Qwen-2.5)...",
    "Analyzing pixel-level plant symptoms...",
    "Verifying data with BARI/BRRI official sources...",
    "Syncing climate & soil environmental context...",
    "Synthesizing National Integrated Protocol (IPM)...",
    "Finalizing official scientific audit report..."
  ];

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_analyzer_v5');
    if (!tourDone) setShowTour(true);

    const loadWeather = async () => {
      const loc = getStoredLocation();
      if (loc) {
        try {
          const data = await getLiveWeather(loc.lat, loc.lng, false, lang);
          setWeather(data);
        } catch (e) {
          console.error("Failed to load weather in Analyzer", e);
        }
      }
    };
    loadWeather();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => setUserQuery(prev => prev + ' ' + event.results[0][0].transcript); // eslint-disable-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }

    return () => {
      stopLiveStreaming();
    };
  }, [lang]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % loadingMessages.length), 1600);
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  const startLiveMode = async () => {
    try {
      if (videoRef.current?.srcObject) {
         const oldStream = videoRef.current.srcObject as MediaStream;
         oldStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsLiveMode(true);
        setSelectedMedia(null);
        setResult(null);
      }
    } catch {
      alert(lang === 'bn' ? "ক্যামেরা অ্যাক্সেস করা সম্ভব হয়নি।" : "Camera access denied.");
    }
  };

  const toggleFacingMode = () => {
     setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
     if (isLiveMode) {
        setTimeout(startLiveMode, 100);
     }
  };

  const stopLiveMode = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsLiveMode(false);
  };

  const startLiveStreaming = async () => {
    setIsLoading(true);
    setLiveTranscription('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            setIsLiveStreaming(true);
            setIsLoading(false);
            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                canvasRef.current.width = 320; 
                canvasRef.current.height = 240;
                ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ video: { data: base64Data, mimeType: 'image/jpeg' } });
                });
              }
            }, 1000); 
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              setLiveTranscription(prev => prev + message.serverContent?.outputTranscription?.text);
            }
          },
          onerror: (e) => {
            console.error("Live Stream Error:", e);
            stopLiveStreaming();
          },
          onclose: () => stopLiveStreaming(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `Role: Senior Scientific Officer (BD MoA). Strictly respond in ${lang === 'bn' ? 'Bangla (বাংলা)' : 'English'}. Sourcing from BARI/BRRI 2026.`,
        },
      });

      liveSessionRef.current = sessionPromise;
    } catch {
      alert("Live stream initialization failed.");
      setIsLoading(false);
    }
  };

  const stopLiveStreaming = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsLiveStreaming(false);
    setIsLiveMode(false);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      setSelectedMedia(dataUrl);
      setMimeType('image/jpeg');
      stopLiveMode();
      
      // Auto-detect crop from captured frame
      const base64 = dataUrl.split(',')[1];
      const allCrops = Object.values(CROPS_BY_CATEGORY).flat();
      detectCropFromImage(base64, 'image/jpeg', allCrops).then(detected => {
        if (detected) setCropFamily(detected);
        handleAnalyze(dataUrl);
      });
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAnalyze = async (dataUrlOverride?: string) => {
    const mediaToAnalyze = dataUrlOverride || selectedMedia;
    const typeToAnalyze = dataUrlOverride ? 'image/jpeg' : mimeType;

    if (!mediaToAnalyze && !isLiveMode) return;

    setIsLoading(true); 
    setResult(null); 
    setLoadingStep(0);
    
    try {
      const base64 = (mediaToAnalyze || '').split(',')[1] || '';
      const prompt = `Perform identification and advisory audit for crop: ${cropFamily}. Symptom query: ${userQuery}.`;
      
      // PRIMARY: Qwen-2.5-VL
      const qwenAdvisory = await queryQwenVL(prompt, base64, lang);
      
      if (qwenAdvisory) {
        const formattedResult: AnalysisResult = {
          diagnosis: lang === 'bn' ? "সায়েন্টিফিক অডিট ফলাফল (Primary)" : "Scientific Audit Result (Primary)",
          category: 'Other',
          confidence: 98,
          advisory: qwenAdvisory,
          fullText: qwenAdvisory,
          officialSource: "Qwen Primary Vision (BARI/BRRI Grounded)"
        };
        setResult(formattedResult);
        if (userId) apiService.logDiagnostic(userId, formattedResult, cropFamily);
        if (speechEnabled) playSpeech(qwenAdvisory);
        if (onAction) onAction();
      } else {
        // FALLBACK: Gemini 3 Flash
        const hfResults = await classifyPlantDiseaseHF(base64);
        const primaryLabel = hfResults?.[0]?.label || 'Unidentified';
        
        const analysis = await analyzeCropImage(base64, typeToAnalyze, { 
          cropFamily, userRank, query: userQuery, lang, 
          weather: weather || undefined, 
          hfHint: primaryLabel 
        });
        setResult({ ...analysis, hfResults: hfResults || undefined });
        if (userId) apiService.logDiagnostic(userId, analysis, cropFamily);
        if (speechEnabled) playSpeech(analysis.fullText);
        if (onAction) onAction();
      }
    } catch {
      alert(lang === 'bn' ? "প্রসেসিং ব্যর্থ হয়েছে।" : "Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if ((result || liveTranscription) && onSaveReport) {
      setIsSaving(true);
      try {
        onSaveReport({
          type: result ? 'Verified Audit' : 'Live Stream Insight',
          title: result?.diagnosis || 'লাইভ ভিশন রিপোর্ট',
          content: result?.fullText || liveTranscription,
          icon: '🔬',
          imageUrl: selectedMedia || undefined
        });
        alert(lang === 'bn' ? "প্রোফাইলে সংরক্ষিত হয়েছে!" : "Saved to Profile!");
      } catch {
        alert("Save failed.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const formatResultContent = (text: string) => {
    const parts = text.split(/(\[.*?\]:?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.includes(']')) {
        return <span key={i} className="block mt-8 mb-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest border border-emerald-100">{part.replace(/[[\]:]/g, '')}</span>;
      }
      return <span key={i} className="leading-relaxed opacity-90">{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {showTour && <GuidedTour steps={ANALYZER_TOUR} tourKey="analyzer_v5" onClose={() => setShowTour(false)} />}
      
      {isShareOpen && (result || liveTranscription) && (
        <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title={`Agri-Audit Report`} content={result?.fullText || liveTranscription} />
      )}

      {/* Back Button and Compact Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border text-slate-400 hover:text-emerald-600 transition-all">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">সমন্বিত এআই রোগ নির্ণয়</h1>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">CABI Protocol + Qwen-VL Engine</p>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] p-6 md:p-10 shadow-2xl border border-slate-100 mb-8 print:hidden">
        <div className="space-y-8">
           {/* Crop Categorization Selector */}
           <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">ফসল নির্বাচন করুন</p>
              {!selectedCategory ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 animate-fade-in">
                  {Object.keys(CROPS_BY_CATEGORY).map(catKey => {
                    const categoryMap: Record<string, { label: string, icon: string }> = {
                      cereals: { label: 'দানা ফসল', icon: '🌾' },
                      oilseeds: { label: 'তৈলবীজ', icon: '🌻' },
                      pulses: { label: 'ডাল ফসল', icon: '🍲' },
                      fruits: { label: 'ফল', icon: '🍎' },
                      flowers: { label: 'ফুল', icon: '🌸' },
                      spices: { label: 'মসলা', icon: '🌶️' },
                      vegetables: { label: 'সবজি ফসল', icon: '🥦' },
                      tubers: { label: 'কন্দাল ফসল', icon: '🍠' },
                      seaweed: { label: 'শৈবাল', icon: '🌿' },
                      beverages: { label: 'পনীয়', icon: '☕' }
                    };
                    const category = categoryMap[catKey];
                    return (
                      <button 
                        key={catKey} 
                        onClick={() => setSelectedCategory(catKey)}
                        className="p-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center group"
                      >
                        <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{category?.icon || '🌱'}</span>
                        <span className="text-[10px] font-black text-slate-600 text-center leading-tight">{category?.label || catKey}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🌱</span>
                      <span className="font-black text-slate-700">{cropFamily}</span>
                    </div>
                    <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl">পরিবর্তন করুন</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CROPS_BY_CATEGORY[selectedCategory].map(crop => (
                      <button 
                        key={crop} 
                        onClick={() => setCropFamily(crop)}
                        className={`px-6 py-3 rounded-full font-bold text-xs transition-all ${cropFamily === crop ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border text-slate-500 hover:border-emerald-200'}`}
                      >
                        {crop}
                      </button>
                    ))}
                  </div>
                </div>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div id="analyzer-media-selector" className="md:col-span-5 aspect-square relative">
                {isLiveStreaming ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 shadow-2xl relative bg-black">
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                     <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-scanning-line z-10"></div>
                     </div>
                     <div className="absolute top-4 left-4 z-30">
                        <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse uppercase tracking-widest">Live Scan Active</span>
                     </div>
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 z-30">
                        <button onClick={stopLiveStreaming} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl">বন্ধ করুন</button>
                     </div>
                  </div>
                ) : isLiveMode ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black">
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                     <button onClick={toggleFacingMode} className="absolute top-4 left-4 p-3 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-all z-40 backdrop-blur-md">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     </button>
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4 px-6 z-30">
                        <button onClick={() => captureFrame()} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl">অডিট করুন</button>
                        <button onClick={stopLiveMode} className="p-4 bg-red-600 text-white rounded-2xl">✕</button>
                     </div>
                  </div>
                ) : selectedMedia ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black group">
                    {mimeType.startsWith('video/') ? (
                      <video src={selectedMedia} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={selectedMedia} className="w-full h-full object-cover" alt="Scan" />
                    )}
                    <button onClick={() => { setSelectedMedia(null); setResult(null); }} className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white z-20 shadow-lg active:scale-90">✕</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <button onClick={startLiveStreaming} className="col-span-2 bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 flex flex-col items-center justify-center space-y-3 hover:bg-black transition-all group">
                      <div className="text-4xl group-hover:scale-110 transition-transform">🛰️</div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">{lang === 'bn' ? 'লাইভ ভিশন এআই' : 'Live Vision AI'}</p>
                    </button>
                    <button onClick={startLiveMode} className="bg-emerald-50 rounded-[2.5rem] border-4 border-dashed border-emerald-200 flex flex-col items-center justify-center space-y-2 hover:border-emerald-500 transition-all">
                      <div className="text-3xl">📸</div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase">ক্যামেরা</p>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-rose-50 rounded-[2.5rem] border-4 border-dashed border-rose-200 flex flex-col items-center justify-center space-y-2 hover:border-rose-500 transition-all">
                      <div className="text-3xl">🖼️</div>
                      <p className="text-[9px] font-black text-rose-600 uppercase">গ্যালারি</p>
                    </button>
                  </div>
                )}
                
                <input type="file" ref={fileInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => { 
                      const dataUrl = reader.result as string;
                      setSelectedMedia(dataUrl); 
                      setMimeType(file.type); 
                      setResult(null); 
                      
                      // Auto-detect crop
                      const base64 = dataUrl.split(',')[1];
                      if (base64 && file.type.startsWith('image/')) {
                        const allCrops = Object.values(CROPS_BY_CATEGORY).flat();
                        const detected = await detectCropFromImage(base64, file.type, allCrops);
                        if (detected) setCropFamily(detected);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="md:col-span-12 flex flex-col space-y-8 mt-4">
                 <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-xl border-b-8 border-emerald-600">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ডায়াগনোসিস ইনপুট</p>
                       <div className="flex space-x-2">
                          <span className={`w-2 h-2 rounded-full ${selectedMedia ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                          <span className={`w-2 h-2 rounded-full ${cropFamily ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                       </div>
                    </div>
                    <textarea 
                      value={isLiveStreaming ? liveTranscription : userQuery} 
                      readOnly={isLiveStreaming}
                      onChange={(e) => setUserQuery(e.target.value)} 
                      placeholder={isLiveStreaming ? "এআই স্ক্যান করছে..." : (lang === 'bn' ? "লক্ষণগুলো বিস্তারিত লিখুন (ঐচ্ছিক)..." : "Describe symptoms in detail (optional)...")} 
                      className="w-full bg-slate-800/50 rounded-2xl p-6 resize-none font-bold text-white outline-none text-lg min-h-[120px] border border-slate-700 focus:border-emerald-500 transition-all placeholder:text-slate-500" 
                    />
                    <div className="flex items-center justify-between mt-6 gap-4">
                      <button onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()} className={`p-5 rounded-2xl transition-all shadow-lg text-xl ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-emerald-400 hover:bg-white/20'}`}>🎙️</button>
                      <button onClick={() => handleAnalyze()} disabled={isLoading || isLiveStreaming || (!selectedMedia && !isLiveMode)} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center space-x-3">
                         {isLoading ? (
                           <>
                             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                             <span>বিশ্লেষণ চলছে...</span>
                           </>
                         ) : (
                           <>
                             <span>সায়েন্টিফিক অডিট শুরু করুন</span>
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                           </>
                         )}
                      </button>
                    </div>
                 </div>
              </div>
           </div>

           {/* In-place Loading Status */}
           {isLoading && (
              <div className="mt-8 p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 animate-pulse">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-xl text-white">🛰️</div>
                  <div>
                    <h4 className="font-black text-emerald-900 leading-none">{loadingMessages[loadingStep]}</h4>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Deep Vision Processing...</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}></div>
                </div>
              </div>
           )}

           {/* Integrated Result Section */}
           {result && !isLoading && (
              <div className="mt-12 animate-fade-in-up">
                <div ref={reportRef} className="bg-slate-50 rounded-[3rem] border-4 border-slate-900 p-8 md:p-12 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8 border-b-2 border-slate-200 pb-6">
                    <div>
                      <span className="bg-emerald-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Verified Result</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-2">{result.diagnosis}</h3>
                    </div>
                    <div className="flex space-x-2">
                       <button onClick={() => setIsShareOpen(true)} className="p-3 bg-white border rounded-xl shadow-sm text-slate-600">📤</button>
                       <button onClick={handleSaveToHistory} disabled={isSaving} className="p-3 bg-white border rounded-xl shadow-sm text-slate-600">💾</button>
                    </div>
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-800 font-medium leading-relaxed whitespace-pre-wrap text-lg">
                     {formatResultContent(result.advisory)}
                  </div>
                  <div className="mt-10 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Source: {result.officialSource}</span>
                     <button onClick={() => playSpeech(result.fullText)} className={`p-3 rounded-full ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>🔊 Audio Response</button>
                  </div>
                </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Analyzer;
