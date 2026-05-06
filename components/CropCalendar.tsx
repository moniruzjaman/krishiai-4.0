import React, { useState, useEffect, useRef } from 'react';
import { User, SavedReport, AgriTask, WeatherData, GroundingChunk, Language } from '../types';
import { AGRI_SEASONS } from '../constants';
import { getWeatherSmartAgriPlan, getLiveWeather, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { getStoredLocation } from '../services/locationService';
import ShareDialog from './ShareDialog';

interface CropCalendarProps {
  onBack?: () => void;
  user: User;
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  lang: Language;
}

const calendarLoadingSteps = {
  bn: [
    "আপনার খামারের শস্যের প্রোফাইল চেক করা হচ্ছে...",
    "৭ দিনের লোকাল আবহাওয়া ফোরকাস্ট সংগ্রহ হচ্ছে...",
    "বিগত ৫ বছরের আঞ্চলিক জলবায়ু ঝুঁকি বিশ্লেষণ চলছে...",
    "রিয়েল-টাইম আবহাওয়া অনুযায়ী রোপণ ও সার প্রয়োগের সঠিক সময় খোঁজা হচ্ছে...",
    "আপনার জন্য বিশেষায়িত সায়েন্টিফিক পঞ্জিকা প্রস্তুত হচ্ছে..."
  ],
  en: [
    "Checking your farm crop profile...",
    "Gathering 7-day local weather forecast...",
    "Analyzing last 5-year regional climate risks...",
    "Finding optimal planting & fertilization slots based on live weather...",
    "Preparing your specialized scientific calendar..."
  ]
};

const CropCalendar: React.FC<CropCalendarProps> = ({ user, onAction, onSaveReport, onBack, lang }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [weatherPlan, setWeatherPlan] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reminders, setReminders] = useState<AgriTask[]>([]);
  const [showReminderModal, setShowReminderModal] = useState<{ title: string; category: string } | null>(null);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isShareOpen, setIsShareOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const currentMonth = new Date().getMonth();
  const currentSeason = AGRI_SEASONS.find(s => s.months.includes(currentMonth)) || AGRI_SEASONS[0];

  useEffect(() => {
    loadReminders();
    fetchInitialContext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInitialContext = async () => {
    const loc = getStoredLocation();
    if (loc) {
      try {
        const data = await getLiveWeather(loc.lat, loc.lng, false, lang);
        setCurrentWeather(data);
      } catch {
      console.error("Failed to fetch initial weather in CropCalendar");
    }
  }
};

const loadReminders = () => {
  const saved = localStorage.getItem('agritech_tasks');
  if (saved) {
    try {
      setReminders(JSON.parse(saved));
    } catch {
      setReminders([]);
    }
  }
};

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % calendarLoadingSteps[lang].length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading, lang]);

  const fetchSmartPlan = async () => {
    if (user.myCrops.length === 0) {
      alert(lang === 'bn' ? "অনুগ্রহ করে প্রোফাইলে শস্য যোগ করুন।" : "Please add crops to your profile.");
      return;
    }
    setIsLoading(true);
    setLoadingStep(0);
    setWeatherPlan(null);

    const loc = getStoredLocation();
    const locationName = loc ? `${currentWeather?.upazila || 'Local'}, ${currentWeather?.district || 'Bangladesh'}` : 'Bangladesh';

    try {
      let weather = currentWeather;
      // If we don't have a forecast yet, fetch it now
      if ((!weather || !weather.forecast || weather.forecast.length === 0) && loc) {
        weather = await getLiveWeather(loc.lat, loc.lng, true, lang);
        setCurrentWeather(weather);
      }
      
      const res = await getWeatherSmartAgriPlan(user.myCrops, weather!, locationName, lang);
      setWeatherPlan(res);
      
      if (res.text) {
        playTTS(res.text);
      }

      if (onAction) onAction();
    } catch {
      alert(lang === 'bn' ? "স্মার্ট পঞ্জিকা তৈরি করতে সমস্যা হয়েছে।" : "Failed to generate smart calendar.");
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || weatherPlan?.text;
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

  const getCropAge = (sowingDate: string) => {
    const start = new Date(sowingDate).getTime();
    const now = Date.now();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const handleSave = async () => {
    if (weatherPlan?.text && onSaveReport) {
      setIsSaving(true);
      try {
        const audioBase64 = await generateSpeech(weatherPlan.text.replace(/[*#_~]/g, ''));
        onSaveReport({
          type: 'Weather-Smart Calendar',
          title: `Smart Plan: ${new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}`,
          content: weatherPlan.text,
          audioBase64,
          icon: '🔮'
        });
        alert(lang === 'bn' ? "অডিওসহ স্মার্ট পঞ্জিকা সেভ হয়েছে!" : "Smart calendar saved with audio!");
      } catch {
        onSaveReport({
          type: 'Weather-Smart Calendar',
          title: `Smart Plan: ${new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}`,
          content: weatherPlan.text,
          icon: '🔮'
        });
        alert(lang === 'bn' ? "পঞ্জিকা সেভ হয়েছে (অডিও ছাড়া)" : "Calendar saved (without audio)");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSetReminder = () => {
    if (!showReminderModal) return;
    const newTask: AgriTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: showReminderModal.title,
      dueDate: reminderDate,
      dueTime: reminderTime,
      completed: false,
      category: showReminderModal.category as any || 'other',
      notes: 'Calendar Reminder'
    };
    
    const updatedTasks = [newTask, ...reminders];
    setReminders(updatedTasks);
    localStorage.setItem('agritech_tasks', JSON.stringify(updatedTasks));
    setShowReminderModal(null);
    alert(lang === 'bn' ? "রিমাইন্ডার সেট করা হয়েছে!" : "Reminder set successfully!");
  };

  const formatResultContent = (text: string) => {
    const parts = text.split(/(\[.*?\]:?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.includes(']')) {
        let color = "bg-emerald-50 text-emerald-700 border-emerald-100";
        const header = part.replace(/[[\]:]/g, '');
        if (header.includes('ঝুঁকি') || header.includes('Risk')) color = "bg-rose-50 text-rose-700 border-rose-100";
        if (header.includes('সতর্কতা') || header.includes('Warning')) color = "bg-amber-50 text-amber-700 border-amber-100";
        if (header.includes('সময়') || header.includes('Time')) color = "bg-blue-50 text-blue-700 border-blue-100";
        
        return <span key={i} className={`block mt-8 mb-4 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border ${color}`}>{header}</span>;
      }
      return <span key={i} className="leading-relaxed opacity-90">{part}</span>;
    });
  };

  const toLocalNumber = (val: any) => {
    if (val === null || val === undefined) return '';
    if (lang === 'en') return val.toString();
    const banglaNumbers: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return val.toString().replace(/[0-9]/g, (w: string) => banglaNumbers[w]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 font-sans animate-fade-in min-h-screen bg-slate-50">
      {isShareOpen && weatherPlan && (
        <ShareDialog 
          isOpen={isShareOpen} 
          onClose={() => setIsShareOpen(false)} 
          title={lang === 'bn' ? `স্মার্ট শস্য ক্যালেন্ডার: ${new Date().toLocaleDateString('bn-BD')}` : `Smart Crop Calendar: ${new Date().toLocaleDateString('en-US')}`} 
          content={weatherPlan.text} 
        />
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-2">
        <div className="flex items-center space-x-4">
          <button onClick={() => { if (onBack) { onBack(); } else { window.history.back(); } stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-emerald-600 hover:text-white transition-all">
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter">{lang === 'bn' ? 'স্মার্ট শস্য ক্যালেন্ডার' : 'Smart Crop Calendar'}</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Weather & Historical Hazard Integrated</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
            <button 
              onClick={fetchSmartPlan}
              disabled={isLoading || user.myCrops.length === 0}
              className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span className="text-lg">🔮</span>
              <span>{lang === 'bn' ? 'স্মার্ট অডিট জেনারেট' : 'Generate Smart Audit'}</span>
            </button>
            {weatherPlan && (
              <button onClick={handleSave} disabled={isSaving} className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-all">
                {isSaving ? <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
              </button>
            )}
        </div>
      </div>

      {/* Structured 7-Day Forecast Section */}
      <div className="mb-10 px-2">
         <div className="flex items-center justify-between mb-4 mx-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{lang === 'bn' ? '৭ দিনের আবহাওয়া চিত্র' : '7-Day Weather Outlook'}</h3>
            <div className="flex items-center space-x-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">BAMIS Synced</span>
            </div>
         </div>
         {currentWeather?.forecast && currentWeather.forecast.length > 0 ? (
           <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {currentWeather.forecast.map((day, i) => (
                <div key={i} className="min-w-[140px] bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-xl hover:-translate-y-1 transition-all">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-3">
                      {new Date(day.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' })}
                   </p>
                   <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {day.condition.includes('রোদ্র') || day.condition.toLowerCase().includes('sunny') ? '☀️' : 
                       day.condition.includes('বৃষ্টি') || day.condition.toLowerCase().includes('rain') ? '🌧️' : '⛅'}
                   </div>
                   <p className="text-lg font-black text-slate-800">{toLocalNumber(day.maxTemp)}°<span className="text-xs text-slate-300 ml-1">/ {toLocalNumber(day.minTemp)}°</span></p>
                   <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tighter truncate w-full px-2">{day.condition}</p>
                </div>
              ))}
           </div>
         ) : (
           <div className="bg-white/50 border border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center opacity-40">
              <p className="text-xs font-bold uppercase tracking-widest">ফোরকাস্ট লোড হচ্ছে...</p>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-10">
          {/* Active Season Info Card */}
          <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl"></div>
            <div className="relative z-10">
               <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-8 group-hover:rotate-6 transition-transform">
                  <span className="text-4xl">{currentWeather?.condition?.includes('রোদ্র') ? '☀️' : '🌧️'}</span>
               </div>
               <h2 className="text-2xl font-black text-slate-800 mb-2">{currentSeason.name}</h2>
               <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">{currentSeason.desc}</p>
               <div className="space-y-2">
                  {currentSeason.suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => setShowReminderModal({ title: s.title, category: s.category })}
                      className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-black text-slate-600 uppercase flex items-center justify-between hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm active:scale-95 group/btn"
                    >
                      <span>{s.title}</span>
                      <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">🔔</span>
                    </button>
                  ))}
               </div>
            </div>
          </div>

          {/* Crop Health Progress */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-3 flex justify-between">
              <span>{lang === 'bn' ? 'শস্য প্রগতি' : 'My Crop Stats'}</span>
            </h3>
            {user.myCrops.length > 0 ? (
              <div className="space-y-4">
                {user.myCrops.map(crop => {
                  const age = getCropAge(crop.sowingDate);
                  const percent = Math.min(100, (age / 120) * 100); 
                  return (
                    <div key={crop.id} className="bg-white p-7 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start mb-5">
                        <div>
                            <h4 className="font-black text-xl text-slate-800 leading-none mb-1.5">{crop.name}</h4>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{crop.variety}</p>
                        </div>
                        <span className="bg-slate-50 px-3 py-1 rounded-xl text-[10px] font-black text-slate-400 border border-slate-100">{toLocalNumber(age)} {lang === 'bn' ? 'দিন' : 'days'}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            <span>{lang === 'bn' ? 'বপন' : 'Sowing'}</span>
                            <span className={percent > 90 ? 'text-emerald-600' : ''}>{lang === 'bn' ? 'কর্তন' : 'Harvest'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[3.5rem] border-4 border-dashed border-slate-100 text-center opacity-40">
                <div className="text-5xl mb-4">🏜️</div>
                <p className="text-xs font-black text-slate-400 uppercase leading-relaxed">{lang === 'bn' ? 'প্রোফাইলে শস্য যোগ করুন' : 'Add crops from profile'}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Strategic Plan Report */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[4rem] p-10 md:p-14 shadow-2xl border border-slate-100 min-h-[600px] flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-30 blur-3xl"></div>
             
             {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center space-y-12 animate-fade-in relative z-10">
                   <div className="relative">
                      <div className="w-32 h-32 border-[12px] border-slate-50 rounded-full"></div>
                      <div className="absolute inset-0 border-[12px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">📊</div>
                   </div>
                   <div className="max-w-xs mx-auto space-y-4">
                      <h4 className="text-2xl font-black text-slate-800 leading-tight">{calendarLoadingSteps[lang][loadingStep]}</h4>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                         <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${((loadingStep + 1) / calendarLoadingSteps[lang].length) * 100}%` }}></div>
                      </div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.4em]">Integrated Weather & Risk Engine Active</p>
                   </div>
                </div>
             ) : !weatherPlan ? (
               <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-8 flex-1 opacity-50">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner grayscale">🗓️</div>
                  <div className="max-w-xs">
                    <h4 className="text-xl font-black text-slate-800 mb-2">{lang === 'bn' ? 'আপনার স্মার্ট পঞ্জিকা তৈরি করুন' : 'Generate Your Smart Plan'}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                       {lang === 'bn' 
                        ? "উপরে 'স্মার্ট অডিট জেনারেট' বাটন টিপে বর্তমান আবহাওয়া ও ঐতিহাসিক ঝুঁকির ওপর ভিত্তি করে আপনার চাষের রিমাইন্ডার তৈরি করুন।"
                        : "Tap 'Generate Smart Audit' to create personalized reminders based on current weather and historical hazard data."}
                    </p>
                  </div>
               </div>
             ) : (
               <div className="animate-fade-in relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-8 border-b-2 border-slate-50 gap-6">
                     <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 bg-slate-900 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-xl border-4 border-slate-800">🔮</div>
                        <div>
                           <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{lang === 'bn' ? 'স্মার্ট এগ্রো-প্ল্যানিং' : 'Smart Agro-Planning'}</h4>
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{currentSeason.name} | {currentWeather?.upazila}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-3">
                        <button onClick={() => playTTS()} className={`p-5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
                           {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>}
                        </button>
                        <button onClick={() => setIsShareOpen(true)} className="p-5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 shadow-sm">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                     </div>
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-700 font-medium leading-[1.8] whitespace-pre-wrap text-lg md:text-xl">
                    {formatResultContent(weatherPlan.text)}
                  </div>
                  
                  {weatherPlan.groundingChunks?.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">তথ্যসূত্র ও আবহাওয়া ম্যাপিং:</p>
                      <div className="flex flex-wrap gap-2">
                        {weatherPlan.groundingChunks.map((c, i) => c.web && (
                          <a key={i} href={c.web.uri} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black border border-blue-100 hover:bg-blue-100 transition-all flex items-center space-x-2">
                             <span>🔗</span>
                             <span>{c.web.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden border border-white/20">
            <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{lang === 'bn' ? 'রিমাইন্ডার সেট করুন' : 'Set Reminder'}</h3>
              <button onClick={() => setShowReminderModal(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">✕</button>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100 flex items-center space-x-5 shadow-inner">
                 <span className="text-4xl">🔔</span>
                 <p className="text-lg font-black text-blue-900 leading-tight">{showReminderModal.title}</p>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">{lang === 'bn' ? 'তারিখ' : 'Date'}</label>
                  <input 
                    type="date" 
                    value={reminderDate} 
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-slate-700 outline-none focus:border-blue-500 shadow-inner appearance-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">{lang === 'bn' ? 'সময়' : 'Time'}</label>
                  <input 
                    type="time" 
                    value={reminderTime} 
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-slate-700 outline-none focus:border-blue-500 shadow-inner appearance-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleSetReminder}
                className="w-full bg-blue-600 text-white font-black py-6 rounded-[2.2rem] shadow-xl active:scale-95 transition-all text-xl flex items-center justify-center space-x-4 border-b-4 border-blue-800"
              >
                <span>{lang === 'bn' ? 'শিডিউলে যোগ করুন' : 'Add to Schedule'}</span>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropCalendar;