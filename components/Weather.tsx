
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getLiveWeather } from '../services/geminiService';
import { queryCropNetInsight } from '../services/huggingfaceService';
import { saveStoredLocation } from '../services/locationService';
import { WeatherData, Language } from '../types';
import GuidedTour, { TourStep } from './GuidedTour';

const toBanglaNumber = (val: string | number) => {
  if (val === null || val === undefined) return '';
  const banglaNumbers: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯', '.': '.'
  };
  return val.toString().replace(/[0-9.]/g, (w: string) => banglaNumbers[w]);
};

interface WeatherProps {
  onBack?: () => void;
  lang: Language;
}

const WEATHER_TOUR: TourStep[] = [
  { title: "স্মার্ট কৃষি আবহাওয়া", content: "Google Weather ও BAMIS তথ্যের সমন্বয়ে আপনার এলাকার সঠিক আবহাওয়া এবং কৃষি ঝুঁকি জানুন।", position: 'center' }
];

const WEATHER_CACHE_KEY = 'agritech_weather_cache';
const WEATHER_TIMESTAMP_KEY = 'agritech_weather_last_update';
const ONE_HOUR_MS = 3600000;

const Weather: React.FC<WeatherProps> = ({ onBack, lang = 'bn' }) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'risks' | 'spraying'>('forecast');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hfInsight, setHfInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTour, setShowTour] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_weather_v2');
    if (!tourDone) setShowTour(true);
    loadInitialWeather();
  }, []);

  const loadInitialWeather = async () => {
    const cachedData = localStorage.getItem(WEATHER_CACHE_KEY);
    const lastUpdate = localStorage.getItem(WEATHER_TIMESTAMP_KEY);
    if (cachedData && lastUpdate && (Date.now() - parseInt(lastUpdate) < ONE_HOUR_MS)) {
      const data = JSON.parse(cachedData);
      setWeather(data);
      fetchHFInsight(data);
    } else {
      fetchWeather(false);
    }
  };

  const fetchHFInsight = async (data: WeatherData) => {
    try {
      const insight = await queryCropNetInsight(data, lang);
      setHfInsight(insight);
    } catch (e) {
      console.warn("HF Insight failed:", e);
    }
  };

  const fetchWeather = async (force: boolean = false) => {
    setIsLoading(true);
    const success = async (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      saveStoredLocation(latitude, longitude);
      try {
        // Fix: Explicitly cast lang to Language to resolve "string is not assignable to Language" error on line 88
        const data = await getLiveWeather(latitude, longitude, force, lang as Language);
        setWeather(data);
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(WEATHER_TIMESTAMP_KEY, Date.now().toString());
        fetchHFInsight(data);
      } catch (err) {
        console.error("Fetch weather failed:", err);
      } finally { setIsLoading(false); }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, () => setIsLoading(false), { timeout: 10000 });
    } else {
      setIsLoading(false);
    }
  };

  const calculatedRisks = useMemo(() => {
    if (!weather) return [];
    const risks = [];
    const { humidity, temp } = weather;
    if (humidity > 80 && temp < 22) risks.push({ title: lang === 'bn' ? "লেট ব্লাইট" : "Late Blight", desc: lang === 'bn' ? "ঘন কুয়াশা ও নিম্ন তাপমাত্রায় পচন রোগ বাড়ে।" : "High fog increases blight risk.", icon: "🥔", level: 'High' });
    if (humidity > 85 && temp >= 22 && temp <= 28) risks.push({ title: lang === 'bn' ? "ধানের ব্লাস্ট" : "Rice Blast", desc: lang === 'bn' ? "ব্লাস্ট জীবাণু ছড়ানোর অনুকূল সময়।" : "Favorable time for blast spores.", icon: "🌾", level: 'High' });
    if (hfInsight) risks.push({ title: lang === 'bn' ? "এআই ইনসাইট (CropNet)" : "CropNet AI Insight", desc: hfInsight, icon: "🤖", level: 'Medium' });
    return risks;
  }, [weather, lang, hfInsight]);

  const spray = useMemo(() => {
    if (!weather) return { status: '...', color: 'slate', desc: '' };
    const safe = weather.windSpeed <= 12 && weather.rainProbability < 25;
    return {
      status: safe ? (lang === 'bn' ? 'আদর্শ সময়' : 'Ideal Time') : (lang === 'bn' ? 'ঝুঁকিপূর্ণ' : 'High Risk'),
      color: safe ? 'emerald' : 'rose',
      desc: safe ? (lang === 'bn' ? 'বালাইনাশক প্রয়োগের উপযুক্ত সময়।' : 'Good time for application.') : (lang === 'bn' ? 'বৃষ্টি বা বাতাসের শঙ্কা আছে।' : 'Wind or rain risk detected.')
    };
  }, [weather, lang]);

  return (
    <div className="max-w-4xl mx-auto bg-slate-50 min-h-screen pb-32 font-sans overflow-x-hidden">
      {showTour && <GuidedTour steps={WEATHER_TOUR} tourKey="weather_v2" onClose={() => setShowTour(false)} />}
      
      <div className="bg-white/80 backdrop-blur-md px-6 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center space-x-4">
           <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-emerald-600 hover:text-white transition-all text-slate-400">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h1 className="text-xl font-black text-slate-800 leading-none">{lang === 'bn' ? 'স্মার্ট কৃষি আবহাওয়া' : 'Agri Weather'}</h1>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1.5">📍 {weather?.upazila || 'Locating...'} ({weather?.district})</p>
           </div>
        </div>
        <button onClick={() => fetchWeather(true)} className={`p-3 bg-blue-50 text-blue-600 rounded-2xl ${isLoading ? 'animate-spin' : ''}`}>
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {weather && (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in">
           <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3.5rem] p-10 text-white shadow-xl text-center">
              <div className="text-8xl mb-4 drop-shadow-2xl">
                {weather.condition?.includes('রোদ্র') ? "☀️" : weather.condition?.includes('বৃষ্টি') ? "🌧️" : "⛅"}
              </div>
              <div className="flex items-baseline justify-center space-x-1">
                <span className="text-8xl font-black tracking-tighter">{lang === 'bn' ? toBanglaNumber(weather.temp) : weather.temp}</span>
                <span className="text-3xl opacity-40">°C</span>
              </div>
              <p className="text-xl font-black uppercase mt-4 tracking-widest">{weather.condition}</p>
              <p className="text-xs opacity-70 mt-2">{weather.description}</p>
              <p className="text-[10px] font-bold mt-4 uppercase opacity-50 tracking-[0.2em]">{currentTime.toLocaleTimeString()}</p>
           </section>

           <div className="flex bg-white p-2 rounded-[2.5rem] shadow-xl overflow-x-auto scrollbar-hide">
              <TabBtn active={activeTab === 'forecast'} label={lang === 'bn' ? 'পূর্বাভাস' : 'Forecast'} icon="📅" onClick={() => setActiveTab('forecast')} />
              <TabBtn active={activeTab === 'risks'} label={lang === 'bn' ? 'ঝুঁকি' : 'Risks'} icon="⚠️" onClick={() => setActiveTab('risks')} />
              <TabBtn active={activeTab === 'spraying'} label={lang === 'bn' ? 'স্প্রে' : 'Spray'} icon="🧪" onClick={() => setActiveTab('spraying')} />
           </div>

           {activeTab === 'forecast' && (
             <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Metric label={lang === 'bn' ? "আর্দ্রতা" : "Humidity"} val={lang === 'bn' ? toBanglaNumber(weather.humidity) : weather.humidity} unit="%" icon="💧" />
                  <Metric label={lang === 'bn' ? "সেচ (ET0)" : "ET0"} val={lang === 'bn' ? toBanglaNumber(weather.evapotranspiration || "১.২") : weather.evapotranspiration || "1.2"} unit="mm" icon="🚿" />
                  <Metric label={lang === 'bn' ? "মাটির তাপ" : "Soil Temp"} val={lang === 'bn' ? toBanglaNumber(weather.soilTemperature || "২৩") : weather.soilTemperature || "23"} unit="°C" icon="🏺" />
                  <Metric label={lang === 'bn' ? "বিকিরণ" : "Solar"} val={lang === 'bn' ? toBanglaNumber(weather.solarRadiation || "৩৫০") : weather.solarRadiation || "350"} unit="W/m²" icon="☀️" />
                </div>
             </div>
           )}

           {activeTab === 'risks' && (
             <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 space-y-6 animate-fade-in">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                  <span className="mr-3">🦠</span> 
                  {lang === 'bn' ? 'বালাই শঙ্কা বিশ্লেষণ' : 'Pest Risk Analysis'}
                </h3>
                <div className="space-y-4">
                   {calculatedRisks.map((risk, i) => (
                     <div key={i} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-start space-x-4">
                        <div className="text-3xl">{risk.icon}</div>
                        <div>
                           <h4 className="font-black text-slate-800">{risk.title}</h4>
                           <p className="text-sm text-slate-500">{risk.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {activeTab === 'spraying' && (
             <div className={`bg-white rounded-[4rem] p-12 shadow-2xl border-t-[20px] border-${spray.color === 'emerald' ? 'green' : 'red'}-600 text-center animate-fade-in`}>
                <div className="text-8xl mb-8">{spray.color === 'emerald' ? '✅' : '⚠️'}</div>
                <h3 className={`text-4xl font-black text-${spray.color}-700`}>{spray.status}</h3>
                <p className="text-lg font-bold text-slate-500 mt-4">{spray.desc}</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, label, icon, onClick }: any) => (
  <button onClick={onClick} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-[2rem] transition-all flex items-center justify-center space-x-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
     <span>{icon}</span><span>{label}</span>
  </button>
);

const Metric = ({ label, val, unit, icon }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
     <div className="text-2xl mb-2">{icon}</div>
     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
     <p className="text-xl font-black text-slate-800">{val}<span className="text-[10px] ml-0.5 opacity-30">{unit}</span></p>
  </div>
);

export default Weather;
