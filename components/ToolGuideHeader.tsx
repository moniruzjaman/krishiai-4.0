
import React, { useState } from 'react';
import { Language } from '../types';

interface ToolGuideHeaderProps {
  title: string;
  subtitle: string;
  protocol: string;
  source: string;
  lang: Language;
  onBack: () => void;
  guideSteps: string[];
  icon: string;
  themeColor?: string;
}

export const ToolGuideHeader: React.FC<ToolGuideHeaderProps> = ({ 
  title, subtitle, protocol, source, lang, onBack, guideSteps, icon, themeColor = "emerald" 
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const colors: Record<string, string> = {
    emerald: "bg-emerald-600 border-emerald-100 text-emerald-600",
    rose: "bg-rose-600 border-rose-100 text-rose-600",
    blue: "bg-blue-600 border-blue-100 text-blue-600",
    amber: "bg-amber-600 border-amber-100 text-amber-600",
    indigo: "bg-indigo-600 border-indigo-100 text-indigo-600",
    slate: "bg-slate-900 border-slate-200 text-slate-900"
  };

  return (
    <div className="mb-8 space-y-4 animate-fade-in print:hidden">
      {/* Top Identity Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack} 
            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90 text-slate-400"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{title}</h1>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`text-white text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse ${colors[themeColor].split(' ')[0]}`}>
                Protocol: {protocol}
              </span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{source}</p>
            </div>
          </div>
        </div>
        <div className={`w-14 h-14 bg-white rounded-[1.2rem] border-2 flex items-center justify-center text-3xl shadow-sm ${colors[themeColor].split(' ')[1]}`}>
          {icon}
        </div>
      </div>

      {/* Collapsible Guide */}
      <div className={`rounded-3xl border-2 transition-all duration-500 overflow-hidden ${isGuideOpen ? 'bg-white shadow-xl ' + colors[themeColor].split(' ')[1] : 'bg-slate-50 border-transparent shadow-none'}`}>
        <button 
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full px-6 py-4 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <span className={`text-lg transition-transform duration-500 ${isGuideOpen ? 'rotate-12 scale-110' : 'grayscale'}`}>📘</span>
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isGuideOpen ? colors[themeColor].split(' ')[2] : 'text-slate-400'}`}>
              {lang === 'bn' ? 'ব্যবহার নির্দেশিকা ও তথ্যসূত্র' : 'User Guide & Documentation'}
            </span>
          </div>
          <div className={`p-1.5 rounded-lg transition-all ${isGuideOpen ? colors[themeColor].split(' ')[0] + ' text-white rotate-180' : 'bg-slate-200 text-slate-400'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </button>

        <div className={`transition-all duration-500 ${isGuideOpen ? 'max-h-[1000px] opacity-100 p-8 pt-0' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                {subtitle}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  {lang === 'bn' ? 'কিভাবে ব্যবহার করবেন' : 'Step-by-Step Instructions'}
                </h4>
                <ul className="space-y-3">
                  {guideSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5 ${colors[themeColor].split(' ')[0]}`}>
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-700">{step}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  {lang === 'bn' ? 'বৈজ্ঞানিক মানদণ্ড' : 'Scientific Standards'}
                </h4>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 leading-relaxed">
                    {lang === 'bn' 
                      ? 'এই টুলটি বাংলাদেশ কৃষি গবেষণা কাউন্সিল (BARC) এবং ডিএই (DAE) এর সর্বশেষ ২০২৪-২৫ নির্দেশিকা মেনে তৈরি করা হয়েছে। সকল পরামর্শ সরাসরি সরকারি ডাটাবেস থেকে সংগৃহীত।'
                      : 'Developed in compliance with the latest 2024-25 guidelines from BARC and DAE. All advisories are sourced directly from verified government scientific repositories.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
