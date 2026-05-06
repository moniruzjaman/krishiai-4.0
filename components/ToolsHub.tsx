import React, { useState, useRef, useEffect } from 'react';
import { View, Language, User } from '../types';

interface Tool {
  id: View;
  title: string;
  desc: string;
  icon: string;
  category: 'diagnosis' | 'planning' | 'advisory' | 'monitoring' | 'academic' | 'p-suite' | 's-suite';
  isAI?: boolean;
  isGovt?: boolean;
  isPriority?: boolean;
}

interface ToolsHubProps {
  onNavigate: (view: View) => void;
  lang: Language;
  user: User;
}

const ToolsHub: React.FC<ToolsHubProps> = ({ onNavigate, lang, user }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'diagnosis' | 'planning' | 'advisory' | 'monitoring' | 'academic'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        setSearchQuery(event.results[0][0].transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const getDynamicTag = (toolId: View) => {
    const skills = user.progress.skills;
    if (toolId === View.ANALYZER && skills.protection < 40) return lang === 'bn' ? 'প্রয়োজনীয়' : 'ESSENTIAL';
    if (toolId === View.SOIL_EXPERT && skills.soil < 50) return lang === 'bn' ? 'সুপারিশকৃত' : 'RECOMMENDED';
    if (toolId === View.MONITORING && user.myCrops.length > 0) return lang === 'bn' ? 'লাইভ ডাটা' : 'LIVE DATA';
    if (toolId === View.AI_YIELD_PREDICTION && user.role === 'farmer_entrepreneur') return lang === 'bn' ? 'লাভজনক' : 'PROFITABLE';
    return null;
  };

  const tools: Tool[] = [
    { id: View.ANALYZER, category: 'p-suite', title: lang === 'bn' ? 'রোগ শনাক্তকরণ' : 'Disease Scanner', desc: lang === 'bn' ? 'ধাপে ধাপে ছবির মাধ্যমে রোগ নির্ণয়' : 'Identify diseases step-by-step from images', icon: '📸', isAI: true, isPriority: true },
    { id: View.CROP_DISEASE_LIBRARY, category: 'p-suite', title: lang === 'bn' ? 'বালাই লাইব্রেরি' : 'Pest Library', desc: lang === 'bn' ? 'ফসল অনুযায়ী রোগের তথ্য ও প্রতিকার' : 'Browse pests and diseases by crop', icon: '📖', isAI: true },
    { id: View.PEST_EXPERT, category: 'p-suite', title: lang === 'bn' ? 'বালাইনাশক বিশেষজ্ঞ' : 'Pesticide Expert', desc: lang === 'bn' ? 'সঠিক ডোজ ও মিক্সিং গাইড' : 'Precise chemical dosing and mixing', icon: '🧪', isAI: true },
    { id: View.SOIL_EXPERT, category: 's-suite', title: lang === 'bn' ? 'মাটি বিশ্লেষণ' : 'Soil Analysis', desc: lang === 'bn' ? 'অঞ্চলভেদে মাটির গুণাগুণ বিশ্লেষণ' : 'Regional soil quality profiling', icon: '🏺', isAI: true, isPriority: true },
    { id: View.SOIL_GUIDE, category: 's-suite', title: lang === 'bn' ? 'মাটি পরীক্ষা গাইড' : 'Soil Testing Guide', desc: lang === 'bn' ? 'নমুনা সংগ্রহ ও রিপোর্ট বিশ্লেষণ' : 'Lab sampling and report insights', icon: '🚜', isGovt: true },
    { id: View.NUTRIENT_CALC, category: 's-suite', title: lang === 'bn' ? 'সার ক্যালকুলেটর' : 'Fertilizer Calc', desc: lang === 'bn' ? 'জমির মাপ অনুযায়ী সারের মাত্রা' : 'Calculate urea/TSP by land size', icon: '⚖️', isGovt: true },
    { id: View.AI_YIELD_PREDICTION, category: 'planning', title: lang === 'bn' ? 'ফলন পূর্বাভাস' : 'Yield Prediction', desc: lang === 'bn' ? 'ধাপে ধাপে ফলন ধারণা ও পরিকল্পনা' : 'Predict potential harvest outcome', icon: '🔮', isAI: true, isPriority: true },
    { id: View.CROP_CALENDAR, category: 'planning', title: lang === 'bn' ? 'শস্য ক্যালেন্ডার' : 'Crop Calendar', desc: lang === 'bn' ? 'ঋতুভিত্তিক লাভজনক চাষাবাদ পরিকল্পনা' : 'Profit-driven seasonal scheduling', icon: '🗓️', isAI: true },
    { id: View.TASK_SCHEDULER, category: 'planning', title: lang === 'bn' ? 'শস্য কর্মপরিকল্পনা' : 'Task Scheduler', desc: lang === 'bn' ? 'চাষের সব কাজের শিডিউল ও রিমাইন্ডার' : 'Manage your farm tasks and alerts', icon: '📅', isAI: true },
    { id: View.LEARNING_CENTER, category: 'academic', title: lang === 'bn' ? 'কৃষি শিখন কেন্দ্র' : 'Learning Academy', desc: lang === 'bn' ? 'কুইজ, উদ্ভিদ শনাক্তকরণ ও শিক্ষা' : 'Agri-quizzes and certifications', icon: '🎓', isAI: true },
    { id: View.PODCAST, category: 'academic', title: lang === 'bn' ? 'এআই পডকাস্ট' : 'AI Podcast', desc: lang === 'bn' ? 'কৃষি সংবাদের অডিও সারসংক্ষেপ' : 'Audio summaries of farm news', icon: '🎙️', isAI: true },
    { id: View.MONITORING, category: 'monitoring', title: lang === 'bn' ? 'ফিল্ড মনিটরিং' : 'Field Monitor', desc: lang === 'bn' ? 'স্যাটেলাইট ভিত্তিক ক্ষেত পর্যবেক্ষণ' : 'Satellite crop health tracking', icon: '🛰️', isAI: true },
    { id: View.LEAF_COLOR_CHART, category: 'planning', title: lang === 'bn' ? 'লিফ কালার চার্ট' : 'Digital LCC', icon: '🍃', desc: lang === 'bn' ? 'ইউরিয়া নির্ধারণের ডিজিটাল টুল' : 'Measure leaf color for nitrogen', isAI: true },
    { id: View.CHAT, category: 'advisory', title: lang === 'bn' ? 'কৃষি চ্যাটবট' : 'Agri Chatbot', desc: lang === 'bn' ? 'AI বিশেষজ্ঞের সাথে সরাসরি কথা বলুন' : 'Talk to an AI farming expert', icon: '🤖', isAI: true },
    { id: View.BIOCONTROL, category: 'advisory', title: lang === 'bn' ? 'জৈবিক দমন' : 'Biocontrol', desc: lang === 'bn' ? 'প্রাকৃতিক উপায়ে পোকা নিয়ন্ত্রণ' : 'Natural pest control methods', icon: '🐞' },
    { id: View.SEARCH, category: 'advisory', title: lang === 'bn' ? 'বাজার দর' : 'Market Prices', desc: lang === 'bn' ? 'লাইভ বাজার দর ও তথ্য খোঁজ' : 'Check daily crop price trends', icon: '🔍' },
  ];

  const categories = [
    { id: 'all', label: lang === 'bn' ? 'সব' : 'All', icon: '✨' },
    { id: 'diagnosis', label: lang === 'bn' ? 'শনাক্তকরণ' : 'Diagnosis', icon: '🔍' },
    { id: 'planning', label: lang === 'bn' ? 'পরিকল্পনা' : 'Planning', icon: '📋' },
    { id: 'monitoring', label: lang === 'bn' ? 'পর্যবেক্ষণ' : 'Live Data', icon: '🛰️' },
    { id: 'academic', label: lang === 'bn' ? 'শিক্ষা' : 'Academy', icon: '🎓' },
  ];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || tool.category === activeTab || (activeTab === 'diagnosis' && (tool.category === 'p-suite' || tool.category === 's-suite'));
    return matchesSearch && matchesTab;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fade-in pb-32 font-sans">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
           <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{lang === 'bn' ? "সর্বাধুনিক এআই স্যুট" : "Pro AI Tools Suite"}</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{lang === 'bn' ? 'এগ্রি-টুলস হাব' : 'Agri-Tools Hub'}</h1>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? "টুল খুঁজুন..." : "Search for a tool..."}
            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-12 py-4 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-sm shadow-xl transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button 
            onClick={toggleListening}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-emerald-600'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto space-x-2 mb-10 pb-2 scrollbar-hide border-b border-slate-100 dark:border-slate-800 px-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`flex items-center space-x-3 px-8 py-4 rounded-2xl whitespace-nowrap text-sm font-black transition-all duration-300 ${
              activeTab === cat.id 
              ? 'bg-[#0A8A1F] text-white shadow-[0_15px_30px_rgba(10,138,31,0.3)] scale-105' 
              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`text-lg transition-transform ${activeTab === cat.id ? 'scale-125' : ''}`}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
        {filteredTools.length > 0 ? filteredTools.map((tool) => {
          const dynamicTag = getDynamicTag(tool.id);
          return (
            <div 
              key={tool.id}
              onClick={() => onNavigate(tool.id)}
              className="group bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden flex flex-col"
            >
              {/* Design accents */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                 <div className={`w-16 h-16 rounded-[1.8rem] bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-3xl shadow-inner group-hover:bg-white transition-colors ${tool.isAI ? 'ring-4 ring-blue-500/10' : ''}`}>
                    {tool.icon}
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    {dynamicTag && (
                      <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                        {dynamicTag}
                      </span>
                    )}
                    {tool.isAI && (
                      <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center">
                        <span className="w-1 h-1 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                        AI Core
                      </span>
                    )}
                    {tool.isGovt && <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified</span>}
                    {tool.isPriority && <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Recommended</span>}
                 </div>
              </div>
              
              <div className="flex-1 relative z-10 space-y-3">
                <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tight leading-none group-hover:text-emerald-600 transition-colors">{tool.title}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed line-clamp-3">{tool.desc}</p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between relative z-10">
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                   {lang === 'bn' ? "টুলটি ওপেন করুন" : "Open Tool"}
                 </span>
                 <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-700 opacity-60">
             <div className="text-7xl mb-6">🏜️</div>
             <p className="font-black text-slate-400 uppercase tracking-widest">{lang === 'bn' ? 'কোনো টুল পাওয়া যায়নি' : 'No tools found'}</p>
          </div>
        )}
      </div>

      <div className="mt-16 bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-center md:text-left space-y-4 max-w-lg">
               <h3 className="text-3xl font-black tracking-tight">{lang === 'bn' ? "সহায়তা প্রয়োজন?" : "Need Help?"}</h3>
               <p className="text-slate-400 font-medium">{lang === 'bn' ? "আমাদের কৃষি এআই চ্যাটবট আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত।" : "Our Agri-AI Chatbot is ready to answer any specific question about your farm."}</p>
            </div>
            <button 
              onClick={() => onNavigate(View.CHAT)}
              className="bg-emerald-500 text-slate-900 px-10 py-5 rounded-[2.5rem] font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-3 border-b-4 border-emerald-700"
            >
               <span>{lang === 'bn' ? "চ্যাটবট শুরু করুন" : "Start Assistant"}</span>
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
         </div>
      </div>
    </div>
  );
};

export default ToolsHub;