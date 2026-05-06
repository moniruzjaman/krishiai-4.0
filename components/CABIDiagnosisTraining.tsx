
import React, { useState } from 'react';
import { useSpeech } from '../App';

interface MODULE_TYPE {
  id: number;
  title: string;
  icon: string;
  desc: string;
  content: string;
  scientificDefinition: string;
  image?: string;
  governmentStandard?: string;
  checkpoints?: { label: string; definition: string }[];
  tip?: string;
  simulator?: {
    image: string;
    question: string;
    options: { label: string; value: string; isCorrect: boolean; feedback: string; }[];
  };
  logic?: { label: string; target: string; desc: string; }[];
  isQuiz?: boolean;
  question?: string;
  options?: { label: string; correct: boolean; }[];
}

const MODULES: MODULE_TYPE[] = [
  {
    id: 1,
    title: "ধাপ ১: উদ্ভিদ পর্যবেক্ষণ (Observation)",
    icon: "🌱",
    desc: "CABI স্ট্যান্ডার্ড অনুযায়ী একটি সুস্থ ও অসুস্থ উদ্ভিদের তুলনামূলক বিশ্লেষণ।",
    content: "ডায়াগনোসিসের প্রথম শর্ত হলো উদ্ভিদের স্বাভাবিক বৃদ্ধি (Morphology) বোঝা। আক্রান্ত অংশটি কি পাতায়, কান্ডে নাকি শিকড়ে? এটি শনাক্ত করা জরুরি।",
    scientificDefinition: "গাছের প্রতিটি অঙ্গের স্বাভাবিক রঙ, গঠন এবং টিস্যুর স্থায়িত্ব পর্যবেক্ষণ করা। কোনো অসামঞ্জস্যতা দেখা দিলেই তাকে 'Symptom' হিসেবে চিহ্নিত করা হয়।",
    image: "https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?auto=format&fit=crop&q=80&w=800",
    checkpoints: [
      { label: "Chlorosis", definition: "পাতার সবুজ রঙ হারিয়ে হলদেটে হয়ে যাওয়া।" },
      { label: "Necrosis", definition: "উদ্ভিদ কোষের মৃত্যু বা টিস্যু শুকিয়ে কালো হয়ে যাওয়া।" },
      { label: "Stunting", definition: "স্বাভাবিকের চেয়ে গাছের বৃদ্ধি কমে যাওয়া বা খাটো হওয়া।" },
      { label: "Wilting", definition: "পানির অভাব বা শিকড় পচনের কারণে গাছ নুয়ে পড়া।" }
    ],
    tip: "টিপস: বিএআরআই (BARI) নির্দেশিকা অনুযায়ী, সবসময় সতেজ নতুন পাতা এবং পুরনো পাতার রঙের পার্থক্য খেয়াল করুন।"
  },
  {
    id: 2,
    title: "ধাপ ২: পোকা বনাম রোগ (Pest vs Disease)",
    icon: "🔬",
    desc: "লক্ষণের মাধ্যমে অপরাধী শনাক্তকরণ।",
    content: "যদি উদ্ভিদের টিস্যু সরাসরি গায়েব হয়ে যায় (Chewing), তবে সেটি পোকা। যদি রঙ পরিবর্তন বা স্পট দেখা যায় (Blighting/Spots), তবে সেটি ছত্রাক বা ব্যাকটেরিয়া।",
    scientificDefinition: "পোকা সাধারণত যান্ত্রিক উপায়ে (Mouthparts) ক্ষতি করে, আর জীবাণু রাসায়নিক বা এনজাইমেটিক উপায়ে কোষ নষ্ট করে।",
    simulator: {
      image: "https://images.unsplash.com/photo-1628350560943-029e44799b7c?auto=format&fit=crop&q=80&w=800",
      question: "এই ধান পাতার চিত্রটি লক্ষ্য করুন। এখানে মাঝখান দিয়ে টিস্যু চিবানোর চিহ্ন স্পষ্ট। এটি কোন ধরণের লক্ষণ?",
      options: [
        { label: "চিবানো ক্ষতি (Chewing Damage)", value: "pest", isCorrect: true, feedback: "সঠিক! এটি মাজরা পোকা বা লেদা পোকার লক্ষণ। পোকা সরাসরি টিস্যু খেয়ে ফেলেছে।" },
        { label: "ছত্রাকজনিত ছোপ (Fungal Spot)", value: "disease", isCorrect: false, feedback: "ভুল! ছত্রাক টিস্যু খায় না, শুধু রঙ পরিবর্তন বা পচন ঘটায়।" },
        { label: "পুষ্টির অভাব (Deficiency)", value: "nutrient", isCorrect: false, feedback: "না! পুষ্টির অভাবে পাতা ফ্যাকাশে হতে পারে, কিন্তু কামড়ের চিহ্ন থাকে না।" }
      ]
    }
  },
  {
    id: 3,
    title: "ধাপ ৩: পুষ্টির অভাব শনাক্তকরণ (Nutrient Audit)",
    icon: "⚖️",
    desc: "অ্যাবায়োটিক স্ট্রেস বা সারের অভাব নির্ণয়।",
    governmentStandard: "BARC Fertilizer Guide 2024",
    scientificDefinition: "পুষ্টির অভাব সাধারণত সারা মাঠ জুড়ে একইভাবে দেখা যায়, আর রোগ বা পোকা প্যাচ (Patch) আকারে দেখা দেয়।",
    content: "ধানের নিচের পুরনো পাতা যদি ডগা থেকে ইংরেজি 'V' আকৃতিতে হলুদ হয়ে যায়, তবে বুঝতে হবে এটি নাইট্রোজেনের অভাব। আর পাতার চারপাশ পুড়ে গেলে তা পটাশ এর অভাব।",
    simulator: {
      image: "https://images.unsplash.com/photo-1599839619722-397514112634?auto=format&fit=crop&q=80&w=800",
      question: "চিত্রটি দেখুন: ধানের পুরনো পাতাগুলো ডগা থেকে শিরার দিকে হলুদ হয়ে যাচ্ছে। এটি কিসের লক্ষণ?",
      options: [
        { label: "নাইট্রোজেন (N) এর অভাব", value: "nitrogen", isCorrect: true, feedback: "সঠিক! এটি নাইট্রোজেনের ক্লাসিক 'V' শেপ ক্লোরোসিস। BARC নির্দেশিকা অনুযায়ী ইউরিয়া প্রয়োগ করতে হবে।" },
        { label: "পটাশিয়াম (K) এর অভাব", value: "potash", isCorrect: false, feedback: "ভুল! পটাশের অভাবে পাতার কিনারা বা চারপাশ পুড়ে যাওয়ার মতো দেখায়।" },
        { label: "লবণাক্ততা (Salinity Stress)", value: "salt", isCorrect: false, feedback: "না! লবণাক্ততায় পুরো চারা সাদাটে বা তামাটে হয়ে পুড়ে যায়।" }
      ]
    }
  },
  {
    id: 4,
    title: "ধাপ ৪: পরিবেশ ও বিস্তার বিশ্লেষণ",
    icon: "🌡️",
    desc: "অনুকূল পরিবেশ এবং বিস্তার প্যাটার্ন।",
    scientificDefinition: "উচ্চ আর্দ্রতা (>৮৫%) এবং নির্দিষ্ট তাপমাত্রা (২২-২৮°C) অনেক ছত্রাকের জন্য আদর্শ। এই ডাটা ছাড়া সঠিক ডায়াগনোসিস অসম্ভব।",
    content: "মাঠে সমস্যাটি কি গোল আকারে (Circular Patches) ছড়িয়ে পড়ছে? তবে এটি একটি সংক্রমণ। যদি নির্দিষ্ট লাইনে থাকে, তবে এটি সার বা বিষ প্রয়োগের সমস্যা।",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800",
    logic: [
      { label: "উচ্চ আর্দ্রতা ও কুয়াশা", target: "ছত্রাক (Fungal)", desc: "লেট ব্লাইট বা ব্লাস্টের সম্ভাবনা বেশি।" },
      { label: "তীব্র রোদ ও খরা", target: "মাকড় বা চোষক পোকা", desc: "পাতা কোঁকড়ানো বা লালচে ভাব দেখা দেয়।" }
    ]
  },
  {
    id: 5,
    title: "ধাপ ৫: চূড়ান্ত মাস্টার অডিট চ্যালেঞ্জ",
    icon: "🥇",
    desc: "সমন্বিত সমাধান ও MoA ভিত্তিক প্রেসক্রিপশন।",
    scientificDefinition: "IPM বা সমন্বিত বালাই ব্যবস্থাপনা ব্যবহার করে ক্ষতিকর রাসায়নিকের ব্যবহার কমানো এবং MoA (Mode of Action) রোটেশন বজায় রাখা।",
    content: "একজন প্ল্যান্ট ডক্টর হিসেবে আপনাকে শুধু রোগ চিনলেই হবে না, সঠিক মাত্রায় এবং সঠিক গ্রুপের (MoA) বিষের সুপারিশ করতে হবে।",
    isQuiz: true,
    question: "ধানের পাতায় 'চোখের আকৃতির' বাদামী দাগ এবং উচ্চ আর্দ্রতা লক্ষ্য করা গেছে। ড্যামেজ প্যাটার্ন সংক্রামক। সঠিক সমাধান কী?",
    options: [
      { label: "ইউরিয়া প্রয়োগ বাড়ানো (Abiotic Fix)", correct: false },
      { label: "হাতজাল দিয়ে পোকা ধরা (IPM only)", correct: false },
      { label: "ব্লাস্টের জন্য সঠিক ছত্রাকনাশক (MoA Group 3/11) প্রয়োগ", correct: true },
      { label: "জমির পানি শুকিয়ে ফেলা (Partial Fix)", correct: false }
    ]
  }
];

interface CABIDiagnosisTrainingProps {
  onBack: () => void;
  onAction: () => void;
}

const CABIDiagnosisTraining: React.FC<CABIDiagnosisTrainingProps> = ({ onBack, onAction }) => {
  const [currentModule, setCurrentModule] = useState(0);
  const [progress, setProgress] = useState(0);
  const [simFeedback, setSimFeedback] = useState<{ text: string, isCorrect: boolean } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const { playSpeech, stopSpeech } = useSpeech();

  const handleNext = () => {
    if (currentModule < MODULES.length - 1) {
      const nextIdx = currentModule + 1;
      setCurrentModule(nextIdx);
      setSimFeedback(null);
      setShowDefinition(false);
      setProgress((nextIdx / MODULES.length) * 100);
      stopSpeech();
    } else {
      setCompleted(true);
      setProgress(100);
      onAction();
    }
  };

  const activeModule = MODULES[currentModule];

  const triggerScan = (feedback: string, isCorrect: boolean) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setSimFeedback({ text: feedback, isCorrect });
      playSpeech(feedback);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50/90 backdrop-blur-md z-50 py-4 px-2 border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <button onClick={() => { stopSpeech(); onBack(); }} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-emerald-600 hover:text-white transition-all active:scale-90">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">CABI ডায়াগনোসিস একাডেমি</h1>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Global Plant Doctor Training v3.0</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <div className="text-right hidden sm:block">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Training Progress</p>
              <p className="text-xs font-black text-emerald-600">{Math.round(progress)}% Complete</p>
           </div>
           <div className="w-12 h-12 bg-white rounded-2xl border-2 border-emerald-100 flex items-center justify-center text-xl shadow-inner animate-pulse">🎓</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-10 overflow-hidden shadow-inner mx-2">
         <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_#10b981]" style={{ width: `${progress}%` }}></div>
      </div>

      {!completed ? (
        <div className="space-y-8 animate-fade-in px-2">
           {/* Module Content Card */}
           <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-30 blur-3xl"></div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                 <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center text-3xl md:text-4xl shadow-2xl relative">
                       {activeModule?.icon}
                       <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">STAGE {activeModule.id}</div>
                    </div>
                    <div>
                       <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{activeModule?.title}</h2>
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{activeModule?.desc}</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setShowDefinition(!showDefinition)}
                  className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${showDefinition ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                 >
                    {showDefinition ? 'সংজ্ঞা লুকান' : 'বৈজ্ঞানিক সংজ্ঞা'}
                 </button>
              </div>

              <div className="space-y-8 relative z-10">
                 {showDefinition && (
                    <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-[2rem] animate-fade-in-up shadow-inner relative overflow-hidden">
                       <div className="absolute -bottom-4 -right-4 text-5xl opacity-10">📚</div>
                       <h4 className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-2">Scientific Core Knowledge</h4>
                       <p className="text-indigo-900 text-base font-bold leading-relaxed">{activeModule.scientificDefinition}</p>
                    </div>
                 )}

                 {activeModule?.image && !activeModule.simulator && !activeModule.isQuiz && (
                    <div className="rounded-[2.5rem] overflow-hidden shadow-xl aspect-video mb-8 border-8 border-slate-50 relative group">
                       <img src={activeModule.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" alt={activeModule.title} />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                          <p className="text-white font-bold text-sm">CABI Plantwise Field Specimen: Reference Photo</p>
                       </div>
                    </div>
                 )}

                 <p className="text-lg md:text-xl text-slate-700 leading-relaxed font-medium bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    {activeModule?.content}
                 </p>

                 {/* Step Specific Components */}
                 {activeModule.checkpoints && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {activeModule.checkpoints.map((cp) => (
                         <div key={cp.label} className="p-6 bg-white rounded-[2rem] border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all cursor-default group">
                            <h4 className="text-emerald-600 font-black text-sm mb-2">{cp.label}</h4>
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">{cp.definition}</p>
                         </div>
                       ))}
                    </div>
                 )}

                 {activeModule.simulator && (
                    <div className="bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-slate-800">
                       <div className="relative h-72 md:h-96 group">
                          <img src={activeModule.simulator.image} className="w-full h-full object-cover opacity-70" alt="Simulator Sample" />
                          {isScanning && (
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent animate-scanning-line h-10 w-full z-20"></div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="w-48 h-48 md:w-64 md:h-64 border-2 border-emerald-500/30 rounded-full animate-pulse"></div>
                          </div>
                          <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30 shadow-2xl">
                             Micro-Symptom Analyzer Active
                          </div>
                       </div>
                       <div className="p-10 space-y-8 bg-slate-950">
                          <div>
                            <h4 className="text-emerald-400 font-black uppercase text-[11px] tracking-[0.3em] mb-3">ভার্চুয়াল স্যাম্পল ডায়াগনোসিস</h4>
                            <h3 className="text-white text-2xl md:text-3xl font-black tracking-tight leading-tight">{activeModule.simulator.question}</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                             {activeModule.simulator.options?.map((opt) => (
                               <button 
                                 key={opt.value} 
                                 onClick={() => triggerScan(opt.feedback, opt.isCorrect)}
                                 className={`w-full text-left p-6 border-2 transition-all font-black text-sm flex items-center justify-between group/opt rounded-[2rem] ${
                                    simFeedback?.text === opt.feedback ? (simFeedback?.isCorrect ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white') : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                 }`}
                               >
                                 <span>{opt.label}</span>
                                 <svg className="w-6 h-6 opacity-0 group-hover/opt:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                               </button>
                             ))}
                          </div>
                          
                          {simFeedback && (
                            <div className={`p-8 rounded-[2.5rem] animate-fade-in border-l-[12px] shadow-2xl ${simFeedback.isCorrect ? 'bg-emerald-500/10 border-emerald-500' : 'bg-rose-500/10 border-rose-500'}`}>
                               <div className="flex items-center space-x-4 mb-4">
                                  <span className="text-4xl">{simFeedback.isCorrect ? '🎯' : '❌'}</span>
                                  <div>
                                    <p className={`font-black uppercase text-[11px] tracking-widest ${simFeedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                       {simFeedback.isCorrect ? 'Scientific Conclusion' : 'Diagnostic Feedback'}
                                    </p>
                                    <p className="text-white text-xl font-bold leading-relaxed">{simFeedback.text}</p>
                                  </div>
                               </div>
                               {simFeedback.isCorrect && (
                                  <button 
                                    onClick={handleNext}
                                    className="w-full mt-6 bg-white text-emerald-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                  >
                                    পরবর্তী সেশনে যান
                                  </button>
                               )}
                            </div>
                          )}
                       </div>
                    </div>
                 )}

                 {activeModule.logic && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {activeModule.logic.map((l) => (
                         <div key={l.label} className="p-8 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100 relative overflow-hidden group hover:bg-blue-600 transition-all cursor-default shadow-md">
                            <div className="relative z-10">
                               <h4 className="font-black text-blue-600 group-hover:text-blue-100 uppercase text-[10px] tracking-widest mb-1">{l.label}</h4>
                               <p className="text-2xl font-black text-slate-800 group-hover:text-white mb-3">{l.target}</p>
                               <p className="text-base font-bold text-blue-800/60 group-hover:text-white/80 leading-relaxed">{l.desc}</p>
                            </div>
                            <div className="absolute -bottom-6 -right-6 text-8xl opacity-5 group-hover:opacity-20 transition-opacity">📊</div>
                         </div>
                       ))}
                    </div>
                 )}

                 {activeModule.isQuiz && (
                    <div className="space-y-8">
                       <div className="bg-slate-100 p-8 md:p-12 rounded-[3.5rem] border-4 border-dashed border-slate-200 relative overflow-hidden">
                          {activeModule.image && (
                            <img src={activeModule.image} className="w-full h-64 object-cover rounded-[2rem] mb-8 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" alt="Quiz Clue" />
                          )}
                          <div className="flex items-center space-x-4 mb-4">
                             <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-black">?</div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Final Board Exam</p>
                          </div>
                          <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">&quot;{activeModule.question}&quot;</h3>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeModule.options?.map((opt, i) => (
                            <button 
                              key={i}
                              onClick={() => { if(opt.correct) handleNext(); else alert("ডায়াগনোসিস ভুল হয়েছে! আবার পর্যবেক্ষণ করুন।"); }}
                              className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] text-left font-black text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-md hover:shadow-2xl group flex items-center"
                            >
                               <span className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center text-xs mr-4 transition-colors shrink-0">{String.fromCharCode(65+i)}</span>
                               <span className="leading-tight">{opt.label}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                 )}

                 {activeModule.tip && (
                    <div className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-100 flex items-start space-x-6 shadow-inner animate-pulse">
                       <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm shrink-0">💡</div>
                       <p className="text-lg font-bold text-amber-900 leading-relaxed italic">{activeModule.tip}</p>
                    </div>
                 )}
              </div>

              {!activeModule.isQuiz && !activeModule.simulator && (
                <div className="mt-16 flex justify-end">
                   <button 
                     onClick={handleNext}
                     className="bg-slate-900 text-white px-14 py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center space-x-4 group border-b-4 border-black"
                   >
                      <span>পরবর্তী বৈজ্ঞানিক স্তর</span>
                      <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </button>
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto py-12 text-center space-y-12 animate-fade-in px-4">
           <div className="relative">
              <div className="w-56 h-56 bg-emerald-100 rounded-[4rem] flex items-center justify-center mx-auto text-[10rem] animate-bounce shadow-[0_30px_60px_rgba(16,185,129,0.3)] border-8 border-white relative z-10">🎓</div>
              <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                 {[1,2,3,4,5,6,7,8].map(i => (
                   <div key={i} className="absolute text-3xl animate-pulse" style={{ top: `${(i * 13) % 100}%`, left: `${(i * 17) % 100}%`, animationDelay: `${i*0.2}s` }}>✨</div>
                 ))}
              </div>
           </div>
           
           <div className="space-y-6">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">অভিনন্দন, আপনি এখন একজন সার্টিফাইড &apos;প্ল্যান্ট ডক্টর&apos;!</h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg mx-auto">আপনি সফলভাবে সকল বৈজ্ঞানিক সেশন এবং CABI Plantwise ডায়াগনোসিস ট্রেনিং সম্পন্ন করেছেন।</p>
           </div>

           <div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl relative overflow-hidden border-b-[20px] border-emerald-500">
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-400"></div>
              <p className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-10">Diagnostic Achievement Rewards</p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                 <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 shadow-inner group hover:scale-105 transition-all">
                    <p className="text-5xl mb-3 group-hover:rotate-12 transition-transform">🏅</p>
                    <p className="text-[11px] font-black uppercase text-white tracking-widest">Elite Plant Doctor Badge</p>
                 </div>
                 <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 shadow-inner group hover:scale-105 transition-all">
                    <p className="text-5xl mb-3 group-hover:rotate-12 transition-transform">💎</p>
                    <p className="text-[11px] font-black uppercase text-white tracking-widest">+১০০ Agro Mastery XP</p>
                 </div>
              </div>
           </div>

           <div className="pt-8">
              <button 
                onClick={onBack}
                className="w-full bg-emerald-600 text-white py-8 rounded-[3rem] font-black text-2xl shadow-[0_30px_60px_rgba(10,138,31,0.4)] active:scale-95 transition-all hover:bg-emerald-700 border-b-8 border-emerald-900"
              >
                এআই স্ক্যানার দিয়ে প্র্যাকটিস শুরু করুন
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CABIDiagnosisTraining;
