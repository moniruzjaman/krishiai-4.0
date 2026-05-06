
import React, { useState, useRef, useEffect } from 'react';
import { getCropDiseaseInfo, generateAgriImage, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { CROP_CATEGORIES, CROPS_BY_CATEGORY } from '../constants';
import { CropDiseaseReport, SavedReport } from '../types';
import ShareDialog from './ShareDialog';

interface CropDiseaseLibraryProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
}

export const CropDiseaseLibrary: React.FC<CropDiseaseLibraryProps> = ({ onAction, onShowFeedback: _onShowFeedback, onBack, onSaveReport: _onSaveReport }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(CROP_CATEGORIES[0].id);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [report, setReport] = useState<(CropDiseaseReport & { sourceUsed?: string }) | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [diseaseImages, setDiseaseImages] = useState<Record<string, string>>({});
  const [pestImages, setPestImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setSearchQuery(event.results[0][0].transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const fetchDiseaseInfo = async (crop: string) => {
    setSelectedCrop(crop);
    stopTTS();
    setIsLoading(true);
    setReport(null);
    setCropImage(null);
    setDiseaseImages({});
    setPestImages({});
    
    try {
      const { data } = await getCropDiseaseInfo(crop);
      setReport(data);
      
      const generatedCropImg = await generateAgriImage(`${crop} crop healthy photography field high resolution`).catch(() => null);
      setCropImage(generatedCropImg);

      // Eagerly generate some visuals for diseases/pests
      if (data.diseases?.[0]) {
        generateAgriImage(data.diseases[0].imageDescription).then(img => {
           if(img) setDiseaseImages(prev => ({ ...prev, [data.diseases[0].name]: img }));
        });
      }
      if (data.pests?.[0]) {
        generateAgriImage(data.pests[0].imageDescription).then(img => {
          if(img) setPestImages(prev => ({ ...prev, [data.pests[0].name]: img }));
        });
      }

      if (onAction) onAction();
    } catch {
      alert("তথ্য সংগ্রহ করতে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = async () => {
    if (!report) return;
    if (isPlaying) { stopTTS(); return; }
    try {
      setIsPlaying(true);
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); // eslint-disable-line @typescript-eslint/no-explicit-any
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const textToSpeak = `${report.cropName} এর সুরক্ষা নির্দেশিকা। ${report.summary}. উৎস: ${report.sourceUsed}.`;
      const base64Audio = await generateSpeech(textToSpeak);
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch { setIsPlaying(false); }
  };

  const stopTTS = () => {
    if (currentSourceRef.current) { currentSourceRef.current.stop(); currentSourceRef.current = null; }
    setIsPlaying(false);
  };

  const filteredCrops = (CROPS_BY_CATEGORY[selectedCategory] || []).filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {isShareOpen && report && (
        <ShareDialog 
          isOpen={isShareOpen} 
          onClose={() => setIsShareOpen(false)} 
          title={`Crop Guard: ${report.cropName}`} 
          content={`${report.cropName}: ${report.summary}`} 
        />
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 sticky top-0 bg-slate-50/95 backdrop-blur-md z-[60] py-4 border-b border-slate-100">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-[#0A8A1F] hover:text-white transition-all text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">বালাই লাইব্রেরি</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking_widest mt-1">Grounded by BARI/BRRI/DAE 2026</p>
          </div>
        </div>

        <div className="relative w-full md:w-80 group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="শস্যের নাম লিখে খুঁজুন..."
            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-bold text-sm shadow-sm transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button onClick={toggleListening} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto space-x-2 mb-8 pb-2 scrollbar-hide">
        {CROP_CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setSelectedCategory(cat.id)} 
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-black transition-all ${selectedCategory === cat.id ? 'bg-[#0A8A1F] text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
        {filteredCrops.length > 0 ? filteredCrops.map(crop => (
          <button key={crop} onClick={() => fetchDiseaseInfo(crop)} disabled={isLoading} className={`p-6 rounded-[2.5rem] font-black shadow-sm transition-all border-2 text-sm text-center flex flex-col items-center justify-center space-y-3 ${selectedCrop === crop ? 'bg-[#0A8A1F] text-white border-emerald-600' : 'bg-white text-slate-700 border-white hover:border-emerald-500 hover:shadow-md'}`}>
            <span className="text-3xl">🌱</span>
            <span className="leading-tight">{crop}</span>
          </button>
        )) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest">এই ক্যাটাগরিতে কোনো ফসল পাওয়া যায়নি।</div>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white rounded-[3rem] shadow-xl border border-emerald-50">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#0A8A1F] border-t-transparent rounded-full animate-spin"></div>
           </div>
           <p className="font-black text-slate-800 text-lg">অফিসিয়াল সোর্স ভেরিফাই হচ্ছে...</p>
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-12 animate-fade-in pb-12">
          <div className="bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl relative min-h-[400px] flex flex-col justify-end border-b-[20px] border-[#0A8A1F]">
             {cropImage ? (
                <img src={cropImage} className="absolute inset-0 w-full h-full object-cover opacity-50" alt={report.cropName} />
             ) : (
                <div className="absolute inset-0 bg-emerald-900/40"></div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
             <div className="relative p-10 md:p-14 text-white">
                <div className="flex flex-col md:flex-row justify-between items-end gap-10">
                   <div className="flex-1 space-y-6">
                      <div className="inline-flex items-center space-x-3 bg-emerald-600/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                         <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                         <span>Source: {report.sourceUsed}</span>
                      </div>
                      <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">{report.cropName}</h2>
                      <p className="text-xl md:text-2xl font-medium text-slate-200 leading-relaxed max-w-3xl border-l-8 border-emerald-500 pl-8 italic">
                        {report.summary}
                      </p>
                   </div>
                   <div className="flex items-center space-x-3 shrink-0">
                      <button onClick={() => setIsShareOpen(true)} className="p-6 rounded-3xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 border border-white/10 shadow-xl">
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                      <button onClick={playTTS} className={`p-8 rounded-[2rem] shadow-2xl transition-all active:scale-95 ${isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-[#0A8A1F]'}`}>
                        {isPlaying ? <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg> : <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>}
                      </button>
                   </div>
                </div>
             </div>
          </div>

          {/* New Varieties Section */}
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl">
             <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🌾</div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">জনপ্রিয় জাতসমূহ</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.varieties?.map((v, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                     <h4 className="text-xl font-black text-emerald-700 mb-2">{v.name}</h4>
                     <p className="text-sm font-medium text-slate-600 leading-relaxed">{v.description}</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="space-y-8">
                <div className="flex items-center space-x-4 px-4">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🦠</div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">প্রধান রোগসমূহ</h3>
                </div>
                <div className="space-y-6">
                   {report.diseases?.map((d, i) => (
                     <div key={i} className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">{d.name}</h4>
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${d.severity?.toLowerCase().includes('high') || d.severity?.includes('উচ্চ') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>Severity: {d.severity}</span>
                        </div>
                        
                        {diseaseImages[d.name] && (
                           <div className="rounded-2xl overflow-hidden aspect-video mb-6 shadow-sm border border-slate-100">
                              <img src={diseaseImages[d.name]} className="w-full h-full object-cover" alt={d.name} />
                           </div>
                        )}

                        <div className="space-y-4">
                           <div className="p-5 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">লক্ষণ (Symptoms)</p><p className="text-sm font-bold text-slate-700 leading-relaxed">{d.symptoms}</p></div>
                           <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-50"><p className="text-[9px] font-black text-blue-600 uppercase mb-1">অনুকূল পরিবেশ</p><p className="text-sm font-bold text-slate-700">{d.favorableEnvironment}</p></div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">সমন্বিত দমন (IPM)</p><p className="text-xs font-bold text-emerald-800">{d.bioControl}</p></div>
                              <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100"><p className="text-[9px] font-black text-rose-600 uppercase mb-1">রাসায়নিক প্রতিকার (DAE)</p><p className="text-xs font-bold text-rose-800">{d.chemControl}</p></div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="space-y-8">
                <div className="flex items-center space-x-4 px-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🐞</div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">ক্ষতিকারক পোকামাকড়</h3>
                </div>
                <div className="space-y-6">
                   {report.pests?.map((p, i) => (
                     <div key={i} className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-2xl font-black text-slate-800 group-hover:text-amber-600 transition-colors">{p.name}</h4>
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${p.severity?.toLowerCase().includes('high') || p.severity?.includes('উচ্চ') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>Impact: {p.severity}</span>
                        </div>

                        {pestImages[p.name] && (
                           <div className="rounded-2xl overflow-hidden aspect-video mb-6 shadow-sm border border-slate-100">
                              <img src={pestImages[p.name]} className="w-full h-full object-cover" alt={p.name} />
                           </div>
                        )}

                        <div className="space-y-4">
                           <div className="p-5 bg-slate-50 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">ক্ষতির ধরণ</p><p className="text-sm font-bold text-slate-700 leading-relaxed">{p.damageSymptoms}</p></div>
                           <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-50"><p className="text-[9px] font-black text-blue-600 uppercase mb-1">অনুকূল পরিবেশ</p><p className="text-sm font-bold text-slate-700">{p.favorableEnvironment}</p></div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">সমন্বিত দমন (IPM)</p><p className="text-xs font-bold text-emerald-800">{p.bioControl}</p></div>
                              <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100"><p className="text-[9px] font-black text-rose-600 uppercase mb-1">রাসায়নিক প্রতিকার (DAE)</p><p className="text-xs font-bold text-rose-800">{p.chemControl}</p></div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
