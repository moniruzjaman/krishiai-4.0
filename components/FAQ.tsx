
import React, { useState, useRef, useEffect } from 'react';
import { getAgriMetaExplanation, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';

/* Fix: Added onBack to FAQProps */
interface FAQProps {
  onBack?: () => void;
  onShowFeedback?: () => void;
}

const FAQ_CATEGORIES = [
  { id: 'all', label: 'সব', icon: '✨' },
  { id: 'prompts', label: 'এআই প্রম্পট টিপস', icon: '⌨️' },
  { id: 'analyzer', label: 'স্ক্যানার ও সুরক্ষা', icon: '🔍' },
  { id: 'soil', label: 'মাটি ও পুষ্টি', icon: '🏺' },
  { id: 'data', label: 'ডাটা ও সোর্স', icon: '📊' },
];

const SUGGESTED_PROMPTS = [
  { text: "ধানের মাজরা পোকা দমনে জৈবিক পদ্ধতি কী?", tool: "Biocontrol" },
  { text: "বেলে দোআঁশ মাটিতে ইউরিয়া সারের প্রয়োগ বিধি কী?", tool: "Soil Expert" },
  { text: "আলুর লেট ব্লাইট রোগের প্রধান ৩টি লক্ষণ কী কী?", tool: "Analyzer" },
  { text: "আগামী সপ্তাহের আবহাওয়া ধানের জন্য কেমন?", tool: "Weather" },
  { text: "বাজারে এখন কোন সবজির দাম সবচেয়ে বেশি বাড়ছে?", tool: "Market" }
];

const FAQ_DATA = [
  {
    category: 'prompts',
    question: "স্ক্যানারের কাছে সঠিক প্রশ্ন করার উপায় কী?",
    answer: "স্ক্যান করার সময় ছবির সাথে অতিরিক্ত বর্ণনায় লিখুন- 'পাতায় লালচে দাগ দেখা যাচ্ছে, এর প্রতিকার কী?' অথবা 'এই পোকাটি কি ধানের মাজরা পোকা?'। নির্দিষ্ট লক্ষণ উল্লেখ করলে এআই আরও নিখুঁত উত্তর দেয়।",
    source: "Prompt Guide - Analyzer"
  },
  {
    category: 'prompts',
    question: "বাজার দরের পূর্বাভাস পেতে কী জিজ্ঞাসা করব?",
    answer: "বাজার দর টুলের এআই ফিচারে লিখুন- 'আগামী এক মাসে চালের দাম বাড়ার সম্ভাবনা কেমন?' অথবা 'বর্তমানে কোন সবজি চাষ করলে বেশি লাভ হতে পারে?'। এআই সরকারি ডাটা ও ট্রেন্ড বিশ্লেষণ করে আপনাকে জানাবে।",
    source: "Prompt Guide - Market"
  },
  {
    category: 'prompts',
    question: "মাটি বিশেষজ্ঞের কাছে কী ধরণের প্রশ্ন করা যায়?",
    answer: "অডিট শেষে জিজ্ঞাসা করুন- 'আমার মাটির pH বাড়াতে চুন প্রয়োগের সঠিক সময় কখন?' অথবা 'জৈব সারের ঘাটতি মেটাতে আমি কোন ধরণের কম্পোস্ট ব্যবহার করব?'। এটি BARC-2024 মান অনুযায়ী উত্তর দেবে।",
    source: "Prompt Guide - Soil"
  },
  {
    category: 'prompts',
    question: "ফলন পূর্বাভাস আরও নির্ভুল করতে কী তথ্য দেব?",
    answer: "প্রম্পটে আপনার সারের ডোজ, সেচের সংখ্যা এবং মাটির বিশেষত্ব (যেমন- লবণাক্ততা) উল্লেখ করুন। উদাহরণ: 'আমি বিঘা প্রতি ৪০ কেজি ইউরিয়া ব্যবহার করেছি, এতে কি ফলন বাড়বে?'",
    source: "Prompt Guide - Yield"
  },
  {
    category: 'analyzer',
    question: "Krishi AI কীভাবে ফসলের রোগ শনাক্ত করে?",
    answer: "আমাদের এআই সিস্টেম আন্তর্জাতিকভাবে স্বীকৃত CABI এবং বিএআরআই (https://m.baritechnology.org/) এর ডিজিটাল ডাটাবেস অনুসরণ করে। এটি আপনার আপলোড করা ছবির লক্ষণগুলো বিশ্লেষণ করে সম্ভাব্য রোগ বা পোকা শনাক্ত করে।",
    source: "CABI & BARI"
  },
  {
    category: 'soil',
    question: "সারের মাত্রা কি এআই নিজে তৈরি করে?",
    answer: "না, এআই আপনার ইনপুট করা ডাটাকে BARC (বাংলাদেশ কৃষি গবেষণা কাউন্সিল) এর 'Fertilizer Recommendation Guide-2024' এবং আপনার এলাকার AEZ ম্যাপের সাথে মিলিয়ে সঠিক বৈজ্ঞানিক মাত্রা নির্ধারণ করে।",
    source: "BARC & SRDI"
  },
  {
    category: 'data',
    question: "পরামর্শগুলো কি সরকারি তথ্যের উপর ভিত্তি করে দেওয়া হয়?",
    answer: "হ্যাঁ, শনাক্তকৃত রোগের প্রতিকার এবং সারের মাত্রা সংক্রান্ত সকল পরামর্শ বাংলাদেশ সরকারের অফিসিয়াল সোর্স যেমন- BARC, BRRI, BARI (https://m.baritechnology.org/) এবং DAE থেকে নেওয়া হয়।",
    source: "Official Govt. Repositories"
  },
  {
    category: 'prompts',
    question: "এআই কি আবহাওয়া বুঝে পরামর্শ দেয়?",
    answer: "হ্যাঁ, 'Weather Context' সক্রিয় থাকলে এআই আপনার এলাকার বর্তমান তাপমাত্রা ও বৃষ্টির সম্ভাবনা বিবেচনা করে পরামর্শ দেয়। যেমন: বৃষ্টির শঙ্কা থাকলে এআই আপনাকে বালাইনাশক স্প্রে করতে নিষেধ করবে।",
    source: "BAMIS Context Integration"
  }
];

const FAQ: React.FC<FAQProps> = ({ onShowFeedback, onBack }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState('all');
  const [metaQuery, setMetaQuery] = useState('');
  const [metaAnswer, setMetaAnswer] = useState<string | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        setMetaQuery(event.results[0][0].transcript);
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

  const playTTS = async (text: string) => {
    if (isPlaying) { stopTTS(); return; }
    try {
      setIsPlaying(true);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64 = await generateSpeech(text.replace(/[*#_~]/g, ''));
      const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (e) { setIsPlaying(false); }
  };

  const stopTTS = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const filteredFaqs = activeTab === 'all' 
    ? FAQ_DATA 
    : FAQ_DATA.filter(f => f.category === activeTab);

  const handleAskMeta = async (queryOverride?: string) => {
    const queryToUse = queryOverride || metaQuery;
    if (!queryToUse.trim()) return;
    
    setMetaQuery(queryToUse);
    setIsLoadingMeta(true);
    setMetaAnswer(null);
    try {
      const res = await getAgriMetaExplanation(queryToUse);
      setMetaAnswer(res || null);
      if (res) {
        playTTS(res);
      }
      if (onShowFeedback) onShowFeedback();
    } catch (e) {
      setMetaAnswer("দুঃখিত, তথ্য সংগ্রহে সমস্যা হয়েছে।");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-32 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-10">
        {/* Fix: Use onBack prop if available */}
        <button onClick={() => { if (onBack) { onBack(); } else { window.history.back(); } stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">সহায়তা ও তথ্য কেন্দ্র</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">AI Guidance, Sources & Smart Prompts</p>
        </div>
      </div>

      {/* Interactive AI Meta-Assistant Section */}
      <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 text-white shadow-2xl mb-12 relative overflow-hidden border-b-[12px] border-emerald-600">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🤖</div>
            <div>
              <h3 className="text-xl font-black">এআই মেটা-অ্যাসিস্ট্যান্ট</h3>
              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Ask anything about how we work</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mb-6">
             <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={metaQuery}
                  onChange={(e) => setMetaQuery(e.target.value)}
                  placeholder="যেমন: 'স্ক্যানার কোন সোর্স ব্যবহার করে?'" 
                  className="w-full bg-white/10 border-2 border-white/10 rounded-2xl p-4 pr-12 text-white font-bold placeholder:text-slate-500 focus:bg-white/20 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAskMeta()}
                />
                <button 
                  onClick={toggleListening}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-slate-400 hover:text-emerald-400'}`}
                >
                  <svg className="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
             </div>
             <button 
               onClick={() => handleAskMeta()}
               disabled={isLoadingMeta}
               className="bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:bg-slate-700"
             >
               {isLoadingMeta ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>জিজ্ঞাসা করুন</span>}
             </button>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">জনপ্রিয় এআই প্রম্পট (Try These):</p>
             <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAskMeta(p.text)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 text-left"
                  >
                    <span className="text-emerald-500 mr-2">#{p.tool}</span>
                    {p.text}
                  </button>
                ))}
             </div>
          </div>

          {metaAnswer && (
            <div className="mt-8 bg-white rounded-[2rem] p-8 text-slate-800 shadow-2xl animate-fade-in border-t-8 border-emerald-500 relative">
               <button onClick={() => playTTS(metaAnswer)} className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                  {isPlaying ? '🔇' : '🔊'}
               </button>
               <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed whitespace-pre-wrap pr-10">
                 {metaAnswer}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide mb-8 border-b border-slate-100">
        {FAQ_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-black transition-all ${
              activeTab === cat.id 
              ? 'bg-[#0A8A1F] text-white shadow-xl scale-105' 
              : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Accordion */}
      <div className="space-y-4">
        {filteredFaqs.map((item, index) => (
          <div key={index} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <button 
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-8 text-left transition-colors"
            >
              <div className="pr-8">
                <span className="text-lg font-black text-slate-800 block leading-tight">{item.question}</span>
                <span className="inline-block mt-3 px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg tracking-tighter border border-emerald-100">
                  ভিত্তি: {item.source}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${openIndex === index ? 'bg-[#0A8A1F] text-white rotate-180 shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                <svg className="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${openIndex === index ? 'max-h-[500px] border-t border-slate-50' : 'max-h-0'}`}>
              <div className="p-8 bg-emerald-50/20">
                <p className="text-slate-600 font-medium leading-relaxed text-base">
                  {item.answer}
                </p>
                {item.category === 'prompts' && (
                  <div className="mt-4 p-4 bg-white rounded-2xl border border-emerald-100 flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-400 italic">প্রম্পট কপি করে চ্যাটবটে ব্যবহার করুন</span>
                     <button className="text-[10px] font-black text-emerald-600 uppercase" onClick={() => { navigator.clipboard.writeText(item.answer); alert('কপি করা হয়েছে!'); }}>কপি করুন</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Support CTA */}
      <div className="mt-16 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl text-center space-y-6">
        <h3 className="text-xl font-black text-slate-800">আপনার প্রশ্ন এখানে নেই?</h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
          আমাদের এআই চ্যাটবটের সাথে সরাসরি কথা বলুন অথবা আমাদের সাপোর্ট টিমে মেইল করুন।
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">চ্যাটবটে সহায়তা</button>
          <button className="bg-[#0A8A1F] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">সাপোর্ট মেইল</button>
        </div>
      </div>

      <div className="mt-12 text-center pb-8 opacity-40">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Krishi AI Knowledge Core v2.9 • Source Integrity Protocol Active</p>
      </div>
    </div>
  );
};

export default FAQ;
