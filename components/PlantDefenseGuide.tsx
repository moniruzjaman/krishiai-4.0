
import React, { useState, useEffect } from 'react';

interface PyramidLevel {
  id: number;
  title: string;
  subtitle: string;
  desc: string;
  minerals: string[];
  resistance: string;
  details: string;
  color: string;
  icon: string;
  brixRange: string;
}

// Fix: Added missing onBack prop
interface PlantDefenseGuideProps {
  onBack?: () => void;
}

const PlantDefenseGuide: React.FC<PlantDefenseGuideProps> = ({ onBack }) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [brixValue, setBrixValue] = useState<number>(5);

  const pyramidLevels: PyramidLevel[] = [
    {
      id: 4,
      title: 'উন্নত সেকেন্ডারি মেটাবোলাইট',
      subtitle: 'লেভেল ৪: গৌণ বিপাক',
      desc: 'উদ্ভিদ যখন ভাইরাস এবং সব ধরণের পোকামাকড়ের বিরুদ্ধে সম্পূর্ণ প্রতিরোধী হয়ে ওঠে।',
      minerals: ['Microbial Products', 'Chitin', 'Seaweed', 'Fulvic Acid'],
      resistance: 'সব ধরণের পোকা, ছত্রাক এবং ভাইরাস।',
      details: 'এই স্তরে Brix ১২+ হয়। উদ্ভিদ ফাইট োঅ্যালে ক্সি ন তৈরি করে যা অত্যন্ত শক্তিশালী অ্যান্টি-ফাঙ্গাল ও অ্যান্টি-ব্যাকটেরিয়াল। এটি &quot;প্রকৃতপক্ষে সুস্থ&quot; (Objectively Healthy) অবস্থা।',
      color: 'bg-emerald-800',
      icon: '🧬',
      brixRange: '১২ - ২০+'
    },
    {
      id: 3,
      title: 'লিপিড সংশ্লেষণ (Lipid Synthesis)',
      subtitle: 'লেভেল ৩: উদ্বৃত্ত শক্তি সঞ্চয়',
      desc: 'পাতার উপরিভাগে মোমের স্তর তৈরি হয় যা ছত্রাক ও ব্যাকটেরিয়া প্রতিরোধ করে।',
      minerals: ['Microbial Metabolites', 'Boron (B)'],
      resistance: 'বায়ুবাহিত রোগজীবাণু ও চিবানো পোকা (Chewing Insects)।',
      details: 'Brix ৮-১২ এর মধ্যে থাকে। গাছ তার &quot;ঢাল ও তলোয়ার&quot; (Sword and Shield) তৈরি করে। পানির ধারণ ক্ষমতা বৃদ্ধি পায় এবং পোকাদের হজমে সমস্যা তৈরি হয়।',
      color: 'bg-emerald-600',
      icon: '🛡️',
      brixRange: '৮ - ১২'
    },
    {
      id: 2,
      title: 'সম্পূর্ণ প্রোটিন সংশ্লেষণ',
      subtitle: 'লেভেল ২: প্যাসিভ ইমিউনিটি',
      desc: 'নাইট্রোজেন দ্রুত প্রোটিনে রূপান্তরিত হয়, ফলে চোষক পোকার জন্য কোনো খাবার থাকে না।',
      minerals: ['Magnesium (Mg)', 'Sulfur (S)', 'Molybdenum (Mo)'],
      resistance: 'লার্ভা, চোষক পোকা এবং এফিড গ্রুপ।',
      details: 'Brix ৪-৭ এর মধ্যে থাকে। এটি &quot;লড়াই করার ক্ষমতা&quot; (Fighting Chance) পর্যায়। গাছ তার ভেতরের দ্রবণীয় নাইট্রেট কমিয়ে পোকাদের জন্য অখাদ্য হয়ে ওঠে।',
      color: 'bg-green-500',
      icon: '🧪',
      brixRange: '৪ - ৭'
    },
    {
      id: 1,
      title: 'সম্পূর্ণ সালোকসংশ্লেষণ',
      subtitle: 'লেভেল ১: শর্করা ব্যবস্থাপনা',
      desc: 'উদ্ভিদ পর্যাপ্ত শর্করা তৈরি করে এবং মাটি-বাহিত ছত্রাক প্রতিরোধ করে।',
      minerals: ['Nitrogen (N)', 'Iron (Fe)', 'Manganese (Mn)', 'Phosphorus (P)'],
      resistance: 'ভার্টিসিলিয়াম, ফুসারিয়াম ও রাইজোক্টোনিয়া।',
      details: 'Brix ৩-৫ এর নিচে থাকলে গাছকে &quot;জোর করে খাবার&quot; (Force Feeding) দিতে হয়। লেভেল ১-এ পৌঁছালে গাছ স্বয়ংক্রিয়ভাবে জটিল কার্বোহাইড্রেট তৈরি শুরু করে।',
      color: 'bg-green-400',
      icon: '☀️',
      brixRange: '১ - ৪'
    }
  ];

  // Sync level with Brix value
  useEffect(() => {
    const timer = setTimeout(() => {
      if (brixValue >= 12) setSelectedLevel(4);
      else if (brixValue >= 8) setSelectedLevel(3);
      else if (brixValue >= 4) setSelectedLevel(2);
      else setSelectedLevel(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [brixValue]);

  const getPestStatus = () => {
    if (brixValue >= 12) return { text: "সম্পূর্ণ সুরক্ষিত (No Insects / No Disease)", color: "text-emerald-600", icon: "💎" };
    if (brixValue >= 10) return { text: "ঘাসফড়িং ও চিবানো পোকা আক্রমণ করবে না", color: "text-green-600", icon: "🦗" };
    if (brixValue >= 8) return { text: "চোষক পোকা আক্রমণ করতে পারবে না", color: "text-green-500", icon: "🦟" };
    if (brixValue >= 6) return { text: "এফিড গ্রুপ আক্রমণ করবে না", color: "text-amber-500", icon: "🐜" };
    return { text: "সব ধরণের পোকার ঝুঁকি রয়েছে", color: "text-rose-500", icon: "⚠️" };
  };

  const pestStatus = getPestStatus();

  return (
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-32 font-sans overflow-x-hidden">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => onBack?.()} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">উদ্ভিদ প্রতিরক্ষা ও Brix গাইড</h1>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-2">The Plant Health Pyramid • Interactive Model</p>
        </div>
      </div>

      {/* Interactive Brix Scale Section */}
      <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 mb-10 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-200 via-green-500 to-emerald-800"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
           <div className="text-center md:text-left">
              <h2 className="text-xl font-black text-slate-800">Brix ইনডেক্স টুল</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Move slider to see defense levels</p>
           </div>
           <div className="flex items-center space-x-4">
              <div className="text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase">আপনার Brix</p>
                 <p className="text-4xl font-black text-[#0A8A1F]">{brixValue}</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl border-2 font-black text-xs uppercase tracking-widest ${pestStatus.color.replace('text-', 'bg-').replace('600', '50')} ${pestStatus.color} border-current`}>
                 {pestStatus.icon} {pestStatus.text}
              </div>
           </div>
        </div>

        <div className="relative pt-10 pb-16 px-4">
          <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-12 rounded-2xl overflow-hidden flex shadow-inner border border-slate-100 opacity-20">
             <div className="w-[10%] bg-green-100"></div>
             <div className="w-[30%] bg-green-300"></div>
             <div className="w-[30%] bg-green-500"></div>
             <div className="w-[30%] bg-green-700"></div>
          </div>

          <input 
            type="range" 
            min="1" 
            max="20" 
            step="1"
            value={brixValue}
            onChange={(e) => setBrixValue(parseInt(e.target.value))}
            className="w-full h-4 bg-transparent appearance-none cursor-pointer relative z-10 accent-[#0A8A1F]"
          />
          
          <div className="flex justify-between mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <div className="flex flex-col items-center">
                <span>১-২</span>
                <span className="text-[8px] text-rose-400 mt-1">খাবার প্রয়োজন</span>
             </div>
             <div className="flex flex-col items-center">
                <span>৪-৭</span>
                <span className="text-[8px] text-green-500 mt-1">লড়াইয়ের শক্তি</span>
             </div>
             <div className="flex flex-col items-center">
                <span>৮-১১</span>
                <span className="text-[8px] text-emerald-600 mt-1">ঢাল ও তলোয়ার</span>
             </div>
             <div className="flex flex-col items-center">
                <span>১২+</span>
                <span className="text-[8px] text-emerald-800 mt-1">প্রকৃত সুস্থ</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pyramid Visualization */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col items-center">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 text-center">স্বাস্থ্য পিরামিড মডেল</h2>
            
            <div className="w-full space-y-2 relative">
              {[4,3,2,1].map((levelId) => {
                const level = pyramidLevels.find(l => l.id === levelId)!;
                const isActive = selectedLevel === levelId;
                return (
                  <button
                    key={levelId}
                    onClick={() => setSelectedLevel(levelId)}
                    className={`relative w-full h-16 md:h-20 transition-all duration-500 transform rounded-2xl flex items-center justify-center text-white shadow-lg group overflow-hidden ${
                      isActive ? 'scale-105 ring-4 ring-emerald-100 z-10' : 'opacity-40 hover:opacity-100'
                    } ${level.color}`}
                    style={{ width: `${60 + (levelId * 10)}%`, margin: '0 auto' }}
                  >
                    <div className="flex items-center space-x-3 px-4">
                      <span className="text-xl md:text-2xl">{level.icon}</span>
                      <div className="text-left">
                         <p className="text-[8px] font-black uppercase opacity-70">স্তর {levelId}</p>
                         <p className="text-[10px] md:text-xs font-black leading-tight">{level.title}</p>
                      </div>
                    </div>
                    {isActive && (
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-12 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 w-full">
               <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-lg shadow-inner">🎯</div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Brix মার্কার গাইড</h4>
               </div>
               <ul className="space-y-3">
                  <li className="flex items-start space-x-2 text-[10px] font-medium text-slate-500">
                     <span className="text-emerald-500 mt-0.5">•</span>
                     <span>Brix ২-৪ এর নিচে: পটাশ বা বোরন এর তীব্র অভাব।</span>
                  </li>
                  <li className="flex items-start space-x-2 text-[10px] font-medium text-slate-500">
                     <span className="text-emerald-500 mt-0.5">•</span>
                     <span>Brix ১২ এর উপরে: মানুষ খাওয়ার জন্য সবচেয়ে নিরাপদ।</span>
                  </li>
               </ul>
            </div>
          </div>
        </div>

        {/* Level Content */}
        <div className="lg:col-span-7 space-y-6">
          {selectedLevel && (
            <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 animate-fade-in relative overflow-hidden h-full">
               <div className="absolute -bottom-10 -right-10 text-[12rem] opacity-5 pointer-events-none">
                 {pyramidLevels.find(l => l.id === selectedLevel)?.icon}
               </div>

               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg text-white ${pyramidLevels.find(l => l.id === selectedLevel)?.color}`}>
                         {pyramidLevels.find(l => l.id === selectedLevel)?.icon}
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">
                             {pyramidLevels.find(l => l.id === selectedLevel)?.subtitle}
                          </p>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                             {pyramidLevels.find(l => l.id === selectedLevel)?.title}
                          </h3>
                       </div>
                    </div>
                    <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                       <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1 text-center">Brix সীমা</p>
                       <span className="text-xs font-black text-emerald-700">{pyramidLevels.find(l => l.id === selectedLevel)?.brixRange}</span>
                    </div>
                  </div>

                  <div className="space-y-8">
                     <p className="text-lg font-bold text-slate-700 leading-relaxed">
                        {pyramidLevels.find(l => l.id === selectedLevel)?.desc}
                     </p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                           <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center">
                             <span className="mr-2">💎</span> প্রয়োজনীয় খনিজ পদার্থ
                           </h4>
                           <div className="flex flex-wrap gap-2">
                              {pyramidLevels.find(l => l.id === selectedLevel)?.minerals.map(m => (
                                <span key={m} className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold text-blue-800 shadow-sm">{m}</span>
                              ))}
                           </div>
                        </div>
                        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                           <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center">
                             <span className="mr-2">🛡️</span> প্রতিরোধ ক্ষমতা
                           </h4>
                           <p className="text-xs text-rose-800 font-bold leading-relaxed">
                              {pyramidLevels.find(l => l.id === selectedLevel)?.resistance}
                           </p>
                        </div>
                     </div>

                     <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">বিশেষজ্ঞ ব্যাখ্যা (Scientific Insight)</h4>
                        <p className="text-sm font-medium leading-relaxed text-slate-300">
                           {pyramidLevels.find(l => l.id === selectedLevel)?.details}
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border-b-[16px] border-emerald-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
           <div className="space-y-6">
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">কেন Brix মান গুরুত্বপূর্ণ?</h3>
              <p className="text-lg text-slate-300 leading-relaxed font-medium">
                উচ্চ Brix মানের অর্থ হলো উদ্ভিদে খনিজ লবণের ঘনত্ব বেশি। এটি শুধু পোকা-মাকড় থেকেই রক্ষা করে না, বরং শস্যের স্বাদ বৃদ্ধি করে এবং স্টোরেজ লাইফ বাড়ায়। ১২+ Brix মানে আপনার ফসল &quot;প্রকৃতপক্ষে সুস্থ&quot; এবং বাণিজ্যিক বিপণনের জন্য শ্রেষ্ঠ।
              </p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center">
                 <span className="text-4xl mb-4 block">🍎</span>
                 <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">অসাধারণ স্বাদ</p>
                 <p className="text-xs font-bold text-white">উচ্চ সুগার ও মিনারেল</p>
              </div>
              <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center">
                 <span className="text-4xl mb-4 block">📦</span>
                 <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">দীর্ঘস্থায়িত্ব</p>
                 <p className="text-xs font-bold text-white">কম পচনশীলতা</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PlantDefenseGuide;
