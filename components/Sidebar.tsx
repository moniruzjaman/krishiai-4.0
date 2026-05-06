import React from 'react';
import { View, Language, User } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  currentView: View;
  lang: Language;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentView, lang, user }) => {
  const getCategoryProgress = (catTitle: string) => {
    if (catTitle.includes('Main') || catTitle.includes('প্রধান')) return null;
    if (catTitle.includes('Diagnostic') || catTitle.includes('ডায়াগনোসিস')) return user.progress.skills.protection;
    if (catTitle.includes('Soil') || catTitle.includes('মৃত্তিকা')) return user.progress.skills.soil;
    if (catTitle.includes('Resources') || catTitle.includes('সম্পদ')) return user.progress.skills.technology;
    return null;
  };

  const categories = [
    {
      title: lang === 'bn' ? 'প্রধান মেনু' : 'Main Menu',
      items: [
        { id: View.HOME, label: lang === 'bn' ? 'হোম' : 'Home', icon: '🏠' },
        { id: View.TOOLS, label: lang === 'bn' ? 'সকল টুলস' : 'All Tools', icon: '🛠️' },
        { id: View.PROFILE, label: lang === 'bn' ? 'প্রোফাইল' : 'Profile', icon: '👤' },
        { id: View.SEARCH, label: lang === 'bn' ? 'বাজার দর' : 'Market Prices', icon: '🔍' },
      ]
    },
    {
      title: lang === 'bn' ? 'ডায়াগনোসিস স্যুট' : 'Diagnostic Suite',
      items: [
        { id: View.ANALYZER, label: lang === 'bn' ? 'রোগ শনাক্তকরণ' : 'Disease Scanner', icon: '📸' },
        { id: View.CROP_DISEASE_LIBRARY, label: lang === 'bn' ? 'বালাই লাইব্রেরি' : 'Pest Library', icon: '📖' },
        { id: View.PEST_EXPERT, label: lang === 'bn' ? 'বালাইনাশক বিশেষজ্ঞ' : 'Pesticide Expert', icon: '🧪' },
        { id: View.LEAF_COLOR_CHART, label: lang === 'bn' ? 'লিফ কালার চার্ট' : 'Digital LCC', icon: '🍃' },
      ]
    },
    {
      title: lang === 'bn' ? 'মৃত্তিকা ও পরিকল্পনা' : 'Soil & Planning',
      items: [
        { id: View.SOIL_EXPERT, label: lang === 'bn' ? 'মৃত্তিকা অডিট' : 'Soil Audit', icon: '🏺' },
        { id: View.NUTRIENT_CALC, label: lang === 'bn' ? 'সার ক্যালকুলেটর' : 'Fertilizer Calc', icon: '⚖️' },
        { id: View.AI_YIELD_PREDICTION, label: lang === 'bn' ? 'ফলন পূর্বাভাস' : 'Yield Predictor', icon: '🔮' },
        { id: View.CROP_CALENDAR, label: lang === 'bn' ? 'শস্য ক্যালেন্ডার' : 'Crop Calendar', icon: '🗓️' },
      ]
    },
    {
      title: lang === 'bn' ? 'সম্পদ ও শিক্ষা' : 'Resources & Learning',
      items: [
        { id: View.LEARNING_CENTER, label: lang === 'bn' ? 'শিক্ষা কেন্দ্র' : 'Academy', icon: '🎓' },
        { id: View.PODCAST, label: lang === 'bn' ? 'এআই পডকাস্ট' : 'Agri Podcast', icon: '🎙️' },
        { id: View.MONITORING, label: lang === 'bn' ? 'ক্ষেত পর্যবেক্ষণ' : 'Monitoring', icon: '🛰️' },
        { id: View.CHAT, label: lang === 'bn' ? 'এআই চ্যাটবট' : 'AI Assistant', icon: '🤖' },
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-80 bg-white z-[1001] shadow-[20px_0_60px_rgba(0,0,0,0.15)] transition-transform duration-500 ease-out transform flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <Logo size="md" showText={true} textColor="text-slate-800" />
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
          {categories.map((cat, i) => {
            const progress = getCategoryProgress(cat.title);
            return (
              <div key={i} className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    {cat.title}
                  </h4>
                  {progress !== null && (
                    <span className="text-[7px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded uppercase border border-emerald-100">
                      {progress}% {lang === 'bn' ? 'দক্ষ' : 'Mastery'}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                        currentView === item.id 
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-xl transition-transform duration-500 ${currentView === item.id ? 'scale-110 rotate-12' : 'group-hover:scale-110'}`}>
                        {item.icon}
                      </span>
                      <span className={`text-sm font-black transition-colors ${currentView === item.id ? 'text-emerald-800' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                      {currentView === item.id && (
                        <div className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/50">
          <div className="flex items-center space-x-4 mb-4">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <span className="text-xs font-black">4.0</span>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version</p>
                <p className="text-xs font-black text-slate-800">Krishi AI Enterprise</p>
             </div>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
            Grounded by Official BD Govt Repositories (BARI/BRRI/BARC)
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;