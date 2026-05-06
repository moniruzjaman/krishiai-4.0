
import React, { useState, useEffect } from 'react';
import { generateAgriImage, searchAgriculturalInfo } from '../services/geminiService';

interface VideoGeneratorProps {
  prompt: string;
  onClose: () => void;
  title: string;
}

const loadingMessages = [
  "গবেষণা তথ্য বিশ্লেষণ করা হচ্ছে...",
  "AI টিউটোরিয়াল ভিজ্যুয়াল তৈরি করছে...",
  "মাঠের চিত্র এবং লক্ষণগুলো সমন্বয় হচ্ছে...",
  "চাষাবাদ পদ্ধতির চিত্রায়ন চলছে...",
  "টিউটোরিয়াল কার্ড প্রস্তুত হচ্ছে..."
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ prompt, onClose, title }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tutorialText, setTutorialText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    handleGenerateTutorial();
  }, [prompt]);

  const handleGenerateTutorial = async () => {
    setIsLoading(true);
    try {
      const [img, info] = await Promise.all([
        generateAgriImage(`Scientific illustration of ${prompt} crop management, realistic photography style, high detail`),
        searchAgriculturalInfo(`Provide a 3-step practical tutorial for a farmer on: ${prompt}. Each step should be concise.`)
      ]);
      setImageUrl(img);
      setTutorialText(info.text);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_rgba(10,138,31,0.2)] overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/20">
               <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
               <span>AI Visual Tutorial</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1">Multi-modal Learning Card</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-8">
               <div className="relative">
                  <div className="w-24 h-24 border-8 border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">📖</div>
               </div>
               <h3 className="text-xl font-black text-slate-800">{loadingMessages[loadingStep]}</h3>
            </div>
          ) : imageUrl ? (
            <div className="space-y-8 animate-fade-in">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-50 bg-slate-100 aspect-video relative group">
                 <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Tutorial Visualization" />
                 <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black text-white uppercase">AI Generated Visual</div>
              </div>
              <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100">
                <h4 className="text-lg font-black text-emerald-900 mb-4 flex items-center">
                   <span className="mr-3">📋</span> সমাধান ধাপসমূহ
                </h4>
                <div className="prose prose-emerald max-w-none text-emerald-800 font-bold leading-relaxed whitespace-pre-wrap">
                  {tutorialText}
                </div>
              </div>
              <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl">বন্ধ করুন</button>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <p>টিউটোরিয়াল তৈরি করা সম্ভব হয়নি।</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
