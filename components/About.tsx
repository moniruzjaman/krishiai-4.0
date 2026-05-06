
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { searchAgriculturalInfo } from '../services/geminiService';
import FeedbackModal from './FeedbackModal';

interface AboutProps {
  onNavigate: (view: View) => void;
  // Fix: Added missing onBack prop
  onBack?: () => void;
}

const About: React.FC<AboutProps> = ({ onNavigate, onBack }) => {
  const [aiNarrative, setAiNarrative] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    const fetchNarrative = async () => {
      try {
        const res = await searchAgriculturalInfo("Write a brief, inspirational 3-sentence summary in Bangla about how AI like Krishi AI is transforming farming in Bangladesh for a better future.");
        setAiNarrative(res.text);
      } catch {
        setAiNarrative("আমাদের লক্ষ্য হলো আধুনিক প্রযুক্তির মাধ্যমে বাংলাদেশের কৃষকদের জীবনমান উন্নত করা এবং বিজ্ঞানভিত্তিক চাষাবাদের প্রসার ঘটানো।");
      } finally {
        setIsLoading(false);
      }
    };
    fetchNarrative();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 pb-32 animate-fade-in font-sans">
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      
      <div className="flex items-center space-x-4 mb-12">
        {/* Fix: Use onBack prop if available */}
        <button onClick={() => onBack ? onBack() : onNavigate(View.HOME)} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">আমাদের সম্পর্কে</h1>
      </div>

      <div className="space-y-12">
        {/* Dynamic AI Vision Section */}
        <section className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-emerald-500">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
           <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-600/20 text-emerald-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                 <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                 <span>AI Driven Vision</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">একটি স্মার্ট কৃষি বিপ্লব</h2>
              
              <div className="min-h-[100px]">
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-emerald-400/60 font-bold italic">AI স্বপ্ন বুনছে...</p>
                  </div>
                ) : (
                  <p className="text-xl md:text-2xl font-medium leading-relaxed text-slate-300 italic first-letter:text-5xl first-letter:font-black first-letter:text-emerald-500 first-letter:float-left first-letter:mr-3">
                    {aiNarrative}
                  </p>
                )}
              </div>
           </div>
        </section>

        {/* Impact Stats */}
        <section className="bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100 flex flex-wrap justify-center gap-12 text-center">
           <AboutStat label="সক্রিয় ব্যবহারকারী" val="৫০,০০০+" />
           <AboutStat label="শনাক্তকৃত রোগ" val="১,০০০+" />
           <AboutStat label="কৃষি অঞ্চল (AEZ)" val="৩০টি" />
           <AboutStat label="ডেটা সোর্স" val="১২টি" />
        </section>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <AboutPillar 
             icon="🛰️" 
             title="নির্ভুলতা" 
             desc="স্যাটেলাইট ডাটা ও AI বিশ্লেষণের মাধ্যমে সঠিক তথ্য প্রদান।" 
             color="bg-blue-50 text-blue-600"
           />
           <AboutPillar 
             icon="🛡️" 
             title="নিরাপত্তা" 
             desc="বিএআরসি (BARC) মান অনুযায়ী নির্ভরযোগ্য কৃষি পরামর্শ।" 
             color="bg-emerald-50 text-emerald-600"
           />
           <AboutPillar 
             icon="🤝" 
             title="সহজ লভ্যতা" 
             desc="দেশের প্রতিটি প্রান্তে থাকা কৃষকদের জন্য ব্যবহারবান্ধব সেবা।" 
             color="bg-amber-50 text-amber-600"
           />
        </section>

         <section className="text-center space-y-8 pt-12 border-t border-slate-100">
            <h3 className="text-2xl font-black text-slate-800">যোগাযোগ ও ফিডব্যাক</h3>
            <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 inline-block mb-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Email Support</p>
              <a href="mailto:support@krishiai.live" className="text-2xl font-black text-emerald-600 hover:text-emerald-700 transition-colors">support@krishiai.live</a>
            </div>
            <p className="text-slate-500 font-medium max-w-md mx-auto">অ্যাপটি আরও উন্নত করতে বা কোনো সমস্যার কথা জানাতে আপনার ফিডব্যাক আমাদের জানান।</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
             <button 
               onClick={() => setIsFeedbackOpen(true)}
               className="bg-[#0A8A1F] text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3"
             >
                <span className="text-xl">💬</span>
                <span>মতামত দিন</span>
             </button>
             <button 
               onClick={() => onNavigate(View.CHAT)}
               className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3"
             >
                <span className="text-xl">🤖</span>
                <span>চ্যাটবটে সহায়তা নিন</span>
             </button>
           </div>
        </section>
      </div>
    </div>
  );
};

interface AboutPillarProps {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const AboutPillar: React.FC<AboutPillarProps> = ({ icon, title, desc, color }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-xl transition-all">
     <div className={`w-16 h-16 ${color} rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition-transform`}>
        {icon}
     </div>
     <h4 className="text-xl font-black text-slate-800 mb-3">{title}</h4>
     <p className="text-sm text-slate-400 font-medium leading-relaxed">{desc}</p>
  </div>
);

interface AboutStatProps {
  label: string;
  val: string;
}

const AboutStat: React.FC<AboutStatProps> = ({ label, val }) => (
  <div className="flex flex-col items-center px-4">
     <span className="text-4xl font-black text-[#0A8A1F] tracking-tighter mb-1">{val}</span>
     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
  </div>
);

export default About;
