
import React from 'react';

interface GoogleAdBannerProps {
  type?: 'horizontal' | 'square' | 'native';
  className?: string;
  context?: 'weather' | 'general' | 'disease';
}

/**
 * This component acts as a dedicated official promotion for the BARC Khamari App.
 * It supports contextual messaging to increase relevance across different tools.
 */
export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({ 
  type = 'horizontal', 
  className = "", 
  context = 'general' 
}) => {
  
  const getContextualContent = () => {
    switch(context) {
      case 'weather':
        return {
          tag: "আবহাওয়া ও কৃষি তথ্য",
          title: "খামারি (Khamari) ২.০",
          desc: "আপনার এলাকার সঠিক আবহাওয়া এবং রোপণ সহায়িকা পেতে আজই ডাউনলোড করুন।"
        };
      case 'disease':
        return {
          tag: "রোগ ও বালাই সমাধান",
          title: "খামারি (Khamari) ২.০",
          desc: "ফসলের রোগ নির্ণয় এবং আধুনিক সমাধান পেতে সরকারি এই অ্যাপটি ব্যবহার করুন।"
        };
      default:
        return {
          tag: "অফিসিয়াল অ্যাপ্লিকেশন",
          title: "খামারি (Khamari) ২.০",
          desc: "স্মার্ট কৃষি ব্যবস্থাপনায় বাংলাদেশ সরকারের নির্ভরযোগ্য ডিজিটাল প্ল্যাটফর্ম।"
        };
    }
  };

  const content = getContextualContent();

  return (
    <a 
      href="https://play.google.com/store/apps/details?id=barc.crop.khamari2" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`relative block overflow-hidden rounded-[2rem] border-2 border-green-50 bg-white transition-all hover:shadow-xl active:scale-[0.99] group ${className} ${type === 'square' ? 'aspect-square max-w-[300px] mx-auto' : 'w-full'}`}
    >
      <div className="flex items-center justify-between p-5 md:p-8 relative">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-32 h-full bg-green-600/5 -skew-x-12 translate-x-8 pointer-events-none group-hover:translate-x-4 transition-transform duration-700"></div>
        
        <div className="flex items-center space-x-6 relative z-10">
          {/* Official Khamari App Icon Branding */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0A8A1F] rounded-[1.5rem] flex items-center justify-center shadow-2xl border-4 border-white transform -rotate-2 group-hover:rotate-0 transition-transform duration-300">
               <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
               </svg>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-md border-2 border-white uppercase">
              BARC
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-[11px] font-black text-[#0A8A1F] uppercase tracking-[0.2em]">{content.tag}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            </div>
            <h3 className="text-lg md:text-2xl font-black text-gray-900 leading-none mb-2">
              {content.title}
            </h3>
            <p className="text-xs md:text-sm font-bold text-gray-500 leading-tight max-w-[320px]">
              {content.desc}
            </p>
            <div className="flex items-center mt-3 space-x-3">
                <div className="flex -space-x-1">
                   {[1,2,3,4,5].map(i => <span key={i} className="text-[10px] text-yellow-500">★</span>)}
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">৪.৮ রেটিং • ১ লক্ষ+ ইউজার</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden sm:block">
          <div className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl group-hover:bg-[#0A8A1F] transition-all flex items-center space-x-3">
            <span>ইন্সটল করুন</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          </div>
        </div>
      </div>
    </a>
  );
};
