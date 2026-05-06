import React, { useState, useEffect, useRef, useMemo } from 'react';
import { performSoilHealthAudit, requestSoilPrecisionParameters, performDeepSoilAudit } from '../services/geminiService';
import { detectCurrentAEZDetails, AEZInfo } from '../services/locationService';
import { SavedReport, Language } from '../types';
import DynamicPrecisionForm from './DynamicPrecisionForm';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';
import { ToolGuideHeader } from './ToolGuideHeader';

interface SoilExpertProps {
  onAction?: (xp: number) => void;
  onBack?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  lang: Language;
}

const SOIL_TOUR: TourStep[] = [
  { title: "মৃত্তিকা বিশেষজ্ঞ ২.০", content: "মাটি বিশ্লেষণ, বুনট নির্ণয় এবং জৈব সার পরিকল্পনার জন্য এই উন্নত টুলটি ব্যবহার করুন।", position: 'center' },
  { targetId: "soil-tab-switcher", title: "টুল নির্বাচন", content: "আপনার প্রয়োজন অনুযায়ী অডিট, বুনট বা জৈব সার ক্যালকুলেটর বেছে নিন।", position: 'bottom' },
  { targetId: "soil-deep-audit-btn", title: "ডিপ অডিট", content: "নিখুঁত কৃষি পরিকল্পনার জন্য এআই-এর বিশেষ প্রশ্নের উত্তর দিয়ে ডিপ অডিট করুন।", position: 'top' }
];

const SoilExpert: React.FC<SoilExpertProps> = ({ onAction, onBack, lang }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'texture' | 'om_calc'>('audit');
  const [aezData, setAezData] = useState<AEZInfo | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [precisionFields, setPrecisionFields] = useState<any[] | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [activeTextureStep, setActiveTextureStep] = useState<number>(0);

  // Texture Slider State
  const [sand, setSand] = useState(40);
  const [silt, setSilt] = useState(40);
  const [clay, setClay] = useState(20);

  // Organic Matter Mixer State
  const [currentOM, setCurrentOM] = useState(1.5);
  const [targetOM, setTargetOM] = useState(3.5);
  const [landUnit, setLandUnit] = useState<'bigha' | 'decimal' | 'pit'>('bigha');
  const [landArea, setLandArea] = useState(33);
  const [selectedAdditives, setSelectedAdditives] = useState<string[]>([]);
  const [omResult, setOmResult] = useState<any>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const { playSpeech, isSpeaking } = useSpeech();
  const [auditInputs, setAuditInputs] = useState({ ph: 6.5, oc: 0.8, n: 0.1, p: 15, k: 0.15 });

  const additives = [
    { id: 'mustard', label: lang === 'bn' ? 'সরিষার খৈল' : 'Mustard Cake', icon: '🌻', value: 0.12, info: "নাইট্রোজেনের চমৎকার উৎস" },
    { id: 'bone', label: lang === 'bn' ? 'হাড়ের গুঁড়ো' : 'Bone Meal', icon: '🦴', value: 0.08, info: "ফসফরাস ও ক্যালসিয়াম সরবরাহ করে" },
    { id: 'tea', label: lang === 'bn' ? 'চা/কফি ওয়েস্ট' : 'Tea/Coffee Ground', icon: '☕', value: 0.05, info: "অম্লীয় ভাব বজায় রাখে" },
    { id: 'biochar', label: lang === 'bn' ? 'বায়োচার' : 'Biochar', icon: '🖤', value: 0.20, info: "দীর্ঘস্থায়ী কার্বন ও পানি ধারণ" },
    { id: 'ash', label: lang === 'bn' ? 'ছাই' : 'Ash', icon: '🌫️', value: 0.06, info: "পটাশিয়াম ও চুন হিসেবে কাজ করে" },
    { id: 'water_holder', label: lang === 'bn' ? 'জলধারক (Cocopeat)' : 'Water Holder', icon: '🥥', value: 0.25, info: "তীব্র খরায় পানি ধরে রাখে" }
  ];

  const textureGuideSteps = [
    {
      title: lang === 'bn' ? "১. শুকনো স্পর্শ পরীক্ষা (Dry Test)" : "1. Dry Feel Test",
      desc: lang === 'bn' ? "এক মুঠো শুকনো মাটি নিন এবং আঙুল দিয়ে ঘষুন।" : "Take a handful of dry soil and rub it between your fingers.",
      outcome: [
        { label: lang === 'bn' ? "খুবই খসখসে" : "Very Gritty", value: "sand", hint: lang === 'bn' ? "বেলে মাটির লক্ষণ" : "Likely Sandy" },
        { label: lang === 'bn' ? "পাউডারের মতো মসৃণ" : "Floury/Smooth", value: "silt", hint: lang === 'bn' ? "পলি মাটির লক্ষণ" : "Likely Silty" },
        { label: lang === 'bn' ? "শক্ত চাকা বা ঢিলা" : "Hard Clumps", value: "clay", hint: lang === 'bn' ? "এঁটেল মাটির লক্ষণ" : "Likely Clay" }
      ],
      icon: "🖐️"
    },
    {
      title: lang === 'bn' ? "২. বল তৈরির পরীক্ষা (Ball Test)" : "2. Ball Formation Test",
      desc: lang === 'bn' ? "মাটি সামান্য ভিজিয়ে হাত দিয়ে গোল বল তৈরির চেষ্টা করুন।" : "Moisten the soil and try to form a ball in your hand.",
      outcome: [
        { label: lang === 'bn' ? "বল তৈরি হয় না" : "Ball breaks immediately", value: "sand", hint: lang === 'bn' ? "বেলে মাটি" : "Sandy" },
        { label: lang === 'bn' ? "বল তৈরি হয় কিন্তু চাপ দিলে ভেঙে যায়" : "Ball forms but breaks easily", value: "loam", hint: lang === 'bn' ? "দোআঁশ মাটি" : "Loamy" },
        { label: lang === 'bn' ? "খুব শক্ত এবং আঠালো বল তৈরি হয়" : "Forms a firm, sticky ball", value: "clay", hint: lang === 'bn' ? "এঁটেল মাটি" : "Clayey" }
      ],
      icon: "🧶"
    },
    {
      title: lang === 'bn' ? "৩. ফিতা তৈরির পরীক্ষা (Ribbon Test)" : "3. Ribbon/Fingers Test",
      desc: lang === 'bn' ? "ভেজা মাটির বলটিকে আঙুল দিয়ে চেপে ফিতার মতো লম্বা করার চেষ্টা করুন।" : "Push the moist soil between your thumb and forefinger to form a ribbon.",
      outcome: [
        { label: lang === 'bn' ? "১ ইঞ্চির কম লম্বা হয়" : "Less than 1 inch", value: "loam", hint: lang === 'bn' ? "বেলে দোআঁশ" : "Sandy Loam" },
        { label: lang === 'bn' ? "১ থেকে ২ ইঞ্চি পর্যন্ত লম্বা হয়" : "1 - 2 inches", value: "silty_clay", hint: lang === 'bn' ? "পলি এঁটেল" : "Silty Clay" },
        { label: lang === 'bn' ? "২ ইঞ্চির বেশি লম্বা ও ফাটল ধরে না" : "More than 2 inches", value: "heavy_clay", hint: lang === 'bn' ? "ভারী এঁটেল" : "Heavy Clay" }
      ],
      icon: "📏"
    }
  ];

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_soil_v4');
    if (!tourDone) setShowTour(true);
    handleDetectAEZ(false);
  }, []);

  const handleAuditSubmit = async (precision: boolean = false) => {
    setIsLoading(true); setAdvice(null);
    try {
      if (precision) {
        const fields = await requestSoilPrecisionParameters(auditInputs, aezData?.name || 'Local', lang);
        setPrecisionFields(fields);
      } else {
        const res = await performSoilHealthAudit(auditInputs, aezData || undefined, lang);
        setAdvice(res || null);
        if (res) playSpeech(res);
        if (onAction) onAction(45);
      }
    } catch (_e) {
      alert("Audit Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrecisionSubmit = async (dynamicData: Record<string, string>) => {
    setIsLoading(true);
    try {
      const res = await performDeepSoilAudit(auditInputs, aezData?.name || 'Local', dynamicData, lang);
      setAdvice(res || null);
      if (res) playSpeech(res);
      setPrecisionFields(null);
      if (onAction) onAction(60);
    } catch (_e) { alert("Deep Soil Audit Failed."); } finally { setIsLoading(false); }
  };

  const handleDetectAEZ = async (force: boolean = true) => {
    setIsDetecting(true);
    try {
      const data = await detectCurrentAEZDetails(force);
      setAezData(data);
    } catch (_e) { if (force) alert("Location detection failed."); } finally { setIsDetecting(false); }
  };

  const calculateOrganicFertilizer = () => {
    const deficit = Math.max(0, targetOM - currentOM);
    let areaInDecimal = 0;
    
    if (landUnit === 'bigha') areaInDecimal = landArea * 33;
    else if (landUnit === 'decimal') areaInDecimal = landArea;
    else if (landUnit === 'pit') areaInDecimal = landArea * 0.1; // Estimate 1 pit work area as ~0.1 decimal (around 43 sq ft)

    // Base requirement: ~15kg compost per 1% deficit per decimal
    const neededTotalKg = areaInDecimal * 15 * deficit; 
    
    const selectedAdditiveData = additives.filter(a => selectedAdditives.includes(a.id));
    const additiveWeights = selectedAdditiveData.map(a => ({
      label: a.label,
      weight: (neededTotalKg * a.value).toFixed(1),
      icon: a.icon
    }));

    const totalAdditiveWeightVal = selectedAdditiveData.reduce((acc, curr) => acc + (neededTotalKg * curr.value), 0);
    const remainingKg = Math.max(0, neededTotalKg - totalAdditiveWeightVal);
    
    setOmResult({
      totalKg: (neededTotalKg).toFixed(1),
      cowDung: (remainingKg * 0.6).toFixed(1),
      vermiCompost: (remainingKg * 0.4).toFixed(1),
      additives: additiveWeights,
      deficit: deficit.toFixed(2),
      unit: landUnit === 'pit' ? (lang === 'bn' ? 'গর্ত' : 'Pit') : (landUnit === 'bigha' ? (lang === 'bn' ? 'বিঘা' : 'Bigha') : (lang === 'bn' ? 'শতাংশ' : 'Decimal'))
    });
    if (onAction) onAction(15);
  };

  const textureResult = useMemo(() => {
    const total = sand + silt + clay;
    const cP = (clay / total) * 100;
    const sP = (sand / total) * 100;
    if (cP >= 40) return { name: lang === 'bn' ? "এঁটেল মাটি (Clay)" : "Clay Soil", color: "text-rose-600", bg: "bg-rose-50" };
    if (sP >= 85) return { name: lang === 'bn' ? "বেলে মাটি (Sand)" : "Sandy Soil", color: "text-amber-600", bg: "bg-amber-50" };
    return { name: lang === 'bn' ? "দোআঁশ মাটি (Loam)" : "Loamy Soil", color: "text-emerald-600", bg: "bg-emerald-50" };
  }, [sand, silt, clay, lang]);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-32 font-sans animate-fade-in">
      {showTour && <GuidedTour steps={SOIL_TOUR} tourKey="soil_v4" onClose={() => setShowTour(false)} />}
      
      <ToolGuideHeader 
        title={lang === 'bn' ? 'মৃত্তিকা বিশেষজ্ঞ ২.০' : 'Soil Expert 2.0'}
        subtitle={lang === 'bn' ? 'মাটির বুনট নির্ণয় ও অঞ্চলভিত্তিক পুষ্টি অডিট রিপোর্টিং।' : 'Soil texture identification and region-based nutrient audit reporting.'}
        protocol="SRDI-BARC-FRG24"
        source="Soil Resource Development Institute"
        lang={lang}
        onBack={onBack || (() => {})}
        icon="🏺"
        themeColor="amber"
        guideSteps={lang === 'bn' ? ["আপনার এলাকার মাটির প্রোফাইল দেখুন।", "বুনট নির্ণয় গাইড অনুসরণ করুন।", "জৈব মিক্সার প্ল্যান তৈরি করুন।"] : ["Detect area profile.", "Follow texture guide.", "Create organic mixer plan."]}
      />

      <div id="soil-tab-switcher" className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-10 border border-slate-200 overflow-x-auto scrollbar-hide print:hidden">
        <button onClick={() => setActiveTab('audit')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${activeTab === 'audit' ? 'bg-amber-600 text-white shadow-xl' : 'text-slate-400'}`}>স্বাস্থ্য অডিট</button>
        <button onClick={() => setActiveTab('texture')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${activeTab === 'texture' ? 'bg-amber-600 text-white shadow-xl' : 'text-slate-400'}`}>বুনট নির্ণয়</button>
        <button onClick={() => setActiveTab('om_calc')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${activeTab === 'om_calc' ? 'bg-amber-600 text-white shadow-xl' : 'text-slate-400'}`}>জৈব সার মিক্সার</button>
      </div>

      {activeTab === 'audit' && (
        <div className="space-y-8 animate-fade-in">
           <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
              <div className="flex-1">
                 <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl shadow-inner">📍</div>
                    <h3 className="text-xl font-black text-slate-800">অঞ্চল শনাক্তকরণ</h3>
                 </div>
                 <p className="text-sm font-black text-amber-700">{aezData ? `AEZ ${aezData.id}: ${aezData.name}` : 'শনাক্ত করা হয়নি'}</p>
              </div>
              <button onClick={() => handleDetectAEZ(true)} disabled={isDetecting} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                {isDetecting ? '...' : 'আপডেট করুন'}
              </button>
           </div>
           
           <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100">
              <h3 className="text-xl font-black mb-8 border-b border-slate-50 pb-4">মাটির গুণাগুণ (Lab Data)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10">
                 <AuditInput label="pH" value={auditInputs.ph} step={0.1} onChange={(v: number) => setAuditInputs({...auditInputs, ph: v})} icon="🧪" />
                 <AuditInput label="OC (%)" value={auditInputs.oc} step={0.1} onChange={(v: number) => setAuditInputs({...auditInputs, oc: v})} icon="🍂" />
                 <AuditInput label="N (%)" value={auditInputs.n} step={0.01} onChange={(v: number) => setAuditInputs({...auditInputs, n: v})} icon="🔬" />
                 <AuditInput label="P (ppm)" value={auditInputs.p} step={1} onChange={(v: number) => setAuditInputs({...auditInputs, p: v})} icon="💎" />
                 <AuditInput label="K (meq)" value={auditInputs.k} step={0.01} onChange={(v: number) => setAuditInputs({...auditInputs, k: v})} icon="🍌" />
              </div>
              <button id="soil-deep-audit-btn" onClick={() => handleAuditSubmit(true)} className="w-full bg-amber-600 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all">ডিপ অডিট শুরু করুন</button>
           </div>
        </div>
      )}

      {activeTab === 'texture' && (
        <div className="space-y-8 animate-fade-in">
           {/* Detailed Step-by-Step Texture Guide */}
           <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100">
              <div className="flex items-center space-x-4 mb-10">
                 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🖐️</div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800">বুনট নির্ণয় নির্দেশিকা (Feel Method)</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">International Standard Field Guide</p>
                 </div>
              </div>

              <div className="flex space-x-2 mb-10 overflow-x-auto scrollbar-hide px-2">
                 {textureGuideSteps.map((step, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveTextureStep(idx)}
                      className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-tighter whitespace-nowrap transition-all border-2 ${activeTextureStep === idx ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                       ধাপ {idx + 1}
                    </button>
                 ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                 <div className="md:col-span-7 space-y-6">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                       <div className="flex items-center space-x-4 mb-4">
                          <span className="text-4xl">{textureGuideSteps[activeTextureStep].icon}</span>
                          <h4 className="text-lg font-black text-slate-800">{textureGuideSteps[activeTextureStep].title}</h4>
                       </div>
                       <p className="text-sm font-medium text-slate-500 leading-relaxed">{textureGuideSteps[activeTextureStep].desc}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                       {textureGuideSteps[activeTextureStep].outcome.map((o, i) => (
                          <button 
                            key={i}
                            className="w-full text-left p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-emerald-500 hover:shadow-lg transition-all group"
                          >
                             <div className="flex justify-between items-center">
                                <div>
                                   <h5 className="font-black text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{o.label}</h5>
                                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{o.hint}</p>
                                </div>
                                <div className="text-slate-200 group-hover:text-emerald-100 group-hover:translate-x-1 transition-all">→</div>
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="md:col-span-5 space-y-8">
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                       <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-10">বুনট স্লাইডার (Manual Fine-tune)</h4>
                       <div className="space-y-10">
                          <TextureSlider label="বেলে (Sand)" val={sand} setVal={setSand} color="bg-amber-500" />
                          <TextureSlider label="পলি (Silt)" val={silt} setVal={setSilt} color="bg-blue-500" />
                          <TextureSlider label="এঁটেল (Clay)" val={clay} setVal={setClay} color="bg-rose-500" />
                       </div>
                    </div>

                    <div className={`${textureResult.bg} p-8 rounded-[3rem] border-2 border-dashed border-slate-200 text-center animate-pulse`}>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">শনাক্তকৃত বুনট</p>
                       <h4 className={`text-2xl font-black ${textureResult.color}`}>{textureResult.name}</h4>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'om_calc' && (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-fade-in">
           <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-7 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">বর্তমান জৈব পদার্থ (%)</label>
                        <input type="number" value={currentOM} onChange={(e) => setCurrentOM(parseFloat(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-700 shadow-inner outline-none focus:border-amber-500" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">লক্ষ্যমাত্রা (%)</label>
                        <input type="number" value={targetOM} onChange={(e) => setTargetOM(parseFloat(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-700 shadow-inner outline-none focus:border-amber-500" />
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">জমির পরিমাণ ও একক</label>
                    <div className="flex gap-2">
                        <input type="number" value={landArea} onChange={(e) => setLandArea(parseFloat(e.target.value))} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-700 shadow-inner outline-none focus:border-amber-500" />
                        <select value={landUnit} onChange={(e) => setLandUnit(e.target.value as any)} className="bg-slate-900 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest appearance-none">
                           <option value="bigha">{lang === 'bn' ? 'বিঘা' : 'Bigha'}</option>
                           <option value="decimal">{lang === 'bn' ? 'শতাংশ' : 'Decimal'}</option>
                           <option value="pit">{lang === 'bn' ? 'গর্ত (Pit)' : 'Pit'}</option>
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-4 block">মিক্সিং উপকরণ (Organic Additives)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                       {additives.map(item => (
                         <button
                           key={item.id}
                           onClick={() => setSelectedAdditives(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                           className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                             selectedAdditives.includes(item.id) ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'
                           }`}
                         >
                           <span className="text-2xl group-hover:scale-125 transition-transform">{item.icon}</span>
                           <span className="text-[9px] font-black uppercase text-center leading-tight">{item.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <button onClick={calculateOrganicFertilizer} className="w-full bg-amber-600 text-white font-black py-6 rounded-[2rem] shadow-xl active:scale-95 transition-all text-xl">হিসাব করুন</button>
              </div>

              <div className="md:col-span-5 bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col justify-center relative overflow-hidden min-h-[400px]">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                 {omResult ? (
                   <div className="space-y-8 animate-fade-in relative z-10">
                      <div className="text-center">
                         <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">মোট প্রয়োজনীয় জৈব উপাদান</p>
                         <h4 className="text-5xl font-black tracking-tighter">{omResult.totalKg} <span className="text-lg opacity-40">কেজি</span></h4>
                         <p className="text-[9px] font-bold text-slate-500 mt-2">({omResult.deficit}% ঘাটতি পূরণ • {landArea} {omResult.unit})</p>
                      </div>
                      
                      <div className="space-y-3">
                         <OmResultRow label="গোবর সার" val={omResult.cowDung} unit="Kg" icon="💩" />
                         <OmResultRow label="ভার্মিকম্পোস্ট" val={omResult.vermiCompost} unit="Kg" icon="🪱" />
                         {omResult.additives.map((a: any, i: number) => (
                           <OmResultRow key={i} label={a.label} val={a.weight} unit="Kg" icon={a.icon} highlight />
                         ))}
                      </div>
                   </div>
                 ) : (
                   <div className="opacity-30 flex flex-col items-center text-center">
                      <div className="text-6xl mb-6">⚖️</div>
                      <p className="font-black uppercase text-xs tracking-[0.2em] mb-2">ক্যালকুলেশন দেখার জন্য</p>
                      <p className="text-[10px] font-medium uppercase tracking-widest">বাম পাশের তথ্যগুলো পূরণ করুন</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {precisionFields && !isLoading && !advice && (
        <div className="max-w-2xl mx-auto my-8 print:hidden">
           <DynamicPrecisionForm fields={precisionFields} lang={lang} onSubmit={handlePrecisionSubmit} isLoading={isLoading} toolProtocol="SRDI-BARC-FRG24" />
        </div>
      )}

      {advice && !isLoading && (
        <div ref={reportRef} className="bg-white rounded-[4rem] p-10 md:p-14 border-[12px] border-slate-900 shadow-2xl relative overflow-hidden animate-fade-in-up mt-10">
           <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
              <div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tight">সায়েন্টিফিক অডিট অ্যাডভাইজরি</h3>
                 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2">BARC Analysis Core v2.5</p>
              </div>
              <button onClick={() => playSpeech(advice!)} className={`p-5 rounded-full shadow-xl transition-all ${isSpeaking ? 'bg-rose-500 animate-pulse' : 'bg-amber-600 text-white'}`}>
                 🔊
              </button>
           </div>
           <div className="prose prose-slate max-w-none text-slate-800 font-medium leading-[1.8] text-xl whitespace-pre-wrap">
              {advice}
           </div>
        </div>
      )}
    </div>
  );
};

interface AuditInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  icon: string;
}

const AuditInput: React.FC<AuditInputProps> = ({ label, value, onChange, step = 1, icon }) => (
  <div className="space-y-2 group">
    <div className="flex items-center space-x-2">
       <span className="text-base grayscale group-hover:grayscale-0 transition-all">{icon}</span>
       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    </div>
    <input type="number" value={value} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-center text-lg text-slate-700 outline-none focus:border-amber-500 shadow-inner" />
  </div>
);

interface TextureSliderProps {
  label: string;
  val: number;
  setVal: (val: number) => void;
  color: string;
}

const TextureSlider: React.FC<TextureSliderProps> = ({ label, val, setVal, color }) => (
  <div className="space-y-3">
     <div className="flex justify-between items-center px-1">
        <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{label}</label>
        <span className={`px-2 py-0.5 rounded text-white text-[10px] font-black ${color}`}>{val}%</span>
     </div>
     <input type="range" min="0" max="100" value={val} onChange={(e) => setVal(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-400" />
  </div>
);

interface OmResultRowProps {
  label: string;
  val: string;
  unit: string;
  icon: string;
  highlight?: boolean;
}

const OmResultRow: React.FC<OmResultRowProps> = ({ label, val, unit, icon, highlight }) => (
  <div className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${highlight ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
     <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-black uppercase ${highlight ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</span>
     </div>
     <span className="text-sm font-black">{val} {unit}</span>
  </div>
);

export default SoilExpert;