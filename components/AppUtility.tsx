
import React, { useState } from 'react';

interface AppUtilityProps {
  installPrompt: any;
  onInstallComplete: () => void;
  onShareApp: () => void;
}

export const AppUtility: React.FC<AppUtilityProps> = ({ installPrompt, onInstallComplete, onShareApp }) => {
  const [showIOSHint, setShowIOSHint] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        onInstallComplete();
      }
    } else if (isIOS) {
      setShowIOSHint(true);
    } else {
      alert("আপনার ব্রাউজার সরাসরি ইন্সটলেশন সমর্থন করছে না। দয়া করে ব্রাউজার মেনু থেকে 'Install App' বা 'Add to Home Screen' বাটনে ক্লিক করুন।");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mb-12 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Install Card */}
        <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-emerald-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner">📲</div>
              <div>
                <h3 className="text-xl font-black text-slate-800">হোম স্ক্রিনে সেভ করুন</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">App Shortcut for Quick Access</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">বারবার ব্রাউজারে না গিয়ে সরাসরি অ্যাপের মতো ব্যবহার করতে Krishi AI মোবাইলের হোম স্ক্রিনে যুক্ত করুন।</p>
            <button 
              onClick={handleInstall}
              className="w-full bg-[#0A8A1F] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-3"
            >
              <span>{isIOS ? 'কিভাবে ইন্সটল করবেন?' : 'অ্যাপটি মোবাইলে সেভ করুন'}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>

        {/* Share Card */}
        <div className="bg-slate-900 rounded-[3rem] p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🤝</div>
              <div>
                <h3 className="text-xl font-black text-white">বন্ধুদের সাথে শেয়ার করুন</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spread the Innovation</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 font-medium mb-8 leading-relaxed">অন্যান্য কৃষক ভাইদের সাথে এই প্রযুক্তি শেয়ার করে তাদের চাষাবাদকে আরও সহজ ও আধুনিক করতে সাহায্য করুন।</p>
            <button 
              onClick={onShareApp}
              className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center space-x-3"
            >
              <span>অ্যাপটি শেয়ার করুন</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Install Instructions Modal */}
      {showIOSHint && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-4xl">🍎</div>
            <h3 className="text-2xl font-black text-slate-800">আইফোনে সেভ করুন</h3>
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">১</div>
                <p className="text-sm font-medium text-slate-600">সাফারি ব্রাউজারের নিচে থাকা <span className="p-1 bg-slate-100 rounded font-bold">Share</span> বাটনে চাপ দিন।</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">২</div>
                <p className="text-sm font-medium text-slate-600">নিচের দিকে স্ক্রল করে <span className="font-bold text-[#0A8A1F]">&quot;Add to Home Screen&quot;</span> বাটনে ক্লিক করুন।</p>
              </div>
            </div>
            <button 
              onClick={() => setShowIOSHint(false)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm"
            >বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};
