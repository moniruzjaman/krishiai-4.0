
import React, { useState, useEffect, useCallback } from 'react';
import { View, Language, MarketPrice } from '../types';
import { getTrendingMarketPrices } from '../services/geminiService';

interface MarketPriceHorizontalProps {
  onNavigate: (view: View) => void;
  lang?: Language;
}

export const MarketPriceHorizontal: React.FC<MarketPriceHorizontalProps> = ({ onNavigate, lang = 'bn' }) => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const data = await getTrendingMarketPrices(lang as Language);
      if (Array.isArray(data) && data.length > 0) {
        setPrices(data);
      } else {
        setPrices([]);
      }
    } catch (e) {
      console.error("Market fetch error", e);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 300000); // Auto refresh every 5 mins
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const toBanglaNumber = (val: string | number) => {
    if (val === null || val === undefined) return '';
    const banglaNumbers: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return val.toString().replace(/[0-9]/g, (w: string) => banglaNumbers[w]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative z-10">
          <div className="flex items-center space-x-5">
             <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner relative group-hover:rotate-6 transition-transform">
                📊
                <div className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
             </div>
             <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center">
                  {lang === 'bn' ? 'লাইভ বাজার দর' : 'Live Market Prices'}
                </h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">
                  {lang === 'bn' ? 'উৎস: dam.gov.bd (আজকের বাজার দর)' : 'Source: dam.gov.bd (Today)'}
                </p>
             </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={fetchPrices}
              className={`p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all ${isLoading ? 'animate-spin' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button 
              onClick={() => onNavigate(View.SEARCH)}
              className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <span>{lang === 'bn' ? 'বিস্তারিত তালিকা' : 'Detailed List'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {isLoading && prices.length === 0 ? (
          <div className="flex items-center space-x-6 py-8 animate-pulse overflow-hidden">
            {[1,2,3,4].map(i => (
              <div key={i} className="min-w-[200px] h-32 bg-slate-50 rounded-[2.5rem] border border-slate-100"></div>
            ))}
          </div>
        ) : error ? (
           <div className="py-10 text-center text-rose-500 font-bold">
              {lang === 'bn' ? 'বাজার দর লোড করা সম্ভব হয়নি।' : 'Failed to load market prices.'}
           </div>
        ) : (
          <div className="flex space-x-5 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
            {prices.map((item, idx) => (
              <div 
                key={idx} 
                className="min-w-[210px] bg-slate-50 border border-slate-100 p-6 rounded-[2.8rem] hover:bg-white hover:shadow-2xl transition-all cursor-default group/card relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{item.category}</span>
                  <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                    item.trend === 'up' ? 'bg-rose-50 text-rose-600' : 
                    item.trend === 'down' ? 'bg-emerald-50 text-emerald-600' : 
                    'bg-slate-100 text-slate-400'
                  }`}>
                    <span>{item.change}</span>
                    <span className="text-[14px] leading-none">{item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}</span>
                  </div>
                </div>
                <h4 className="font-black text-slate-800 text-xl leading-tight mb-3">{item.name}</h4>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">
                    {lang === 'bn' ? `৳${toBanglaNumber(item.price)}` : `৳${item.price}`}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">/{item.unit}</span>
                </div>
              </div>
            ))}
            {prices.length === 0 && !isLoading && (
              <div className="w-full py-10 text-center text-slate-400 italic">
                {lang === 'bn' ? 'কোনো ডাটা পাওয়া যায়নি' : 'No price data found'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
