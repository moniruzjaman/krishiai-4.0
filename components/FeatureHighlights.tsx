
import React from 'react';
import { View, Language } from '../types';

interface FeatureHighlightsProps {
  onNavigate: (view: View) => void;
  lang: Language;
}

export const FeatureHighlights: React.FC<FeatureHighlightsProps> = ({ onNavigate, lang }) => {
  const highlights = [
    {
      id: View.ANALYZER,
      title: lang === 'bn' ? "অফিসিয়াল এআই স্ক্যানার" : "Official AI Scanner",
      desc: lang === 'bn' ? "পোকামাকড় ও রোগ শনাক্তকরণে বাংলাদেশ সরকারের অথেনটিক ডাটাসোর্স (BARI/BRRI) ব্যবহার করে।" : "Identify pests, diseases & deficiencies using official BD govt. (BARI/BRRI) repositories.",
      icon: "📸",
      color: "bg-emerald-600",
      tag: "Verified Diagnosis",
      standard: "CABI & BARI 2026",
      unique: lang === 'bn' ? "অফিসিয়াল সোর্স" : "Authenticated"
    },
    {
      id: View.PODCAST,
      title: lang === 'bn' ? "ভয়েস বিশেষজ্ঞ" : "Voice Expert",
      desc: lang === 'bn' ? "পড়া কষ্টকর? এআই আপনার জন্য সকল রিপোর্ট পড়ে শোনাবে।" : "Difficulty reading? AI reads out every report and guidance for you.",
      icon: "🔊",
      color: "bg-blue-500",
      tag: "Read Aloud",
      standard: "Auto-Speak v2.5",
      unique: lang === 'bn' ? "সবার জন্য" : "Inclusive AI"
    },
    {
      id: View.MONITORING,
      title: lang === 'bn' ? "স্যাটেলাইট পর্যবেক্ষণ" : "Satellite Monitoring",
      desc: lang === 'bn' ? "মহাকাশ থেকে ক্ষেতের স্বাস্থ্য ও NDVI বিশ্লেষণ।" : "Real-time field monitoring and biomass tracking via satellite imagery.",
      icon: "🛰️",
      color: "bg-blue-600",
      tag: "Satellite Live",
      standard: "BAMIS & Google",
      unique: lang === 'bn' ? "লাইভ স্যাটেলাইট" : "Live Imagery"
    },
    {
      id: View.PEST_EXPERT,
      title: lang === 'bn' ? "বালাইনাশক বিশেষজ্ঞ" : "Pesticide Expert",
      desc: lang === 'bn' ? "নিরাপদ মিক্সিং এবং MoA Groups রোটেশন গাইড।" : "Safe chemical mixing protocols and IRAC/FRAC rotation guidance.",
      icon: "🧪",
      color: "bg-rose-600",
      tag: "Safety Guide",
      standard: "DAE Protocols",
      unique: lang === 'bn' ? "মিক্সিং প্রটোকল" : "Mixing Logic"
    },
    {
      id: View.SOIL_EXPERT,
      title: lang === 'bn' ? "মৃত্তিকা অডিট" : "Soil Health Audit",
      desc: lang === 'bn' ? "অঞ্চলভেদে মাটির ১৭টি পুষ্টি উপাদানের অডিট রিপোর্ট।" : "Scientific audit of 17 soil nutrients based on local AEZ benchmarks.",
      icon: "🏺",
      color: "bg-amber-600",
      tag: "Soil Audit",
      standard: "BARC & SRDI",
      unique: lang === 'bn' ? "১৭টি উপাদান" : "17 Parameters"
    },
    {
      id: View.AI_YIELD_PREDICTION,
      title: lang === 'bn' ? "ফলন পূর্বাভাস" : "Yield Forecast",
      desc: lang === 'bn' ? "আবহাওয়া ও মাটির তথ্যে আগাম ফলন ধারণা।" : "Predict potential harvest output using complex agronomic models.",
      icon: "🔮",
      color: "bg-indigo-600",
      tag: "Strategic",
      standard: "AI Core 3.1",
      unique: lang === 'bn' ? "ভবিষ্যৎবাণী" : "AI Prediction"
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-24 space-y-20">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center space-x-3 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 shadow-sm animate-fade-in">
           <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[11px] font-black text-emerald-800 uppercase tracking-[0.3em]">Core Tech Ecosystem</span>
        </div>
        <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">
          {lang === 'bn' ? 'স্মার্ট কৃষির' : 'Unleash'}<br/>
          <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-blue-600 bg-clip-text text-transparent">
            {lang === 'bn' ? 'সমন্বিত ইকোসিস্টেম' : 'Modern Agriculture'}
          </span>
        </h2>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
          {lang === 'bn' 
            ? 'গবেষণা লব্ধ ডাটাসোর্স এবং কৃত্রিম বুদ্ধিমত্তার সমন্বয়ে বাংলাদেশের প্রতিটি কৃষকের জন্য তৈরি।' 
            : 'Combining authentic government research with high-end AI to serve every farmer in Bangladesh.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {highlights.map((item, idx) => (
          <div 
            key={idx}
            onClick={() => onNavigate(item.id)}
            className="group bg-white rounded-[3.5rem] p-8 shadow-xl border border-slate-100 overflow-hidden relative transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_40px_80px_-15px_rgba(10,138,31,0.2)] cursor-pointer"
          >
            {/* Background Gradient Hover */}
            <div className={`absolute -bottom-24 -right-24 w-64 h-64 ${item.color} opacity-0 group-hover:opacity-5 rounded-full blur-3xl transition-opacity duration-700`}></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-10">
                 <div className={`w-16 h-16 ${item.color} text-white rounded-[1.8rem] flex items-center justify-center text-4xl shadow-2xl transform transition-all duration-700 group-hover:scale-110 group-hover:rotate-12`}>
                   {item.icon}
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest shadow-lg mb-2">{item.standard}</span>
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-bold uppercase border border-emerald-100">{item.unique}</span>
                 </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center space-x-2">
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{item.tag}</span>
                   <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} w-0 group-hover:w-full transition-all duration-1000`}></div>
                   </div>
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </h3>
                <p className="text-base text-slate-500 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-slate-50 pt-6">
                <span className="text-slate-900 font-black text-[11px] uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-500 flex items-center">
                  {lang === 'bn' ? 'টুলটি ব্যবহার করুন' : 'Launch Tool'}
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-20"></span>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
